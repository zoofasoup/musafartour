# Audit 04: Situs publik dan titik sentuh sistem (audit ulang)

Tanggal: 8 Oktober 2026. Kode: `/Users/macbookair/.gemini/antigravity/scratch/musafartour`, branch main, HEAD `664f9c4`. Produksi: https://musafartour.com.
Metode: baca kode, `curl` GET/HEAD ke produksi, `npm run build` baru, SOP bertanda tangan (`/Users/macbookair/Downloads/SOP AGEN MUSAFAR.pdf`, 25 bagian, diekstrak dengan pdftotext), dan pemeriksaan browser (bagian 7). Tidak ada perubahan kode aplikasi, tidak ada POST ke produksi.
Bukti bahwa produksi = kode saat ini: entry bundle produksi `index-BbfMIqbn-v2.js` sama persis dengan hasil build lokal hari ini.

---

## 1. Ringkasan

1. Dari 47 temuan audit 03: **5 Fixed, 5 Partially, 2 butuh keputusan pemilik, 35 Open** (dua di antaranya, PUB-007 dan PUB-045, tidak bisa diverifikasi dari sini). Temuan baru: **17** (P0 0, P1 3, P2 9, P3 5).
2. Perbaikan terbesar yang terverifikasi: tombol "Daftar Sekarang" di bar bawah ponsel (PUB-001), `/cek-status` dan `/cara-bayar` hidup, blok "Pembayaran fleksibel" di halaman paket, 404 sungguhan dengan `noindex` untuk rute dan slug paket tak dikenal (curl: `/halaman-ngaco`, `/paket-umroh/slug-tidak-ada`, `/llms.txt`, `/manifest.json` semua 404), pelacak dan token tidak lagi menyentuh `/lengkapi`, `/daftar`, `/cek-status`.
3. **Dua P0 lama tetap terbuka karena keputusan pemilik**: kebijakan pembatalan ganda (PUB-003) dan kebijakan privasi lama yang belum mencakup data sensitif (PUB-004, draf sudah ada tetapi belum tayang).
4. **Persetujuan pelacak belum ada** dan kini ditambah jalur server-side (Meta CAPI mengirim IP dan user agent walau pengunjung memblokir piksel) (PUB-101).
5. **`/sop-agen` adalah ringkasan, bukan SOP yang ditandatangani**, tetapi agen "menyetujui SOP/AGEN/001 v01" lewat halaman itu; kewajiban lead, perlindungan 30 hari, pembagian komisi antar agen, target tahunan, dan aturan konten tidak tertulis di sana (PUB-102). Ada juga satu SLA dan satu batas tingkat yang tidak sesuai SOP (PUB-104).
6. Klaim "Haji" di h1, title, dan manifest tanpa izin PIHK yang tampil dan tanpa paket haji (PUB-103).
7. Cacat tampilan yang langsung memengaruhi konversi: harga di bar bawah ponsel terpotong "Rp 27.900.0…" pada 375 px (PUB-108); `/cek-status` menampilkan "Data belum lengkap, buka link pribadi" sebelum DP, padahal link baru dikirim setelah DP (PUB-109).
8. Pelacakan Meta: Contact di setiap tap WhatsApp terkirim sekali (dedupe 4 detik antara pendengar global dan handler tombol) dan tidak ada peristiwa di rute privat; pada tap pertama seseorang, Lead dan Contact keduanya terkirim (dua peristiwa berbeda; jangan jadikan keduanya konversi dalam satu set iklan). Tetapi Lead pendaftaran tertelan dedupe 7 hari milik tap WhatsApp (PUB-106), `/meta-capi` tanpa batas laju (PUB-105), dan GA4/TikTok berpotensi dimuat ganda (PUB-107).
9. Tidak berubah: tidak ada skip link, `<nav>` tetap terakhir di DOM, delapan halaman tanpa `<main>`, kontras gagal pada 6 pasangan (bagian 5), nomor PPIU tidak di footer, "3000+" dan "290+ ulasan" keras, `www` 404, pratinjau tautan paket generik, feed Meta memuat 12 paket yang sudah berangkat.
10. Produksi sama dengan HEAD (hash bundel `index-BbfMIqbn-v2.js` identik dengan `npm run build` hari ini), jadi seluruh temuan kode berlaku di produksi.

### Skor A-H (0 sampai 5), dibanding audit 03

| Area | Audit 03 | Audit 04 | Perubahan dan alasan |
|---|---|---|---|
| A. Perjalanan publik | 2 | 3 | +1: CTA daftar di ponsel, cek status, cara bayar, blok pembayaran. Masih: tanpa autosave, tanpa unggah bukti, tanpa pra/pasca keberangkatan, harga terpotong |
| B. Titik sentuh sistem | 1 | 2 | +1: jamaah kini bisa menarik status sendiri. Tetap tidak ada satu pun pesan otomatis ke jamaah, agen, CS, atau owner |
| C. Halaman galat dan tepi | 2 | 3 | +1: 404 nyata, redirect server, noindex. Masih: error boundary menampilkan stack, tanpa halaman offline/5xx, Turnstile gagal tanpa jalur cadangan |
| D. SEO dan berbagi | 2 | 2 | 0: soft 404 dan redirect beres, tetapi OG per paket, meta halaman baru, robots, feed, dan sitemap (sebagian) belum |
| E. Aksesibilitas | 2 | 2 | 0: halaman baru rapi (satu h1, `<main>`, label, `aria-describedby`), tetapi skip link, urutan `<nav>`, gerak otomatis, dan kontras belum |
| F. Privasi / UU PDP | 1 | 2 | +1: rute privat tanpa tag, token dibersihkan, tanpa PII di event. Masih tanpa persetujuan, CAPI menambah paparan, kebijakan lama |
| G. Kepercayaan dan hukum | 2 | 2 | 0: testimoni fiktif hilang dan syarat bayar tampil, tetapi syarat ganda, klaim Haji, SOP ringkas, "3000+", PPIU tidak di footer |
| H. Smoke produksi | 3 | 4 | +1: 404 benar, header lengkap, sitemap memuat halaman baru. Masih: `www` 404, feed basi, robots lama |

---

## 2. Status temuan audit 03 (PUB-001 sampai PUB-047)

Status: Fixed, Partially, Open, N/A, Owner (butuh keputusan pemilik). Bukti memakai `file:baris` atau hasil curl produksi 8 Okt 2026.

