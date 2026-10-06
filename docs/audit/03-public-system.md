# Audit 03: Situs publik dan titik sentuh sistem

Cakupan: area A sampai H (perjalanan calon jamaah, pesan transaksional, halaman galat, SEO, aksesibilitas, privasi UU PDP, kepercayaan dan hukum, smoke produksi).
Tanggal audit: 6 Oktober 2026. Kode: `/Users/macbookair/.gemini/antigravity/scratch/musafartour` (branch main). Produksi: https://musafartour.com.
Metode: baca kode (src, functions, supabase/migrations), `curl` GET/HEAD ke produksi, dan satu sesi browser baca-saja (tanpa POST, tanpa menulis ke database, tanpa mengubah kode aplikasi).

Catatan keterbatasan (ringkas, rinci di bagian akhir): dashboard Supabase/Cloudflare/GTM/Clarity tidak bisa dibuka; `dist/` di repo bukan build yang sedang tayang (produksi memakai `index-DZxiyip8-v2.js`, repo `index-BF9TbLHM-v2.js`); panel browser berstatus `hidden` sehingga `requestAnimationFrame` react-helmet-async tidak berjalan, jadi meta per paket di DOM hidup tidak terbukti.

---

## 1. Ringkasan

1. Sistem inti pendaftaran offline (form publik, CS menerima, link `/lengkapi`) sudah jalan dan kodenya rapi. Yang kurang adalah semua hal "standar" di sekitarnya.
2. **Di ponsel, tidak ada jalan ke form pendaftaran dari halaman paket.** Tombol "Daftar Sekarang" hanya dirender di kolom `hidden lg:flex` (desktop). Diuji di 375 px produksi: 1 tautan `/daftar/...` ada di DOM, 0 yang terlihat (PUB-001).
3. **Pelacak (GTM, Clarity, Meta, TikTok, GA) menyala sebelum persetujuan apa pun**, termasuk di `/daftar` dan `/lengkapi/<token>`. Cookie `_ga _clck _fbp _ttp ttcsid` terpasang pada kunjungan pertama. Token pribadi di URL ikut terkirim ke pihak ketiga (PUB-002).
4. **Dua kebijakan pembatalan yang saling bertentangan** tayang bersamaan: `/syarat-ketentuan` (selain DP dikembalikan penuh) vs `/syarat-umroh` yang disetujui di form (potongan 50/25/0 persen dan "tidak bisa dibatalkan setelah 5 hari kerja") (PUB-003).
5. Kebijakan privasi (diperbarui 29 Sep) tidak menyebut KTP/KK, paspor, pasfoto, golongan darah, catatan medis, vaksin, mahram, Clarity, GTM, dan tidak punya masa simpan atau prosedur hapus yang jelas (PUB-004).
6. Tidak ada "Cek status pendaftaran" dan tidak ada pesan otomatis ke jamaah. Semua komunikasi adalah tautan `wa.me` yang diklik CS satu per satu. Email hanya dari Supabase Auth (templat dan SMTP tidak bisa diverifikasi) (PUB-005, PUB-006, PUB-007).
7. Berbagi tautan paket lewat WhatsApp/Facebook menghasilkan pratinjau generik tanpa gambar dan harga, karena HTML awal adalah cangkang SPA yang sama untuk semua rute. URL tidak dikenal (termasuk slug paket salah) menjawab HTTP 200 (soft 404). `www.musafartour.com` menjawab 404 dari Lovable (PUB-008, PUB-009, PUB-010).
8. Klaim kepercayaan belum bersandar bukti: nomor PPIU tidak tampil di halaman publik, tidak ada tautan verifikasi Kemenag, "3000+ jamaah" dan "290+ ulasan" ditulis keras di kode, ada testimoni dan FAQ cadangan fiktif di kode (PUB-014, PUB-015).
9. Aksesibilitas: tidak ada skip link, `<nav>` dirender paling akhir di `<body>`, tautan logo tanpa nama, enam halaman tanpa `<main>`, tiga komponen bergerak tanpa tombol jeda, kontras gagal pada placeholder dan beberapa teks status (bagian 5).
10. Yang baik: header keamanan lengkap (HSTS, CSP, XFO), redirect http ke https, robots/sitemap valid, artikel server-rendered, validasi form ganda (klien dan server), dokumen privat dengan RLS ketat, tidak ada PII di event pelacakan.

### Skor per area (0 sampai 5)

| Area | Skor | Alasan singkat |
|---|---|---|
| A. Perjalanan publik | 2 | Alur inti ada, tetapi ponsel tidak bisa mendaftar dari paket, tidak ada cek status, tidak ada instruksi bayar dan bukti transfer, tidak ada pra dan pasca keberangkatan |
| B. Titik sentuh sistem | 1 | Tidak ada pesan otomatis ke siapa pun. Hanya bel in-app admin dan email Supabase Auth |
| C. Halaman galat dan tepi | 2 | Ada 404 dan boundary, tetapi soft 404, galat mentah ke pengunjung, tanpa halaman 5xx/offline/maintenance |
| D. SEO dan berbagi | 2 | Artikel dan sitemap baik, paket dan rute lain cangkang CSR tanpa OG, title beranda "2025" |
| E. Aksesibilitas | 2 | Dasar form baik, tetapi banyak kegagalan level A (skip link, urutan fokus, gerak otomatis) |
| F. Privasi / UU PDP | 1 | Pelacak tanpa persetujuan, kebijakan tidak cocok dengan data yang dikumpulkan, token permanen |
| G. Kepercayaan dan hukum | 2 | Syarat bertentangan, klaim keras di kode, harga kalkulator berbeda dari daftar, PPIU tidak tampil |
| H. Smoke produksi | 3 | Header dan redirect baik. www mati, semua rute 200 (soft 404), meta feed memuat paket lewat tanggal |

---

## 2. Scorecard perjalanan calon jamaah (area A)

Legenda: Ada = berfungsi sesuai standar; Sebagian = ada tetapi ada celah nyata; Tidak ada = tidak ditemukan di kode maupun produksi.

