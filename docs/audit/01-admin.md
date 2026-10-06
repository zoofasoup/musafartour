# Audit 01: Area Admin (CS dan owner)

Tanggal: 2026-10-06. Cakupan: `src/components/admin/AdminLayout.tsx`, 38 halaman di `src/pages/admin/`, 82 berkas admin (pages + components), hook terkait, 41 rute anak `/admin` plus `/admin/setup` di `src/App.tsx`. Pembanding: Linear, Stripe Dashboard, Shopify admin, HubSpot, Airtable, ERP travel. Read-only terhadap source dan database (lihat catatan metode di bagian 4).

## 1. Ringkasan

1. Admin dan portal agen adalah dua shell berbeda (sidebar, header, palet, bahasa, komponen judul). Keluhan owner benar dan bisa diukur: 705 kelas palet mentah di admin vs 8 di agen.
2. **P0:** semua role non-owner (cs_admin, product_admin, sales, dst.) mendarat di "Access Denied" setelah login, karena `Dashboard.tsx:106` hanya mengizinkan admin/superadmin sedangkan login selalu ke `/admin`.
3. **P0:** di bawah 768px menu admin tidak bisa dibuka sama sekali (tidak ada tombol toggle di header; satu-satunya tombol ada di dalam sheet yang tertutup).
4. **P0:** lonceng notifikasi kosong untuk semua superadmin (live: 6 notifikasi belum dibaca, superadmin melihat 0) karena RLS memeriksa `role = 'admin'` literal, padahal prod hanya punya superadmin dan product_admin.
5. Notifikasi "Pendaftaran Agen Baru" menuju `/admin/setup?tab=agents` (halaman bootstrap admin, bukan Kelola Agent); 5 baris di prod.
6. Verifikasi Pembayaran: `limit(300)` menyembunyikan 257 dari 557 pembayaran terverifikasi; tab Terverifikasi/Semua juga mengirim 300 id dalam satu URL tanpa penanganan galat.
7. Header "Search anything..." tidak berfungsi, breadcrumb salah di rute bersarang, tidak ada `document.title` per halaman.
8. Bahasa: sekitar 190 string Inggris (98 unik) di 32 berkas, plus 17 label menu dan 6 judul grup menu berbahasa Inggris.
9. Alur CS (intake sampai lunas) sudah ada kerangka bagus (duplikat nama, WA siap kirim, audit log jamaah, perubahan paket), tetapi tidak ada badge antrean, tidak ada catatan "sudah dikirim", pengingat hanya di laporan owner.
10. Tidak ada akun `cs_admin` di prod (user_roles: 3 superadmin, 1 product_admin); alur CS belum pernah dijalankan akun CS sungguhan.

| Area | Skor 0-5 | Catatan |
|---|---|---|
| A Shell | 1 | Tidak ada mobile trigger, state tidak diingat, search palsu, breadcrumb salah |
| B Pola halaman | 2 | Halaman jamaah dewasa; CRUD konten tanpa search/pagination/skeleton/retry |
| C Bahasa | 1 | Banyak Inggris, istilah campur |
| D Design system | 1 | 705 palet mentah, 72 teks <12px, tidak ada PageHeader admin |
| E Aksesibilitas | 2 | 53 tombol ikon tanpa label, label tanpa htmlFor; input touch 44px sudah di komponen dasar |
| F Role matrix | 2 | Landing Access Denied, bell, upload content_admin, Chat Rotation advertiser, Master COGS |
| G Journey | 2 | Putus di notifikasi, kirim manifest, pengingat, audit tim |
| H Performa | 3 | Aman untuk data sekarang; list tanpa paginasi akan membengkak |

## 2. Temuan

Severity: P0 memblokir pemakaian, P1 serius, P2 sebaiknya diperbaiki, P3 poles. Effort: S <2 jam, M setengah hari, L sehari+.

