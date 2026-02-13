
## Root Cause

The Google Sheets headers for hotel columns contain **line breaks** (e.g., `"Hotel\nMakkah"` instead of `"Hotel Makkah"`). The current matching logic normalizes to lowercase but does NOT strip newlines, so `"hotel\nmakkah"` fails to match the alias `"hotel makkah"` in the HEADER_MAP.

Additionally, the spreadsheet has **no separate star rating columns** (`Bintang Makkah`, etc.) -- only hotel name columns. The sync function tries to map star columns that don't exist.

## Fix

**File: `supabase/functions/sync-google-sheets/index.ts`**

1. **Normalize newlines in header matching**: In the `matchHeader()` function, replace all whitespace characters (including `\n`, `\r`, `\t`) with a single space before matching:
   ```
   const normalized = header.trim().toLowerCase().replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ')
   ```

2. **Add `"hotel kota +"` alias** to HEADER_MAP for the extra city hotel column (column 20).

3. **Remove dependency on missing star columns**: Since the spreadsheet doesn't have separate star rating columns, remove the expectation for `_star_makkah` / `_star_madinah` mapping. Stars should either be parsed from hotel names or left null.

This single whitespace normalization fix will immediately cause columns 18-20 to match correctly, populating `makkah_hotel_name`, `madinah_hotel_name`, and the extra city hotel for all synced packages.

## Technical Details

- Only one file changes: `supabase/functions/sync-google-sheets/index.ts`
- Line ~150 in `matchHeader()`: add `.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ')` to the normalization
- Add HEADER_MAP entry: `'hotel kota +': '_hotel_extra'` and handle `_hotel_extra` in the upsert logic
- After deploying, re-running sync will populate all hotel fields