| # | Titik sentuh | Status | Penilaian (bukti utama) |
|---|---|---|---|
| 1 | Beranda: proposisi nilai | Ada | h1 jelas, CTA "Lihat Semua Paket" dan "Tanya CS" (HeroSection.tsx) |
| 2 | Beranda: nomor PPIU | Tidak ada | Hanya lencana "Berizin Resmi Kemenag PPIU" tanpa nomor. Nomor hanya di `/syarat-umroh` dan portal agen (AgentSalesGuide.tsx:89) |
| 3 | Beranda: tautan verifikasi Kemenag | Tidak ada | Tidak ada tautan ke situs pengecekan travel resmi |
| 4 | Beranda: tahun berdiri dan jumlah jamaah | Sebagian | "3000+" dan "290+ ulasan" ditulis keras; "3 Tahun Melayani" vs fallback "sejak 2015" (Index.tsx:61) |
| 5 | Beranda: testimoni nyata | Ada | Ulasan Google asli tampil di produksi (nama dan tanggal nyata). Cadangan fiktif di kode berbahaya bila DB kosong (PUB-014) |
| 6 | Beranda: info PT, rekening, alamat, peta | Sebagian | Footer tanpa alamat, telepon, email, PPIU. Peta dan alamat hanya di `/kontak` dan `/tentang-kami` |
| 7 | WhatsApp | Ada | FAB, hero, footer, kontak. Lihat PUB-047 untuk risiko popup |
| 8 | Daftar paket: filter | Sebagian | 5 filter (kategori, bulan, maskapai, tipe penerbangan, durasi). Tidak masuk URL, tanpa jumlah hasil |
| 9 | Daftar paket: urutan | Tidak ada | Selalu tanggal berangkat. Tidak ada sort harga |
| 10 | Daftar paket: transparansi harga | Sebagian | Kartu hanya "27,9 Jt" tanpa "mulai dari", tanpa "per orang, Quad", tanpa isi paket |
| 11 | Daftar paket: kejujuran seat | Ada | "Sisa N" dan "PENUH" dari data. Sumber `sheet` manual bisa basi |
| 12 | Kalender keberangkatan | Ada | `/jadwal-umroh` dengan filter. Tampilan daftar, bukan kalender bulan |
| 13 | Detail paket: itinerary | Sebagian | Dialog hanya muncul bila data ada (tidak ada di paket yang dicek) |
| 14 | Detail paket: hotel dan jarak | Ada | Jarak meter dan menit jalan, foto eksterior/lobi/kamar |
| 15 | Detail paket: penerbangan | Sebagian | Maskapai, rute, direct/transit. Tanpa jam terbang, tanpa bagasi |
| 16 | Detail paket: harga per tipe kamar | Ada | Quad, Triple, Double |
| 17 | Detail paket: DP dan jadwal bayar | Tidak ada | Tidak ada kata DP, cicilan, lunas di halaman paket (diuji produksi) |
| 18 | Detail paket: refund/pembatalan | Tidak ada | Hanya di halaman hukum terpisah dan bertentangan |
| 19 | Detail paket: FAQ | Tidak ada | FAQ hanya di beranda |
| 20 | Detail paket: bagikan | Sebagian | Modal ada, tetapi pratinjau tautan generik (PUB-008) |
| 21 | Detail paket: bandingkan | Tidak ada | Hanya "Keranjang" (favorit) tanpa halaman perbandingan |
| 22 | Detail paket: CTA daftar di ponsel | **Tidak ada** | PUB-001 |
| 23 | Kalkulator tabungan | Sebagian | Ada dan menarik, tetapi harga tetap dan pelunasan 40 hari (PUB-016), tanpa persetujuan data |
| 24 | `/daftar/:slug`: minimalis | Ada | 4 bagian, validasi klien dan server, honeypot |
| 25 | `/daftar`: autosave/resume | Tidak ada | State hanya di memori |
| 26 | `/daftar`: banyak orang | Ada | Sampai 10 peserta, kamar per orang, bayar bersama |
| 27 | `/daftar`: persetujuan | Sebagian | 2 kotak centang, versi `2026-10-tos`, teks persetujuan tidak disimpan (PUB-028) |
| 28 | `/daftar`: Turnstile | Sebagian | Widget tanpa jalur cadangan bila diblokir |
| 29 | `/daftar`: pesan galat | Ada | Bahasa Indonesia, per kolom, fokus ke kolom salah. Tanpa ringkasan galat |
| 30 | Halaman sukses | Sebagian | Kode, 3 langkah, tombol WA terisi. Tanpa SLA balasan, tanpa tombol salin kode, tanpa email/WA otomatis |
| 31 | Cek status pendaftaran | **Tidak ada** | PUB-005 |
| 32 | `/lengkapi/:token`: lanjut nanti | Ada | Simpan per peserta di server, tautan sama |
| 33 | `/lengkapi`: progres | Sebagian | "x dari y peserta lengkap", lencana "Kurang N hal". Tanpa persen |
| 34 | `/lengkapi`: unggah dokumen | Sebagian | JPG/PNG/PDF 10 MB, tanpa pratinjau, kompresi, progres, atau `capture` kamera |
| 35 | `/lengkapi`: validitas paspor | Ada | Peringatan 12 bulan, tetapi baru setelah DP |
| 36 | `/lengkapi`: catatan privasi | Tidak ada | Tidak ada keterangan siapa melihat dokumen dan berapa lama disimpan |
| 37 | `/lengkapi`: setelah selesai | Tidak ada | Tidak ada status "selesai", tidak ada langkah berikut |
| 38 | Instruksi pembayaran | Sebagian | Tanpa nomor rekening di situs saat daftar (hanya via WA CS). Nomor ada di `/syarat-ketentuan` |
| 39 | Konfirmasi bayar / bukti / kwitansi | Tidak ada | Tidak ada unggah bukti, tidak ada kwitansi |
| 40 | Pra-keberangkatan: manasik, checklist, jadwal | Tidak ada | Perlengkapan ada di paket. Tanpa jadwal manasik, info penerbangan akhir, grup |
| 41 | Pasca perjalanan: permintaan ulasan | Tidak ada | Hanya tautan ulasan Google statis di beranda |

---

## 3. Tabel temuan

Severity: P0 memblokir peluncuran atau masalah hukum; P1 serius; P2 sebaiknya diperbaiki; P3 poles. Effort: S kurang dari 2 jam, M setengah hari, L sehari atau lebih. Evidence memakai `file:baris` atau URL.

### P0

| ID | Sev | Area | Titik sentuh | Evidence | Standar yang seharusnya | Saran perbaikan | Effort |
|---|---|---|---|---|---|---|---|
| PUB-001 | P0 | A | Detail paket di ponsel | `src/pages/PackageDetail.tsx:338` (`hidden lg:flex`) membungkus `<PackageCtaButtons>` (:344); satu-satunya tautan `/daftar/${slug}` ada di `PackageCtaButtons.tsx:70-74`. `PackageStickyMobileBar.tsx:44-60` hanya punya "Lihat Rincian Harga" lalu WhatsApp. Uji produksi 375 px: `a[href^="/daftar/"]` ada 1, terlihat 0. Tidak ada tautan `/daftar` lain di seluruh `src` publik | Traveloka, Tiket.com: CTA utama menempel di bawah layar ponsel. PRODUCT.md: "ponsel adalah layar utama" | Tambahkan tombol "Daftar Sekarang" (brand) ke sticky bar dan ke isi sheet harga; jadikan WA sebagai aksi kedua. Tambahkan juga tautan dari hasil kalkulator dan kartu paket | S |
| PUB-002 | P0 | F | Pelacakan seluruh situs | `index.html:4-23` GTM + Clarity dimuat untuk semua path kecuali `/flyer-print`; `index.html:95-110` TikTok; `useMarketingPixels.tsx` Meta/TikTok/GA tanpa cek persetujuan; `App.tsx:140` hanya mengecualikan `/admin` dan `/agent`. `tracking.ts:200` `UNTRACKED_PATHS` tidak memuat `/lengkapi` dan `/daftar`, jadi `logPageView` menyimpan `path` berisi token 64 hex ke `site_events`. Produksi (kunjungan pertama, tanpa interaksi): cookie `_ga, _ga_070JY2Y6P9, _clck, _clsk, _fbp, _tt_enable_cookie, _ttp, ttcsid`; skrip tiktok, fbevents, clarity, gtm, gtag, cloudflareinsights. Tidak ada banner persetujuan (grep `consent` hanya di Turnstile/RegistrationForm) | UU 27/2022 PDP Pasal 20-22 (persetujuan eksplisit); praktik Tokopedia/Traveloka: banner cookie dengan opsi tolak, tag menunggu persetujuan (Google Consent Mode v2) | (1) Banner persetujuan dan tahan semua tag sampai setuju. (2) Jangan muat GTM/Clarity/Meta/TikTok/GA di `/lengkapi/*`, `/daftar/*`, `/auth`, `/set-password`; tambahkan ke `UNTRACKED_PATHS` dan guard `index.html`. (3) Pastikan Clarity mode masking Strict dan blok elemen formulir. (4) Hapus token dari event URL (`history.replaceState` ke `/lengkapi` sebelum tag membaca, atau kirim token lewat fragment) | M |
| PUB-003 | P0 | G | Syarat dan ketentuan | `src/pages/Legal.tsx:164-169`: "DP tidak dapat dikembalikan. Seluruh pembayaran di atas DP dikembalikan penuh, tanpa biaya pembatalan tambahan". `src/pages/SyaratUmroh.tsx:15`: "tidak bisa dibatalkan atau digantikan setelah 5 hari kerja"; `:63-64`: refund maksimal 90 hari kerja, 6 minggu 50%, 3 minggu 25%, 2 minggu 0% dari harga paket. Form `/daftar` (RegistrationForm.tsx:411-415) menautkan `/syarat-umroh`. Juga `Legal.tsx:150` harga "dapat berubah sebelum DP" vs `SyaratUmroh.tsx:79` "menyesuaikan kurs" tanpa batas waktu. Klausul `SyaratUmroh.tsx:52` (denda Rp 1 miliar dibebankan ke keluarga), klausul COVID `:21-25`, `:81` | UU 8/1999 Perlindungan Konsumen Pasal 18 (klausula baku yang membebankan tanggung jawab tidak sah); Permenag PPIU. Booking.com/Traveloka: satu kebijakan pembatalan, tampil di halaman produk dan checkout | Putuskan satu kebijakan (konfirmasi pemilik dan penasihat hukum), satukan di satu sumber (tabel DB) yang dipakai kedua halaman, tampilkan ringkas di detail paket dan form. Tinjau klausul denda 1 miliar dan COVID. `PRODUCT.md` melarang mengubah teks `/syarat-umroh` tanpa persetujuan PT, jadi butuh persetujuan tertulis | M (keputusan bisnis lebih lama) |
| PUB-004 | P0 | F | Kebijakan privasi dan data sensitif | `Legal.tsx:10` diperbarui 29 Sep 2026, sebelum fitur tahap 2 (migrasi 20261003). Isi (`Legal.tsx:92-134`) hanya menyebut nama, kontak, "nomor paspor, tanggal lahir"; tidak menyebut NIK, KTP/KK, pasfoto, golongan darah, catatan medis, vaksin, kontak darurat, mahram (`Lengkapi.tsx:151-229`, `manifestForm.ts`). Pelacak yang disebut: Meta, TikTok, GA; tidak menyebut Clarity (rekaman sesi), GTM, Cloudflare Insights, Turnstile, YouTube, Google Maps/Fonts. "Mitra pembayaran" tersisa dari Midtrans. Tidak ada masa simpan angka, tidak ada email DPO, tidak ada penyebutan transfer lintas negara (Arab Saudi, Meta/Google AS). `Lengkapi.tsx` tidak punya persetujuan khusus data kesehatan | UU PDP Pasal 4 (data kesehatan dan data biometrik adalah data spesifik), Pasal 21 (informasi tujuan, jenis, masa retensi), Pasal 56 (transfer lintas negara) | Tulis ulang kebijakan: daftar data per tahap, tujuan, dasar pemrosesan, masa simpan (mis. 5 tahun setelah perjalanan atau hapus dokumen setelah berangkat), penerima (maskapai, hotel, muassasah), lintas negara, kontak resmi (email) dan SLA permintaan hapus. Tambahkan catatan privasi dan persetujuan eksplisit data kesehatan di `/lengkapi` | M |

