# Audit 06: Admin (cek ulang CS dan owner)

Tanggal: 2026-10-08. Pembanding: `docs/audit/01-admin.md` (2026-10-06, ADM-001..055). Cakupan: `src/pages/admin` (40 halaman), `src/components/admin`, `src/components/shell`, `src/hooks`, 44 rute anak `/admin`, edge function `manage-team`, `admin-update-password`, `sync-seats`, dan database live. Source tidak diubah. Database hanya dipakai lewat transaksi yang selalu di-abort (`tests/db/11_admin_recheck.sql`) dan SELECT biasa. Selama audit agen lain mengubah working tree (migrasi `20261008100000_levels_silver_start`, `20261008105000_role_finance`, `20261008110000_commission_lifecycle`, belum di-push). Temuan di sini mengacu ke kondisi live, bukan ke migrasi tertunda itu, kecuali disebut.

## 1. Ringkasan

1. Semua P0 audit pertama beres: peran non-owner mendarat di halaman pertamanya (`adminMenu.ts` `getAdminHomePath`, `Dashboard.tsx:424-435`), menu ponsel punya tombol buka (`ShellHeader.tsx`, "Buka menu"), lonceng terlihat oleh superadmin, admin, agent_admin, cs_admin (live: 6 dari 6 notifikasi), tautan notifikasi agen menuju `/admin/agents` (live 5 baris).
2. Dari 55 temuan lama: 13 Fixed, 15 Partially, 27 Open (5 menunggu keputusan pemilik). Temuan baru ADM-101..117: 0 P0, 3 P1, 7 P2, 7 P3.
3. Shell admin dan agen kini satu komponen (`AppShell`): sidebar bisa ciut dan diingat (cookie), tombol bertooltip, Ctrl/Cmd+K, judul tab per rute, lonceng di header. Belum: badge antrean, kembali ke URL tujuan setelah login (diuji di browser: `/admin/jamaah` tanpa login berakhir di `/auth` tanpa `from`), skip link.
4. Bahasa dan konfirmasi hampir selesai: `confirm()` 13 jadi 0, `prompt()` 1 jadi 0, string Inggris (heuristik sama) 278 jadi 54, semua menu dan judul grup Indonesia.
5. Matriks peran live (10 peran x 56 tabel, 14 pemanggilan fungsi, 28 policy storage): menu terlihat tetapi data terblokir di 3 halaman (Prospek Kalkulator untuk product_admin, Biaya Iklan untuk advertiser, tab Redirect SEO untuk content_admin) dan 1 tombol (reset password agen untuk agent_admin).
6. Over-permission terberat ada di tulis uang: `agent_admin` dan owner bisa mengubah `agents.available_balance`, `total_commission`, `level`, `status` langsung lewat API (diuji: 1 baris berubah), dan hapus agen ikut menghapus `agent_sales` dan `agent_withdrawals` (FK CASCADE). Tidak ada ledger.
7. Alur komisi belum sesuai SOP dan jawaban kak Virna: komisi masuk saldo yang bisa ditarik begitu jamaah lunas (`20261007100000_commission_rates.sql:295-350`), diproses satu orang (`process_agent_withdrawal`: admin ATAU agent_admin), tanpa PPh 5%, cek NIK, bukti transfer, dua persetujuan, atau kolom pencatat pembayar (`processed_by` tidak ada).
8. Dashboard owner tidak berubah: tidak ada antrean uang atau tindakan hari ini (ADM-011 Open). CS (Laily) tetap tanpa pengingat H-45/H-35/H-30, tanpa catatan "WA sudah dikirim", tanpa verifikasi massal.
9. `SYNC_SEATS_SECRET` tidak ada di daftar secret produksi (hanya nama yang dibaca) dan dua cron (`daily-seat-sync`, `sync-seats-5min`) tidak mengirim `x-sync-secret`, jadi `sync-seats` praktis masih terbuka.
10. Tes baru `tests/db/11_admin_recheck.sql`: PASS=130 FAIL=0 SKIP=2 KNOWN=14 terhadap database live. Bila dijalankan lewat `run-db-tests.sh` bersama migrasi tertunda agen lain, tes ini sengaja memberi 1 FAIL (`commission_net` bisa dipanggil anon) dan KNOWN ADM-117 (fungsi baru belum ditinjau).

| Area | Skor 01 | Skor 06 | Catatan |
|---|---|---|---|
| A Shell | 1 | 4 | Mobile trigger, state, Ctrl+K, judul tab, tooltip beres; kurang badge antrean, return-to-URL, skip link, pencarian jamaah/agen |
| B Pola halaman | 2 | 3 | Verifikasi Pembayaran paginasi+cari+LoadError, 13 ConfirmDialog; URL state dan kartu ponsel tabel masih minim |
| C Bahasa | 1 | 4 | Menu/grup/toast Indonesia; sisa string Inggris di beberapa form dan pesan galat RPC |
| D Design system | 1 | 2 | Palet 711 jadi 669; tidak ada `PageHeader`; h1 masih 8 varian; teks <12px 72 jadi 69 |
| E Aksesibilitas | 2 | 3 | Sidebar 44px, tooltip, label tombol shell; tombol ikon tanpa nama 31 jadi 27, Label tanpa htmlFor tetap 75 |
| F Role matrix | 2 | 3 | P1 lama beres (cogs, upload, chat); tersisa 031/032/033, over-read COGS (105), tulis saldo (102) |
| G Journey | 2 | 3 | Landing, deep link notifikasi, halaman agen/komisi/lead ada; DP+manifest, pengingat, siklus komisi belum |
| H Performa | 3 | 3 | Verifikasi Pembayaran server-side; Semua Jamaah masih memuat semua baris (576 + 557) |

Jumlah skor 14 jadi 25 (maksimum 40), naik 11 poin. Tidak ada P0 baru.

## 2. Status ADM-001..055

Kolom Pemilik = butuh keputusan pemilik (bagian 7).

