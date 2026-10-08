# Audit 05: Portal Agen dan Program Agen (audit ulang)

Tanggal: 8 Oktober 2026. Pembanding sebelumnya: `docs/audit/02-agent.md` (AGT-001 sampai AGT-041, 6 Oktober). Sumber yang dianggap benar: SOP/AGEN/001 versi 01 (23 halaman, dibaca semua), surat 035/036/037/MSFR/IX/2026, jawaban kak Virna 7 Oktober di `docs/pertanyaan-untuk-tim.xlsx` (tab "Agen (kak Virna)", 56 baris).

Metode: baca kode portal agen, shell bersama, halaman `/jadi-agen` dan `/sop-agen`, migrasi `20261006*` dan `20261007*`; kueri baca-saja ke database live (hanya hitungan dan struktur, tanpa data pribadi); `./scripts/run-db-tests.sh` dua kali (sebelum dan sesudah file baru); file tes baru `tests/db/10_agent_recheck.sql` (transaksi yang selalu dibatalkan); `tsc` dan `eslint`; Browser pane pada dev server `localhost:8094` dengan sesi palsu (desktop 800 px dan ponsel 375 px; sesi palsu dan viewport sudah dikembalikan). Tidak ada kode aplikasi yang diubah, tidak ada tulis ke database, tidak ada commit atau deploy. Produksi hanya di-GET/curl.

---

## 1. Ringkasan

1. Perbaikan sejak audit pertama nyata: 14 dari 41 temuan lama tuntas (layar pending/suspended dengan Keluar dan kontak PIC, kirim ulang konfirmasi email, shell bersama dengan ciut/laci/bar bawah/judul per halaman, landing `/jadi-agen`, peringkat dasbor, sapaan "kamu" seragam, tombol ikon berlabel). 9 sebagian, 16 masih terbuka, 2 menunggu keputusan pemilik.
2. Suite database hijau: PASS=472 FAIL=0 sebelum file baru. File baru `10_agent_recheck.sql` menambah 6 PASS dan 16 baris KNOWN (celah bernomor) tanpa FAIL.
3. Kontrol keamanan agen kuat: pemeriksaan baru memastikan agen biasa ditolak (42501) pada 14 fungsi staf/internal dan tulis langsung, tidak bisa membaca baris atau berkas KTP agen lain, dan sapuan 8 relasi `agent_*` tidak membocorkan baris agen lain.
4. Logika uang tidak sejalan dengan SOP di titik yang paling terasa agen: komisi masuk saldo yang bisa ditarik saat jamaah lunas, padahal SOP dan halaman publik menjanjikan dibayar H sampai H+2 setelah landing (AGT-102). Layar Komisi menulis kedua hal itu sekaligus.
5. Setiap agen baru berstatus Duta, dan surat komisi hanya memuat Silver, Gold, Platinum. Pada 16 dari 21 paket mendatang yang berstatus terbit, jamaah lunas dari agen Duta menghasilkan Rp 0, tidak dihitung ke tingkat berikutnya, dan layar Jamaah Saya tidak menampilkan apa pun (AGT-101, P0).
6. Komisi tidak mengikuti paket baru bila jamaah pindah paket setelah komisi tercatat (AGT-103, bertentangan dengan jawaban kak Virna), refund setelah penarikan membuat saldo negatif tanpa catatan (AGT-104), pencairan bruto tanpa PPh 5%, tanpa cek NIK, tanpa bukti transfer (AGT-105), dan sengketa lead tidak menahan komisi (AGT-106).
7. Urutan onboarding bertentangan dengan kak Virna: portal meminta biaya registrasi dan SOP sebelum persetujuan; kak Virna menjawab biaya dibayar setelah formulir disetujui. Database tidak menjadikan biaya/SOP sebagai gerbang; agen aktif dengan biaya "unpaid" bisa mencatat lead dan mendaftarkan jamaah (AGT-107).
8. Halaman `/sop-agen`, yang disetujui agen lewat kotak centang, adalah ringkasan: tidak memuat aturan kepemilikan jamaah, lead protection 30 hari, pembagian 30/70 dan 60/40, aturan konten syariah, target, program bonus (AGT-108).
9. Belum ada satu pun agen nyata yang melewati alur baru: database live berisi 6 agen aktif (4 akun staf, semuanya "dibebaskan" biaya), 4 agen pending (tidak ada yang menyetujui SOP, tidak ada KTP), 0 lead, 0 penjualan, 0 penarikan, 0 pendaftaran jamaah dengan agen. Semua jalur uang hanya teruji di transaksi yang dibatalkan.
10. Poin, bonus closing, bonus referral 30%, target 12 jamaah per tahun, status nonaktif 3 bulan, sanksi bertingkat, Agen Berkantor vs Individu, sertifikat, welcome kit: tidak ada mekanisme di sistem (hanya teks atau manual).

**Kesiapan onboarding agen sungguhan: SIAP DENGAN CATATAN, bersyarat.** Registrasi, konfirmasi email, login, status, lead, pendaftaran jamaah, privasi, dan penarikan manual berfungsi aman. Penghalang sebelum mengundang agen pertama: (a) AGT-101, keputusan pemilik atas komisi Duta (jawaban Q51) atau minimal teks di portal yang berkata jujur bahwa Duta belum punya nominal; (b) AGT-102, samakan janji "H sampai H+2 landing" dengan perilaku saldo (sembunyikan "Tarik saldo" sampai berangkat, atau ubah teks); (c) AGT-107, putuskan urutan biaya dan persetujuan bersama kak Virna; (d) AGT-108, tautkan SOP lengkap (PDF) di halaman persetujuan. Sisanya bisa menyusul setelah agen pertama berjalan, dengan syarat staf CS tahu bahwa komisi pindah paket, sengketa lead, refund setelah bayar, dan PPh 5% ditangani manual.

---

## 2. Status AGT-001 sampai AGT-041

Rekap: Tuntas 14, Sebagian 9, Terbuka 16, Perlu keputusan pemilik 2. Bukti berupa file:baris (repo `musafartour`), hasil cek langsung di Browser pane (BP), atau hasil kueri/tes database (DB).

