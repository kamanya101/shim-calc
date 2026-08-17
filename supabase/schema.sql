-- Shim Calculator — phase 1 schema (accounts + sync)
--
-- Run this once in the Supabase SQL editor. It is written to be re-runnable:
-- every statement is guarded, so applying it twice changes nothing.
--
-- Two decisions here are not the obvious ones, and both are deliberate:
--
-- 1. `id` is text, not uuid. Most ids are crypto.randomUUID(), but the app
--    lets somebody start typing before anything is saved, and those first
--    rows carry placeholder ids like 'draft-bike'. They are real records the
--    moment they are edited, so the column has to accept them.
--
-- 2. The primary key is (user_id, id), not id. Those placeholder ids are
--    identical for every rider — two people who both just installed the app
--    each have a 'draft-bike'. Keyed on id alone the second one to sync would
--    collide with the first.
--
-- Timestamps are text holding the exact ISO-8601 string the device wrote.
-- Conflict resolution is "later updated_at wins", compared as a string, and
-- timestamptz comes back from Postgres in a different format to the one the
-- browser produces ('+00:00' against 'Z', microseconds against milliseconds).
-- Comparing those two as strings sorts wrongly. Keeping the device's own text
-- means the value that is compared is the value that was written.

create table if not exists public.bikes (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  name       text not null,
  -- A permanent code from src/lib/models.ts ('990-adventure-r'), never the
  -- printed name. The names are riders' to reword; this is what the shared
  -- averages group on, so it must outlive any wording change.
  model_id   text,
  -- Model year. Optional, and only ever from the production run (2004-2012).
  year       integer,
  engine_id  text not null,
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  primary key (user_id, id)
);

-- Applied separately so a database created before these columns existed picks
-- them up. No-ops once they are there.
alter table public.bikes add column if not exists model_id text;
alter table public.bikes add column if not exists year integer;
-- "km" or "mi". Null means kilometres, which is what every bike saved before
-- the choice existed was reading in. It has to live here and not only on the
-- device: without it a sync pulls back a bike with no unit and silently
-- resets the rider's choice, and the pool is then handed miles labelled as
-- kilometres.
alter table public.bikes add column if not exists units text;

-- Carry the old printed names over to ids before the old column goes, or the
-- upgrade would quietly throw away which bike each row was. The old names map
-- onto the ids exactly — lowercased, spaces to hyphens — and anything that
-- does not land on a known id is left null rather than invented, so a rider
-- picks it again from the dropdown instead of carrying a value nothing matches.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bikes' and column_name = 'model'
  ) then
    update public.bikes
       set model_id = lower(replace(model, ' ', '-'))
     where model is not null
       and model_id is null
       and lower(replace(model, ' ', '-')) in (
         '950-adventure', '950-adventure-s', '950-supermoto', '950-super-enduro-r',
         '990-adventure', '990-adventure-s', '990-adventure-r', '990-adventure-dakar',
         '990-super-duke', '990-super-duke-r', '990-supermoto', '990-supermoto-r',
         '990-supermoto-t'
       );

    alter table public.bikes drop column model;
  end if;
end
$$;

create table if not exists public.service_records (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  bike_id    text not null,
  engine_id  text not null,
  date       text not null,
  odometer   integer,
  title      text,
  -- Valve readings keyed by position id. All sizes are whole microns; storing
  -- the readings whole keeps the app's shape and avoids a row per valve.
  readings   jsonb not null default '{}'::jsonb,
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  primary key (user_id, id)
);

-- Sync pulls everything for one rider on every reconcile.
create index if not exists service_records_user_idx
  on public.service_records (user_id);

alter table public.bikes           enable row level security;
alter table public.service_records enable row level security;

