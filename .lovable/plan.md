## Umroh Financial Planner — Polish & Mind-Blow Update

### 1. Tombol "Hitung Lagi" (Reset)
- Tambah tombol **"Hitung untuk orang lain"** di slide terakhir hasil (sebelum/sesudah CTA WA) dan juga sebagai ikon kecil di pojok atas saat di slide hasil.
- Aksi: reset semua state (mode, input, slideIndex=0, lead form) → kembali ke Hero. Tidak reload page agar instant di booth.
- Konfirmasi ringan (kalau lead belum disubmit): "Mulai ulang? Data yang belum dikirim akan hilang." (skippable kalau lead sudah tersimpan).

### 2. Override Harga Paket (kalkulator-only)
- File `src/lib/calcConfig.ts` → tambah konstanta `TIER_PRICE_OVERRIDE`:
  - `hemat`: 28.900.000
  - `nyaman`: 33.400.000
  - `pelataran-hemat`: 33.900.000
  - `five-star`: 41.400.000
- `useCalculatorTiers` tetap query DB untuk dapat `packageId`, `packageName`, `earliestDeparture` (untuk tanggal real & link booking). Hanya `pricePerPerson` diganti dari override.
- DB packages **tidak disentuh** — listing publik tetap pakai harga asli.
- Tampilkan footnote kecil di kartu paket: "Harga indikatif kalkulator. Final saat pendaftaran."

### 3. Mind-Blow Feature A — Simulator "Skip 1 Kopi/Hari"
Slide baru setelah "Target Harian", judul: **"Geser kebiasaanmu, lihat keajaibannya."**
- 4 toggle/slider chip kebiasaan dengan estimasi default:
  - ☕ Kopi kekinian (Rp 25rb × N/minggu)
  - 🚬 Rokok (Rp 25rb/hari)
  - 🛵 Ojol bolak-balik (Rp 30rb/hari)
  - 📺 Langganan streaming (Rp 50rb/bulan)
- Tiap toggle on → tambahkan ke `monthlySaving` virtual.
- Tampilkan **delta real-time**: "Berangkat **4 bulan lebih cepat** → Februari 2027" + bar progress yang menyusut animasi.
- Pakai existing `earliestMonthsToDepart()` untuk recompute.
- Hint: "Niat baik berbuah jalan ke Baitullah."

### 4. Mind-Blow Feature B — Live Countdown ke Tanggal Target
Slide baru di akhir results (sebelum lead capture), judul: **"X hari lagi kamu di depan Ka'bah."**
- Hitung target date (Mode A: `feasibleDate`, Mode B: bulan target).
- Komponen `<CountdownTicker>` update tiap detik: `DD hari : HH jam : MM menit : SS detik`.
- Background: gradient gold/midnight + foto Ka'bah blur subtle.
- Caption: "Tiap detik yang lewat = satu detik lebih dekat. InsyaAllah."
- Countdown ini juga muncul di Share Card 9:16 (statis, dalam format "DD hari lagi").

### 5. Mind-Blow Feature C — Doa & Nama Orang Tersayang di Share Card
- Di lead form (sebelum reveal akhir), tambah field opsional:
  - **"Siapa yang ingin kamu ajak/doakan?"** (text, max 60 char) — placeholder: "Ayah, Ibu, atau dirimu sendiri"
- Field disimpan ke `umroh_calculator_leads.companion_name` (kolom baru, nullable text).
- Share Card 9:16 di-redesign:
  - Header: "Atas nama [Nama User]"
  - Hero: **"Untuk [Companion Name]"** dalam font kaligrafi/serif elegan
  - Tengah: tanggal target + countdown "X hari lagi"
  - Footer: logo Musafar + `musafartour.com/kalkulator`
- Jika kosong → fallback "Untuk diri sendiri & keluarga."
- Tetap pakai html2canvas → download PNG.

### 6. Database — Migration kecil
- Tambah kolom `companion_name TEXT NULL` ke `umroh_calculator_leads`.

### 7. Files yang Disentuh
- `src/lib/calcConfig.ts` — tambah `TIER_PRICE_OVERRIDE`
- `src/hooks/useCalculatorPackages.ts` — apply override pada `pricePerPerson`
- `src/pages/UmrohCalculator.tsx` — tombol "Hitung Lagi", simulator kebiasaan, countdown slide, field companion
- `src/components/calculator/ShareCard.tsx` — redesign dengan companion + countdown
- `src/components/calculator/HabitSimulator.tsx` (baru)
- `src/components/calculator/CountdownTicker.tsx` (baru)
- Migration: `companion_name` column

### Catatan
- Semua fitur baru tetap mengikuti Onest font, tight typography (-0.035em), dan tone spiritual yang lembut.
- Tidak ada perubahan ke listing publik atau halaman paket existing.
- Tracking pixel `Lead` tetap fire saat submit form — tidak berubah.