| ID | Sev. lama | Status | Bukti |
|---|---|---|---|
| AGT-001 layar pending/suspended | P0 | Tuntas | `AgentProtectedRoute.tsx:49-85`: tombol WhatsApp PIC Agen dan "Keluar", daftar langkah `AgentSetupChecklist`; tanpa emoji |
| AGT-002 tautan bagikan rusak | P0 | Sebagian | `PackageShareModal.tsx:59` memakai `pkg.slug \|\| pkg.id`, 33/33 paket terbit punya slug (DB). Tetapi `AgentSchedule.tsx:455-476` membangun payload tanpa `slug`, jadi tautan dari Jadwal tetap `/paket-umroh/<uuid>` (rusak) |
| AGT-003 janji persen dan manfaat | P0 | Tuntas | UI tidak lagi mencetak persen (`AgentLeaderboard.tsx` tanpa `commission_rate`); manfaat di DB kini tiga baris netral. Sisa: kolom `agent_levels.commission_rate_min/max` masih berisi 4.5 sampai 6.0 (tidak tampil; sebaiknya dihapus) |
| AGT-004 konfirmasi email buntu | P0 | Tuntas | `ResendConfirmation.tsx:59` `auth.resend`; `AgentLogin.tsx:28-32` menangani `otp_expired`. Template email Supabase tidak dapat diverifikasi |
| AGT-005 tombol ciut | P1 | Tuntas | BP: tombol ciut di header sidebar (`ShellSidebar.tsx:109-116`, `collapsible="icon"`), rel 76 px, cookie `sidebar:state` ditulis dan dibaca (`sidebarState.ts`) |
| AGT-006 kesetaraan shell | P1 | Tuntas | `AppShell` dipakai `AdminLayout.tsx:112` dan `AgentLayout.tsx:50`; satu header, satu bar bawah, satu logout |
| AGT-007 agen suspended lewat API | P1 | Sebagian | Penarikan ditutup (`20261006140000_p0_fixes.sql:48-90`, cek `status='active'`). `list_my_agent_jamaah` masih mengembalikan nama, telepon, status bayar ke agen suspended (DB, 10_agent_recheck: 2 baris). Komisi juga tetap tercatat (AGT-109) |
| AGT-008 kebocoran privasi | P1 | Sebagian | Peringkat kini fungsi `get_agent_leaderboard()` tanpa komisi, hanya agen aktif/staf (`20261006170000_agent_misc.sql`); view dihapus. Sisa: akun login tanpa baris agen masih bisa membaca `packages.agent_commission_amount` pada 33 paket (DB, flat Rp 1.500.000; anon tidak bisa) |
| AGT-009 peringkat dasbor | P1 | Tuntas | `AgentDashboard.tsx:27-32` memakai `useAgentLeaderboard` |
| AGT-010 landing rekrutmen | P1 | Tuntas | `/jadi-agen` (225 baris), `/sop-agen`, tautan "Jadi Agen" di `Navbar.tsx:16` dan `Footer.tsx:102`, masuk sitemap; produksi 200. Sisa: tanpa `<title>`/deskripsi sendiri (AGT-122) |
| AGT-011 form registrasi | P1 | Tuntas | BP: kotak persetujuan privasi, galat per kolom, `autoComplete` x6 (`AgentRegister.tsx`), petunjuk password |
| AGT-012 saldo dan label komisi | P1 | Tuntas | `AgentCommission.tsx:41,351` saldo dikurangi permintaan pending, galat diterjemahkan, `refreshAgent()` saat dibuka, label Indonesia |
| AGT-013 notifikasi agen | P1 | Perlu keputusan pemilik | Tidak ada tabel/bel notifikasi agen (DB tes KNOWN). Saluran (WhatsApp, email, in-app) belum dijawab: pertanyaan no. 49 "Belum" |
| AGT-014 status ditolak | P1 | Terbuka | `agents_status_check` hanya pending/active/suspended (DB) |
| AGT-015 onboarding KTP | P1 | Terbuka | `AgentOnboarding.tsx:110` masih `getPublicUrl` pada bucket privat, `:288` "drag and drop" tanpa fungsi, `:393` klaim "aman & terenkripsi" tak terverifikasi; tidak ada draf; 4 dari 6 agen aktif tanpa KTP (DB) |
| AGT-016 bantuan | P1 | Tuntas | "Butuh bantuan? Hubungi PIC Agen" di sidebar (`AgentLayout.tsx:66-70`), layar status, penarikan, kirim bukti; nomor 6285287471835 = +62 852-8747-1835 dari kak Virna |
| AGT-017 reset oleh admin | P1 | Terbuka | `AgentDetailDialog.tsx:366` masih `redirectTo .../agent/login?reset=true`; `AgentLogin.tsx` tidak menangani `reset` |
| AGT-018 saklar notifikasi palsu | P2 | Terbuka | `AgentProfile.tsx:729-810` tab Notifikasi dan "Simpan Pengaturan" masih ada |
| AGT-019 aturan password | P2 | Terbuka | Registrasi 8 (`AgentRegister.tsx:83`), Profil 6 (`AgentProfile.tsx:269`), SetPassword 6 (`SetPassword.tsx:75`) |
| AGT-020 teks bagikan | P2 | Terbuka | `AgentSchedule.tsx:464` `flight_type: 'Direct'` tetap, hotel `null` (:465,:467) |
| AGT-021 marketing kit dan panduan | P2 | Sebagian | Panduan kini menjelaskan komisi (`AgentSalesGuide.tsx:181`). Skrip statis dengan "promo spesial" masih ada (2 baris, `AgentMarketingKit.tsx:63-90`), catatan internal "eskalasi ke supervisor" masih tampil (`AgentSalesGuide.tsx:188,268`) |
| AGT-022 foto profil | P2 | Terbuka | `AgentProfile.tsx:229-238` masih unggah ke `marketing-materials/<agent id>/` (policy tulis hanya admin) |
| AGT-023 alasan tolak intake | P2 | Terbuka | DB tes KNOWN: `list_my_agent_intakes` tanpa `reject_reason` |
| AGT-024 minimal penarikan | P2 | Terbuka | DB tes KNOWN: Rp 1.000 diterima database; minimal Rp 100.000 hanya di browser (`agentSupport.ts:11`). Nilai Rp 100.000 sendiri belum disebut SOP |
| AGT-025 notifikasi admin saat KTP masuk | P2 | Sebagian | Tautan diperbaiki ke `/admin/agents` (`20261006140000_p0_fixes.sql:19`); belum ada notifikasi saat onboarding lengkap (DB tes KNOWN) |
| AGT-026 login | P2 | Terbuka | `AgentLogin.tsx:21,156` "Ingat saya" tanpa efek, `:41,:60` selalu ke dasbor, pemblokiran staf hanya `role='admin'` (`useAgentAuth.tsx:235-242`) |
| AGT-027 Jamaah Saya | P2 | Terbuka | Tanpa pencarian dan halaman detail (`AgentMyJamaah.tsx`); tahap hanya belum DP/DP/lunas |
| AGT-028 tabel komisi | P2 | Terbuka | `AgentCommission.tsx:507` tabel dengan gulir mendatar, tanpa ekspor, tanpa info pajak |
| AGT-029 sisa bahasa Inggris | P2 | Sebagian | Sekitar 30 baris tersisa: "Full Booked/Almost Full" (4 file), "Filter & Sort", "Full Leaderboard - Top 100", "Agent Levels", "Rewards Store", "Redeem", "Keluar (Logout)", "Login Agent", "Lengkapi Profil Agent" |
| AGT-030 sapaan | P2 | Tuntas | 0 "Anda" di portal agen, `/jadi-agen`, `/sop-agen`, admin agen; "kamu" konsisten |
| AGT-031 desain | P2 | Sebagian | Hex arbitrer dan emoji ikon hilang; sisa 8 baris palet mentah di `lib/agentLevels.ts:15-18,43-46` (amber/slate/yellow/purple-blue) |
| AGT-032 ikon tanpa nama | P2 | Tuntas | Pindai semua `size="icon"` di portal dan shell: 0 tanpa `aria-label`/`title` (1 kasus `AgentDashboard.tsx:129` berlabel di anak `<a>`) |
| AGT-033 shell halaman | P2 | Sebagian | Judul tab per halaman ("Komisi - Portal Agen Musafar Tour", BP), pencocokan awalan `navMatch.ts`. Sisa: `/agent/xyz` masih 404 publik (`App.tsx:567`); halaman galat (error boundary) mempertahankan judul halaman sebelumnya |
| AGT-034 bar bawah ponsel | P2 | Tuntas | BP 375 px: bar tetap (Dasbor, Jamaah Saya, Paket, Komisi, Lainnya), tanpa gulir mendatar di 12 halaman. Catatan: DESIGN.md menyebut "Daftarkan", bar memakai "Paket" |
| AGT-035 paket | P2 | Terbuka | Tanpa pencarian/filter maskapai/flyer (`AgentPackages.tsx`) |
| AGT-036 state galat | P2 | Sebagian | `LoadError` di 3 dari 12 halaman portal (Dasbor, Lead, Jamaah Saya). BP dengan sesi palsu: Paket tampil "Menampilkan 0 paket", Jadwal "Tidak ada jadwal yang sesuai", Komisi "Rp 0": kegagalan terbaca sebagai kosong |
| AGT-037 mulai cepat | P2 | Terbuka | Dasbor hanya kartu "Lengkapi data rekening" |
| AGT-038 akun dan privasi | P2 | Perlu keputusan pemilik | Tanpa hapus/nonaktifkan akun, unggah ulang KTP, kunci nama. Kebijakan: biaya hangus bila mundur (kak Virna), jadi hapus akun perlu aturan tertulis |
| AGT-039 corong referral | P2 | Terbuka | Tidak ada klik/daftar per tautan; `/r/:code` hanya mengalihkan |
| AGT-040 lint | P3 | Terbuka | eslint: 4 error `no-explicit-any` (`useAgentAuth.tsx:39,318`, `AgentCommission.tsx:267,268`) dan 1 peringatan; `tsc` lulus |
| AGT-041 dekorasi dasbor | P3 | Tuntas | Kartu "Potensi 10 Pax" hilang; sisa kelas `from-primary to-primary` (`AgentDashboard.tsx:66`) tanpa efek |

---
## 3. Matriks kepatuhan SOP

Status: **Terpenuhi** (sistem menjalankan aturan), **Sebagian**, **Belum ada** (tidak ada mekanisme; hanya teks atau manual), **Bertentangan** (sistem melakukan hal yang berlawanan dengan aturan). Nomor bagian mengikuti SOP/AGEN/001 (bagian 4 dan 5 di PDF punya sub-bagian a sampai e; "4.x" dan "5.x" di bawah menunjuk sub-bagian itu). "Virna" = jawaban kak Virna 7 Okt. Bukti DB merujuk migrasi; "tes" merujuk `tests/db`.

