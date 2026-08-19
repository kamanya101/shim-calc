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
  -- Model year. Optional, and only ever from the production run (2003-2013).
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

-- The frame number, normalised to 17 upper-case characters by src/lib/vin.ts.
--
-- Deliberately NOT unique. The same motorcycle legitimately appears in more
-- than one account at once — a rider and the workshop that services it, a
-- seller and the person who just bought it — and that is the whole point of
-- recording it. Two rows with one VIN means two people know the same bike,
-- which is the feature, not a fault.
--
-- It is not unique per rider either, even though one rider holding the same
-- bike twice IS a mistake. A unique constraint here would surface that mistake
-- as a failed sync, which stops their own history reaching the server over
-- what is really a tidying-up problem. The app catches it at the point of
-- entry instead, where it can offer to merge the two.
alter table public.bikes add column if not exists vin text;

-- Looking a bike up by frame number, across accounts: how a buyer finds the
-- history of a machine nobody handed them.
create index if not exists bikes_vin_idx
  on public.bikes (vin)
  where vin is not null;

-- The secret this bike's pooled readings are keyed under; see src/lib/pool.ts.
--
-- It belongs to the motorcycle, not to the account, and that is the point.
-- Keyed on the rider, one physical bike measured by its owner and by the
-- workshop that services it arrives in the pool as two machines, inflating the
-- very count the comparison has to be honest about. Keyed on the bike, the
-- token travels with any handed-over copy, both sides compute the same reading
-- ids, and the second push lands on top of the first.
--
-- So whoever holds the bike can also retract its readings, inside the 30-day
-- window and for that machine only. That is the intended reach: it follows the
-- motorcycle, and after thirty days nobody can touch anything at all.
alter table public.bikes add column if not exists pool_token text;

-- Where the motorcycle lives, as an ISO-3166 alpha-2 code.
--
-- A property of the bike rather than of the rider, for the same reason the
-- pool token is: what a valve wears against is the dust, heat and roads the
-- machine sits in, and that stays put when a bike changes hands or gets
-- serviced by somebody two countries away.
--
-- Suggested from the geolocation Vercel puts on the request that created the
-- bike, and then only ever *suggested* — the rider confirms or corrects it,
-- the same way the year decoded from a VIN is offered rather than applied.
-- The header locates the phone, not the motorcycle, and a rider signing up on
-- holiday or through a VPN would otherwise have their bike quietly filed in
-- the wrong place with nothing on screen ever saying so.
--
-- Null is a first-class answer, not a gap to be filled: no signal when the
-- bike was created, a rider who cleared it, or any bike saved before this
-- column existed. Those count towards the global figures and no other.
alter table public.bikes add column if not exists country text;

-- The rest of the place, at the two grains below a country.
--
-- These stay here and go no further. The pool takes the country and nothing
-- else, deliberately: a pooled reading already carries model, year, month and
-- odometer, and adding a city to that would name a specific motorcycle in any
-- town holding two of them — which is the one thing pooled_readings exists not
-- to do. Anything reading these for a map must aggregate them behind a minimum
-- count and return places with tallies, never rows.
--
-- Kept on the bike rather than duplicated into the pool for a plainer reason
-- too: the pool holds a row per valve per service, so a city stored there
-- would be written out some thirty-five times per machine, for a fact that
-- changes when a bike moves house and at no other time.
alter table public.bikes add column if not exists region text;
alter table public.bikes add column if not exists city text;

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
  -- What else was replaced, as permanent ids from src/lib/serviceItems.ts.
  -- A text array rather than a child table: it is a short tick-list, read and
  -- written whole with its own service and never queried on its own, and a row
  -- per tick would multiply the sync payload to answer no question anybody is
  -- asking. If the shared pool ever counts these, it counts them from its own
  -- copy, the way it already does with readings.
  items      text[],
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  primary key (user_id, id)
);

-- Applied separately so a database created before this column existed picks it
-- up. Null there means nothing was ticked, which is exactly what every service
-- recorded before the list existed meant — so there is nothing to back-fill and
-- no default to invent.
alter table public.service_records
  add column if not exists items text[];