| ID | Sev | Status | Bukti (kode, commit, database) | Pemilik |
|---|---|---|---|---|
| ADM-001 | P0 | Fixed | `adminMenu.ts` `getAdminHomePath`; `Dashboard.tsx:424-435` mengarahkan non-owner; commit af0bf55 | |
| ADM-002 | P0 | Fixed | `ShellHeader.tsx` tombol "Buka menu" (md:hidden) | |
| ADM-003 | P0 | Partially | Live: SA, AD, AG, CS membaca 6 dari 6 (matriks `admin_notifications`); klien masih menelan galat jadi `[]` (`useAdminNotifications.tsx:43-46`) | |
| ADM-004 | P1 | Fixed | `20261006140000_p0_fixes.sql:17`; live 5 baris `/admin/agents`, 1 baris `/admin/jamaah/masuk` | |
| ADM-005 | P1 | Fixed | `JamaahPayments.tsx:42-60` range 50 + relasi tertanam (tanpa `.in` 300 id) + cari nama + `LoadError`; kurang filter tanggal | |
| ADM-006 | P1 | Fixed | Live: SA, AD, PA `rUID` di `cogs_defaults`; tes 05 | |
| ADM-007 | P1 | Fixed | Live: policy "content_admin can upload site images to package-images" (INSERT, folder hero/gallery/testimonials); tes 05 | |
| ADM-008 | P1 | Fixed | Live: AV `rUID` di `whatsapp_cs`; tes 05 | |
| ADM-009 | P1 | Partially | Satu `AppShell` untuk admin dan agen (`AdminLayout.tsx`, `AgentLayout.tsx`); isi halaman admin masih palet mentah (669), h1 8 varian, tanpa `PageHeader` | |
| ADM-010 | P1 | Fixed | `sidebarState.ts` membaca cookie `sidebar:state`; `ShellSidebar.tsx:60-74` tombol bertooltip "(Ctrl+B)"; Keluar di footer (`:178`) | |
| ADM-011 | P1 | Open | `Dashboard.tsx` tidak berubah selain redirect: kartu paket/wisata/artikel/klik WA, "Connected" statis, "Jalankan Migrasi" tanpa konfirmasi, fallback seat `\|\| 45` | |
| ADM-012 | P1 | Partially | `manage-team/index.ts:180-230` hanya hapus `user_roles`, jaga superadmin terakhir; `Team.tsx:439-454` ConfirmDialog (ketik nama untuk superadmin); belum ada log perubahan role | |
| ADM-013 | P1 | Partially | `sync-seats/index.ts:57-86` cek secret hanya bila env ada; `supabase secrets list`: tidak ada `SYNC_SEATS_SECRET`; `cron.job`: kedua job tanpa `x-sync-secret` (yang 5 menit tanpa header sama sekali). Endpoint live tidak dipanggil | Ya |
| ADM-014 | P1 | Partially | `JamaahIntake.tsx:50-62, 330-355` salin link + "Kirim info DP" di tab Diterima; setelah Terima hanya toast (`:99-100`), tanpa `wa_sent_at`, tolak tidak mengabari (`:187`), `useJamaahIntake.ts:54` limit 200 | |
| ADM-015 | P1 | Partially | String Inggris 278 jadi 54 (banyak `console.error`); sisa: `ProductDevelopment` 7, `HotelForm` 4, "Weight Pool", "Edit URL Template"; pesan RPC Inggris (ADM-112) | |
| ADM-016 | P1 | Fixed | `confirm(` 13 jadi 0, `prompt(` 1 jadi 0; berkas pemakai `ConfirmDialog` 1 jadi 13; hapus pembayaran/superadmin pakai ketik nama (`PaymentTable.tsx:204-213`, `Team.tsx:454`) | |
| ADM-017 | P2 | Partially | `ShellCommandPalette.tsx` Ctrl/Cmd+K hanya menu halaman, tidak mencari jamaah, paket, agen | Ya |
| ADM-018 | P2 | Fixed | Judul dari peta menu (`navMatch.ts:31-39`); breadcrumb diganti judul | |
| ADM-019 | P2 | Fixed | `AppShell.tsx:91-93` Helmet `"<judul> - Admin Musafar Tour"` untuk semua rute admin | |
| ADM-020 | P2 | Open | Browser: `/admin/jamaah?v=61` tanpa login menjadi `/auth` tanpa `from`; `Auth.tsx:125` selalu `/admin`; `AdminLayout.tsx:89` tolak diam-diam ke `/admin` | |
| ADM-021 | P2 | Open | `ShellSidebar.tsx`/`types.ts` tidak punya badge; padahal `useNewIntakeCount` dan `pendingCount` ada | |
| ADM-022 | P2 | Open | Belum ada setuju/tolak per dokumen, minta unggah ulang; tak ada notifikasi "data dilengkapi" (`notificationMeta.ts` 3 tipe) | |
| ADM-023 | P2 | Open | `PaymentTable.tsx` satu per satu, tanpa bulk; DB menyimpan `verified_by`/`verified_at` (557 baris terisi) tetapi UI tidak menampilkan; tak ada notifikasi ke owner saat CS mencatat | |
| ADM-024 | P2 | Open | Pengingat tetap di `JamaahFinance.tsx:109-123` (menu Laporan Keuangan hanya owner), manual lewat wa.me, tanpa log | Ya |
| ADM-025 | P2 | Open | `Jamaah.tsx` tanpa sort kolom, bulk, WA per baris; filter tidak di URL | |
| ADM-026 | P2 | Open | `useSearchParams` tetap di 3 berkas (AgentManagement, Jamaah, JamaahIntake) | |
| ADM-027 | P2 | Partially | `useJamaah.ts:117-129` `readAll` 1000 per halaman (tidak terpotong, tetapi memuat semua); Verifikasi paginasi; sisa: Intake 200, WA inbox 500, leads kalkulator 1000 tanpa pemberitahuan | |
| ADM-028 | P2 | Open | `import_jamaah_rows` masih mencocokkan `lower(btrim(full_name))` lalu melewatkan; tak ada cek NIK/paspor/telepon | |
| ADM-029 | P2 | Open | `jamaahExcel.ts:46-84` dua sheet (Keuangan, Manifest 29 kolom); tanpa rooming list, bus, laporan data kurang, validasi masa berlaku paspor | Ya |
| ADM-030 | P2 | Open | `AgentManagement.tsx` `logSaleMutation` tetap memanggil `log_agent_sale` (live: dapat dipanggil admin/agent_admin) sebagai jalur komisi kedua | Ya |
| ADM-031 | P2 | Open | Live: PA `00I0` di `umroh_calculator_leads` (tes 11 KNOWN); menu "Prospek Kalkulator" memuat product_admin | |
| ADM-032 | P2 | Open | Live: CA `r0X0` di `redirects` (baca saja); tes 11 KNOWN | |
| ADM-033 | P2 | Open | Live: AV `00I0` di `umroh_calculator_leads` yang dibaca `AdSpend.tsx`; tes 11 KNOWN | |
| ADM-034 | P2 | Fixed | `PackageForm.tsx:450,850,1507` `canEdit`, `fieldset disabled`, judul "Lihat paket" | |
| ADM-035 | P2 | Open | `user_roles_user_id_role_key UNIQUE (user_id, role)` tetap; `useAuth.tsx:41` `maybeSingle()`; peran di-cache 5 menit (`staleTime`) | |
| ADM-036 | P2 | Open | Live: `authenticated` punya SELECT `packages.cogs_data`, `cogs_status`, `agent_commission_amount` (anon sudah tertutup); `cogs_data` kosong; tes 11 KNOWN | |
| ADM-037 | P2 | Open | Palet mentah 711 jadi 669 (38 berkas; Cogs 139, Dashboard 60, ExpandedPackageDetails 27, AdminHeader 25) | |
| ADM-038 | P2 | Open | Teks <12px 72 jadi 69 (9 berkas) | |
| ADM-039 | P2 | Open | `PageHeader` 0 berkas; h1: `text-3xl font-bold` 16, `+tracking-tight` 8, `font-black` 5, `text-2xl` 3, lainnya | |
| ADM-040 | P2 | Partially | `StatusBadge` di 8 berkas (dari 6); `Badge`+kelas di Jamaah masih | |
| ADM-041 | P2 | Partially | Skeleton 8 berkas (6), `LoadError` 9 (6), `EmptyState` 4 (2); Dashboard, SEO, MarketingSettings tetap spinner penuh | |
| ADM-042 | P2 | Partially | Kartu ponsel di 5 dari 31 berkas bertabel (WithdrawalsPanel, PaymentTable, AgentCommissions, Jamaah, JamaahAll); sebelumnya 4 dari 29. `AgentLeads` hanya gulir horizontal | |
| ADM-043 | P2 | Partially | `window.confirm` dihapus; hanya `PackageForm.tsx:518` `beforeunload`; tak ada `useBlocker` untuk klik sidebar | |
| ADM-044 | P2 | Open | `toISOString().split/slice` 10 tempat, `toLocaleString()` tanpa locale 1, date-fns tanpa locale 4 (tidak berubah) | |
| ADM-045 | P2 | Partially | Skrip yang sama di kedua snapshot: tombol ikon tanpa nama 31 dari 49 jadi 27 dari 50 | |
| ADM-046 | P2 | Open | `<Label>` tanpa `htmlFor` 75 dari 170 (75/165); Input/Textarea tanpa id/aria-label 85 jadi 87 | |
| ADM-047 | P2 | Partially | Sidebar `h-10`/`h-11` kasar, rail 44 (`ShellSidebar.tsx:30`); `h-8 w-8` di berkas admin 41 jadi 39; RoundButton lonceng masih 28px | |
| ADM-048 | P3 | Open | Tidak ada skip link di `src/components/shell` | |
| ADM-049 | P3 | Open | Emoji 88 (18 berkas) jadi 87 (17): avatar default 😎 `Profile.tsx:28`, 👑 `Dashboard.tsx:320`, bintang hotel, ikon brosur | |
| ADM-050 | P3 | Fixed | `AdminLayout.tsx:14-24` `ROLE_LABELS`; `Team.tsx:19-26` opsi role berisi penjelasan akses | |
| ADM-051 | P3 | Open | `rupiah()` 61 jadi 63 pemakaian, `formatCurrency` 6, `Rp` ad hoc 32 | |
| ADM-052 | P3 | Open | `App.tsx:565` rute `brochure/:slug` yatim; `Packages.tsx:417` masih ke `/packages/add` (alias `PackageForm.tsx:451`) | |
| ADM-053 | P3 | Partially | `Packages.tsx:256` `window.location.reload()` tetap; label sudah Indonesia | |
| ADM-054 | P3 | Open | `select('*')` 35 jadi 34 di berkas admin; `AgentManagement.tsx:112,131` (agents termasuk rekening dan NIK; penarikan tanpa batas), `JamaahFinance.tsx:47` semua registrasi | |
| ADM-055 | P3 | Open | `urlTemplateManager.ts:31,43` masih `localStorage` | |

