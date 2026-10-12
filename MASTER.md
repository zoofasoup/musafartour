# MASTER: Halaman paket mobile (pkg-v2)

Sumber kebenaran tunggal untuk redesign halaman detail paket di HP. Cakupan: **hanya** halaman paket mobile, bukan seluruh situs. Token ada di `src/styles/pkg-v2.css` (di bawah kelas `.pkg-v2`) dan diekspos ke Tailwind sebagai `pkg-*` di `tailwind.config.ts`. Tidak ada angka atau warna lepas di komponen.

Menggantikan tampilan halaman paket yang lama. `DESIGN.md` situs tidak diubah. Dua aturannya sengaja dilanggar di halaman ini atas keputusan pemilik: crimson `#CC002D` diganti merah fungsional, dan latar merah penuh dipakai satu kali (panel harga). Kalau pola ini dipakai ke halaman lain, `DESIGN.md` harus diperbarui lebih dulu.

## Thesis (disetujui)

**Visual.** Halaman paket mobile yang terang dan lega. Dasar krem hangat, panel penuh lebar bersudut atas membulat (24 sampai 32 px) yang bertumpuk. Warna: merah fungsional jenuh, hitam, krem; tanpa crimson dan tanpa amber. Satu momen gradasi merah untuk panel harga. Onest ringan: judul 300 sampai 400 sangat besar dengan spasi rapat, angka harga 400 dan terbesar di layar, label 500. Panel datar tanpa garis tepi, tombol pil, tidak ada kartu bergaris. Pemisah hanya lewat warna panel dan jarak.

**Interaksi.** Cepat dan kering (150 sampai 250 ms, ease-out). Tekan turun sedikit (skala 0,98), tanpa bergantung pada hover. Saat scroll, panel naik dan menumpuk (hanya transform dan opacity). Gambar membesar dari posisi flyer. Dengan "kurangi gerakan" semuanya jadi pudar-masuk sederhana. **Terlarang:** kartu bergaris, animasi memantul atau elastis, loop otomatis.

## Warna

| Token | Nilai | Peran |
|---|---|---|
| `--pkg-cream` | `#F4EFE6` | Latar halaman dan panel dasar |
| `--pkg-cream-2` | `#EAE3D6` | Panel kedua, pil tidak terpilih, jalur saklar |
| `--pkg-white` | `#FDFAF5` | Ubin angka dan chip. Putih hangat, bukan `#FFFFFF` |
| `--pkg-ink` | `#1A1512` | Teks utama, panel gelap, tombol sekunder gelap |
| `--pkg-ink-2` | `#4A423B` | Teks sekunder |
| `--pkg-ink-3` | `#6B6258` | Teks pendukung, label kecil |
| `--pkg-red` | `#C4141B` | Aksi utama (tombol), panel harga. Merah dari referensi redomedia |
| `--pkg-red-press` | `#A50F16` | Tombol ditekan |
| `--pkg-on-red` | `#FFE4E7` | Semua teks dan ikon di atas merah (putih kemerahan, tidak pernah `#FFFFFF`) |
| `--pkg-red-bright` | `#E0303D` | Bintang hotel, ujung terang gradasi (dekoratif, teks besar saja) |
| `--pkg-red-deep` | `#9E1710` | Teks merah di atas krem, galat |
| `--pkg-ok` | `#1B6B3F` | Termasuk, berhasil |
| `--pkg-warn` | `#A84300` | Seat hampir habis (bukan amber) |

Gradasi tunggal `--pkg-gradient-red`: `195deg, #A5101A, #C4141B 46%, #D92635`, ditambah cahaya radial lembut di kiri. Hanya untuk panel harga. Teks kecil tidak boleh langsung di atas ujung terang atau cahaya kiri (4,1:1); teks kecil di panel merah selalu di dalam pil kaca (≥5,6:1).

### Kontras terukur
| Pasangan | Rasio | Aturan |
|---|---|---|
| ink di krem | 15,8 | semua ukuran |
| ink-2 di krem | 8,6 | semua ukuran |
| ink-3 di krem | 5,2 | semua ukuran |
| ink-3 di cream-2 | 4,7 | semua ukuran, jangan lebih redup |
| putih di merah `#E0241A` | 4,7 | semua ukuran, teks utama di panel merah |
| putih di `#C71E15` | 5,8 | semua ukuran |
| putih di `#FF3B2A` | 3,6 | **hanya teks 24 px atau lebih**, jangan taruh teks kecil di ujung terang gradasi |
| krem di merah | 4,1 | **dilarang**, pakai putih murni di atas merah |
| red-deep di krem | 7,1 | semua ukuran |
| ok di krem | 5,7 | semua ukuran |
| warn di krem | 5,3 | semua ukuran |

### Kaca di atas panel merah
Tombol di panel merah berupa pil kaca satu rona, bukan putih: `pkg-glass` (translusen gelap, rim terang), `pkg-glass-deep` (maroon pekat untuk aksi utama dan pilihan terpilih), `pkg-glass-lit` (lingkaran ikon). Teks di dalamnya `on-red`. Kontras terukur: glass 6,6:1, deep 11,6:1.

## Huruf

Onest (variabel 100 sampai 900, sudah dimuat di `index.html`). Tidak ada font tambahan.

| Peran | Ukuran / tinggi baris | Bobot | Spasi huruf |
|---|---|---|---|
| Judul halaman (nama paket) | 56 / 0,95 | 300 | -0,04em |
| Harga | 72 / 0,9 | 400 | -0,05em, `tabular-nums` |
| Judul bagian (h2) | 40 / 1 | 300 | -0,035em |
| Subjudul (h3, nama kota) | 28 / 1,1 | 400 | -0,025em |
| Angka ubin | 40 / 1 | 400 | -0,04em |
| Isi | 16 / 1,5 | 400 | 0 |
| Label dan tombol | 15 sampai 17 / 1,3 | 500 | 0 |
| Keterangan kecil | 12 / 1,3 | 500 | +0,01em |