| ID | Status | Bukti |
|---|---|---|
| PUB-001 | Fixed | `PackageStickyMobileBar.tsx:68-74` tombol "Daftar Sekarang" ke `/daftar/${slug}`; total diganti "Mulai dari ... / orang" (`:58-62`). Browser 375 px (dev server, DB produksi): tombol "Daftar Sekarang" terlihat di bar bawah pada `/paket-umroh/umroh-hemat-2026-10-11`. Cacat baru: PUB-108 |
| PUB-002 | Partially | Selesai: tag tidak dimuat di rute privat (`index.html:4-9` guard `__musafarPrivate`, `privateRoutes.ts`, `App.tsx:149-151`), token tidak dikirim (`safeTrackingPath`). Belum: tidak ada banner persetujuan, GTM/Clarity/Meta/TikTok/GA tetap menyala pada kunjungan pertama di rute publik; CAPI mengirim IP dan user agent ke Meta tanpa persetujuan. Lihat PUB-101 (persetujuan) dan PUB-105 (CAPI) |
| PUB-003 | Owner | `Legal.tsx:164-169` (selain DP dikembalikan penuh) masih bertentangan dengan `SyaratUmroh.tsx:15,63-64` (potongan 50/25/0 persen). Teks lama masih tayang |
| PUB-004 | Owner | Draf `docs/legal/kebijakan-privasi-draft.md` ada tetapi belum tayang; `Legal.tsx:10` masih "29 September 2026" dan isi lama |
| PUB-005 | Fixed | `/cek-status` 200 (curl), `CekStatus.tsx`, `functions/api/cek-status.ts`, migrasi `20261006160000_intake_status.sql`. Catatan perbaikan: PUB-109, PUB-110, PUB-113 |
| PUB-006 | Open | Tidak ada pengirim pesan otomatis: grep fonnte/wablas/qontak/twilio/resend/brevo/sendgrid di `functions`, `supabase/functions`, `src` hanya menemukan `manage-team` (undangan Auth) dan tombol kirim ulang konfirmasi agen |
| PUB-007 | Open | Konfigurasi SMTP dan templat Supabase Auth tetap tidak bisa diverifikasi dari repo (`supabase/config.toml` tanpa `[auth]`) |
| PUB-008 | Open | `curl -A WhatsApp/2.23 .../paket-umroh/umroh-hemat-2026-10-11` hanya `<title>` generik dan `og:type/locale/site_name`; `functions/paket-umroh/` tidak ada. Halaman baru (`/cara-bayar`, `/jadi-agen`, `/sop-agen`) mengalami hal yang sama: PUB-112 |
| PUB-009 | Fixed | Live: `/halaman-ngaco`, `/paket-umroh/slug-tidak-ada`, `/llms.txt`, `/.well-known/security.txt`, `/manifest.json` semuanya HTTP 404 dengan `x-robots-tag: noindex`; rute SPA sah tetap 200 (`functions/[[path]].ts`, `public/_routes.json`). Catatan: bergantung pada pangkalan data, fail-open ke 200 |
| PUB-010 | Open | `https://www.musafartour.com/` dan `http://www...` tetap 404 dengan `x-lovable-serve-error: custom_domain_not_connected` |
| PUB-011 | Fixed | `/cara-bayar` 200, `CaraBayar.tsx` (3 langkah, rekening, tombol Salin, kirim bukti via WA), tertaut dari footer (`Footer.tsx:109`), layar sukses (`RegistrationForm.tsx:234`) dan paket. Sisa: nomor rekening masih angka keras di kode (`PT_ACCOUNTS`), tanpa unggah bukti |
| PUB-012 | Partially | Blok "Pembayaran fleksibel" ada (`PackagePaymentTerms.tsx`, dipakai `PackageDetail.tsx:337`). Tetapi `TentangKami.tsx:332` masih "Paspor (Min. 8 bulan berlaku)" (klaim "sudah diperbaiki" tidak benar di kode dan produksi). Paspor tetap tidak ditanya di tahap 1. Lihat PUB-111 |
| PUB-013 | Partially | Testimoni fiktif dan klaim "100% pasti berangkat" sudah hilang dari `useHomepageData.tsx`; FAQ cadangan kini benar untuk semua paket (`:88-137`). `page_seo` beranda: judul tab terbaca "...Terpercaya 2025" saat sesi browser dibuka (sebelum helmet menimpa), jadi data lama di database tampaknya belum diubah; deskripsi "mulai 20 jutaan" tidak dapat dibuktikan ulang |
| PUB-014 | Open | `HeroSection.tsx:101` "3000+ Jamaah Puas", `JamaahCarousel.tsx:25` animasi ke 3000, `TestimonialsSection.tsx:116` "290+ ulasan" masih angka keras |
| PUB-015 | Open | `Footer.tsx` tidak memuat PPIU, alamat, telepon, email. Nomor PPIU hanya di `SyaratUmroh.tsx:95`, portal agen, dan FAQ cadangan (`useHomepageData.tsx:112`, hanya bila tabel `faq_items` kosong) |
| PUB-016 | Open | `calcConfig.ts:10` Hemat 28,9 jt tetap; `umrohCalc.ts:7` `PELUNASAN_DAYS_BEFORE = 40` (aturan H-30) |
| PUB-017 | Open | Tidak ada kolom atau logika kedaluwarsa token manifest (grep migrasi); `/lengkapi` tetap tautan bearer permanen. Dikurangi sedikit: token tidak lagi tersimpan di `site_events` dan tidak dikirim ke tag |
| PUB-018 | Open | Tidak ada skip link (grep `Lewati`/`skip` kosong), `Navbar.tsx:218` tetap `createPortal(..., document.body)`, `<main>` tetap tidak ada di Index, PaketUmroh, Galeri, Artikel, ArtikelDetail, Kontak, JadwalUmroh, TentangKami (grep `<main`) |
| PUB-019 | Open | `PaketUmroh.tsx`: filter tetap state lokal, tanpa sort harga (hanya sold-out ke belakang, `:75`) |
| PUB-020 | Open | Konstanta harga anak/bayi tetap (`roomCombos.ts`), tidak ada FAQ per paket |
| PUB-021 | Open | `RegistrationForm.tsx`: tidak ada autosave/tombol salin kode (grep `localStorage`/`clipboard` kosong) |
| PUB-022 | Open | `Lengkapi.tsx`: grep `capture`/`compress` kosong |
| PUB-023 | Open | Notifikasi CS/owner tetap in-app (tidak ada saluran baru) |
| PUB-024 | Open | `ErrorBoundary.tsx:76,94-96` tetap menampilkan `error.message` dan `stack` |
| PUB-025 | Partially | `vite.config.ts` kini punya `globIgnores` chunk admin besar (PackageForm, ArticleForm, ...). Tetap: `registerType: "autoUpdate"`, `xlsx` 412 KB dan `BarChart` 361 KB masih diprecache (167 entri, 3.059 KiB), tanpa prompt pembaruan, SWR 30 menit untuk `packages` |
| PUB-026 | Open | Feed produksi 33 baris, 12 paket sudah berangkat, satu berstatus `in stock` ("Umroh Pelataran Hemat - 30 Jun 2026") |
| PUB-027 | Open | `functions/_lib/intake.ts:6,69`: satu `CONSENT_VERSION` dan satu `consent: true` untuk dua kotak centang |
| PUB-028 | Open | `UmrohCalculator.tsx`/`BoothLead.tsx` tanpa tautan privasi (grep kosong); `whatsapp_clicks` tetap menyimpan isi pesan |
| PUB-029 | Open | grep `MotionConfig`/`useReducedMotion` kosong |
| PUB-030 | Open | `Kontak.tsx`: grep `htmlFor` kosong |
| PUB-031 | Open | Kontras tidak berubah (bagian 5): placeholder 3,13, status-ok-text 3,84, footer white/40 3,66, bintang 2,15, putih di #25D366 1,98, batas isian 1,05 |
| PUB-032 | Open | `PackageCard.tsx:190` tombol gambar hanya saat `isHovered`; label "Previous image" (`:195`) |
| PUB-033 | Open | `App.tsx:235-253` patch `pointer-events` tetap ada |
| PUB-034 | Open | Tidak ada `priceValidUntil`/`seller`/`foundingDate` (grep) |
| PUB-035 | Open | `Index` dan `AdminLayout` tetap eager (`App.tsx:23-24`), entry JS naik 479 menjadi 523 KB (bagian 5) |
| PUB-036 | Open | `SEO.tsx:48,59` `og:url` tetap `window.location.href` |
| PUB-037 | Open | Tidak ada halaman pra/pasca keberangkatan |
| PUB-038 | Open | `robots.txt` live tetap berisi `/apotek /kauman /author/ /kemitraan /kantor`, tanpa `Disallow` `/lengkapi/`, `/daftar/`, `/api/`, `/cek-status`; `_headers` tanpa `X-Robots-Tag` untuk rute privat (hanya 404 yang noindex) |
| PUB-039 | Partially | Sitemap kini memuat `/cara-bayar`, `/jadi-agen`, `/sop-agen` (curl). Belum: `/syarat-umroh`, `/agent/register`; artikel tetap `created_at` (`sitemap.xml.ts:39`) |
| PUB-040 | Open | `public/site.webmanifest` tetap ditautkan (`index.html`), `theme_color #c22543`, tanpa `<meta name="theme-color">` |
| PUB-041 | Open | Tidak ada halaman offline/5xx/maintenance |
| PUB-042 | Open | `PackageDetail.tsx:217` noindex pada "tidak ditemukan"; waitlist tetap tidak konsisten (sticky bar "Gabung Waitlist" lewat WA vs `/daftar` menerima daftar tunggu) |
| PUB-043 | Fixed | `functions/[[path]].ts` membaca tabel `redirects` dan menjawab 301 di server |
| PUB-044 | Open | `PackageCtaButtons.tsx:111,119` "Keranjang" dan "Share" |
| PUB-045 | Open (tak terverifikasi) | `_headers` CSP tidak berubah; pelanggaran `connect-src` ke endpoint GTM server-side tidak diuji ulang karena pemblokir iklan di panel browser |
| PUB-046 | Open | `Kontak.tsx:32` email cadangan gmail |
| PUB-047 | Open | `chatRedirect.ts:56-71` tetap `await getNextCS()` lalu `window.open`; tidak diuji di perangkat |