Hitungan: Fixed 13 (001, 002, 004, 005, 006, 007, 008, 010, 016, 018, 019, 034, 050), Partially 15 (003, 009, 012, 013, 014, 015, 017, 027, 040, 041, 042, 043, 045, 047, 053), Open 27. Butuh keputusan pemilik: 013, 017, 024, 029, 030.

## 3. Matriks peran

Metode: tes `tests/db/11_admin_recheck.sql` membuat satu pengguna per peran di dalam transaksi (production hanya punya 3 superadmin dan 1 product_admin), memakai `SET LOCAL ROLE authenticated` dan JWT claims, lalu mencoba SELECT, UPDATE, INSERT, DELETE pada satu baris nyata tiap tabel (baris ditanam bila kosong), memanggil fungsi, dan membaca policy storage. Semua di-abort. Singkatan peran: SA superadmin, AD admin, PA product_admin, PC product_contributor, CA content_admin, AG agent_admin, AV advertiser, SL sales, CS cs_admin, NO tanpa peran. Kode sel: r baca, 0 tidak ada baris, X ditolak; U/I/D izin ubah/tambah/hapus.

### 3a. Menu x peran (bisa dibuka, data bisa dibaca/ditulis)

Rute dijaga `AdminLayout.tsx` `isPathAllowed` (menu + prefix) dan `getAdminHomePath`; peran yang bukan di daftar menu dialihkan ke `/admin`. Hasil data dari matriks live.

| Menu (rute) | Peran di menu | Tabel, RPC, fungsi yang dipakai | Hasil live | Ketidakcocokan |
|---|---|---|---|---|
| Dashboard `/admin` | owner (non-owner dialihkan) | packages, wisata_halal, articles, whatsapp_clicks, agents, fn migrate-package-slugs | OK untuk SA/AD | Isi tidak operasional (ADM-011) |
| Data Jamaah, Semua, Masuk | AD, SA, CS | jamaah_registrations/groups/payments/intakes, audit_log, packages, RPC list_agent_options, accept/reject_jamaah_intake, import_jamaah_rows, delete_jamaah_registration, storage jamaah-docs | CS: baca+ubah+tambah registrasi, tidak hapus (owner); intake CS baca+ubah; fungsi pilih agen hanya SA/AD/CS | Tidak ada |
| Verifikasi Pembayaran | AD, SA, CS | jamaah_payments (trigger `jamaah_payments_guard`) | CS catat pending, edit pending sendiri, tidak verifikasi/tolak/ubah terverifikasi (42501); owner verifikasi; hapus terverifikasi ditolak untuk semua | Tidak ada |
| Laporan Keuangan | AD, SA | jamaah_payments, jamaah_registrations | OK | Tidak ada |
| Kotak Masuk WhatsApp | AD, SA, SL | whatsapp_clicks, whatsapp_conversions | SL `rUI0` clicks, `r0I0` conversions | Tidak ada |
| Prospek Kalkulator | AD, SA, PA, SL | umroh_calculator_leads | SL `rUID`; PA `00I0` | PA melihat halaman kosong (ADM-031) |
| Paket, Pengembangan Produk | AD, SA, PA, PC | packages, package_change_log, fn sync-itinerary, sync-seats | PA `rUID`; PC `r0X0`; log perubahan PA/PC baca | PC baca saja, form kini read-only (ADM-034 Fixed) |
| Hotel, Fasilitas, Perlengkapan, Jadwal | AD, SA, PA | hotels, package_items, equipment_items, packages, departure_schedules | PA `rUID` | Tidak ada |
| Kalkulator Harga, Master COGS | AD, SA, PA | packages, hotels, package_items, cogs_defaults | PA `rUID` | Tidak ada (tulis OK); baca cogs_defaults terbuka ke 6 peran lain (ADM-105) |
| Hero, Keunggulan, Testimoni, Galeri, Artikel, FAQ | AD, SA, CA | tabel masing-masing + storage package-images, article-images | CA `rUID`; upload folder hero/gallery/testimonials OK | Tidak ada |
| SEO | AD, SA, CA | page_seo, seo_settings, redirects | CA `rUID` pada page_seo/seo_settings, `r0X0` pada redirects | Tab Redirect gagal untuk CA (ADM-032) |
| Kelola Agen | AD, SA, AG | agents, agent_withdrawals, packages, RPC process_agent_withdrawal, log_agent_sale, fn admin-update-password, storage agent-documents | AG `rUID` agents; baca KTP OK (AD, AG); RPC proses penarikan SA/AD/AG | Tombol reset password gagal untuk AG (ADM-116); tulis saldo langsung (ADM-102) |
| Komisi Agen | AD, SA, AG | RPC admin_list/set/clear_commission_rate | SA/AD/AG baca+tulis; CS hanya baca (tanpa menu) | Lihat 3b |
| Lead Agen | AD, SA, AG, CS | RPC admin_agent_leads, agent_lead_followups | SA/AD/AG/CS OK | Tidak ada |
| Gamifikasi | AD, SA, AG | agent_badges, challenges, rewards, points | AG `rUID` | Tidak ada |
| Pembuat Flyer | AD, SA, CA | packages | CA hanya paket terbit (33 dari 34) | Draf tak terlihat (wajar) |
| Analitik | AD, SA, AV | RPC get_analytics_summary | SA/AD/AV OK, lainnya ditolak | Tidak ada |
| Pengaturan Pemasaran, Pemendek Tautan, Rotasi Chat | AD, SA, AV | marketing_settings, short_links, short_link_clicks, whatsapp_cs, whatsapp_clicks/conversions | AV `rUID` | Tidak ada (ADM-008 Fixed) |
| Biaya Iklan | AD, SA, AV | campaign_spend, umroh_calculator_leads, whatsapp_conversions | AV `rUID` spend, `r0X0` conversions, `00I0` leads | Hitungan lead kosong untuk AV (ADM-033) |
| Pengaturan Situs | AD, SA | website_settings | SA/AD `rUID`; lainnya baca saja | Tidak ada |
| Tim | AD, SA | fn manage-team, user_roles | SA/AD `rUID`; PA/CS tidak bisa menulis user_roles (tes: insert ditolak, update 0 baris) | Tidak ada |
| Profil `/admin/profile` | semua | auth user metadata | OK | Tidak ada |