| Bagian | Aturan | Status | Bukti |
|---|---|---|---|
| 1 | Agen tidak mengurus operasional; tim Musafar menangani administrasi, pembayaran, dokumen | Terpenuhi | Agen hanya membuat intake; pembayaran dan dokumen hanya staf (`jamaah_payments` tanpa akses agen; tes 04) |
| 2 | Syarat umur minimal 17 tahun, bukan kerja sama travel lain | Belum ada | Form `AgentRegister.tsx` tanpa tanggal lahir atau pernyataan; `/jadi-agen` memuat umur 17 tetapi tidak "bukan kerja sama travel lain" |
| 3 | Syarat umum: WNI, identitas valid, WhatsApp aktif, rekening aktif, bukan karyawan | Sebagian | WhatsApp, KTP (16 digit), alamat, rekening dikumpulkan (`AgentOnboarding.tsx`, `AgentProfile.tsx`); WNI dan "bukan karyawan" hanya teks. KTP bisa kosong saat disetujui (hanya peringatan, `agentData.ts:107-115`); 4 dari 6 agen aktif tanpa KTP |
| 3 | Dokumen: nama, KTP, WA, alamat, no. rekening, nama pemilik rekening | Terpenuhi | Kolom `agents` dan onboarding; KTP unik (`agents_ktp_number_key`) |
| 4a | Empat tingkat Duta/Silver/Gold/Platinum, tanpa Bronze | Terpenuhi | `agents_level_check` (DB), `20261006190000:37-62` |
| 4a | Batas tingkat per tahun (Silver 1-15, Gold 15-30, Platinum 30+) | Sebagian | `agent_levels` Silver 1-14, Gold 15-29, Platinum 30+ (batas 15 dan 30 belum dijawab, Q2). UI menulis "per tahun" (`AgentLeaderboard.tsx:519,559`) tetapi menghitung `agents.total_sales` seumur hidup (:159-160); total hanya naik bila komisi > 0 (lihat AGT-101, AGT-113) |
| 4a | Kenaikan tingkat otomatis | Belum ada | Tidak ada trigger atau fungsi; admin mengubah manual (`AgentDetailDialog.tsx:288`) |
| 4b | Biaya registrasi Rp 1.500.000 sekali seumur hidup, rekening PT BCA/BSI/BNI, bukti ke PIC | Terpenuhi | `sopAgen.ts:26`, rekening sama persis dengan SOP (`lib/jamaah.ts:15-20`), kirim bukti via WhatsApp PIC (`AgentSetupChecklist.tsx:48-50`); admin menandai lunas (`AgentManagement.tsx:208`) |
| 4b | Biaya dibayar setelah formulir disetujui (Virna) | Bertentangan | Portal meminta biaya + SOP sebelum persetujuan ("dicek admin sebelum akun agenmu diaktifkan", `AgentSetupChecklist.tsx:70`; `/jadi-agen` langkah 2). Pertanyaan 56 belum dijawab |
| 4b | Biaya hangus bila mundur; cicilan tidak disarankan (Virna) | Belum ada | Tidak ada aturan atau teks di portal; hanya status `unpaid/paid/waived` |
| 4b | Welcome kit, perlengkapan, marketing kit, grup WhatsApp, pelatihan, sertifikat | Sebagian | Daftar isi tampil; marketing kit ada; tidak ada pencatatan pengiriman, formulir ukuran, sertifikat, atau absensi pelatihan. Virna: kit dikirim akhir Oktober, ongkir agen, formulir ukuran dari Virna: landing tidak menyebut ongkir (AGT-118) |
| 4c | Hak agen (jual semua produk, komisi, pelatihan, materi, gathering, sertifikat) | Sebagian | Jual dan komisi dan materi ya; pelatihan, gathering, sertifikat di luar sistem |
| 4d | Kewajiban: tidak ubah harga, tidak terima uang jamaah ke rekening pribadi | Sebagian | Harga resmi dari tabel `packages`, agen tidak bisa mengubah; larangan rekening pribadi hanya teks (panduan dan SOP) |
| 4e | Skema komisi per tingkat (rentang SOP) | Terpenuhi | Digantikan surat 035-037 (Virna). Tabel `agent_commission_rates` terisi 48 baris untuk 16 paket; seed dicek baris per baris sama dengan surat |
| 4e | Surat 035/036/037: 22 keberangkatan (2 SOLD OUT), per kelas dan maskapai | Sebagian | 20 baris surat, 16 paket cocok. Tidak ada paket untuk 6 Jan Hemat Oman, 26 Nov Pelataran dan Nyaman SV, 5 Nov Nyaman Qatar (jumlah sama dengan baris tetangga kecuali 6 Jan). 10 Jan "Hemat Oman" dicocokkan manual ke paket bertingkat Nyaman (catatan di baris tarif). Periode setelah Maret 2027 belum ada surat; paket Okt 2026 dan sold-out jatuh ke Rp 1.500.000 flat |
| 4e | Haji khusus Rp 5.000.000 | Belum ada | Tidak ada paket haji di sistem; poin haji 300 tidak ada |
| 4e | Bonus Closing (5 jamaah Rp 500.000, 10 jamaah Rp 1.500.000, 40 jamaah motor/tunai) | Belum ada | Hanya teks di `/jadi-agen`; tidak ada penghitung, ledger, atau persetujuan bonus; "dalam 1 invoice" belum jelas (Q14) |
| 4e | Reward tahunan (Top 10, Top 3, Grand Prize, Best Rookie) | Belum ada | Peringkat memakai total seumur hidup (`get_agent_leaderboard`), bukan per tahun; tidak ada pengumuman atau hadiah |
| 4e | Program bulanan, komunitas "Duta Musafar", Road to Baitullah | Belum ada | Di luar sistem (grup WhatsApp) |
| 4e | Program Referral: agen mengajak agen, bonus tambahan 30% | Belum ada | `agents.referred_by_id` tercatat (`register_agent_profile`, `set_agent_referrer`), tidak ada perhitungan bonus; "30% dari apa" belum dijawab (Q15) |
| 4e | Marketing Support (brosur, flyer, banner, poster, video, story, feed, katalog, pricelist) | Sebagian | Halaman Marketing dan Paket; tanpa brosur/pricelist unduh per paket (AGT-035) |
| 4e | Poin (100/300/20/30) dan penukaran | Belum ada | Tabel `agent_points` kosong, tidak ada pemberi poin; "Rewards Store" menampilkan 6 hadiah (kaos 500 poin sampai tunai Rp 500.000 5.000 poin) yang tidak ada di SOP, tombol "Redeem" tanpa fungsi (`AgentLeaderboard.tsx:575-640`) (AGT-114) |
| 4e | Target minimal 1 jamaah/bulan atau 12 per tahun | Belum ada | Tidak ada pelacakan; akibat jika tidak tercapai belum dijawab (Q4, Q13) |
| 4e | Masa keaktifan: pembinaan minimal 6 kali per tahun, tidak melanggar SOP | Belum ada | Tidak ada kehadiran pembinaan |
| 4 Step 1-3 | Isi formulir, verifikasi data, persetujuan | Terpenuhi | `register_agent_profile`, onboarding KTP, admin Setujui (`AgentManagement.tsx:144-176`) |
| 4 Step 4 | Agent ID unik | Terpenuhi | `MUS-XXXXXX` unik (`agents_referral_code_key`), tampil di sidebar, dasbor, kartu agen (`AgentIdCard.tsx`) dan dipakai di tautan `/r/:code`. Terbit saat mendaftar, bukan setelah persetujuan (selisih kecil; hanya agen aktif yang diatribusi) |
| 4 Step 5 | Onboarding (produk, pricelist, materi, registrasi lead, follow-up, closing, komisi, etika) lalu AKTIF | Sebagian | Panduan Penjualan ada; "aktif" = persetujuan admin, tanpa langkah selesai onboarding atau pelatihan |
| 5A | Calon Agen belum boleh transaksi atas nama Musafar | Terpenuhi | `agent_lead_actor()` hanya agen `active` (`20261006180000:118-136`); atribusi intake hanya agen aktif (`create_jamaah_intake`, `daftar.ts:51`); penarikan menolak non-aktif (`guard_agent_withdrawal`); layar status pending menutup portal |
| 5B | Agen Aktif = terverifikasi, punya Agent ID, ikut onboarding, menyetujui ketentuan | Sebagian | Admin boleh menyetujui walau KTP, biaya, SOP belum ada (peringatan saja); database tidak mengaitkan `active` dengan `sop_accepted_at` (tes 10: lead tetap bisa dibuat) (AGT-107) |
| 5C | Nonaktif otomatis bila 3 bulan tanpa aktivitas atau administrasi tidak lengkap | Belum ada | Tidak ada cron atau fungsi; hanya status manual `suspended` |
| 5D | Diberhentikan karena pelanggaran berat | Sebagian | `suspended` ada, tanpa alasan, tanpa tingkat sanksi, tanpa jejak (lihat bagian 21) |
| 6 | Tugas agen: cari calon jamaah, kenalkan produk, follow-up, bantu pendaftaran, pastikan tanggal tersedia | Sebagian | Lead Saya, Jadwal dengan sisa kursi, Daftarkan Jamaah (form sama dengan publik, divalidasi server); tanpa cek seat saat intake (CS menyaring) |
| 4.4 | Persyaratan umroh (DP 5 jt, KTP, KK, vaksin, buku nikah, paspor, akta anak, foto, formulir) | Sebagian | DP 5 jt dan paspor 12 bulan di panduan; dokumen dikumpulkan CS, bukan agen |
| 5a | Agen Resmi Berkantor boleh pakai identitas Musafar di media sosial; Agen Individu tidak | Belum ada | Tidak ada jenis agen di data. Kartu Agen mencetak "Agen Resmi Musafar Tour" untuk semua agen (`AgentIdCard.tsx:51`) yang bisa dibaca sebagai hak Berkantor (AGT-120). Syarat Berkantor belum dijawab (Q40) |
| 5b-e | Materi resmi tanpa ubah harga; konten buatan agen disetujui manajemen sebelum tayang; syarat syariah (aurat, musik beralat, ikhtilat); sanksi konten | Belum ada | Tidak ada alur persetujuan konten, tidak ada aturan konten di Marketing Kit atau `/sop-agen` (AGT-108). Virna: kirim ke WhatsApp PIC, selesai < 24 jam; tidak ditulis di portal |
| 6 | Calon jamaah wajib didaftarkan sebagai lead dulu (nama, WA, paket, Agent ID, tanggal) | Sebagian | `agent_leads` memuat semua kolom itu dan 30 hari, tetapi tidak wajib: agen bisa langsung mendaftarkan jamaah tanpa lead (`AgentRegisterJamaah.tsx:74` hanya imbauan). Intake membawa Agent ID dan tanggal sehingga atribusi tetap ada |
| 6 | Kepemilikan: agen yang meng-handle aktif sejak daftar sampai lunas | Belum ada | Tidak ada pengecekan aktivitas handle; atribusi tetap pada agen pada intake |
| 6 | Calon dari status WhatsApp tanpa follow-up: 100% ke Agen 2 yang closing | Sebagian | Sengketa ditandai ke manajemen (`lead_conflict`, `/admin/agent-leads`, kolom `conflict_intake_agent_name`); tidak ada pemindahan otomatis, keputusan manual |
| 6 | Bantuan Agen 1 ke Agen 2: 30/70; jamaah sudah daftar lewat Agen 1 lalu minta bantuan: 60/40 | Sebagian | `agent_leads.helped_by_agent_id` dicatat (`set_lead_helper`); nominal tidak dibagi di mana pun. Virna: total komisi mengikuti tingkat agen pendaftar, lalu dibagi (belum diimplementasikan, Q28) |
| 6 | Bukti dan pencatatan handling (nama, tanggal mulai, riwayat follow-up, status) | Terpenuhi | `agent_leads` + `agent_lead_followups` (jenis, catatan, waktu), status lead, tes 08 |
| 6 | Sengketa diputuskan berdasar riwayat komunikasi, bukti follow-up, data sistem; keputusan manajemen final | Sebagian | Data tersedia untuk staf; tidak ada tombol keputusan, tidak ada penahan komisi selama sengketa (AGT-106) |
| 6 | Lead Protection 30 hari kalender, dengan syarat follow-up aktif | Sebagian | 30 hari tetap, follow-up tidak memperpanjang (`:53`, `:217`), satu lead aktif per nomor (`:65`), kedaluwarsa lazy (`expire_agent_leads`, dipanggil di setiap fungsi). "Tidak aktif bila tidak ada follow-up" tidak diterapkan otomatis; UI menulis "selama kamu aktif follow-up" (`AgentLeads.tsx:447`). Tidak ada cron untuk `expire_agent_leads` (tes 08 menguji kedaluwarsa lazy) |
| 7 | Wajib harga resmi; larang diskon pribadi, cashback, fasilitas tak tersedia, ubah itinerary, promo sendiri | Sebagian | Agen tidak bisa mengubah harga di sistem; sisanya larangan perilaku (teks) |
| 7 | Diskon pribadi dikurangi dari fee komisi | Belum ada | `sync_registration_commission` memakai nominal tarif, tidak melihat `jamaah_registrations.discount` (`20261007100000:289-312`); aturan potongan penuh atau persen belum dijawab (Q23) (AGT-121) |
| 8 | Semua pembayaran lewat rekening resmi; agen tidak terima uang | Terpenuhi | Agen tidak punya jalur mencatat pembayaran; rekening PT dicantumkan di portal dan panduan |
| 9 | Checklist 1: agen berstatus aktif | Bertentangan | Komisi tetap dikreditkan ke agen yang disuspend sebelum lunas (tes 10, AGT-109) |
| 9 | Checklist 2-3: jamaah lead agen terdaftar, Agent ID tercatat | Sebagian | Agent ID tercatat di registrasi (`jamaah_registrations.agent_id`); lead tidak wajib |
| 9 | Checklist 4-5, 7: pembayaran sesuai ketentuan, diterima dan diverifikasi | Terpenuhi | Komisi hanya saat verified payments >= tagihan (`sync_registration_commission:296-313`); DP tidak mengkredit (tes 09, 10) |
| 9 | Checklist 6: data jamaah lengkap | Belum ada | Kredit tidak memeriksa kelengkapan paspor/KTP/foto (`v_should` hanya status, tagihan, tarif, `commission_skipped`) |
| 9 | Checklist 8-9: tidak ada pembatalan atau refund | Sebagian | Pembatalan atau penolakan pembayaran sebelum payout membalik kredit (tes 09). Setelah payout: saldo negatif (AGT-104) |
| 9 | Checklist 10: tidak ada sengketa lead | Belum ada | AGT-106 (tes 10: dikredit saat sengketa terbuka) |
| 9 | Checklist 11: tidak ada pelanggaran agen | Sebagian | Hanya penanda manual `commission_skipped` pada registrasi |
| 9 | Checklist 12: ketentuan minimum komisi (12 jamaah/tahun menurut Virna) | Belum ada | Arti minimum belum jelas (Q13); tidak dicek |
| 9 | Selain syarat terpenuhi komisi PENDING dan belum dicairkan | Sebagian | Pra-lunas tampil sebagai "perkiraan" (`waiting`) dan tidak masuk saldo; nama status PENDING tidak dipakai |
| 10 | Besaran per paket, periode, campaign, promo; perubahan diumumkan lewat kanal resmi | Sebagian | Per paket dan kelas dan tingkat lewat Komisi Agen admin; perubahan tarif tidak punya riwayat (`set_commission_rate` hanya `updated_by`/`updated_at`, tanpa trigger audit) dan tidak diumumkan ke agen (AGT-117) |
| 11 | Empat status komisi PENDING, ELIGIBLE, APPROVED, PAID | Sebagian | Ada `waiting` (≈ PENDING), `confirmed` (≈ ELIGIBLE+APPROVED sekaligus), permintaan penarikan pending/paid. Status `paid` pada `agent_sales` tidak pernah diisi (AGT-104). Persetujuan manajemen dan finance hanya pada penarikan (Virna) |
| 12 | Komisi dibayar H sampai H+2 jamaah landing | Bertentangan | Saldo bisa ditarik saat lunas, hari keberangkatan masih 90 hari lagi dalam tes (tes 10; `AgentMyJamaah.tsx:30` "sudah tercatat di saldo", `AgentCommission.tsx:453` "Tarik saldo") sementara teks di halaman yang sama berkata H sampai H+2 (`sopAgen.ts:55-57`). Tanggal bayar pasti belum dijawab (Q55) (AGT-102) |
| 13 | Komisi tidak berlaku: lead tak terdaftar, bukan dari agen, refund, fiktif, manipulasi, pelanggaran harga, sengketa, di luar prosedur | Sebagian | Refund/batal membalik kredit (sebelum payout); sisanya penilaian manual staf lewat `commission_skipped` |
| 14 | Refund setelah komisi dibayar: potong komisi berikutnya, dikembalikan agen, atau mekanisme lain | Sebagian | Pembalikan membuat `available_balance` negatif (tes 10: -3.000.000) yang otomatis "memotong komisi berikutnya", tanpa catatan, tanpa pilihan b dan c, tanpa pemberitahuan (AGT-104) |
| 15 | Bonus hanya bila agen membawa jamaah langsung, harga resmi bukan promo | Belum ada | Lihat 4e Bonus Closing |
| 16 | Hak agen: Agent ID, info produk, pricelist, materi, training, pendampingan, lead protection, status transaksi, komisi, bonus | Sebagian | Semua kecuali training dan bonus tersedia (pendampingan = tombol WhatsApp PIC) |
| 17 | Kewajiban agen: daftarkan lead, follow-up, jaga data jamaah, lapor ke PIC, rekening resmi | Sebagian | Lead dan follow-up bisa dicatat, tidak diwajibkan; privasi data jamaah ditegakkan di database (tes 04) |
| 18 | Larangan (mengambil lead agen lain, menyebarkan data jamaah, dll.) | Sebagian | Lead agen lain tidak bisa dicatat dan tidak bocor siapa pemiliknya (tes 08); sisanya perilaku |
| 19 | Penanganan komplain: jamaah → agen → PIC → divisi → manajemen | Sebagian | Teks di `/sop-agen`; tombol WhatsApp PIC; tidak ada tiket |
| 20 | Evaluasi agen (lead, follow-up, closing, jamaah, omzet, komplain, keaktifan) | Belum ada | Tidak ada dasbor evaluasi di admin; `admin_agent_leads` hanya daftar |
| 21 | Sanksi 4 tingkat | Sebagian | Hanya `suspended` (Level 3 kasar); tidak ada catatan teguran, alasan, atau tingkat |
| 22 | Alur: daftar, verifikasi, disetujui, Agent ID, onboarding, aktif, cari lead, registrasi lead, follow-up, closing, bayar, verifikasi, eligible, approval, dibayar | Sebagian | Hulu sampai closing jalan; hilir menyimpang di langkah eligible/approval/bayar (bagian 11 dan 12) |
| 23 | Contoh 1-3 (komisi berhasil, DP = PENDING, refund = tidak dibayar) | Sebagian | Contoh 2 dan 3 sesuai sebelum payout; Contoh 1 menjadi "tercatat" saat lunas, bukan saat berangkat (Contoh 2 menyebut komisi diberikan setelah jamaah berangkat) |
| 24 | Pernyataan agen menyetujui SOP (nama, Agent ID, WhatsApp, tanggal, tanda tangan) | Sebagian | Kotak centang + `accept_agent_sop` menyimpan waktu dan versi, hanya sekali (tes 07). Tanpa tanda tangan; versi bebas diisi klien (AGT-115); tanpa persetujuan ulang bila SOP berubah; yang disetujui adalah ringkasan (AGT-108) |
| 25 | Musafar boleh mengubah syarat, masa lead, komisi, bonus, pembayaran, produk, evaluasi; diumumkan | Sebagian | Konfigurasi di data (tarif, `protected_until` default); tanpa mekanisme pengumuman dan persetujuan ulang |
| Surat 035-037 | Komisi per tanggal berangkat, kelas, tingkat; SOLD OUT | Terpenuhi (seed) | `20261007100000:418-474`; live 48 baris; 4 Nov dan 25 Nov tanpa tarif sesuai SOLD OUT. Duta tidak ada di surat (AGT-101) |
| Virna | Hanya Hemat, tidak ada Super Hemat | Terpenuhi | Kelas data: hemat, nyaman, pelataran-hemat, five-star |
| Virna | Komisi mengikuti paket bila jamaah pindah paket | Bertentangan | Sebelum lunas ikut paket baru; setelah tercatat tetap nominal lama (tes 10, AGT-103) |
| Virna | Total komisi mengikuti tingkat agen pendaftar; lalu 30/70 atau 60/40 | Sebagian | Tingkat dipakai saat kredit, bukan saat daftar; kapan tingkat dikunci belum dijawab (Q24, Q53); pembagian belum ada |
| Virna | Komisi disetujui manajemen dan finance | Sebagian | Hanya antrean penarikan admin (`process_agent_withdrawal`, peran admin/agent_admin); tidak ada langkah persetujuan per komisi |
| Virna | Biaya transfer ditanggung Musafar | Terpenuhi | Tidak ada potongan biaya transfer |
| Virna | PPh 5% dipotong, NPWP tidak wajib, NIK wajib | Belum ada | `agent_withdrawals` tanpa kolom pajak/neto (tes 10), pembayaran bruto; NIK kosong tidak menghalangi pembayaran (tes 10) (AGT-105) |
| Virna | Bukti ke agen = bukti transfer | Belum ada | Tidak ada unggah atau tautan bukti pada penarikan |
| Virna | Welcome kit akhir Oktober, ongkir agen, formulir ukuran | Belum ada | Tidak dicatat atau disampaikan di portal |
| Virna | Persetujuan konten via WhatsApp PIC < 24 jam | Belum ada | Tidak disebut di Marketing Kit |
| Virna | Minimum 12 jamaah/tahun | Belum ada | Lihat 4e target |

