# Rencana implementasi: desain baru dan optimasi mobile untuk halaman admin

Tanggal: 2026-10-16. Status: **menunggu persetujuan** (belum ada kode yang diubah untuk rencana ini).
Cakupan: seluruh menu sidebar admin (29 menu), 15 rute lain di luar menu, 52 dialog dan sheet, header dan notifikasi, serta semua keadaan (kosong, memuat, galat).

## 1. Tujuan
1. Halaman admin memakai bahasa desain yang sama dengan portal agen dan situs publik (pkg-v2), jadi tiga area terasa satu produk.
2. Semua halaman bisa dipakai nyaman di HP (390 px) tanpa gulir horizontal, tanpa tombol kecil, dan dengan form yang tidak membingungkan.
3. Tidak ada perubahan perilaku: peran, izin, kueri, dan alur data tetap sama. Ini pekerjaan tampilan dan susunan.
4. Desktop tidak menurun: admin banyak bekerja di laptop dengan tabel padat, jadi tabel tetap tabel di layar lebar.

## 2. Rangkuman bahasa desain yang dipakai (dari portal agen)
**Warna dan permukaan**
- Krem hangat (`--pkg-cream`, `--pkg-cream-2`), tinta hampir hitam (`--pkg-ink`), merah fungsional `#C4141B` hanya untuk aksi utama dan peringatan. Tanpa emerald, amber, slate mentah (113 pemakaian di halaman, 192 di komponen akan diganti token status).
- Panel bertumpuk: panel gelap di atas (judul besar tipis), panel krem di bawahnya, tepi membulat 32 px, tanpa kotak dan garis berat. Pemisah hanya garis rambut tipis.
- Kaca (glass): pil untuk aksi sekunder, kaca merah untuk aksi utama, kaca gelap di atas panel gelap. Status memakai pil berikon dan teks, tidak pernah warna saja.

**Tipografi**
- Onest ringan (300 untuk judul, 400 isi, 500 label). Judul halaman tanpa titik. Teks singkat, satu hal per baris, tidak terlalu menjelaskan. Ukuran isi minimal 15 px di HP, 14 px di desktop padat.

**Komponen dan pola**
- Aksi: pil 44 px (utama merah, sekunder kaca), animasi tekan seragam. Bahaya: teks merah tua, isi merah penuh hanya di konfirmasi terakhir.
- Daftar: baris dengan judul, keterangan, chevron, tanpa kartu berbingkai. Di HP, tabel menjadi daftar kartu ringkas.
- Overlay: dialog di HP menjadi bottom sheet (sudut atas 32 px, latar blur), dialog di desktop berupa kartu tengah. Menu dan pilihan berupa nampan membulat. Masuk dan keluar satu kurva easy-ease (340 sampai 420 ms masuk, 200 sampai 260 ms keluar), hormati "kurangi gerakan".
- Toast kapsul gelap berikon, di bawah header, geser ke atas untuk menutup.
- Keadaan: `AgentEmpty` (ikon dan satu kalimat), `LoadError` (pesan dan Coba lagi), kerangka memuat.
- Salin: selalu lewat `copyText` dengan notifikasi. Navigasi bawah berupa ikon saja di portal agen.

**Aturan isi**: bahasa Indonesia sehari-hari, kata kerja jelas ("Terima 3 orang"), tidak ada bahasa Inggris tersisa, tidak ada catatan internal di layar.

## 3. Kondisi admin sekarang (hasil pemindaian kode)
- 41 halaman (18.712 baris) dan 46 berkas komponen admin (10.705 baris). Terbesar: `PackageForm` 1.746 baris, `BulkPackageUpload` 1.183, `CogsCalculator` 991, `Gamification` 999, `PackageBrochure` 872, `URLShortener` 842.
- **28 tabel** di halaman dan 9 di komponen (selain tabel pada desktop, perlu padanan kartu di HP). Hanya 149 pemakaian kelas responsif di semua halaman, dan 18 halaman memiliki 0 atau 1, artinya belum dipikirkan untuk HP: ArticleForm, Articles, Equipment, FAQ, Gamification, JadwalKeberangkatan, JamaahPayments, MarketingSettings, MasterCOGS, PackageItems, Packages, Profile, SalesCalculator, SellingPoints, Team, Testimonials, URLShortener, WhatsAppInbox.
- **52 dialog, sheet, dan alert** (31 di halaman, 21 di komponen), plus `useConfirmDialog` dipakai di 10 berkas. Saat ini mereka memakai gaya shadcn bawaan. Gaya portal agen belum berlaku di admin karena hanya aktif lewat kelas `html.pkg-agent`.
- **Warna mentah** (emerald, amber, slate, dan sebagainya) tersebar: 113 pemakaian di halaman (terbanyak `Dashboard` 20, `Team` 14, `Profile` 13, `PackageBrochure` 12, `ProductDevelopment` 11, `SalesCalculator` 11, `Packages` 10) dan 192 di komponen.
- Shell sudah modern: sidebar gelap 260 px yang bisa mengecil, pencarian halaman (Ctrl/Cmd K), bel notifikasi dengan grup dan arsip, menu pengguna. Di HP sudah menjadi laci. Belum ada tata letak khusus HP untuk isi halamannya.