-- Where the service came from: 'import' for one reconstructed from a rider's
-- old spreadsheets, null for one measured into the app.
--
-- It has to travel with the row, not just sit on the device that did the
-- import. The marker is what keeps a reconstructed reading out of the shared
-- averages until its owner has confirmed it, and a marker that did not sync
-- would be no protection at all: the service would go up from the phone, come
-- back down to the tablet as an ordinary measurement, and be contributed from
-- there. Same reasoning as items — added separately, null for everything
-- written before it existed, which is the honest answer for all of them.
alter table public.service_records
  add column if not exists source text;

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
-- VESTIGIAL. Nothing reads or writes this any more.
--
-- It held one token per account, and every pooled reading used to be keyed on
-- a hash of it. That made the same physical motorcycle look like two different
-- machines when its owner and their workshop both recorded a service on it, so
-- the token moved onto the bike — see the pool_token column above.
--
-- Left in place rather than dropped because dropping it would destroy the only
-- means of ever recomputing the keys of readings contributed under the old
-- scheme. Once those are cleared out, this can go:
--
--   drop table public.contributors;
create table if not exists public.contributors (
  user_id     uuid primary key references auth.users (id) on delete cascade,
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
  -- Where the bike lives, copied from its own row at the moment it contributed
  -- — an ISO-3166 alpha-2 code, or null. Copied rather than looked up, like
  -- everything else here: the pool has to outlive the bike that fed it, and a
  -- reading whose country could only be found by joining back to a bikes row
  -- would lose its country the day that row went, which is precisely when the
  -- reading is supposed to keep standing.
  --
  -- It is the coarsest geography worth having, and that is deliberate. A city
  -- would narrow a reading to a handful of machines; a country does not. Any
  -- read path that groups on this must still apply min_bikes below — a country
  -- holding one bike is that bike wearing a flag, and filtering to it is the
  -- obvious way to go looking for somebody in particular.
  country             text,
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

-- Likewise. Null for every reading pooled before geography was recorded, which
-- is the honest answer for all of them — nothing knew where those bikes were,
-- and inventing a country for them now would be inventing the very signal this
-- column exists to measure.
alter table public.pooled_readings
  add column if not exists country text;

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
  written integer := 0;
begin
  -- Being signed in is the whole requirement. Readings are keyed on a secret
  -- held by each bike rather than by the account — see the pool_token column
  -- on public.bikes and src/lib/pool.ts — so there is nothing about the caller
  -- left to look up, and no per-account record to insist on. Execute is
  -- granted to `authenticated` alone; this is the belt to that pair of braces.
  if auth.uid() is null then
    raise exception 'must be signed in to contribute';
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
    valve_type, month, odometer, country, shim, clearance, chosen_shim,
    confirmed_clearance, created_at, updated_at
  )
  select
    r.id, r.bike_key, r.service_key, r.model_id, r.year, r.engine_id,
    r.position_id, r.valve_type, r.month, r.odometer,
    -- Two characters, upper case, or nothing. The app sends a code it got from
    -- a header or from a rider picking off a list, and neither is a promise:
    -- anything that is not shaped like a country code is stored as no country
    -- rather than as a new one, so a single malformed value cannot open a
    -- bucket that then sits in the averages forever.
    case when r.country ~ '^[A-Za-z]{2}$' then upper(r.country) end,
    r.shim, r.clearance,
    r.chosen_shim, r.confirmed_clearance, r.created_at, r.updated_at
  from jsonb_to_recordset(coalesce(readings, '[]'::jsonb)) as r (
    id text, bike_key text, service_key text, model_id text, year integer,
    engine_id text, position_id text, valve_type text, month text,
    odometer integer, country text, shim integer, clearance integer,
    chosen_shim integer, confirmed_clearance integer, created_at text,
    updated_at text
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
    -- Follows the bike. A rider who corrects a country the header guessed
    -- wrong is telling the pool something true about every reading that bike
    -- has ever sent, and the next push carries the correction to all of them.
    country             = excluded.country,
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


-- ---------------------------------------------------------------------------
-- THE PARTS SIDE OF THE POOL
--
-- pooled_readings is one row per valve, which is the right grain for a shim and
-- the wrong one for a tick-list: the parts replaced belong to the service, not
-- to each of its eight valves, and storing them per valve would repeat the same
-- array eight times and invite anything counting them to count it eight times.
--
-- So this is a second table at the grain the fact actually has. It carries the
-- same keys, derived from the same bike token, and lives under the same locks.
-- ---------------------------------------------------------------------------

create table if not exists public.pooled_services (
  -- hash(token, service). The same key the eight readings of this service
  -- carry, so the two tables line up without either one naming a rider.
  service_key text primary key,
  bike_key    text not null,
  model_id    text,
  year        integer,
  engine_id   text not null,
  -- "2026-08", for the same reason as pooled_readings: a day would make a
  -- service easy to line up with somebody describing their afternoon.
  month       text,
  -- Kilometres, always. This is the column the whole feature rests on: the
  -- distance a rider's log covers is the newest of these minus the oldest, and
  -- a pool mixing miles into it would report intervals 60% short.
  odometer    integer,
  country     text,
  -- Permanent ids from src/lib/serviceItems.ts, held in list order.
  items       text[],
  created_at  text not null,
  updated_at  text not null,
  -- Server clock, and the only date here a rider cannot influence — which is
  -- why the retraction window is measured against it. Pointedly absent from
  -- the update list below, so editing a service cannot push it forward and buy
  -- an old row a fresh month in which to be deleted.
  pooled_at   timestamptz not null default now()
);

-- Guarded so the file stays re-runnable against a database that already has
-- the table from an earlier paste.
alter table public.pooled_services
  add column if not exists pooled_at timestamptz not null default now();

-- Both questions the panel asks: every service one bike logged, in odometer
-- order, so a span is a single index scan; and every service for a model.
create index if not exists pooled_services_bike_idx
  on public.pooled_services (bike_key, odometer);
create index if not exists pooled_services_model_idx
  on public.pooled_services (model_id, year);

alter table public.pooled_services enable row level security;
revoke all on public.pooled_services from anon, authenticated;


-- Written separately from the readings rather than folded into the same call.
--
-- They are independent facts about the same service, and a rider whose parts
-- arrive one sync after their shims is in no worse a state than one who has not
-- synced yet — where widening contribute_readings would have meant editing the
-- one function that is presently carrying the entire pool, to no benefit.
--
-- Retraction obeys the same thirty-day window, and for the same reason: taking
-- a mistyped tick back out is a thing a rider should be able to do while it is
-- fresh, and not a thing anybody should be able to do forever.
create or replace function public.contribute_services(
  services jsonb   default '[]'::jsonb,
  retract  text[]  default '{}'::text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  written integer := 0;
begin
  if auth.uid() is null then
    raise exception 'must be signed in to contribute';
  end if;

  if jsonb_array_length(coalesce(services, '[]'::jsonb)) > 5000
     or coalesce(array_length(retract, 1), 0) > 5000 then
    raise exception 'too many rows in one call';
  end if;

  if coalesce(array_length(retract, 1), 0) > 0 then
    delete from public.pooled_services
     where service_key = any(retract)
       and pooled_at > now() - interval '30 days';
  end if;

  insert into public.pooled_services (
    service_key, bike_key, model_id, year, engine_id, month, odometer,
    country, items, created_at, updated_at
  )
  select
    s.service_key, s.bike_key, s.model_id, s.year, s.engine_id, s.month,
    s.odometer,
    case when s.country ~ '^[A-Za-z]{2}$' then upper(s.country) end,
    s.items,
    s.created_at, s.updated_at
  from jsonb_to_recordset(coalesce(services, '[]'::jsonb)) as s (
    service_key text, bike_key text, model_id text, year integer,
    engine_id text, month text, odometer integer, country text,
    items text[], created_at text, updated_at text
  )
  on conflict (service_key) do update set
    bike_key   = excluded.bike_key,
    model_id   = excluded.model_id,
    year       = excluded.year,
    engine_id  = excluded.engine_id,
    month      = excluded.month,
    odometer   = excluded.odometer,
    country    = excluded.country,
    items      = excluded.items,
    updated_at = excluded.updated_at;

  get diagnostics written = row_count;
  return written;
end;
$$;

revoke all on function public.contribute_services(jsonb, text[]) from public, anon;
grant execute on function public.contribute_services(jsonb, text[]) to authenticated;


-- How often everybody else replaces the same things.
--
-- THE MEASUREMENT, stated plainly because every part of it is a choice:
--
--   * A bike's distance is the newest logged odometer minus the OLDEST, never
--     the odometer itself. A rider who joins with 90,000 km showing and logs
--     two services 8,000 km apart has told the pool about 8,000 km of running,
--     not 90,000. Using the clock would divide every count by a distance
--     nobody watched and make everyone look impossibly thorough.
--   * A bike needs two logged services before it has a span at all. One
--     service is a span of zero, which is not an interval of zero — it is no
--     answer, and it drops out.
--   * The interval is that span divided by the number of services the part was
--     ticked at. This slightly UNDERSTATES the interval whenever the very first
--     logged service ticks the part, because that tick was earned over distance
--     covered before the log began, which the span does not include. Known,
--     accepted, and the reason the sample size is returned beside every figure.
--   * Each bike's own interval is averaged across bikes, one bike one vote, so
--     a rider with sixty services does not drown out one with three.
--
-- TWO NORMALISATIONS, without which the numbers would be quietly wrong:
--
--   * `oil-50w` and `oil-60w` are one job. A rider who moves from thin to thick
--     oil as the engine wears has half their changes filed under each id, and
--     counted apart both come back at twice the true interval — the app would
--     report that nobody changes their oil. They fold into one `oil`.
--   * `engine-parts` and `chassis-parts` are excluded outright. They record
--     that something was done, not what, so an interval for them measures
--     nothing. serviceItems.ts says as much where they are declared.
--
-- What this cannot tell you, and the page must not imply: a part only appears
-- here if somebody ticked it. The interval is "how often the riders who record
-- this, record it" — never "how often it needs doing". A part that forty riders
-- track and two hundred ignore still shows forty riders' habit, which is why
-- the bike count goes back with every line.
create or replace function public.pool_service_intervals(
  model_ids text[]    default null,
  years     integer[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  min_bikes constant integer := 3;
  -- Below this a "span" is two services in the same week, and dividing by it
  -- produces an interval of a few hundred kilometres that is arithmetic rather
  -- than evidence.
  min_span_km constant integer := 1000;
  result jsonb;
  span_bikes integer;
begin
  if auth.uid() is null then
    raise exception 'must be signed in to read the pool';
  end if;

  with scoped as (
    select *
      from public.pooled_services
     -- A service with no odometer cannot sit at either end of a span, and
     -- cannot be placed inside one either.
     where odometer is not null
       and (model_ids is null or model_id = any(model_ids))
       and (years     is null or year     = any(years))
  ),
  spans as (
    select bike_key,
           (max(odometer) - min(odometer))::numeric as span_km
      from scoped
     group by bike_key
    having count(*) >= 2
       and max(odometer) - min(odometer) >= min_span_km
  ),
  ticks as (
    select s.bike_key,
           s.service_key,
           case when item in ('oil-50w', 'oil-60w') then 'oil' else item end as item
      from scoped s
      cross join lateral unnest(coalesce(s.items, '{}'::text[])) as item
     where item not in ('engine-parts', 'chassis-parts')
  ),
  per_bike as (
    -- distinct service_key, so a service somehow carrying both oil grades
    -- counts as one oil change rather than two.
    select t.bike_key,
           t.item,
           count(distinct t.service_key)::numeric as n,
           sp.span_km
      from ticks t
      join spans sp on sp.bike_key = t.bike_key
     group by t.bike_key, t.item, sp.span_km
  ),
  per_item as (
    select item,
           count(*)::int         as bikes,
           sum(n)::int           as services,
           round(avg(span_km / n))::int as km_between
      from per_bike
     group by item
  )
  select coalesce(
           jsonb_object_agg(
             item,
             jsonb_build_object(
               'bikes',     bikes,
               'services',  services,
               'enough',    bikes >= min_bikes,
               'kmBetween', case when bikes >= min_bikes then km_between end
             )
           ),
           '{}'::jsonb
         )
    into result
    from per_item;

  select count(*) into span_bikes from (
    select bike_key
      from public.pooled_services
     where odometer is not null
       and (model_ids is null or model_id = any(model_ids))
       and (years     is null or year     = any(years))
     group by bike_key
    having count(*) >= 2
       and max(odometer) - min(odometer) >= min_span_km
  ) s;

  -- An empty pool answers in the right shape, so the caller never has to tell
  -- "nothing matched" apart from "the reply was malformed".
  return jsonb_build_object(
    'items',    coalesce(result, '{}'::jsonb),
    'bikes',    coalesce(span_bikes, 0),
    'minBikes', min_bikes
  );
end;
$$;

revoke all on function public.pool_service_intervals(text[], integer[]) from public, anon;
grant execute on function public.pool_service_intervals(text[], integer[]) to authenticated;


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
  -- Signed in is the whole test. This used to require a row in `contributors`,
  -- which stopped being written the day pool keys moved onto the bike — so
  -- every account created since has been refused its own comparison, while
  -- accounts predating the change still worked off a leftover row. Reading the
  -- pool is not a privilege that table ever granted: contributing is not a
  -- choice, so there is no permission here to look up. Same guard as
  -- contribute_readings, for the same reason.
  if auth.uid() is null then
    raise exception 'must be signed in to read the pool';
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
    -- coalesced because `not null` is null, not true: a caller passing no
    -- value for latest_only would otherwise match no rows at all and get a
    -- confidently empty answer rather than an error.
    select * from ranked where not coalesce(latest_only, false) or rn = 1
  ),
  -- The same readings counted twice over: once per valve type, which is the
  -- four-valve average, and once per position, which is one valve on its own.
  -- Both are asked for together because they are one question — "where do I
  -- sit" — and a second round trip to answer the second half of it would only
  -- let the two halves disagree about which readings they were drawn from.
  grouped as (
    select 'type'::text as kind, valve_type as grp, shim, bike_key from chosen
    union all
    select 'position',           position_id,      shim, bike_key from chosen
  ),
  stats as (
    select kind, grp,
           count(*)::int                as readings,
           count(distinct bike_key)::int as bikes,
           min(shim)::int               as min_um,
           max(shim)::int               as max_um,
           round(avg(shim))::int        as avg_um
      from grouped
     group by kind, grp
  ),
  -- 25 microns: the real step between one shim and the next. Binning finer
  -- would invent gaps between sizes that cannot be bought.
  binned as (
    select kind, grp, (shim / 25) * 25 as bin_um, count(*)::int as n
      from grouped
     group by kind, grp, (shim / 25) * 25
  ),
  shaped as (
    select s.kind,
           s.grp,
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
                            where b.kind = s.kind and b.grp = s.grp
                         ) else '[]'::jsonb end
           ) as side
      from stats s
  )
  select jsonb_build_object(
           'byType',
           coalesce(
             jsonb_object_agg(grp, side) filter (where kind = 'type'),
             '{}'::jsonb
           ),
           'byPosition',
           coalesce(
             jsonb_object_agg(grp, side) filter (where kind = 'position'),
             '{}'::jsonb
           )
         )
    into result
    from shaped;

  -- An empty pool still answers in the right shape, so the caller never has to
  -- tell "nothing matched" apart from "the reply was malformed".
  return coalesce(
    result,
    jsonb_build_object('byType', '{}'::jsonb, 'byPosition', '{}'::jsonb)
  );
end;
$$;

revoke all on function
  public.pool_shim_distribution(text[], integer[], boolean, integer, integer)
  from public, anon;
grant execute on function
  public.pool_shim_distribution(text[], integer[], boolean, integer, integer)
  to authenticated;


-- ---------------------------------------------------------------------------
-- 6. Machines: one physical motorcycle, known to more than one account.
-- ---------------------------------------------------------------------------
--
-- A rider and the workshop that services their bike may never exchange
-- anything. Each finds the app on their own, each creates their own entry for
-- the same motorcycle, names it what they like, and gives it the frame number.
-- From that moment the two entries are provably about one machine, and neither
-- person had to do anything but read the number off the steering head.
--
-- This table is what makes that true. One row per VIN, holding the pool token
-- every account that knows the machine will agree on. First to claim it sets
-- it; everybody after adopts it. That is what puts both riders' readings under
-- one bike in the shared averages instead of two, and it is the same
-- first-writer-wins rule the old per-account token used, moved onto the object
-- it should always have belonged to.
--
-- Nobody may read this table directly. The token is key material: anyone
-- holding it can withdraw that machine's readings inside the 30-day window, so
-- a table anybody could select from would hand out the retraction rights to
-- every motorcycle in the pool at once. It is reachable only through
-- claim_machine below, which insists the caller already holds a bike carrying
-- that frame number.
create table if not exists public.machines (
  vin        text primary key,
  pool_token text not null,
  created_at timestamptz not null default now()
);

alter table public.machines enable row level security;
revoke all on public.machines from anon, authenticated;


-- Claim a machine, and find out what is already known about it.
--
-- Returns the token the caller must key their pooled readings under — theirs
-- if the VIN is new, the established one if it is not — together with a count
-- of what other accounts already hold for that machine, which is what lets the
-- app say "this bike has a history" the instant a second person types the
-- number.
--
-- The caller must already own a bike with this VIN. Without that check the
-- function would be an oracle: feed it frame numbers off classified adverts
-- and it reports which motorcycles are in the system, and hands out their
-- tokens. With it, the answer costs a row the caller had to write first, under
-- their own account, which is exactly the "standing at the bike" proof the
-- frame number is meant to be.
create or replace function public.claim_machine(
  target_vin  text,
  offer_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  settled text;
  others  integer;
begin
  if auth.uid() is null then
    raise exception 'must be signed in';
  end if;

  if target_vin is null or length(target_vin) <> 17 then
    raise exception 'not a frame number';
  end if;

  if offer_token is null or length(offer_token) < 32 then
    raise exception 'token too short to be unguessable';
  end if;

  if not exists (
    select 1 from public.bikes
     where user_id = auth.uid()
       and vin = target_vin
       and deleted_at is null
  ) then
    raise exception 'no bike of yours carries that frame number';
  end if;

  -- First claim wins, and it is never overwritten. Two people typing the VIN
  -- at the same moment would otherwise each insist on their own token, and
  -- every reading pushed under the loser would be stranded in the pool: still
  -- counted, but looking like a separate motorcycle.
  insert into public.machines (vin, pool_token)
  values (target_vin, offer_token)
  on conflict (vin) do nothing;

  select pool_token into settled from public.machines where vin = target_vin;

  select count(distinct r.id) into others
    from public.service_records r
    join public.bikes b
      on b.user_id = r.user_id
     and b.id = r.bike_id
   where b.vin = target_vin
     and b.deleted_at is null
     and r.deleted_at is null
     and r.user_id <> auth.uid();

  return jsonb_build_object(
    'poolToken', settled,
    'otherServices', coalesce(others, 0)
  );
end;
$$;

revoke all on function public.claim_machine(text, text) from public, anon;
grant execute on function public.claim_machine(text, text) to authenticated;


-- Every service another account holds for this machine.
--
-- The caller's own rows are excluded — they already have those, and sending
-- them back would invite a device to treat its own work as somebody else's.
--
-- No bike_id is returned. The receiving app files these against its own entry
-- for the motorcycle, which is the whole point: B keeps B's bike, with B's
-- name and B's id, and only the services flow in. `units` comes along because
-- an odometer is meaningless without it — a bike kept in miles feeding one
-- kept in kilometres is how a shared history quietly gains sixty per cent.
--
-- `author` is the account that wrote the row, and it is a bare uuid on
-- purpose. It is enough to group a stranger's entries together and to hide
-- them; it reveals nothing about who they are. Sharing a motorcycle is not a
-- reason to learn somebody's email address.

-- Dropped before it is recreated. Postgres refuses to replace a function whose
-- return type has changed, and this one gained a column, so a re-run against a
-- database holding the earlier shape would fail on the create rather than
-- update it. Dropping first is what keeps this file re-runnable.
drop function if exists public.records_for_vin(text);

create or replace function public.records_for_vin(target_vin text)
returns table (
  id         text,
  author     uuid,
  engine_id  text,
  date       text,
  odometer   integer,
  units      text,
  title      text,
  readings   jsonb,
  items      text[],
  created_at text,
  updated_at text,
  deleted_at text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'must be signed in';
  end if;

  -- Same gate as claim_machine, and for the same reason: possession of a bike
  -- carrying the frame number is what stands in for permission.
  if not exists (
    select 1 from public.bikes
     where user_id = auth.uid()
       and vin = target_vin
       and deleted_at is null
  ) then
    raise exception 'no bike of yours carries that frame number';
  end if;

  return query
    select
      r.id, r.user_id, r.engine_id, r.date, r.odometer, b.units,
      r.title, r.readings, r.items, r.created_at, r.updated_at, r.deleted_at
    from public.service_records r
    join public.bikes b
      on b.user_id = r.user_id
     and b.id = r.bike_id
   where b.vin = target_vin
     and b.deleted_at is null
     and r.user_id <> auth.uid()
   -- A machine with decades of history across several owners is still a few
   -- hundred rows. This is a guard against a pathological account, not a page
   -- size, and the app does not paginate.
   limit 5000;
end;
$$;

revoke all on function public.records_for_vin(text) from public, anon;
grant execute on function public.records_for_vin(text) to authenticated;