### 3b. Over-permission (data atau fungsi terjangkau peran yang seharusnya tidak)

| # | Temuan | Bukti live | Peran |
|---|---|---|---|
| 1 | Tulis langsung kolom uang `agents` (available_balance, total_commission, total_sales, level, status) dan INSERT/DELETE agen | UPDATE oleh agent_admin: 1 baris berubah; privilege kolom UPDATE/INSERT untuk `authenticated` pada seluruh kolom agents | AG, SA, AD (ADM-102/103) |
| 2 | Baca `cogs_defaults` (basis HPP) | `r0X0` untuk PC, CA, AG, AV, SL, CS; policy "Staff can read cogs defaults" = ada baris di `user_roles` | 6 peran (ADM-105) |
| 3 | Kolom `packages.cogs_data`, `cogs_status`, `agent_commission_amount` | SELECT kolom oleh semua `authenticated` (agen termasuk) | Semua login (ADM-036) |
| 4 | agent_admin membaca semua notifikasi admin termasuk nama pendaftar jamaah | `admin_notifications` AG `rUX0`; notifikasi `jamaah_intake` berisi nama dan kode | AG (ADM-115) |
| 5 | cs_admin membaca seluruh 48 tarif komisi dan memanggil `admin_list_commission_rates` | CS `rXXX` di `agent_commission_rates`; menu Komisi Agen tak memuat CS | CS (keputusan pemilik) |
| 6 | `has_role(user_id, role)` dapat dipanggil anon dan authenticated untuk uuid siapa pun | `has_function_privilege('anon', ...)` true | anon (ADM-109) |
| 7 | `agent_levels` publik berisi persentase komisi lama 4,5 sampai 6 persen | anon membaca 4 dari 4 baris | anon (ADM-110) |
| 8 | Grant tabel: `authenticated` memegang SELECT/INSERT/UPDATE/DELETE di semua tabel publik; satu-satunya pagar adalah RLS | `role_table_grants` | Informasi, tak ada cacat selama RLS terjaga |

Bersih (dites): anon hanya membaca konten situs publik (18 tabel); user tanpa peran tidak membaca satu pun tabel jamaah, agen, uang; sales/advertiser/content_admin/product_contributor/agent_admin tidak membaca atau menulis jamaah_registrations, jamaah_payments, jamaah_audit_log, agent_withdrawals (selain AG), user_roles milik orang lain; CS tidak membaca `agents` (rekening, KTP), `agent_withdrawals`, KTP agen di storage; audit log tidak bisa diubah atau dihapus siapa pun; daftar 26 fungsi SECURITY DEFINER + 5 invoker yang bisa dipanggil `authenticated` dan 3 yang bisa dipanggil anon sama dengan daftar tinjauan.

### 3c. Fungsi admin dan siapa yang lolos gerbang (SA AD PA PC CA AG AV SL CS NO)

| Fungsi | Lolos | Catatan |
|---|---|---|
| admin_agent_leads, admin_list_commission_rates | A A B B B A B B A B | CS lolos (Lead Agen ada di menu CS; Komisi Agen tidak) |
| set_commission_rate, clear_commission_rate, process_agent_withdrawal, log_agent_sale | A A B B B A B B B B | cs_admin ditolak |
| get_analytics_summary | A A B B B B A B B B | sesuai menu |
| cancel_booking, mark_refund_sent, admin_mark_payment_settled | A A B ... | booking online sudah dimatikan; pesan galat Inggris |
| list_agent_options | baris hanya untuk SA, AD, CS | lainnya sukses tetapi kosong |
| get_agent_leaderboard | baris hanya untuk SA, AD, AG | |
| accept/reject_jamaah_intake, import_jamaah_rows, delete_jamaah_registration | invoker; gerbangnya RLS tabel | CS lolos accept/reject/import; hapus registrasi hanya owner |

## 4. Temuan baru

Severity: P0 memblokir pemakaian, P1 serius, P2 sebaiknya diperbaiki, P3 poles. Effort: S <2 jam, M setengah hari, L sehari atau lebih.