Hitungan dari 47: Fixed 5 (001, 005, 009, 011, 043), Partially 5 (002, 012, 013, 025, 039), Owner 2 (003, 004), Open 35 (termasuk 007 dan 045 yang tidak dapat diverifikasi dari sini), N/A 0.

---

## 3. Temuan baru (PUB-101 dan seterusnya)

Severity: P0 memblokir peluncuran atau masalah hukum; P1 serius; P2 sebaiknya diperbaiki; P3 poles. Effort: S kurang dari 2 jam, M setengah hari, L sehari atau lebih. Urut severity.

### P1

| ID | Sev | Area | Titik sentuh | Evidence | Standar yang seharusnya | Saran | Effort |
|---|---|---|---|---|---|---|---|
| PUB-101 | P1 | F | Pelacak tanpa persetujuan, termasuk server-side | Tidak ada banner persetujuan (grep `consent`/`cookie` di `src` hanya Turnstile dan form). Di rute publik, GTM, Clarity (`index.html:10-31`), Meta, TikTok (`index.html:101-110`), GA4 (`useMarketingPixels.tsx:130-158`) menyala pada kunjungan pertama. Hal baru: `sendMeta` mengirim salinan server via `/meta-capi` untuk Lead, AddToCart, ViewContent, **Contact** (`tracking.ts:135,142`), dan `functions/meta-capi.ts:113-119` meneruskan IP (`cf-connecting-ip`), user agent, `fbp/fbc`, dan `external_id` (SHA-256 id pengunjung tetap) ke Meta. Komentar kode menyebut salinan ini sengaja tetap sampai "when the pixel is blocked (adblock, iOS tracking protection)": artinya pilihan pengguna yang memblokir pelacak dilewati. Draf kebijakan sendiri mencatat "belum memiliki banner persetujuan" (`kebijakan-privasi-draft.md:69,169`). Noscript GTM `<iframe>` (`index.html:97`) juga dimuat di rute privat bagi pengunjung tanpa JS | UU 27/2022 PDP Pasal 20-22 (persetujuan eksplisit dan dapat dibuktikan), Pasal 21 (pemberitahuan tujuan); Google Consent Mode v2; praktik Tokopedia/Traveloka: banner dengan "Tolak" setara "Terima" | Banner persetujuan 3 pilihan (perlu, analitik, iklan). Tahan GTM/Clarity/Meta/TikTok/GA dan panggilan `/meta-capi` sampai setuju iklan. Setelah itu simpan bukti (versi, waktu). Sambil menunggu keputusan pemilik: hentikan CAPI untuk pengunjung yang tidak pernah memuat `fbevents.js`, dan tulis jujur di kebijakan privasi | M |
| PUB-102 | P1 | G | `/sop-agen` bukan SOP yang ditandatangani | Halaman menyebut "SOP/AGEN/001 versi 01 ... Aturan resmi" dan portal mencatat persetujuan agen sebagai `SOP/AGEN/001-v01` (`AgentSetupChecklist.tsx:55-58` tautan "Baca lagi" ke `/sop-agen`). Teks halaman (`src/lib/sopAgen.ts` `SOP_SECTIONS`, 13 bagian) **tidak memuat** hal yang ada di PDF: kewajiban mendaftarkan lead lebih dulu (PDF bagian 6, data minimal), Lead Protection 30 hari kalender, kepemilikan jamaah dan pembagian komisi antar agen 100% atau 30/70 atau 60/40, perselisihan (keputusan manajemen final), program referral bonus 30%, target 1 jamaah per bulan atau 12 per tahun, Reward Tahunan dan Road to Baitullah, aturan identitas Musafar di media sosial (agen individu dilarang akun berlabel Musafar), konten wajib disetujui dan ketentuan syariat konten, "Persyaratan Umroh Musafar" yang dikumpulkan agen (KTP, KK, vaksin meningitis dan polio, buku nikah, akta anak), evaluasi agen. Tidak ada tautan ke PDF bertanda tangan. Portal sendiri menerapkan perlindungan 30 hari (`AgentLeads.tsx:100,113`) yang tidak tertulis di halaman SOP yang disetujui agen | KUHPerdata 1320/1338 (kesepakatan atas isi yang dibaca); praktik kemitraan: agen menyetujui dokumen utuh yang dapat diunduh dan versinya bertanda hash | Tampilkan SOP lengkap (semua 25 bagian) atau tautan PDF bertanda tangan di `/sop-agen` dan di dialog persetujuan, jangan ubah nama "SOP/AGEN/001 v01" bila isinya ringkasan. Simpan hash PDF di `agents.sop_version` | M |
| PUB-103 | P1 | G | Klaim "Haji" | `HeroSection.tsx:57` h1 "Umroh & Haji Nyaman, ...", `index.html:36` title "Paket Umroh & Haji Terpercaya 2026", `vite.config.ts:20` manifest "Paket Umroh & Haji", `Kontak.tsx:81` "haji khusus". Satu-satunya izin yang tampil adalah PPIU (umroh) `17102200953750002` (`SyaratUmroh.tsx:95`). Tidak ada paket haji di sitemap (21 paket, semuanya umroh), tidak ada PIHK (grep kosong di `src` publik). SOP menyebut "Haji Khusus: komisi Rp5.000.000" (PDF bagian 4e) sehingga rencananya ada, izinnya belum tampak | UU 8/2019 tentang Penyelenggaraan Ibadah Haji dan Umrah: haji khusus hanya oleh PIHK berizin; iklan harus sesuai izin | Pemilik: konfirmasi apakah PT punya izin PIHK. Bila belum, hapus "Haji" dari h1, title, manifest, meta Kontak sampai izin ada | S |

### P2

