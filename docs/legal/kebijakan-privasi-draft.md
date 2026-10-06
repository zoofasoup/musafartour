# Kebijakan Privasi Musafar Tour (DRAFT, belum tayang)

> **Status: draft untuk ditinjau owner dan penasihat hukum. Halaman `/kebijakan-privasi` yang tayang tidak diubah.**
> Draft ini ditulis dari apa yang benar-benar dikumpulkan kode situs per 6 Oktober 2026 (`src/pages/Daftar.tsx`, `src/components/daftar/RegistrationForm.tsx`, `functions/_lib/intake.ts`, `functions/api/daftar.ts`, `src/pages/Lengkapi.tsx`, `src/lib/manifestForm.ts`, `functions/api/lengkapi.ts`, `src/lib/tracking.ts`, `index.html`, `functions/meta-capi.ts`).
> Tanda **[ISI]** = nilai yang harus diputuskan owner. Tanda **[PERLU DITINJAU HUKUM]** = anggapan hukum yang belum diverifikasi oleh siapa pun yang berwenang. Jangan tayangkan sebelum semua tanda itu selesai.
> Tahun yang dirujuk: UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP). Nomor pasal di bawah ditulis dari ingatan penyusun dan **harus dicek ulang** **[PERLU DITINJAU HUKUM]**.

---

## Kebijakan Privasi

Terakhir diperbarui: **[ISI tanggal tayang]**

### 1. Siapa kami

Musafar Tour adalah nama dagang **PT Musa Amanah Wisata**, penyelenggara perjalanan ibadah umrah (PPIU) berizin Kementerian Agama nomor 17102200953750002.

Alamat: Commercial Park Harapan Indah, Ruko Emerald Blok EB1 No. 28, Medan Satria, Kota Bekasi, Jawa Barat 17131.

PT Musa Amanah Wisata adalah **pengendali data pribadi** untuk data yang dijelaskan di sini.

Kontak untuk urusan data pribadi: WhatsApp CS **081917403797** (6281917403797) dan email **musafartour@gmail.com** (kedua nilai dari pengaturan situs per 6 Oktober 2026; cek lagi sebelum tayang). Pejabat atau petugas pelindungan data: **[ISI nama atau "belum ditunjuk"]** **[PERLU DITINJAU HUKUM: apakah PT wajib menunjuk pejabat pelindungan data pribadi (UU PDP Pasal 53), mengingat kami memproses data kesehatan dan dokumen identitas dalam jumlah banyak]**.

### 2. Data apa yang kami kumpulkan

Kami mengumpulkan data dalam tiga tahap. Semua isian di bawah memang ada di formulir situs; kami tidak mengumpulkan di luar itu.

**Tahap 1: form pendaftaran (`/daftar/...`), diisi calon jamaah atau agen**
- Kontak: nama, nomor WhatsApp, kota.
- Untuk setiap peserta (maksimal 10 orang per pendaftaran): nama sesuai paspor, jenis kelamin, kategori (dewasa, anak tanpa kasur, bayi), tipe kamar, hubungan dengan pemesan.
- Catatan bebas (opsional), dari mana kamu tahu Musafar (opsional), dan kode agen bila ada.
- Waktu dan versi persetujuanmu atas pemrosesan data serta Term of Service.

**Tahap 2: melengkapi data (`/lengkapi/...`), lewat link pribadi dari CS setelah pendaftaran diterima**
- Identitas: NIK, tempat dan tanggal lahir, nama ayah kandung, alamat rumah, email, status kawin, pekerjaan, pendidikan.
- Paspor: nomor paspor, tanggal terbit, tanggal berlaku, kantor imigrasi penerbit.
- **Data kesehatan dan data yang sensitif**: golongan darah, riwayat penyakit kronis (catatan medis), tanggal vaksin meningitis dan polio **[PERLU DITINJAU HUKUM: data kesehatan termasuk "data pribadi yang bersifat spesifik" menurut UU PDP Pasal 4; periksa apakah butuh persetujuan terpisah dan eksplisit]**.
- Kontak darurat: nama, hubungan, nomor HP.
- Mahram: nama dan hubungan. Teman sekamar (catatan). Ukuran perlengkapan.
- **Dokumen yang kamu unggah**: foto KTP (atau KK atau KIA untuk anak), foto halaman data paspor, pasfoto. Format JPG, PNG, atau PDF, maksimal 10 MB per berkas.
- Data anak: untuk peserta anak, data diisi oleh orang tua atau wali **[PERLU DITINJAU HUKUM: UU PDP Pasal 25 mensyaratkan persetujuan orang tua atau wali untuk data anak; apakah kalimat persetujuan di form sudah cukup]**.