| ID | Sev | Area | Bukti | Standar | Saran | Effort |
|---|---|---|---|---|---|---|
| ADM-101 | P1 | G/F | Komisi masuk `available_balance` saat lunas (`20261007100000_commission_rates.sql:295-350`); `process_agent_withdrawal` (`20261006110000_agent_admin_tools.sql:17-64`) cukup SATU admin atau agent_admin, memotong saldo penuh; kolom `agent_withdrawals` hanya `processed_at`, `admin_notes` (tanpa `processed_by`, pajak, bukti, NIK); `agent_sales.status='paid'` tak pernah diisi; WithdrawalsPanel tidak menampilkan pajak atau biaya transfer | SOP dan jawaban Virna: disetujui manajemen DAN keuangan, dibayar saat keberangkatan, potong 5%, biaya transfer ditanggung Musafar; payout/ERP: dua persetujuan, jejak siapa membayar | Bangun siklus komisi (bagian 6) | L |
| ADM-102 | P1 | F | Live: `agent_admin` mengubah `available_balance`/`total_commission` agen aktif = 1 baris berubah (tes 11 KNOWN); privilege kolom UPDATE dan INSERT untuk `authenticated` mencakup semua kolom `agents`; trigger `aa_protect_agent_columns` melindungi agen sendiri, bukan staf; tidak ada ledger atau log | Saldo uang diturunkan dari ledger, bukan kolom yang bisa diubah; peran dukungan tak boleh menulis uang | Cabut UPDATE kolom uang dari `authenticated`, ubah hanya lewat fungsi yang menulis ledger; batasi INSERT/DELETE agen | M |
| ADM-103 | P1 | G | FK `agent_sales`, `agent_withdrawals`, `agent_leads`, `agent_lead_followups`, `agent_short_links` ke `agents` `ON DELETE CASCADE` (live); tombol Hapus di `AgentManagement.tsx` (ketik nama bila ada uang) tetap menghapus agen beserta riwayat komisi dan penarikan | Catatan keuangan tidak boleh hilang; nonaktifkan, jangan hapus | Ganti Hapus dengan Nonaktifkan/Arsipkan; FK `RESTRICT`; hapus hanya agen tanpa riwayat | M |
| ADM-104 | P3 | Tooling | `tests/db/pending-migrations.txt` berisi 25 migrasi yang sudah ter-push (basi) dan rapuh: dua kali saat audit satu entri tanpa folder (`20261008100000_levels_silver_start.sql`) dan satu entri ke berkas yang belum ada membuat `run-db-tests.sh` mati untuk SEMUA berkas (FileNotFoundError) | CI hijau yang bisa dipercaya | Kosongkan daftar basi; skrip lewati dan beri peringatan bila berkas tak ada | S |
| ADM-105 | P2 | F | Policy "Staff can read cogs defaults" memakai "ada baris di user_roles"; live PC, CA, AG, AV, SL, CS membaca `cogs_defaults` (tes 11 KNOWN) | Least privilege: HPP hanya produk dan owner | Samakan dengan policy tulis (admin, product_admin) | S |
| ADM-106 | P2 | B/G | `AgentCommissions.tsx`/`CommissionCell.tsx`: simpan otomatis saat blur, hanya `updated_by`/`updated_at` terakhir di `agent_commission_rates`; tanpa riwayat, tanpa konfirmasi untuk angka janggal (mis. 15.000.000 vs 1.500.000), tanpa urutan wajar antar level; mengisi SATU sel pada paket tanpa tarif langsung membuat tiga tingkat lain Rp 0 (`agent_commission_for`, `20261007100000:251-261`: paket tanpa baris memakai komisi standar, paket dengan baris dan sel kosong = 0) tanpa peringatan; mengosongkan sel terakhir mengembalikan paket ke komisi standar | Angka ini menggerakkan uang; tabel tarif perlu jejak | Tabel riwayat tarif (siapa, lama, baru); peringatan bila >2x tarif lain atau tak monoton | M |
| ADM-107 | P2 | G | Hanya 3 tipe notifikasi dikenal (`notificationMeta.ts`); `lead_conflict` (`20261006180000_agent_leads.sql:560-566`) jatuh ke ikon "Lainnya"; tidak ada notifikasi: pembayaran menunggu verifikasi (owner), jamaah melengkapi data, jatuh tempo H-30, penarikan diproses | Satu pesan per kejadian yang perlu tindakan | Tambah tipe dan trigger; badge antrean (ADM-021) | M |
| ADM-108 | P2 | G | `AgentManagement.tsx` update `status`, `level`, `registration_fee_status` langsung; hanya `approved_at` (tanpa `approved_by`), tidak ada log perubahan seperti `jamaah_audit_log` | Siapa menyetujui, menangguhkan, menaikkan level harus terlacak (sanksi dan sengketa) | `agent_audit_log` + trigger, tampil di AgentDetailDialog | M |
| ADM-109 | P3 | F | `has_role(uuid, app_role)` executable oleh anon (live, tes 11 KNOWN) | Fungsi internal tak perlu di API | `REVOKE EXECUTE ... FROM anon` bila tak dipakai RLS anon (cek dulu policy anon) | S |
| ADM-110 | P3 | G/F | `agent_levels` anon `4 dari 4`, `commission_rate_min/max` 4,5 sampai 6 persen (komisi kini nominal per paket/kelas/level); tak ada halaman admin untuk tingkat dan ambangnya (tes 11 KNOWN) | Satu sumber kebenaran, tanpa angka basi di publik | Hapus kolom persen atau sembunyikan dari anon; halaman Tingkat Agen bila diperlukan | S |
| ADM-111 | P2 | B/G | `AgentLeads.tsx` hanya baca ("Halaman ini hanya untuk dibaca"): tanpa keputusan sengketa, tanpa penahan komisi, tanpa ekspor; RPC mengembalikan semua lead dan disaring di klien (0 baris hari ini); tabel tanpa kartu ponsel | SOP: manajemen memutus sengketa berdasar bukti; Laily butuh tindakan | Tombol Putuskan (A/B/30:70/60:40) + catatan + penahan; paginasi server | L |
| ADM-112 | P3 | C | Pesan fungsi berbahasa Inggris tampil di toast: `log_agent_sale` "Not authorized to log agent sales", `cancel_booking`/`mark_refund_sent`/`admin_mark_payment_settled` "Not authorized" | PRODUCT prinsip bahasa | Terjemahkan pesan atau petakan di klien | S |
| ADM-113 | P3 | H | Cron live: `sync-seats-5min` tiap 5 menit memanggil `sync-seats` tanpa header apa pun dan menimpa seat dari Sheet publik; `release-expired-booking-holds` tiap 15 menit untuk booking online yang sudah dimatikan | Pekerjaan terjadwal hanya untuk fitur hidup | Jadikan harian + secret, hapus job booking | S |
| ADM-114 | P2 | G | Biaya registrasi: `updateFeeMutation` hanya mengisi status dan waktu; tidak ada jumlah, bukti transfer, pencatat; tidak ada status "hangus" bila agen keluar (Virna: hangus) | Penerimaan uang butuh bukti dan pencatat | Kolom jumlah, bukti, `recorded_by`, status `forfeited` | S |
| ADM-115 | P3 | F | `admin_notifications` terbaca AG (`rUX0`); notifikasi `jamaah_intake` memuat nama pendaftar, padahal agent_admin tak punya akses data jamaah | Data pribadi hanya untuk yang berwenang | Policy SELECT per tipe, atau tanpa nama di judul | S |
| ADM-116 | P3 | F/A | `AgentDetailDialog.tsx:157-176` tombol "Setel ulang password (admin)" tampil untuk agent_admin; fungsi `admin-update-password` hanya `admin`/`superadmin` (`index.ts:29-37`); pesan galat menyuruh "pastikan fungsi aktif" (menyesatkan) | Menu terlihat berarti aksi jalan | Sembunyikan untuk non-owner atau izinkan agent_admin | S |
| ADM-117 | P2 | F/Tooling | Dengan migrasi tertunda (`20261008105000_role_finance`, `20261008110000_commission_lifecycle`) tes 11 melaporkan 9 fungsi SECURITY DEFINER dan 3 invoker baru (`commission_*`, `list_my_commissions`, `resolve_lead_dispute`, ...) belum ditinjau, dan `commission_net` dapat dipanggil anon (FAIL) | Fungsi baru lewat tinjauan gerbang | `REVOKE ... FROM PUBLIC, anon` pada `commission_net`; tinjau gerbang tiap fungsi, lalu tambahkan ke daftar tes | S |

