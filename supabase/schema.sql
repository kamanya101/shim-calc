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
-- ---------------------------------------------------------------------------