**Tahap 3: pembayaran dan administrasi, dicatat oleh CS**
- Nominal, tanggal, bank tujuan (BCA, BSI, atau BNI atas nama PT), nama pengirim, dan bukti transfer.
- Kami **tidak** meminta, menerima, atau menyimpan PIN, kata sandi, nomor kartu, atau data kartu pembayaran. Pemesanan dan pembayaran kartu online sudah dimatikan.

**Data teknis saat kamu membuka situs**
- Halaman yang dibuka, jenis perangkat (ponsel, tablet, komputer), asal kunjungan (UTM, situs perujuk), kode agen, dan dua pengenal acak (pengunjung dan sesi) yang disimpan di peramban. Ini masuk ke tabel analitik kami sendiri dan tidak berisi nama atau nomor. Di halaman `/lengkapi` yang memuat tautan pribadi, yang tercatat hanya pola `/lengkapi/[token]`, tidak pernah tautan aslinya.
- Alamat IP diterima Cloudflare dan Supabase saat kamu mengakses situs atau mengirim form (untuk keamanan dan batas percobaan).
- Verifikasi keamanan (Cloudflare Turnstile) memeriksa apakah pengirim form manusia, dan dimuat di halaman form.

### 3. Pelacak dan cookie (alat analitik dan iklan)

Situs memakai alat pihak ketiga untuk mengukur kunjungan dan iklan:

| Alat | Penyedia | Untuk apa | Cookie atau penyimpanan |
|---|---|---|---|
| Google Tag Manager dan Google Analytics 4 | Google | Statistik kunjungan | `_ga`, `_ga_*` |
| Meta Pixel dan Meta Conversions API | Meta | Mengukur iklan, audiens iklan | `_fbp`, `_fbc` |
| TikTok Pixel | TikTok | Mengukur iklan | `_ttp`, `_tt_enable_cookie` |
| Microsoft Clarity | Microsoft | Rekaman layar dan peta panas | `_clck`, `_clsk` |
| Cloudflare Web Analytics | Cloudflare | Statistik kunjungan | **[ISI: konfirmasi apakah aktif, dilihat di dasbor Cloudflare]** |
| Google Fonts, YouTube (video beranda) | Google | Huruf dan video | cookie YouTube **[ISI: cek apakah video memakai mode tanpa cookie]** |

Aturan yang sudah berlaku di kode sejak 6 Oktober 2026: **tidak ada pelacak yang dimuat, dan tidak ada peristiwa yang dikirim, di halaman `/lengkapi/...`, `/cek-status`, `/set-password`, `/admin`, `/agent`, dan `/flyer-print`; di `/daftar/...` pelacak tidak dimuat pada kunjungan pertama.** Pelacak yang sudah terpasang dari halaman sebelumnya (mis. beranda) tetap aktif bila kamu berpindah ke `/daftar/...` lewat tautan di dalam situs.

Cookie kami sendiri: `musafar_ref` (kode agen, 30 hari), pengenal acak pengunjung dan sesi, daftar favoritmu, dan penanda staf. Semua tidak berisi data pribadi.

**Persetujuan pelacak:** saat ini situs **belum** memiliki banner persetujuan; pelacak aktif sejak halaman pertama. **[PERLU DITINJAU HUKUM: apakah pelacakan iklan tanpa persetujuan terlebih dahulu sah menurut UU PDP; apakah perlu banner dengan pilihan tolak. Keputusan banner ada di owner dan belum dibuat.]**

### 4. Untuk apa kami memakai datamu