### 4a. Tinjauan permukaan baru (sebagai Laily dan sebagai owner)

**Kelola Agen** (`AgentManagement.tsx`, `agents/AgentDetailDialog.tsx`, `agents/WithdrawalsPanel.tsx`). Baik: tab Agen/Penarikan di URL (`?tab=penarikan`), cari nama/email/telepon/Agent ID, filter status, urut calon agen dulu, peringatan saat menyetujui bila KTP, alamat, biaya registrasi, SOP belum lengkap (`approvalWarnings`), tombol "Kabari via WhatsApp" setelah setuju, KTP lewat signed URL, tombol salin nomor rekening, `LoadError` di kedua tab, StatusBadge dengan teks. Kurang: tabel tanpa kartu ponsel, `select('*')` memuat rekening dan NIK ke klien (ADM-054), daftar penarikan tanpa batas halaman, tidak ada jejak siapa menyetujui (ADM-108), biaya registrasi tanpa bukti (ADM-114), Hapus menghapus riwayat (ADM-103), jalur "Log Penjualan" kedua (ADM-030).

**Penarikan dan pajak 5 persen** (`process_agent_withdrawal`). Fungsi hanya mengurangi `available_balance` sebesar jumlah penuh dan mengisi `processed_at`/`admin_notes`. Akibat bila 5 persen belum diterapkan: agen akan menerima bruto (Rp 1.500.000 padahal bersih Rp 1.425.000, selisih Rp 75.000 per jamaah standar), selisih itu menjadi kewajiban Musafar yang tak tercatat, tidak ada bukti potong, dan tidak ada NIK terverifikasi (hanya `agents.ktp_number`; onboarding hanya memeriksa panjang >=16 di `AgentOnboarding.tsx:126`, bukan digit atau kecocokan KTP). Eksposur live sekarang nol (0 penarikan, `agent_sales` 0 baris, jumlah `available_balance` dan `total_commission` semua agen Rp 0), jadi aman selama belum ada agen menarik; tetapi begitu satu jamaah lunas dan agen menarik, kesalahan itu permanen. Penahan sementara yang murah (S): blokir "Tandai dibayar" sampai fitur pajak ada, atau tampilkan jumlah transfer bersih 95 persen di dialog.

**Komisi Agen** (`AgentCommissions.tsx`, `commission/CommissionCell.tsx`). Baik: sel disunting di tempat, simpan saat blur/Enter, status tiap sel (menyimpan, tersimpan, galat), Escape mengembalikan, 0 dibaca sebagai kosong, cari paket, filter bulan dan status, "Hanya yang belum lengkap" dengan snapshot supaya baris tidak hilang saat mengetik, kartu di ponsel, `aria-label` per sel, penghitung "x dari y sel terisi". Kurang: ADM-106 (tanpa riwayat, tanpa pagar angka janggal, efek mengisi satu sel); angka 0 tidak bisa dipakai untuk "tingkat ini memang Rp 0" (kosong = 0 pada paket yang sudah punya angka, sehingga tidak ada beda "belum diisi" dan "sengaja nol"); URL state tidak ada.

**Lead Agen** (`AgentLeads.tsx`). Baik untuk Laily membaca: filter status, agen, sengketa, cari nama/nomor, panel riwayat follow-up, peringatan sengketa. Kurang: ADM-111 (tanpa keputusan, tanpa penahan komisi selama sengketa, tanpa ekspor, tanpa kartu ponsel). Peran CS dapat membaca lead semua agen (nomor WA calon jamaah): sengaja (menu cs_admin), perlu dipastikan pemilik.

**Tim** (`Team.tsx`, `manage-team`). Baik: hapus akses kini hanya mencabut peran (akun tetap), superadmin terakhir tidak bisa dicabut atau diturunkan, ketik nama untuk superadmin, label peran dengan penjelasan. Kurang: tidak ada log perubahan peran, opsi peran belum memuat `finance` (dibutuhkan dua persetujuan komisi), peran multi (ADM-035), peran tersimpan 5 menit di klien.

**Lonceng** (`AdminHeader.tsx`, `useAdminNotifications.tsx`). Baik: pengelompokan, arsip, mute per jenis, toast gabungan, pembacaan lintas peran sudah benar di DB. Kurang: galat fetch ditelan jadi daftar kosong (ADM-003), tipe notifikasi terbatas dan `lead_conflict` tanpa ikon sendiri (ADM-107), preferensi mute di `localStorage` per browser, hanya 200 notifikasi terakhir.

**Verifikasi Pembayaran** (`JamaahPayments.tsx`, `PaymentTable.tsx`). Baik: paginasi 50 server-side, cari nama, ringkasan total menunggu lintas halaman, kartu ponsel, hapus dengan ketik nama, aturan peran ditegakkan trigger (CS tidak bisa memverifikasi atau mengubah yang terverifikasi; terverifikasi tidak bisa diubah nominalnya, harus ditolak lalu dicatat ulang; semua dites). Kurang: satu per satu, kolom diverifikasi oleh/kapan tidak tampil, tab dan halaman tidak di URL, tidak ada filter tanggal atau rekening PT untuk rekonsiliasi mutasi.

**Intake** (`JamaahIntake.tsx`). Pertanyaan: apakah ada ajakan kirim DP + manifest setelah Terima? Tidak. `AcceptDialog.accept` hanya toast "n jamaah masuk ke Data Jamaah" lalu intake pindah ke tab Diterima. Pesan DP (rekening PT, DP minimum per orang, link `/lengkapi/<token>`) baru ada di tab Diterima lewat tombol "Kirim info DP" dan "Salin link", tanpa penanda sudah dikirim, tanpa kirim ulang yang tercatat. Tolak tidak mengabari jamaah (hanya catatan). Jamaah yang ditambah manual tidak punya token/link.

**Dashboard owner**. Empat kartu (paket, wisata halal 0 baris, artikel, klik WhatsApp bulan ini), tiga keberangkatan terdekat, tiga agen teratas, "Quick Actions" (slug, GA4), status integrasi statis. Pagi hari owner butuh: pembayaran menunggu verifikasi (jumlah dan total), pendaftaran baru, jamaah belum DP, H-30 jatuh tempo, penarikan menunggu, agen pending, uang masuk bulan ini vs target, seat sisa per keberangkatan. Semua datanya sudah ada di tabel/RPC; belum ada yang ditampilkan.