| ID | Sev | Area | Titik sentuh | Bukti | Standar yang seharusnya | Saran | Effort |
|---|---|---|---|---|---|---|---|
| ADM-001 | P0 | F/A | Landing semua role non-owner | `Dashboard.tsx:106` (`if (!isAdmin)` Access Denied); `Auth.tsx:125` `navigate("/admin")`; `AdminLayout.tsx:166` izinkan `/admin` untuk semua; menu Dashboard `AdminLayout.tsx:75` mencantumkan 5 role non-owner | Linear/Shopify: setiap role punya halaman awal yang berguna | Dashboard tampil sesuai role atau redirect ke menu pertama yang diizinkan; hapus guard `isAdmin` | S |
| ADM-002 | P0 | A | Menu di ponsel | `sidebar.tsx:154-170` mobile = Sheet tertutup; `SidebarTrigger` hanya di `AdminLayout.tsx:202,208` (di dalam sidebar); header `AdminLayout.tsx:311-331` tanpa tombol. Agen punya (`AgentHeader.tsx:17`) | Semua produk: hamburger di header mobile | Tambah `SidebarTrigger` 44px di header untuk `isMobile` | S |
| ADM-003 | P0 | F/G | Lonceng notifikasi | RLS `admin_notifications` SELECT/UPDATE: `user_roles.role = 'admin'` literal (bukan `has_role`). Live: superadmin S0 dari 6 baris (6 belum dibaca); `useAdminNotifications.tsx:37-47` menelan galat dan return `[]` | Stripe/HubSpot: notifikasi tiba ke semua staf berwenang | Ganti policy ke `has_role(...,'admin') OR has_role(...,'cs_admin')`; tampilkan galat bukan daftar kosong | S |
| ADM-004 | P1 | G | Notifikasi agen baru | `20261006090000_notification_meta.sql:27` dan 5 baris live `action_url='/admin/setup?tab=agents'`; rute `/admin/setup` = AdminSetup (bootstrap) | Deep link ke halaman yang benar | Ubah ke `/admin/agents`; perbarui 5 baris lama | S |
| ADM-005 | P1 | B/H | Verifikasi Pembayaran | `JamaahPayments.tsx:27` `.limit(300)`; live 557 verified, 257 tak terlihat; `:33` `.in("id", ids)` 300 id unik (terbukti 300 distinct) padahal `useJamaah.ts:79` mencatat URL panjang rusak; tanpa cabang galat (`:48`) sehingga tampil "Belum ada pembayaran." (inferensi, tidak dijalankan) | Stripe Payments: paginasi cursor + pencarian + filter tanggal | Paginasi server, batch id atau join, tampilkan LoadError, cari nama/paket/tanggal | M |
| ADM-006 | P1 | F | Master COGS simpan | policy `cogs_defaults` ALL hanya `role='admin'` literal; `CogsCalculator.tsx:529` upsert; prod tanpa user `admin` (dari teks policy, tulis tidak dijalankan) | Role hierarki konsisten | Pakai `has_role` di policy | S |
| ADM-007 | P1 | F | content_admin upload gambar | Hero/Gallery/Testimoni upload ke bucket `package-images` (`HeroSection.tsx:84`, `GalleryManagement.tsx:129`, `Testimonials.tsx:100`); storage policy content_admin hanya `article-images` dan `wisata-images` | Menu terlihat berarti aksi jalan | Beri policy bucket atau pindah bucket | S |
| ADM-008 | P1 | F | Chat Rotation untuk advertiser | menu `AdminLayout.tsx:137`; `whatsapp_cs` ALL hanya admin, advertiser hanya baca yang aktif; page menulis (`ChatRotation.tsx:128-239`) | idem | Policy advertiser atau cabut menu | S |
| ADM-009 | P1 | A/G | Shell admin vs agen | Lihat tabel 2a | Satu bahasa visual (DESIGN.md "Wilayah desain") | Satukan shell | L |
| ADM-010 | P1 | A | Sidebar collapse | `AdminLayout.tsx:182` `defaultOpen={false}` (selalu rel ikon tiap muat); cookie `sidebar:state` ditulis (`sidebar.tsx:68`) tak pernah dibaca; tombol 28px (`h-7 w-7`) tanpa tooltip, sr-only "Toggle Sidebar" Inggris, "Expand Sidebar" Inggris (`:210`); Logout hanya saat terbuka (`:293`); tanpa `SidebarRail`; pintasan Ctrl/Cmd+B ada tapi tak diumumkan | Linear/Notion: ingat state, tombol di semua kondisi, tooltip + pintasan | Baca cookie/localStorage, tombol 40/44px bertooltip "Ciutkan menu (Ctrl+B)", Keluar selalu terjangkau | S |
| ADM-011 | P1 | G | Dashboard owner | `Dashboard.tsx:19-90`: hanya paket, wisata halal (0 baris), artikel, klik WA; tanpa uang menunggu verifikasi, intake baru, penarikan, belum DP, H-30; kartu "Sistem" statis "Connected" (`:405,412`); tombol "Jalankan Migrasi" slug sekali klik tanpa konfirmasi (`:370`); fallback seat `\|\| 45` (`:151,269`); "Paket aktif" menghitung draft | Stripe home: angka yang perlu tindakan hari ini | Ganti dengan antrean tindakan (intake, bayar menunggu, penarikan, agen pending, jatuh tempo) | M |
| ADM-012 | P1 | G/F | Team: hapus akses | `manage-team/index.ts:181` `auth.admin.deleteUser` (akun dihapus permanen, juga bila dia agen); copy "dari daftar admin" (`Team.tsx:429`); tanpa konfirmasi ketik; tanpa jaga superadmin terakhir; tanpa audit perubahan role | Google Workspace/Notion: suspend dulu, hapus terpisah, log admin | Nonaktifkan akun alih-alih hapus, ConfirmDialog+ketik email, log perubahan role | M |
| ADM-013 | P1 | F/H | Edge function sync-seats tanpa auth | `config.toml`: `verify_jwt=false`; `sync-seats/index.ts` tidak memeriksa pemanggil (0 cek JWT/role) dan memakai service-role untuk menimpa seat dari Sheet publik berID tetap; `sync-itinerary` dan `migrate-package-slugs` memeriksa admin (dicek ulang). Dipanggil dari `Packages.tsx:244`. Tidak dipanggil live | Fungsi mutasi wajib cek role | Tambah cek JWT+role atau secret | S |
| ADM-014 | P1 | G | Kirim info DP dan link manifest | `JamaahIntake.tsx:327-355`: link manifest dan WA "Kirim info DP" hanya di tab Diterima per intake; tidak ada penanda "sudah dikirim", tidak bisa kirim ulang/regenerasi token, jamaah yang ditambah manual/import tak punya link, tolak tidak mengabari (`:187`); `useJamaahIntake.ts:54` limit 200 | HubSpot: aktivitas terlog, tindak lanjut terlacak | Setelah Terima tawarkan WA langsung; simpan `wa_sent_at`; tombol salin/kirim di detail jamaah | M |
| ADM-015 | P1 | C | Bahasa | Lihat bagian 4 | PRODUCT.md prinsip 5 | Terjemahkan menu, grup, toast, label | M |
| ADM-016 | P1 | B | Hapus tanpa ConfirmDialog | 13 `confirm()` + 1 `prompt()` (daftar di bagian 4), termasuk hapus agen berikut komisi (`AgentManagement.tsx:296`) dan hapus pembayaran (`PaymentTable.tsx:58`); pesan Inggris di 7 tempat | DESIGN.md: ConfirmDialog; hapus agen/pembayaran dengan ketik nama | Pakai `ConfirmDialog` (`confirmText` belum dipakai di mana pun) | M |
| ADM-017 | P2 | A | Pencarian global | `AdminLayout.tsx:324-328` input tanpa state/handler; tersembunyi <md | Linear Cmd+K | Hapus atau bangun command palette (cmdk sudah ada `ui/command.tsx`) untuk jamaah, paket, agen | L |
| ADM-018 | P2 | A | Breadcrumb | `AdminLayout.tsx:311-319`: ikon Dashboard tetap, "Main Menu" Inggris, rute `packages/add`, `hotels/:id`, `profile`, `articles/:id` jatuh ke "Dashboard" | Breadcrumb mengikuti rute | Peta rute ke judul, tautan induk | S |
| ADM-019 | P2 | A | Judul tab | `App.tsx:163` satu judul "Admin - Musafar Tour" untuk semua `/admin`; tak ada Helmet di halaman admin | Judul per halaman | Hook `usePageTitle` di layout dari peta rute | S |
| ADM-020 | P2 | A/G | Deep link setelah login | `AdminLayout.tsx:45` `Navigate to="/auth"` tanpa `from`; `Auth.tsx:125` selalu `/admin`; guard rute redirect diam-diam ke `/admin` (`:170`) | Kembali ke URL tujuan | Simpan `from`, tampilkan pesan "tidak punya akses" | S |
| ADM-021 | P2 | A | Badge antrean sidebar | Tidak ada badge untuk intake baru, pembayaran menunggu, penarikan, agen pending, padahal hook hitung ada (`useNewIntakeCount`, `JamaahPayments.tsx:40`) | Shopify: angka di menu | Badge di item menu | S |
| ADM-022 | P2 | G | Review dokumen | `jamaah.ts:261` checklist hanya ada/tidak ada berkas; tak ada setujui/tolak dokumen, alasan, atau minta unggah ulang; tak ada notifikasi saat jamaah melengkapi tahap 2 (hanya 3 tipe notifikasi: intake, agen, penarikan, `notificationMeta.ts`) | Status per dokumen + notif | Status dokumen + notifikasi "data dilengkapi" | M |
| ADM-023 | P2 | G | Verifikasi massal | `PaymentTable.tsx:43`: satu per satu, tanpa bulk, tanpa cari, tanpa kolom diverifikasi oleh/kapan; owner tak diberi tahu saat CS mencatat pembayaran (tak ada tipe notifikasi) | Stripe: bulk + rekonsiliasi | Bulk verifikasi, kolom verifier, notifikasi | M |
| ADM-024 | P2 | G | Pengingat H-30 dan belum DP | Hanya di `JamaahFinance.tsx:110-123,260` yang owner-only (menu `AdminLayout.tsx:85`); satu per satu lewat `wa.me`, tanpa log terkirim, tanpa pengingat belum DP | HubSpot sequences | Pindah ke Data Jamaah, log terkirim, template + antrean | M |
| ADM-025 | P2 | B | Daftar Data Jamaah | `Jamaah.tsx:341-400`: tak ada sort kolom, seleksi/bulk, visibilitas kolom, tombol WA per baris; filter dan pencarian tidak di URL (hanya `paket`, `cari` terbaca sekali) | Airtable views | Sort, bulk WA/ekspor, query string | M |
| ADM-026 | P2 | B | URL state | Hanya 3 halaman memakai `useSearchParams` (AgentManagement, Jamaah, JamaahIntake) | Link bisa dibagikan | Tab dan filter ke query string | M |
| ADM-027 | P2 | H | Data tumbuh tanpa paginasi | `useJamaah.ts:133` memuat semua registrasi+pembayaran sekaligus (576/557 baris sekarang) untuk Semua Jamaah dan Laporan; Intake 200, CalculatorLeads 1000 (`:63`), WA inbox 500 (`:53`) dipotong tanpa pemberitahuan; JamaahAll satu-satunya yang berpaginasi | Paginasi server | Pagination server untuk jamaah_registrations, jamaah_payments, leads | L |
| ADM-028 | P2 | G | Duplikat jamaah | Hanya intake (nama persis, satu paket) `JamaahIntake.tsx:41`; "Tambah Jamaah" tanpa peringatan; `import_jamaah_rows` melewati nama sama diam-diam (mungkin dua orang berbeda); tak cek NIK/paspor/telepon | Deteksi duplikat berbasis ID | Cek NIK/paspor/telepon + peringatan | M |
| ADM-029 | P2 | G | Ekspor keberangkatan | `jamaahExcel.ts:81-84` sheet Keuangan + Manifest generik; tak ada format Siskopatuh/visa/rooming list/bus (format tujuan tidak diverifikasi) | Template per otoritas | Template ekspor sesuai kebutuhan Siskopatuh dan rooming | M |
| ADM-030 | P2 | G | Dua jalur komisi | `log_agent_sale` (manual, `AgentManagement.tsx:228`) menambah saldo; `sync_registration_commission` (otomatis saat lunas) juga | Satu sumber kebenaran | Kunci jalur manual atau tautkan ke registrasi | S |
| ADM-031 | P2 | F | Calculator Leads untuk product_admin | Menu `AdminLayout.tsx:92`; `umroh_calculator_leads` tak punya policy product_admin (kosong diam-diam) | idem ADM-008 | Cabut role dari menu atau beri policy | S |
| ADM-032 | P2 | F | Redirect SEO untuk content_admin | `redirects` hanya admin; SEO menu content_admin | idem | Policy | S |
| ADM-033 | P2 | F | AdSpend untuk advertiser | membaca `umroh_calculator_leads` tanpa akses advertiser (`AdSpend.tsx`) | idem | Policy atau sembunyikan metrik | S |
| ADM-034 | P2 | F | Form paket mode "lihat" | `PackageForm.tsx` tak memakai `canEditPackages` (hanya `Packages.tsx:108`); guard rute izinkan prefix `/admin/packages/` untuk product_contributor; gagal baru di RLS | Read-only nyata | Form read-only untuk contributor | S |
| ADM-035 | P2 | F | Multi-role | `user_roles` UNIQUE(user_id, role) mengizinkan banyak baris; `useAuth.tsx:41` dan `Auth.tsx:90` `maybeSingle()` galat jika >1 baris, jadi Access Denied; `manage-team` PUT mengubah semua baris | Role tunggal tegas atau array | Constraint UNIQUE(user_id) atau dukung array | S |
| ADM-036 | P2 | F | Hak baca kolom sensitif | `authenticated` punya SELECT `packages.cogs_data`; baris published terbaca semua login (agen ikut); `cogs_defaults` terbaca semua role selain 'user'. Saat ini `cogs_data` kosong di prod (0 baris), jadi belum bocor | Least privilege | Revoke kolom dari `authenticated`, kecuali staf produk | S |
| ADM-037 | P2 | D | Palet mentah | 705 kelas di 38 berkas (Cogs 176, Dashboard 75, AdminHeader 45, AdminLayout 39) vs agen 8 | Token DESIGN.md | Ganti ke token; mulai dari layout | L |
| ADM-038 | P2 | D | Teks <12px | 72 kemunculan di 10 berkas (Cogs 39, Brochure 17, AdminLayout `text-[10px]` label grup dan peran) | DESIGN: minimal 12 | Naikkan ke 12 | S |
| ADM-039 | P2 | D | PageHeader tidak ada | Tak ada komponen di admin; h1 punya 8 varian (`font-black` x5, `text-2xl` x3, ...); DESIGN menyebut `PageHeader` di `admin/jamaah/` tetapi berkas tidak ada | Satu komponen | Buat `PageHeader`, ganti 38 h1 | M |
| ADM-040 | P2 | D | Status badge | `StatusBadge` hanya di 3 berkas admin; jamaah memakai `Badge` + kelas (`Jamaah.tsx:498`) tanpa ikon; DESIGN: ikon + teks | Satu pil status | Pakai `StatusBadge` | M |
| ADM-041 | P2 | B | Loading/kosong/galat | Skeleton di 5 halaman, `LoadError` di 4, `EmptyState` di 2; sisanya spinner `min-h-screen` di dalam layout (Dashboard, SEO, MarketingSettings) | Skeleton + retry | Pola seragam | M |
| ADM-042 | P2 | B | Tabel di ponsel | 3 dari 20 halaman bertabel punya fallback kartu (Jamaah, JamaahAll, PaymentTable); sisanya gulir horizontal; 8 `<table>` native | PRODUCT: tabel jadi kartu | Responsif per tabel | L |
| ADM-043 | P2 | B | Form | Hanya PackageForm yang punya penjaga perubahan belum disimpan (`beforeunload` + `window.confirm`, `PackageForm.tsx:515,1029`) dan itu tidak menjaga klik sidebar; validasi zod hanya di 5 halaman; dua sistem toast (sonner 40 berkas, use-toast 10) | Penjaga navigasi (`useBlocker`) | Hook bersama | M |
| ADM-044 | P2 | B | Format tanggal/zona | 6 tanggal tampil tanpa locale (`Packages.tsx:600`, `ProductDevelopment.tsx:63,137`, `Articles.tsx:236`, `Team.tsx:325`, `ImportWorkbookDialog.tsx:37`) jadi "Oct"; hanya `todayIso` memakai Asia/Jakarta; `Dashboard.tsx:57` memakai tanggal UTC | Bahasa Indonesia, WIB | Helper tanggal tunggal | S |
| ADM-045 | P2 | E | Tombol ikon tanpa nama | ~53 dari 74 tombol ikon tanpa `aria-label`/`title`, mis. `FAQ.tsx:356`, `Testimonials.tsx:461`, `Equipment.tsx:83`, `Team.tsx:334`, `JadwalKeberangkatan.tsx:142` | WCAG 4.1.2 | aria-label | M |
| ADM-046 | P2 | E | Label | 75 dari 165 `<Label>` tanpa `htmlFor` (Gamification 22); input pencarian hanya 1 `aria-label` (estimasi regex) | WCAG 1.3.1 | Hubungkan label | M |
| ADM-047 | P2 | E | Sentuh <44 | Item sidebar 32px (`sidebar.tsx:424`), ikon rail 32, tombol `h-8 w-8` menimpa aturan coarse (Equipment, Gallery), RoundButton notifikasi 28px | DESIGN: 44 sentuh | Hapus override | S |
| ADM-048 | P3 | A | Skip link dan fokus | Tak ada skip-to-content; sidebar mendahului main | WCAG 2.4.1 | Tambah skip link | S |
| ADM-049 | P3 | D | Emoji sebagai ikon | Avatar emoji default 😎 (`AdminLayout.tsx:190`, `Profile.tsx:28`), 👑 di Dashboard (`:329`) | DESIGN: ikon bersama teks | Inisial berwarna seperti agen | S |
| ADM-050 | P3 | C | Label peran | `AdminLayout.tsx:287-289` tampilkan `product admin`, `superadmin` mentah; Team tak menjelaskan akses tiap role (`Team.tsx:20-29`, "Super Admin (Full Access)") | Deskripsi izin | Label Indonesia + ringkasan akses | S |
| ADM-051 | P3 | D | Format uang | `rupiah()` 58 pemakaian, `formatCurrency` 4, salinan lokal (`SalesCalculator.tsx:41`, `PackageBrochure.tsx:35`, `PackageChangeLog.tsx:95`), `Rp ${...}` ad hoc di Bulk upload, ExpandedDetails, PackageForm, Dashboard | Satu helper `Rp 1.250.000` | Pakai `rupiah()` | S |
| ADM-052 | P3 | B | Rute | `/admin/brochure/:slug` yatim (tak ada tautan) dan tertolak guard bagi semua role; "Tambah Paket" ke `/packages/add` sedangkan rute `/new` (form menangani keduanya, `PackageForm.tsx:448`) | Rute konsisten | Rapikan | S |
| ADM-053 | P3 | B | Sync seat | `Packages.tsx:256` `window.location.reload()` setelah 1,5 detik; label "Syncing..." Inggris; dua sumber seat (Sheet/website) per paket | Invalidate query | `invalidateQueries`; terjemahkan | S |
| ADM-054 | P3 | H | `select('*')` | `Packages.tsx:224` (semua kolom termasuk cogs_data/itinerary), `AgentManagement.tsx:111` (`agents` termasuk data bank/KTP), notifikasi 200 baris | Kolom seperlunya | Pilih kolom | S |
| ADM-055 | P3 | B | Template URL | `URLTemplateManager` menyimpan di `localStorage` per browser (`urlTemplateManager.ts:31`) | Data bersama | Pindah ke database | M |

