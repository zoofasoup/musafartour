# Flyer Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual Canva/Photoshop redesign of the "Paket Umroh" seat-availability flyer with a database-driven admin page that renders a live 1080×1920 preview from real `packages` data and exports it as PNG/JPEG.

**Architecture:** A new admin-only React page renders the flyer as ordinary HTML/CSS (static background image + a real HTML table populated from `packages` + a freshly-generated date badge), at true 1080×1920 pixel size. `html2canvas` (already an installed, currently-unused dependency) snapshots that DOM node client-side into an image on demand. No server-side rendering, no new hosting, no new database tables or migrations — `packages` already has a public SELECT policy.

**Tech Stack:** React + TypeScript + Tailwind (existing app), `@tanstack/react-query` (existing), `html2canvas` (existing dependency, first real usage), `date-fns` + `date-fns/locale/id` (existing dependency, already used elsewhere for Indonesian date formatting), `lucide-react` icons (existing).

## Global Constraints

- Fixed output canvas: exactly 1080×1920px, every time — never dynamically sized.
- Safe zone for the table: x = 40–1040 (1000px wide), y = 480–1790 (1310px tall). Measured directly against the team's real background asset. Nothing may render outside this box except the background image itself and the date badge.
- Safe zone fits a maximum of **16 selected packages** (1 header row + up to 16 data rows, at ~78px/row matching the team's original design density). This is a hard cap enforced in the UI, not a soft warning.
- Background asset source file (already provided by the user): `/Users/macbookair/Desktop/~ Update Seat.png` (1080×1920px, verified via `sips`).
- Data source is the existing `packages` table only — no new tables, no new migrations, no RLS changes (existing "Packages are viewable by everyone" policy already covers this).
- New admin route gated to roles: `admin`, `superadmin`, `content_admin` (same convention as other marketing-facing admin pages, e.g. Articles/FAQ in `AdminLayout.tsx`).
- No test framework exists in this repo (no Vitest/Jest configured) — "tests" in this plan are (a) standalone `tsx`-executed assertion scripts for pure functions, matching the verification pattern already used for `scripts/article-pipeline/qa.ts` earlier in this project's history, and (b) manual browser verification via the dev server, matching how every other feature in this codebase has been verified this session. Do not introduce a new test framework as part of this plan.

---

## File Structure

| File | Responsibility |
|---|---|
| `public/flyer/background.png` | The static 1080×1920 background asset (copied from the source file, used as-is) |
| `src/lib/flyer/flyerData.ts` | Types + pure functions: tier price resolution, price/date formatting, seat-status label, the row cap constant. No React, no Supabase calls — fully unit-testable in isolation. |
| `src/lib/flyer/flyerExport.ts` | One function wrapping `html2canvas` + triggering a browser file download, for both PNG and JPEG. |
| `src/components/admin/flyer/FlyerRowPicker.tsx` | Sidebar checklist of eligible packages, enforces the 16-row cap. |
| `src/components/admin/flyer/FlyerPreview.tsx` | The exact 1080×1920 DOM node that gets captured — background image, date badge, table. `forwardRef` so the page can pass its DOM node to the export function. |
| `src/pages/admin/FlyerGenerator.tsx` | Page shell: fetches `packages`, holds selection state, lays out picker + preview + download buttons. |
| `src/App.tsx` (modify) | Lazy import + route registration for `/admin/flyer-generator`. |
| `src/components/admin/AdminLayout.tsx` (modify) | Nav entry under "CONTENT & BLOG". |

---

### Task 1: Copy the background asset

**Files:**
- Create: `public/flyer/background.png`

**Interfaces:**
- Produces: a static file servable at `/flyer/background.png` in both dev and production builds (Vite serves everything under `public/` from the site root).

- [ ] **Step 1: Copy the file into the project**

```bash
cp "/Users/macbookair/Desktop/~ Update Seat.png" "public/flyer/background.png"
```

- [ ] **Step 2: Verify it copied correctly at the expected size**

Run: `sips -g pixelWidth -g pixelHeight public/flyer/background.png`
Expected output: `pixelWidth: 1080` and `pixelHeight: 1920`.

- [ ] **Step 3: Commit**

```bash
git add public/flyer/background.png
git commit -m "feat: add flyer background asset for flyer generator"
```

---

### Task 2: Data helpers (`flyerData.ts`)

**Files:**
- Create: `src/lib/flyer/flyerData.ts`
- Test: `src/lib/flyer/flyerData.check.ts` (temporary, run via `tsx`, deleted at the end of this task — see Step 4)

**Interfaces:**
- Produces (consumed by Task 3, 4, 5):
  - `interface TierPrice { quad: number; double: number; triple: number }`
  - `interface FlyerPackage { id: string; package_name: string; departure_date: string; duration_days: number; flight: string; route: string | null; is_sold_out: boolean; slots_total: number | null; slots_filled: number | null; available_tiers: string[] | null; package_price: TierPrice | null; hemat_package_price: TierPrice | null; five_star_package_price: TierPrice | null; pelataran_package_price: TierPrice | null; makkah_hotel_name: string | null; makkah_hotel_star: number | null; madinah_hotel_name: string | null; madinah_hotel_star: number | null; }`
  - `const FLYER_PACKAGE_COLUMNS: string` — the exact Supabase `.select()` column list matching `FlyerPackage`
  - `const SAFE_ZONE_MAX_ROWS = 16`
  - `function getQuadPrice(pkg: FlyerPackage): number`
  - `function formatPriceJuta(amount: number): string`
  - `function formatDepartureDate(iso: string): string`
  - `function monthLabel(iso: string): string`
  - `function getSeatLabel(pkg: FlyerPackage): string`

- [ ] **Step 1: Write the file**

```typescript
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export interface TierPrice {
  quad: number;
  double: number;
  triple: number;
}

export interface FlyerPackage {
  id: string;
  package_name: string;
  departure_date: string;
  duration_days: number;
  flight: string;
  route: string | null;
  is_sold_out: boolean;
  slots_total: number | null;
  slots_filled: number | null;
  available_tiers: string[] | null;
  package_price: TierPrice | null;
  hemat_package_price: TierPrice | null;
  five_star_package_price: TierPrice | null;
  pelataran_package_price: TierPrice | null;
  makkah_hotel_name: string | null;
  makkah_hotel_star: number | null;
  madinah_hotel_name: string | null;
  madinah_hotel_star: number | null;
}

export const FLYER_PACKAGE_COLUMNS =
  "id,package_name,departure_date,duration_days,flight,route,is_sold_out,slots_total,slots_filled,available_tiers,package_price,hemat_package_price,five_star_package_price,pelataran_package_price,makkah_hotel_name,makkah_hotel_star,madinah_hotel_name,madinah_hotel_star";

/** Max rows (including the header row, so 16 data rows) that fit the measured 1310px-tall safe zone at the team's original ~78px row height. */
export const SAFE_ZONE_MAX_ROWS = 16;

/**
 * The lowest-tier ("quad") price for a package. Tier price data is split
 * across per-tier JSON columns; only the column matching available_tiers[0]
 * actually holds non-zero values (confirmed against live data - the base
 * package_price column is only populated for the "nyaman" tier, which has
 * no dedicated column of its own).
 */
export function getQuadPrice(pkg: FlyerPackage): number {
  const tier = pkg.available_tiers?.[0] ?? "";
  if (tier === "hemat") return pkg.hemat_package_price?.quad ?? 0;
  if (tier === "five-star") return pkg.five_star_package_price?.quad ?? 0;
  if (tier.startsWith("pelataran")) return pkg.pelataran_package_price?.quad ?? 0;
  return pkg.package_price?.quad ?? 0;
}

/** 34400000 -> "34,4" (millions, one decimal, Indonesian comma separator). */
export function formatPriceJuta(amount: number): string {
  return (amount / 1_000_000).toFixed(1).replace(".", ",");
}

/** "2026-07-03" -> "3 Jul 2026" */
export function formatDepartureDate(iso: string): string {
  return format(new Date(iso), "d MMM yyyy", { locale: localeId });
}

/** "2026-07-03" -> "Bulan Juli". December is a special case matching the team's existing copy ("Liburan Desember"). */
export function monthLabel(iso: string): string {
  const date = new Date(iso);
  if (date.getMonth() === 11) return "Liburan Desember";
  return `Bulan ${format(date, "MMMM", { locale: localeId })}`;
}

/** "Sold Out!" or the remaining seat count as a string. */
export function getSeatLabel(pkg: FlyerPackage): string {
  const total = pkg.slots_total ?? 0;
  const filled = pkg.slots_filled ?? 0;
  if (pkg.is_sold_out || filled >= total) return "Sold Out!";
  return String(total - filled);
}
```

- [ ] **Step 2: Write the verification script**

```typescript
import {
  formatPriceJuta,
  formatDepartureDate,
  monthLabel,
  getSeatLabel,
  getQuadPrice,
  type FlyerPackage,
} from "./flyerData";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`FAIL ${label}: expected ${e}, got ${a}`);
  console.log(`PASS ${label}`);
}

const basePkg: FlyerPackage = {
  id: "1",
  package_name: "Umroh Hemat",
  departure_date: "2026-07-03",
  duration_days: 12,
  flight: "Garuda Indonesia",
  route: "JED-MED",
  is_sold_out: false,
  slots_total: 40,
  slots_filled: 40,
  available_tiers: ["hemat"],
  package_price: { quad: 0, double: 0, triple: 0 },
  hemat_package_price: { quad: 34400000, double: 38400000, triple: 36400000 },
  five_star_package_price: { quad: 0, double: 0, triple: 0 },
  pelataran_package_price: { quad: 0, double: 0, triple: 0 },
  makkah_hotel_name: "Nada Ajyad",
  makkah_hotel_star: 3,
  madinah_hotel_name: "Manazeel Safia",
  madinah_hotel_star: 3,
};

assertEqual(formatPriceJuta(34400000), "34,4", "formatPriceJuta hemat price");
assertEqual(formatDepartureDate("2026-07-03"), "3 Jul 2026", "formatDepartureDate");
assertEqual(monthLabel("2026-07-03"), "Bulan Juli", "monthLabel July");
assertEqual(monthLabel("2026-12-28"), "Liburan Desember", "monthLabel December special case");
assertEqual(getQuadPrice(basePkg), 34400000, "getQuadPrice hemat tier");
assertEqual(getSeatLabel(basePkg), "Sold Out!", "getSeatLabel when slots_filled >= slots_total");

const nyamanPkg: FlyerPackage = {
  ...basePkg,
  available_tiers: ["nyaman"],
  package_price: { quad: 32900000, double: 38900000, triple: 35900000 },
  hemat_package_price: { quad: 0, double: 0, triple: 0 },
  slots_filled: 10,
};
assertEqual(getQuadPrice(nyamanPkg), 32900000, "getQuadPrice nyaman tier uses base package_price");
assertEqual(getSeatLabel(nyamanPkg), "30", "getSeatLabel remaining count");

const fiveStarPkg: FlyerPackage = {
  ...basePkg,
  available_tiers: ["five-star"],
  hemat_package_price: { quad: 0, double: 0, triple: 0 },
  five_star_package_price: { quad: 41400000, double: 47400000, triple: 44400000 },
};
assertEqual(getQuadPrice(fiveStarPkg), 41400000, "getQuadPrice five-star tier");

console.log("All flyerData checks passed.");
```

- [ ] **Step 3: Run the verification script**

Run: `npx tsx src/lib/flyer/flyerData.check.ts`
Expected: every line prints `PASS ...`, ending with `All flyerData checks passed.` with no thrown error.

- [ ] **Step 4: Delete the temporary check script**

```bash
rm src/lib/flyer/flyerData.check.ts
```

(This script's assertions are captured in this plan; it's a one-time verification, not a permanent test file, matching the fact this repo has no test runner wired into `npm test`/CI.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/flyer/flyerData.ts
git commit -m "feat: add flyer data helpers for tier price resolution and formatting"
```

---

### Task 3: Row picker sidebar

**Files:**
- Create: `src/components/admin/flyer/FlyerRowPicker.tsx`

**Interfaces:**
- Consumes: `FlyerPackage`, `SAFE_ZONE_MAX_ROWS` from `@/lib/flyer/flyerData`; `getSeatLabel`, `formatDepartureDate` from the same module.
- Produces: `FlyerRowPicker` component with props `{ packages: FlyerPackage[]; selectedIds: Set<string>; onToggle: (id: string) => void }`, consumed by Task 6.

- [ ] **Step 1: Write the component**

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatDepartureDate, getSeatLabel, type FlyerPackage } from "@/lib/flyer/flyerData";

interface FlyerRowPickerProps {
  packages: FlyerPackage[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export function FlyerRowPicker({ packages, selectedIds, onToggle }: FlyerRowPickerProps) {
  if (packages.length === 0) {
    return <div className="text-sm text-muted-foreground py-4">Belum ada paket published dengan keberangkatan mendatang.</div>;
  }

  return (
    <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2">
      {packages.map((pkg) => {
        const seatLabel = getSeatLabel(pkg);
        return (
          <label
            key={pkg.id}
            className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
          >
            <Checkbox
              checked={selectedIds.has(pkg.id)}
              onCheckedChange={() => onToggle(pkg.id)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <Label className="cursor-pointer text-sm font-medium leading-tight">
                {pkg.package_name}
              </Label>
              <div className="text-xs text-muted-foreground">
                {formatDepartureDate(pkg.departure_date)} · {seatLabel === "Sold Out!" ? "Sold Out" : `${seatLabel} seat`}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Check the `Checkbox` component exists at that import path**

Run: `ls src/components/ui/checkbox.tsx`
Expected: file exists (this is a standard shadcn-ui component already used elsewhere in this codebase, e.g. `BulkPackageUpload.tsx`). If it's missing, stop and report this back rather than guessing at an alternative — do not substitute a plain `<input type="checkbox">`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `FlyerRowPicker.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/flyer/FlyerRowPicker.tsx
git commit -m "feat: add flyer row picker sidebar component"
```

---

### Task 4: Flyer preview (the captured DOM)

**Files:**
- Create: `src/components/admin/flyer/FlyerPreview.tsx`

**Interfaces:**
- Consumes: `FlyerPackage`, `formatDepartureDate`, `formatPriceJuta`, `getQuadPrice`, `getSeatLabel`, `monthLabel` from `@/lib/flyer/flyerData`.
- Produces: `FlyerPreview`, a `forwardRef<HTMLDivElement, { packages: FlyerPackage[] }>` component, consumed by Task 6 (its ref is passed to `exportFlyerAsImage` from Task 5).

- [ ] **Step 1: Write the component**

```tsx
import { forwardRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  formatDepartureDate,
  formatPriceJuta,
  getQuadPrice,
  getSeatLabel,
  monthLabel,
  type FlyerPackage,
} from "@/lib/flyer/flyerData";

interface FlyerPreviewProps {
  packages: FlyerPackage[];
}

/**
 * Rendered at true 1080x1920px (never scaled internally - the parent page
 * scales the whole node down visually for on-screen display via a CSS
 * transform, but html2canvas always captures this at native resolution).
 */
export const FlyerPreview = forwardRef<HTMLDivElement, FlyerPreviewProps>(
  ({ packages }, ref) => {
    const today = format(new Date(), "d MMMM yyyy", { locale: localeId });

    return (
      <div ref={ref} className="relative bg-black overflow-hidden" style={{ width: 1080, height: 1920 }}>
        <img
          src="/flyer/background.png"
          alt=""
          crossOrigin="anonymous"
          className="absolute inset-0 object-cover"
          style={{ width: 1080, height: 1920 }}
        />

        <div
          className="absolute flex items-center gap-2 bg-neutral-900/90 text-white rounded-full px-4 py-2"
          style={{ top: 24, left: 24 }}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-semibold">Diperbarui {today}</span>
        </div>

        <div className="absolute" style={{ top: 480, left: 40, width: 1000, height: 1310 }}>
          <table className="w-full border-collapse" style={{ fontSize: 13 }}>
            <thead>
              <tr className="bg-black text-white">
                <th className="py-2 px-2 text-left">Sisa Seat</th>
                <th className="py-2 px-2 text-left">Keberangkatan</th>
                <th className="py-2 px-2 text-left">Judul Paket</th>
                <th className="py-2 px-2 text-left">Durasi &amp; Rute</th>
                <th className="py-2 px-2 text-left">Maskapai</th>
                <th className="py-2 px-2 text-left">Hotel Makkah</th>
                <th className="py-2 px-2 text-left">Hotel Madinah</th>
                <th className="py-2 px-2 text-right">Harga</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => {
                const seatLabel = getSeatLabel(pkg);
                const isSoldOut = seatLabel === "Sold Out!";
                return (
                  <tr key={pkg.id} className={isSoldOut ? "bg-neutral-200" : "bg-white"}>
                    <td className="py-2 px-2 font-bold">{seatLabel}</td>
                    <td className="py-2 px-2">{formatDepartureDate(pkg.departure_date)}</td>
                    <td className="py-2 px-2">
                      <div className="font-bold">{pkg.package_name}</div>
                      <div className="text-neutral-500" style={{ fontSize: 11 }}>{monthLabel(pkg.departure_date)}</div>
                    </td>
                    <td className="py-2 px-2">
                      {pkg.duration_days} Hari
                      <br />
                      {pkg.route}
                    </td>
                    <td className="py-2 px-2">{pkg.flight}</td>
                    <td className="py-2 px-2">
                      {pkg.makkah_hotel_name}
                      <br />
                      {"★".repeat(pkg.makkah_hotel_star ?? 0)}
                    </td>
                    <td className="py-2 px-2">
                      {pkg.madinah_hotel_name}
                      <br />
                      {"★".repeat(pkg.madinah_hotel_star ?? 0)}
                    </td>
                    <td className="py-2 px-2 text-right font-bold">Rp {formatPriceJuta(getQuadPrice(pkg))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);
FlyerPreview.displayName = "FlyerPreview";
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `FlyerPreview.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/flyer/FlyerPreview.tsx
git commit -m "feat: add flyer preview component rendered at true 1080x1920px"
```

---

### Task 5: Export helper (`flyerExport.ts`)

**Files:**
- Create: `src/lib/flyer/flyerExport.ts`

**Interfaces:**
- Produces: `exportFlyerAsImage(node: HTMLElement, format: "png" | "jpeg"): Promise<void>`, consumed by Task 6.

- [ ] **Step 1: Write the file**

```typescript
import html2canvas from "html2canvas";

/**
 * Captures the given DOM node (expected to be exactly 1080x1920px - see
 * FlyerPreview) and triggers a browser download of the resulting image.
 */
export async function exportFlyerAsImage(node: HTMLElement, format: "png" | "jpeg"): Promise<void> {
  const canvas = await html2canvas(node, {
    width: 1080,
    height: 1920,
    scale: 1,
    useCORS: true,
    backgroundColor: null,
  });

  const mime = format === "png" ? "image/png" : "image/jpeg";
  const dataUrl = format === "jpeg" ? canvas.toDataURL(mime, 0.92) : canvas.toDataURL(mime);

  const dateStamp = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");
  link.download = `flyer-umroh-${dateStamp}.${format === "png" ? "png" : "jpg"}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `flyerExport.ts`. `html2canvas` ships its own bundled types (confirmed: `node_modules/html2canvas/dist/types/index.d.ts` exists, declared via its `typings` field) — no `@types` package needed.

- [ ] **Step 3: Commit**

```bash
git add src/lib/flyer/flyerExport.ts
git commit -m "feat: add html2canvas-based flyer export helper"
```

---

### Task 6: Page, routing, and nav entry

**Files:**
- Create: `src/pages/admin/FlyerGenerator.tsx`
- Modify: `src/App.tsx` (add lazy import near line 57, add route near line 389 — see existing `AdSpend` entries as the pattern to copy)
- Modify: `src/components/admin/AdminLayout.tsx` (add nav item to the "CONTENT & BLOG" section, around line 103)

**Interfaces:**
- Consumes: `FLYER_PACKAGE_COLUMNS`, `SAFE_ZONE_MAX_ROWS`, `FlyerPackage` from `@/lib/flyer/flyerData`; `FlyerRowPicker` from `@/components/admin/flyer/FlyerRowPicker`; `FlyerPreview` from `@/components/admin/flyer/FlyerPreview`; `exportFlyerAsImage` from `@/lib/flyer/flyerExport`.

- [ ] **Step 1: Write the page**

```tsx
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FlyerPreview } from "@/components/admin/flyer/FlyerPreview";
import { FlyerRowPicker } from "@/components/admin/flyer/FlyerRowPicker";
import { exportFlyerAsImage } from "@/lib/flyer/flyerExport";
import { FLYER_PACKAGE_COLUMNS, SAFE_ZONE_MAX_ROWS, type FlyerPackage } from "@/lib/flyer/flyerData";

const PREVIEW_SCALE = 0.4;

/** Replaces the manual Canva redesign of the seat-availability flyer - renders live from packages data (kept fresh by the existing 5-minute Google Sheet sync) and exports via html2canvas, so there's no longer a step that can be forgotten. */
export default function FlyerGenerator() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState<"png" | "jpeg" | null>(null);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["flyer-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select(FLYER_PACKAGE_COLUMNS)
        .eq("status", "published")
        .gte("departure_date", new Date().toISOString().slice(0, 10))
        .order("departure_date", { ascending: true });
      if (error) throw error;
      const rows = data as unknown as FlyerPackage[];
      setSelectedIds(new Set(rows.slice(0, SAFE_ZONE_MAX_ROWS).map((p) => p.id)));
      return rows;
    },
  });

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= SAFE_ZONE_MAX_ROWS) {
        toast.error(`Maksimal ${SAFE_ZONE_MAX_ROWS} paket bisa tampil di flyer.`);
        return prev;
      }
      next.add(id);
      return next;
    });
  };

  const selectedPackages = useMemo(
    () => packages.filter((p) => selectedIds.has(p.id)),
    [packages, selectedIds]
  );

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

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Memuat paket...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Flyer Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pilih paket yang tampil di flyer, lalu unduh sebagai gambar. Preview di bawah adalah persis apa yang akan diunduh.
        </p>
      </div>

      <div className="flex gap-6 flex-wrap lg:flex-nowrap">
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="text-sm font-medium">
            Dipilih: {selectedIds.size}/{SAFE_ZONE_MAX_ROWS}
          </div>
          <FlyerRowPicker packages={packages} selectedIds={selectedIds} onToggle={toggle} />
          <div className="flex gap-2">
            <Button onClick={() => handleExport("png")} disabled={exporting !== null || selectedPackages.length === 0}>
              {exporting === "png" ? "Membuat..." : "Download PNG"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("jpeg")}
              disabled={exporting !== null || selectedPackages.length === 0}
            >
              {exporting === "jpeg" ? "Membuat..." : "Download JPEG"}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto border rounded-lg bg-muted/30 p-4">
          <div
            style={{
              width: 1080 * PREVIEW_SCALE,
              height: 1920 * PREVIEW_SCALE,
            }}
          >
            <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
              <FlyerPreview ref={previewRef} packages={selectedPackages} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Register the lazy import in `App.tsx`**

Find this existing line (around line 57):

```typescript
const AdSpend = lazy(() => import("./pages/admin/AdSpend"));
```

Add directly after it:

```typescript
const FlyerGenerator = lazy(() => import("./pages/admin/FlyerGenerator"));
```

- [ ] **Step 3: Register the route in `App.tsx`**

Find this existing line (around line 389):

```tsx
<Route path="ad-spend" element={<AdSpend />} />
```

Add directly after it:

```tsx
<Route path="flyer-generator" element={<FlyerGenerator />} />
```

- [ ] **Step 4: Add the nav entry in `AdminLayout.tsx`**

Find the "CONTENT & BLOG" section (around line 100-106):

```tsx
    {
      label: "CONTENT & BLOG",
      items: [
        { icon: FileText, label: "Artikel", path: "/admin/articles", roles: ["admin", "superadmin", "content_admin"] },
        { icon: HelpCircle, label: "FAQ", path: "/admin/faq", roles: ["admin", "superadmin", "content_admin"] },
      ]
    },
```

Replace with:

```tsx
    {
      label: "CONTENT & BLOG",
      items: [
        { icon: FileText, label: "Artikel", path: "/admin/articles", roles: ["admin", "superadmin", "content_admin"] },
        { icon: HelpCircle, label: "FAQ", path: "/admin/faq", roles: ["admin", "superadmin", "content_admin"] },
        { icon: Download, label: "Flyer Generator", path: "/admin/flyer-generator", roles: ["admin", "superadmin", "content_admin"] },
      ]
    },
```

`Image` is already imported and already used for the "Hero Section" nav item (line 76) — reusing it here would show two identical icons in the sidebar. Add `Download` to the existing multi-line `lucide-react` import instead (the import block starts at line 5 and lists icons like `LogOut, LayoutDashboard, Home, Image, Target, ...` — add `Download` anywhere in that list).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/FlyerGenerator.tsx src/App.tsx src/components/admin/AdminLayout.tsx
git commit -m "feat: add flyer generator admin page, route, and nav entry"
```

---

### Task 7: Browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server and confirm the route exists**

Start the dev server (`npm run dev` or the project's existing preview workflow), then navigate to `/admin/flyer-generator` while not logged in.
Expected: redirects to `/auth` (matching every other gated admin route in this app), not a crash or blank page.

- [ ] **Step 2: Log in as an admin/superadmin/content_admin user and revisit the route**

Expected:
- Left sidebar shows a checklist of published, upcoming packages, pre-checked up to 16.
- Right side shows a live flyer preview at visibly correct proportions (portrait, background image visible, date badge top-left, table populated with real package rows).
- Checking/unchecking a row updates the table in the preview immediately.
- Attempting to check a 17th row when 16 are already selected shows the cap warning and does not add the row.

- [ ] **Step 3: Test both exports**

Click "Download PNG", then "Download JPEG".
Expected: both trigger a browser file download; opening each file shows an image exactly matching the on-screen preview, at 1080×1920px (verify with `sips -g pixelWidth -g pixelHeight ~/Downloads/flyer-umroh-*.png` after downloading).

- [ ] **Step 4: Confirm no regressions on unrelated admin pages**

Navigate to `/admin/articles` and `/admin/ad-spend` (both share the "CONTENT & BLOG"/admin layout).
Expected: both still render normally — the nav-array edit in Task 6 Step 4 didn't break existing entries.

---

## Self-Review Notes

- **Spec coverage:** fixed 1080×1920 canvas ✓ (Task 4), measured safe zone ✓ (Global Constraints + Task 4), single static background image with no cropping ✓ (Task 1 + Task 4), fresh date badge overlay ✓ (Task 4), `packages` as data source with corrected real column mapping ✓ (Task 2), sidebar row picker with hard cap ✓ (Task 3, Task 6), live preview as the confirmation step ✓ (Task 6), PNG/JPEG export via html2canvas ✓ (Task 5), role-gated route ✓ (Task 6 Step 4, Task 7 Step 1-2).
- **Placeholder scan:** no TBD/TODO markers; every step has real, complete code.
- **Type consistency:** `FlyerPackage` defined once in Task 2 and imported everywhere else (Tasks 3, 4, 6) rather than redefined; `exportFlyerAsImage(node, format)` signature in Task 5 matches its call site in Task 6 exactly; `SAFE_ZONE_MAX_ROWS` defined once and reused in Tasks 3 and 6, not duplicated as a magic number.
