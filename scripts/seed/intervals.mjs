import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
// The repo this lives in, found from the script rather than written down, so
// the harness keeps working wherever the folder is checked out.
const REPO = fileURLToPath(new URL("../..", import.meta.url)).split("\\").join("/");
const require = createRequire(`${REPO}/package.json`);
const { createClient } = require("@supabase/supabase-js");
const env = Object.fromEntries(readFileSync(`${REPO}/.env.local`, "utf8").split(/\r?\n/)
  .filter(l => l.trim() && !l.trim().startsWith("#"))
  .map(l => { const a = l.indexOf("="); return [l.slice(0,a).trim(), l.slice(a+1).trim().replace(/^["']|["']$/g,"")]; }));
const m = JSON.parse(readFileSync("members.json","utf8")).find(x => x.records.length >= 6);
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth:{persistSession:false} });
const { error: ae } = await s.auth.signInWithPassword({ email: m.email, password: m.password });
if (ae) { console.log("sign in failed", ae.message); process.exit(1); }
for (const label of ["all", "one model"]) {
  const args = label === "all" ? {} : { model_ids: ["990-adventure"] };
  const t = Date.now();
  const { data, error } = await s.rpc("pool_service_intervals", args);
  console.log(`\n${label}: ${Date.now()-t}ms`, error ? `ERROR ${error.message}` : "");
  if (data) {
    console.log(`  bikes with a span: ${data.bikes}  minBikes ${data.minBikes}`);
    for (const [k,v] of Object.entries(data.items)) {
      console.log(`  ${k.padEnd(16)} ${String(v.kmBetween ?? "-").padStart(7)} km   ${v.bikes} bikes, ${v.services} services${v.enough ? "" : "  (below threshold)"}`);
    }
  }
}