### 2a. Shell admin vs portal agen (keluhan owner)

| Aspek | Admin | Agen |
|---|---|---|
| Sidebar | `collapsible="icon"`, default tertutup, 16rem | offcanvas, default terbuka di ≥1024px (`AgentLayout.tsx:102`) |
| Tombol collapse | Ada di header sidebar (28px); tidak ada di mobile | Tidak ada tombol saat terbuka di desktop (hanya Ctrl/Cmd+B); tombol "Expand" di header saat tertutup; hamburger di mobile |
| Header | Breadcrumb + search palsu | Logo mobile + avatar level |
| Kerangka konten | Putih penuh | `bg-muted` + panel `rounded-3xl` berbingkai |
| Judul halaman | h1 manual, 8 varian | `AgentPageHeader` |
| Kartu angka | `Card` shadcn / `StatCard` jamaah | `AgentStatCard` |
| Warna | slate mentah (705) | token (8) |
| Bahasa | "Back to Website", "Log Out" | "Keluar" |
| Keluar | hanya saat sidebar terbuka | selalu di footer |
| Avatar | emoji | inisial berwarna level |

## 3. Matriks role

Metode: peran `superadmin` dan `product_admin` diuji langsung di database prod (transaksi `BEGIN READ ONLY` yang selalu di-abort, impersonasi `authenticated` + JWT claims, `SELECT count(*)`), `(none)` = pengguna tanpa role. Role lain (admin, content_admin, agent_admin, advertiser, sales, cs_admin, product_contributor) tidak punya user di prod; kolom ini dibaca dari `pg_policies` live (storage + public), tidak dijalankan. Skrip dan hasil: `scratchpad/audit-admin/matrix_ro.sql`, `matrix_ro_raw.txt`.

