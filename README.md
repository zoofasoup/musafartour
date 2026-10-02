# Musafar Tour - Platform Travel Umroh & Haji

Selamat datang di repositori resmi **Musafar Tour**. Proyek ini adalah platform pendaftaran dan pengelolaan layanan travel Umroh dan Haji modern, dirancang untuk memberikan pengalaman terbaik (*premium*) bagi jamaah dari ujung ke ujung.

Platform ini tidak hanya memiliki desain antarmuka pengguna yang elegan dan super cepat, tetapi juga dioptimasi secara ekstensif untuk SEO dan *Conversion Rate Optimization (CRO)*, memastikan jamaah dapat mendaftar dengan mudah dan aman.

## 🚀 Fitur Utama
- **Landing Page Interaktif:** Menggunakan *Framer Motion* untuk *carousel* bergaya melingkar (*radial*) dan animasi super mulus.
- **Optimasi CRO:** Tombol Call-to-Action (CTA) yang menonjol, *trust badges* (sertifikasi Kemenag), dan bukti sosial yang didesain secara strategis untuk mendorong pendaftaran.
- **Technical SEO:** Terintegrasi penuh dengan Schema Markup, Meta Tag dinamis, optimasi *Largest Contentful Paint (LCP)*, dan URL canonical.
- **Mobile First:** Sepenuhnya responsif untuk pengguna yang mengakses lewat *smartphone*.

## 🛠️ Tech Stack
- **Framework:** React + Vite
- **Bahasa:** TypeScript
- **Styling:** Tailwind CSS + Vanilla CSS (Aesthetics)
- **Animasi:** Framer Motion
- **Komponen:** shadcn-ui + Lucide React
- **Backend/DB:** Supabase

## 💻 Panduan Menjalankan Secara Lokal

Pastikan Anda sudah menginstal Node.js (versi terbaru) sebelum menjalankan langkah-langkah di bawah ini:

1. **Clone repository ini**
   ```bash
   git clone https://github.com/zoofasoup/musafartour.git
   cd musafartour
   ```

2. **Instal dependensi**
   ```bash
   npm install
   ```

3. **Jalankan server lokal (Development)**
   ```bash
   npm run dev
   ```
   Aplikasi akan otomatis terbuka atau bisa diakses melalui `http://localhost:8080/`.

## 🕋 Pendaftaran & Data Jamaah (offline booking)

Booking online (Midtrans) sudah dimatikan. Jamaah didaftarkan lewat form, pembayaran dicatat manual oleh CS dan diverifikasi owner. Semua pembayaran hanya ke rekening PT; aturan: DP minimal Rp 5 jt per orang, cicilan bebas, lunas paling lambat H-30.

**Alur**
1. **Tahap 1, `/daftar/<slug>`** (publik, Turnstile): jamaah atau agen mengisi kontak dan siapa saja yang berangkat (dewasa / anak non bed / bayi, kamar Quad-Triple-Double). Link agen: `/daftar/<slug>?ref=<kode agen>`. Agen juga mendaftarkan dari portal: `/agent/daftar-jamaah` (login agen menggantikan Turnstile).
2. **Admin, Data Jamaah → Pendaftaran masuk** (`/admin/jamaah/masuk`): CS memeriksa lalu **Terima** (membuat keluarga + jamaah + harga) atau **Tolak**. Seat dihitung sejak diterima.
3. **Tahap 2, `/lengkapi/<token>`** (publik, link pribadi dari CS): jamaah melengkapi data sesuai formulir kertas PT (NIK, paspor, kontak darurat, dst.) dan mengunggah KTP/KK, paspor, pasfoto ke bucket privat `jamaah-docs`.
4. Persyaratan dan Term of Service ada di `/syarat-umroh` (teks dari formulir PT, jangan diubah tanpa persetujuan perusahaan).

**Seat:** `packages.seat_source` menentukan sumbernya. `sheet` memakai angka manual `slots_filled`; `website` menghitung otomatis dari jamaah aktif (`slots_registered`). Lihat `getSlotsTaken` di `src/lib/utils.ts`.

**Peran:** `cs_admin` (CS) mencatat dan menerima; hanya owner (admin/superadmin) yang memverifikasi pembayaran dan menghapus jamaah (Data Jamaah → panel detail → Hapus permanen; ditolak bila ada catatan pembayaran).

**Keamanan:** tabel pendaftaran tidak bisa diakses publik. Form publik dan Tahap 2 lewat Cloudflare Pages Functions (`functions/api/daftar.ts`, `functions/api/lengkapi.ts`) dengan service role; token Tahap 2 adalah satu-satunya kredensial dan hanya bisa dibaca fungsi database yang khusus service role.

