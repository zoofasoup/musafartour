# Flyer Export via Cloudflare Browser Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `html2canvas`-based flyer export (which has produced ~12 rounds of rendering-mismatch bugs — font metrics, flex centering, transform handling, clipping — because it reimplements CSS layout/paint instead of using a real browser) with a screenshot taken by an actual headless Chromium instance via Cloudflare's Browser Rendering API, so the downloaded image is pixel-identical to the live DOM by construction.

**Architecture:** A new public (unauthenticated) route `/flyer-print?ids=<comma-separated-package-ids>` renders the existing `FlyerPreview` component at true 1080×1920px, fetching only the requested packages from Supabase (already publicly readable) and signaling readiness via a `data-flyer-ready` attribute once fonts and images have loaded. A new Cloudflare Pages Function (`functions/flyer-image.ts`) uses `@cloudflare/puppeteer` to navigate a headless browser to that route, wait for the readiness signal, screenshot it, and stream back PNG/JPEG bytes. The admin `FlyerGenerator` page's download buttons call this Function instead of `html2canvas`. This removes the entire class of "export doesn't match preview" bugs because the preview and the export are now the same rendering engine painting the same DOM.

**Tech Stack:** React + TypeScript + React Router (existing route table in `src/App.tsx`), Supabase JS client (existing, public `packages` SELECT policy), Cloudflare Pages Functions (existing `functions/` directory), `@cloudflare/puppeteer` (new dependency), `wrangler.toml` (new — this repo currently has none; the Pages project is git-integrated with build settings configured in the Cloudflare dashboard, not via a committed wrangler config).

## Global Constraints

- Do not touch the existing `FlyerPreview.tsx` visual/CSS logic — it already renders correctly; only the *export mechanism* is changing.
- `packages` has an existing public "viewable by everyone" RLS policy — the print route must **not** require an admin session; it fetches directly with the anon Supabase client exactly like `PublicMarketingKit.tsx` and `PackageDetail` already do.
- Output must remain fixed 1080×1920px PNG/JPEG, matching the current contract in `flyerData.ts` (`SAFE_ZONE_MAX_ROWS = 16` etc. — unchanged).
- **Cloudflare account action required, outside this plan's code changes:** the user must enable the "Browser Rendering" product on their Cloudflare account (Cloudflare dashboard → Workers & Pages → Browser Rendering) before Task 2's Function will work in production. This cannot be done from a coding session — flag it and wait for confirmation before considering Task 2 "done."
- **Local testing limitation:** Cloudflare Browser Rendering cannot be fully emulated by plain `wrangler pages dev` — it requires either `wrangler pages dev --remote` (which needs the user logged into their real Cloudflare account via `wrangler login`) or an actual deployment. Task 2 and Task 4's "verify" steps reflect this — they are the user's steps to run, not steps this plan can execute unattended.
- No test framework exists in this repo — verification is `npx tsc --noEmit` plus manual browser checks, matching every prior task in this codebase's history (see `docs/superpowers/plans/2026-07-28-flyer-generator.md`).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/pages/FlyerPrint.tsx` | New public route. Fetches packages by id (preserving requested order), renders `FlyerPreview` unscaled, sets `data-flyer-ready="true"` on `<body>` once fonts + images finish loading. |
| `src/App.tsx` (modify) | Lazy import + public route registration for `/flyer-print`. |
| `functions/_lib/env.ts` (modify) | Add `BROWSER` binding to the `Env` interface. |
| `functions/flyer-image.ts` | New Pages Function. Launches headless Chromium via `@cloudflare/puppeteer`, navigates to `/flyer-print`, waits for the ready signal, screenshots, returns image bytes. |
| `wrangler.toml` | New. Declares `pages_build_output_dir` and the `[[browser]]` binding so Cloudflare Pages provisions it for `functions/flyer-image.ts`. |
| `package.json` (modify) | Add `@cloudflare/puppeteer`, remove `html2canvas` (no longer used anywhere after this plan). |
| `src/pages/admin/FlyerGenerator.tsx` (modify) | `handleExport` now `fetch`es `/flyer-image` instead of calling `exportFlyerAsImage`. |
| `src/lib/flyer/flyerExport.ts` | Deleted — replaced by the Function. |