Hasil live ringkas (angka = baris terlihat; baris sebenarnya di kurung): superadmin: jamaah_registrations 576, jamaah_payments 557, jamaah_audit_log 3051, agents 10, whatsapp_clicks 875, **admin_notifications 0 (6)**, `site_events` 42501 (halaman memakai RPC). product_admin: packages 34, hotels 30, package_change_log 67, cogs_defaults 1; jamaah_* 0, marketing_settings 0, whatsapp_clicks 0 (875), agents 1 (barisnya sendiri), admin_notifications 0.

| Menu | Rute | Role di menu | Hasil RLS/halaman | Mismatch |
|---|---|---|---|---|
| Dashboard | `/admin` | admin, superadmin, product_admin, product_contributor, content_admin, agent_admin, cs_admin (sales, advertiser lewat guard `/admin`) | Halaman memblokir selain admin/superadmin; query agents hanya admin, whatsapp_clicks hanya admin/advertiser/sales | **Rusak untuk 7 role** (ADM-001) |
| Notifikasi (bell) | footer | semua | SELECT/UPDATE literal `admin` | **Rusak untuk superadmin (live) dan cs_admin** (ADM-003) |
| Data Jamaah, Semua, Masuk | `/admin/jamaah*` | admin, superadmin, cs_admin | registrations, groups, payments, intakes, audit, packages, RPC `list_agent_options`, storage jamaah-docs: admin dan cs_admin OK (superadmin live OK) | Tidak ada. product_admin 0 baris, sesuai |
| Verifikasi Pembayaran | `/admin/jamaah/pembayaran` | admin, superadmin, cs_admin | cs_admin hanya UPDATE status pending, hapus miliknya; verifikasi owner | OK (ADM-005 soal limit) |
| Laporan Keuangan | `/admin/jamaah/keuangan` | admin, superadmin | OK; guard prefix membolehkan cs_admin membuka rute, ditahan cek `isOwner` | OK |
| WhatsApp Inbox | `/admin/whatsapp-inbox` | admin, superadmin, sales | sales SELECT/UPDATE clicks, SELECT/INSERT conversions | OK |
| Calculator Leads | `/admin/calculator-leads` | admin, superadmin, product_admin, sales | product_admin tanpa policy | **product_admin kosong** (ADM-031) |
| Paket, Product Development, Jadwal, Kalkulator Harga | `/admin/packages...` | admin, superadmin, product_admin, product_contributor (Jadwal/Kalkulator tanpa contributor) | packages OK; contributor SELECT saja; form tak read-only | Minor (ADM-034) |
| Hotel, Fasilitas Paket, Perlengkapan | | admin, superadmin, product_admin | tabel + bucket package-images OK | OK |
| Master COGS | `/admin/master-cogs` | admin, superadmin, product_admin | baca OK (live S1), tulis hanya literal `admin` | **Simpan gagal untuk superadmin dan product_admin** (ADM-006) |
| Hero, Gallery, Testimoni | | admin, superadmin, content_admin | tabel OK; upload ke `package-images` ditolak untuk content_admin | **Upload content_admin gagal** (ADM-007) |
| Selling Points, Artikel, FAQ | | idem | OK; artikel pakai `article-images` OK | OK |
| SEO | `/admin/seo` | admin, superadmin, content_admin | page_seo, seo_settings OK; redirects hanya admin | **Sebagian** (ADM-032) |
| Flyer Generator | | content_admin | packages hanya published terlihat | Parsial (draft tak terlihat) |
| Kelola Agent, Gamification | | admin, superadmin, agent_admin | agents, withdrawals, sales, agent_* OK; RPC withdrawal OK; fungsi `admin-update-password` hanya admin/superadmin | Minor: reset password agen gagal untuk agent_admin |
| Analytics | | admin, superadmin, advertiser | RPC mengizinkan has_role admin atau advertiser | OK |
| Marketing Settings, URL Shortener | | admin, superadmin, advertiser | OK | OK |
| Ad Spend | | idem | campaign_spend OK; leads tanpa akses advertiser | Parsial (ADM-033) |
| Chat Rotation | | idem | whatsapp_cs tulis hanya admin | **Tulis gagal** (ADM-008) |
| Website Settings, Team | | admin, superadmin | OK; manage-team cek admin/superadmin | OK |