### P1

| ID | Sev | Area | Titik sentuh | Evidence | Standar | Saran | Effort |
|---|---|---|---|---|---|---|---|
| PUB-005 | P1 | A | Cek status pendaftaran | `grep -i "cek status\|status pendaftaran\|lacak" src` tidak menemukan halaman publik. Kode pendaftaran (`RegistrationForm.tsx:220`) hanya meminta "sebut kode ke CS". Rute di `App.tsx:307-364` tidak ada `/status` (produksi `/cek-status` menjawab SPA 200 lalu NotFound) | Traveloka "Pesanan Saya", Tiket.com cek pesanan dengan kode + nomor HP; travel umroh besar (Arminareka, Patuna) punya cek status berdasarkan kode | Halaman `/status` dengan kode + 4 digit akhir HP (Turnstile, rate limit) menampilkan: diterima/ditolak, DP, sisa bayar, batas lunas, tombol WA CS, dan tautan `/lengkapi` bila sudah diterima. Fungsi baru di `functions/api/` | M |
| PUB-006 | P1 | B | Pesan transaksional ke jamaah | Tidak ada kode pengirim pesan otomatis (grep resend/smtp/fonnte/wablas/twilio kosong; `supabase/functions/*` tidak mengirim). Penerimaan, DP, pengingat semuanya `wa.me` yang diklik CS: `JamaahIntake.tsx:51-62`, `jamaah.ts:294-313`. Form publik tidak punya kolom email (`intakeForm.ts`). Matriks di bagian 4 | Traveloka/Tiket: email dan push otomatis di setiap status; WhatsApp Business API (Qontak, Wablas, Fonnte) untuk travel | Minimal: (1) WA otomatis "pendaftaran diterima + kode" lewat gateway WA resmi; (2) pengingat H-45, H-35, H-30 terjadwal (pg_cron + Edge Function); (3) bukti pembayaran/kwitansi PDF; (4) kolom email opsional di form | L |
| PUB-007 | P1 | B | Email Supabase Auth | Email dikirim oleh Supabase Auth: undangan tim (`supabase/functions/manage-team/index.ts:101`), reset password (`Auth.tsx:156`, `AgentForgotPassword.tsx:27`, `Profile.tsx:105`, `AgentDetailDialog.tsx:334`), konfirmasi pendaftaran agen (`useAgentAuth.tsx:155`, migrasi `20261006100000_agent_registration.sql:3` memastikan "confirm email" aktif). `supabase/config.toml` tidak memuat `[auth]`, `[auth.email]`, atau SMTP: templat dan SMTP hanya ada di dashboard. **Tidak dapat diverifikasi**: bahasa templat, pengirim, batas kirim | Menurut dokumentasi Supabase (perlu dicek di dashboard): SMTP bawaan hanya untuk uji, dibatasi ketat, dan hanya mengirim ke alamat anggota tim proyek; produksi wajib SMTP sendiri | Dashboard Supabase > Authentication > Emails > SMTP Settings: isi SMTP sendiri (Resend/Brevo/SES/Workspace) dengan domain musafartour.com (SPF, DKIM, DMARC). Authentication > Email Templates: ubah Confirm signup, Invite user, Reset password ke Bahasa Indonesia, nada "kamu", logo, tautan `/agent/login` atau `/set-password`. Authentication > URL Configuration: Site URL `https://musafartour.com`, daftar Redirect URLs. Authentication > Rate Limits: naikkan sesuai kebutuhan. Uji kirim ke Gmail luar tim | S (konfigurasi) |
| PUB-008 | P1 | D | Pratinjau tautan paket | `curl -A WhatsApp/2.23 https://musafartour.com/paket-umroh/umroh-hemat-2026-10-11` hanya mengembalikan `<title>` generik dan `og:type/locale/site_name`; tanpa `og:title/image/description`, tanpa canonical. `index.html:44-46` "diatur per rute oleh SEO.tsx" (JS). `functions/` hanya merender `artikel`. `public/_redirects:1` `/* /index.html 200`. Agen membagikan tautan paket (`PackageShareModal.tsx:92`) | Booking.com/Traveloka: OG per produk dengan gambar, nama, harga. WhatsApp, Facebook, Telegram tidak menjalankan JS | Cloudflare Pages Function `functions/paket-umroh/[slug].ts` yang menyisipkan title, description, canonical, OG, JSON-LD Product ke `index.html` (HTMLRewriter), meniru pola `functions/artikel/[slug].ts`. Lakukan juga untuk `/paket-umroh`, `/jadwal-umroh`, `/tentang-kami`, `/kontak` | M |
| PUB-009 | P1 | C, H | URL tidak dikenal | Produksi: `/halaman-ngaco`, `/paket-umroh/slug-tidak-ada`, `/cek-status`, `/.well-known/security.txt`, `/llms.txt`, `/manifest.json` semuanya HTTP 200 `text/html` 6787 B. Penyebab `public/_redirects:1`. `/artikel/slug-ngawur` benar 404 (fungsi server) | Google: soft 404 diabaikan dan memboroskan crawl budget; standar semua situs produksi | Untuk paket: Function memeriksa slug lalu `status 404`. Untuk lainnya: ganti `_redirects` dengan daftar rute SPA yang eksplisit (`/`, `/paket-umroh*`, ...) dan biarkan sisanya 404 yang menyajikan halaman NotFound | M |
| PUB-010 | P1 | H | www vs apex | `curl https://www.musafartour.com/` HTTP/2 404 dengan header `x-lovable-serve-error: custom_domain_not_connected`; `http://www` juga 404. Apex http ke https: 301 benar | Standar: www 301 ke apex | Tambah CNAME www ke proyek Pages dan Redirect Rule 301 www ke apex (Cloudflare), atau hapus rekaman www lama yang masih menunjuk Lovable | S |
| PUB-011 | P1 | A | Instruksi pembayaran dan bukti | Halaman sukses (`RegistrationForm.tsx:221-225`) hanya "transfer ke rekening PT", tanpa nomor. Nomor rekening hanya di `Legal.tsx:159` (angka keras, duplikat `PT_ACCOUNTS` di `jamaah.ts:15-19`) dan pesan WA CS. Tidak ada unggah bukti, tidak ada kwitansi (grep kwitansi/receipt/invoice di `src/` publik kosong) | Traveloka/Tiket: halaman "Cara bayar" dengan nomor rekening, tombol salin, batas waktu, unggah bukti, e-receipt | Halaman `/cara-bayar` (rekening dari `website_settings`, tombol salin, pengingat "hanya rekening PT"), tautan dari halaman sukses, paket, dan WA. Opsi unggah bukti transfer di halaman status | M |
| PUB-012 | P1 | G | Pengungkapan sebelum berkomitmen | Halaman paket (diuji produksi, teks halaman) tidak memuat DP, cicilan, lunas, refund. Non-refundable hanya di label persetujuan `RegistrationForm.tsx:415`, bukan di bagian "Perkiraan biaya" (`:372-386`). Syarat paspor 12 bulan: tampil di `/lengkapi` sesudah DP (`manifestForm.ts:116-123`) dan `/syarat-umroh`; `TentangKami.tsx:332` menulis "Min. 8 bulan" (salah). Halaman Daftar hanya berkata "Data paspor dilengkapi nanti, setelah DP" (`Daftar.tsx:71`) | Traveloka: syarat dan kebijakan tampil di halaman produk sebelum bayar; Permenag: biaya dan syarat dijelaskan di muka | Tambahkan kartu "Cara bayar dan syarat" di halaman paket dan form: DP Rp 5 jt/orang tidak dikembalikan, cicilan bebas, lunas H-30, paspor minimal 12 bulan setelah berangkat. Koreksi 8 bulan menjadi 12. Tanyakan paspor/tanggal kedaluwarsa di tahap 1 dengan peringatan | S |
| PUB-013 | P1 | G | Klaim tidak berlaku untuk semua paket | `src/hooks/useHomepageData.tsx:61-149` memuat 5 testimoni cadangan fiktif (Budi Santoso dst.) yang tampil bila tabel kosong atau error; `:156` "100% PASTI BERANGKAT ... block seat"; `:166` "Hotel Bintang 4/5", "Zam-zam 5 liter", seragam; `:176` "Zamzam Tower 0-100 m". Produksi: meta deskripsi beranda dari `page_seo`: "Paket umroh mulai 20 jutaan ... Hotel bintang 5" sementara harga terendah 27,9 jt (feed) dan JSON-LD `priceRange` Rp 27,9 sampai 50,9 jt. Title beranda hidup: "Terpercaya 2025" | PRODUCT.md prinsip 3 "tidak ada klaim yang tidak berlaku untuk semua paket". Pedoman iklan travel (OJK/Kemenag): klaim harus dapat dibuktikan | Hapus data cadangan fiktif (tampilkan kosong atau sembunyikan seksi). Revisi FAQ ke teks yang benar untuk semua paket. Perbarui `page_seo` beranda (tahun, "mulai 27,9 juta", hapus "hotel bintang 5") | S |
| PUB-014 | P1 | G | Bukti kepercayaan | Angka keras: `HeroSection.tsx:101` "3000+ Jamaah Puas", `JamaahCarousel.tsx:25` animasi ke 3000, `TestimonialsSection.tsx:109-113` "5.0" dan "290+ ulasan". `WhyChooseSection` produksi: "3 Tahun Melayani Jamaah" sedangkan fallback `Index.tsx:61` "sejak 2015". Counter `<h2>0+ Jamaah</h2>` terbaca "0" tanpa JS atau sebelum animasi. `TrustElements.tsx` berisi placeholder "Tempat Foto Sertifikat" (tidak dipakai) | Booking.com: skor ulasan ditarik otomatis dan dapat diverifikasi | Ambil angka dari `website_settings` (jumlah jamaah dari DB atau hapus), ambil skor ulasan Google dengan tanggal pembaruan, seragamkan tahun berdiri | S |
| PUB-015 | P1 | A, G | Legalitas PPIU | Nomor `17102200953750002` hanya di `SyaratUmroh.tsx:95` dan portal agen (`AgentSalesGuide.tsx:89`). Kolom `website_settings.ppiu_license_number` ada (migrasi `20260720073806`) tetapi tidak dibaca situs publik (grep). Footer (`Footer.tsx`) tanpa alamat, telepon, email, PPIU, `/kalkulator`, `/syarat-umroh`, `/agent/register`. Tidak ada tautan ke pengecekan Kemenag | Praktik travel umroh: nomor SK PPIU, tanggal, dan tautan verifikasi Kemenag di footer dan halaman Tentang; Permenag 13/2021 mewajibkan pencantuman izin | Footer: "PT Musa Amanah Wisata, PPIU No. ..., tautan Cek di Kemenag", alamat, telepon, email, jam kerja. Tampilkan juga JSON-LD `identifier`. Tambahkan foto SK PPIU di halaman Tentang | S |
| PUB-016 | P1 | G | Konsistensi harga dan aturan | `src/lib/calcConfig.ts:9-14` harga tetap Hemat 28,9 jt, Nyaman 33,4 jt, Pelataran 33,9 jt, Five-star 41,4 jt menimpa DB (`useCalculatorPackages.ts:69,76`). Daftar produksi (feed): Hemat 27,9 sampai 35,9 jt, Nyaman 29,9 sampai 39,9 jt, Five-star 38,9 sampai 43,9 jt. `umrohCalc.ts:7` `PELUNASAN_DAYS_BEFORE = 40`, aturan sebenarnya H-30 | Satu sumber kebenaran harga; Traveloka tidak menampilkan angka berbeda per halaman | Ambil harga terendah per tier dari paket terbit, ubah ke 30 hari, tampilkan "estimasi, harga final sesuai tanggal" | S |
| PUB-017 | P1 | F | Tautan `/lengkapi/:token` | Token 64 hex tidak pernah kedaluwarsa (`20261003100000_jamaah_manifest_fields.sql:32-36`, tidak ada kolom kedaluwarsa), tanpa OTP. `GET /api/lengkapi?token=` mengembalikan NIK, paspor tersimpan (`functions/api/lengkapi.ts:79-86`). Tautan dibagikan lewat WA; tag pihak ketiga merekam URL (PUB-002). Pembaruan service worker otomatis (`vite.config.ts:17` autoUpdate) dapat memuat ulang saat mengetik, dan isian tidak disimpan lokal | OWASP: tautan bearer harus kedaluwarsa dan dapat dicabut. Praktik e-visa: akses data identitas butuh verifikasi tambahan | Kedaluwarsa (mis. 30 hari setelah keberangkatan atau setelah semua lengkap), tombol cabut/terbitkan ulang di admin, verifikasi ringan (4 digit akhir HP) sebelum menampilkan NIK/paspor, simpan draf lokal | M |
| PUB-018 | P1 | E | Navigasi dasar | Tidak ada skip link (grep). `Navbar.tsx:217` merender `<nav>` lewat `createPortal(..., document.body)`: produksi urutan `body` = `noscript, script, #root, script, button(FAB), nav`, sehingga `<nav>` paling akhir untuk fokus keyboard dan pembaca layar. `Navbar.tsx:94-99` dan `Footer.tsx:52-54`: nama tautan logo hanya `aria-label` pada `<div>` tanpa role (tautan tanpa nama). `<nav>` tanpa label. Tidak ada `<main>` di `Index`, `PaketUmroh`, `Galeri`, `Artikel`, `Kontak`, `JadwalUmroh` (grep). Tidak ada `scroll-padding-top` untuk navbar tetap | WCAG 2.2: 2.4.1 Bypass Blocks (A), 1.3.2 dan 2.4.3 urutan bermakna dan fokus (A), 2.4.4 tujuan tautan (A), 2.4.11 fokus tidak tertutup (AA) | Render nav di dalam pohon halaman (bukan portal ke akhir body) atau tambahkan `order`/DOM sebelum `#root`; tambah `<a href="#isi">Lewati ke konten</a>`; beri `<Link aria-label>`; bungkus konten dengan `<main id="isi">`; `scroll-padding-top: 5rem` | S |

