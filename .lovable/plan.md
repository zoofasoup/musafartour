
# Fix: Hotel Data Not Showing in Admin Form

## Root Cause
The sync is actually **working correctly** -- hotel names are stored in the `packages` table. The problem is a **name mismatch** between:
- Google Sheets names: `"Mövenpick Hotel"`, `"Maysan Al Maqom"`, `"Al Olayan Golden"`, `"Anjum"`
- Hotels table names: `"Movenpick"`, `"Maysan Al Maqam"` (or missing entirely)

The admin form uses `makkahHotels.find((h) => h.name === field.value)` for exact matching, which fails on these differences. Result: "Belum dipilih".

## Solution

### 1. Fuzzy Hotel Matching in Sync Function
Update `supabase/functions/sync-google-sheets/index.ts` to:
- After extracting hotel name from the sheet, query the `hotels` table for the closest match
- Use a normalized comparison (lowercase, strip accents/diacritics, trim suffixes like "Hotel")
- If a match is found, use the **exact name from the hotels table** instead of the raw sheet value
- If no match exists, auto-create the hotel in the `hotels` table with the sheet name, correct location, and null star rating

### 2. Auto-Create Missing Hotels
For hotel names from Google Sheets that have no match in the `hotels` table at all (e.g., "Al Olayan Golden", "Anjum"), the sync function will:
- Insert them into the `hotels` table with the correct `location` (makkah/madinah)
- Set `star_rating` to null (can be filled in manually later)
- This ensures the form dropdown always has a matching entry

### 3. Normalize Existing Mismatches
Add a normalization helper function that strips diacritics (o with umlaut becomes o), removes common suffixes ("Hotel", "Makkah"), and lowercases for comparison:
```
"Mövenpick Hotel" -> "movenpick"
"Movenpick" -> "movenpick"  -- MATCH
"Maysan Al Maqom" -> "maysan al maqom"
"Maysan Al Maqam" -> "maysan al maqam"  -- close but not exact
```
For near-misses, use a simple similarity check (e.g., string starts-with or contains).

## Technical Details

### File: `supabase/functions/sync-google-sheets/index.ts`

1. Before the main row processing loop, fetch all hotels from the `hotels` table
2. Create a `resolveHotel(name, location)` function that:
   - Normalizes both the input name and all hotel table names
   - Finds the best match
   - If no match, inserts a new hotel record
   - Returns the exact hotel name from the database
3. Use this resolved name when setting `makkahHotel` and `madinahHotel` values

### Changes Summary
- **1 file modified**: `supabase/functions/sync-google-sheets/index.ts`
- **No schema changes needed** -- all columns already exist
- After deploying, re-running sync will fix all hotel references
