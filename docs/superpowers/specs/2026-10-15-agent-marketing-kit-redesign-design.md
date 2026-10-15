# Marketing Kit agen: redesign

Tanggal: 2026-10-15. Status: menunggu persetujuan user. Halaman: `/agent/marketing-kit` (`src/pages/agent/AgentMarketingKit.tsx`, 687 baris).

## Masalah sekarang
- Layout tab (Visual, Copywriting, Video, Landing) lalu bagian "per paket" lalu alat link pendek: panjang, campur aduk, gaya lama berkotak.
- Tab Video selalu kosong. Tab Landing cuma satu link.
- Skrip WA dan caption IG berisi `[Nama]`, `[HARGA]`, `[NOMOR WA]` yang diisi agen sendiri.
- Materi per paket hanya flyer, katalog, itinerary, dan agen harus memilih paket lewat dropdown.

## Keputusan user
1. Halaman dibagi dua sisi: **Travel** (tentang Musafar) dan **Paket** (per paket).
2. Sakelar "Travel | Paket" di atas (susunan A), satu halaman, tanpa tab lama.
3. Link pendek dan pelacakan klik **dihapus** dari halaman (tabel `agent_short_links` tidak disentuh).
4. Tab Video dan Landing dihapus.
5. Sisi Travel berisi: profil dan legalitas, testimoni dan galeri.
6. Sisi Paket: daftar paket per bulan, ketuk membuka sheet berisi materi siap pakai.
7. Teks per paket dibuat otomatis dalam tiga gaya: WA singkat, WA lengkap, caption Instagram.

## Susunan
**Panel gelap (selalu tampil):** judul "Marketing.", satu baris link referral agen (`/r/<Agent ID>`) dengan tombol Salin (pakai `copyText`), lalu sakelar `Chips` "Travel | Paket" (komponen `Chips` di `AgentPage.tsx`).

**Sisi Travel (panel krem):**
- *Profil dan legalitas*: baris-baris pendek (Kenapa Musafar, Izin PPIU dan PT, Keunggulan). Tiap baris membuka sheet dengan teks siap kirim dan tombol Salin. Keunggulan diambil dari tabel `selling_points` yang sudah ada.
- *Testimoni dan galeri*: grid foto dari `gallery_images` dan kartu `testimonials` (data yang sama dengan situs publik). Tiap foto: Unduh dan Bagikan.

**Sisi Paket (panel krem):**
- Daftar paket published, dikelompokkan per bulan (pola `SelectGroup` di form daftar jamaah), baris: nama paket, tanggal, sisa seat.
- Ketuk baris: sheet dari bawah berisi
  - Flyer (`banner_image`) dengan Unduh dan Bagikan.
  - Tiga teks otomatis, masing-masing tombol Salin: WA singkat, WA lengkap (hotel, maskapai, fasilitas), caption Instagram dengan hashtag. Terisi dari data paket (nama, tanggal, durasi, hotel, maskapai, harga mulai) dan link referral agen untuk paket itu (`/paket-umroh/<slug>?ref=<Agent ID>`).
  - Katalog PDF dan itinerary (`catalog_link`, `itinerary_link`), hanya jika ada.
  - Tombol "Bagikan ke..." (menu share bawaan HP, fallback salin link), sama dengan `PackageShareModal`.

**Baris penutup:** "Konten buatan sendiri? Kirim ke PIC dulu, dicek kurang dari 24 jam." dengan tautan WhatsApp PIC (permintaan Virna, belum tertulis di portal).

## Skrip WA umum
Default saya: **dihapus dari halaman**, karena tiap paket kini punya tiga teks siap kirim. Jika user ingin tetap ada, tempatkan sebagai bagian ketiga di sisi Travel ("Skrip percakapan", baris yang membuka sheet), dengan `[Nama Agent]` terisi otomatis.

## Teknis
- Pakai komponen yang sudah ada: `AgentPage`, `AgentPanel`, `Chips`, `AgentEmpty`, `copyText` (`src/lib/copy.ts`), `Sheet`/`Dialog` bergaya agen, pola share dari `PackageShareModal`.
- Teks otomatis dibuat oleh satu fungsi murni (`buildPackageTexts(pkg, agentCode)`) di `src/lib/marketingText.ts`, agar bisa dites tanpa UI. `PackageShareModal` memakai fungsi yang sama untuk teks WA-nya supaya isinya tidak berbeda.
- Tidak ada perubahan database dan tidak ada SQL baru.
- Query: `packages` (published, termasuk hotel, maskapai, harga), `selling_points`, `gallery_images`, `testimonials` (semua sudah dibaca situs publik, jadi RLS sudah mengizinkan).
- Tombol dan target sentuh minimal 44 px, teks singkat, tanpa penjelasan panjang (preferensi user).

## Di luar lingkup
- Flyer yang memuat nama dan nomor agen (perlu pembuatan gambar per agen di server).
- Video.
- Alur persetujuan konten (hanya satu baris petunjuk ke PIC).

## Pertanyaan terbuka
1. **Nomor izin PPIU dan data PT** tidak ada di kode (hanya kalimat "berizin resmi PPIU Kemenag" dan nama "PT Musa Amanah Wisata"). Perlu nomor izin, tahun berdiri, dan jumlah jamaah dari tim agar bagian "Profil dan legalitas" berisi data asli, bukan placeholder.
2. Skrip WA umum: dihapus (default) atau dipindah ke Travel.

## Pengujian
- Uji unit untuk `buildPackageTexts` (tanggal, harga, link referral, paket tanpa hotel).
- Pemeriksaan visual di layar 390 px: kedua sisi, sheet paket, sheet profil, keadaan kosong (tidak ada paket, tidak ada galeri), penyalinan di http dan https.
- `tsc -p tsconfig.app.json` dan `vite build`.