### P2

| ID | Sev | Area | Titik sentuh | Evidence | Standar | Saran | Effort |
|---|---|---|---|---|---|---|---|
| PUB-019 | P2 | A | Daftar paket: sort dan filter | `PaketUmroh.tsx:35-39,56-67`: state filter lokal (hilang saat Kembali), tanpa sort harga, tanpa jumlah hasil, tanpa rentang harga; kartu `PackageCard.tsx` menampilkan "27,9 Jt" tanpa "mulai dari / orang / Quad" | Traveloka/Tiket: sort (harga, tanggal), filter harga, jumlah hasil, filter tersimpan di URL | Sinkronkan filter ke `?bulan=&maskapai=`, tambah sort dan "N paket ditemukan", label harga | M |
| PUB-020 | P2 | A | Detail paket: kelengkapan | Itinerary hanya bila data ada; tanpa FAQ paket, jam terbang, bagasi, pembanding; "Keranjang" hanya favorit tanpa halaman bandingkan. `CHILD_PRICE=25 jt` dan `INFANT_PRICE=15 jt` konstanta untuk semua paket (`roomCombos.ts:5-6`) tampil di form dan pesan WA | Booking.com: perbandingan dan rincian lengkap | Tambah FAQ per paket, bagasi, jam terbang, harga anak per paket di DB | M |
| PUB-021 | P2 | A | Form daftar: kelengkapan | `RegistrationForm.tsx`: tanpa autosave, tanpa kolom email, tanpa SLA ("CS akan menghubungi", tanpa jam), tanpa tombol salin kode (`:220`), tanpa ringkasan galat, `FieldError` persetujuan dan gender tidak ditautkan `aria-describedby` (`:318,402,409`). Turnstile gagal dimuat hanya menampilkan galat (`Turnstile.tsx:70`) tanpa jalur WA | WCAG 3.3.1, 4.1.3; Typeform/Tiket: simpan draf | Simpan draf di `localStorage`, tambahkan SLA "dibalas dalam 1 x 24 jam kerja", tombol salin kode, ringkasan galat di atas form, `aria-describedby` | M |
| PUB-022 | P2 | A | Lengkapi: UX unggah dan penutup | `Lengkapi.tsx:79-95`: tanpa `capture`, tanpa pratinjau, kompresi (`utils/imageCompression.ts` ada tetapi tidak dipakai), progres, atau percobaan ulang; 10 MB foto ponsel di jaringan lambat. Tidak ada status akhir "Data lengkap, tim memverifikasi" atau langkah berikut; tanpa peringatan perubahan belum disimpan; satu tombol simpan per peserta | KYC mobile: ambil foto kamera, pratinjau, kompres | Tombol "Ambil foto" (`capture="environment"`), pratinjau kecil, kompres klien ke 1600 px, kartu penutup "Langkah berikutnya", persen total | M |
| PUB-023 | P2 | B | Notifikasi ke CS dan owner | Hanya bel in-app: pendaftaran masuk (`20261006090000_notification_meta.sql:102`), agen pending (`:22`), penarikan komisi (`20261006110000_agent_admin_tools.sql:107`). Realtime hanya bila panel admin terbuka (`useAdminNotifications.tsx:86`); tanpa email, WA, atau push. Tidak ada notifikasi untuk pembayaran yang perlu diverifikasi owner | Praktik helpdesk: email atau WA ke petugas | Kirim ringkasan ke grup WA/email CS dan owner (pendaftaran baru, pembayaran menunggu verifikasi, ringkasan harian) | M |
| PUB-024 | P2 | C | Error boundary | `ErrorBoundary.tsx:71-78` menampilkan `error.message` dan 3 baris `stack` kepada pengunjung di produksi; satu boundary di akar (`App.tsx:289`), tombol "Coba Lagi" hanya mengatur ulang state; teks formal "Anda" dan "Terjadi Kesalahan" tidak sesuai nada "kamu" (PRODUCT.md) | Pesan galat tanpa istilah teknis (PRODUCT.md "Nada tulisan"); Sentry/error ID | Sembunyikan stack di produksi, kirim ke log, tampilkan kode galat singkat dan tombol WA; pasang boundary per rute | S |
| PUB-025 | P2 | C | Service worker | `vite.config.ts:17` `autoUpdate` (produksi `sw.js` memakai `skipWaiting` dan `clientsClaim`), tanpa pemberitahuan "versi baru". `:48-57` StaleWhileRevalidate 30 menit untuk `packages` (harga/seat) sehingga data paket dari cache dapat basi tanpa pembaruan UI. 151 entri precache termasuk `xlsx` 412 KB (hanya admin). Navigasi `NavigationRoute` hanya mengecualikan `/artikel`, `/sitemap.xml`, `/robots.txt`; `/meta-product-feed.csv`, `/flyer-image`, `/api/*` untuk navigasi mendapat shell | Workbox: prompt update; harga adalah data yang tidak boleh basi | `registerType: "prompt"` dengan toast "Versi baru, muat ulang"; NetworkFirst untuk `packages`; `globIgnores` `xlsx`/`BarChart`; denylist tambahan | S |
| PUB-026 | P2 | D | Feed katalog Meta | `https://musafartour.com/meta-product-feed.csv`: 33 baris, 12 berangkat Juni sampai September 2026, salah satu (`Umroh Pelataran Hemat - 30 Jun 2026`) berstatus `in stock` | Meta catalog: item kedaluwarsa menurunkan kualitas iklan dinamis | Filter `departure_date >= today` di `functions/meta-product-feed.csv.ts` | S |
| PUB-027 | P2 | F | Persetujuan tercatat | `functions/_lib/intake.ts:6,108` satu `CONSENT_VERSION="2026-10-tos"` dan satu `consent:true` untuk dua kotak centang (data dan ToS). Teks persetujuan dan hash tidak disimpan. Agen menyatakan "Jamaah sudah menyetujui" sendiri (`RegistrationForm.tsx:402-415`) tanpa bukti dari jamaah | UU PDP Pasal 22 (bukti persetujuan); GDPR-style consent log | Simpan teks/versi tiap persetujuan terpisah (data, ToS, pemasaran), IP hash dan waktu; untuk jalur agen kirim tautan konfirmasi ke jamaah | M |
| PUB-028 | P2 | F | Lead kalkulator dan klik WA | `UmrohCalculator.tsx` `submitLead` menyimpan nama, WA, UA, referrer langsung dari browser; `BoothLead.tsx` serupa. Tidak ada tautan privasi atau persetujuan (grep kosong). `chatRedirect.ts:30-36` menyimpan isi pesan (berisi nama jamaah) dan `user_agent` di `whatsapp_clicks` | UU PDP Pasal 21 | Tambah teks "Dengan mengirim, kamu setuju ... (tautan Kebijakan Privasi)" dan masa simpan, jangan simpan isi pesan | S |
| PUB-029 | P2 | E | Gerak otomatis tanpa jeda | `PackageRadialCarousel.tsx:74-77` putar 80 detik tanpa henti, hanya bisa digeser (tanpa alternatif keyboard); `AirlinesCarousel.tsx:36`, `JamaahCarousel.tsx:94` marquee; `WhyChooseSection.tsx:61` video YouTube `autoplay=1&loop=1&controls=0` dengan lapisan penutup, bukan `youtube-nocookie`; `Index.tsx:97` tirai intro 1,1 detik layar penuh. `index.css:253-258` hanya menjeda dua marquee saat `prefers-reduced-motion`; `framer-motion` tanpa `MotionConfig`/`useReducedMotion` (grep) | WCAG 2.2.2 Pause, Stop, Hide (A), 2.5.7 alternatif seret (AA), 2.3.3 | Tombol jeda/putar, hormati `prefers-reduced-motion` di seluruh situs (`MotionConfig reducedMotion="user"`), hapus tirai intro | M |
| PUB-030 | P2 | E | Label form Kontak | `Kontak.tsx:182,192,203,214,224`: `<label>` tanpa `htmlFor` dan `<Input>` tanpa `id`; formulir mengumpulkan email tetapi tidak mengirim email: mengalihkan ke WhatsApp (`:44-61`), pengguna yang menutup WA tidak meninggalkan jejak; `{whatsapp}` ditampilkan mentah "6281917403797 (WhatsApp)" (`:157`) tanpa tautan | WCAG 1.3.1, 3.3.2, 4.1.2 | Gunakan `<Label htmlFor>` dan `id`, atau hapus formulir dan pakai WA langsung; format dan tautkan nomor | S |
| PUB-031 | P2 | E | Kontras warna dan batas isian | Bagian 5. Placeholder 3,13:1; `status-ok-text` di kartu 3,84:1; footer `white/40` 3,66:1; bintang hotel `amber-500` 2,15:1 (`PackageCard.tsx:281,288`); batas isian vs latar 1,05 sampai 1,16:1; FAB WA dan tombol WA TentangKami putih di `#25D366` 1,98:1 (`FloatingWhatsApp.tsx:40`, `TentangKami.tsx:392`) | WCAG 1.4.3 (4,5:1), 1.4.11 (3:1 komponen UI) | Gelapkan placeholder (`text-muted-foreground` tanpa `/70`), pakai `status-ok-fg` untuk teks, `amber-700` untuk angka bintang, beri isian garis 3:1 saat tidak fokus, WA hijau `#128C7E`/teks gelap | S |
| PUB-032 | P2 | E | Kartu paket: kontrol | `PackageCard.tsx:190-205` tombol sebelumnya/berikutnya hanya muncul saat hover (`isHovered`), tidak untuk fokus keyboard atau layar sentuh; titik gambar 6 px (`:215`, target kurang dari 24 px); label bahasa Inggris "Previous image", "Next image", "Go to image" (`:195,202,220`) | WCAG 2.1.1, 2.5.8 (24 px), PRODUCT.md prinsip 5 | Tampilkan tombol saat `focus-within`, target 24 px minimum, label Indonesia | S |
| PUB-033 | P2 | E | `pointer-events` patch | `App.tsx:216-233` polling 300 ms di setiap halaman. Akar masalah (terbaca dari `node_modules/@radix-ui/react-dismissable-layer@1.1.10/dist/index.mjs:66-83`): nilai `body.style.pointerEvents` asli disimpan di variabel modul `originalBodyPointerEvents` dan dipulihkan hanya oleh cleanup efek pertama saat `layersWithOutsidePointerEventsDisabled.size === 1`; node baru dihapus dari Set oleh efek terpisah (`:78-84`). Dua lapisan modal bertumpuk (Sheet + Select, mis. filter ponsel `PaketUmroh.tsx:154`) yang dilepas dalam commit atau urutan berbeda membuat pemeriksaan `size === 1` tidak pernah benar sehingga `none` tertinggal. Pola ini cocok dengan laporan upstream Radix, **belum direproduksi di sini** | Praktik: perbaikan sumber, bukan polling | Naikkan `@radix-ui/react-dialog/select/dismissable-layer` ke versi terbaru dan uji ulang; pakai `modal={false}` pada Select di dalam Sheet atau `onCloseAutoFocus` untuk membersihkan; pertahankan guard sebagai jaring pengaman tetapi gunakan listener `pointerdown` bukan polling | M |
| PUB-034 | P2 | D | Data terstruktur | Beranda (hidup): `TravelAgency/Organization`, `FAQPage`, `TravelAgency` footer (diulang di setiap halaman, `Footer.tsx:56`). Paket (`PackageDetail.tsx:240-262`): `Product` + `BreadcrumbList` tetapi `Offer` tanpa `priceValidUntil`, `seller`, `itemCondition`, tanpa `TouristTrip`/`Event` untuk tanggal; JSON-LD hanya setelah JS. Tanpa `geo`, `openingHours`, `identifier` PPIU, `foundingDate`. `BreadcrumbList` hanya di paket (tidak di artikel, hukum, daftar paket). Artikel server-rendered punya JSON-LD (1 blok) | Google rich results | Tambah `priceValidUntil`, `seller`, `TouristTrip`; tambahkan `identifier` PPIU dan `openingHours` ke Organization; breadcrumb untuk seluruh rute | M |
| PUB-035 | P2 | D | Core Web Vitals | Beranda hidup: 61 dari 65 `<img>` tanpa `width`/`height` (risiko CLS); font Onest dari Google Fonts lewat pola `preload ... onload` (`index.html:36-39`) tanpa `size-adjust` fallback; tirai intro (`Index.tsx:97`); 6 jenis tag pihak ketiga pada muat pertama; preload LCP hanya di `/` (`index.html:46-54`), hero 109 KB di 1920. Bundel (dist lokal, bukan build tayang): entry 479 KB mentah, 142 KB gzip; total JS awal sekitar 289 KB gzip. `Index` dan `AdminLayout` diimpor eager (`App.tsx:23-24`) sehingga pengunjung publik ikut mengunduh kode admin. Tidak ada LCP/CLS terukur di audit ini | Google CWV: LCP 2,5 s, CLS 0,1, INP 200 ms | Tambah dimensi gambar, self-host Onest (woff2), lazy-load `AdminLayout`, pantau CWV lewat CrUX/PageSpeed | M |
| PUB-036 | P2 | D | Judul dan deskripsi hidup | Title beranda hidup "Terpercaya 2025" dari `page_seo` (tanggal 6 Okt 2026); statis di HTML "2026". `SEO.tsx:59` `og:url` memakai `window.location.href` (ikut `?ref=` dan parameter UTM) sedangkan canonical bersih; `SEO.tsx:73` canonical hanya bila dikirim. h1 paket sama untuk banyak tanggal (mis. "Umroh Hemat") | Konsistensi title/OG/canonical | Perbarui `page_seo`; `og:url` = canonical; tambahkan tanggal ke h1 paket | S |
| PUB-037 | P2 | A | Pra dan pasca keberangkatan | Tidak ada halaman manasik/jadwal, checklist dokumen, info penerbangan akhir, grup tour leader, atau permintaan ulasan pasca perjalanan. Satu-satunya jejak: ToS "manasik" (`SyaratUmroh.tsx:12`) dan daftar perlengkapan di paket | Praktik travel besar: portal jamaah dengan jadwal, e-ticket, manasik, ulasan | Halaman pribadi pasca-lunas (tautan token) berisi jadwal manasik, checklist, kontak TL; pesan WA permintaan ulasan Google H+3 | L |
| PUB-047 | P2 | A | Tombol WhatsApp | `src/lib/chatRedirect.ts:56` `await getNextCS()` (kueri Supabase) lalu `window.open(url, '_blank')` di `:71`, di luar gestur klik sinkron: Safari iOS dan pemblokir popup dapat memblokirnya, dan fallback `/chat` (`:60`) juga `window.open`. Rotasi CS dimatikan: selalu nomor pertama (`whatsappRotation.ts:76-80`). **Tidak diuji di perangkat** | Tombol WA standar adalah tautan `<a href="https://wa.me/...">` sinkron (Traveloka, Tokopedia) | Gunakan `<a href>` dengan nomor yang sudah dimuat sebelumnya (prefetch `whatsapp_cs`), catat klik secara fire-and-forget | S |