-- Reach these tables through the Data API as a signed-in rider, and as nothing
-- else. Stated explicitly rather than relying on the project setting that
-- exposes new tables automatically: with that setting off, a table is reachable
-- only because a line here says so, and a future table added without its
-- policies written yet is unreachable instead of public.
--
-- This is the outer lock. The inner one is the row-level policies below, which
-- decide which of the rows a signed-in rider can actually see — their own.
grant select, insert, update, delete on public.bikes           to authenticated;
grant select, insert, update, delete on public.service_records to authenticated;

-- A rider can see and change their own rows and nobody else's. There is no
-- policy for anonymous access, so an unauthenticated key sees nothing at all.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bikes' and policyname = 'bikes_own_rows'
  ) then
    create policy bikes_own_rows on public.bikes
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'service_records' and policyname = 'records_own_rows'
  ) then
    create policy records_own_rows on public.service_records
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;


-- ---------------------------------------------------------------------------
-- A note for phase 2, written here because getting it wrong is unrecoverable.
--
-- Both tables above cascade on user deletion, which is right for them: they
-- hold one rider's own service history, and closing an account should take it.
--
-- The shared pool must NOT be built this way, and must not be computed from
-- these tables either. Deleting an account has to leave the pooled figures
-- intact, so a contribution is a COPY, written when the rider opts in, into its
-- own table that:
--
--   * has no user_id and no foreign key to auth.users, so nothing cascades
--     into it and no join can lead from a reading back to a person;
--   * carries an opaque contributor token instead — a random value stored
--     against the account, which is what lets the app answer "has this rider
--     contributed?" for the comparison gate, and what an account deletion
--     drops. Losing the token leaves the readings standing and orphaned,
--     which is the intended end state;
--   * holds only what an average needs: engine, valve position, odometer,
--     clearances, dates. No names, no email, no bike nickname.
--
-- The consequence, stated plainly: once the token is gone those rows cannot be
-- traced back or removed individually, because nothing records whose they were.
-- That is the deliberate trade for a dataset that survives its contributors.
--
-- What follows is that note, built.
-- ---------------------------------------------------------------------------


-- Which token a rider's pooled readings are keyed under.
--
-- This is the only table that knows a token belongs to somebody, and it is the
-- only one that cascades. Close an account and this row goes; the readings it
-- keyed stay, and become unattributable in the same instant. That is the whole
-- design in one sentence.
--
-- It carries no consent flag. Contributing is not a decision a rider makes —
-- using the app is what puts their measurements in the pool — so there is
-- nothing here to record an answer to, and nothing to switch off.
create table if not exists public.contributors (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  -- 32 random bytes, hex, generated on the device. Every pooled reading of
  -- theirs is keyed on a hash of this; see src/lib/pool.ts.
  token       text not null unique,
  updated_at  text not null
);

-- Dropped from the earlier shape, which asked. Guarded so this file stays
-- re-runnable, and so a database created after the change never grew them.
alter table public.contributors drop column if exists opted_in_at;
alter table public.contributors drop column if exists withdrawn_at;

alter table public.contributors enable row level security;
grant select, insert, update on public.contributors to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contributors'
      and policyname = 'contributors_own_row'
  ) then
    create policy contributors_own_row on public.contributors
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;