Aturan: bobot 300 hanya untuk ukuran 28 px atau lebih. Isi minimal 400. Bobot 600 ke atas tidak dipakai, kecuali satu penekanan kecil per layar. Tanpa huruf kapital semua.

## Jarak (kelipatan 4)

`4, 8, 12, 16, 24, 32, 48, 64, 96`.
- Padding horizontal panel: **24**.
- Dalam kelompok: 8 sampai 12. Antar kelompok: 24. Antar bagian dalam satu panel: 48.
- Antar panel: panel menumpuk dengan tumpang tindih sebesar radiusnya (-32), jadi tidak ada celah.
- Target sentuh minimal **44**. Tombol utama 56.

## Bentuk

| Token | Nilai | Dipakai |
|---|---|---|
| `--pkg-r-panel` | 32 px | Sudut atas panel bertumpuk |
| `--pkg-r-media` | 24 px | Foto, flyer, ubin angka |
| `--pkg-r-field` | 16 px | Isian, ubin kecil |
| `--pkg-r-pill` | 999 px | Tombol, pil kamar, lencana |

Panel datar: tanpa garis tepi, tanpa kartu bergaris. Pemisah hanya warna panel dan jarak. Satu garis tipis 1 px (`ink` 12%) hanya boleh dalam daftar baris panjang.

## Bayangan
- `--pkg-shadow-lift`: `0 -10px 28px rgb(26 21 18 / 0.10)` untuk panel yang menumpuk di atas panel lain.
- `--pkg-shadow-cta`: `0 8px 20px rgb(224 36 26 / 0.28)` hanya untuk tombol utama.

## Gerak
| Token | Nilai |
|---|---|
| `--pkg-dur-press` | 100 ms |
| `--pkg-dur-fast` | 150 ms |
| `--pkg-dur-base` | 220 ms |
| `--pkg-dur-slow` | 320 ms (hanya gambar membesar dan panel masuk) |
| `--pkg-ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| `--pkg-ease-in` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--pkg-stagger` | 40 ms |

Hanya `transform` dan `opacity`. Tidak ada bounce, elastis, loop, atau parallax pada teks. `prefers-reduced-motion`: ganti semua gerak dengan pudar-masuk 150 ms.

## Komponen dasar

Lima keadaan wajib: normal, tekan, fokus, nonaktif, memuat. Hover hanya bila `(hover: hover) and (pointer: fine)`.

- **Tombol utama:** pil, tinggi 56, latar `red`, teks putih 500/17, bayangan `cta`. Tekan: skala 0,98 dan `red-press`. Fokus: cincin 2 px `ink` dengan jarak 2 px. Nonaktif: opasitas 45% tanpa bayangan.
- **Tombol utama di atas panel merah:** `pkg-glass-deep`, teks `on-red` 500/17, cincin fokus `on-red`. Tombol merah di atas merah tidak terlihat, jadi merah hanya untuk tombol di atas krem (bar bawah).
- **Bintang hotel:** `red-bright` (`#FF3B2A`) di panel gelap, bukan kuning.
- **Pengecualian:** viewer gambar layar penuh memakai skrim hitam di atas foto, di luar skala warna ini.
- **Tombol sekunder:** pil, tinggi 48 sampai 56, latar `cream-2`, teks `ink`. Di panel gelap: latar `ink-2`, teks krem.
- **Pil pilihan (kamar, jenis paket):** pil tinggi 44. Terpilih: latar `ink`, teks krem. Tidak terpilih: `cream-2`, teks `ink-2`. Panel merah: terpilih putih dengan teks `ink`, tidak terpilih putih 20% dengan teks putih.
- **Ubin angka (stat tile):** latar putih, sudut `r-media`, angka 40/400, label 13/500 `ink-3`. Tanpa garis tepi.
- **Lencana:** pil tinggi 28, label 12/500, latar `cream-2`. Status memakai `ok` atau `warn` untuk teks dan ikon, tidak pernah warna saja.
- **Daftar baris:** baris 56, ikon 24, teks 16/400, pemisah satu garis tipis.
- **Fokus di panel gelap atau merah:** cincin krem atau putih 2 px.

## Struktur halaman (urutan panel)
1. **Flyer/foto** penuh di atas (sticky di bawah navbar), tinggi `min(125vw, 560px)`.
2. **Panel krem:** nama paket (judul 300), bulan, seat tersisa.
3. **Panel merah (gradasi):** pil kamar, harga 72/400, tombol "Book Now" putih di atas merah gelap.
4. **Panel krem:** ubin angka (Berangkat, Pulang, Durasi, Malam), maskapai, rute.
5. **Panel gelap `ink`:** hotel (Makkah, Madinah) dengan foto yang bisa digeser.
6. **Panel `cream-2`:** sudah termasuk dan belum termasuk.
7. **Panel krem:** pembayaran fleksibel, lalu paket lain.
Bar bawah tetap ada (harga kecil dan "Book Now"), berlatar krem pekat, tanpa garis tepi.

## Tidak boleh
Opasitas konten yang terikat pada posisi scroll (reveal saat scroll): foto di panel tinggi jadi muncul dan hilang saat scroll balik. Efek tumpukan datang dari panel yang saling menimpa, bukan dari pudar-masuk. Kartu atau kotak bergaris. Crimson `#CC002D`. Amber. Animasi memantul atau elastis. Loop otomatis. Teks 300 di bawah 28 px. Putih murni `#FFFFFF` di mana pun di halaman ini (kecuali overlay di atas foto). Warna atau angka yang tidak ada di dokumen ini.