## 4. Keputusan desain (rekomendasi saya, bisa diubah di bagian 14)
1. **Dua bentuk, satu isi:** di layar ≥768 px tabel tetap tabel (padat, bisa diurutkan). Di bawah 768 px, tabel menjadi daftar kartu ringkas: satu judul, dua keterangan penting, satu pil status, dan aksi di menu titik tiga yang membuka sheet.
2. **Navigasi HP admin:** header gelap dengan laci menu (sudah ada), **tanpa bilah bawah**. Alasannya, menu admin tergantung peran (dari 2 sampai 29 item), jadi bilah tetap tidak cocok. Sebagai gantinya: pencarian halaman di header dan **tombol aksi utama per halaman** (misalnya "+ Tambah paket") di bilah bawah halaman yang bersangkutan.
3. **Form:** satu kolom di HP, label di atas isian, isian 56 px, bilah **Simpan menempel di bawah** (di atas pengaman area bawah layar), Batal hilang di HP karena ada tombol kembali. Autosave tidak dipakai di admin (risiko ubah data produksi), simpan tetap eksplisit.
4. **Alat berat** (impor Excel massal, kalkulator COGS lengkap, editor teks kaya, brosur cetak): tetap berfungsi di HP untuk hal dasar, dengan petunjuk "Lebih nyaman di laptop". Tidak dipaksa menjadi ramah HP penuh.
5. **Padat di desktop:** panel admin memakai tinggi baris 48 px (satu baris) dan 64 px (dua baris), isian 40 px, tipografi 14 px, dibandingkan portal agen yang memakai 44 sampai 56 px untuk jempol.
6. **Pengujian dengan data tiruan:** kita tidak punya akun admin di lingkungan uji, jadi setiap halaman diperiksa lewat harness dengan data contoh di tiga lebar (390, 768, 1280), ditambah pengujianmu di HP.

## 5. Wave 0: fondasi (semua halaman ikut terkena)
Dikerjakan pertama, dan menutup lebih dari separuh pekerjaan karena sebagian besar halaman memakai komponen bersama.

| # | Pekerjaan | Berkas utama | Hasil |
|---|---|---|---|
| 0.1 | `html.pkg-admin` dipasang oleh `AdminLayout`; `useAgentSkin` digeneralisasi menjadi `useAppSkin` (agen atau admin) | `hooks/useAgentSkin.ts`, `AdminLayout.tsx`, `ui/dialog`, `alert-dialog`, `sheet`, `dropdown-menu`, `select`, `popover` | **Semua 52 dialog, menu, dan pilihan** otomatis bergaya baru: bottom sheet di HP, nampan membulat |
| 0.2 | Pemindahan CSS skin dari `html.pkg-agent` ke selektor bersama `.pkg-app-skin` | `styles/pkg-v2.css`, `pkg-app.css` | Satu sumber untuk agen dan admin |
| 0.3 | `AdminPage` dan `AdminPanel` (kerangka halaman: judul, tindakan di kanan atas, panel) | baru `components/admin/AdminPage.tsx` | Judul besar tipis, panel bertumpuk di HP, blok tunggal membulat di desktop |
| 0.4 | `DataView`: satu komponen yang merender tabel di desktop dan daftar kartu di HP dari definisi kolom yang sama | baru `components/admin/DataView.tsx` | Menggantikan 28+9 tabel tanpa menulis dua tampilan per halaman |
| 0.5 | `FilterBar`: kolom cari, chip, dan tombol Filter yang membuka sheet (pola `PackageFilterSheet`) | baru | Filter seragam |
| 0.6 | `FormShell`: bagian-bagian form, bilah Simpan menempel, deteksi 'belum disimpan' | baru | Semua form (±20) ikut |
| 0.7 | `ConfirmDialog` bergaya baru (dengan ketik nama untuk hapus berat) | `ui/confirm-dialog.tsx`, `useConfirmDialog.tsx` | Menutup 10 berkas `useConfirmDialog` dan 8 AlertDialog |
| 0.8 | `StatusPill` tunggal dengan peta status ke token (menggantikan emerald dan amber mentah) | `ui/status-badge.tsx` | Warna konsisten |
| 0.9 | Token: ganti semua warna mentah di admin lewat codemod terverifikasi per berkas | seluruh `pages/admin`, `components/admin` | 305 pemakaian hilang |
| 0.10 | Header admin: ikon dan jarak, bel notifikasi sebagai panel krem, pencarian halaman sebagai sheet di HP | `AdminHeader.tsx`, `ShellHeader.tsx`, `ShellCommandPalette.tsx` | Header terasa satu keluarga |
| 0.11 | Pemeriksa desain otomatis: skrip yang gagal bila ada warna mentah, tombol di bawah 44 px di HP, atau `<table>` mentah baru | `scripts/check-design.mjs` dan `npm test` | Mencegah mundur |
| 0.12 | Halaman `/styleguide` (noindex) yang merender semua primitif asli dalam semua keadaan | baru `pages/Styleguide.tsx` | Satu tempat untuk diperiksa dan diuji |

