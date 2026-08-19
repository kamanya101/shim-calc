/**
 * Check the seeded database the way the app sees it — signed in as ordinary
 * members, through the anon key and the same functions the browser calls.
 *
 * Deliberately not run with a service role. A service key would read straight
 * past row level security and report a database that looks perfect while every
 * real rider gets nothing, which is the one failure this most needs to catch.
 *
 *   node verify.mjs
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// The repo this lives in, found from the script rather than written down, so
// the harness keeps working wherever the folder is checked out.
const REPO = fileURLToPath(new URL("../..", import.meta.url)).split("\\").join("/");
const require = createRequire(`${REPO}/package.json`);
const { createClient } = require("@supabase/supabase-js");

const env = Object.fromEntries(
  readFileSync(`${REPO}/.env.local`, "utf8").split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .map((l) => {
      const at = l.indexOf("=");
      return [l.slice(0, at).trim(), l.slice(at + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const members = JSON.parse(readFileSync("members.json", "utf8"));

/** Representative members, chosen for the paths each one exercises. */
const threeBikes = members.find((m) => m.bikes.length === 3);
const empty      = members.find((m) => m.bikes.length === 1 && m.records.length === 0);
const za         = members.find((m) => m.bikes.some((b) => b.country === "ZA") && m.records.length >= 5);
const miles      = members.find((m) => m.bikes.some((b) => b.units === "mi") && m.records.length >= 3);
const importer   = members.find((m) => m.records.some((r) => r.source === "import"));
const sharer     = members.find((m) => m.bikes.some((b) => b.name.startsWith("Customer - ")));

const CASES = [
  ["three bikes",   threeBikes],
  ["no services",   empty],
  ["ZA, long log",  za],
  ["reads in miles", miles],
  ["imported log",  importer],
  ["workshop copy", sharer],
];

const time = async (fn) => {
  const t = Date.now();
  const out = await fn();
  return [out, Date.now() - t];
};

for (const [label, member] of CASES) {
  if (!member) { console.log(`\n--- ${label}: no such member in members.json`); continue; }

  const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data: auth, error: ae } = await s.auth.signInWithPassword({
    email: member.email, password: member.password,
  });
  console.log(`\n--- ${label}   ${member.email}`);
  if (ae) { console.log(`  SIGN IN FAILED: ${ae.message}`); continue; }

  const [bikes, tBikes] = await time(() =>
    s.from("bikes").select("id,name,vin,units,country,region,city,pool_token").eq("user_id", auth.user.id));
  const [recs, tRecs] = await time(() =>
    s.from("service_records").select("id,bike_id,items,source", { count: "exact" }));

  console.log(`  bikes            ${bikes.data?.length ?? 0}  (expected ${member.bikes.length})   ${tBikes}ms`);
  console.log(`  service records  ${recs.data?.length ?? 0}  (expected ${member.records.length})   ${tRecs}ms`);
  if (bikes.error) console.log(`  bikes error: ${bikes.error.message}`);
  if (recs.error) console.log(`  records error: ${recs.error.message}`);

  const place = bikes.data?.[0];
  if (place) console.log(`  first bike       ${place.name} · ${[place.city, place.region, place.country].filter(Boolean).join(", ") || "no place"} · ${place.units} · ${place.vin ? "vin" : "NO VIN"}`);

  const withItems = (recs.data ?? []).filter((r) => r.items?.length).length;
  const imported = (recs.data ?? []).filter((r) => r.source === "import").length;
  console.log(`  with parts ticked ${withItems}    marked import ${imported}`);

  // The read path every account needs and none of them had.
  const [pool, tPool] = await time(() => s.rpc("pool_shim_distribution", {}));
  if (pool.error) {
    console.log(`  pool_shim_distribution -> ERROR: ${pool.error.message}`);
  } else {
    const byType = pool.data?.byType ?? {};
    const intake = byType.intake ?? {};
    console.log(`  pool_shim_distribution -> ${tPool}ms   intake: ${intake.readings ?? 0} readings from ${intake.bikes ?? 0} bikes, avg ${intake.avg ?? "-"} um, enough=${intake.enough}`);
  }

  // Latest-only is the heavier query: one row per valve per bike.
  const [latest, tLatest] = await time(() => s.rpc("pool_shim_distribution", { latest_only: true }));
  console.log(`  latest_only            -> ${latest.error ? `ERROR: ${latest.error.message}` : `${tLatest}ms`}`);

  await s.auth.signOut().catch(() => {});
}

console.log("\ndone");