---

### Task 1: Public print route with a readiness signal

**Files:**
- Create: `src/pages/FlyerPrint.tsx`
- Modify: `src/App.tsx` (lazy import near line 58, route near line 249)

**Interfaces:**
- Consumes: `FLYER_PACKAGE_COLUMNS`, `type FlyerPackage` from `@/lib/flyer/flyerData`; `FlyerPreview` from `@/components/admin/flyer/FlyerPreview`; `supabase` from `@/integrations/supabase/client`.
- Produces: a route at `/flyer-print?ids=<id1>,<id2>,...` that headless Chromium (Task 2) navigates to. Signals done via `document.body.getAttribute("data-flyer-ready") === "true"`.

- [ ] **Step 1: Write the page**

```tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FlyerPreview } from "@/components/admin/flyer/FlyerPreview";
import { FLYER_PACKAGE_COLUMNS, type FlyerPackage } from "@/lib/flyer/flyerData";

/**
 * Unauthenticated route rendered by the headless browser in
 * functions/flyer-image.ts (packages has a public SELECT policy already -
 * see docs/superpowers/plans/2026-07-28-flyer-generator.md). Renders
 * FlyerPreview at true, unscaled 1080x1920px and marks the DOM ready via a
 * body attribute once fonts and images have actually finished loading, so
 * the Function can wait on a real condition instead of a fixed timeout.
 */
export default function FlyerPrint() {
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState<FlyerPackage[] | null>(null);

  const idsParam = searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").filter(Boolean);

  useEffect(() => {
    if (ids.length === 0) {
      setPackages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("packages")
        .select(FLYER_PACKAGE_COLUMNS)
        .in("id", ids);
      if (cancelled) return;
      if (error || !data) {
        setPackages([]);
        return;
      }
      const byId = new Map((data as unknown as FlyerPackage[]).map((p) => [p.id, p]));
      const ordered = ids.map((id) => byId.get(id)).filter((p): p is FlyerPackage => Boolean(p));
      setPackages(ordered);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsParam]);

  useEffect(() => {
    if (packages === null) return;
    let cancelled = false;
    (async () => {
      const images = Array.from(document.querySelectorAll("img"));
      await Promise.all([
        document.fonts.ready,
        ...images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              })
        ),
      ]);
      if (!cancelled) document.body.setAttribute("data-flyer-ready", "true");
    })();
    return () => {
      cancelled = true;
    };
  }, [packages]);

  if (packages === null) return null;

  return <FlyerPreview packages={packages} />;
}
```

- [ ] **Step 2: Register the lazy import in `App.tsx`**

Find (around line 58):

```typescript
const FlyerGenerator = lazy(() => import("./pages/admin/FlyerGenerator"));
```

Add directly after it:

```typescript
const FlyerPrint = lazy(() => import("./pages/FlyerPrint"));
```

- [ ] **Step 3: Register the public route in `App.tsx`**

Find (around line 249):

```tsx
<Route path="/packages" element={<PublicMarketingKit />} />
```

Add directly after it:

```tsx
<Route path="/flyer-print" element={<FlyerPrint />} />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `FlyerPrint.tsx`.

- [ ] **Step 5: Manual browser verification**

Start the dev server, pick 2-3 real package ids from `/admin/flyer-generator` (open browser devtools, or query `supabase.from('packages').select('id').limit(3)`), then navigate to `/flyer-print?ids=<id1>,<id2>,<id3>` while logged out.
Expected: the flyer renders at full 1080x1920 size (no admin nav, no sidebar), and running `document.body.getAttribute('data-flyer-ready')` in the console eventually returns `"true"`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/FlyerPrint.tsx src/App.tsx
git commit -m "feat: add public flyer-print route for headless screenshotting"
```

---

### Task 2: Cloudflare Function that screenshots the print route

**Files:**
- Modify: `functions/_lib/env.ts`
- Create: `functions/flyer-image.ts`
- Create: `wrangler.toml`
- Modify: `package.json` (add `@cloudflare/puppeteer`)