**Gerbang Wave 0:** tsc, build, 23 tes yang ada ditambah tes baru, tangkapan layar styleguide di 3 lebar, dan satu halaman contoh (Verifikasi Pembayaran) selesai sebagai acuan sebelum wave lain dimulai.

## 6. Pola mobile (aturan yang berlaku di semua halaman)
| Elemen | Aturan di HP |
|---|---|
| Judul halaman | Panel gelap atas, judul 40 px tipis tanpa titik, aksi utama sebagai tombol merah di bawah judul |
| Tabel | `DataView`: kartu ringkas (judul, 2 keterangan, pil status), ketuk membuka sheet detail, aksi di titik tiga |
| Filter dan cari | Kolom cari tetap terlihat, filter lain dalam sheet dengan chip, jumlah filter aktif di tombol |
| Tab | Chip bergulir (bukan tab kotak) |
| Form | Satu kolom, label di atas, isian 56 px, bilah Simpan menempel, kolom angka memakai papan angka, tanggal memakai pemilih bawaan |
| Dialog | Bottom sheet, judul besar rata kiri, tombol X kaca, aksi bertumpuk lebar penuh |
| Konfirmasi | `ConfirmDialog`, hapus berat meminta mengetik nama |
| Unggah | Tombol besar, pratinjau gambar, progres, kompresi di perangkat |
| Angka dan uang | `tabular-nums`, Rupiah ringkas ("1,5 jt") di kartu, lengkap di detail |
| Gulir | Tidak ada gulir horizontal; tabel lebar hanya muncul di desktop |
| Target sentuh | Minimal 44 px, jarak antar target minimal 8 px |
| Area aman | Padding bawah untuk bilah gestur iPhone, tombol bawah tidak tertutup keyboard |
| Teks | Maksimal dua baris per keterangan di kartu, terpotong dengan elipsis |

## 7. Wave per bagian sidebar
Urutan berdasarkan seberapa sering dipakai dan seberapa riskan datanya. Setiap wave: kerjakan, verifikasi, pratinjau untuk kamu uji, lalu rilis.

**Wave 1: Jamaah dan Keuangan** (paling sering dipakai, uang). Dashboard, Data Jamaah (dan semua jamaah, masuk), Verifikasi Pembayaran, Laporan Keuangan, Pembayaran Komisi. Dialog: pendaftaran, pembayaran, hapus, impor, tolak, kirim info DP, tandai dibayar, sengketa.
**Wave 2: Pemasaran dan Agen.** Kelola Agen (dengan bukti transfer, persetujuan, tombol **Beri badge** untuk Class Act, Top of the Board, Rookie of the Year), Komisi Agen, Lead Agen, Gamifikasi (disesuaikan dengan 25 badge baru), Pembuat Flyer, Analitik, Pengaturan Pemasaran, SEO.
**Wave 3: Produk dan Layanan.** Paket Umroh (daftar, form 1.746 baris dipecah per langkah, impor massal, riwayat), Pengembangan Produk, Hotel (daftar, form, tambah cepat), Fasilitas Paket, Perlengkapan, Jadwal Keberangkatan.
**Wave 4: Alat dan Keuangan.** Kalkulator Harga, Master COGS (alat berat, kebijakan HP seperti di bagian 4).
**Wave 5: Situs dan Konten.** Hero, Keunggulan, Testimoni, Galeri, Artikel (daftar dan form dengan editor teks kaya), FAQ.
**Wave 6: Pengaturan dan sisanya.** Pengaturan Situs, Tim, Profil Saya, Rotasi CS WhatsApp, URL Shortener (dan template), Lead Kalkulator, Kotak Masuk WhatsApp, Biaya Iklan, Brosur paket.