| ID | Sev | Area | Titik sentuh | Evidence | Standar | Saran | Effort |
|---|---|---|---|---|---|---|---|
| PUB-104 | P2 | G | `/jadi-agen` dan `/sop-agen` vs SOP: janji dan klaim | (1) "Admin memeriksa datamu, biasanya 1-2 hari kerja" dan FAQ "Biasanya 1-2 hari kerja" (`JadiAgen.tsx:42`, `:70`): tidak ada di SOP (alur SOP hanya urutan langkah, tanpa SLA). (2) Platinum "Di atas 30 jamaah per tahun" (`sopAgen.ts:49`) vs SOP "Minimal 30 jamaah/tahun" (bagian 4a). (3) Persyaratan "Bukan karyawan Musafar" (`sopAgen.ts:69`) lebih ketat dari SOP: SOP bagian 2 mencantumkan "Karyawan" sebagai kelompok yang boleh dan bagian 3.8 hanya menyatakan agen bukan karyawan "kecuali memiliki hubungan kerja terpisah"; syarat SOP yang hilang: "Bukan dalam kerjasama dengan travel lain". (4) Kartu "Dibayar H sampai H+2 landing" (`JadiAgen.tsx:27-30`) tanpa keterangan SOP "ketentuan tanggal dapat berubah" (ada hanya di FAQ). (5) `BONUS_TEXT` (`sopAgen.ts:59`) tidak menyebut "Silver" padahal PDF bagian 4e menulis "Bonus Closing Silver" (bagian 15 SOP tidak membatasi). (6) Header `/sop-agen`: "Aturan resmi ... syarat, hak dan kewajiban, komisi, larangan, dan sanksi" menyiratkan lengkap (lihat PUB-102). Sesuai SOP dan tidak bermasalah: biaya registrasi Rp 1.500.000 sekali seumur hidup, isi welcome kit dan perlengkapan, rekening BCA/BSI/BNI atas nama PT, pembayaran komisi H sampai H+2, daftar syarat komisi, larangan dan sanksi 4 level | Konsistensi klaim publik dengan dokumen kontraktual | Hapus SLA 1-2 hari atau tetapkan resmi di SOP; samakan "minimal 30"; selaraskan syarat karyawan dengan pemilik; sebut "Bonus Closing Silver" bila itu maksudnya | S |
| PUB-105 | P2 | F | `/meta-capi` terbuka tanpa batas laju | `functions/meta-capi.ts:86-88` satu-satunya gerbang adalah header `Origin` (mudah dipalsukan dari luar peramban, mis. curl). Tidak ada Turnstile (berbeda dari `/api/daftar` dan `/api/cek-status`), tidak ada rate limit, `value` hanya perlu angka positif tanpa batas atas (`cleanCustomData` baris 74-76), `event_id` bebas string, `fbp/fbc` diambil dari body. Siapa pun bisa menyuntikkan Lead/Contact/ViewContent palsu dengan nilai besar ke Pixel Meta milik PT (token tidak bocor), mencemari optimasi iklan dan menghabiskan kuota Workers. Tidak diuji (dilarang POST); dinilai dari kode | OWASP API4 (resource consumption); Meta menyarankan validasi dan batas pada relay CAPI | Aturan rate limit Cloudflare (mis. 30 per menit per IP), batasi `value` (maks harga termahal x 10), wajib UUID untuk `event_id`, cek `Sec-Fetch-Site: same-origin`, validasi `content_ids` terhadap paket terbit | S |
| PUB-106 | P2 | A | Lead pendaftaran tertelan dedupe WhatsApp | `trackLead` memakai kunci dedupe tunggal `Lead` per orang 7 hari (`tracking.ts:428`), sama untuk tap WhatsApp dan pengiriman form (`Daftar.tsx:79` memanggil `trackLead("form_pendaftaran", ...)`). Pengunjung yang menekan tombol WA sehari sebelum mendaftar tidak menghasilkan Lead untuk pendaftaran, padahal itu sinyal terkuat dan satu-satunya yang membawa `value` paket. Meta tidak punya peristiwa pendaftaran selesai terpisah | Meta: kirim peristiwa standar berbeda untuk tahap berbeda (Lead untuk minat, `SubmitApplication` atau `CompleteRegistration` untuk pendaftaran) | Kirim pendaftaran form sebagai peristiwa sendiri tanpa dedupe 7 hari (dedupe per kode pendaftaran) dan tambahkan ke `ALLOWED_EVENTS` | S |
| PUB-107 | P2 | F | Tag ganda dan saklar admin tidak berlaku | (1) `useMarketingPixels.tsx:130-158` efek GA4 tanpa cleanup dan tanpa penanda "sudah dimuat": setiap kali `enabled` berganti dari false ke true (keluar dari `/daftar`, `/cek-status`, `/admin`) skrip `gtag/js` dan `gtag('config')` ditambahkan lagi, sehingga `page_view` GA dikirim berulang. (2) TikTok: ID `D4JDUSRC77U7MI8IJGGG` keras di `index.html:101-110` dan dijalankan 2 detik setelah `load` tanpa memeriksa `window.ttq`; hook (`:108-127`) memuat TikTok lebih dulu bila `!window.ttq`, jadi `ttq.load` dan `ttq.page()` bisa terjadi dua kali. Kolom `tiktok_pixel_enabled` di admin tidak mematikan skrip keras ini. (3) GTM dan Clarity juga keras, tidak punya saklar. Tidak dapat dibuktikan di sini karena pemblokir iklan; dinilai dari kode | Satu sumber kebenaran untuk tag; jangan hitung PageView dua kali | Hapus blok TikTok dari `index.html` (biarkan hook), beri penjaga `window.__ga4Loaded`, dan pastikan GA4 hanya lewat GTM atau hook, tidak keduanya | S |
| PUB-108 | P2 | A | Harga terpotong di bar bawah ponsel | Browser 375 px, `/paket-umroh/umroh-hemat-2026-10-11`: elemen `span.truncate` berisi "Rp 27.900.000 / orang" dengan `scrollWidth 174` vs `clientWidth 113`, tampil "Rp 27.900.0…" di sebelah tombol "Daftar Sekarang" (`PackageStickyMobileBar.tsx:60-66`). Harga yang terlihat salah (27,9 juta tampak 27,9 ribu lebih) di titik keputusan | Traveloka/Tiket: harga tidak pernah dipotong | Hilangkan "/ orang" ke baris label ("Mulai dari, per orang"), kecilkan font, hapus `truncate` | S |
| PUB-109 | P2 | A | `/cek-status`: pesan kontradiktif sebelum DP | `get_intake_status` menghitung `data_pending = stage IN ('accepted','dp_received','lunas') AND ada data kosong` (migrasi `20261006160000_intake_status.sql:121`). Pada tahap `accepted` (belum DP) data memang kosong, sehingga halaman menampilkan lencana "Data belum lengkap" dan kotak "Buka link pribadi untuk melengkapi data yang dikirim CS" (`CekStatus.tsx:198,203-209`) tepat di bawah kalimat "Setelah DP, kamu mendapat link untuk melengkapi data" (`:51`). Orang diminta membuka tautan yang belum dikirim | Pesan status harus konsisten dengan langkah berikutnya | Hitung `data_pending` hanya untuk `dp_received` dan `lunas`, atau sembunyikan kotak itu saat `stage = accepted` | S |
| PUB-110 | P2 | A, E | `/cek-status` dan Turnstile: jalan buntu dan fokus | (1) Bila skrip Turnstile gagal dimuat (pemblokir iklan, jaringan), `Turnstile.tsx:61` hanya `onToken(null)`; pengguna melihat ruang kosong (screenshot 375 px) dan setelah klik mendapat "Verifikasi keamanan belum selesai. Tunggu sebentar" (`CekStatus.tsx:102`) tanpa jalur WhatsApp; hal yang sama di `/daftar`. (2) Setelah submit gagal validasi fokus tetap di body (uji browser: `document.activeElement = BODY`), tidak pindah ke kolom salah; berbeda dengan `/daftar`. (3) Hasil tampil di bawah form tanpa `scrollIntoView` atau pemindahan fokus, dan `aria-live` ada pada `<section>` yang baru dipasang sehingga pembaca layar sering tidak mengumumkan. (4) Bila site key kosong pesan "Pendaftaran online belum aktif" (`Turnstile.tsx:70`) salah untuk halaman cek status. (5) Petunjuk "5 huruf atau angka" (`:96`) padahal regex menolak angka 0 dan 1 | WCAG 3.3.1, 4.1.3 (AA); Cloudflare menyarankan jalur cadangan bila widget gagal | Tampilkan pesan dan tombol "Hubungi CS" bila Turnstile gagal dimuat atau kedaluwarsa, fokuskan kolom salah, `focus()` ke judul hasil, ganti pesan | S |
| PUB-111 | P2 | G | Syarat paspor 8 bulan masih tayang | `TentangKami.tsx:332` "Paspor (Min. 8 bulan berlaku)" pada kartu "Persyaratan Mudah"; semua tempat lain 12 bulan (`PackagePaymentTerms.tsx:34`, `manifestForm.ts:116`, `SyaratUmroh.tsx:83`). Permintaan tinjau menyebut ini sudah diperbaiki, tetapi kode HEAD dan bundel produksi (hash sama dengan build lokal) masih memuatnya. Juga `SyaratUmroh.tsx:83` ("tidak kurang dari 12 bulan sebelum jadwal keberangkatan") ambigu (lihat bagian 6) | Satu aturan untuk satu syarat (PRODUCT.md prinsip 3) | Ubah ke "Min. 12 bulan setelah tanggal berangkat" | S |
| PUB-112 | P2 | D | Halaman baru tanpa meta di HTML awal | `curl -A WhatsApp` ke `/jadi-agen`, `/cara-bayar`, `/sop-agen` memberi shell generik yang sama (7.143 B). Title dan deskripsi hanya dari `RouteMeta` JS (`App.tsx:173-206`). Tiga halaman ini ada di sitemap dan `/jadi-agen` tepat jenis tautan yang dibagikan lewat WhatsApp untuk merekrut agen: pratinjau tanpa judul, deskripsi, gambar | Booking.com: OG per halaman; WhatsApp tidak menjalankan JS | Tambah `functions/jadi-agen.ts` dan sejenisnya (HTMLRewriter) atau satu fungsi pemeta rute ke meta (juga memperbaiki PUB-008) | M |

