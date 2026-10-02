# Musafar Tour: bahasa visual

Disepakati dengan pemilik lewat UI Kit (revisi 2, Oktober 2026) dan referensi yang beliau pilih. Setiap warna, ukuran, dan bentuk di kode harus berasal dari token di bawah ini. Nilai lain adalah penyimpangan yang perlu alasan.

Karakter: fungsional, sederhana, tapi tegas. Rapat. Lembut dan bersarang. Rasa "nyata": kapsul putih terangkat, bayangan halus, ikon bersama teks.

## Warna

Sumber: berkas logo resmi (`neo musafar.svg`). Nilai di tabel adalah patokan; token CSS ada di `src/index.css`.

| Peran | Nilai | Token | Dipakai untuk |
|---|---|---|---|
| Crimson (brand) | `#CC002D` | `--brand` | Tombol utama **situs publik**, penanda penting, lencana angka. Tidak pernah latar blok besar |
| Amber | `#FFB100` | `--amber` | Sorotan dan peringatan lembut: seat hampir penuh, komisi, lencana baru |
| Hampir hitam | `#262626` | `--primary`, `--foreground` | Teks, tombol utama **area kerja**, blok gelap besar |
| Putih keabuan | `#F2F3F3` | `--background` | Latar halaman |
| Putih | `#FFFFFF` | `--card` | Kartu, panel, menu |
| Abu | `#989999` | `--muted-foreground` (lebih tua untuk teks) | Teks pendukung, ikon |
| Isian | `#EDEEEE` | `--field`, hover `--field-hover` | Latar kolom isian dan jalur saklar |
| Garis | `#E2E3E3`, kuat `#CCCCCC` | `--border` | Garis tipis 1px |

Aturan:
- **Publik: crimson untuk aksi.** Blok besar memakai hampir hitam atau foto. **Tidak ada latar merah penuh** (menyakiti mata).
- **Area kerja (agen, admin): tombol utama hitam.** Crimson hanya aksen kecil.
- Berkas wordmark merah di folder brand memakai `#C33A37`; kita memakai `#CC002D` di mana-mana.
- Mode gelap: tidak untuk sekarang. Token `.dark` dibiarkan tetapi tidak dipakai.

### Status (warna fungsional, pastel, ikon + teks)
| Arti | Latar | Teks | Contoh |
|---|---|---|---|
| ok | `--status-ok-*` | hijau tua | Lunas, Diterima, Sukses |
| info | `--status-info-*` | biru tua | Sudah DP, Diproses |
| warn | `--status-warn-*` | amber tua | Belum DP, Menunggu CS, Seat hampir penuh |
| over | `--status-over-*` | ungu tua | Lebih bayar |
| bad | `--status-bad-*` | **merah tua `#9A1128`**, bukan crimson brand | Batal, Ditolak, Gagal, galat |
| mute | abu | abu | Kedaluwarsa, tidak aktif |

Galat selalu memakai merah tua dengan ikon dan teks supaya tidak tertukar dengan tombol crimson.

## Huruf
**Onest** saja (Google Fonts, 400 sampai 800). Tegas didapat dari bobot dan ukuran, bukan huruf lain.

| Peran | Ukuran / bobot |
|---|---|
| Display | 48-64 / 800, jarak huruf -0.035em |
| Judul halaman | 30 / 700 |
| Judul bagian | 24 / 700 |
| Judul kartu | 18 / 700 |
| Isi form dan publik | 16 / 400 |
| Isi dasbor | 14 / 400-600 |
| Pendukung | 13 / 500 |
| Terkecil (label huruf kapital) | **12** / 600, jarak 0.07em. **Tidak ada huruf di bawah 12px.** |

Angka rupiah memakai angka biasa (tanpa `tabular-nums`, terlihat lebar di Onest). Judul memakai `text-wrap: balance`.

## Jarak
Kelipatan 4: 4, 8, 12, 16, 24, 32, 48, 64. Dalam satu kelompok 8, antar kelompok 16, antar bagian 24-32. Padding kartu 16, panel 24, bingkai halaman 16 (ponsel) dan 24 (desktop). **Situs publik:** rapat di dalam komponen, 64-96 antar bagian. Lebar isi maksimum **1200** untuk publik, lebar penuh untuk admin; grid 12 kolom, gutter 24.

