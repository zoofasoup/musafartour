#!/usr/bin/env python3
"""
DESIGN.md: no text below 12px. Replaces text-[8px] .. text-[11.5px] with text-xs (12px) and text-[0.6rem..0.7rem] likewise.

  python3 scripts/design/type_codemod.py --area public|agent|admin [--apply]

Skipped: src/components/ui and the Styleguide. Pixel-tight places (badges, chart labels) can be adjusted by hand afterwards.
"""
import argparse, os, re, collections
ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "src")
RX = re.compile(r"(?<![\w-])(?P<pre>(?:[\w\[\]&>*-]+:)*)text-\[(?:(?:8|9|10|11|11\.5)px|0\.(?:5|6|65|7)(?:\d)?rem)\](?![\w-])")

def area_of(p):
    p = p.replace(os.sep, "/")
    return "admin" if ("/pages/admin/" in p or "/components/admin/" in p) else "agent" if ("/pages/agent/" in p or "/components/agent/" in p) else "public"

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--area", required=True, choices=["public", "agent", "admin"]); ap.add_argument("--apply", action="store_true"); a = ap.parse_args()
    total = 0; per = collections.Counter()
    for d, _, fs in os.walk(ROOT):
        if "/components/ui" in d.replace(os.sep, "/"): continue
        for f in fs:
            p = os.path.join(d, f)
            if not f.endswith(".tsx") or f == "Styleguide.tsx" or area_of(p) != a.area: continue
            s = open(p).read(); n = len(RX.findall(s))
            if n:
                total += n; per[os.path.relpath(p, ROOT)] = n
                if a.apply: open(p, "w").write(RX.sub(lambda m: f"{m.group('pre')}text-xs", s))
    print(("applied" if a.apply else "dry run") + f": {total} in {len(per)} files ({a.area})")
    for f, c in per.most_common(8): print(f"  {c:3d}  {f}")