## 8. Matriks lengkap: setiap halaman (44 rute)
| Wave | Sidebar | Menu | Rute | Berkas | Baris | Dialog | Tabel | Perlakuan | Peran |
|---|---|---|---|---|---:|---:|---:|---|---|
| 1 | Utama | Dashboard | `/admin` | `Dashboard.tsx` | 353 | 0 | 0 | Dashboard owner: kartu angka bertumpuk, antrean kerja jadi daftar bertombol, warna status ke token | admin,superadmin,product_admin,product_contributor,content_admin,agent_admin,cs_admin |
| 1 | Jamaah & Keuangan | Data Jamaah | `/admin/jamaah` | `Jamaah.tsx` | 644 | 1 | 1 | Daftar jamaah jadi kartu di HP (JamaahCardList sudah ada, dirapikan), filter jadi sheet, seat-source toggle ke sheet | admin,superadmin,cs_admin |
| 1 | Jamaah & Keuangan | Laporan Keuangan | `/admin/jamaah/keuangan` | `JamaahFinance.tsx` | 300 | 0 | 2 | Laporan keuangan: angka besar bertumpuk, tabel jadi daftar ringkas, tab jadi chip | admin,superadmin,finance |
| 1 | (di luar menu) | - | `/admin/jamaah/masuk` | `JamaahIntake.tsx` | 465 | 3 | 0 | Antrean pendaftaran masuk: kartu dengan aksi Terima, Tolak, Kirim info DP (3 dialog jadi sheet) | - |
| 1 | Jamaah & Keuangan | Verifikasi Pembayaran | `/admin/jamaah/pembayaran` | `JamaahPayments.tsx` | 188 | 0 | 0 | Verifikasi pembayaran: kartu per bukti, foto bukti penuh layar, aksi Setujui atau Tolak di sheet | admin,superadmin,cs_admin,finance |
| 1 | (di luar menu) | - | `/admin/jamaah/semua` | `JamaahAll.tsx` | 391 | 0 | 1 | Tabel semua jamaah: tabel di desktop, kartu di HP, ekspor tetap | - |
| 1 | Jamaah & Keuangan | Pembayaran Komisi | `/admin/pembayaran-komisi` | `CommissionPayouts.tsx` | 479 | 0 | 1 | Pembayaran komisi: antrean per agen sebagai kartu, dua persetujuan terlihat jelas, bukti transfer di sheet | admin,superadmin,finance,agent_admin |
| 2 | Pemasaran & Agen | Lead Agen | `/admin/agent-leads` | `AgentLeads.tsx` | 242 | 1 | 1 | Lead agen: kartu dengan sheet detail | admin,superadmin,agent_admin,cs_admin |
| 2 | Pemasaran & Agen | Kelola Agen | `/admin/agents` | `AgentManagement.tsx` | 696 | 1 | 1 | Kelola agen: kartu agen dengan status, bukti transfer dan persetujuan di dialog agen (sheet), Beri badge manual, Log penjualan | admin,superadmin,agent_admin |
| 2 | Pemasaran & Agen | Analitik | `/admin/analytics` | `Analytics.tsx` | 484 | 0 | 1 | Analitik: kartu angka, grafik satu kolom, tabel jadi daftar | admin,superadmin,advertiser |
| 2 | Pemasaran & Agen | Pembuat Flyer | `/admin/flyer-generator` | `FlyerGenerator.tsx` | 134 | 0 | 0 | Pembuat flyer: pilih paket lalu pratinjau, unduh | admin,superadmin,content_admin |
| 2 | Pemasaran & Agen | Gamifikasi | `/admin/gamification` | `Gamification.tsx` | 999 | 3 | 3 | Gamifikasi (999 baris): sesuaikan dengan sistem badge baru (25 badge dari katalog), tantangan dan hadiah, tiga dialog jadi sheet | admin,superadmin,agent_admin |
| 2 | Pemasaran & Agen | Komisi Agen | `/admin/komisi-agen` | `AgentCommissions.tsx` | 382 | 1 | 1 | Komisi agen: tabel jadi kartu, dialog tarif jadi sheet | admin,superadmin,agent_admin |
| 2 | Pemasaran & Agen | SEO | `/admin/seo` | `SEO.tsx` | 299 | 0 | 1 | SEO: daftar halaman dengan skor, tab jadi chip | admin,superadmin,content_admin |
| 2 | Pemasaran & Agen | Pengaturan Pemasaran | `/admin/settings/marketing` | `MarketingSettings.tsx` | 295 | 0 | 0 | Pengaturan pemasaran: form berkelompok satu kolom | admin,superadmin,advertiser |
| 3 | Produk & Layanan | Perlengkapan | `/admin/equipment` | `Equipment.tsx` | 283 | 1 | 0 | Perlengkapan: daftar sederhana, tambah atau ubah lewat sheet | admin,superadmin,product_admin |
| 3 | Produk & Layanan | Hotel | `/admin/hotels` | `Hotels.tsx` | 315 | 1 | 0 | Daftar hotel: kartu dengan foto, hapus lewat ConfirmDialog | admin,superadmin,product_admin |
| 3 | (di luar menu) | - | `/admin/hotels/:id` | `HotelForm.tsx` | 525 | 0 | 0 | Sama dengan form hotel baru | - |
| 3 | (di luar menu) | - | `/admin/hotels/new` | `HotelForm.tsx` | 525 | 0 | 0 | Form hotel: satu kolom, unggah foto besar, bilah simpan di bawah | - |
| 3 | Produk & Layanan | Jadwal Keberangkatan | `/admin/jadwal` | `JadwalKeberangkatan.tsx` | 304 | 0 | 0 | Jadwal keberangkatan: tampilan kalender atau daftar per bulan yang bisa digulir di HP | admin,superadmin,product_admin |
| 3 | Produk & Layanan | Fasilitas Paket | `/admin/package-items` | `PackageItems.tsx` | 445 | 1 | 1 | Fasilitas paket: daftar dengan tab jadi chip, tambah atau ubah lewat sheet | admin,superadmin,product_admin |
| 3 | Produk & Layanan | Paket Umroh | `/admin/packages` | `Packages.tsx` | 733 | 2 | 1 | Daftar paket: kartu di HP dengan seat, status, aksi di menu titik tiga; filter sheet; hapus lewat ConfirmDialog | admin,superadmin,product_admin,product_contributor |
| 3 | (di luar menu) | - | `/admin/packages/:id` | `PackageForm.tsx` | 1746 | 1 | 0 | Sama dengan form paket baru (mode ubah), termasuk riwayat perubahan sebagai sheet | - |
| 3 | (di luar menu) | - | `/admin/packages/new` | `PackageForm.tsx` | 1746 | 1 | 0 | Form paket (1.746 baris): dipecah per langkah (Dasar, Harga, Hotel, Fasilitas, Flyer), satu kolom, bilah simpan menempel di bawah | - |
| 3 | Produk & Layanan | Pengembangan Produk | `/admin/product-development` | `ProductDevelopment.tsx` | 198 | 1 | 1 | Pengembangan produk: daftar kartu, COGS di sheet | admin,superadmin,product_admin,product_contributor |
| 4 | Alat & Keuangan | Kalkulator Harga | `/admin/calculator` | `SalesCalculator.tsx` | 634 | 0 | 0 | Kalkulator harga: input satu kolom, hasil menempel di atas, tabel hasil jadi kartu | admin,superadmin,product_admin |
| 4 | Alat & Keuangan | Master COGS | `/admin/master-cogs` | `MasterCOGS.tsx` | 44 | 0 | 0 | Master COGS: alat berat, desktop utama; di HP baca dan ubah angka dasar, sisanya ada petunjuk 'lebih nyaman di laptop' | admin,superadmin,product_admin |
| 5 | Situs & Konten | Artikel | `/admin/articles` | `Articles.tsx` | 280 | 1 | 1 | Artikel: kartu dua baris (judul, tanggal, status), hapus lewat ConfirmDialog | admin,superadmin,content_admin |
| 5 | (di luar menu) | - | `/admin/articles/:id` | `ArticleForm.tsx` | 474 | 0 | 0 | Sama dengan form artikel baru | - |
| 5 | (di luar menu) | - | `/admin/articles/new` | `ArticleForm.tsx` | 474 | 0 | 0 | Form artikel: editor teks kaya dengan bilah alat yang bisa digeser, bilah simpan di bawah | - |
| 5 | Situs & Konten | FAQ | `/admin/faq` | `FAQ.tsx` | 381 | 1 | 1 | FAQ: daftar pertanyaan, tambah atau ubah lewat sheet | admin,superadmin,content_admin |
| 5 | Situs & Konten | Galeri | `/admin/gallery` | `GalleryManagement.tsx` | 550 | 1 | 1 | Galeri: grid foto 2 kolom di HP, unggah beberapa sekaligus, ubah lewat sheet | admin,superadmin,content_admin |
| 5 | Situs & Konten | Hero Beranda | `/admin/hero` | `HeroSection.tsx` | 272 | 0 | 0 | Hero beranda: form satu kolom dengan pratinjau gambar | admin,superadmin,content_admin |
| 5 | Situs & Konten | Keunggulan | `/admin/selling-points` | `SellingPoints.tsx` | 282 | 1 | 1 | Keunggulan: daftar yang bisa diurutkan, tambah atau ubah lewat sheet | admin,superadmin,content_admin |
| 5 | Situs & Konten | Testimoni | `/admin/testimonials` | `Testimonials.tsx` | 486 | 1 | 1 | Testimoni: kartu dengan foto dan bintang, tambah atau ubah lewat sheet | admin,superadmin,content_admin |
| 6 | (di luar menu) | - | `/admin/ad-spend` | `AdSpend.tsx` | 276 | 0 | 2 | Biaya iklan: tabel jadi daftar, input satu kolom | - |
| 6 | (di luar menu) | - | `/admin/brochure/:slug` | `PackageBrochure.tsx` | 872 | 0 | 0 | Brosur paket: halaman cetak. Hanya tokenisasi warna, tata letak cetak tidak diubah | - |
| 6 | (di luar menu) | - | `/admin/calculator-leads` | `CalculatorLeads.tsx` | 378 | 1 | 1 | Lead kalkulator: kartu dengan sheet detail | - |
| 6 | (di luar menu) | - | `/admin/chat-rotation` | `ChatRotation.tsx` | 730 | 1 | 0 | Rotasi CS WhatsApp: kartu CS dengan urutan, ubah lewat sheet | - |
| 6 | (di luar menu) | - | `/admin/profile` | `Profile.tsx` | 301 | 0 | 0 | Profil saya: foto, nama, ganti password (gaya Profil agen) | - |
| 6 | Pengaturan | Pengaturan Situs | `/admin/settings` | `WebsiteSettings.tsx` | 301 | 0 | 0 | Pengaturan situs: form berkelompok satu kolom, bilah simpan di bawah | admin,superadmin |
| 6 | Pengaturan | Tim | `/admin/team` | `Team.tsx` | 462 | 2 | 1 | Tim: kartu anggota, undang dan ubah akses lewat sheet | admin,superadmin |
| 6 | (di luar menu) | - | `/admin/url-shortener` | `URLShortener.tsx` | 842 | 4 | 2 | URL Shortener (842 baris, 4 dialog): daftar link kartu, buat dan ubah lewat sheet, analitik di sheet | - |
| 6 | (di luar menu) | - | `/admin/whatsapp-inbox` | `WhatsAppInbox.tsx` | 247 | 1 | 1 | Kotak masuk WhatsApp: daftar percakapan, konversi di sheet | - |