**Shell**. Ciut/lebar diingat lewat cookie `sidebar:state` (default terbuka di >=1024px), tombol di header sidebar dengan tooltip, laci di ponsel, Ctrl/Cmd+K membuka "Cari halaman" (hanya menu yang diizinkan peran: aman), judul tab, Keluar di footer. Menu disaring per peran dari satu sumber (`adminMenu.ts`). Kurang: badge antrean, pencarian data (jamaah, agen, paket), kembali ke URL tujuan, skip link.

**Siklus kerja Laily (laptop seharian)**: lambat atau hilang di: (1) tidak ada badge intake baru/pembayaran menunggu, jadi harus memeriksa halaman; (2) setelah Terima tidak ada langkah berikutnya yang menyala; (3) pengingat H-45/H-35/H-30 satu per satu dari menu yang bukan miliknya (Laporan Keuangan owner-only); (4) tidak bisa cari jamaah dari mana saja (Ctrl+K hanya halaman); (5) verifikasi pembayaran tidak massal (owner); (6) filter dan halaman hilang saat refresh karena tidak di URL.


## 5. Hitungan sebelum dan sesudah

Snapshot lama = commit ee33da8 (sebelum audit 01), skrip yang sama dijalankan di kedua pohon (berkas `src/pages/admin`, `src/components/admin` dan sub-folder). Angka audit 01 yang memakai heuristik lain ditaruh di kurung.

| Ukuran | 01 | 06 |
|---|---|---|
| Rute anak `/admin` | 42 (41) | 44 (+ `komisi-agen`, `agent-leads`) |
| Halaman di `src/pages/admin` | 38 | 40 |
| Berkas admin yang diukur (ts+tsx) | 86 | 91 |
| Kelas palet mentah | 711 (705) di 39 berkas | 669 di 38; portal agen 8 jadi 0 |
| Teks <12px | 72 di 10 berkas | 69 di 9 |
| Warna hex | 48 di 5 | 47 di 4 |
| `confirm()` / `prompt()` / `alert()` | 13 / 1 / 0 | 0 / 0 / 0 |
| Berkas dengan ConfirmDialog | 1 | 13 |
| `<table>` native (berkas) | 7 (8) | 8 |
| `<button>` mentah | 25 di 16 berkas | 26 di 17 |
| `select('*')` | 35 | 34 |
| String Inggris (heuristik) | 278 di 50 berkas (~192) | 54 di 32 berkas |
| Emoji sebagai ikon (karakter) | 88 di 18 | 87 di 17 |
| Tombol ikon tanpa nama (skrip sama) | 31 dari 49 (53 dari 74) | 27 dari 50 |
| `<Label>` tanpa `htmlFor` | 75 dari 165 | 75 dari 170 |
| Input/Textarea tanpa id atau aria-label | 85 dari 163 | 87 dari 167 |
| Tabel dengan kartu ponsel | 4 dari 29 berkas (3 dari 20 halaman) | 5 dari 31 berkas |
| Skeleton / LoadError / EmptyState / StatusBadge (berkas) | 6 / 6 / 2 / 6 | 8 / 9 / 4 / 8 |
| `PageHeader` | 0 | 0 |
| Halaman dengan `useSearchParams` | 3 | 3 |
| `rupiah()` / `formatCurrency` / `Rp` ad hoc | 61 / 6 / 32 | 63 / 6 / 32 |
| `toISOString().split/slice` untuk tanggal | 10 | 10 |
| Judul tab per rute | 1 statis | per rute dari menu (Helmet di shell) |
| Toast sonner / use-toast (berkas) | 40 / 10 | 41 / 10 |
| Peran dengan landing berguna | 2 dari 9 | 9 dari 9 (owner Dashboard, lainnya halaman pertama) |
| Tes database (live) | PASS=472 FAIL=0 KNOWN=9 | file baru `11_admin_recheck.sql` PASS=130 FAIL=0 SKIP=2 KNOWN=14 |

Data live hari ini: 576 registrasi aktif, 557 pembayaran terverifikasi (Rp 14.692.280.000, semua berpencatat `verified_by`), 0 pembayaran menunggu, 0 intake, 10 agen (6 aktif biaya "waived", 4 pending "unpaid"), 0 penarikan, 0 lead, 48 tarif komisi, 6 notifikasi (3 belum dibaca), user_roles 3 superadmin + 1 product_admin.

## 6. Kebutuhan build berikutnya

Catatan: agen lain sedang menulis migrasi `20261008105000_role_finance` dan `20261008110000_commission_lifecycle` (belum di-push, tidak ditinjau di sini selain tripwire tes 11). Daftar ini menyatakan apa yang admin butuhkan; tandai yang sudah tercakup ketika migrasi itu selesai.

| # | Kebutuhan | Rincian | Effort |
|---|---|---|---|
| 1 | Status komisi PENDING, ELIGIBLE, APPROVED, PAID per jamaah | Kolom/tabel status pada `agent_sales` (atau `commission_entries`): `eligible_at` otomatis pada hari keberangkatan (cron harian dari `packages.departure_date`), tahan bila refund/batal/sengketa/agen ditangguhkan, tidak lagi menambah `available_balance` saat lunas | L |
| 2 | Dua persetujuan dengan dua orang berbeda | Peran `finance` (+ pemilik/manajemen) di `app_role` dan Tim; kolom `approved_mgmt_by/at`, `approved_fin_by/at`; DB menolak bila dua pemberi persetujuan sama (CHECK + RPC); halaman "Persetujuan Komisi" dengan antrean dan filter per keberangkatan | L |
| 3 | Batch pembayaran | Pilih komisi APPROVED per tanggal berangkat, hitung bruto, PPh 5 persen, biaya transfer (ditanggung Musafar, dicatat sebagai biaya), bersih; wajib NIK 16 digit valid dan rekening; berkas CSV transfer massal; tenggat H sampai H+2 mendarat | L |
| 4 | Bukti transfer dan slip | Unggah bukti per pembayaran (bucket privat), slip PDF atau pesan WA ke agen, tampil di portal agen; kolom `paid_by`, `paid_at`, `proof_path` | M |
| 5 | Ledger saldo agen | Tabel append-only (kredit, pembalikan, bayar, koreksi) dan saldo turunan; cabut tulis kolom uang `agents` (ADM-102); koreksi refund setelah bayar (AGT-104) | M |
| 6 | Jejak audit | `agent_audit_log` (setuju, tangguh, level, biaya, tarif, persetujuan komisi, bayar) dan riwayat tarif (ADM-106, ADM-108) tampil di detail agen | M |
| 7 | Manajemen agen | Biaya registrasi: jumlah, bukti, pencatat, status hangus; versi SOP dan minta setuju ulang; kolom "Terakhir aktif" dan nonaktif otomatis setelah 3 bulan tanpa aktivitas (butuh definisi aktivitas, cron, peringatan hari ke-75, tombol aktifkan kembali); log sanksi (peringatan, skorsing, pemutusan, alasan, bukti) yang menahan komisi; antrean persetujuan konten agen (unggahan, cek syariah, setuju/tolak/alasan, portal agen untuk mengirim) | M untuk biaya/SOP/sanksi/nonaktif, L untuk antrean konten |
| 8 | Sengketa lead | Aksi pada Lead Agen: putuskan pemilik, pembagian 30/70 atau 60/40, penahan komisi selama sengketa, bukti, riwayat keputusan, notifikasi ke kedua agen | L |
| 9 | Operasional jamaah: pengingat | Tabel `reminder_log`; antrean "Hari ini" dari tanggal berangkat (H-45, H-35, H-30) x sisa tagihan, tombol WA siap kirim + penanda terkirim; pindah dari Laporan Keuangan ke Data Jamaah agar CS bisa memakai; opsional kirim otomatis via API WA | M (manual), L (otomatis) |
| 10 | Template WA | Tabel template yang bisa disunting CS (DP, link manifest, pengingat, pembayaran diterima, minta dokumen) dengan variabel; semua tombol WA memakainya; log terkirim | M |
| 11 | Setelah Terima | Dialog lanjutan "Kirim info DP + link lengkapi data" dan `wa_sent_at`; regenerasi token; tolak dengan pesan | S |
| 12 | Ekspor keberangkatan | Rooming list, daftar bus/grup, manifest ala Siskopatuh, laporan data kurang dan validasi (paspor >=6 bulan setelah pulang, mahram, vaksin); format tujuan perlu contoh dari tim | M, bergantung format |
| 13 | Dashboard owner dan badge | Kartu tindakan (bagian 4a) + badge menu (intake, pembayaran, penarikan, komisi menunggu, sengketa) | M |
| 14 | Verifikasi massal dan tinjau dokumen | Centang banyak + kolom verifier; status per dokumen dengan alasan; notifikasi "data dilengkapi" | M |
| 15 | Skala daftar | Paginasi server untuk Semua Jamaah, Laporan, Intake, Leads kalkulator, Lead Agen (ADM-027) | M |