Over-permission: `authenticated` punya SELECT kolom `packages.cogs_data` dan `agent_commission_amount` (agen ikut bisa baca baris published; `cogs_data` saat ini kosong) dan `cogs_defaults` terbaca semua role staf selain 'user' (ADM-036). Live: pengguna tanpa role melihat 33 paket published, 0 cogs_defaults.

## 4. Hitungan

- Rute admin: 41 anak `/admin` + `/admin/setup`; 38 halaman di `src/pages/admin`; 82 berkas admin diukur.
- String Inggris: ~192 kemunculan (98 unik) di 32 berkas (heuristik kata Inggris pada JSX, atribut, toast; kemungkinan undercount); terbanyak GalleryManagement 27, Testimonials 25, SEO 19, FAQ 18, SellingPoints 17, Gamification 14, HeroSection 12, WebsiteSettings 10. Tambahan: 17 label menu Inggris (Dashboard, Hero Section, Selling Points, Testimonials, Gallery, Product Development, WhatsApp Inbox, Calculator Leads, Gamification, Flyer Generator, Analytics, Marketing Settings, Ad Spend, Chat Rotation, URL Shortener, Website Settings, Team), 6 judul grup (SALES & OPERATIONS, PRODUCTS & SERVICES, TOOLS & FINANCE, WEBSITE & CONTENT, MARKETING & AGENTS, SETTINGS), dan 8 string layout ("Back to Website", "Log Out", "Main Menu", "Search anything...", "Access Denied", "Loading...", "Expand Sidebar", "Toggle Sidebar"). Istilah campur: "Agent" vs "agen" (menu "Kelola Agent").
- Kelas palet mentah: 705 di 38 berkas (CogsCalculator 176, Dashboard 75, AdminHeader 45, AdminLayout 39, Team 31, Packages 30). Agen: 8.
- Teks <12px: 72 di 10 berkas (`text-[10px]` 42).
- Warna hex: 48 di 5 berkas (Cogs 27, flyer 15 yang sah sebagai artwork, Analytics 5, AdminLayout 1).
- `window.confirm`/`confirm()`: 13 (Testimonials:159, FAQ:108, ChatRotation:221, GalleryManagement:188, Gamification:590/781/982, Equipment:176, PackageItems:216, SellingPoints:106, AgentManagement:296, PaymentTable:58, PackageForm:1029); `prompt()`: 1 (`RichTextEditor.tsx:70`); `alert()`: 0.
- `<table>` native: 8 (AdSpend x2, WhatsAppInbox, GalleryManagement, CalculatorLeads, FlyerPreview, CogsCalculator, BulkFlyerUpload). `<button>` mentah: 25 di 16 berkas.
- Tombol ikon tanpa aria-label/title/sr-only: ~53 dari 74 terdeteksi (heuristik, empat belas titik dicek manual).
- Gambar tanpa alt: 1 (`SinglePackageFlyer.tsx:93`).
- Radius di luar skala: tidak ada (peta Tailwind lg=12, md=8, sm=6 sesuai DESIGN).
- Bundle admin (`dist/assets/js`, byte mentah): ArticleForm 381 KB, PackageForm 311 KB, ChatRotation 84 KB, Jamaah 58 KB, Packages 57 KB, xlsx 412 KB (chunk terpisah); total JS 3,6 MB di 150 berkas. `AdminLayout` dimuat eager di bundle utama.

