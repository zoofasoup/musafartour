

# Fix Dark Mode Contrast + Speed Up Package Images

## Problem 1: Dark Mode Text Still Unreadable
The h1 heading in page headers relies on CSS inheritance for its color, which can fail in some rendering contexts. Adding explicit `text-foreground` to all headings and descriptions in the header sections will guarantee readability.

**Files to update** (6 pages -- same pattern):
- `src/pages/PaketUmroh.tsx`
- `src/pages/Artikel.tsx`
- `src/pages/JadwalUmroh.tsx`
- `src/pages/Kontak.tsx`
- `src/pages/Galeri.tsx`
- `src/pages/TentangKami.tsx`

Change: Add `text-foreground` to h1 tags in the header section.

## Problem 2: Images Loading Extremely Slow
All package banner images are currently served from Google Drive indirect URLs (`lh3.googleusercontent.com/d/...`). Google Drive is not designed as a CDN and adds significant latency (redirects, no edge caching, throttling).

### Solution: Migrate Images to Lovable Cloud Storage
Create a backend function that:
1. Downloads each image from the Google Drive URL
2. Compresses and converts it to WebP
3. Uploads it to a `package-images` storage bucket
4. Updates the `banner_image` field in the database with the new fast CDN URL

After migration, all future syncs from Google Sheets will also auto-upload Drive links to storage instead of storing them directly.

### Implementation Steps

1. **Create storage bucket** via SQL migration:
   - `package-images` bucket (public, for banner images)

2. **Create edge function** `migrate-drive-images`:
   - Fetches all packages with Google Drive banner URLs
   - Downloads each image
   - Uploads to `package-images` bucket as WebP
   - Updates the database record with the new storage URL
   - Returns a summary of migrated images

3. **Update `sync-google-sheets`** edge function:
   - When a new Google Drive link is detected during sync, automatically download and upload to storage instead of storing the Drive URL directly

4. **Add image loading optimization to `PackageCard`**:
   - Add a blurhash/skeleton placeholder while loading
   - Use `fetchpriority="high"` for first 4 visible cards

## Technical Details

### Storage Bucket Migration SQL
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('package-images', 'package-images', true);

-- Allow public read access
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'package-images');

-- Allow service role to upload
CREATE POLICY "Service role upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'package-images');
```

### Edge Function: `migrate-drive-images`
- Fetches packages where `banner_image LIKE '%googleusercontent%' OR banner_image LIKE '%drive.google%'`
- Downloads image via fetch
- Uploads to storage as `{package-slug}-banner.webp`
- Updates `packages.banner_image` with the public storage URL

### Sync Function Update
- In the existing `sync-google-sheets` function, after converting a Drive link, also upload to storage before saving

### PackageCard Optimization
- First 4 cards rendered with `loading="eager"` and `fetchpriority="high"`
- Remaining cards keep `loading="lazy"`