---

## 4. Temuan baru (AGT-101 dan seterusnya)

Severitas: P0 menghalangi onboarding agen sungguhan, P1 serius, P2 sebaiknya diperbaiki, P3 poles. Effort: S kurang dari 2 jam, M setengah hari, L sehari atau lebih. "tes 10" = `tests/db/10_agent_recheck.sql` (baris KNOWN membawa ID temuan).

### P0

| ID | Titik | Bukti | Standar | Saran | Effort |
|---|---|---|---|---|---|
| AGT-101 | Komisi / tingkat Duta | Setiap agen baru Duta (`register_agent_profile`, default kolom). Surat 035-037 hanya Silver/Gold/Platinum; `agent_commission_for` mengembalikan 0 untuk level tanpa baris pada paket yang punya tarif (`20261007100000:251-261`). Live: 16 dari 21 paket mendatang berstatus terbit punya tarif. Tes 10: agen Duta, jamaah lunas pada paket bertarif: tanpa baris `agent_sales`, saldo +0, `total_sales` tidak naik, Jamaah Saya menampilkan lunas/none/0 (`AgentMyJamaah.tsx:32` `none: () => null`, tanpa teks). Pada paket tanpa tarif Duta yang sama menerima Rp 1.500.000 flat dan `total_sales` +1. Karena `total_sales` hanya naik bila komisi > 0, Duta tidak pernah mencapai ambang Silver (1 jamaah). Halaman paket jujur ("Komisi dikonfirmasi PIC Agen", `MyCommission.tsx:7`), tetapi setelah lunas tidak ada penjelasan | PartnerStack/Impact: tarif tiap tingkat tertulis sebelum agen jualan; tidak ada nol diam-diam | Pemilik/kak Virna menjawab Q51 (komisi Duta). Sampai ada jawaban: tampilkan "Komisi tingkat Duta belum ditetapkan, dikonfirmasi PIC" pada jamaah lunas, hitung `total_sales` dari registrasi lunas (bukan dari komisi), dan beri notifikasi admin saat jamaah agen Duta lunas tanpa tarif | S (teks dan hitung) + keputusan |