### P3

| ID | Sev | Area | Titik sentuh | Evidence | Standar | Saran | Effort |
|---|---|---|---|---|---|---|---|
| PUB-113 | P3 | F | Batas laju `/cek-status` hanya per kode | `get_intake_status` menghitung kegagalan per kode, 10 per jam, dan menolak pencarian kode itu termasuk dengan nomor benar (`:61-64`, sebelum `SELECT`). Konsekuensi: (a) 10 percobaan salah (pihak lain) mengunci jamaah sah satu jam; (b) tidak ada batas per nomor atau per IP, jadi penebakan banyak kode untuk satu nomor yang diketahui hanya dibatasi Turnstile (ruang kode 34^5, sekitar 45 juta, tidak praktis; data yang bocor tipis: tahap, paket, tanggal, jumlah orang). Respons 404 seragam dan penghitungan untuk kode tidak ada sama seperti yang ada: tidak membocorkan keberadaan kode | OWASP ASVS 2.2.1 (anti-automation); lockout sebaiknya per kombinasi | Tambah hitungan per nomor dan per IP (Cloudflare Rate Limiting), jangan kunci pemilik yang benar (lewati batas bila kode dan nomor cocok) | S |
| PUB-114 | P3 | F | Detail pelacakan Meta dan TikTok | (1) Pendengar klik global di fase capture (`tracking.ts:465-475`) mengklaim kunci dedupe Contact 4 detik dengan sumber umum "whatsapp_link" sebelum handler React (`trackWhatsAppLead("footer")`, `Footer.tsx:68` dan `CTASection.tsx:12`, `Kontak.tsx`) sehingga Contact dengan data paket (`content_ids`, `value`) dibuang untuk tombol berupa `<a href="wa.me">` yang punya `onClick`. (2) `sendTikTok` membuang peristiwa saat `window.ttq` belum ada (2 detik pertama, `:205`), tanpa antrean seperti Meta. (3) Saat keluar dari rute privat `disablePushState = true` (`useMarketingPixels.tsx:99`) hingga efek berikutnya, sehingga PageView halaman publik pertama setelah `/daftar` atau `/cek-status` tidak terkirim; `fbq('init')` juga dipanggil ulang tiap masuk. (4) `Lead` membawa `value` untuk form tetapi tidak untuk WA: nilai tidak sebanding. (5) Mendarat langsung di `/daftar/<slug>` (tautan agen atau iklan): GTM, Clarity, Meta, TikTok tidak dimuat (rute privat), jadi tidak ada PageView, tidak ada `_fbp`, TikTok dan GA tidak mencatat apa pun; Lead hanya lewat CAPI dengan `fbc` dari localStorage, `external_id`, IP, dan UA. Pada pengunjung yang memblokir piksel, dedupe tidak membakar apa pun karena salinan CAPI tetap terkirim (aman) | Meta: parameter konsisten antar tombol | Naikkan prioritas handler spesifik atau gabungkan di satu tempat; antre TikTok; set `disablePushState=false` sebelum navigasi | S |
| PUB-115 | P3 | F | Kebersihan CAPI dan API publik | `meta-capi.ts:138` token akses di query string URL (muncul di log); `:144` mengembalikan `detail: result.error?.message` dari Meta ke klien; `:33,121` `test_event_code` diterima dari klien; `functions/_lib/turnstile.ts:3` `ALLOWED_HOST` produksi menerima `localhost` dan `127.0.0.1` (tidak berbahaya karena Origin bisa dipalsukan, tetapi menyesatkan); GET ke `/api/cek-status`, `/api/daftar`, `/meta-capi` menjawab halaman 404 HTML, bukan 405 | Praktik API | Token di header `Authorization`, jangan kembalikan detail, hapus localhost di produksi, jawab 405 | S |
| PUB-116 | P3 | F | Penanda staf hanya di peramban admin | `markInternalBrowser` hanya dipanggil saat login admin (`tracking.ts:44`). Ponsel staf dan CS yang mengetes tombol WA atau form dihitung sebagai Lead dan Contact sungguhan | Praktik analitik: filter IP kantor atau parameter | Tautan `?px=off` untuk setiap perangkat staf (sudah ada, belum didokumentasikan) dan tulis di panduan CS | S |
| PUB-117 | P3 | A | Layar sukses memuat ulang halaman, contoh kode salah | `RegistrationForm.tsx:234` tautan `<a href="/cek-status">` dan `/cara-bayar` (muat ulang penuh, bukan `<Link>`); contoh kode di FAQ cadangan "MSF-12345" (`useHomepageData.tsx:123`) tidak lolos regex `/^MSF-?[A-Z2-9]{5}$/` karena mengandung angka 1 | Konsistensi contoh dan SPA | Gunakan `<Link>`, ganti contoh "MSF-7K3QX" | S |

---

## 4. Skor perjalanan jamaah dan matriks pesan