**Rahasia & konfigurasi**
- `.env` (tidak masuk git): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_TURNSTILE_SITE_KEY`. Isinya dibaca saat server dev dinyalakan, restart setelah mengubahnya.
- Rahasia di Cloudflare Pages (jangan di `.env`): `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`.
  ```bash
  npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name musafartour
  ```

**Database (migrasi) dan deploy**: selalu terapkan migrasi **sebelum** deploy, dan pratinjau dulu.
```bash
npx supabase db push --dry-run     # lihat apa yang akan diterapkan
npx supabase db push --yes         # terapkan
npm run build
npx wrangler pages deploy dist --project-name musafartour --branch main --commit-dirty=true
```

## 🤖 Auto-Article Engine

Pipeline otomatis yang menulis dan menerbitkan artikel `/artikel` tanpa editor manusia, berjalan harian lewat GitHub Actions.

**Cara kerja:**
1. `scripts/article-pipeline/run.ts` memilih topik dari backlog evergreen (tabel `article_pipeline_topics`, tidak pernah berulang) plus maksimal 1 topik trending umroh per hari (Google Trends ID, best-effort, gagal dengan aman kalau tidak ada yang cocok).
2. Setiap topik dikirim ke Claude (Anthropic API) mengikuti aturan brand voice, SEO, dan keselamatan konten agama yang ada di `scripts/article-pipeline/systemPrompt.ts`.
3. Draft melewati QA gate otomatis (`scripts/article-pipeline/qa.ts`): jumlah kata, duplikasi, ciri-ciri tulisan AI/em dash, harga spesifik, klaim fiqh, subjudul, panjang meta description. Gagal sekali dapat kesempatan revisi otomatis satu kali, gagal lagi dilewati (skip) dan dicatat alasannya.
4. Artikel yang lolos ditulis ke tabel `articles` yang sama dengan CMS admin yang sudah ada, jadi bisa direview di `/admin/articles` seperti biasa kalau statusnya `draft`.
5. Setiap run dicatat di tabel `article_pipeline_runs` (jumlah publish/skip/regenerasi + detail per topik).

**Crawlability:** `/artikel` dan `/artikel/:slug` di-serve lewat Cloudflare Pages Functions (`functions/artikel/`) sebagai HTML server-rendered asli dengan title/meta/OG/JSON-LD yang benar, bukan shell SPA kosong. `/sitemap.xml` juga dinamis (`functions/sitemap.xml.ts`), otomatis memasukkan artikel yang sudah terbit.

**Menjalankan manual:**
```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ANTHROPIC_API_KEY=... PUBLISH_STATUS=dry-run npm run pipeline:articles
```

**Konfigurasi** (env var, di GitHub Actions lewat Repository Variables kecuali yang ditandai Secret):
| Variable | Default | Keterangan |
|---|---|---|
| `SUPABASE_URL` (Secret) | - | wajib |
| `SUPABASE_SERVICE_ROLE_KEY` (Secret) | - | wajib, bukan anon key |
| `ANTHROPIC_API_KEY` (Secret) | - | wajib |
| `CLAUDE_MODEL` | `claude-sonnet-5` | model generasi |
| `ARTICLES_PER_DAY` | `1` | total artikel per run |
| `MAX_TRENDING_PER_DAY` | `1` | batas topik trending per run |
| `QA_MIN_WORDS` | `900` | minimal jumlah kata |
| `PUBLISH_STATUS` | `dry-run` | `dry-run` (cuma generate + QA, tidak menulis apa pun) / `draft` (masuk `articles` sebagai draft, perlu direview) / `publish` (langsung tayang) |

Jadwal harian ada di `.github/workflows/article-pipeline.yml`, bisa juga dipicu manual lewat tab Actions (workflow_dispatch) dengan override `publish_status`.

> **Catatan operator:** jalankan `dry-run` dulu, lalu `draft` selama kurang lebih satu minggu sebelum pindah ke `publish` - ini konten agama yang tayang otomatis ke brand premium, layak direview manual dulu sebelum benar-benar lepas tangan. Pipeline ini juga tidak punya editor manusia sama sekali, jadi kalau tidak ada yang mengecek log `article_pipeline_runs` (atau riwayat run di tab Actions) seminggu sekali, pipeline bisa diam-diam terus gagal atau terus skip topik tanpa ada yang sadar.

## 🎨 Filosofi Desain
Kami hanya menggunakan palet warna khas *brand* (Hitam dan Abu-abu Netral) yang dikombinasikan dengan efek visual seperti *glassmorphism* dan *gradual blur* untuk membangun rasa percaya (*trust*) serta memberikan kesan pelayanan ibadah yang eksklusif dan menenangkan.

---
*© 2026 Musafar Tour. Dikembangkan oleh Tim Musafar.*