### P1

| ID | Titik | Bukti | Standar | Saran | Effort |
|---|---|---|---|---|---|
| AGT-102 | Waktu dan status komisi | Kredit dan saldo bisa ditarik saat lunas (`sync_registration_commission`, `20261007100000:312-349`); tes 10: penarikan sebesar komisi diterima 90 hari sebelum berangkat. `AgentMyJamaah.tsx:30` "sudah tercatat di saldo", `AgentCommission.tsx:453` "Tarik saldo", tetapi teks di halaman yang sama dan `/jadi-agen` berkata dibayar H sampai H+2 landing (`sopAgen.ts:55-57`). `agent_sales` tanpa kolom eligible/approved/paid. SOP bagian 11, 12, 23 Contoh 2; Virna: dibayar saat berangkat, disetujui manajemen dan finance. Tanggal bayar belum dijawab (Q18, Q55) | Amazon Associates, Grab: "Tersedia pada tanggal X", status jelas | Pisahkan saldo menjadi Menunggu / Layak (berangkat) / Disetujui / Dibayar; tambahkan `eligible_at` yang diisi pada H atau tanggal landing; sembunyikan "Tarik saldo" sampai layak, atau ubah semua teks menjadi "bisa ditarik setelah lunas" bila itu keputusan pemilik | M-L |
| AGT-103 | Pindah paket | Setelah komisi tercatat, `sync_registration_commission` mempertahankan nominal lama bila agen sama (`:304-306`). Tes 10: dipindah dari paket Rp 3.000.000 ke Rp 1.000.000 lalu kembali, nominal tetap Rp 1.000.000. Sebelum lunas ikut paket baru (PASS). Virna: komisi mengikuti paket baru | Aturan bisnis tertulis | Hitung ulang saat `package_id` berubah: balik kredit lama, kredit baru (tanpa menyentuh yang berstatus dibayar), catat di riwayat | S-M |
| AGT-104 | Refund setelah payout | Penarikan `paid` hanya mengurangi saldo; `agent_sales.status` tetap `confirmed`, jadi penjaga "sudah dibayar jangan disentuh" (`:317`) tidak pernah aktif (tidak ada kode yang mengisi `paid`). Tes 10: payment ditolak setelah payout, `available_balance` = -3.000.000, penjualan `cancelled`, tanpa catatan atau notifikasi. Penarikan berikutnya diblokir `balance - pending < amount`. SOP 14 a/b/c | Praktik keuangan: piutang tercatat dan terlihat | Isi `paid_at`/`paid` pada penjualan saat penarikan dibayar dan hubungkan penjualan ke penarikan; saat refund setelah payout buat catatan "piutang agen" (nominal, alasan, status: dipotong dari berikutnya / dikembalikan / lain) dan beri tanda di admin | M |
| AGT-105 | Pajak, NIK, bukti | `agent_withdrawals` kolom: id, agent_id, amount, bank_*, status, admin_notes, waktu; tidak ada pajak, neto, bukti. Tes 10: staf membayar bruto Rp 3.000.000 ke agen tanpa NIK; `process_agent_withdrawal` tidak memeriksa. Virna: PPh 5% dipotong, NIK wajib, bukti = bukti transfer. Onboarding mewajibkan KTP di browser tetapi bisa disetujui tanpa | Aturan perpajakan; slip pencairan | Tambah `tax_amount`, `net_amount`, `proof_url` pada penarikan; `process_agent_withdrawal` menolak bila `ktp_number` kosong; tampilkan "Diterima neto" di dialog tarik dan riwayat. Konfirmasi dasar potongan (bruto tiap pembayaran, bukti potong; Q54) | M |
| AGT-106 | Sengketa lead | `create_jamaah_intake` mencatat `lead_conflict` tetapi intake tetap atas agen pendaftar (`20261006180000:560-575`). Tes 10: lead A masih `active`, registrasi atas B dikreditkan Rp 3.000.000 ke B saat lunas. Checklist SOP 9.10 dan bagian 13.11: sengketa = PENDING | SOP | Tambah penanda `commission_hold` pada registrasi yang terkait notifikasi `lead_conflict`; `sync_registration_commission` tidak mengkredit selama hold; admin punya tombol keputusan (agen A / agen B / bagi 30-70 atau 60-40) | M |
| AGT-107 | Urutan dan gerbang onboarding | Portal: biaya + SOP sebelum persetujuan (`AgentSetupChecklist.tsx:70`, `/jadi-agen` langkah 2); Virna: biaya dibayar setelah formulir disetujui; Q56 (kapan jadi Agen Aktif) belum dijawab. Database: `agent_lead_actor` hanya cek `status='active'` (`:129`); tes 10: agen aktif dengan biaya `unpaid` dan tanpa SOP mencatat lead; persetujuan admin hanya peringatan (`agentData.ts:107-115`). Live: 0 agen pernah menyetujui SOP | SOP bagian 5B (Aktif = diverifikasi + onboarding + menyetujui) | Pakai kata kak Virna sebagai sumber: ubah alur jadi Daftar, Verifikasi data, Disetujui (menunggu pembayaran), Bayar biaya dan setuju SOP, Aktif. Jadikan status tengah eksplisit (mis. `approved_unpaid`) atau tolak `active` bila `registration_fee_status='unpaid'` dan `sop_accepted_at` kosong, kecuali `waived` | M |
| AGT-108 | SOP yang disetujui | `SOP_SECTIONS` (`sopAgen.ts:87-267`) 15 bagian ringkasan; tidak memuat kepemilikan jamaah, lead protection, 30/70 dan 60/40, penggunaan identitas Musafar dan Agen Berkantor/Individu, syarat konten syariah, persetujuan konten, bonus lengkap, target, masa keaktifan, evaluasi, poin. Dokumen asli 23 halaman. Persetujuan (`AgentSetupChecklist.tsx`) berbunyi "SOP Program Agen" tanpa tautan PDF; `sop_version` hanya string; tidak ada persetujuan ulang bila SOP berubah (bagian 25) | Perjanjian elektronik: dokumen yang ditandatangani = dokumen yang disetujui | Sediakan PDF SOP resmi (`public/`), tautkan di halaman persetujuan dan `/sop-agen`; lengkapi `SOP_SECTIONS` dari dokumen; simpan hash/versi tetap; minta persetujuan ulang saat versi naik | S-M |