### P3

| ID | Sev | Area | Titik sentuh | Evidence | Standar | Saran | Effort |
|---|---|---|---|---|---|---|---|
| PUB-038 | P3 | D | robots.txt | Berisi pola situs lama (`/apotek /kauman /author/ /kemitraan /kantor`). Tidak ada `Disallow` untuk `/lengkapi/`, `/daftar/`, `/api/`, `/styleguide`; `noindex` hanya lewat JS (`App.tsx:173-175`). `/admin` dan `/agent/*` jawaban 200 tanpa header `X-Robots-Tag`; karena robots memblokir crawl, Google tidak melihat `noindex` | Google: jangan memblokir sambil mengandalkan `noindex` | `X-Robots-Tag: noindex` lewat `_headers` untuk path privat, bersihkan pola lama | S |
| PUB-039 | P3 | D | sitemap.xml | `functions/sitemap.xml.ts:4-15`: tidak memuat `/syarat-umroh`, `/agent/register`; artikel memakai `created_at` untuk `lastmod`; tanpa sitemap gambar. 39 URL, valid | sitemaps.org | Tambah dua URL, pakai `updated_at` | S |
| PUB-040 | P3 | D | Manifest PWA | Dua manifest ditautkan: `/site.webmanifest` (`name:""`, `index.html:81`) dan `/manifest.webmanifest` (`lang:"en"`, `theme_color:#c22543` bukan `#CC002D`, ikon `maskable` memakai gambar yang sama dengan `any`). Tanpa `<meta name="theme-color">` | web.dev installable | Hapus `public/site.webmanifest`, isi `lang:"id"`, theme `#CC002D`, ikon maskable dengan safe zone | S |
| PUB-041 | P3 | C | 5xx, offline, maintenance | Function mengembalikan JSON saat error (`daftar.ts`, `lengkapi.ts`); tidak ada halaman 5xx, offline (SW tanpa fallback navigasi offline selain shell), atau mode maintenance (grep kosong). Kedaluwarsa sesi: `useAgentAuth.tsx:98` hanya menangani `SIGNED_OUT` | Standar produksi | Halaman offline di SW, banner maintenance dari `website_settings` | M |
| PUB-042 | P3 | C | Paket tidak ditemukan, berangkat, penuh | `PackageDetail.tsx:206-221` keadaan "tidak ditemukan" tanpa `<SEO noindex>` dan tanpa status 404; `Daftar.tsx:51-66` sama. Paket penuh: halaman paket menyembunyikan "Daftar" dan menawarkan waitlist WA (`PackageCtaButtons.tsx:60-66`), sedangkan `/daftar` menerima pendaftaran penuh sebagai daftar tunggu (`RegistrationForm.tsx:243`): perilaku tidak konsisten | Konsistensi | Satu perilaku waitlist (form `/daftar` dengan label daftar tunggu) | S |
| PUB-043 | P3 | D | Redirect lama | `useRedirects.tsx` hanya redirect sisi klien dari tabel `redirects`, tanpa 301 server; pola URL lama di robots menandakan ada tautan masuk | SEO migrasi | Pindahkan ke `_redirects` (301) | S |
| PUB-044 | P3 | G | Bahasa dan label | `PackageCtaButtons.tsx:119` "Share" (DESIGN.md: tidak ada "Share"), tombol "Keranjang" (`:109`) berarti favorit; `Navbar.tsx` "Keranjang belanja" untuk daftar simpan, tanpa checkout | PRODUCT.md prinsip 5 | Ganti "Bagikan" dan "Simpan" | S |
| PUB-045 | P3 | H | Pelacak dan CSP | Konsol produksi: dua pelanggaran CSP `connect-src` untuk `https://k6-e4e4….ecs.us-west-1.on.aws/events` dan `https://bded…run.app/events` (endpoint server-side GTM) pada setiap muat; `script-src 'unsafe-inline'` (`_headers`) | CSP Level 3 | Tambahkan domain tersebut bila memang dipakai atau hapus tag di GTM; ganti `unsafe-inline` dengan nonce bila memungkinkan | S |
| PUB-046 | P3 | A | Kontak | `Kontak.tsx:22` email fallback `musafartour@gmail.com` untuk PT; `GoogleMap.tsx:33` `window.open` tanpa `noopener`; embed peta hanya di `/kontak` | Trust | Email domain perusahaan | S |

