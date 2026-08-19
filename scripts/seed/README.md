# The simulated population

A fictitious crowd of LC8 owners, so the app can be looked at with a pool
behind it instead of one bike. It exists because most of what this app does
only becomes visible at scale: a heat map built from twenty readings is a row
of isolated bars, a parts interval from two riders is two riders' habits, and
neither tells you whether the page works.

**There are 260 of these accounts in the live database right now.** They are
mixed into the same pool as real data and nothing separates them but the
`@seed.invalid` email domain. Anything read off Compare is a property of this
simulation, not evidence about real riders.

## What it builds

| | |
|---|---|
| Accounts | 260 — 85% one bike, 10% two, 5% three |
| Bikes | 312, of which 10 are a second account's copy of a machine already here |
| Services | ~960, on 60% of bikes; the other 40% carry none, which is the state every rider passes through on the day they join |
| Geography | weighted to adventure-bike sales, ZA and AU deliberately over-represented |

Two effects are planted so any comparison has a known answer to be checked
against: South African bikes wear **×1.12** and Australian **×1.08** faster
than the rest. Both read back *attenuated*, and that is correct rather than
broken — a fast-wearing valve reaches the spec limit sooner and gets shimmed,
and an interval containing a shim change has to be excluded from a clean wear
measurement, so the fastest wear removes its own evidence. A real geographic
effect will always be understated for the same reason.

## Running it

```
node generate.mjs                              # writes members.json, offline
node --import ./register.mjs push.mjs          # signs each one up, writes as them
node --import ./register.mjs repush-services.mjs   # parts only, for accounts already seeded
node verify.mjs                                # reads back as six ordinary members
node intervals.mjs                             # the parts intervals, straight from the function
```

`push.mjs` and `repush-services.mjs` take `--dry` (build the payload, send
nothing), `--limit N`, and `--reset` (ignore the progress file). Start with
`--dry`. Both are resumable: progress is written after every account, so a run
that dies picks up where it stopped.

The seeder writes through the ordinary Data API as each member, and builds the
pool payload with the app's own `buildContribution` from `src/lib/pool.ts` —
imported directly, via the loader hook, rather than copied. That is deliberate:
a seeder with its own copy of the hashing would drift from the app and start
proving things about itself. It also means row level security is genuinely
exercised, because every write happens as that member and would fail if the
policies were wrong.

## Before regenerating, clear what is there

The generator is seeded, so a re-run reproduces the same 260 riders exactly —
but **changing anything in it shifts the whole random stream**, and every
email, id and token moves with it. The accounts already in the database then
correspond to nothing in the new `members.json`, and their pooled rows sit in
the averages forever with no way to name them.

```sql
-- Accounts. bikes and service_records cascade with them.
delete from auth.users where email like '%@seed.invalid';

-- The pool does NOT cascade — it holds no user_id, by design. This is only
-- safe as a time window, and only while the database has no real users.
delete from public.pooled_readings where pooled_at > now() - interval '6 hours';
delete from public.pooled_services where pooled_at > now() - interval '6 hours';
```

## Two things worth knowing

**Supabase rate-limits sign-ups hard.** 260 accounts took 38 minutes, almost
all of it waiting. Sign-ins are barely limited at all — the same 260 took 8
minutes in `repush-services.mjs`. If you only need to change what is *in* the
pool rather than who is in it, re-push; do not re-seed.

**`members.json` is not in git** and does not need to be: it is one
`generate.mjs` away, byte for byte. It holds a working password for every
seeded account, which is the other reason.
