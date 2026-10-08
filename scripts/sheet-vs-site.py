#!/usr/bin/env python3
"""Bandingkan sheet "ALL PACKAGES_FIX" dengan tabel packages di website.

Dipakai untuk mengukur selisih sebelum cutover (target: 0 selisih).
Jalankan dari akar repo (butuh `npx supabase` yang sudah linked):  python3 scripts/sheet-vs-site.py
Kunci pencocokan: tanggal berangkat + kelas paket. Baris sheet dengan tanggal yang sama
dicocokkan satu per satu berdasarkan harga Quad, bukan ditebak.
"""
import csv, io, json, re, subprocess, sys, urllib.parse, urllib.request
from datetime import datetime

SHEET_ID = "11R3Dv7YNJEYj0NLCY-xm4OH2PuZ_T85jsbizPJNQsn0"
TAB = "ALL PACKAGES_FIX"
n = lambda s: int(re.sub(r"\D", "", s or "") or 0)


def load_sheet():
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(TAB)}"
    text = subprocess.run(["curl", "-sL", url], capture_output=True, text=True).stdout
    rows = list(csv.reader(io.StringIO(text)))
    out = []
    for x in rows[1:]:
        if not x[5].strip():
            continue
        out.append(dict(
            codename=x[2].strip(), d=datetime.strptime(x[5].strip(), "%B %d, %Y").strftime("%Y-%m-%d"),
            cls=x[7].strip(), title=x[10].strip(), seat=n(x[8]), sisa=n(x[9]),
            quad=n(x[25]), triple=n(x[26]), double=n(x[27]), max_discount=n(x[31]),
        ))
    return out


def load_site():
    sql = ("select id, to_char(departure_date,'YYYY-MM-DD') d, package_name, package_price, hemat_package_price, "
           "pelataran_package_price, five_star_package_price, tiers_data, slots_total, slots_filled, max_discount, status "
           "from packages order by departure_date")
    raw = subprocess.run(["npx", "supabase", "db", "query", "--linked", sql, "-o", "json"],
                         capture_output=True, text=True).stdout
    return json.loads(raw[raw.index("{"):])["rows"]


def quads(p):
    found = set()

    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k == "quad" and isinstance(v, (int, float)) and v > 0:
                    found.add(int(v))
                else:
                    walk(v)
        elif isinstance(o, str):
            try:
                walk(json.loads(o))
            except Exception:
                pass
    for k in ("package_price", "hemat_package_price", "pelataran_package_price", "five_star_package_price", "tiers_data"):
        walk(p.get(k))
    return found


def main():
    sheet, site = load_sheet(), load_site()
    used, diffs = set(), []
    for s in sheet:
        cand = [p for p in site if p["d"] == s["d"] and p["id"] not in used]
        hit = next((p for p in cand if s["quad"] in quads(p)), None)
        if not hit:
            diffs.append(("HARGA/BARIS TIDAK ADA", s["d"], s["title"], f"sheet Quad {s['quad']:,}", [sorted(quads(p)) for p in cand]))
            continue
        used.add(hit["id"])
        filled = max(0, s["seat"] - s["sisa"])
        if hit["slots_total"] != s["seat"] or hit["slots_filled"] != filled:
            diffs.append(("SEAT", s["d"], s["title"], f"sheet {s['seat']}/{filled}", f"site {hit['slots_total']}/{hit['slots_filled']}"))
        if (hit["max_discount"] or 0) != s["max_discount"]:
            diffs.append(("MAKS DISKON", s["d"], s["title"], s["max_discount"], hit["max_discount"]))
    for p in site:
        if p["id"] not in used:
            diffs.append(("HANYA DI WEBSITE", p["d"], p["package_name"], p["status"], ""))
    print(f"sheet {len(sheet)} baris | website {len(site)} paket | selisih {len(diffs)}")
    for d in diffs:
        print(" -", *d)
    return 1 if diffs else 0


if __name__ == "__main__":
    sys.exit(main())