### 4.1 Perjalanan calon jamaah (0 sampai 5 per titik sentuh; Ada, Sebagian, Tidak ada)

| # | Tahap | Titik sentuh | Status | Skor (03 lalu 04) | Bukti |
|---|---|---|---|---|---|
| 1 | Temuan | Pencarian: title, deskripsi, tahun | Sebagian | 2 lalu 2 | Judul tab beranda masih "2025" dari `page_seo`; meta awal statis "2026" |
| 2 | Temuan | Berbagi tautan paket di WhatsApp/Facebook | Tidak ada | 1 lalu 1 | PUB-008, PUB-112 |
| 3 | Temuan | Iklan ke halaman | Sebagian | 3 lalu 3 | Landing `/daftar/<slug>` langsung tidak memuat piksel (rute privat), event Lead hanya lewat CAPI |
| 4 | Kepercayaan | Beranda: proposisi nilai, CTA | Ada | 4 lalu 4 | h1 jelas (tetapi memuat "Haji", PUB-103) |
| 5 | Kepercayaan | PPIU, alamat, kontak, verifikasi Kemenag | Tidak ada | 1 lalu 1 | PUB-015 |
| 6 | Kepercayaan | Testimoni dan angka | Sebagian | 2 lalu 3 | Fiktif sudah dihapus; "3000+" dan "290+" tetap keras |
| 7 | Pilih | Daftar paket dan filter | Sebagian | 3 lalu 3 | PUB-019 |
| 8 | Pilih | Detail paket: harga, hotel, penerbangan | Ada | 4 lalu 4 | |
| 9 | Pilih | Syarat bayar di halaman paket | Tidak ada lalu Ada | 0 lalu 4 | `PackagePaymentTerms.tsx`; refund/pembatalan masih tidak tampil (PUB-003) |
| 10 | Pilih | CTA daftar di ponsel | Tidak ada lalu Ada | 0 lalu 3 | Terlihat di 375 px; harga terpotong (PUB-108) menahan di 3 |
| 11 | Daftar | Form `/daftar` | Ada | 4 lalu 4 | Validasi ganda, 44 px, tanpa autosave |
| 12 | Daftar | Layar sukses | Sebagian lalu Ada | 3 lalu 3 | Kode, 3 langkah, tautan cek status dan cara bayar; tanpa salin kode, tanpa SLA balasan |
| 13 | CS menerima | Pesan penerimaan + instruksi DP + link `/lengkapi` | Manual | 2 lalu 2 | WA manual dari admin |
| 14 | Lengkapi data | `/lengkapi/<token>` | Sebagian | 3 lalu 3 | Tanpa kamera/pratinjau/kompresi; token permanen (PUB-017); tanpa penutup |
| 15 | Bayar | Cara bayar dan rekening | Sebagian lalu Ada | 2 lalu 4 | `/cara-bayar`: langkah, rekening resmi, salin, kirim bukti via WA |
| 16 | Bayar | Unggah/konfirmasi bukti | Sebagian | 1 lalu 2 | Bukti lewat WA manual; belum ada unggah, belum ada kwitansi |
| 17 | Bayar | Verifikasi dan kwitansi | Tidak ada | 0 lalu 0 | |
| 18 | Status | Cek status | Tidak ada lalu Ada | 0 lalu 3 | Tahap, paket, tanggal; tanpa jumlah dibayar/sisa; PUB-109, 110 |
| 19 | Status | Pengingat cicilan dan H-30 | Manual | 1 lalu 1 | WA manual `JamaahFinance` |
| 20 | Persiapan | Manasik, checklist, info penerbangan, grup | Tidak ada | 0 lalu 0 | PUB-037 |
| 21 | Berangkat | Hari H, kontak darurat | Tidak ada | 0 lalu 0 | |
| 22 | Pulang | Permintaan ulasan | Tidak ada | 0 lalu 0 | Hanya tautan ulasan Google statis di beranda |
| 23 | Agen (jalur lain) | `/jadi-agen`, `/sop-agen`, registrasi, portal | Ada | 3 lalu 3 | Isi rapi; masalah di PUB-102, PUB-104, PUB-112 |

Rata-rata 23 titik: 03 sekitar 1,7; 04 sekitar 2,3.

### 4.2 Matriks pesan transaksional (Otomatis = sistem kirim; Manual = sistem menyiapkan, orang mengirim; In-app = hanya saat login; Tidak ada)

| # | Penerima | Pesan | Saluran | 03 | 04 | Bukti |
|---|---|---|---|---|---|---|
| 1 | Jamaah | Pendaftaran diterima + kode | Layar sukses saja; jamaah bisa kirim sendiri WA | Sebagian | Sebagian | `RegistrationForm.tsx:206-232` |
| 2 | Jamaah | Diterima CS, instruksi DP, link `/lengkapi` | WA manual admin (`JamaahIntake.tsx:51-62`) | Manual | Manual | |
| 3 | Jamaah | Ditolak, seat penuh, waitlist | WA manual templat generik | Manual | Manual | |
| 4 | Jamaah | Status kapan saja | Tarik: `/cek-status` (kode + nomor) | Tidak ada | **Ada (self-service)** | `CekStatus.tsx` |
| 5 | Jamaah | Data tahap 2 lengkap | Tidak ada | Tidak ada | Tidak ada | `Lengkapi.tsx` |
| 6 | Jamaah | DP/pembayaran diterima dan kwitansi | Tidak ada (hanya lencana "Pembayaran sedang diperiksa" di cek status) | Tidak ada | Sebagian (tarik) | `get_intake_status` `payment_checking` |
| 7 | Jamaah | Pengingat H-45, H-35, H-30 | WA manual | Manual | Manual | `jamaah.ts:294-313` |
| 8 | Jamaah | Lunas dikonfirmasi | Tidak ada (kata "Lunas" di cek status, tarik) | Tidak ada | Sebagian (tarik) | |
| 9 | Jamaah | Info keberangkatan | Tidak ada | Tidak ada | Tidak ada | |
| 10 | Jamaah | Pembatalan/refund diproses | Tidak ada | Tidak ada | Tidak ada | |
| 11 | Jamaah | Ulasan pasca perjalanan | Tidak ada | Tidak ada | Tidak ada | |
| 12 | Agen | Konfirmasi email, reset password | Supabase Auth (tak terverifikasi) | Otomatis (?) | Otomatis (?) | |
| 13 | Agen | Disetujui admin, ditolak/data kurang | WA manual (`approvedMessage`, `helperMessage`) | Manual | Manual | |
| 14 | Agen | Jamaah binaan diterima/ditolak, komisi dikreditkan | Status di portal | In-app | In-app | |
| 15 | Agen | Bukti transfer biaya registrasi | WA manual ke PIC Agen (kak Virna) | (baru) | Manual | `agentSupport.ts` |
| 16 | CS | Pendaftaran masuk baru | Bel admin saat panel terbuka | In-app | In-app | `20261006090000_notification_meta.sql:102` |
| 17 | CS/Owner | Agen baru menunggu, penarikan komisi | Bel admin | In-app | In-app | |
| 18 | Owner | Pembayaran menunggu verifikasi, ringkasan harian | Tidak ada | Tidak ada | Tidak ada | |
| 19 | Tim | Undangan anggota | Supabase invite | Otomatis (?) | Otomatis (?) | `manage-team/index.ts:101` |

Ringkas: dari 19 pesan, 1 bergeser dari Tidak ada ke tersedia lewat tarik (cek status), 0 otomatis baru. PUB-006 dan PUB-023 tetap terbuka.

---

## 5. Hasil kontras, metrik, dan ukuran bundel