**Interfaces:**
- Consumes: `Env` from `./_lib/env`; the `/flyer-print` route from Task 1.
- Produces: `GET /flyer-image?ids=<comma-separated-ids>&format=png|jpeg` → `image/png` or `image/jpeg` response body, consumed by Task 3.

- [ ] **Step 1: Add the dependency**

```bash
npm install @cloudflare/puppeteer
```

- [ ] **Step 2: Add the `BROWSER` binding to `Env`**

In `functions/_lib/env.ts`, change:

```typescript
export interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}
```

to:

```typescript
export interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  BROWSER: Fetcher;
}
```

- [ ] **Step 3: Write the Function**

```typescript
import puppeteer from "@cloudflare/puppeteer";
import type { Env } from "./_lib/env";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const ids = url.searchParams.get("ids");
  const format = url.searchParams.get("format") === "jpeg" ? "jpeg" : "png";

  if (!ids) {
    return new Response("Missing ids query param", { status: 400 });
  }

  const browser = await puppeteer.launch(context.env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });

    const printUrl = `${url.origin}/flyer-print?ids=${encodeURIComponent(ids)}`;
    await page.goto(printUrl, { waitUntil: "networkidle0" });
    await page.waitForSelector('body[data-flyer-ready="true"]', { timeout: 20000 });

    const image = await page.screenshot({
      type: format,
      ...(format === "jpeg" ? { quality: 92 } : {}),
      clip: { x: 0, y: 0, width: 1080, height: 1920 },
    });

    const dateStamp = new Date().toISOString().slice(0, 10);
    const ext = format === "jpeg" ? "jpg" : "png";
    return new Response(image, {
      headers: {
        "content-type": format === "jpeg" ? "image/jpeg" : "image/png",
        "content-disposition": `attachment; filename="flyer-umroh-${dateStamp}.${ext}"`,
        "cache-control": "no-store",
      },
    });
  } finally {
    await browser.close();
  }
};
```

- [ ] **Step 4: Add `wrangler.toml`**

Create at the repo root:

```toml
name = "musafar-tour"
pages_build_output_dir = "dist"
compatibility_date = "2026-07-29"
compatibility_flags = ["nodejs_compat"]

[[browser]]
binding = "BROWSER"
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `functions/flyer-image.ts` or `functions/_lib/env.ts`.

- [ ] **Step 6: Enable Browser Rendering on the Cloudflare account (user action, not code)**

In the Cloudflare dashboard: Workers & Pages → Browser Rendering → enable it for this account, if not already enabled. This is required for the `[[browser]]` binding to provision on deploy. **Stop and confirm this is done before treating this task as finished** — it cannot be verified from within this coding session.

- [ ] **Step 7: Verify against the real binding (user action)**

This cannot be fully emulated by plain `wrangler pages dev` — it needs the real Cloudflare API. Run, after `wrangler login`:

```bash
npx wrangler pages dev dist --compatibility-flag=nodejs_compat --remote
```

Then in another terminal:

```bash
curl -o /tmp/flyer-test.png "http://localhost:8788/flyer-image?ids=<real-id-1>,<real-id-2>&format=png"
sips -g pixelWidth -g pixelHeight /tmp/flyer-test.png
```

Expected: `pixelWidth: 1080`, `pixelHeight: 1920`, and opening the file shows the flyer matching the live `/flyer-print` preview.

- [ ] **Step 8: Commit**

```bash
git add functions/_lib/env.ts functions/flyer-image.ts wrangler.toml package.json package-lock.json
git commit -m "feat: add Cloudflare Function to screenshot the flyer via Browser Rendering"
```

---

### Task 3: Wire the admin download buttons to the new Function

**Files:**
- Modify: `src/pages/admin/FlyerGenerator.tsx`
- Delete: `src/lib/flyer/flyerExport.ts`
- Modify: `package.json` (remove `html2canvas`)

**Interfaces:**
- Consumes: `GET /flyer-image?ids=...&format=...` from Task 2.
- Produces: same on-page behavior as before (two buttons trigger browser downloads), no change to any other component's interface.

- [ ] **Step 1: Replace `handleExport` in `FlyerGenerator.tsx`**

Change the file's top doc comment and `handleExport`:

```tsx
/** Replaces the manual Canva redesign of the seat-availability flyer - renders live from packages data (kept fresh by the existing 5-minute Google Sheet sync) and exports via a real headless-browser screenshot (functions/flyer-image.ts), so the download always matches the live preview exactly. */
export default function FlyerGenerator() {
```

Replace:

```tsx
  const handleExport = async (format: "png" | "jpeg") => {
    if (!previewRef.current) return;
    setExporting(format);
    try {
      await exportFlyerAsImage(previewRef.current, format);
      toast.success("Flyer berhasil diunduh");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat flyer");
    } finally {
      setExporting(null);
    }
  };
```

with:

```tsx
  const handleExport = async (format: "png" | "jpeg") => {
    if (selectedPackages.length === 0) return;
    setExporting(format);
    try {
      const ids = selectedPackages.map((p) => p.id).join(",");
      const res = await fetch(`/flyer-image?ids=${encodeURIComponent(ids)}&format=${format}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const dateStamp = new Date().toISOString().slice(0, 10);
      const ext = format === "png" ? "png" : "jpg";
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `flyer-umroh-${dateStamp}.${ext}`;
      link.href = objectUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      toast.success("Flyer berhasil diunduh");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat flyer");
    } finally {
      setExporting(null);
    }
  };
```

Remove the now-unused import:

```tsx
import { exportFlyerAsImage } from "@/lib/flyer/flyerExport";
```

`previewRef` and the `ref={previewRef}` prop on `<FlyerPreview>` can stay (harmless, `FlyerPreview` still accepts a ref) — no need to touch that JSX.

- [ ] **Step 2: Delete the html2canvas export helper**

```bash
rm src/lib/flyer/flyerExport.ts
```

- [ ] **Step 3: Remove the now-unused dependency**

In `package.json`, remove the line:

```json
"html2canvas": "^1.4.1",
```

Run: `npm install` (to update `package-lock.json` to match).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. In particular, no dangling reference to `flyerExport.ts`.

- [ ] **Step 5: Browser verification**

With the dev server running and `/flyer-image` reachable (Task 2, Step 7 must be working — this endpoint doesn't exist under plain `vite dev`, so this step requires either `wrangler pages dev --remote` running the built `dist` alongside Vite, or testing against a deployed preview URL):

Navigate to `/admin/flyer-generator`, select packages, click "Download PNG" then "Download JPEG".
Expected: both trigger a real file download; opening each file shows an image pixel-matching the on-screen preview exactly (this is the whole point — no more "shifted by a few pixels").

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/FlyerGenerator.tsx package.json package-lock.json
git commit -m "feat: export flyer via headless-browser screenshot instead of html2canvas"
```

---

### Task 4: Regression check on unrelated admin pages

**Files:** none (verification only)

- [ ] **Step 1: Confirm no regressions**

Navigate to `/admin/articles` and `/admin/ad-spend` (both share `AdminLayout`).
Expected: both still render normally — none of this plan's changes touch `AdminLayout.tsx` or shared admin routing.

- [ ] **Step 2: Confirm the admin flyer-generator route still requires login**

Log out, navigate to `/admin/flyer-generator`.
Expected: redirects to `/auth`, same as before — only the new `/flyer-print` route is intentionally public.

---

## Self-Review Notes

- **Spec coverage:** public print route with a real readiness signal ✓ (Task 1), headless-browser screenshot via Cloudflare Browser Rendering ✓ (Task 2), admin UI wired to the new endpoint with old path fully removed ✓ (Task 3), regression check ✓ (Task 4).
- **Placeholder scan:** no TBD/TODO; every step has complete code. The two steps that are genuinely user-executed (enabling Browser Rendering on the account, running `wrangler pages dev --remote` under the user's own Cloudflare login) are called out explicitly as such rather than glossed over, since this plan's author (this session) has no access to the user's Cloudflare account.
- **Type consistency:** `FlyerPackage`/`FLYER_PACKAGE_COLUMNS` reused from `flyerData.ts` unchanged; `Env.BROWSER: Fetcher` in Task 2 matches `context.env.BROWSER` usage in the same task; the `/flyer-image` query params (`ids`, `format`) match exactly between Task 2's Function and Task 3's `fetch` call.
