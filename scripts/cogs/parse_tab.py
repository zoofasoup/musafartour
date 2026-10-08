#!/usr/bin/env python3
"""Baca satu tab COGS di spreadsheet jadi CogsDataV2 (JSON) + total COGS menurut sheet.
Pakai:  python3 scripts/cogs/parse_tab.py "<nama tab>"  > out.json
Kunci pembacaan: label teks di blok kanan (mulai dari sel "LAND ARRANGEMENT (SAUDI)")."""
import csv, io, json, re, subprocess, sys, urllib.parse

SHEET_ID = "11R3Dv7YNJEYj0NLCY-xm4OH2PuZ_T85jsbizPJNQsn0"
num_re = re.compile(r"^(SAR|\$|Rp)?\s*-?[\d,]+(\.\d+)?$")


def fetch(tab):
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(tab)}"
    return list(csv.reader(io.StringIO(subprocess.run(["curl", "-sL", url], capture_output=True, text=True).stdout)))


def val(c):
    c = c.strip()
    if not c or c in ("-", "Rp -", "SAR -", "$ -"):
        return 0.0
    return float(re.sub(r"[^\d.\-]", "", c) or 0)


def is_money(c):
    return bool(c) and bool(num_re.match(c)) and (c[0] in "SR$" or val(c) >= 1000)


def first_run(cells):
    """Tiga sel uang yang berurutan (double/triple/quad). Angka samping (Min COGS dst.) diabaikan."""
    for i in range(len(cells) - 2):
        if all(is_money(c) or c in ("-", "Rp -") for c in cells[i:i + 3]) and any(is_money(c) for c in cells[i:i + 3]):
            return [val(c) for c in cells[i:i + 3]]
    return None


def parse(tab):
    rows = fetch(tab)
    c0 = None
    for r in rows[:8]:
        for i, c in enumerate(r):
            if c.strip().startswith("LAND ARRANGEMENT"):
                c0 = i
                break
        if c0 is not None:
            break
    if c0 is None:
        raise SystemExit("blok LAND ARRANGEMENT tidak ditemukan")
    hotels, handling, visa, esensial, addons, lain = [], [], [], [], [], []
    rates = {"sar_usd": 3.75, "usd_idr": 0}
    section, sheet_total, harga_jual, harga_diskon = None, None, None, None
    for r in rows:
        cells = [c.strip().replace("\n", " ") for c in r[c0:]]
        text = [c for c in cells if c and not num_re.match(c) and c not in ("TRUE", "FALSE")]
        if not text:
            continue
        head = " ".join(text)
        money = [c for c in cells if num_re.match(c) and c]
        flag = next((c for c in cells if c in ("TRUE", "FALSE")), None)
        up = head.upper()
        if "KURS -> SAR" in up:
            rates["sar_usd"] = val(money[0]) if money else 3.75
        elif "KURS LA" in up:
            rates["usd_idr"] = val(money[0])
        elif up.startswith("HANDLING") and section is None:
            section = "handling"
        if re.search(r"\b(MAKKAH|MADINAH)\b", up) and any(c.startswith("SAR") for c in cells) and section is None:
            sar = [c for c in cells if c.startswith("SAR")][-3:]
            idx = cells.index(sar[0])
            ints = [c for c in cells[:idx] if re.fullmatch(r"\d+", c)]
            hotels.append(dict(id=f"h{len(hotels)+1}", city="Makkah" if "MAKKAH" in up else "Madinah", name=text[-1] if len(text) > 2 else "", type="FB",
                               dur_d=int(ints[-2]) if len(ints) > 1 else 0, dur_n=int(ints[-1]) if ints else 0,
                               double=val(sar[0]), triple=val(sar[1]), quad=val(sar[2])))
            continue
        if "TOTAL COST SAUDI" in up:
            section = "indo"
        if "MUSAFAR'S EXPENSES" in up:
            section = "indo"
        if up.startswith("ADD ON") or "ADD ONS" in up[:12]:
            section = "addons"
        if up.startswith("LAIN - LAIN") or up.startswith("LAIN-LAIN"):
            section = "lain"
        if "TOTAL -> COGS" in up or "TOTAL ->COGS" in up:
            sheet_total = first_run(cells) or [val(c) for c in money[-3:]]
            section = "final"
            continue
        if section == "final":
            if "HARGA JUAL" in up:
                harga_jual = first_run(cells)
            elif "SETELAH DISKON" in up:
                harga_diskon = first_run(cells)
            continue
        trio = first_run(cells)
        if trio and "TOTAL" not in up and "KURS" not in up:
            name = text[-1]
            item = dict(id=f"x{len(esensial)+len(addons)+len(lain)+len(handling)+len(visa)}", name=name, double=trio[0], triple=trio[1], quad=trio[2])
            if section == "indo" or section == "addons":
                item["checked"] = flag != "FALSE"
                (addons if section == "addons" else esensial).append(item)
            elif section == "lain":
                lain.append(item)
            elif "VISA" in up or name.upper().startswith(("VISA", "BRN", "BUS")):
                visa.append(item)
            elif rates["usd_idr"] == 0:
                handling.append(item)
    return dict(
        cogs=dict(version="2.0", rates=rates,
                  land_arrangement=dict(hotels=hotels, handling=handling, visa=visa),
                  indo_expenses=dict(esensial=esensial, add_ons=addons), lain_lain=lain,
                  pricing=dict(harga_jual=dict(zip(("double", "triple", "quad"), harga_jual or (0, 0, 0))),
                               harga_diskon=dict(zip(("double", "triple", "quad"), harga_diskon or (0, 0, 0)))) ),
        sheet_total_cogs=dict(zip(("double", "triple", "quad"), sheet_total or (0, 0, 0))))


if __name__ == "__main__":
    print(json.dumps(parse(sys.argv[1]), ensure_ascii=False, indent=1))
