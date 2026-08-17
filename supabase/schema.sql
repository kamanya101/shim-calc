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


-- Who has agreed to contribute, and under what token.
--
-- This is the only table that knows a token belongs to somebody, and it is the
-- only one that cascades. Close an account and this row goes; the readings it
-- keyed stay, and become unattributable in the same instant. That is the whole
-- design in one sentence.
create table if not exists public.contributors (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  -- 32 random bytes, hex, generated on the device. Every pooled reading of
  -- theirs is keyed on a hash of this; see src/lib/pool.ts.
  token       text not null unique,
  opted_in_at text,
  -- Set when sharing is switched off. Stops anything further going up and
  -- closes the comparison; what is already pooled is not touched.
  withdrawn_at text,
  updated_at  text not null
);

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
  odometer            integer,
  shim                integer,
  clearance           integer not null,
  chosen_shim         integer,
  confirmed_clearance integer,
  created_at          text not null,
  updated_at          text not null,

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
-- Runs as the owner, so it reaches past the locks above, and it checks the
-- caller's own consent row before it writes a thing. Withdrawn consent, or no
-- consent at all, and the call is refused.
--
-- Retractions are named ids and nothing else: no filter is ever accepted from
-- the caller, so the worst a malicious rider can do is delete rows whose ids
-- they can produce — which means rows derived from their own token. Guessing
-- one is guessing a SHA-256.
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
    raise exception 'no contribution consent on record';
  end if;
  if me.withdrawn_at is not null then
    raise exception 'contribution consent has been withdrawn';
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
  if coalesce(array_length(retract, 1), 0) > 0 then
    delete from public.pooled_readings where id = any(retract);
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