| Tujuan | Data | Dasar pemrosesan |
|---|---|---|
| Memproses pendaftaran, memeriksa seat, menghubungimu lewat WhatsApp | Tahap 1 | Persetujuan (kotak yang kamu centang) dan pelaksanaan perjanjian **[PERLU DITINJAU HUKUM]** |
| Mengurus visa, tiket, hotel, manifes, asuransi, dan dokumen ke pihak berwenang | Tahap 2 | Pelaksanaan perjanjian dan kewajiban hukum penyelenggara umrah **[PERLU DITINJAU HUKUM: kewajiban pelaporan ke Kemenag dan Kementerian Haji, bila ada]** |
| Menjaga keselamatanmu selama ibadah (golongan darah, riwayat penyakit, kontak darurat) | Kesehatan dan kontak darurat | Persetujuan eksplisit **[PERLU DITINJAU HUKUM: persetujuan terpisah untuk data spesifik]** |
| Mencatat pembayaran, memverifikasi transfer, laporan keuangan | Tahap 3 | Pelaksanaan perjanjian dan kewajiban akuntansi dan pajak **[PERLU DITINJAU HUKUM]** |
| Menghitung komisi agen yang mengajakmu | Kode agen dan status lunas (tanpa dokumen) | Kepentingan yang sah **[PERLU DITINJAU HUKUM]** |
| Mengukur dan memperbaiki situs dan iklan | Data teknis dan pelacak | Persetujuan atau kepentingan yang sah **[PERLU DITINJAU HUKUM]** |
| Mencegah spam dan penyalahgunaan | IP, nomor WhatsApp (batas 5 pendaftaran per nomor per hari), Turnstile | Kepentingan yang sah |

Kami tidak menjual datamu dan tidak memakainya untuk keputusan otomatis yang berdampak hukum padamu.

### 5. Siapa yang bisa melihat datamu

**Di dalam Musafar Tour**
- **CS dan owner** melihat data pendaftaran, dokumen, dan pembayaran untuk mengerjakan tugasnya. Hak akses diatur per peran di sistem; CS mencatat pembayaran, hanya owner yang memverifikasinya dan menghapus data.
- **Agen** (mitra penjualan) hanya melihat jamaah yang ia daftarkan atau ajak: nama, nomor WhatsApp, paket, status, dan status pembayaran. **Agen tidak bisa melihat KTP, paspor, pasfoto, NIK, data kesehatan, dan tidak bisa melihat tautan pribadi `/lengkapi`.** **[ISI: konfirmasi daftar lengkap kolom yang terlihat agen per tampilan "Pendaftaran saya"]**
- Pegawai lain atau pihak yang tidak berkepentingan tidak punya akses.

**Di luar Musafar Tour** (hanya sejauh perlu):
- Maskapai, hotel, penyedia visa, bus, muthawif, dan asuransi di Indonesia dan Arab Saudi, untuk memberangkatkanmu. **[ISI: daftar kategori mitra yang menerima paspor dan NIK]**
- Instansi pemerintah bila diwajibkan hukum.
- Penyedia teknologi yang menyimpan dan memproses data atas nama kami (bagian 6).
- Mitra pembayaran: tidak ada. Transfer langsung ke rekening bank PT.

### 6. Pemrosesan di luar negeri

Sebagian data diproses oleh penyedia layanan yang servernya mungkin di luar Indonesia:

| Penyedia | Data | Lokasi |
|---|---|---|
| Supabase (basis data, penyimpanan dokumen privat) | Semua data tahap 1 sampai 3 dan dokumen | **[ISI: wilayah proyek Supabase, lihat dasbor Supabase]** |
| Cloudflare (hosting situs, fungsi server, Turnstile) | Data yang lewat saat kamu mengirim form, IP | Jaringan global |
| Google (Tag Manager, Analytics, Fonts, YouTube) | Data teknis | **[ISI]** |
| Meta (Pixel, Conversions API) | Peristiwa iklan; lewat server kami dikirim juga alamat IP, jenis peramban, dan pengenal anonim yang di-hash | **[ISI]** |
| TikTok (Pixel) | Peristiwa iklan | **[ISI]** |
| Microsoft (Clarity) | Rekaman interaksi halaman | **[ISI]** |