### 5.1 Kontras WCAG (dihitung ulang dari token `src/index.css:10-100`; token tidak berubah sejak audit 03)

| Pasangan | Rasio | Ambang | Hasil | Dipakai di |
|---|---|---|---|---|
| `muted-foreground` / background, card | 6,25 / 6,98 | 4,5 | Lulus | |
| Placeholder `muted-foreground/70` / field `#EDEEEE` | 3,13 | 4,5 | **Gagal** | `ui/input.tsx:11`, `textarea.tsx:11`, `select.tsx:20`: semua form |
| Placeholder / card putih | 3,41 | 4,5 | **Gagal** | |
| `status-ok-text` / card putih | 3,84 | 4,5 | **Gagal** (teks) | `JadiAgen.tsx` ikon centang (ambang ikon 3:1 lulus), `RegistrationForm`, `Lengkapi.tsx:233` teks "tersimpan" |
| `status-ok-text` / background `#F2F3F3` | 3,45 | 4,5 | **Gagal** | |
| `status-warn-text` / card | 5,04 | 4,5 | Lulus | |
| `status-warn-text` / `status-warn-bg` | 4,53 | 4,5 | Lulus tipis | |
| Footer `white/60` / primary | 6,37 | 4,5 | Lulus | `Footer.tsx:95,107` |
| Footer `white/40` ("Made by Musawara Creative") | 3,66 | 4,5 | **Gagal** | `Footer.tsx:124` |
| Bintang hotel `amber-500` / putih | 2,15 | 4,5 | **Gagal** | `PackageCard.tsx:281,288` |
| Putih / `#25D366` (FAB WA, TentangKami) | 1,98 | 3 (ikon), 4,5 (teks) | **Gagal** | `FloatingWhatsApp.tsx:40`, `TentangKami.tsx:392` |
| Putih / `#128C7E` (alternatif) | 4,14 | 4,5 | Hampir; pakai `#0B7A6C` atau teks gelap | |
| Batas isian field / background | 1,05 | 3 | **Gagal** (1.4.11) | semua `Input` |
| Putih / `--brand` crimson | 5,82 | 4,5 | Lulus | tombol utama |
| Teks putih 70% dan 85% pada hero gelap `/jadi-agen` | 7,81 / 10,81 | 4,5 | Lulus | |

Bukti kontras halaman baru: `/cek-status` dan `/cara-bayar` memakai `text-muted-foreground` (lulus), tetapi placeholder dua kolom di `/cek-status` mewarisi kegagalan placeholder.

### 5.2 Struktur, landmark, tautan (browser dev server pada 375 dan 1280 px, DB produksi)

| Halaman | h1 | h2 | `<main>` | Skip link | Scroll horizontal | Catatan |
|---|---|---|---|---|---|---|
| `/` | 1 | 6 | **0** | tidak ada | tidak | 65 `<img>`, 61 tanpa `width`/`height`, 3 `alt=""` |
| `/paket-umroh` | 1 | 0 | **0** | tidak ada | tidak | 42 gambar, semua tanpa dimensi; tautan nama paket 23 px tinggi |
| `/paket-umroh/<slug>` | 1 | 3 | 1 | tidak ada | tidak | 20 gambar tanpa dimensi; harga terpotong (PUB-108) |
| `/daftar/<slug>` | 1 | 4 | 1 | tidak ada | tidak | 16 kontrol 16 px (checkbox/radio) semuanya dibungkus label 44 px: lulus |
| `/cek-status` | 1 | 0 (1 saat ada hasil) | 1 | tidak ada | tidak | `<form>` tanpa `aria-label`; fokus tidak pindah saat galat |
| `/cara-bayar` | 1 | 5 | 1 | tidak ada | tidak | |
| `/jadi-agen` | 1 | 8 | 1 | tidak ada | tidak | |
| `/sop-agen` | 1 | 15 | 1 | tidak ada | tidak | daftar isi `<nav aria-label="Daftar isi">` hanya di lg; di ponsel tanpa navigasi bagian |
| 404 (`/halaman-ngaco`) | 1 | 0 | 1 | tidak ada | tidak | berisi tautan ke paket dan cek status |

Di semua halaman `document.body.lastElementChild` adalah `<nav>` (portal Navbar), jadi urutan fokus dan pembaca layar menaruh navigasi paling akhir (PUB-018 tetap). Tidak ada galat konsol (hanya perilaku pemblokir iklan pada tag pihak ketiga yang tidak disimpulkan). Target sentuh: di 375 px `/cek-status` tidak ada kontrol di bawah 24 px selain satu tautan sebaris; di `/` tidak ada di bawah 24 px, 14 di antara 24 dan 44 px (menu, ikon sosial); di desktop tautan navbar tinggi 18-20 px (lolos pengecualian jarak WCAG 2.5.8, belum lolos 2.5.5 AAA).

### 5.3 Hitungan grep

| Metrik | Hasil |
|---|---|
| `text-[N px]` dengan N di bawah 12 pada file publik (pages, components tanpa admin/agent) | 0 (admin/agent: CogsCalculator 39, PackageBrochure 17, AgentLeads 10, dst.) |
| `text-xs` (12 px) pada file publik | 165 pemakaian |
| Kelas palet mentah (`emerald|slate|gray|zinc|blue|red|green|amber|orange|yellow|purple|rose|neutral|stone` + angka) pada file publik | 24 kemunculan di 10 file: PackageCard 5, PublicMarketingKit 4, TrustElements 4, MaterialsList 3, BoothLead 2, PackagePricing 2, toast 1, calendar 1, HeroSection 1, Footer 1 |
| Sisa teks Inggris di UI publik | `PackageCard.tsx:195,202,220` "Previous image", "Next image", "Go to image"; `PackageCtaButtons.tsx:119` "Share"; "Term of Service" dipakai sebagai nama dokumen (`SyaratUmroh`), "Marketing Kit". Nada "Anda" (bukan "kamu"): 38 kemunculan di file publik, terbanyak `Legal.tsx` 11, `Kontak.tsx` 6, `TentangKami.tsx` 4, `CTASection` 3 |
| `alt` hilang | 0 (3 gambar `alt=""` di beranda, dekoratif) |

### 5.4 Bundel (`npm run build` 8 Okt 2026, 15,95 detik; hash entry sama dengan produksi)

Sepuluh chunk JS terbesar (mentah): `index` 523 KB, `xlsx` 412 KB, `ArticleForm` 383 KB, `BarChart` 361 KB, `PackageForm` 312 KB, `supabase` 165 KB, `react-router` 153 KB, `ChatRotation` 85 KB, `radix-ui` 84 KB, `Jamaah` 58 KB. Total `dist/assets/js` 4,2 MB, 166 berkas. CSS 183 KB (28 KB gzip).

Rute beranda (dari `dist/index.html`, entry + 5 modulepreload + CSS):

| Berkas | Mentah | gzip | brotli |
|---|---|---|---|
| `index-BbfMIqbn-v2.js` | 523.272 | 153.890 | 128.132 |
| `supabase-CE6fS39W-v2.js` | 164.982 | 41.715 | 36.297 |
| `react-router-DWgN4JUr-v2.js` | 152.768 | 49.754 | 43.560 |
| `radix-ui-DDEOhy5N-v2.js` | 83.655 | 27.707 | 24.490 |
| `ui-vendor-Bh-FilMr-v2.js` | 52.445 | 16.897 | 14.461 |
| `query-tGJHQODC-v2.js` | 39.984 | 11.631 | 10.445 |
| **JS awal** | **1.017.106** | **301.594** | **257.385** |
| `index-BweimG82-v2.css` | 183.198 | 28.239 | 22.163 |