Catatan: kolom **Dialog** menghitung dialog, sheet, drawer, dan alert dialog di berkas halaman itu sendiri. Dialog di komponen bersama ada di bagian 9.

## 9. Matriks lengkap: setiap dialog, sheet, dan konfirmasi
| Berkas | Dialog | Jenis | Perlakuan baru |
|---|---|---|---|
| `jamaah/RegistrationDialog.tsx` | Tambah atau ubah jamaah | Form besar | Sheet penuh di HP, satu kolom, bilah Simpan menempel |
| `jamaah/RegistrationSheet.tsx` | Detail jamaah | Detail | Sheet, bagian-bagian bertumpuk, aksi di bawah |
| `jamaah/PaymentDialog.tsx` | Catat pembayaran | Form | Sheet, nominal besar, unggah bukti |
| `jamaah/PaymentTable.tsx` | Tolak pembayaran | Form kecil | Sheet kecil dengan alasan |
| `jamaah/DeleteRegistrationDialog.tsx` | Hapus jamaah | Konfirmasi berat | ConfirmDialog dengan ketik nama |
| `jamaah/ImportSheetDialog.tsx` | Impor dari Google Sheet | Alat | Sheet; pratinjau tabel bisa digulir |
| `jamaah/ImportWorkbookDialog.tsx` | Impor semua tab | Alat | Sama; ada petunjuk 'lebih nyaman di laptop' |
| `Jamaah.tsx` | Hitung seat dari data jamaah | Konfirmasi | ConfirmDialog |
| `JamaahIntake.tsx` | Kirim info DP, Terima, Tolak | 3 form kecil | 3 sheet kecil, tombol utama merah hanya di Tolak |
| `commission/PayoutDialog.tsx` | Tandai dibayar | Form | Sheet, unggah bukti, ringkasan potongan |
| `commission/DisputeDialog.tsx` | Putuskan sengketa lead | Form | Sheet dengan dua pilihan jelas |
| `commission/RateHistoryDrawer.tsx` | Riwayat tarif | Detail | Sheet daftar |
| `AgentCommissions.tsx` | Paket ini belum punya tarif | Peringatan | Sheet kecil |
| `agents/AgentDetailDialog.tsx` | Detail agen, bukti transfer, setujui | Detail dan aksi | Sheet panjang; bukti transfer, Beri badge, Tandai biaya |
| `AgentManagement.tsx` | Log penjualan | Form | Sheet |
| `AgentLeads.tsx` | Detail lead | Detail | Sheet |
| `Gamification.tsx` | Tantangan, lencana, hadiah | 3 form | 3 sheet; lencana mengikuti sistem 25 badge baru |
| `CalculatorLeads.tsx` | Detail lead kalkulator | Detail | Sheet |
| `Packages.tsx` | Hapus paket, Riwayat perubahan | Konfirmasi, detail | ConfirmDialog, sheet |
| `PackageForm.tsx` | Riwayat perubahan | Detail | Sheet |
| `BulkActions.tsx` | Konfirmasi aksi massal | Konfirmasi | ConfirmDialog |
| `BulkFlyerUpload.tsx` | Unggah flyer massal | Alat | Sheet; daftar berkas dengan progres |
| `BulkPackageUpload.tsx` | Impor paket dari Excel | Alat besar | Sheet lebar di desktop; petunjuk laptop di HP |
| `ChangeReasonDialog.tsx` | Kenapa paket ini diubah | Form kecil | Sheet kecil, wajib diisi |
| `ProductDevelopment.tsx` | COGS paket | Detail | Sheet |
| `Hotels.tsx` | Hapus hotel | Konfirmasi | ConfirmDialog |
| `AddHotelModal.tsx` | Tambah hotel baru | Form | Sheet |
| `PackageItems.tsx`, `Equipment.tsx` | Tambah atau ubah item | Form kecil | Sheet kecil |
| `SellingPoints.tsx`, `Testimonials.tsx`, `FAQ.tsx`, `GalleryManagement.tsx` | Tambah atau ubah | Form | Sheet (galeri dengan pratinjau foto) |
| `Articles.tsx` | Hapus artikel | Konfirmasi | ConfirmDialog |
| `RichTextEditor.tsx` | Sisipkan link | Form kecil | Popover atau sheet kecil |
| `Team.tsx` | Undang anggota, Ubah hak akses | 2 form | 2 sheet; peran sebagai pilihan bergambar |
| `ChatRotation.tsx` | Tambah atau ubah CS | Form | Sheet |
| `URLShortener.tsx` | Buat link, Ubah link, Analitik, Hapus link | 3 sheet, 1 konfirmasi | Sheet, ConfirmDialog |
| `URLTemplateManager.tsx` | Hapus template, hapus massal | 2 konfirmasi | ConfirmDialog |
| `URLTemplateModal.tsx` | Tambah atau ubah template | Form | Sheet |
| `URLTemplatePreview.tsx` | Pratinjau template | Detail | Sheet |
| `WhatsAppInbox.tsx` | Tandai sebagai konversi | Form kecil | Sheet kecil |
| `SEO.tsx`, `ChatRotation.tsx`, dll. | `useConfirmDialog` (10 berkas) | Konfirmasi | Satu `ConfirmDialog` bergaya baru menutup semuanya |