**[PERLU DITINJAU HUKUM: dasar transfer data lintas negara (UU PDP Pasal 56): apakah negara tujuan punya pelindungan setara, atau perlu perjanjian dan persetujuan; apakah ada kewajiban menyimpan data tertentu di Indonesia.]**

Data kesehatan, NIK, paspor, dan dokumen **tidak** dikirim ke alat iklan dan analitik.

### 7. Berapa lama kami menyimpan

Usulan, **belum diputuskan**:

| Data | Disimpan | Setelah itu |
|---|---|---|
| Pendaftaran yang ditolak atau tidak dilanjutkan | **[ISI, mis. 12 bulan]** sejak pendaftaran | dihapus |
| Data dan dokumen jamaah yang berangkat | **[ISI, mis. 24 bulan]** setelah tanggal pulang, atau lebih lama bila hukum mensyaratkan **[PERLU DITINJAU HUKUM: kewajiban penyimpanan manifes dan catatan keuangan]** | dokumen dihapus, catatan keuangan tetap sesuai aturan pajak |
| Dokumen (KTP, paspor, pasfoto) | **[ISI, mis. 6 bulan]** setelah tanggal pulang | dihapus permanen oleh owner |
| Bukti dan catatan pembayaran | **[ISI, mis. 10 tahun]** **[PERLU DITINJAU HUKUM: ketentuan pajak dan akuntansi]** | dihapus |
| Data teknis analitik kami sendiri | **[ISI, mis. 14 bulan]** | dihapus |
| Data di alat pihak ketiga | mengikuti pengaturan masing-masing | diatur di dasbor masing-masing alat |

Catatan teknis: saat ini **belum ada penghapusan otomatis**; hapus dilakukan manual oleh owner (data pendaftaran dan dokumen). Tautan pribadi `/lengkapi` tidak punya masa berlaku. **[ISI: keputusan masa berlaku tautan, lihat audit PUB-017]**

### 8. Hakmu atas datamu

Kamu berhak, sesuai UU PDP **[PERLU DITINJAU HUKUM: periksa pasal dan batas waktu respons]**:
- mengetahui data apa yang kami simpan dan untuk apa;
- melihat dan meminta salinan datamu;
- meminta data diperbaiki;
- meminta data dihapus atau dimusnahkan, selama tidak bertentangan dengan kewajiban hukum kami menyimpannya;
- menarik persetujuan (penarikan tidak mengubah pemrosesan yang sudah sah dilakukan sebelumnya, dan dapat berarti kami tidak bisa melanjutkan pendaftaranmu);
- mengajukan keberatan dan menyampaikan pengaduan.

**Cara mengajukan (permintaan lihat, perbaiki, atau hapus data):**
1. Kirim pesan WhatsApp ke CS **081917403797**, atau email **musafartour@gmail.com**, dengan judul "Permintaan data pribadi".
2. Sebut kode pendaftaran (MSF-XXXXX) dan nama peserta.
3. Kami memastikan permintaan datang dari orangnya (mis. lewat nomor WhatsApp yang terdaftar) sebelum mengubah atau menghapus apa pun.
4. Kami menjawab dalam **[ISI, mis. 14 hari kerja]** **[PERLU DITINJAU HUKUM: batas waktu menurut UU PDP]**.

Kewajiban kami bila ada kebocoran data: memberi tahu orang yang terdampak dan lembaga berwenang dalam batas waktu yang diatur hukum **[PERLU DITINJAU HUKUM: Pasal 46, 3 x 24 jam]**. **[ISI: siapa yang memutuskan dan mengirim pemberitahuan di Musafar Tour]**

### 9. Keamanan

- Dokumen disimpan di penyimpanan **privat**: tidak punya alamat publik, hanya bisa dibuka CS dan owner yang masuk.
- Tautan `/lengkapi` panjang dan acak, dan tidak diberikan kepada agen.
- Pengiriman form memakai koneksi aman (HTTPS), verifikasi anti-spam, dan batas jumlah pengiriman.
- Hak akses dibedakan per peran; perubahan data jamaah dan pembayaran tercatat siapa dan kapan.
- Tidak ada sistem yang kebal. Jangan membagikan tautan pribadi `/lengkapi` ke orang lain.

