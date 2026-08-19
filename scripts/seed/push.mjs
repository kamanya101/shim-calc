/**
 * Sign each fictitious member up and put their bikes and history in, the way
 * the app would.
 *
 * Bikes and services go through the ordinary Data API, so row level security is
 * genuinely exercised — every write happens as that member, and would fail if
 * the policies were wrong. The pool is then built by the app's own
 * buildContribution and sent through contribute_readings: the identical call
 * src/lib/sync.ts makes, so the hashes are real and nothing here can drift away
 * from what the app itself would have produced.
 *
 * That last point is the whole reason this is worth running at all. A seeder
 * that wrote pooled_readings directly would prove nothing about the app; this
 * one fails in exactly the places the app would.
 *
 *   node --import ./register.mjs push.mjs [--limit N] [--reset] [--dry]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

// The repo this lives in, found from the script rather than written down, so
// the harness keeps working wherever the folder is checked out.
const REPO = fileURLToPath(new URL("../..", import.meta.url)).split("\\").join("/");

// Resolved against the app's own node_modules and source, so this uses the
// same supabase client and the same pool code the browser does.
const require = createRequire(`${REPO}/package.json`);
const { createClient } = require("@supabase/supabase-js");
const { buildContribution } = await import(pathToFileURL(`${REPO}/src/lib/pool.ts`).href);

const env = Object.fromEntries(
  readFileSync(`${REPO}/.env.local`, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_ || !ANON) throw new Error("No Supabase URL/anon key in .env.local");

const args = process.argv.slice(2);
const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
const dry = args.includes("--dry");
const PROGRESS = "progress.json";

const members = JSON.parse(readFileSync("members.json", "utf8"));
const done = !args.includes("--reset") && existsSync(PROGRESS)
  ? new Set(JSON.parse(readFileSync(PROGRESS, "utf8")))
  : new Set();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Auth endpoints rate-limit per IP; back off and try again rather than dying. */
async function withRetry(label, fn, tries = 6) {
  for (let attempt = 1; ; attempt++) {
    try {
      const result = await fn();
      if (result?.error) throw result.error;
      return result;
    } catch (error) {
      const message = String(error?.message ?? error);
      const rateLimited = /rate|429|too many/i.test(message);
      if (attempt >= tries || !rateLimited) throw new Error(`${label}: ${message}`);
      const wait = Math.min(60000, 2000 * 2 ** (attempt - 1));
      console.log(`   rate limited, waiting ${wait / 1000}s`);
      await sleep(wait);
    }
  }
}

const toBikeRow = (bike, userId) => ({
  user_id: userId,
  id: bike.id,
  name: bike.name,
  model_id: bike.modelId ?? null,
  year: bike.year ?? null,
  vin: bike.vin ?? null,
  pool_token: bike.poolToken ?? null,
  units: bike.units ?? null,
  // Where the machine lives. Country reaches the pool; region and city stay on
  // the rider's own row and are never pooled.
  country: bike.country ?? null,
  region: bike.region ?? null,
  city: bike.city ?? null,
  engine_id: bike.engineId,
  created_at: bike.createdAt,
  updated_at: bike.updatedAt,
  deleted_at: null,
});

const toRecordRow = (record, userId) => ({
  user_id: userId,
  id: record.id,
  bike_id: record.bikeId,
  engine_id: record.engineId,
  date: record.date,
  odometer: record.odometer ?? null,
  title: record.title ?? null,
  readings: record.readings,
  // The parts tick-list, already in serviceItems.ts order.
  items: record.items ?? null,
  // "import" marks a history typed in from a spreadsheet. pool.ts retracts
  // those from the pool until the rider confirms them, so this field is the
  // difference between a service that counts and one that deliberately does
  // not — it has to survive the round trip or that invariant is untested.
  source: record.source ?? null,
  created_at: record.createdAt,
  updated_at: record.updatedAt,
  deleted_at: null,
});

let members_done = 0, bikes = 0, services = 0, pooled = 0, retracted = 0;
const failures = [];
const started = Date.now();

for (const member of members) {
  if (done.has(member.email)) continue;
  if (members_done >= limit) break;

  const supabase = createClient(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    // The pool payload is built before anything is sent, so a dry run exercises
    // the app's own hashing without touching the database.
    const payload = await buildContribution(member.bikes, member.records);
    if (dry) {
      bikes += member.bikes.length;
      services += member.records.length;
      pooled += payload.readings.length;
      retracted += payload.retract.length;
      members_done++;
      continue;
    }

    // Joining the app, exactly as a new rider does.
    let { data } = await withRetry("signUp", () =>
      supabase.auth.signUp({ email: member.email, password: member.password }));

    if (!data?.session) {
      ({ data } = await withRetry("signIn", () =>
        supabase.auth.signInWithPassword({ email: member.email, password: member.password })));
    }
    const userId = data?.session?.user?.id;
    if (!userId) throw new Error("no session after sign up");

    // Bikes must land before their services: a service points at a bike, and a
    // server holding one without the other is a state no reader should see.
    await withRetry("bikes", () =>
      supabase.from("bikes")
        .upsert(member.bikes.map((b) => toBikeRow(b, userId)), { onConflict: "user_id,id" }));

    if (member.records.length) {
      await withRetry("service_records", () =>
        supabase.from("service_records")
          .upsert(member.records.map((r) => toRecordRow(r, userId)), { onConflict: "user_id,id" }));
    }

    // The app's own code, from here down.
    if (payload.readings.length || payload.retract.length) {
      await withRetry("contribute_readings", () =>
        supabase.rpc("contribute_readings", {
          readings: payload.readings,
          retract: payload.retract,
        }));
    }

    bikes += member.bikes.length;
    services += member.records.length;
    pooled += payload.readings.length;
    retracted += payload.retract.length;
    done.add(member.email);
    members_done++;

    if (members_done % 20 === 0 || members_done <= 3) {
      const rate = members_done / ((Date.now() - started) / 1000);
      const left = Math.round((members.length - members_done) / Math.max(rate, 1e-6));
      console.log(`${String(members_done).padStart(3)}/${members.length}  ${member.email.padEnd(34)} ${member.bikes.length} bikes, ${member.records.length} services, ${payload.readings.length} readings   ~${Math.round(left / 60)} min left`);
    }
  } catch (error) {
    failures.push({ email: member.email, error: String(error?.message ?? error) });
    console.log(`FAIL ${member.email}: ${error?.message ?? error}`);
  } finally {
    await supabase.auth.signOut().catch(() => {});
    if (!dry) writeFileSync(PROGRESS, JSON.stringify([...done], null, 1));
    await sleep(150);
  }
}

console.log(`\n${dry ? "DRY RUN - nothing was written" : "seeded"}`);
console.log(`members         ${members_done}`);
console.log(`bikes           ${bikes}`);
console.log(`services        ${services}`);
console.log(`pooled readings ${pooled}`);
console.log(`retracted       ${retracted}   (imported histories the pool takes back out)`);
console.log(`elapsed         ${Math.round((Date.now() - started) / 1000)}s`);
if (failures.length) {
  console.log(`\nfailures ${failures.length}:`);
  for (const f of failures.slice(0, 10)) console.log(`  ${f.email}  ${f.error}`);
}
