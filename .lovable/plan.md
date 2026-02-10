

## Standardize Data Fetching and Lead Routing

### Overview
This plan addresses three concerns across `PaketUmroh.tsx`, `PackageDetail.tsx`, and `JadwalUmroh.tsx`:
1. Replace raw `useEffect`/`useState` fetching with TanStack React Query (5-min stale time)
2. Replace all hardcoded `081917403797` WhatsApp routing with the weighted chat rotation system
3. Add Zod schemas for type-safe package price JSON parsing

---

### 1. Create shared hook: `src/hooks/usePackages.ts`

A new custom hook that encapsulates package fetching with React Query, reusable across all three pages.

- **`usePublishedPackages()`** -- fetches all published packages ordered by departure date. Uses query key `["published-packages"]` and `staleTime: 5 * 60 * 1000`.
- **`usePackageBySlug(slug)`** -- fetches a single package by slug using `.maybeSingle()`. Uses query key `["package-detail", slug]`, same stale time, `enabled: !!slug`.

Both will parse `package_price` and `five_star_package_price` through a Zod schema before returning.

### 2. Create Zod schema: `src/lib/packageSchema.ts`

```typescript
import { z } from "zod";

export const packagePriceSchema = z.object({
  quad: z.number(),
  triple: z.number(),
  double: z.number(),
});

export type PackagePrice = z.infer<typeof packagePriceSchema>;
```

A helper `parsePackagePrice(raw: unknown)` function will safely parse JSON fields, returning `undefined` on failure instead of crashing.

### 3. Create shared utility: `src/lib/chatRedirect.ts`

Extract the WhatsApp redirect logic from `Chat.tsx` into a reusable function:

```typescript
export const redirectToWhatsApp = async (message: string) => {
  const cs = await getNextCS();
  if (!cs) {
    // Fallback: open /chat route
    window.open("/chat?msg=" + encodeURIComponent(message), "_blank");
    return;
  }
  // Save click to database (fire-and-forget)
  saveClickToDatabase(cs, message, {});
  logRedirect(cs.id, cs.name, message);
  // Open WhatsApp
  const url = buildWhatsAppUrl(cs.phone_number, message);
  window.open(url, "_blank");
};
```

This reuses the same `getNextCS()`, `saveClickToDatabase()`, `logRedirect()`, and `buildWhatsAppUrl()` functions from `whatsappRotation.ts` and `Chat.tsx`.

### 4. Update `src/pages/PaketUmroh.tsx`

**Before:**
- `useState` + `useEffect` + `fetchPackages` + `as any` cast
- Hardcoded `formatWhatsAppUrl("081917403797", message)`

**After:**
- Import `usePublishedPackages()` from the new hook
- Remove `useState(packages)`, `useState(loading)`, `useEffect`, and `fetchPackages`
- Use `const { data: packages = [], isLoading } = usePublishedPackages()`
- Replace WhatsApp button `onClick` in schedule view with `redirectToWhatsApp(message)`
- Remove `formatWhatsAppUrl` import (no longer needed here)

### 5. Update `src/pages/PackageDetail.tsx`

**Before:**
- `useState` + `useEffect` + `fetchPackageDetail` + `as any as { quad, triple, double }`
- `handleBooking` uses hardcoded `"081917403797"`

**After:**
- Import `usePackageBySlug(slug)` from the new hook
- Remove manual state management and `useEffect`
- Use `const { data: packageData, isLoading } = usePackageBySlug(slug)`
- Replace `handleBooking` to call `redirectToWhatsApp(message)` instead
- Same change for sticky mobile CTA button

### 6. Update `src/pages/JadwalUmroh.tsx`

- Replace the hardcoded WhatsApp number in the "Daftar Sekarang" button with `redirectToWhatsApp(message)`
- If it also uses `useEffect` fetching, convert to React Query (will use `usePublishedPackages`)

---

### Files to create:
| File | Purpose |
|------|---------|
| `src/lib/packageSchema.ts` | Zod schema for `package_price` JSON |
| `src/lib/chatRedirect.ts` | Reusable weighted WhatsApp redirect function |
| `src/hooks/usePackages.ts` | React Query hooks for package data |

### Files to modify:
| File | Changes |
|------|---------|
| `src/pages/PaketUmroh.tsx` | Replace useEffect with React Query hook; replace hardcoded WA number |
| `src/pages/PackageDetail.tsx` | Replace useEffect with React Query hook; replace hardcoded WA number |
| `src/pages/JadwalUmroh.tsx` | Replace hardcoded WA number with chat rotation |

### Technical notes:
- The `saveClickToDatabase` function currently lives in `Chat.tsx` -- it will be moved to `src/lib/chatRedirect.ts` so both the `/chat` route and inline buttons can use it
- `Chat.tsx` will be updated to import from `chatRedirect.ts` instead of having its own copy
- The React Query cache key `["published-packages"]` is intentionally different from `["homepage-packages"]` used by `useHomepageData` since the homepage may add different filters in the future
- Zod parsing uses `.safeParse()` so malformed JSON won't crash the page -- it will fall back to `{ quad: 0, triple: 0, double: 0 }`