## Sudut
| Token | px | Dipakai untuk |
|---|---|---|
| xs | 4 | lencana angka, kotak centang |
| sm | 6 | lencana status, tag |
| **md** | **8** | **tombol, input, menu aktif** |
| lg | 12 | kartu, dialog, tabel |
| xl | 16 | panel konten |
| 2xl | 24 | bingkai terluar, hero, blok besar |
| penuh | 50% | avatar, chip filter, pil harga, tombol bundar |

Sudut luar = sudut dalam + jarak. **Pengecualian: kartu paket umroh** (`src/components/PackageCard.tsx`): luar 24, gambar dalam 20, dipertahankan persis dari desain lama karena disukai pemilik. Hanya bayangannya mengikuti tingkat bayangan di atas.

## Bayangan
Dua tingkat, warna **abu netral brand `#7C7E7E`**, tidak pernah hitam.
- Tingkat 1 (kartu, terpilih): `0 4px 14px -2px rgb(124 126 126 / .16), 0 1px 2px rgb(124 126 126 / .12)`
- Tingkat 2 (menu, dialog, toast, hover kartu): `0 16px 40px rgb(124 126 126 / .22), 0 2px 8px rgb(124 126 126 / .10)`

## Kontrol
- Tinggi: **40** desktop, **44** layar sentuh (`pointer: coarse`), 32 hanya di baris tabel desktop, 48 untuk tombol hero publik, 56 tombol WhatsApp melayang.
- **Tombol:** utama (hitam; crimson di publik lewat varian `brand`), sekunder (putih bingkai), hantu, bahaya, tautan. Interaksi tenang: hover lebih gelap, ditekan turun 1px, tanpa bayangan melayang. **Bahaya = bingkai merah tua**; isi merah penuh hanya di langkah konfirmasi terakhir (`destructiveSolid`). Satu tombol utama per layar; di dialog utama kanan, batal kiri (ditumpuk di ponsel, utama di atas).
- **Isian:** latar abu muda (`--field`), tanpa bingkai, bingkai dan cincin tipis saat fokus. Label di atas, petunjuk dan galat di bawah (galat dengan ikon). Opsional ditandai, wajib tidak.
- **Terpilih** (tab, saklar segmen, menu aktif): kapsul putih terangkat di atas jalur abu. Chip filter: isi gelap saat aktif.
- **Kontrol gabungan:** kelompok tombol dengan garis pemisah 1px dalam satu wadah (pagination, tombol pecah, stepper, isian dengan satuan).
- **Menu dan dropdown:** sudut 12, baris 40, ikon kiri, baris sorot abu bersudut 8, pintasan keyboard kecil hanya di admin.
- **Status:** kapsul pastel tinggi 24, sudut 6, ikon 14 + teks.
- **Tabel:** baris 48 (satu baris), 64 (dua baris), kepala 40 berlatar abu, padding sel 16, uang rata kanan, keluarga ditandai garis kiri, batal diredupkan. Di bawah 640px menjadi kartu.
- Fokus keyboard selalu terlihat: cincin 2px (hampir hitam) dengan celah.
- Gerak 160 ms, hanya warna dan turun 1px. Hormati `prefers-reduced-motion`.

## Pola
- **PageHeader:** judul 24-30, deskripsi abu, aksi utama di kanan.
- **StatCard:** label 12.5 abu, angka 26 bold, petunjuk 12.5.
- **Navigasi publik:** putih bersudut 24, satu tombol crimson. **Sidebar kerja:** lebar 260, item 40 (44 sentuh), aktif = kapsul putih terangkat di atas latar abu; di ponsel agen bar bawah 4 menu.
- **Hero publik:** dua bagian (blok gelap dengan teks, foto di sisi lain), tombol crimson. Foto = foto asli tim.
- **Dialog:** di tengah dengan latar gelap, sudut 12, lebar 440. **Toast:** kanan bawah, hampir hitam.
- **Kosong dan galat:** ikon kecil, kalimat jelas, satu aksi (`EmptyState`, `LoadError`).

## Bahasa antarmuka
Indonesia, nada "kamu". Tidak ada "Sign Out", "Share", "Copy". Uang: `Rp 29.500.000` di tabel dan formulir, `Rp 29,5 jt` hanya di kartu ringkas.

## Komponen dan lokasi
Dasar shadcn di `src/components/ui/*` (sudah mengikuti token). Gabungan: `StatusBadge`, `EmptyState`, `ConfirmDialog` di `src/components/ui/`; `StatCard`, `PageHeader`, `LoadError` di `src/components/admin/jamaah/` dan `src/components/agent/` (akan disatukan). Halaman rujukan hidup: `/styleguide` (noindex).
