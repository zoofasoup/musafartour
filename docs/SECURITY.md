# Keamanan Musafar Tour

Diperiksa 5 Oktober 2026 terhadap database nyata (bukan hanya migrasi). Migrasi: `supabase/migrations/20261005090000_security_hardening.sql`.

## Status 20 poin

| # | Poin | Status | Catatan |
|---|---|---|---|
| 1 | Sembunyikan kunci API | Selesai | Browser hanya memegang kunci `anon`. `SERVICE_ROLE`, Turnstile secret, token Meta CAPI hanya di env Cloudflare |
| 2 | Bersihkan rahasia di git | Selesai | Riwayat diperiksa: hanya kunci `anon` (publik), tidak ada `service_role`, kunci pribadi, atau token |
| 3 | Kunci database publik | Selesai | Hanya `anon` di klien; yang ia bisa lakukan dibatasi RLS dan hak kolom |
| 4 | RLS | Selesai | Semua tabel `public` ber-RLS; tidak ada kebijakan tulis terbuka kecuali `site_events` (dibatasi panjang) |
| 5 | Enkripsi data sensitif | Sebagian | Dokumen jamaah dan KTP di bucket privat; disk database terenkripsi oleh Supabase. Enkripsi per kolom (NIK, paspor) belum |
| 6 | Auth di sisi server | Selesai | Hak admin ditegakkan RLS dan fungsi, bukan hanya rute React. `flyer-image` kini wajib sesi staf |
| 7 | Kunci akses per baris | Selesai | Agen hanya membaca barisnya sendiri di semua tabel agen |
| 8 | Cegah ubah field | Selesai | Pemicu `protect_agent_columns` dan `guard_agent_withdrawal` |
| 9 | Cookie sesi aman | Selesai | Sesi Supabase di localStorage (bukan cookie); cookie referral `SameSite=Lax; Secure` |
| 10 | Hash password | Selesai | Supabase Auth (bcrypt); tidak ada tabel password sendiri |
| 11 | Batas laju dan log | Sebagian | Pendaftaran: Turnstile + batas per nomor. Lead kalkulator: batas di database. Aturan Cloudflare belum (lihat bawah) |
| 12 | Proteksi bot | Sebagian | Turnstile di form daftar. Pendaftaran agen (Supabase Auth) belum (lihat bawah) |
| 13 | Query berparameter | Selesai | SQL dinamis memakai `%I` dan parameter; tidak ada filter dari input pengguna |
| 14 | Validasi input | Selesai | Functions dan RPC memvalidasi panjang, format, daftar putih |
| 15 | Escape konten | Selesai | DOMPurify untuk artikel; JSON-LD di-escape (`src/lib/jsonLd.ts`, `functions/_lib/render.ts`) |
| 16 | Batasi unggahan | Selesai | Batas ukuran dan tipe di semua bucket; jenis file jamaah dicek dari byte asli |
| 17 | Pangkas respons | Sebagian | Kunci publik tidak lagi bisa membaca kolom biaya modal di `packages`. Pengguna login (termasuk agen) masih bisa; pemisahan tabel khusus staf belum |
| 18 | Header keamanan | Selesai | CSP, HSTS, Permissions-Policy, X-Frame-Options di `public/_headers` |
| 19 | Paksa HTTPS | Selesai | Cloudflare Pages + HSTS satu tahun + `upgrade-insecure-requests` |
| 20 | Pindai dependensi | Sebagian | `npm audit fix` menurunkan 28 menjadi 17. Sisanya alat build, `@cloudflare/puppeteer`, `react-router`, `xlsx` (belum ada perbaikan) |

## Langkah manual (dashboard)

1. **Cloudflare, Security, WAF, Rate limiting rules:** satu aturan untuk `/api/*` (misal 20 permintaan per menit per IP).
2. **Supabase, Authentication, Attack Protection:** nyalakan CAPTCHA (Turnstile) setelah widget ditambahkan di pendaftaran dan login agen; nyalakan "Prevent use of leaked passwords" bila paket mendukung.
3. **Supabase, Authentication, Providers, Email:** panjang password minimum 8 atau lebih.
4. **Cloudflare, SSL/TLS, Edge Certificates:** "Always Use HTTPS" aktif.

## Yang masih terbuka

- Data biaya modal (`cogs_data`, `max_discount`, `change_reason`, `agent_commission_amount`) bisa dibaca setiap pengguna login karena pendaftaran agen terbuka. Perbaikan yang benar adalah memindahkannya ke tabel khusus staf (`package_internal`); menyentuh sekitar 8 halaman admin.
- `xlsx` (impor Excel di admin) punya kerentanan tanpa perbaikan di npm; hanya mem-parse file dari staf.