-- The pool itself. One row is one valve at one service.
--
-- No user_id, no foreign key, nothing that leads anywhere. The three keys are
-- SHA-256 hashes of a contributor's token joined to an id the app holds
-- privately: readings from one bike share a bike_key and so can be lined up
-- into a wear rate, while the hash cannot be run backwards and the token that
-- made it is one cascade away from being gone.
create table if not exists public.pooled_readings (
  id                  text primary key,
  bike_key            text not null,
  service_key         text not null,
  model_id            text,
  year                integer,
  engine_id           text not null,
  position_id         text not null,
  valve_type          text not null,
  -- "2026-08". The day is not recorded: it adds nothing to a wear rate and
  -- would make a reading easy to match against somebody describing the
  -- service they did that afternoon.
  month               text,
  -- Kilometres, always, whatever the contributing bike's clock reads in. The
  -- app converts on the way in; see toKm in src/lib/format.ts. A pool that
  -- accepted both units would not fail, it would quietly average 60,000 miles
  -- together with 60,000 km as though they were the same distance.
  odometer            integer,
  shim                integer,
  clearance           integer not null,
  chosen_shim         integer,
  confirmed_clearance integer,
  created_at          text not null,
  updated_at          text not null,

  -- When this reading reached the pool, by the server's clock rather than the
  -- device's. It is the only date here that a rider cannot influence, which is
  -- why the retraction window below is measured against it and not against
  -- created_at — that one is the date of the service, and is whatever the
  -- phone said it was.
  pooled_at           timestamptz not null default now(),

  -- Sanity, not validation: the app is the only writer and it writes whole
  -- microns. These exist so that a bug which starts sending millimetres, or a
  -- year of 20I0, is stopped at the door rather than quietly averaged in
  -- forever. The bounds are wide on purpose — they are absurdity limits, not
  -- specifications, and must not need revisiting when a model is added.
  constraint pooled_readings_valve_type check (valve_type in ('intake', 'exhaust')),
  constraint pooled_readings_month check (month is null or month ~ '^\d{4}-\d{2}$'),
  constraint pooled_readings_year check (year is null or year between 1950 and 2100),
  constraint pooled_readings_odometer check (odometer is null or odometer between 0 and 2000000),
  constraint pooled_readings_clearance check (clearance between 0 and 5000),
  constraint pooled_readings_shim check (shim is null or shim between 0 and 10000),
  constraint pooled_readings_chosen_shim check (chosen_shim is null or chosen_shim between 0 and 10000),
  constraint pooled_readings_confirmed check (confirmed_clearance is null or confirmed_clearance between 0 and 5000)
);

-- Applied separately so a pool created before this column existed picks it up.
-- Rows already in it are stamped with the moment it is added, which starts
-- their retraction window now rather than pretending they arrived earlier.
alter table public.pooled_readings
  add column if not exists pooled_at timestamptz not null default now();

-- The two questions the comparison will ask: one bike's readings for a valve
-- in odometer order, and every reading for a model.
create index if not exists pooled_readings_bike_idx
  on public.pooled_readings (bike_key, position_id, odometer);
create index if not exists pooled_readings_model_idx
  on public.pooled_readings (model_id, valve_type);

-- Deliberately unreachable through the Data API — no grants, and row level
-- security on with no policy behind it, so both locks are shut. Everything
-- goes through the function below, which runs as the table's owner.
--
-- The reason is blunt: PostgREST will happily run an UPDATE or DELETE with no
-- filter on it. Granting those to `authenticated` would let anybody who can
-- sign up rewrite or empty the entire pool in one request. Insert alone is not
-- enough either, because a contribution has to be able to overwrite its own
-- earlier copy. So the table takes no direct traffic at all.
alter table public.pooled_readings enable row level security;
revoke all on public.pooled_readings from anon, authenticated;


