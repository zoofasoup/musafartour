#!/usr/bin/env node
/**
 * Fails when a route in src/App.tsx is missing from functions/_lib/routes.ts (the allow-list behind the
 * real 404 in functions/[[path]].ts). Run: node scripts/check-route-allowlist.mjs
 */
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const out = join(mkdtempSync(join(tmpdir(), "routes-")), "routes.mjs");
await build({ entryPoints: ["functions/_lib/routes.ts"], bundle: true, format: "esm", outfile: out, logLevel: "silent" });
const { classifyPath } = await import(pathToFileURL(out).href);

const app = readFileSync("src/App.tsx", "utf8");
const paths = [...app.matchAll(/<Route\s+path="(\/[^"]*)"/g)].map((m) => m[1]);
const missing = paths.filter((p) => classifyPath(p.replace(/:[A-Za-z]+/g, "x")).kind === "unknown");

const mustBe404 = ["/halaman-ngaco", "/faq", "/llms.txt", "/paket-umroh/a/b", "/agentx"];
const wrong404 = mustBe404.filter((p) => classifyPath(p).kind !== "unknown");

if (missing.length || wrong404.length) {
  if (missing.length) console.error("Routes in App.tsx missing from functions/_lib/routes.ts:\n  " + missing.join("\n  "));
  if (wrong404.length) console.error("Paths that should be unknown but are allowed:\n  " + wrong404.join("\n  "));
  process.exit(1);
}
console.log(`OK: ${paths.length} routes in App.tsx are all allowed; ${mustBe404.length} sample unknown paths are unknown.`);