---

## 4. Matriks pesan transaksional

Legenda implementasi: Otomatis = dikirim sistem tanpa tindakan manusia. Manual = disiapkan sistem, dikirim manusia (tautan `wa.me` atau tombol). In-app = hanya terlihat saat login. Tidak ada = tidak ditemukan di kode, DB trigger, `supabase/functions`, atau `functions/api`.

| # | Penerima | Pesan | Standar | Saluran saat ini | Status | Evidence |
|---|---|---|---|---|---|---|
| 1 | Jamaah | Pendaftaran diterima + kode | Email/WA otomatis | Layar sukses saja. Tombol "Chat CS" (inisiatif jamaah) | Sebagian | `RegistrationForm.tsx:206-232` |
| 2 | Jamaah | Pendaftaran diterima CS + instruksi DP + tautan `/lengkapi` | WA/email otomatis | WA manual dari admin | Manual | `JamaahIntake.tsx:51-62` |
| 3 | Jamaah | Pendaftaran ditolak / seat penuh / waitlist | WA/email | Templat generik tanpa isi penolakan | Manual | `JamaahIntake.tsx:60-61` |
| 4 | Jamaah | Data tahap 2 lengkap, menunggu verifikasi | Layar + email/WA | Tidak ada | Tidak ada | `Lengkapi.tsx` tanpa penutup |
| 5 | Jamaah | DP/pembayaran diterima dan diverifikasi (kwitansi) | Email/WA + PDF | Tidak ada | Tidak ada | grep kwitansi/receipt kosong |
| 6 | Jamaah | Pengingat sisa bayar (H-45, H-35, H-30) | Terjadwal otomatis | WA manual per jamaah dari `JamaahFinance`, tanpa jadwal | Manual | `jamaah.ts:294-313`, `JamaahFinance.tsx:275` |
| 7 | Jamaah | Lunas dikonfirmasi | Email/WA | Tidak ada | Tidak ada | |
| 8 | Jamaah | Info keberangkatan (manasik, jadwal, penerbangan, TL, checklist) | WA/email + halaman | Tidak ada | Tidak ada | |
| 9 | Jamaah | Pembatalan/refund diproses | Email/WA | Tidak ada (kolom `refund_amount` hanya di admin) | Tidak ada | `jamaahHistory.ts:46` |
| 10 | Jamaah | Permintaan ulasan pasca perjalanan | WA H+3 | Tidak ada | Tidak ada | |
| 11 | Agen | Konfirmasi email pendaftaran | Email Indonesia | Supabase Auth, templat dan SMTP tidak dapat diverifikasi | Otomatis (tidak terverifikasi) | `useAgentAuth.tsx:155`, `20261006100000_agent_registration.sql:3` |
| 12 | Agen | Disetujui admin | WA/email | WA manual dengan `approvedMessage` | Manual | `AgentManagement.tsx:174` |
| 13 | Agen | Ditolak / data kurang | WA/email | WA manual `helperMessage` | Manual | `AgentDetailDialog.tsx:269` |
| 14 | Agen | Jamaah binaan diterima/ditolak CS | Notifikasi | Status di portal saja | In-app | `AgentMyJamaah.tsx` |
| 15 | Agen | Komisi dikreditkan saat jamaah lunas | Notifikasi | Angka di portal saja | In-app | `AgentCommission.tsx` |
| 16 | Agen | Penarikan dibayar | Notifikasi | Status di portal, WA manual dari admin | Manual | commit dff0c95 |
| 17 | Agen | Reset password | Email Indonesia | Supabase Auth | Otomatis (tidak terverifikasi) | `AgentForgotPassword.tsx:27` |
| 18 | CS | Pendaftaran masuk baru | WA/email/push | Bel admin realtime, hanya saat panel terbuka | In-app | `20261006090000_notification_meta.sql:102`, `useAdminNotifications.tsx:86` |
| 19 | CS/Owner | Agen baru menunggu | Email/WA | Bel admin | In-app | `20261006090000_notification_meta.sql:22` |
| 20 | Owner | Permintaan penarikan komisi | Email/WA | Bel admin | In-app | `20261006110000_agent_admin_tools.sql:107` |
| 21 | Owner | Pembayaran menunggu verifikasi | Email/WA | Tidak ada pemicu ditemukan | Tidak ada | |
| 22 | Owner | Ringkasan harian (seat tinggal sedikit, tunggakan, lead baru) | Email/WA | Tidak ada. Cron hanya sinkron seat | Tidak ada | `20260718170000_daily_seat_sync_cron.sql` |
| 23 | Tim | Undangan anggota tim | Email Indonesia | Supabase invite (`inviteUserByEmail`) | Otomatis (tidak terverifikasi) | `manage-team/index.ts:101` |

