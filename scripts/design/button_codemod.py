#!/usr/bin/env python3
"""
Public site buttons follow DESIGN.md: the primary action is crimson (variant="brand") and buttons have 8px corners.

  python3 scripts/design/button_codemod.py [--apply]

For every <Button ...> in the public area:
  - no variant, or variant="default"  ->  variant="brand"
  - rounded-full on a text button     ->  removed (icon buttons keep their round shape)
Skipped: admin and agent areas, the login and setup pages, the package card, src/components/ui.
"""
import argparse, os, re

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "src")
SKIP = {"PackageCard.tsx", "Styleguide.tsx", "Auth.tsx", "AdminSetup.tsx", "SetPassword.tsx"}

def is_public(path):
    p = path.replace(os.sep, "/")
    return not any(x in p for x in ("/pages/admin/", "/components/admin/", "/pages/agent/", "/components/agent/", "/components/ui/"))

def tag_end(s, i):
    """Index of the '>' that closes the opening tag starting at s[i] == '<'. Skips {...} and quoted strings."""
    depth = 0; q = None; j = i
    while j < len(s):
        c = s[j]
        if q:
            if c == q and s[j - 1] != "\\": q = None
        elif c in "\"'`":
            q = c
        elif c == "{": depth += 1
        elif c == "}": depth -= 1
        elif c == ">" and depth == 0 and s[j - 1] != "=":
            return j
        j += 1
    return -1

def fix_tag(tag):
    icon = re.search(r'size=["{]\s*["\']?icon', tag) is not None
    out = tag
    # a dynamic variant={...} is somebody's decision: undo a variant="brand" that an earlier run inserted next to it
    if re.search(r'\svariant=\{', out):
        out = out.replace('<Button variant="brand"', "<Button", 1)
        return out
    m = re.search(r'\svariant="(\w+)"', out)
    if not m and not icon:
        out = out.replace("<Button", '<Button variant="brand"', 1)
    elif m and m.group(1) == "default":
        out = out.replace('variant="default"', 'variant="brand"', 1)
    if 'variant="brand"' in out:
        # explicit primary colours on the tag would beat the variant: use the brand tokens instead
        out = re.sub(r"(?<![\w:-])bg-primary(?![\w-])", "bg-brand", out)
        out = re.sub(r"hover:bg-primary/\d+", "hover:bg-brand-press", out)
        out = re.sub(r"(?<![\w:-])text-primary-foreground(?![\w-])", "text-brand-foreground", out)
    if not icon:
        out = re.sub(r"(?<![\w-])rounded-full(?![\w-])\s?", "", out)
        out = re.sub(r'className="\s*"', "", out)
        out = re.sub(r'className="([^"]*?)\s+"', r'className="\1"', out)
    return out

def process(s):
    res = []; i = 0; n = 0
    while True:
        k = s.find("<Button", i)
        if k < 0 or not re.match(r"<Button[\s>/]", s[k:k + 9]): 
            if k < 0: res.append(s[i:]); break
            res.append(s[i:k + 7]); i = k + 7; continue
        e = tag_end(s, k)
        if e < 0: res.append(s[i:]); break
        tag = s[k:e + 1]; new = fix_tag(tag)
        if new != tag: n += 1
        res.append(s[i:k]); res.append(new); i = e + 1
    return "".join(res), n

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--apply", action="store_true"); a = ap.parse_args()
    total = 0; files = []
    for d, _, fs in os.walk(ROOT):
        for f in fs:
            p = os.path.join(d, f)
            if f.endswith(".tsx") and f not in SKIP and is_public(p):
                s = open(p).read(); out, n = process(s)
                if n:
                    total += n; files.append((n, os.path.relpath(p, ROOT)))
                    if a.apply: open(p, "w").write(out)
    print(("applied" if a.apply else "dry run") + f": {total} buttons in {len(files)} files")
    for n, f in sorted(files, reverse=True)[:14]: print(f"  {n:3d}  {f}")