## 7. Yang perlu keputusan pemilik

1. Peran "manajemen" dan "keuangan" untuk persetujuan komisi: siapa orangnya, apakah peran `finance` baru, dan apakah satu pemilik boleh mewakili dua peran (rekomendasi: tidak, dua orang berbeda diwajibkan database).
2. Kapan komisi "eligible": hari keberangkatan, hari mendarat, atau hari pulang; dan batas H sampai H+2 dihitung dari apa (tanggal mendarat belum ada di data).
3. Pajak 5 persen: dasar (komisi bruto), apakah dipotong dari agen tanpa NPWP dengan tarif sama, bukti potong, apakah Musafar menanggung gross-up; batas NIK wajib.
4. Hapus agen: dilarang bila ada riwayat uang (rekomendasi) dan diganti Nonaktif/Arsip.
5. Koreksi saldo manual oleh owner: boleh lewat entri koreksi berlog, bukan edit kolom.
6. Siapa boleh melihat tarif komisi: cs_admin saat ini bisa membaca 48 tarif via API tanpa menu; agent_admin membaca notifikasi pendaftar jamaah.
7. Atur `SYNC_SEATS_SECRET` di Supabase dan perbarui dua cron (atau matikan job 5 menit); matikan job booking online (ADM-013, ADM-113).
8. Visibilitas `cogs_defaults` dan kolom biaya `packages` (ADM-105, ADM-036): hanya produk dan owner?
9. Pengingat: jadwal H-45/H-35/H-30 baku, kirim manual dari wa.me atau otomatis lewat API WhatsApp berbayar, siapa yang bertanggung jawab (Laily).
10. Pencarian global: apakah Ctrl+K boleh menampilkan nama jamaah dan agen (data pribadi di layar).
11. Format manifest Siskopatuh dan kebutuhan rooming/bus: contoh berkas dari tim.
12. Wewenang memutus sengketa lead dan aturan penahan komisi; aturan "hangus" biaya registrasi bila agen keluar (dicatat apa).
13. Apakah `agent_levels` dan ambang tingkat boleh disunting dari admin (halaman baru) dan persentase lama dibuang.

## 8. Yang tidak bisa diverifikasi

- Peran selain superadmin dan product_admin tidak punya pengguna di produksi; semua diuji dengan pengguna tanam di transaksi yang di-abort (kunci `auth.uid()` dan RLS sama dengan login nyata, tetapi bukan JWT hasil login sungguhan). Tidak ada akun cs_admin, jadi alur Laily belum pernah dijalankan oleh akun CS nyata.
- Edge function tidak dipanggil: `sync-seats` terbuka atau tidak adalah kesimpulan dari kode, daftar nama secret, dan cron; memanggilnya akan menulis data live. `manage-team` dan `admin-update-password` dibaca dari kode saja.
- Browser: hanya redirect `/admin/jamaah` ke `/auth` dan judul halaman login yang dilihat (admin butuh login). Collapse sidebar, Ctrl+K, laci ponsel, kartu ponsel, ConfirmDialog dibaca dari kode, tidak dijalankan. Viewport sudah dikembalikan ke desktop dan tidak ada sesi palsu.
- Sel matriks insert untuk `jamaah_registrations` dan `user_roles` tidak diandalkan (artefak salin-baris); diganti pemeriksaan eksplisit (insert registrasi oleh CS berhasil dan oleh PA, AG, SL, NO ditolak).
- Tabel kosong ditanam satu baris generik dengan trigger dan FK dimatikan sementara (`session_replication_role = replica`) agar bisa diuji; sel `u`/`i` (ditolak constraint setelah lolos RLS) berarti RLS mengizinkan. Dua tabel (`agent_lead_followups`, `jamaah_intake_people`) tidak bisa ditanam sehingga di-SKIP.
- Hitungan palet, bahasa, ikon tanpa nama, Label, emoji berbasis regex; snapshot lama diambil dari commit ee33da8 dengan skrip yang sama, tetapi angka audit 01 memakai heuristik lain (ditulis di kurung).
- Format Siskopatuh/visa tidak diketahui. Status pelaksanaan migrasi tertunda milik agen lain (siklus komisi, peran finance) tidak ditinjau kecuali lewat tripwire tes 11.
- Hasil `./scripts/run-db-tests.sh` penuh tidak stabil selama audit karena `tests/db/pending-migrations.txt` diubah agen lain di tengah jalan (ADM-104). Percobaan terakhir (dengan migrasi tertunda `20261008100000`, `20261008105000`, `20261008110000` diterapkan di dalam tiap transaksi): TOTAL PASS=695 FAIL=10 SKIP=11 KNOWN=29. Seluruh FAIL berasal dari migrasi tertunda itu, bukan dari kondisi live: `agent_withdrawals` INSERT ditolak RLS (berkas 01, 04, 10), fungsi baru dapat dipanggil anon (`agents_commission_refresh`, `capture_lead_dispute`, `commission_net`, trigger guard; berkas 01 dan 11), fungsi SECURITY DEFINER baru membaca tabel jamaah (berkas 04), bucket `commission-proofs` baru (berkas 11). Angka dasar "PASS=472 FAIL=0 KNOWN=9" tidak bisa direproduksi sekarang. Berkas 11 sendirian terhadap database live (tanpa migrasi tertunda): PASS=130 FAIL=0 SKIP=2 KNOWN=14.