Seluruh bentuk di atas otomatis memakai kulit baru lewat **0.1**, lalu isinya dirapikan per halaman di wave masing-masing. Total yang disentuh: 52 dialog dan sheet, 18 konfirmasi (8 AlertDialog dan 10 berkas `useConfirmDialog`), dan semua menu dropdown dan pilihan (Select) di admin.

## 10. Lintas halaman (di luar daftar halaman)
- **Header admin**: bel notifikasi (daftar bergrup, arsip, pengaturan jenis), pencarian halaman, menu pengguna, tombol kembali ke situs.
- **Laci sidebar HP**: gaya yang sama dengan portal agen (panel gelap, pil merah untuk halaman aktif, kartu profil di atas).
- **Halaman 404, error boundary, layar memuat, layar 'akses ditolak'** untuk peran yang tidak berhak.
- **Toast dan konfirmasi** konsisten di semua mutasi (sukses, galat, batal).
- **Cetak dan ekspor**: brosur cetak, ekspor Excel, tidak diubah tata letaknya.

## 11. Verifikasi dan kualitas (gerbang tiap wave)
1. `tsc -p tsconfig.app.json`, `vite build`, `npm test` hijau.
2. Pemeriksa desain otomatis (0.11) tanpa pelanggaran pada berkas yang disentuh.
3. Harness tangkapan layar per halaman di 390, 768, dan 1280 px dengan data contoh, termasuk keadaan kosong, memuat, galat, dan data sangat panjang.
4. Setiap dialog dibuka dan ditutup di 390 px (tidak terpotong, tombol utama terlihat, bisa digulir bila panjang, keyboard tidak menutup tombol).
5. Perilaku tidak berubah: daftar kolom kueri, nama bidang, dan mutasi tidak diubah; diff diperiksa untuk memastikan hanya JSX dan kelas yang berubah.
6. Pengujianmu di HP lewat pratinjau Cloudflare untuk tiap wave sebelum production.
7. Tes tambahan di tiap wave untuk logika yang saya sentuh (misalnya urutan, pemformatan, pemetaan status). Tes SQL badge sudah ada.

