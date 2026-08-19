/**
 * Send the parts side of the pool for accounts that are already seeded.
 *
 * The 260 members pushed their readings before pooled_services existed, so
 * their tick-lists are sitting in service_records and nowhere else. This signs
 * in as each of them and sends the services alone — no sign-ups, no bikes, no
 * readings, nothing that already landed.
 *
 * It is the same call the app makes on its next sync, so nothing here is a
 * special path: a real rider gets these rows the moment they open the app.
 *
 *   node --import ./register.mjs repush-services.mjs [--limit N] [--dry]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

// The repo this lives in, found from the script rather than written down, so
// the harness keeps working wherever the folder is checked out.
const REPO = fileURLToPath(new URL("../..", import.meta.url)).split("\\").join("/");

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
const PROGRESS = "progress-services.json";

const members = JSON.parse(readFileSync("members.json", "utf8"));
const done = existsSync(PROGRESS)
  ? new Set(JSON.parse(readFileSync(PROGRESS, "utf8")))
  : new Set();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

let seen = 0, sent = 0, retracted = 0;
const failures = [];
const started = Date.now();

for (const member of members) {
  if (done.has(member.email)) continue;
  if (seen >= limit) break;

  const supabase = createClient(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    const payload = await buildContribution(member.bikes, member.records);

    if (dry) {
      sent += payload.services.length;
      retracted += payload.retractServices.length;
      seen++;
      continue;
    }

    // These accounts exist. Signing in rather than signing up, so a failure
    // here is a real problem and not a duplicate-email shrug.
    const { data } = await withRetry("signIn", () =>
      supabase.auth.signInWithPassword({
        email: member.email,
        password: member.password,
      }));
    if (!data?.session) throw new Error("no session");

    if (payload.services.length || payload.retractServices.length) {
      await withRetry("contribute_services", () =>
        supabase.rpc("contribute_services", {
          services: payload.services,
          retract: payload.retractServices,
        }));
    }

    sent += payload.services.length;
    retracted += payload.retractServices.length;
    done.add(member.email);
    seen++;

    if (seen % 20 === 0 || seen <= 3) {
      const rate = seen / ((Date.now() - started) / 1000);
      const left = Math.round((members.length - seen) / Math.max(rate, 1e-6));
      console.log(`${String(seen).padStart(3)}/${members.length}  ${member.email.padEnd(34)} ${payload.services.length} services   ~${Math.round(left / 60)} min left`);
    }
  } catch (error) {
    failures.push({ email: member.email, error: String(error?.message ?? error) });
    console.log(`FAIL ${member.email}: ${error?.message ?? error}`);
  } finally {
    await supabase.auth.signOut().catch(() => {});
    if (!dry) writeFileSync(PROGRESS, JSON.stringify([...done], null, 1));
    await sleep(120);
  }
}

console.log(`\n${dry ? "DRY RUN - nothing was written" : "sent"}`);
console.log(`accounts   ${seen}`);
console.log(`services   ${sent}`);
console.log(`retracted  ${retracted}   (imports the pool holds back)`);
console.log(`elapsed    ${Math.round((Date.now() - started) / 1000)}s`);
if (failures.length) {
  console.log(`\nfailures ${failures.length}:`);
  for (const f of failures.slice(0, 10)) console.log(`  ${f.email}  ${f.error}`);
}
