// Hitung COGS dengan rumus website dan bandingkan dengan total di tab sheet.
// Pakai: npx tsx scripts/cogs/check.ts "<tab 1>" "<tab 2>" ...
import { execFileSync } from "node:child_process";
import { computeCogs } from "../../src/lib/cogs";

let bad = 0;
for (const tab of process.argv.slice(2)) {
  const raw = execFileSync("python3", ["scripts/cogs/parse_tab.py", tab], { encoding: "utf8" });
  const { cogs, sheet_total_cogs } = JSON.parse(raw);
  const mine = computeCogs(cogs).finalCogsIdr;
  const diffs = (["double", "triple", "quad"] as const).map((k) => Math.round(mine[k] - sheet_total_cogs[k]));
  const ok = diffs.every((d) => Math.abs(d) <= 1);
  if (!ok) bad++;
  console.log(`${ok ? "OK  " : "BEDA"} ${tab}  web=${(["double","triple","quad"] as const).map(k=>Math.round(mine[k])).join("/")}  sheet=${["double","triple","quad"].map(k=>sheet_total_cogs[k as "double"]).join("/")}  selisih=${diffs.join("/")}`);
}
process.exit(bad ? 1 : 0);