### P2

| ID | Titik | Bukti | Standar | Saran | Effort |
|---|---|---|---|---|---|
| AGT-109 | Agen suspended | Tes 10: jamaah milik agen yang disuspend sebelum lunas tetap dikreditkan Rp 3.000.000; `list_my_agent_jamaah` mengembalikan 2 jamaah ke agen suspended (sisa AGT-007) | SOP 9.1 | Kredit hanya bila agen `active` saat lunas, atau kredit tetapi tahan di status Menunggu; tambah `a.status='active'` di `list_my_agent_jamaah` | S |
| AGT-110 | Paket bertingkat ganda | `registration_commission_tier` mengembalikan NULL bila harga daftar tidak cocok dengan tepat satu tingkat (`:222-223`); tes 10: jamaah lunas Rp 12.345.678 pada paket dua tingkat dikredit Rp 0, agen melihat none/0, tanpa peringatan. Hari ini aman (semua 21 paket bertingkat tunggal) tetapi diskon atau perubahan harga memicunya | Tidak ada nol diam-diam | Simpan `tier` di `jamaah_registrations` saat diterima CS; bila tidak diketahui buat notifikasi admin | M |
| AGT-111 | Bayi dan non-bed | `room_type` tidak berperan (`:289-312`); tes 10: registrasi `infant` Rp 5.000.000 dikredit penuh Rp 3.000.000. Virna bertanya balik cara Musafar menghitung (Q11) | Aturan bisnis | Tunggu jawaban; sementara tandai registrasi bayi/non-bed untuk ditinjau sebelum kredit | S + keputusan |
| AGT-112 | Kredit ganda saat bersamaan | `sync_registration_commission` membaca `agent_sales` tanpa mengunci lalu `INSERT ... ON CONFLICT DO UPDATE` dan selalu menambah saldo (`:300-349`). Dua verifikasi pembayaran di dua sesi pada registrasi sama dapat sama-sama melihat "belum ada penjualan" dan kedua-duanya menambah saldo. Tidak dapat diuji dalam satu transaksi (dibaca dari kode; tes 10: pemanggilan berurutan aman) | Operasi uang harus aman paralel | Awali fungsi dengan `SELECT ... FROM jamaah_registrations WHERE id=_registration_id FOR UPDATE`, atau tambah saldo hanya bila `INSERT` benar-benar menyisipkan/mengubah status | S |
| AGT-113 | Tingkat per tahun | UI "per tahun" tetapi `total_sales` seumur hidup (`AgentLeaderboard.tsx:159-160,519`); `agent_levels` Silver 1-14, Gold 15-29 vs SOP "1-15, 15-30"; tidak ada kenaikan atau penurunan otomatis; tidak ada target 12/tahun atau status nonaktif 3 bulan (hanya 3 job cron: seat dan booking) | SOP 4a, 5C, Target | Hitung jamaah lunas per tahun kalender dari `agent_sales`/registrasi, usulkan kenaikan ke admin (bukan otomatis) sampai Q2, Q4, Q13, Q53 dijawab | M |
| AGT-114 | Gamifikasi mati | `AgentLeaderboard.tsx:575-640` Rewards Store: tombol "Redeem" tanpa `onClick`; `agent_points` 0 baris dan tidak ada pemberi poin; `agent_rewards` memuat 6 hadiah di luar SOP (kaos, tas, "Bonus Cash Rp 500.000" 5.000 poin); 12 badge dan 4 tantangan tanpa pengisi (0 earned); judul Inggris | Jangan tampilkan kontrol yang tidak bekerja | Sembunyikan Rewards Store, Badges, Challenges sampai program poin SOP dibangun; tampilkan peringkat dan tingkat saja | S |
| AGT-117 | Jejak tarif | `agent_commission_rates` tanpa trigger riwayat/audit (hanya `updated_by`, `updated_at`; 0 trigger pada tabel itu); edit tarif tidak terekam untuk sengketa dan tidak ada pengumuman ke agen (SOP 10, 25) | Jejak audit uang | Tabel riwayat tarif (`old/new/by/at`) lewat trigger; catatan perubahan terlihat di admin | S |
| AGT-118 | Data syarat dan info landing | Form tidak menangkap pernyataan umur 17+, WNI, bukan karyawan, bukan kerja sama travel lain (SOP 2-3); `/jadi-agen` menulis welcome kit "sudah termasuk" tanpa menyebut ongkir ditanggung agen (Virna), pengiriman akhir Oktober, formulir ukuran dari PIC, potongan PPh 5%, biaya hangus bila mundur, cicilan tidak disarankan | Hindari kejutan setelah bayar | Satu kotak pernyataan syarat di registrasi, tambah empat baris di FAQ `/jadi-agen` dan di checklist biaya | S |
| AGT-119 | Bonus dan program yang dijanjikan | `/jadi-agen` mencetak Bonus Closing 5/10/40 jamaah (`sopAgen.ts:58`); tidak ada penghitung, ledger, atau persetujuan bonus; bonus referral 30% tidak dihitung; reward tahunan dan Top 10 tidak ada | Janji publik = fitur nyata atau jelas manual | Tambah "dihitung dan dibayar manual oleh PIC" pada teks, atau bangun ledger bonus (`agent_bonuses`) bila jadi prioritas | S (teks) / L (fitur) |
| AGT-120 | Kartu Agen | `AgentIdCard.tsx:51` mencetak "Agen Resmi Musafar Tour" untuk semua agen; SOP 5a membedakan Agen Resmi Berkantor (boleh memakai identitas Musafar) dan Agen Individu (tidak boleh) | SOP 5a | Ganti tulisan menjadi "Agen Musafar Tour" atau tambah jenis agen; tentukan syarat Berkantor (Q40) | S |
| AGT-121 | Diskon pribadi | SOP 7: diskon dikurangi dari fee komisi; `jamaah_registrations.discount` hanya mengurangi tagihan (`v_due`), tidak komisi (`:289-312`); aturan potongan penuh atau persen belum dijawab (Q23) | SOP 7 | Tunggu jawaban Q23, lalu `agent_commission_for(...) - potongan` | S + keputusan |