## 12. Rilis dan pemulihan
- Tiap wave dideploy dulu ke **pratinjau** (`--branch admin-wave-N`) untuk kamu uji dengan akun admin. Production hanya setelah kamu setuju.
- Satu commit per kelompok halaman, jadi bisa di-revert per kelompok bila ada masalah.
- Tidak ada perubahan database dalam rencana ini. Satu-satunya perubahan SQL: tombol **Beri badge** memakai fungsi `admin_award_badge` yang sudah ada.

## 13. Risiko dan penanganannya
| Risiko | Penanganan |
|---|---|
| Salah ubah perilaku saat merapikan form besar (PackageForm 1.746 baris) | Dipecah per langkah tanpa menyentuh logika simpan, diff dan uji per langkah, pratinjau sebelum production |
| Dialog panjang tertutup keyboard di HP | Bilah aksi menempel, `dvh`, pengujian di perangkat |
| Tabel padat kehilangan informasi saat jadi kartu | Detail penuh tetap di sheet, kolom penting dipilih bersama kamu per halaman |
| Peran berbeda melihat menu berbeda | Tidak mengubah `adminMenu.ts`, pengujian dengan data tiruan per peran |
| Cakupan besar memakan waktu | Wave 0 dahulu (manfaat terbesar), lalu wave berurutan, berhenti kapan saja dengan hasil utuh |
| Gaya baru mengganggu kebiasaan staf | Desktop tetap padat dengan tabel, perubahan terutama visual |

## 14. Keputusan terbuka (perlu jawaban kamu sebelum mulai)
1. **Navigasi HP admin**: header dan laci tanpa bilah bawah (rekomendasi), atau tambahkan bilah bawah untuk peran tertentu (misalnya CS: Jamaah, Pembayaran, Lead)?
2. **Desktop**: tetap padat dengan tabel (rekomendasi), atau ikut gaya longgar portal agen?
3. **Alat berat di HP**: kebijakan "bisa dibuka, ada petunjuk laptop" (rekomendasi), atau disembunyikan sepenuhnya di HP?
4. **Urutan wave**: Jamaah dan Keuangan dulu (rekomendasi), atau mulai dari bagian yang paling mengganggu menurutmu?
5. **Pratinjau**: kamu bisa menguji di HP dengan akun admin lewat pratinjau Cloudflare per wave (rekomendasi), atau langsung production setelah saya uji dengan data tiruan?

## 15. Ukuran pekerjaan (kasar)
Wave 0 besar, wave 1 besar, wave 2 sedang, wave 3 besar (PackageForm), wave 4 kecil, wave 5 sedang, wave 6 sedang. Setiap wave bisa selesai dan dirilis sendiri.
