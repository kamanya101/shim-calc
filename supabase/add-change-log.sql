-- Add the change log. Run once in the Supabase SQL editor.
-- Re-runnable — every statement is guarded, so running it twice is safe.
-- Identical to the block now at the end of supabase/schema.sql.


-- =====================================================================
-- The change log
--
-- Every insert, update and delete on a rider's own bikes and services,
-- kept with the row as it was before and as it became. Append-only: nothing
-- in here is ever updated or deleted by the app, which cannot reach it at
-- all.
--
-- It exists for one job. Most riders are not computer people, and the way
-- they will lose work is not a server fault but a wrong tap — a bike removed
-- instead of renamed, a column of clearances typed onto the wrong service,
-- an import run twice. When somebody writes to say their history has gone
-- wrong, this is what makes it possible to look at what they actually had
-- and put it back. Soft deletes alone cannot do that: they say a row is
-- gone, never what it held before somebody edited it.
--
-- Deliberately written by triggers rather than by the app. A log the client
-- maintains is a log that is missing exactly when it matters — a buggy
-- release, a half-finished sync, a direct fix run in this editor.
--
-- NOTE ON WHAT THE APP TELLS RIDERS. The pool card says a reading's link to
-- its owner "cannot be reconstructed later by anyone, including me". With
-- this table that is no longer strictly true: a pooled reading could be
-- matched back to an account by its clearances, odometer and month. The pool
-- itself still holds no identity, and retraction still removes pooled rows
-- as promised — but that one sentence overstates the case and should be
-- reworded when the wording is next revisited.
-- =====================================================================

create table if not exists public.change_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  -- Plain uuid with no foreign key, for the same reason the pool carries no
  -- user_id: this has to survive the account it describes. A reference here
  -- would cascade the whole history away at the moment it is most wanted.
  user_id     uuid,
  table_name  text not null,
  op          text not null check (op in ('insert', 'update', 'delete')),
  -- The row's own id. Not unique here — one row gathers many entries, which
  -- is the point.
  row_id      text not null,
  before      jsonb,
  after       jsonb
);

-- The two questions anybody asks of it: everything that happened to one
-- rider, and everything that happened to one record.
create index if not exists change_log_user_idx on public.change_log (user_id, at desc);
create index if not exists change_log_row_idx  on public.change_log (row_id, at desc);

-- Unreachable through the Data API, the same way the pool tables are: no
-- grants, row level security on with no policy behind it. Reading it is a
-- deliberate act in the SQL editor, not something the app can be talked into.
alter table public.change_log enable row level security;
revoke all on public.change_log from anon, authenticated;

create or replace function public.log_change()
returns trigger
language plpgsql
-- security definer so the trigger can write to a table the signed-in rider
-- has no grants on at all.
security definer
set search_path = public
as $$
declare
  acting_user uuid;
  acting_row  text;
begin
  -- Branched rather than coalesced: on a DELETE there is no `new` record at
  -- all, and reaching for a field of it is an error rather than a null.
  if tg_op = 'DELETE' then
    acting_user := old.user_id;
    acting_row  := old.id;
  else
    acting_user := new.user_id;
    acting_row  := new.id;
  end if;

  insert into public.change_log (user_id, table_name, op, row_id, before, after)
  values (
    acting_user,
    tg_table_name,
    lower(tg_op),
    acting_row,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  -- An AFTER trigger's return value is ignored, but returning the row that
  -- exists is clearer than returning a null nobody reads.
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Updates are filtered on the row actually changing. Sync upserts every row
-- it holds on every reconcile, so without this the log would fill with
-- thousands of entries recording that nothing happened, and the real edit
-- would be impossible to find.
drop trigger if exists bikes_change_log on public.bikes;
create trigger bikes_change_log
  after insert or delete on public.bikes
  for each row execute function public.log_change();

drop trigger if exists bikes_change_log_update on public.bikes;
create trigger bikes_change_log_update
  after update on public.bikes
  for each row when (old.* is distinct from new.*)
  execute function public.log_change();

drop trigger if exists records_change_log on public.service_records;
create trigger records_change_log
  after insert or delete on public.service_records
  for each row execute function public.log_change();

drop trigger if exists records_change_log_update on public.service_records;
create trigger records_change_log_update
  after update on public.service_records
  for each row when (old.* is distinct from new.*)
  execute function public.log_change();