### 10. Anak, perubahan kebijakan, dan pengaduan

- Pendaftaran anak dilakukan oleh orang tua atau wali.
- Bila kebijakan berubah, kami memperbarui tanggal di atas dan memberi tahu lewat situs.
- Keberatan atas cara kami memproses datamu: hubungi kami lebih dulu lewat kontak di bagian 1. Kamu juga dapat mengadu ke lembaga pelindungan data pribadi bila sudah dibentuk **[PERLU DITINJAU HUKUM]**.

---

## Bagian untuk owner dan penasihat hukum (jangan ditayangkan)

### A. Yang harus diputuskan owner

1. Angka masa simpan di bagian 7 (semua **[ISI]**).
2. Banner persetujuan pelacak: ya atau tidak, dan apakah pelacak ditahan sampai setuju. Keputusan belum dibuat; sampai saat itu kebijakan ini harus jujur bahwa pelacak aktif.
3. Siapa pejabat atau petugas data pribadi, dan siapa yang membalas permintaan data.
4. Daftar mitra di luar negeri yang menerima paspor dan NIK (maskapai, visa, hotel, asuransi).
5. Wilayah proyek Supabase; apakah dokumen boleh disimpan di luar Indonesia.
6. Masa berlaku tautan `/lengkapi` dan penghapusan otomatis.
7. Apakah `/syarat-umroh` (yang disetujui di form) dan kebijakan ini perlu saling merujuk. Catatan: halaman S&K dan Term of Service saat ini saling bertentangan soal pembatalan (audit PUB-003); itu keputusan terpisah dan **tidak dicakup draft ini**.

### B. Anggapan hukum yang belum diverifikasi (semua perlu dicek)

- Dasar pemrosesan tiap tujuan di bagian 4, terutama "kepentingan yang sah" untuk komisi agen dan analitik.
- Persetujuan untuk data spesifik (kesehatan) dan data anak.
- Kewajiban pejabat pelindungan data (Pasal 53) dan penilaian dampak pelindungan data (Pasal 34) untuk pemrosesan data kesehatan dan identitas berskala besar.
- Transfer lintas negara (Pasal 56).
- Kewajiban penyimpanan data oleh PPIU (aturan Kemenag atau Kementerian Haji, aturan pajak dan akuntansi) dan batas simpan maksimal.
- Batas waktu menjawab permintaan hak subjek data dan pemberitahuan kebocoran.
- Apakah pelacakan iklan dan rekaman layar tanpa persetujuan terlebih dahulu dapat dibenarkan.
- Kalimat persetujuan di form (`RegistrationForm.tsx`: "Saya setuju data saya dan peserta lain dipakai Musafar Tour untuk memproses pendaftaran umroh ini") apakah cukup sebagai persetujuan eksplisit yang spesifik atas tujuan; saat ini tidak ada persetujuan terpisah untuk data kesehatan di `/lengkapi`.
- Apakah pemesan boleh memberi persetujuan atas nama peserta lain (anggota keluarga) dan bagaimana bukti persetujuannya.

### C. Selisih antara halaman yang tayang dan kenyataan (bahan revisi)

Halaman `/kebijakan-privasi` yang tayang saat ini:
- Tidak menyebut data kesehatan (golongan darah, penyakit kronis, vaksin), NIK, foto KTP dan pasfoto, mahram, dan kontak darurat sebagai data yang diminta, kecuali sebagian ("tanggal lahir, nomor paspor, kontak darurat").
- Menyebut "mitra pembayaran", padahal tidak ada; pembayaran lewat transfer langsung.
- Tidak menyebut Microsoft Clarity dan Google Tag Manager, dan tidak menyebut Meta Conversions API (server kami mengirim IP dan user agent ke Meta).
- Tidak menyebut pemrosesan lintas negara, masa simpan angka, atau cara mengajukan penghapusan.
- Tidak menyebut bahwa agen tidak melihat dokumen.