---

## 5. Hasil kontras warna

Dihitung dari token HSL di `src/index.css:10-100` (rumus WCAG 2.x, skrip di scratchpad). Ambang: 4,5:1 teks normal, 3:1 teks besar dan komponen UI.

| Pasangan | Foreground | Background | Rasio | Ambang | Hasil |
|---|---|---|---|---|---|
| `text-foreground` / background | #262626 | #F2F3F3 | 13,52 | 4,5 | Lulus |
| `text-muted-foreground` / background | #595959 | #F2F3F3 | 6,25 | 4,5 | Lulus |
| `text-muted-foreground` / card putih | #595959 | #FFFFFF | 6,98 | 4,5 | Lulus |
| `text-muted-foreground` / muted dan field | #595959 | #EDEEEE | 5,98 | 4,5 | Lulus |
| Putih / `--brand` (tombol crimson) | #FFFFFF | #CC0030 | 5,82 | 4,5 | Lulus |
| Putih / `--brand-press` (hover) | #FFFFFF | #A80027 | 7,77 | 4,5 | Lulus |
| `--brand` sebagai teks / background | #CC0030 | #F2F3F3 | 5,22 | 4,5 | Lulus |
| `--brand` / `--brand-soft` | #CC0030 | #FAE5EA | 4,84 | 4,5 | Lulus |
| Putih / `--destructive` | #FFFFFF | #971127 | 8,63 | 4,5 | Lulus |
| `--destructive` / `status-bad-bg` | #971127 | #FEE1E1 | 7,04 | 4,5 | Lulus |
| Badge ok fg / bg | #064C39 | #D1FAE5 | 8,82 | 4,5 | Lulus |
| Badge warn fg / bg | #76350F | #FEF3C8 | 8,29 | 4,5 | Lulus |
| Badge info fg / bg | #064A6F | #E1F3FE | 8,25 | 4,5 | Lulus |
| Badge over fg / bg | #4B1D95 | #ECE7FE | 9,07 | 4,5 | Lulus |
| Badge bad fg / bg | #811D1D | #FEE1E1 | 8,05 | 4,5 | Lulus |
| `status-ok-text` / card putih (angka inline) | #059467 | #FFFFFF | 3,84 | 4,5 | **Gagal** |
| `status-ok-text` / background | #059467 | #F2F3F3 | 3,45 | 4,5 | **Gagal** |
| `status-ok-text` / `status-ok-bg` | #059467 | #D1FAE5 | 3,39 | 4,5 | **Gagal** |
| `status-warn-text` / card | #B35309 | #FFFFFF | 5,04 | 4,5 | Lulus |
| `status-warn-text` / background | #B35309 | #F2F3F3 | 4,52 | 4,5 | Lulus (batas tipis) |
| `status-warn-text` / `status-warn-bg` | #B35309 | #FEF3C8 | 4,53 | 4,5 | Lulus (batas tipis) |
| `status-bad-text` / card | #BA1C1C | #FFFFFF | 6,41 | 4,5 | Lulus |
| Placeholder `muted-foreground/70` / field | #868686 | #EDEEEE | 3,13 | 4,5 | **Gagal** |
| Placeholder `muted-foreground/70` / card | #868686 | #FFFFFF | 3,41 | 4,5 | **Gagal** |
| Footer `white/60` / `--primary` | #A8A8A8 | #262626 | 6,37 | 4,5 | Lulus |
| Footer `white/40` ("Made by Musawara") / `--primary` | #7D7D7D | #262626 | 3,66 | 4,5 | **Gagal** |
| Angka bintang hotel `amber-500` / card putih | #F59E0B | #FFFFFF | 2,15 | 4,5 | **Gagal** |
| Putih / `#25D366` (FAB WA dan tombol TentangKami) | #FFFFFF | #25D366 | 1,98 | 3 (ikon), 4,5 (teks) | **Gagal** |
| Putih / emerald-600 (tombol keranjang aktif, ikon) | #FFFFFF | #059669 | 3,77 | 3 | Lulus (ikon) |
| Slate-400 / muted (placeholder sertifikat, tidak dipakai) | #94A3B8 | #EDEEEE | 2,20 | 4,5 | Gagal (kode mati) |
| Batas isian `--field` / background (1.4.11) | #EDEEEE | #F2F3F3 | 1,05 | 3 | **Gagal** (tanpa garis saat tidak fokus) |
| Batas isian `--field` / card putih | #EDEEEE | #FFFFFF | 1,16 | 3 | **Gagal** |
| Garis outline `--input` #CCC / background | #CCCCCC | #F2F3F3 | 1,44 | 3 | Gagal (tombol bergaris punya label teks, risiko rendah) |
| Fokus isian: border `--foreground` / field | #262626 | #EDEEEE | 12,93 | 3 | Lulus |