### P3

| ID | Titik | Bukti | Saran | Effort |
|---|---|---|---|---|
| AGT-115 | Versi SOP | Tes 10: `accept_agent_sop('SOP/AGEN/999-palsu')` tersimpan; server tidak membandingkan versi dengan yang terbit | Whitelist versi di server (tabel `sop_versions`) | S |
| AGT-116 | Probing Agent ID | Tes 10: `set_lead_helper` diam untuk kode tak dikenal, tetapi `list_my_agent_leads.helper_code` hanya terisi bila kode nyata; komentar migrasi mengklaim tidak bisa dipakai menebak. Agent ID memang dibagikan agen sebagai tautan, jadi dampak rendah | Biarkan, atau kembalikan nama agen tanpa memperlihatkan kode lebih dulu | S |
| AGT-122 | Judul halaman publik | `/jadi-agen` dan `/sop-agen` tanpa `<title>`/deskripsi sendiri (BP: judul = beranda; produksi `<title>` sama) walau masuk sitemap | `Helmet` per halaman | S |
| AGT-123 | Detail ponsel | Bar bawah tanpa "Daftarkan Jamaah" (DESIGN.md); tab Profil dan Komisi tinggi 28 sampai 32 px pada 375 px (di bawah 44); tautan bantuan sidebar terpotong ("Hubungi PI...") pada 800 px | Naikkan tinggi tab, tulis label lebih pendek | S |

---
## 5. Hasil tes dan metrik

### 5.1 Suite database (`./scripts/run-db-tests.sh`)

| Proses | Hasil |
|---|---|
| Awal (01 sampai 09) | PASS=472 FAIL=0 SKIP=5 KNOWN=9 FILE_ERRORS=0, RESULT: OK (sesuai harapan). KNOWN 9 baris semuanya di `04_agent_journey.sql` (AGT-024, 007, 025, 008, 003, 022, 014, 023, 013) |
| Akhir (01 sampai 10) | **PASS=478 FAIL=0 SKIP=5 KNOWN=25 FILE_ERRORS=0, RESULT: OK** |

`tests/db/10_agent_recheck.sql` (baru, 22 baris laporan: 6 PASS, 16 KNOWN, 0 FAIL, 0 SKIP). Semua dalam transaksi yang selalu dibatalkan. Dijalankan beberapa kali selama penyusunan; dua FAIL awal adalah salah ketik di tes (tanggal dibaca sebagai angka, `reject_reason` wajib), sudah diperbaiki; tidak ada celah produk yang dilemahkan.

| Cakupan baru | Hasil |
|---|---|
| Kredit ganda: sinkron berulang dan pembayaran lebih tidak menggandakan | PASS |
| Pindah paket sebelum lunas mengikuti paket baru | PASS |
| Sengketa lead memicu satu notifikasi `lead_conflict` | PASS |
| Sapuan 8 relasi `agent_*` yang punya `agent_id`: agen A tidak melihat baris agen lain | PASS |
| Agen biasa ditolak (42501) pada 14 fungsi staf/internal, tulis langsung `agent_leads`/`agent_sales`, ubah level sendiri, kolom biaya/SOP, kode referral | PASS |
| Agen biasa tidak membaca baris `agents` agen lain maupun objek `agent-documents` (KTP) agen lain | PASS |
| Duta pada paket bertarif Rp 0 dan tidak menambah `total_sales`; pada paket tanpa tarif Rp 1.500.000 (AGT-101) | KNOWN x2 |
| Penarikan sebelum berangkat diterima; `agent_sales` tanpa kolom eligible/approved/paid (AGT-102) | KNOWN x2 |
| Pindah paket setelah lunas tidak menghitung ulang (AGT-103) | KNOWN |
| Payout bruto tanpa PPh/NIK/bukti; penjualan tidak pernah `paid`; refund setelah payout = saldo -Rp 3.000.000 (AGT-104, AGT-105) | KNOWN x3 |
| Sengketa lead tidak menahan komisi (AGT-106) | KNOWN |
| Agen aktif dengan biaya `unpaid` dan tanpa SOP bisa mencatat lead (AGT-107); versi SOP palsu tersimpan (AGT-115) | KNOWN x2 |
| Agen suspended tetap dikredit dan masih membaca jamaah (AGT-109) | KNOWN x2 |
| Paket dua tingkat dengan harga tak cocok = Rp 0 (AGT-110); bayi dikredit penuh (AGT-111) | KNOWN x2 |
| Probing Agent ID lewat `helper_code` (AGT-116) | KNOWN |

Pemeriksaan tambahan ke database live (baca saja): `anon` tidak bisa membaca `packages.agent_commission_amount`, akun login tanpa agen bisa (33 baris, flat Rp 1.500.000); 21 paket mendatang berstatus terbit: 16 bertarif, 5 flat (Okt 2026 dan sold-out); 2 paket punya nama yang berbeda dari kelas yang dipakai tarifnya (5 Nov "Umroh Nyaman" berkelas pelataran-hemat, nominal surat sama untuk kedua kelas; 10 Jan "Nyaman 2X Jumat" dipakai untuk baris surat "Hemat Oman", dicocokkan manual dan dicatat di kolom catatan tarif). Auth Supabase: daftar email terbuka, `mailer_autoconfirm=false` (konfirmasi email wajib), Google aktif.

### 5.2 Statis
- `npx tsc --noEmit -p tsconfig.app.json`: lulus (exit 0).
- `npx eslint src/pages/agent src/components/agent src/components/shell src/hooks/useAgentAuth.tsx`: 4 error `no-explicit-any` dan 1 peringatan (sama dengan audit 02).

