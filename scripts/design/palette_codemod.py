#!/usr/bin/env python3
"""
Replace raw Tailwind palette classes (bg-slate-100, text-emerald-600 ...) with the design tokens of DESIGN.md.

  python3 scripts/design/palette_codemod.py --area public|agent|admin [--apply] [--files a.tsx b.tsx]

Dry run by default: prints what would change. Idempotent: running it again changes nothing.
Rules:
  neutrals (slate gray zinc neutral stone) -> muted / border / input / foreground / primary tokens, by shade
  red rose                                 -> status-bad (destructive for solids)
  amber yellow orange                      -> status-warn (amber for light star-like tints)
  green teal lime emerald                  -> status-ok; in the agent area SOLID emerald/green is the old portal accent and becomes primary (black)
  blue sky cyan indigo                     -> status-info
  purple violet fuchsia pink               -> status-over
Skipped on purpose: classes under a `dark:` prefix (no dark mode for now), src/components/ui/*, the package card
(kept as designed), Styleguide.
"""
import argparse, os, re, collections, sys

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "src")
SKIP_FILES = {"PackageCard.tsx", "Styleguide.tsx"}
NEUTRAL = {"slate", "gray", "zinc", "neutral", "stone"}
FAMILY = {
    **{f: "neutral" for f in NEUTRAL},
    "red": "bad", "rose": "bad",
    "amber": "warn", "yellow": "warn", "orange": "warn",
    "green": "ok", "emerald": "ok", "teal": "ok", "lime": "ok",
    "blue": "info", "sky": "info", "cyan": "info", "indigo": "info",
    "purple": "over", "violet": "over", "fuchsia": "over", "pink": "over",
}
PROPS = "bg|text|border|ring|divide|outline|fill|stroke|from|to|via|decoration|placeholder|caret|accent|shadow"
RX = re.compile(
    r"(?<![\w-])(?P<pre>(?:[\w\[\]&>*-]+:)*)(?P<prop>" + PROPS + r")-(?P<fam>" + "|".join(FAMILY) + r")-(?P<shade>\d{2,3})(?P<op>/\d+|/\[[\d.]+\])?(?![\w-])"
)

def neutral(prop, shade, op):
    s = int(shade)
    if prop in ("text", "fill", "stroke", "decoration", "caret", "accent", "placeholder") and 300 <= s <= 400:
        return None, op        # light-on-dark text: leave for a manual pass
    if prop == "bg" or prop in ("from", "to", "via"):
        tok = "muted" if s <= 100 else "border" if s <= 200 else "input" if s <= 300 else "muted-foreground" if s <= 600 else "primary"
    elif prop in ("text", "fill", "stroke", "decoration", "caret", "accent", "placeholder"):
        if s <= 200: tok = "primary-foreground"
        elif s <= 300: tok = "primary-foreground"; op = op or "/70"
        elif s <= 600: tok = "muted-foreground"
        elif s == 700: tok = "foreground"; op = op or "/80"
        else: tok = "foreground"
    else:  # border ring divide outline shadow
        tok = "border" if s <= 200 else "input" if s <= 400 else "muted-foreground" if s <= 600 else "foreground"
    return tok, op

def semantic(kind, prop, shade, op, area):
    s = int(shade)
    light = s <= 100
    if prop in ("text", "fill", "stroke") and kind != "warn" and 300 <= s <= 400:
        return None, op        # light tints on dark surfaces (footer, hero): keep
    if kind == "warn" and prop in ("text", "fill") and s <= 400:
        return "amber", op                         # stars and soft highlights
    if kind == "warn" and prop == "bg" and 300 <= s <= 500:
        return "amber", op
    if prop in ("bg", "from", "to", "via"):
        if light: return f"status-{kind}-bg", op
        if s <= 200: return f"status-{kind}-border", op
        if area == "agent" and kind == "ok": return "primary", op   # old portal accent
        if kind == "bad": return "destructive", op
        return f"status-{kind}-fg", op
    if prop in ("text", "fill", "stroke", "decoration", "caret", "accent", "placeholder"):
        if s <= 200 and kind != "warn": return "primary-foreground", op   # light text on a coloured solid
        if kind == "bad": return "destructive" if s <= 600 else "status-bad-fg", op
        if area == "agent" and kind == "ok" and s >= 600: return "foreground", op
        return f"status-{kind}-fg", op
    return f"status-{kind}-border", op          # border ring divide outline shadow

def map_class(m, area):
    pre, prop, fam, shade, op = m.group("pre"), m.group("prop"), m.group("fam"), m.group("shade"), m.group("op")
    if "dark:" in pre: return m.group(0)
    kind = FAMILY[fam]
    tok, op2 = neutral(prop, shade, op) if kind == "neutral" else semantic(kind, prop, shade, op, area)
    if tok is None: return m.group(0)
    # a solid status colour on hover should get darker, not jump to another token
    if "hover:" in pre and prop == "bg" and int(shade) >= 600 and kind != "neutral":
        tok, op2 = (tok, "/90") if not (area == "agent" and tok == "primary") else ("primary", "/85")
    return f"{pre}{prop}-{tok}{op2 or ''}"

def area_of(path):
    p = path.replace(os.sep, "/")
    if "/pages/admin/" in p or "/components/admin/" in p: return "admin"
    if "/pages/agent/" in p or "/components/agent/" in p: return "agent"
    return "public"

def files_for(area, explicit):
    if explicit:
        return [os.path.join(ROOT, "..", f) if not os.path.isabs(f) else f for f in explicit]
    out = []
    for d, _, fs in os.walk(ROOT):
        if "/components/ui" in d.replace(os.sep, "/"): continue
        for f in fs:
            if f.endswith(".tsx") and f not in SKIP_FILES:
                p = os.path.join(d, f)
                if area_of(p) == area: out.append(p)
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--area", choices=["public", "agent", "admin"], required=True)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--files", nargs="*")
    a = ap.parse_args()
    total = 0; per = collections.Counter(); rules = collections.Counter()
    for p in files_for(a.area, a.files):
        s = open(p).read(); n = [0]
        def rep(m):
            new = map_class(m, a.area)
            if new != m.group(0):
                n[0] += 1; rules[f"{m.group(0).split(':')[-1]} -> {new.split(':')[-1]}"] += 1
            return new
        out = RX.sub(rep, s)
        if n[0]:
            per[os.path.relpath(p, ROOT)] = n[0]; total += n[0]
            if a.apply: open(p, "w").write(out)
    print(f"{'applied' if a.apply else 'dry run'}: {total} classes in {len(per)} files ({a.area})")
    for f, c in per.most_common(8): print(f"  {c:4d}  {f}")
    print("most common replacements:")
    for r, c in rules.most_common(14): print(f"  {c:4d}  {r}")

if __name__ == "__main__":
    main()