-- The only way in.
--
-- Runs as the owner, so it reaches past the locks above, and it refuses anyone
-- without a contributor row of their own — which is every signed-in rider, the
-- app creates it on first sync.
--
-- Retractions are named ids and nothing else: no filter is ever accepted from
-- the caller, so the worst a malicious rider can do is delete rows whose ids
-- they can produce — which means rows derived from their own token. Guessing
-- one is guessing a SHA-256.
--
-- And a retraction only works for a month. Deleting a service is how a rider
-- takes a mistyped reading back out while it is still fresh; after that the
-- pool keeps it and the deletion only affects what they themselves can see.
-- The window is enforced here rather than in the app, because a rule the
-- client could simply decline to apply is not a rule.
create or replace function public.contribute_readings(
  readings jsonb default '[]'::jsonb,
  retract  text[] default '{}'::text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me      public.contributors%rowtype;
  written integer := 0;
begin
  select * into me from public.contributors where user_id = auth.uid();

  if me.user_id is null then
    raise exception 'no contributor record for this account';
  end if;

  -- A rider with a hundred services sends a few hundred rows. Anything near
  -- this is a bug or an attempt to fill the table.
  if jsonb_array_length(coalesce(readings, '[]'::jsonb)) > 5000
     or coalesce(array_length(retract, 1), 0) > 5000 then
    raise exception 'too many rows in one call';
  end if;

  -- Retractions first. A valve whose measurement was cleared arrives in the
  -- retract list, and one that was re-entered arrives in both lists — deleting
  -- before inserting is what makes the second case land the right way round.
  --
  -- The app re-sends every retraction it knows about on every push, so this
  -- list keeps naming readings that are long past the window. Those simply do
  -- not match, which is the intended outcome and not an error.
  if coalesce(array_length(retract, 1), 0) > 0 then
    delete from public.pooled_readings
     where id = any(retract)
       and pooled_at > now() - interval '30 days';
  end if;

  insert into public.pooled_readings (
    id, bike_key, service_key, model_id, year, engine_id, position_id,
    valve_type, month, odometer, shim, clearance, chosen_shim,
    confirmed_clearance, created_at, updated_at
  )
  select
    r.id, r.bike_key, r.service_key, r.model_id, r.year, r.engine_id,
    r.position_id, r.valve_type, r.month, r.odometer, r.shim, r.clearance,
    r.chosen_shim, r.confirmed_clearance, r.created_at, r.updated_at
  from jsonb_to_recordset(coalesce(readings, '[]'::jsonb)) as r (
    id text, bike_key text, service_key text, model_id text, year integer,
    engine_id text, position_id text, valve_type text, month text,
    odometer integer, shim integer, clearance integer, chosen_shim integer,
    confirmed_clearance integer, created_at text, updated_at text
  )
  -- Re-sending an unchanged service is the normal case, not an error: the id
  -- is derived from the service, so the same reading always lands on the same
  -- row. A rider's devices agree with each other before any of this runs — see
  -- the reconcile in src/lib/sync.ts — so whatever arrives is already the copy
  -- they have settled on.
  --
  -- `pooled_at` is pointedly absent from the update list. It records when the
  -- reading first arrived, and editing a service must not push that forward —
  -- otherwise a year-old reading could be handed a fresh month to be deleted
  -- in by changing one digit and putting it back.
  on conflict (id) do update set
    bike_key            = excluded.bike_key,
    service_key         = excluded.service_key,
    model_id            = excluded.model_id,
    year                = excluded.year,
    engine_id           = excluded.engine_id,
    position_id         = excluded.position_id,
    valve_type          = excluded.valve_type,
    month               = excluded.month,
    odometer            = excluded.odometer,
    shim                = excluded.shim,
    clearance           = excluded.clearance,
    chosen_shim         = excluded.chosen_shim,
    confirmed_clearance = excluded.confirmed_clearance,
    updated_at          = excluded.updated_at;

  get diagnostics written = row_count;
  return written;
end;
$$;

-- Functions are executable by everybody by default, which is not what is
-- wanted here.
revoke all on function public.contribute_readings(jsonb, text[]) from public, anon;
grant execute on function public.contribute_readings(jsonb, text[]) to authenticated;


-- The only way out.
--
-- The Compare page needs to read the pool, and the table above is sealed: no
-- grants, RLS on with no policy behind it. So reading goes through here, on the
-- same terms writing does — owner rights, contributors only, and nothing the
-- caller sends is a filter over rows they get to see one at a time.
--
-- What comes back is only ever a shape: counts per size band, and the min, max
-- and mean. Never a row. A caller cannot ask "show me the readings", only "how
-- are they spread", which is the entire question the page asks anyway.
--
-- `min_bikes` is the reason this can be said out loud. A spread built from one
-- motorcycle is that motorcycle's data wearing a costume, and narrow filters —
-- one model, one year — are exactly how you would go looking for it. Below the
-- threshold the counts still come back, so the page can say how many more are
-- needed rather than looking broken, but the shape does not.
-- The shape this had before the mileage window was added. Postgres treats a
-- changed argument list as a different function rather than a replacement, so
-- without this both would exist, and a call naming only the first three would
-- be ambiguous rather than picking the newer one.
drop function if exists public.pool_shim_distribution(text[], integer[], boolean);

create or replace function public.pool_shim_distribution(
  model_ids   text[]    default null,
  years       integer[] default null,
  latest_only boolean   default false,
  -- Kilometres, like everything else stored here. A rider reading in miles has
  -- their window converted by the app before it is asked for, so this stays a
  -- plain comparison and never has to know what unit anybody prefers.
  odo_min_km  integer   default null,
  odo_max_km  integer   default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Deliberately low. It is the difference between "several bikes" and "a
  -- bike", not a statistical claim; the page prints the sample size next to
  -- every figure so the reader can judge the rest for themselves.
  min_bikes constant integer := 3;
  result jsonb;
begin
  if not exists (select 1 from public.contributors where user_id = auth.uid()) then
    raise exception 'no contributor record for this account';
  end if;

  with filtered as (
    select r.*
      from public.pooled_readings r
     -- Thickness is the whole subject. A valve that passed and was never
     -- pulled has no shim recorded and nothing to place on the scale.
     where r.shim is not null
       and (model_ids is null or r.model_id = any(model_ids))
       and (years     is null or r.year     = any(years))
       -- A reading with no odometer is dropped once a window is asked for,
       -- rather than assumed to fall inside it. "I don't know where this one
       -- sits" is not the same claim as "it sits in your range".
       and (odo_min_km is null
            or (r.odometer is not null and r.odometer >= odo_min_km))
       and (odo_max_km is null
            or (r.odometer is not null and r.odometer <= odo_max_km))
  ),
  ranked as (
    select f.*,
           row_number() over (
             partition by f.bike_key, f.position_id
             order by f.odometer desc nulls last,
                      f.month    desc nulls last,
                      f.updated_at desc
           ) as rn
      from filtered f
  ),
  -- Either every reading ever pooled, or just what is in each bike now — one
  -- per valve per bike, the furthest along its odometer. Without the second,
  -- "what are people running" would count a rider who services often far more
  -- times than one who does not.
  chosen as (
    select * from ranked where not latest_only or rn = 1
  ),
  stats as (
    select valve_type,
           count(*)::int                as readings,
           count(distinct bike_key)::int as bikes,
           min(shim)::int               as min_um,
           max(shim)::int               as max_um,
           round(avg(shim))::int        as avg_um
      from chosen
     group by valve_type
  ),
  -- 25 microns: the real step between one shim and the next. Binning finer
  -- would invent gaps between sizes that cannot be bought.
  binned as (
    select valve_type, (shim / 25) * 25 as bin_um, count(*)::int as n
      from chosen
     group by valve_type, (shim / 25) * 25
  )
  select jsonb_object_agg(
           s.valve_type,
           jsonb_build_object(
             'readings', s.readings,
             'bikes',    s.bikes,
             'enough',   s.bikes >= min_bikes,
             'minBikes', min_bikes,
             'min',      case when s.bikes >= min_bikes then s.min_um end,
             'max',      case when s.bikes >= min_bikes then s.max_um end,
             'avg',      case when s.bikes >= min_bikes then s.avg_um end,
             'bins',     case when s.bikes >= min_bikes then (
                           select coalesce(
                                    jsonb_agg(
                                      jsonb_build_array(b.bin_um, b.n)
                                      order by b.bin_um
                                    ),
                                    '[]'::jsonb
                                  )
                             from binned b
                            where b.valve_type = s.valve_type
                         ) else '[]'::jsonb end
           )
         )
    into result
    from stats s;

  return coalesce(result, '{}'::jsonb);
end;
$$;

revoke all on function
  public.pool_shim_distribution(text[], integer[], boolean, integer, integer)
  from public, anon;
grant execute on function
  public.pool_shim_distribution(text[], integer[], boolean, integer, integer)
  to authenticated;