Catatan: DESIGN.md menyebut abu teks #989999, tetapi token kode `--muted-foreground` adalah `0 0% 35%` (#595959) yang lulus. Token `--brand` terhitung #CC0030, bukan #CC002D di DESIGN.md (selisih tak terlihat).

---

## 6. Hasil smoke produksi (curl, 6 Okt 2026)

| Uji | Hasil | Catatan |
|---|---|---|
| `http://musafartour.com/` | 301 ke `https://musafartour.com/` | Benar |
| `https://www.musafartour.com/` dan `http://www...` | **404**, header `x-lovable-serve-error: custom_domain_not_connected` | PUB-010 |
| Header `/` | HSTS `max-age=31536000; includeSubDomains`, CSP penuh, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `cache-control: public, max-age=0, must-revalidate` | Baik. CSP memuat `'unsafe-inline'` pada script |
| Aset hash `/assets/*` | `cache-control: public, max-age=31536000, immutable`, `content-encoding: br` | Baik |
| Rute utama (`/`, `/paket-umroh`, `/jadwal-umroh`, `/kalkulator`, `/tentang-kami`, `/galeri`, `/kontak`, `/artikel`, `/kebijakan-privasi`, `/syarat-ketentuan`, `/syarat-umroh`, `/daftar/umroh-hemat-2026-10-11`, `/lengkapi/invalid-token-123`, `/agent/register`, `/agent/login`) | Semua 200, 0,09 sampai 0,15 s (artikel 0,88 s) | Cangkang SPA 6787 B untuk semua kecuali `/artikel` |
| 10 URL paket dari sitemap | 10 dari 10 HTTP 200 (0,11 sampai 0,17 s), semuanya cangkang SPA yang sama (6787 B) | Meta per paket tidak ada di HTML awal (PUB-008) |
| URL tidak dikenal (`/halaman-ngaco`, `/paket-umroh/slug-tidak-ada`, `/cek-status`, `/haji`, `/faq`, `/llms.txt`, `/.well-known/security.txt`) | Semua 200 HTML | Soft 404 (PUB-009) |
| `/artikel/slug-ngawur` | 404 "Artikel tidak ditemukan" | Benar (server-rendered) |
| `/artikel/tips-memilih-travel-umroh-terpercaya` | 200 SSR: title, canonical, og:image, 1 h1, 1 JSON-LD | Baik |
| `/admin`, `/agent/dashboard`, `/auth` | 200 cangkang SPA, tanpa `X-Robots-Tag`; `noindex` hanya lewat JS; disallow di robots | PUB-038 |
| `/robots.txt` | 200, `Sitemap:` benar, `Disallow: /admin /agent/ /auth /booth /flyer-print /packages /kalkulator/hasil/ /chat /s/ /l/ /r/ /set-password`; `Allow: /agent/register` | Pola situs lama tersisa |
| `/sitemap.xml` | 200 `application/xml`, 39 URL (10 statis, 21 paket mendatang, 8 artikel), XML valid | Tanpa `/syarat-umroh`, `/agent/register` |
| `/meta-product-feed.csv` | 200, 33 baris, 12 paket sudah berangkat, 1 berstatus `in stock` | PUB-026 |
| `/flyer-image` | 401 | Dilindungi |
| `GET /api/lengkapi?token=aaaa…(64)` (Origin musafartour.com) | 404 `{"ok":false,"error":"Link tidak valid."}` | Baik |
| `/favicon.ico`, `/favicon-32x32.png`, `/apple-touch-icon.png`, `/android-chrome-192x192.png`, `/android-chrome-512x512.png`, `/og-default.jpg`, `/logo.webp` | Semua 200 | OK |
| `/site.webmanifest` dan `/manifest.webmanifest` | Keduanya 200 (dua manifest berbeda); `/manifest.json` 200 HTML | PUB-040 |
| `/sw.js`, `/registerSW.js` | 200; `sw.js` memakai `skipWaiting`+`clientsClaim`, 151 entri precache | PUB-025 |
| Kunjungan pertama beranda di browser | Cookie `_ga _ga_070JY2Y6P9 _clck _clsk _fbp _tt_enable_cookie _ttp ttcsid`; skrip tiktok (3), fbevents, clarity (2), gtm, gtag, cloudflareinsights; 2 galat CSP dari GTM | PUB-002, PUB-045 |

---

## 7. Yang sudah baik

- Header keamanan lengkap dan konsisten; HTTPS dipaksa; aset hash `immutable`.
- Form `/daftar`: validasi sama di klien dan server (`intakeForm.ts` cermin `functions/_lib/intake.ts`), honeypot, Turnstile, batas ukuran dan Origin, galat dalam Bahasa Indonesia, fokus ke kolom yang salah, target sentuh 44 px, persetujuan DP non-refundable ada sebelum kirim.
- Kejujuran: kalimat "Mengirim form belum berarti seat terkunci", seat dari data, `Harga dapat menyesuaikan kurs` diungkap.
- Dokumen KTP/paspor/foto di bucket privat; hanya admin dan cs_admin yang bisa membaca (`20261001090100:585-594`); unggah diperiksa dari isi file (sniff), bukan klaim browser; token diperiksa sebelum menyimpan.
- Event pelacakan tidak membawa PII (nama, nomor, NIK) dan staf dikecualikan lewat `markInternalBrowser`.
- Artikel server-rendered dengan title, canonical, OG, JSON-LD, 404 benar; sitemap dinamis dan sehat.
- Detail paket: jarak hotel dalam meter dan menit jalan, daftar termasuk/tidak termasuk, harga per tipe kamar, seat jujur, paket sudah berangkat memakai `noindex` dan CTA lain.
- Ulasan Google asli, nama dan tanggal nyata, tampil di beranda dan paket.
- `lang="id"`, hero LCP diberi `width/height`, `fetchpriority`, dan preload responsif; `jsonForScript` mencegah injeksi `</script>`.

---

## 8. Yang tidak dapat diverifikasi

- Templat dan SMTP Supabase Auth (bahasa, pengirim, batas kirim), konfigurasi Clarity (mode masking), isi kontainer GTM (tag apa yang berjalan, potensi GA4 ganda dengan injeksi `useMarketingPixels`), setelan Cloudflare (aturan redirect, cache), isi tabel produksi (`testimonials`, `faq_items`, `page_seo`, `website_settings`) selain yang tampak di halaman.
- Meta, OG, dan JSON-LD paket di DOM hidup: panel browser `hidden` sehingga pembaruan `react-helmet-async` (memakai `requestAnimationFrame`) tidak berjalan. Dinilai dari kode dan dari HTML awal (`curl`).
- Popup WhatsApp diblokir di iOS Safari (PUB-047, dinilai dari kode `chatRedirect.ts:56-71`, tidak diuji di perangkat); LCP/CLS/INP terukur; build `dist/` lokal berbeda dari produksi.
- Kemungkinan TikTok dimuat dua kali (`index.html` tertunda 2 detik vs `useMarketingPixels`) tidak terbukti.