Dibanding audit 03: entry 479 menjadi 523 KB (+9%, tetap termasuk `AdminLayout` dan `Index` eager, `App.tsx:23-24`); total JS awal 289 menjadi 302 KB gzip. Produksi menyajikan brotli, jadi yang ditransfer sekitar 257 KB JS + 22 KB CSS + HTML 7,1 KB, lalu gambar hero (800w 58 KB, 1280w 132 KB, 1920w 223 KB, 2560w 332 KB; catatan: audit 03 menulis 109 KB untuk 1920, kini 223 KB), font Onest dari Google, dan skrip pihak ketiga. Service worker: precache 167 entri, 3.059 KiB (naik dari 151 entri di audit 03; `xlsx` 412 KB dan `BarChart` 361 KB masih ikut karena `vite.config.ts` `globIgnores` hanya mengecualikan 7 chunk admin).

### 5.5 Risiko Core Web Vitals (dari kode, belum diukur)

- LCP: hero memakai `loading="eager"` dan preload responsif (`index.html:50-61`), baik. Tirai intro layar penuh 1,1 detik (`Index.tsx:93-96`) menunda LCP yang terlihat dan menutup konten.
- CLS: 61 dari 65 gambar beranda dan 42 dari 42 di daftar paket tanpa `width/height`; font Onest memakai `preload ... onload` tanpa `size-adjust` (`index.html:41-43`); kartu `PackageCard` memuat gambar bergantian.
- INP/TBT: entry 523 KB mentah plus eksekusi GTM, Clarity, fbevents, gtag, TikTok pada muat pertama; `framer-motion` dan carousel bergerak terus (PUB-029).
- Pihak ketiga pada muat pertama rute publik: Google Tag Manager, Microsoft Clarity, Meta `fbevents.js`, TikTok `events.js` (+2 detik), Google `gtag/js`, Google Fonts (css dan woff2), Cloudflare Insights, Supabase REST, YouTube iframe `youtube.com/embed` dengan autoplay (bukan `youtube-nocookie`), Cloudflare Turnstile pada form. Sekitar 9 origin.

---

## 6. Yang perlu keputusan pemilik

1. **Kebijakan pembatalan** (PUB-003): pilih satu dari `Legal.tsx:164-169` (selain DP dikembalikan penuh) atau `SyaratUmroh.tsx:15,63-64` (potongan 50/25/0 persen, tidak bisa dibatalkan setelah 5 hari kerja). Tinjau klausul denda Rp 1 miliar (`:52`) dan COVID (`:21-25`).
2. **Kalimat paspor `SyaratUmroh.tsx:83`**: "tidak kurang dari 12 bulan sebelum jadwal keberangkatan" bisa dibaca terbalik. Aturan yang dipakai di tempat lain: berlaku minimal 12 bulan setelah tanggal berangkat. Tulis ulang dan samakan dengan `/lengkapi` dan blok pembayaran.
3. **Kebijakan privasi** (PUB-004): `docs/legal/kebijakan-privasi-draft.md` penuh tanda `[ISI]` dan `[PERLU DITINJAU HUKUM]`: masa simpan angka, persetujuan data kesehatan dan data anak, transfer lintas negara, kontak DPO. Selama belum tayang, halaman live tidak menyebut KTP, paspor, data kesehatan, Clarity, CAPI.
4. **Banner persetujuan pelacak** (PUB-101): ya atau tidak, dan apakah tag ditahan sampai setuju. Draf kebijakan sendiri mencatat keputusan ini belum dibuat.
5. **Izin haji** (PUB-103): apakah PT punya izin PIHK. Bila tidak, hapus "Haji" dari situs.
6. **SOP publik** (PUB-102): tampilkan SOP utuh atau PDF bertanda tangan di `/sop-agen`; putuskan apakah sanksi dan aturan pembagian komisi boleh publik atau hanya setelah login.
7. **Isi SOP yang taksa** (dari PDF): batas tingkat tumpang tindih (Silver 1-15, Gold 15-30, Platinum "minimal 30"); "Bonus Closing Silver" (bagian 4e) vs "Bonus Agen" tanpa batasan (bagian 15); tabel komisi di bagian 10 berisi "Rp________" sedangkan bagian 4e memberi rentang dan situs menulis "dikonfirmasi PIC"; contoh 2 (komisi baru diberikan setelah jamaah berangkat) vs bagian 9 (semua syarat, tanpa kata berangkat); syarat "Bukan karyawan" (situs) vs "Karyawan boleh" (SOP). Putuskan kata yang berlaku lalu perbarui SOP dan situs bersamaan.
8. **Angka kepercayaan** (PUB-014): sumber "3000+" dan "290+ ulasan", dan tahun berdiri ("3 Tahun" vs "sejak 2015").
9. **Cek status memuat jumlah bayar dan sisa?** Saat ini sengaja tipis (tahap saja). Menambah nominal membantu jamaah tetapi memperbesar data yang bisa dilihat siapa pun yang tahu kode dan nomor.
10. **Notifikasi otomatis** (PUB-006, PUB-023): pilih gateway WA resmi dan nomor pengirim; tanpa itu 18 dari 19 pesan tetap manual.
11. **`www`** (PUB-010): domain `www` diarahkan ke apex atau dihapus.
12. **Posisi komisi publik**: halaman hanya berkata "dikonfirmasi PIC". Surat 035-037/MSFR/IX/2026 (commit `9e1e98f`) tampaknya sudah menetapkan angka; putuskan apakah boleh dipublikasikan.

## 7. Yang tidak dapat diverifikasi

- Dashboard Supabase (SMTP, templat Auth, RLS produksi, isi `page_seo`, `faq_items`, `testimonials`, `website_settings`, `get-marketing-pixels`), Cloudflare (aturan redirect, rate limit, Insights), isi kontainer GTM `GTM-TGNZSHNW` (apakah ada tag GA4 atau Meta ganda), konfigurasi masking Clarity, Events Manager Meta (apakah Contact dan Lead tampil, kualitas pencocokan, duplikat PageView).
- Peristiwa pelacakan di peramban: panel browser memiliki pemblokir iklan, sehingga Pixel/TikTok/GA/Clarity tidak berjalan; dinilai dari kode. Duplikasi TikTok dan GA4 (PUB-107) tidak terbukti runtime.
- `/api/cek-status` dan `/meta-capi` tidak diuji dengan POST (dilarang); perilaku batas laju, respons 429, dan penyalahgunaan CAPI dinilai dari kode dan migrasi. Pengiriman form dan hasil cek status tidak diuji ujung ke ujung.
- Meta/OG/JSON-LD per paket di DOM hidup (pembaruan react-helmet-async memakai `requestAnimationFrame`, tidak berjalan di panel tersembunyi: judul tab sering tetap generik); dinilai dari kode dan HTML awal.
- Popup WhatsApp pada Safari iOS (PUB-047) tidak diuji di perangkat; LCP, CLS, INP tidak terukur (tidak ada CrUX/PageSpeed).
- Apakah pelanggaran CSP GTM server-side (PUB-045) masih ada: perlu konsol browser tanpa pemblokir.
- Tanda tangan dan keabsahan PDF SOP (hanya teks diekstrak; halaman bertanda tangan 'Bekasi, 18 Agustus 2026' terbaca sebagai teks).
- Kasus: status paket "Gabung Waitlist" di bar bawah ponsel vs form `/daftar` menerima daftar tunggu (PUB-042) hanya dibaca dari kode.