## 5. Yang sudah baik

- Data Jamaah/Semua Jamaah/PaymentTable: kartu di ponsel, kelompok keluarga, status dengan teks, ekspor Excel dengan sheet Manifest, target sentuh 44, LoadError yang membedakan "gagal" dari "kosong".
- Audit trail jamaah (`jamaah_audit_log`, 3051 baris, tampil di RegistrationSheet dengan pelaku) dan riwayat perubahan paket (`package_change_log`, wajib alasan untuk paket Final).
- Intake: tanda duplikat nama, cek seat, tolak wajib beralasan, pesan WA siap kirim berisi rekening PT dan link manifest, deep link `?intake=` dari notifikasi.
- Hapus jamaah: hanya owner, wajib ketik nama, RPC menolak jika ada pembayaran.
- Komisi otomatis saat lunas (`sync_registration_commission`) dan pembalikan otomatis.
- Pengelolaan agen: StatusBadge, ConfirmDialog, badge penarikan, tombol kabari WhatsApp saat disetujui.
- Notifikasi: pengelompokan, arsip, mute per jenis, tab, toast gabungan.
- Komponen dasar sudah mengikuti DESIGN.md (tinggi 44 pada pointer kasar, status-badge, empty-state, confirm-dialog), tinggal dipakai merata.

## 6. Yang tidak dapat diverifikasi

- Role selain superadmin dan product_admin diuji lewat teks policy saja. Percobaan awal dengan baris `user_roles` sementara dan UPDATE no-op (di-abort) ditolak oleh permission classifier, jadi tidak dijalankan; tulis ke `cogs_defaults`, upload storage content_admin, dan write ChatRotation advertiser adalah inferensi dari policy.
- Kegagalan URL 300 id di `JamaahPayments` adalah inferensi dari komentar `useJamaah.ts:79`; tidak dipanggil.
- Akses anonim ke `sync-seats` tidak dicoba (hanya config dan kode).
- Hitungan Inggris, ikon tanpa label, dan Label tanpa htmlFor berbasis heuristik regex.
- Format ekspor Siskopatuh/visa yang dibutuhkan tidak diketahui; tidak ada pengujian di browser/ponsel sungguhan.