### 5.3 Metrik antarmuka (kode dan Browser pane)
| Metrik | Audit 02 | Sekarang |
|---|---|---|
| Halaman portal dengan `LoadError` | 2 dari 15 | 3 dari 12 (Dasbor, Lead Saya, Jamaah Saya); Paket, Jadwal, Komisi menampilkan kosong atau Rp 0 saat data gagal (BP sesi palsu) |
| Baris teks Inggris tampil ke agen | sekitar 40 | sekitar 30 |
| Sapaan "Anda" pada portal agen, `/jadi-agen`, `/sop-agen`, admin agen | 29 | 0 |
| Kelas palet mentah | 7 + 4 baris, 1 hex | 8 baris di `lib/agentLevels.ts`, 0 hex |
| Teks di bawah 12 px (portal agen dan shell) | 0 | 0 |
| Tombol ikon tanpa nama aksesibel | 13 | 0 |
| Emoji sebagai ikon UI | 3 | 0 |
| Judul tab per halaman | tidak ada | ada di 12 halaman portal; tidak ada di `/jadi-agen`, `/sop-agen` |
| Gulir mendatar pada 375 px | tidak diuji | 0 dari 12 halaman portal |
| Target sentuh < 40 px pada 375 px | tidak diuji | Dasbor 0; tab Profil 4 (tinggi 28), tab Komisi 3 (32), Marketing 4, Panduan 1, Daftarkan Jamaah 1 |
| Shell | 19 perbedaan admin vs agen | satu `AppShell`; ciut ke rel 76 px, ingat pilihan (cookie), bar bawah 4 menu + "Lainnya", bantuan dan keluar di sidebar |

Penelusuran A sampai Z (kode + Browser): landing `/jadi-agen` (terbaca penuh, tautan SOP dan PIC) → `/agent/register` (persetujuan, galat inline) → layar sukses dan kirim ulang konfirmasi → login (galat `otp_expired` ditangani) → onboarding KTP (AGT-015 terbuka) → checklist biaya dan SOP → persetujuan admin (peringatan saja) → dasbor, Lead Saya, Daftarkan Jamaah, Jamaah Saya → Komisi dan penarikan → Peringkat → Profil dan Kartu Agen → Bantuan (WhatsApp PIC). Titik terlemah: urutan biaya vs persetujuan (AGT-107), komisi Duta (AGT-101), waktu komisi (AGT-102), SOP ringkasan (AGT-108), Peringkat berisi fitur mati (AGT-114).

---

## 6. Keputusan dan jawaban yang masih dibutuhkan (urut dampak)

| # | Pertanyaan | Dari | Mengunci temuan | Q (xlsx) |
|---|---|---|---|---|
| 1 | Komisi tingkat Duta per paket (atau Duta memang Rp 0 sampai naik Silver, dan bagaimana ia naik bila jamaah pertama tidak dihitung) | Pemilik, kak Virna | AGT-101, AGT-113 | 51 |
| 2 | Kapan komisi layak ditarik: saat lunas atau H sampai H+2 landing; satu kali per keberangkatan; tanggal pasti; siapa menyetujui di finance | Pemilik, kak Virna | AGT-102 | 18, 55 |
| 3 | Urutan onboarding: biaya setelah formulir disetujui (kata kak Virna) atau sebelum; kapan status menjadi Agen Aktif; boleh mencatat lead sebelum bayar | Kak Virna, pemilik | AGT-107 | 38, 56 |
| 4 | PPh 5%: dasar potongan (kotor per pembayaran?), perlu bukti potong, NIK wajib sebelum bayar; isi "bukti transfer" | Kak Virna, finance | AGT-105 | 54 |
| 5 | Bayi dan non-bed: dihitung jamaah untuk komisi atau tidak, berapa | Pemilik | AGT-111 | 11 |
| 6 | Refund setelah komisi dibayar: cara utama (potong dari berikutnya / agen mengembalikan); jamaah pindah paket setelah dibayar | Pemilik | AGT-103, AGT-104 | 21, 22 |
| 7 | Sengketa lead: komisi ditahan sampai putus? siapa yang memutuskan; apakah follow-up aktif wajib dan memperpanjang 30 hari; perhitungan 30/70 dari tingkat agen pendaftar | Pemilik, manajemen | AGT-106 | 27, 28 |
| 8 | Kapan tingkat agen dikunci (saat daftar, lunas, berangkat); batas 15 dan 30; tahun kalender atau 12 bulan; yang dihitung: lunas atau terdaftar | Pemilik | AGT-113 | 2, 24, 53 |
| 9 | Arti "minimum komisi 12 jamaah/tahun" dan akibatnya (tanpa komisi, tanpa bonus, turun tingkat, nonaktif) | Kak Virna | AGT-113 | 4, 13 |
| 10 | Diskon pribadi: dikurangi senilai penuh atau persen | Pemilik | AGT-121 | 23 |
| 11 | Agen Resmi Berkantor vs Individu: syarat dan siapa menetapkan; apakah Kartu Agen boleh bertuliskan "Agen Resmi" | Pemilik | AGT-120 | 40 |
| 12 | Saluran notifikasi agen (WhatsApp, email, in-app) | Kak Virna, pemilik | AGT-013 | 49 |
| 13 | Bonus Closing ("dalam 1 invoice"), bonus referral 30% (dari apa dan berapa lama), nilai tukar poin, reward tahunan: bangun di sistem atau dikelola manual | Pemilik | AGT-114, AGT-119 | 14-17 |
| 14 | Surat komisi untuk keberangkatan setelah Maret 2027; paket yang tidak ada di sistem (6 Jan Hemat Oman, 26 Nov Pelataran dan Nyaman, 5 Nov Nyaman Qatar); konfirmasi 10 Jan "Hemat Oman" = paket "Nyaman 2X Jumat"; arti Platinum "Kantor Cabang Resmi" | Direktur Utama | AGT-101, data tarif | 52 |
| 15 | Agen nonaktif (3 bulan): apa yang dihitung aktivitas, cara aktif kembali; pencatatan sanksi 4 tingkat | Pemilik | Matriks 5C, 21 | 41, 42 |
| 16 | Welcome kit: format form ukuran dan alamat, pencatatan pengiriman, sertifikat; minimal penarikan Rp 100.000 (belum ada di SOP); jam layanan PIC | Kak Virna | AGT-118, AGT-024 | 43, 48 |
| 17 | Apakah SOP versi 01 final; boleh dibagikan PDF aslinya untuk persetujuan; prosedur persetujuan ulang | Pemilik | AGT-108 | 25 SOP |
| 18 | Hapus akun agen dan pengembalian biaya registrasi (hangus bila mundur) | Pemilik | AGT-038 | 37 |

---

## 7. Yang tidak bisa diverifikasi

- Template email Supabase (konfirmasi, reset), daftar redirect yang diizinkan, masa berlaku tautan: dashboard Supabase tidak dapat dibaca dari repo atau curl.
- Perlindungan spam pendaftaran: tidak ada captcha di pengaturan yang terbaca, tetapi pengaturan Supabase tidak memperlihatkan status captcha atau batas laju; `signUp` tidak dijalankan karena akan membuat akun. Enumerasi email lewat pesan "Email ini sudah terdaftar" hanya dinilai dari kode (`authErrors.ts:20`); perilaku Supabase untuk email yang sudah dikonfirmasi tidak diuji.
- Paritas produksi dengan repo: `/jadi-agen` dan `/sop-agen` mengembalikan 200 dan masuk sitemap, tetapi HTML awal SPA tidak memperlihatkan isi; portal agen di produksi butuh login dan tidak dibuka.
- Sesi palsu di Browser pane memakai token tidak sah, sehingga pemanggilan data Supabase gagal: tampilan dengan data nyata (kartu lead, tabel komisi, Jamaah Saya terisi) tidak terlihat; perilaku itu hanya diuji lewat SQL. Penilaian "galat terbaca sebagai kosong" berasal dari kegagalan itu.
- Perilaku bersamaan (dua sesi) pada `sync_registration_commission` (AGT-112) tidak dapat diuji di satu transaksi; hanya dari kode.
- Layar admin (antrean penarikan, kolom komisi agen, dialog lead agen) tidak ditelusuri di browser; hanya fungsi database dan beberapa file sumber.
- Perangkat nyata (iOS Safari, Android), kontras warna terukur, kecepatan muat, pembacaan layar.
- Operasional: tidak ada agen nyata di database, jadi lama persetujuan, volume lead, dan perilaku staf tidak terukur. Nomor WhatsApp PIC (6285287471835) cocok dengan jawaban kak Virna, tetapi respons dan jam layanan tidak diuji.
- Kebenaran hukum persetujuan SOP elektronik dan perlakuan pajak (PPh 5%): di luar cakupan audit teknis.
