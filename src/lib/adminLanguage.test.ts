// src/lib/adminLanguage.test.ts
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const files = [
  ...readdirSync(join(ROOT, "pages/admin")).filter((f) => f.endsWith(".tsx")).map((f) => join(ROOT, "pages/admin", f)),
  join(ROOT, "components/admin/adminMenu.ts"),
];

/** Kata Inggris yang harus Indonesia di teks tampilan. Dicocokkan utuh, tanpa membedakan huruf besar. */
const BANNED = [
  "Add", "Edit", "Delete", "Save", "Cancel", "Submit", "Loading", "Confirmed", "Pending", "Cancelled",
  "Occupancy", "Challenge", "Challenges", "Leaderboard", "Analytics", "Inbox", "Rotation", "Generator",
  "Optimizer", "Development", "Calculator", "Leads", "Marketing", "Settings", "Dashboard",
];
/** Istilah yang sah tetap dipakai apa adanya (nama produk atau kata baku). */
const ALLOWED_LINES = [/Google Analytics/, /WhatsApp/, /Meta/, /TikTok/];

/** Teks tampilan: isi antar tag JSX, dan nilai atribut title, label, placeholder, description, intro. */
function displayStrings(src: string): { text: string; line: number }[] {
  const out: { text: string; line: number }[] = [];
  src.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (line.startsWith("//") || line.startsWith("*") || line.startsWith("import ")) return;
    for (const m of line.matchAll(/(?:title|label|placeholder|description|intro|aria-label)=\{?"([^"]+)"/g)) out.push({ text: m[1], line: i + 1 });
    for (const m of line.matchAll(/(?:title|label):\s*"([^"]+)"/g)) out.push({ text: m[1], line: i + 1 });
    for (const m of line.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) out.push({ text: m[1], line: i + 1 });
  });
  return out;
}

describe("bahasa admin", () => {
  it("tidak memuat kata Inggris terlarang di teks tampilan", () => {
    const hits: string[] = [];
    for (const file of files) {
      for (const { text, line } of displayStrings(readFileSync(file, "utf8"))) {
        if (ALLOWED_LINES.some((r) => r.test(text))) continue;
        for (const word of BANNED) {
          if (new RegExp(`\\b${word}\\b`, "i").test(text)) hits.push(`${file.replace(ROOT, "src")}:${line} "${text.trim()}" memuat ${word}`);
        }
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
