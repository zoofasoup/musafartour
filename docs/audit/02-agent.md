# Audit 02: Portal Agen (perjalanan A sampai Z)

Tanggal audit: 6 Oktober 2026. Cakupan: `src/pages/agent/*`, `src/components/agent/*`, `src/hooks/useAgentAuth.tsx`, `src/hooks/useAgentJamaah.ts`, `src/lib/authErrors.ts`, migrasi `supabase/migrations/2026100*.sql`, `functions/api/daftar.ts`, bagian terkait `Daftar*.tsx`, `Lengkapi.tsx`, `AdminLayout.tsx`. Pembanding: portal mitra/afiliasi yang matang (Shopify Partners, Amazon Associates, Impact, PartnerStack, Traveloka/Tiket partner, Tokopedia/Shopee Affiliate, alur "lengkapi profil, verifikasi, disetujui" Grab/Gojek).

Metode: baca kode (semua file di atas), kueri baca-saja ke database live (jumlah baris, definisi view/policy, tanpa data pribadi), suite SQL `tests/db` dijalankan dua kali, file tes baru `tests/db/04_agent_journey.sql`, `tsc`, `eslint`, hitung metrik kode. Tidak ada kode aplikasi yang diubah, tidak ada tulis ke database (semua tes berjalan dalam transaksi yang selalu dibatalkan).

Tidak dapat diverifikasi (dikatakan terang di tempat terkait): tampilan di browser nyata (portal butuh login agen), template email Supabase dan daftar redirect yang diizinkan di dashboard Supabase, batas waktu kedaluwarsa tautan konfirmasi, apakah unduhan lintas-origin berjalan, kontras warna terukur.

---

## 1. Ringkasan

1. Fondasi data sudah kuat: 192 PASS, 0 FAIL di seluruh suite database. Isolasi antaragen, privasi paspor/NIK/KTP/token, atribusi referral sampai komisi Rp 1.500.000 saat lunas, dan penarikan berjalan benar di level database (43 cek baru di `04_agent_journey.sql`).
2. Yang bermasalah adalah "kulit" perjalanan: pendaftaran, verifikasi, status, notifikasi, bantuan. Ini yang membuat keluhan pemilik terasa nyata: banyak hal standar yang terlewat.
3. Tombol ciutkan sidebar memang hanya muncul saat sidebar sudah ciut (`AgentHeader.tsx:23-31`), tidak ada di dalam sidebar, kondisi tidak diingat, judulnya berbahasa Inggris. Cacat ini dan perbedaan UI agen vs admin (bagian 4) kami catat sebagai AGT-005 dan AGT-006.
4. Agen berstatus pending atau suspended terjebak: layar status tidak punya tombol Keluar, tautan "Kembali ke halaman login" memantul kembali ke layar yang sama, tidak ada kontak CS (AGT-001).
5. Tautan yang dibagikan dari tombol Share (Paket, Jadwal, Detail) memakai `id` paket, padahal halaman publik hanya mengenali `slug`; calon jamaah melihat "paket tidak ditemukan" (AGT-002).
6. Halaman Peringkat menampilkan "Komisi 4.5% sampai 6%" dan manfaat seperti account manager dan trip tahunan dari tabel `agent_levels`, bertentangan dengan komisi tetap Rp 1.500.000 (AGT-003).
7. Konfirmasi email buntu: tidak ada kirim ulang, tautan kedaluwarsa tidak ditangani, tidak ada tempat memberi tahu apa yang terjadi (AGT-004).
8. Tidak ada saluran notifikasi ke agen sama sekali (in-app, WhatsApp, email); pengaturan notifikasi di Profil hanyalah tombol palsu (AGT-013, AGT-018). Tidak ada status "ditolak" dengan alasan (AGT-014).
9. Dua pelanggaran privasi di level database: akun mana pun yang login (tanpa baris agen) bisa membaca `agent_leaderboard` (nama dan total komisi lima agen) dan komisi semua paket (AGT-008); agen suspended masih bisa membaca daftar jamaah dan mengajukan penarikan lewat API (AGT-007).
10. Dasbor menghitung peringkat dari tabel `agents` yang hanya bisa dibaca agen untuk barisnya sendiri, jadi selalu "Peringkat #1 dari 1 agen" (AGT-009).

**Kesiapan onboarding agen sungguhan: BELUM.** Penghalang: AGT-001 (terjebak di layar pending/suspended), AGT-002 (tautan bagikan rusak), AGT-003 (janji komisi persen dan manfaat yang tidak berlaku), AGT-004 (konfirmasi email buntu). Setelah empat ini beres dan AGT-007/008 ditutup (masing-masing sekitar 1 jam di SQL), statusnya menjadi "siap dengan catatan"; sisanya adalah kelengkapan standar (landing rekrutmen, notifikasi, status ditolak, bantuan CS, penyatuan shell).

---

## 2. Scorecard perjalanan (0 sampai 5 terhadap standar)

| # | Titik sentuh | Skor | Vonis satu baris |
|---|---|---|---|
| 1 | Penemuan / rekrutmen | 1 | Tidak ada landing "Jadi Agen", tidak ada tautan dari Navbar/Footer; hanya form telanjang di `/agent/register` |
| 2 | Form registrasi | 2 | Kolom minimal dan ada tampil/sembunyi password, tetapi validasi hanya toast, tanpa persetujuan privasi (UU PDP), tanpa `autoComplete`/`inputMode` |
| 3 | Konfirmasi email | 1 | Layar sukses informatif, tetapi tanpa kirim ulang dan tanpa penanganan tautan kedaluwarsa |
| 4 | Login | 2 | Lupa password benar; "Ingat saya" palsu, kembali ke halaman semula diabaikan, jalur Google melewati pemblokiran staf |
| 5 | Onboarding KTP | 2 | Ada kompresi dan pratinjau; tanpa draf, tanpa langkah, tanpa penjelasan privasi, tidak bisa edit setelah kirim |
| 6 | Status menunggu persetujuan | 1 | Satu kalimat, tanpa linimasa, tanpa CS, tanpa Keluar; tidak ada status ditolak; tidak ada polling |
| 7 | Pengalaman pertama setelah disetujui | 2 | Empty state dengan aksi ada di Dasbor dan Jamaah Saya; tidak ada sambutan atau daftar langkah awal |
| 8 | Dasbor | 3 | Daftar "perlu ditindaklanjuti" dan tombol WhatsApp bagus; peringkat salah; tidak ada area peringatan |
| 9 | Paket / jadwal / detail | 2 | Komisi per pax tampil; tautan bagikan rusak, label Inggris, teks WA salah ("Direct"), tanpa pencarian/filter maskapai |
| 10 | Daftarkan jamaah | 3 | Form yang sama dengan publik, divalidasi server, kode terbit; tanpa deteksi ganda/draf, tanpa teruskan ke jamaah |
| 11 | Jamaah Saya | 3 | Progres bayar dan komisi jelas, privasi terjaga; tanpa pencarian, detail, tahap dokumen/berangkat, alasan penolakan |
| 12 | Komisi dan penarikan | 2 | Alur penarikan benar di DB; UI menampilkan saldo tanpa memotong permintaan pending, galat mentah, tabel melebar, label Inggris |
| 13 | Marketing kit, panduan, peringkat | 2 | Materi statis berisi klaim "promo spesial", catatan internal tampil ke agen, janji level tidak berlaku |
| 14 | Profil | 2 | Edit nama/bank/password ada; foto gagal, notifikasi palsu, tanpa hapus/nonaktifkan akun, tanpa unggah ulang KTP |
| 15 | Notifikasi | 0 | Tidak ada (tidak ada tabel, tidak ada bel, tidak ada template WhatsApp otomatis) |
| 16 | Bantuan / dukungan | 1 | Tidak ada tautan CS di halaman portal mana pun; FAQ/status tidak ada; tombol WhatsApp melayang disembunyikan di `/agent` |
| 17 | Shell dan lintas-halaman | 2 | Tombol ciut rusak, tanpa bar bawah ponsel, judul tab generik, 404 publik, galat tanpa coba lagi di 6 halaman |
| 18 | Kesetaraan shell agen vs admin | 1 | Lebar, latar, bingkai, header, ciut, logout, bel, bahasa semuanya berbeda (bagian 4) |

Rata-rata 1,8 dari 5.

---

## 3. Tabel temuan

Severitas: P0 menghalangi onboarding agen sungguhan, P1 serius, P2 sebaiknya diperbaiki, P3 poles. Effort: S kurang dari 2 jam, M setengah hari, L satu hari atau lebih. Path relatif terhadap akar repo; `KNOWN` merujuk baris di `tests/db/04_agent_journey.sql`.

### P0

| ID | Titik | Bukti | Standar | Saran | Effort |
|---|---|---|---|---|---|
| AGT-001 | 6 Status | `AgentProtectedRoute.tsx:46-70` layar pending hanya berisi tautan "Kembali ke halaman login" (:57-66); `:72-86` layar suspended tanpa aksi apa pun, memakai emoji (:77). `AgentLogin.tsx:28-32` mengirim agen yang sudah punya sesi kembali ke `/agent/dashboard`, sehingga tautan itu hanya memutar balik ke layar yang sama. Tidak ada Keluar, tidak ada kontak. | Grab/Gojek, Shopee Affiliate: halaman status dengan linimasa, estimasi waktu, tombol hubungi CS, ubah data, keluar | Satu halaman "Status akun" di dalam shell portal: linimasa (Daftar, Email, Data, Verifikasi), estimasi, tombol WhatsApp CS, Keluar, Ubah data; versi suspended dengan alasan dan kontak | M |
| AGT-002 | 9 Bagikan | `src/components/package-detail/PackageShareModal.tsx:58` membuat `/paket-umroh/${pkg.id}?ref=`; halaman publik memakai `usePackageBySlug` (`PackageDetail.tsx:58-61`, `usePackages.ts:163-168`: `.eq('slug', slug)`). Database live: 0 dari 34 paket punya slug sama dengan id. Modal ini dipakai di `AgentPackages.tsx:437`, `AgentPackageDetail.tsx:595`, `AgentSchedule.tsx:461`; payload Jadwal bahkan tidak membawa `slug` (:466-482). (Dari pembacaan kode; tidak dibuka di browser.) | Amazon Associates SiteStripe: tautan selalu sah dan berpelacak | Pakai `pkg.slug` atau `/daftar/${slug}?ref=`; sertakan `slug` di payload Jadwal; tambah tes yang memastikan setiap URL bagikan terselesaikan | S |
| AGT-003 | 13 Peringkat | Tabel `agent_levels` live: bronze 4.5-4.5, silver 4.75-5.0, gold 5.0-5.5, platinum 5.5-6.0, manfaat "Dedicated account manager", "Annual reward trip", "VIP support 24/7", "Bonus referral Rp 100.000", "Free merchandise". `AgentLeaderboard.tsx:582` mencetak "Komisi: x% - y%"; manfaat dicetak di :585-589. Tes `KNOWN levels`. Komisi sebenarnya tetap Rp 1.500.000 (migrasi `20261006130000`). | PartnerStack/Impact: struktur komisi dinyatakan satu kali dan sama dengan kontrak | Hapus baris persen dan manfaat yang tidak ditawarkan; tampilkan level sebagai pengakuan (jumlah jamaah lunas). Pemilik memutuskan manfaat mana yang benar-benar diberikan | S kode + keputusan pemilik |
| AGT-004 | 3 Email | `useAgentAuth.tsx:159` `emailRedirectTo` ke `/agent/login`; tidak ada `resend(` di seluruh `src` (grep kosong); tidak ada penanganan `otp_expired`/`error_description` di `src` (grep kosong); `AgentRegister.tsx:101-135` layar sukses hanya punya "Ke Halaman Login"; `authErrors.ts:17-19` hanya menyuruh cek spam. Menurut kode, tautan kedaluwarsa mendarat di form login tanpa pesan (tidak diuji di browser). Template email default Supabase kemungkinan berbahasa Inggris (tidak dapat dibaca dari repo). | Shopify Partners, Impact: "Kirim ulang email" dengan jeda, halaman tautan kedaluwarsa | `supabase.auth.resend({type:'signup'})` di layar sukses dan di galat "Email belum dikonfirmasi"; baca `#error_code` dan tampilkan "Tautan kedaluwarsa, kirim ulang"; template email berbahasa Indonesia di dashboard Supabase | M |

### P1

| ID | Titik | Bukti | Standar | Saran | Effort |
|---|---|---|---|---|---|
| AGT-005 | 17 Shell (keluhan pemilik) | `AgentHeader.tsx:23-31`: tombol hanya dirender bila `!open`; `AgentLayout.tsx:103` `<Sidebar>` tanpa pemicu di dalamnya dan tanpa `collapsible="icon"`, jadi ciut berarti seluruh menu hilang. Admin punya `SidebarTrigger` saat terbuka (`AdminLayout.tsx:196-203`) dan tombol buka saat ciut (:205-215). Status tidak diingat: `ui/sidebar.tsx:56` `useState(defaultOpen)`, cookie ditulis di :68 tetapi tidak pernah dibaca; `AgentLayout.tsx:102` memutuskan dari lebar layar. Judul tombol berbahasa Inggris "Expand Sidebar" (`AgentHeader.tsx:27`), target 32px, tanpa `aria-label`. | Shopify Admin, Linear, Vercel: pemicu selalu terlihat di header sidebar, mode rel ikon, status diingat | Pemicu di header sidebar saat terbuka, `collapsible="icon"` (rel ikon), baca cookie `sidebar:state`, `aria-label` "Ciutkan menu"/"Buka menu", target 44 | S |
| AGT-006 | 18 Shell (keluhan pemilik) | Tabel di bagian 4: 19 perbedaan terukur antara `AdminLayout.tsx` dan `AgentLayout.tsx`+`AgentHeader.tsx` | Satu sistem desain, satu shell | Spesifikasi shell bersama di bagian 4 | M |
| AGT-007 | 6 Status (DB) | `04` baris `KNOWN suspended`: agen suspended masih menerima baris dari `list_my_agent_jamaah` (nama, telepon, status bayar) dan masih bisa membuat permintaan penarikan lewat API. `guard_agent_withdrawal` (`20261005090000_security_hardening.sql:84-120`) dan `list_my_agent_jamaah` (`20261003130000_agent_jamaah.sql:35-74`) tidak melihat `agents.status`. Yang menutup hanya UI (`AgentProtectedRoute.tsx:72`). Sisi positif: `functions/api/daftar.ts:56-60` menolak non-aktif dan atribusi baru berhenti (PASS). | Prinsip "UI bukan penjaga" | Tambah `AND a.status = 'active'` pada subquery agen di dua RPC dan di trigger penarikan | S |
| AGT-008 | 17 Privasi | `04` baris `KNOWN outsider`: akun login tanpa baris agen membaca `agent_leaderboard` (nama, total_sales, total_commission 5 agen) dan `agent_commission_amount` 33 paket. View berhak pemilik dan di-GRANT ke authenticated (`20261006120000_leaderboard_not_public.sql:5`); pendaftaran email terbuka untuk siapa saja. `AgentLeaderboard.tsx:51,299` menampilkan total komisi sesama agen. | UU PDP, praktik marketplace: tampilkan peringkat, bukan penghasilan orang lain | Batasi view dan kolom komisi ke agen aktif (fungsi `is_active_agent()`); ganti total_commission dengan jumlah jamaah lunas | S-M |
| AGT-009 | 8 Dasbor | `AgentDashboard.tsx:31-35` mengurutkan `agents` aktif; RLS hanya memberi satu baris (tes 02 "agent sees exactly 1 row"); `04` baris `KNOWN dashboard rank`: 1 terbaca vs 5 aktif. Hasil: selalu "Peringkat #1 dari 1 agen" (:157-159). | Angka yang benar atau tidak ditampilkan | Pakai view `agent_leaderboard` seperti halaman Peringkat | S |
| AGT-010 | 1 Penemuan | Tidak ada tautan ke `/agent/register` di `Navbar.tsx` maupun `Footer.tsx:96-110`; hanya `public/robots.txt:25` yang mengizinkannya. Halaman memakai `AuthLayout.tsx` dengan judul tetap "Selamat Datang" (:30-33) dan foto Unsplash hotlink (:14). Tidak ada manfaat, komisi, cara kerja, syarat, FAQ. | Shopee/Tokopedia Affiliate, Traveloka Partner, Impact: landing rekrutmen sebelum form | Halaman publik `/jadi-agen`: Rp 1.500.000 per jamaah (tercatat saat lunas), 4 langkah, syarat (KTP, rekening atas nama sendiri), FAQ, CTA; tautan di Navbar dan Footer | M-L |
| AGT-011 | 2 Registrasi | `AgentRegister.tsx:41-76` validasi hanya lewat toast, tanpa galat per kolom; tidak ada kotak persetujuan Kebijakan Privasi/Syarat (UU PDP) di seluruh file; tidak ada `autoComplete`/`inputMode` di :149,167,184,216; tombol mata tanpa `aria-label` (:225-237, 254-266); tombol Google (:301-306) melewati form sehingga kode referral hilang dan persetujuan tidak ada; referral hanya dari `?ref=` (:22), tidak dari cookie `musafar_ref`; `?ref=` di halaman ini juga menyetel cookie atribusi jamaah (`useReferralCapture.tsx:23-28` via `App.tsx:193-197`). | Impact, PartnerStack: persetujuan eksplisit, galat inline, kunci kata sandi dikelola browser | Kotak persetujuan wajib, galat inline `aria-describedby`, `autoComplete` (name, email, tel, new-password), `inputMode="tel"`, label tombol mata, referral dari cookie | M |
| AGT-012 | 12 Komisi | `AgentCommission.tsx:208` saldo = `agent.available_balance` tanpa memotong permintaan pending, padahal guard DB memotongnya (`20261005090000:97-110`, tes `04` PASS); validasi UI hanya terhadap saldo penuh (:259-261), sehingga permintaan kedua gagal dengan toast mentah (:188 `"Gagal mengajukan penarikan: " + error.message`). Kartu: "Total Earned", "Pending", "Earned", "Deals", "Avg Komisi" Inggris (:329,335,442-446). "Pending" (:200-202) berasal dari `agent_sales.status='pending'`, sedangkan Dasbor "Komisi menunggu" dari `list_my_agent_jamaah`; dua definisi berbeda. Saldo dari cache `agents` dengan `staleTime` 5 menit (`useAgentAuth.tsx:145`) dan `refetchOnWindowFocus:false` (`App.tsx:115`): saldo basi setelah CS memverifikasi atau admin membayar. | Amazon Associates, Grab: Tersedia / Sedang diproses / Dibayar; estimasi pencairan | Kartu "Bisa ditarik" = saldo minus pending, kartu "Sedang diproses", refetch saat halaman dibuka, terjemahkan galat, tampilkan estimasi pencairan | M |
| AGT-013 | 15 Notifikasi | Tidak ada tabel notifikasi agen (`04` baris `KNOWN notifications`); satu-satunya pemberitahuan persetujuan adalah aksi toast admin yang hilang dalam 15 detik (`src/pages/admin/AgentManagement.tsx:164-176`); tidak ada bel di `AgentHeader.tsx`. Peristiwa tanpa pemberitahuan: akun disetujui, pendaftaran diterima/ditolak CS, pembayaran terverifikasi, komisi masuk, penarikan dibayar/ditolak. | Tokopedia/Shopee Affiliate, Grab: bel in-app minimal plus template WhatsApp | Tabel `agent_notifications` diisi dari trigger yang sudah ada, bel di header, dan tombol "Kabari via WhatsApp" bertemplate untuk tiap peristiwa di sisi admin | L |
| AGT-014 | 6 Status | `agents_status_check` hanya `pending, active, suspended` (live; `04` `KNOWN agent status`); `AgentDetailDialog.tsx:353-360` hanya punya "Setujui"; `AgentProtectedRoute.tsx` tidak punya layar ditolak/perlu perbaikan. | Grab/Shopee: "Perlu perbaikan data" dengan alasan dan kirim ulang | Status `rejected`/`needs_fix` plus kolom alasan, tombol admin "Minta perbaikan", layar portal dengan alasan dan tombol Ubah data | M |
| AGT-015 | 5 Onboarding | `AgentOnboarding.tsx:42-47` setelah lengkap agen langsung dialihkan ke Dasbor dan tidak bisa mengubah data terkirim (juga `AgentProtectedRoute.tsx:37-43`); :287 menulis "drag and drop" padahal hanya input file transparan (:292-298), tanpa `capture` kamera; :107-110 `getPublicUrl` pada bucket privat menyimpan URL yang tidak pernah termuat (admin mengakalinya di `agentData.ts:100-104`; agen tidak bisa melihat KTP-nya sendiri); :125 KTP hanya dicek `length >= 16`, bukan angka, tanpa `inputMode`; :142 telepon dicek pada string mentah; tanpa draf, tanpa indikator langkah; klaim "aman & terenkripsi" (:390) tidak terverifikasi; tidak ada penjelasan tujuan KTP/privasi. Live: 4 dari 6 agen aktif belum punya data KTP/alamat, jadi di login berikutnya mereka dipaksa ke onboarding (`AgentProtectedRoute.tsx:37-43`). | Grab: daftar langkah, bantuan per kolom, kamera, "tersimpan otomatis" | Langkah 1-2-3 dengan progres, `capture="environment"`, simpan draf, penjelasan tujuan data, ubah data saat pending, tandai agen aktif lama sebagai terverifikasi atau beri banner (bukan dinding) | M |
| AGT-016 | 16 Bantuan | Tidak ada kontak CS/WhatsApp/FAQ di `src/pages/agent` maupun `src/components/agent` (grep); `AgentPackageDetail.tsx:441` "Hubungi admin" tanpa tautan; layar pending/suspended tanpa kontak; `FloatingWhatsApp` disembunyikan di `/agent` (`App.tsx:265`). | Setiap portal: menu Bantuan | "Bantuan" tetap di header/sidebar yang membuka WhatsApp CS dengan kode agen terisi; halaman FAQ; kontak di layar status | S-M |
| AGT-017 | 4 Login | `AgentDetailDialog.tsx:335` admin mengirim reset ke `/agent/login?reset=true`; `AgentLogin.tsx` mengabaikan `reset` dan sesi pemulihan langsung dialihkan ke Dasbor (:28-32), jadi agen masuk tanpa pernah membuat password baru (disimpulkan dari kode, tidak dijalankan). Alur dari agen sendiri benar (`AgentForgotPassword.tsx:28` memakai `/set-password?next=/agent/login`). | Konsisten | Pakai redirect yang sama (`/set-password?next=/agent/login`) | S |

### P2

| ID | Titik | Bukti | Standar | Saran | Effort |
|---|---|---|---|---|---|
| AGT-018 | 14 Profil | `AgentProfile.tsx:100-106` status notifikasi lokal; :735-795 saklar; :800 tombol "Simpan Pengaturan" hanya `toast.success`; ada bagian "Notifikasi Push" yang tidak ada. | Jangan menampilkan kontrol yang tidak bekerja | Hapus tab sampai ada notifikasi (AGT-013) | S |
| AGT-019 | 2/4/14 Password | Registrasi minimal 8 (`AgentRegister.tsx:67`), Profil dan SetPassword 6 (`AgentProfile.tsx:267`, `SetPassword.tsx:75,143`), pesan "huruf dan angka" (`authErrors.ts:34`), tidak ada petunjuk aturan di bawah kolom, tidak ada meter; ubah password tidak meminta password lama (state ada di `AgentProfile.tsx:89-91`, kolomnya tidak). | Satu aturan terlihat | Satu konstanta aturan (8, huruf+angka) dipakai tiga tempat plus teks petunjuk | S |
| AGT-020 | 9 Bagikan | `AgentSchedule.tsx:472` mengisi `flight_type: 'Direct'` tetap dan nama hotel `null` (:473,475): teks WhatsApp menulis "(Direct)" dan "-"; `AgentPackageDetail.tsx:132-148` "Hubungi saya" tanpa nomor agen; ambang kategori berbeda (`AgentSchedule.tsx:52-56` 4.5/3.5 vs `AgentPackages.tsx:134-138` 5/4); kartu "Potensi 10 Pax" (`AgentPackageDetail.tsx:306-309`). Prinsip PRODUCT.md: jangan menjanjikan yang tidak pasti. | Teks bagikan benar dan lengkap | Pakai data paket asli, sertakan WhatsApp agen, satu fungsi kategori, hapus "Direct" tetap | S |
| AGT-021 | 13 Marketing | `AgentMarketingKit.tsx:64-90` skrip statis ("placeholder until database has content"), banyak `[Nama]` yang tidak terisi otomatis, "promo spesial", "harga spesial", "harga berlaku sampai [Tanggal]", DP disebut tanpa "tidak dikembalikan" (:75,79); `AgentSalesGuide.tsx:41-44` harga tier tertanam; :185-187 dan :265-267 menampilkan catatan internal ("belum didokumentasikan", "eskalasi ke supervisor") kepada agen; panduan tidak menjelaskan aturan komisi (grep "komisi" kosong). Unduhan `AgentMarketingKit.tsx:226-235` memakai `<a download>` lintas-origin (kemungkinan hanya membuka tab; tidak diuji). | Materi benar, terisi otomatis dengan nama dan kode agen | Isi `[Nama Agent]` dan tautan dari profil, ambil harga dari paket, tambah "DP tidak dikembalikan", pindahkan catatan internal ke admin, jelaskan komisi | M |
| AGT-022 | 14 Profil | `AgentProfile.tsx:224-240` mengunggah foto ke `marketing-materials/<agent id>/avatar.*`; policy tulis bucket itu hanya admin (live; `04` `KNOWN profile photo`), jadi selalu gagal; URL juga tidak pernah disimpan (hanya `useState`, :84). | Fitur bekerja atau tidak ada | Bucket/policy `avatars` per pengguna dan simpan path di `agents`, atau hapus tombol | S |
| AGT-023 | 11 Jamaah | `list_my_agent_intakes` (`20261003110000_agent_intake.sql:75-86`) tidak mengembalikan `reject_reason`; `AgentMyJamaah.tsx:153-155` hanya "Ditolak" (`04` `KNOWN intakes`). | Alasan dan langkah berikutnya | Tambah kolom alasan dan teks "Hubungi CS" | S |
| AGT-024 | 12 Komisi | Minimal Rp 100.000 hanya di browser (`AgentCommission.tsx:255`); database menerima Rp 1.000 (`04` `KNOWN withdrawal`). | Aturan di server | CHECK atau cek di `guard_agent_withdrawal` | S |
| AGT-025 | 6 Status (admin) | Bel admin hanya menyala saat baris agen dibuat (`20261006090000_notification_meta.sql:17-33`), bukan saat KTP dikirim (`04` `KNOWN pending`); tautannya `/admin/setup?tab=agents` (:27) mengarah ke halaman AdminSetup (`App.tsx:334`), bukan `/admin/agents`. | Waktu tunggu agen ditentukan oleh kecepatan CS tahu | Trigger saat data onboarding lengkap, perbaiki tautan | S |
| AGT-026 | 4 Login | `AgentLogin.tsx:23,113-123` "Ingat saya" tidak dipakai; :48 tujuan selalu Dasbor padahal `AgentProtectedRoute.tsx:29` menyimpan `state.from`; pemblokiran admin hanya di jalur password (`useAgentAuth.tsx:211-222`), jalur Google (:262-270) tidak, dan hanya `role='admin'` yang dicek (:216): 4 dari 6 "agen aktif" di database live adalah akun staf; impor tidak terpakai (:7,12,13); tanpa galat inline. | Kembali ke halaman semula, sesi sesuai pilihan | Hapus kotak atau jadikan nyata, pakai `state.from`, satukan pemeriksaan staf/suspended di satu fungsi untuk semua jalur | S |
| AGT-027 | 10/11 Jamaah | `AgentMyJamaah.tsx`: tidak ada pencarian, tidak ada halaman detail per jamaah, tahap hanya belum DP/DP/lunas (tidak ada "dokumen lengkap", "berangkat"), satu templat pengingat (`reminderWhatsAppUrl`), tidak ada cara meneruskan kode pendaftaran dan cara bayar ke jamaah; `RegistrationForm.tsx:199` menyebut "Pendaftaran saya" padahal tabnya "Menunggu CS"; layar sukses tanpa tautan ke Jamaah Saya; `AgentRegisterJamaah.tsx:101` `whatsappUrl={() => "#"}`; tanpa deteksi ganda dan draf. Privasi benar: tidak ada paspor/NIK/token (`04` PASS). | Reseller portals Zaui/TripWorks: detail pelanggan dan tindak lanjut | Pencarian, tombol "Kirim kode ke jamaah via WhatsApp" (hanya kode MSF dan rekening PT), peringatan nomor ganda, samakan istilah | M |
| AGT-028 | 12 Komisi | `AgentCommission.tsx:460,516,578` tabel dengan `overflow-x-auto` (DESIGN.md: di bawah 640px jadi kartu; PRODUCT prinsip 4); filter bulan memakai `booking_date`; catatan admin dipotong `max-w-[200px] truncate` (:605) sehingga alasan penolakan tidak terbaca; `queryKey ['agent-withdrawals', id]` dipakai juga oleh `AgentProfile.tsx` dengan `limit(5)` dan urutan lain: cache bersama, riwayat bisa tampil 5 baris; "Deals" menghitung semua status (:443); tidak ada ekspor/rekap, tidak ada info NPWP/PPh. | Amazon Associates: laporan dapat diunduh, info pajak | Tabel jadi kartu di ponsel, kunci kueri unik, tampilkan catatan penuh, ekspor CSV, catatan pajak | M |
| AGT-029 | 17 Bahasa | Sekitar 40 baris teks Inggris tampil ke agen: "Expand Sidebar" (`AgentHeader.tsx:27`), "Agent" (`AgentLayout.tsx:107`), "Full Booked", "Almost Full", "Open (n seats)" (`AgentPackages.tsx:126-129,240-242`, `AgentSchedule.tsx:244-256,543-544,736-740`, `AgentPackageDetail.tsx:108-111`), "Browse dan share paket", "Filter & Sort" (`AgentPackages.tsx:209,219`), "Share Paket", "Share ke Platform" (`PackageShareModal.tsx:136,172`), "Total Earned", "Pending", "Customer", "Setup Rekening" (`AgentCommission.tsx`), "Current", "Full Leaderboard - Top 100" (`AgentLeaderboard.tsx:318,578`), "Keluar (Logout)" (`AgentOnboarding.tsx:215`), "Marketing Kit". Istilah "Agent" vs "Agen": `AgentRegister.tsx:139`, `AgentLogin.tsx:67`, `AgentOnboarding.tsx:194`. Admin juga: "Back to Website", "Search anything...", "Log Out" (`AdminLayout.tsx`). | PRODUCT.md prinsip 5: tidak ada sisa Inggris | Kamus istilah tunggal dan satu kali sapu | S |
| AGT-030 | 17 Bahasa | Sapaan: "Anda" di sekitar 29 baris (auth, onboarding, komisi, profil, detail paket) vs "kamu" di sekitar 15 baris (dasbor, jamaah, paket, daftarkan jamaah, panduan) plus form pendaftaran mode agen (`RegistrationForm.tsx:273`). `DESIGN.md` dan `PRODUCT.md` menulis "kamu"; brief audit menulis "Anda" untuk portal agen. | Satu nada | Pemilik menetapkan satu; sapu seluruh portal. Catatan: dokumen desain dan brief saling bertentangan, perlu keputusan | S |
| AGT-031 | 17 Desain | `AgentLayout.tsx:168` latar `bg-[#F8FAFC]` arbitrer dan bayangan hitam `rgba(0,0,0,.03)` (DESIGN: abu netral `#7C7E7E`); item sidebar `h-8` 32px (`ui/sidebar.tsx:423`) vs 40/44 (DESIGN, juga di admin); palet mentah 7 baris di 4 file (`AgentPackageDetail.tsx:293`, `AgentMarketingKit.tsx:342-343`, `AgentLeaderboard.tsx:203,272`, `AgentProtectedRoute.tsx:50,76`) plus `src/lib/agentLevels.ts:15-18` (amber/slate/yellow/purple); emoji sebagai ikon: `AgentProtectedRoute.tsx:77` 🚫, `AgentPackages.tsx:337,351` ⭐; tombol `variant="brand"` (crimson) di area kerja (`RegistrationForm.tsx:203`; DESIGN: hitam di area kerja); `AgentStatCard` agen vs `StatCard` admin dipakai bergantian antarhalaman agen (Dasbor vs Jamaah Saya). | DESIGN.md | Satukan komponen, hapus palet mentah | M |
| AGT-032 | 17 Aksesibilitas | 13 tombol ikon tanpa nama aksesibel: `AgentLogin.tsx:100`, `AgentRegister.tsx:228,257`, `AgentProfile.tsx:351,385,632,656`, `AgentCommission.tsx:429,435`, `AgentSchedule.tsx:655,661`, `AgentMarketingKit.tsx:611,619`; tombol hari kalender tanpa label (`AgentSchedule.tsx:688`). Status selalu disertai teks (baik). Kontras `text-muted-foreground` pada `bg-muted`: tidak diukur. | WCAG 2.2 AA | `aria-label` pada semua ikon, label tanggal | S |
| AGT-033 | 17 Shell | Judul tab sama untuk semua halaman agen: `App.tsx:171` "Portal Agen - Musafar Tour"; tidak ada breadcrumb atau tombol kembali selain di detail paket; `/agent/xyz` jatuh ke 404 publik lengkap dengan Navbar (`App.tsx:522`, `NotFound.tsx:8-13`); item aktif hanya pada path persis (`AgentLayout.tsx:97`), jadi `/agent/packages/:id` tanpa item aktif. | Judul per halaman, 404 dalam shell | Judul per halaman, 404 dalam shell, pencocokan awalan | S |
| AGT-034 | 17 Shell | `DESIGN.md` ("di ponsel agen bar bawah 4 menu") tetapi hanya ada laci (`AgentHeader.tsx:15-21`). | DESIGN.md | Bar bawah: Dasbor, Daftarkan, Jamaah, Komisi plus "Lainnya" | M |
| AGT-035 | 9 Paket | `AgentPackages.tsx`: tanpa pencarian dan filter maskapai (hanya kategori, status, urutan); stok `|| 40` (:121) menebak bila `slots_total` kosong; tidak ada unduhan flyer per paket (generator flyer ada di admin); paket habis tetap bisa dipilih di `AgentRegisterJamaah.tsx` (tanpa cek seat di `create_jamaah_intake`, `20261003110000:46-47`; CS menangani saat menerima). Tier hemat/nyaman/five star dan quad/triple/double tampil di detail (baik). | Pencarian, filter, flyer | Pencarian, filter maskapai/bulan, tombol flyer, tandai habis | M |
| AGT-036 | 17 Galat | `LoadError` hanya di Dasbor dan Jamaah Saya; Paket, Detail Paket, Jadwal, Peringkat, Komisi, Marketing Kit tidak punya state galat/coba lagi (kegagalan tampak seperti "tidak ada data"); tidak ada pengalihan saat token kedaluwarsa di tengah form (`useAgentAuth.tsx:92-102` hanya membersihkan cache pada SIGNED_OUT; `AgentRegisterJamaah.tsx:43` menangani pesan sesi); tidak ada indikator offline; spinner vs skeleton bercampur. | State galat dengan coba lagi di tiap halaman | Pakai `LoadError` di semua halaman, banner offline | M |
| AGT-037 | 7 Awal pakai | `AgentDashboard.tsx:176-186` hanya kartu rekening; tidak ada sambutan atau daftar langkah (lengkapi rekening, bagikan link, daftarkan jamaah pertama, baca panduan). | Shopify Partners: daftar mulai cepat | Kartu "Mulai di sini" dengan 4 langkah yang tercentang otomatis | M |
| AGT-038 | 14 Profil | Tidak ada hapus/nonaktifkan akun (hak UU PDP), tidak bisa ganti email (`AgentProfile.tsx:470`), tidak bisa melihat atau unggah ulang KTP, nama dan telepon bisa diubah setelah disetujui tanpa verifikasi ulang (:156-165), "Zona Bahaya" hanya "Keluar dari semua perangkat" (:688-715) tanpa tombol Keluar biasa, galat mentah (:206). | UU PDP, Shopify | Permintaan hapus akun, unggah ulang KTP, kunci nama setelah disetujui | M |
| AGT-039 | 12 Referral | Tidak ada corong referral bagi agen (klik, daftar, DP, lunas); cookie `musafar_ref` pertama menang 30 hari tanpa validasi (`useReferralCapture.tsx:17-23`); kode agen yang belum aktif/suspended tidak diatribusi diam-diam (`04` PASS) tanpa kabar ke agen. | PartnerStack: laporan klik ke konversi | Tampilkan jumlah klik tautan dan pendaftaran per paket | M |

### P3

| ID | Titik | Bukti | Saran | Effort |
|---|---|---|---|---|
| AGT-040 | 17 Kode | ESLint 4 error (`no-explicit-any`: `useAgentAuth.tsx:33,295`, `AgentCommission.tsx:230,231`) dan 1 peringatan (`useAgentAuth.tsx:61`); impor tak terpakai (`AgentLogin.tsx:7` Card, :12 Toaster, :13 logo); pemeriksaan otorisasi ganda (`AgentLayout.tsx:77-91` mengulang `AgentProtectedRoute`); setiap rute mengulang `Suspense`+`AgentProtectedRoute` (`App.tsx:349-470`); dua sistem toast (`use-toast` di `PackageShareModal.tsx:12`/`AgentPackageDetail.tsx` dan `sonner` di halaman lain). | Satukan rute agen di bawah satu `<Route element={<AgentShell/>}>` | S |
| AGT-041 | 12 Komisi | Kartu "Potensi 10 Pax" dan gradien kartu di Dasbor (`AgentDashboard.tsx:68` `from-primary to-primary`, tidak ada gradien nyata) | Hapus hiasan | S |

---

## 4. Shell agen vs admin

### 4.1 Tabel perbedaan (dari kode; tidak diverifikasi di browser)

| Aspek | Admin (`AdminLayout.tsx`) | Agen (`AgentLayout.tsx` + `AgentHeader.tsx`) | Catatan |
|---|---|---|---|
| Lebar sidebar | 16rem terbuka, 3rem rel ikon (`collapsible="icon"`, :194) | 16rem terbuka, ciut = hilang total (offcanvas, default) | DESIGN: 260 |
| Keadaan awal | `defaultOpen={false}` (:182) | Terbuka bila layar >= 1024 (`AgentLayout.tsx:102`) | Keduanya tidak diingat |
| Perilaku ciut | Rel ikon dengan tooltip; pemicu di header sidebar (:202) dan tombol buka (:205-215) | Menu hilang; satu tombol di header halaman, hanya saat ciut (`AgentHeader.tsx:23-31`) | Keluhan pemilik |
| Latar sidebar | `bg-[#FAFAFA]`, `border-slate-200` (:194) | `bg-muted`, `border-border` (:103) | Admin pakai slate mentah |
| Latar halaman | `bg-white`, penuh layar (:193,308) | `bg-muted` dengan kartu `bg-[#F8FAFC]` di dalam bingkai (:100,168) | Dua gaya |
| Bingkai konten | Tanpa sudut, tanpa bingkai | `rounded-3xl`, border, bayangan, margin 8-16px (:167-168) | DESIGN: 2xl untuk bingkai terluar |
| Header | Breadcrumb "Main Menu / ikon halaman" + kolom "Search anything..." (tidak berfungsi: tanpa handler, :322-329), padding `px-6 sm:px-10` | Hanya tombol ciut (saat ciut) dan pil profil (`px-6`), sudut atas `rounded-t-3xl` | Admin Inggris; pencarian dekoratif |
| Judul halaman | Dari menu (ikon + label) | `AgentPageHeader` per halaman (ikon + h1 + aksi) | Admin tanpa judul halaman |
| Item aktif | `bg-white shadow-sm border border-slate-200` (:248) | `bg-card shadow-sm` tanpa border (:124) | DESIGN: kapsul putih terangkat |
| Ukuran ikon/teks item | Ikon 18px, h-8 | Ikon 16px, h-8 | DESIGN: item 40/44 |
| Label bagian | `text-[10px]` huruf kapital Inggris (:233) | Tidak ada pengelompokan | 10px melanggar "tidak ada di bawah 12px" |
| Footer/profil | Avatar emoji + nama + peran `text-[10px]` (:276-291) | Nama + "Level X" teks (:143-150) | Agen tanpa avatar |
| Logout | Ikon saja, `title="Log Out"`, hanya saat sidebar terbuka (:293-301) | Tombol "Keluar" bertulisan di footer (:153-161) | Admin: tidak ada logout saat ciut |
| Notifikasi | Bel `NotificationDropdown` di footer (:269-272) | Tidak ada | AGT-013 |
| Navigasi ke situs publik | "Back to Website" di header sidebar (:219-225) | Tidak ada (logo ke Dasbor) | |
| Bahasa | Campuran: "Back to Website", "Expand Sidebar", "Log Out", "Access Denied", "Loading..." | Campuran: "Agent", "Expand Sidebar", menu Indonesia | Keduanya melanggar prinsip 5 |
| Logo | Mask `logo.webp` (:199) | `musafar-logo-dark.svg` + teks "Agent" (`AgentLayout.tsx:106-107`) | |
| Pembungkus konten | `p-6 sm:p-10` penuh lebar, halaman bebas | `p-4 sm:p-6 md:p-8`, halaman memakai `max-w-4xl/6xl/7xl` sendiri-sendiri | |
| Navigasi ponsel | Laci; header tanpa pemicu (hanya jalan pintas Ctrl/Cmd+B; dari kode, belum dicoba di ponsel) | Laci; pemicu di header (`AgentHeader.tsx:17`), tanpa bar bawah | DESIGN: bar bawah 4 menu untuk agen |
| Ctrl/Cmd+B | Ya (provider bersama) | Ya | |
| Font | Onest lewat body | Sama | Tidak ada perbedaan |

### 4.2 Spesifikasi shell bersama yang direkomendasikan

Satu komponen `AppShell` di `src/components/shell/` (props: `nav` (grup dan item), `brand`, `profile`, `footerExtras`, `mobileBottomNav?`), dipakai `AdminLayout` dan `AgentLayout`.

Disatukan:
- Sidebar 260px terbuka, rel ikon 56px saat ciut (`collapsible="icon"`). Pemicu ciut SELALU ada di header sidebar (ikon `PanelLeft`, `aria-label` "Ciutkan menu"/"Buka menu"), tombol buka di rel saat ciut. Status disimpan di cookie `sidebar:state` dan dibaca saat render pertama; Ctrl/Cmd+B tetap.
- Warna dan bentuk dari token: latar sidebar `--background`, item aktif kapsul putih terangkat (`--card`, bayangan tingkat 1, sudut 8, tanpa border slate), hover `--field-hover`. Tidak ada palet mentah atau hex arbitrer.
- Item 40px (44 sentuh), ikon 18px, teks 14px, label grup 12px/600 huruf kapital (tidak ada 10px).
- Header halaman seragam: kiri judul halaman (dari data rute, juga mengisi `document.title`) dengan breadcrumb opsional; kanan: bantuan, bel notifikasi, menu profil. Pencarian admin hanya muncul bila berfungsi.
- Footer sidebar seragam: avatar (inisial berwarna), nama, peran/level, dan di menu profil: Profil, Bantuan, Keluar (teks "Keluar", bukan hanya ikon, tersedia juga saat ciut lewat menu profil).
- Bingkai konten: latar `--background`, kartu/panel di atasnya; tanpa bingkai `rounded-3xl` yang menyempitkan halaman di ponsel. Lebar isi: penuh untuk admin, maksimum 1200 untuk agen (DESIGN: lebar penuh untuk admin).
- Satu bel notifikasi (komponen yang sama, sumber data berbeda), satu komponen `PageHeader`, `StatCard`, `LoadError`, `EmptyState`.
- 404 dan layar status di dalam shell; satu bahasa Indonesia, satu sapaan.

Boleh berbeda menurut audiens:
- Isi menu dan pengelompokan; admin berbasis peran, agen datar 8-9 item.
- Admin: pencarian global dan jalan pintas keyboard; "Kembali ke situs" hanya di admin.
- Agen: bar bawah ponsel 4 menu (Dasbor, Daftarkan, Jamaah, Komisi) plus "Lainnya"; kartu level dan kode referral di footer sidebar; kontak CS selalu terlihat.
- Kepadatan: admin rapat (baris tabel 48), agen sedikit lebih lega karena dipakai di ponsel.
- Admin default ciut ke rel ikon pada layar sempit; agen default terbuka di desktop.

---

## 5. Hasil tes dan metrik

### 5.1 Suite database (`./scripts/run-db-tests.sh`)

Sebelum: 01 = 92 PASS 3 SKIP, 02 = 27 PASS 2 SKIP, 03 = 30 PASS (total PASS=149 FAIL=0 SKIP=5). Sesudah menambah `tests/db/04_agent_journey.sql`: **PASS=192 FAIL=0 SKIP=5 KNOWN=12, FILE_ERRORS=0, RESULT: OK.**

`04_agent_journey.sql` (43 PASS, 12 KNOWN, 0 FAIL, 0 SKIP) menambah yang belum ada di 01-03:
- Isolasi dua agen: A tidak melihat jamaah/pendaftaran B dan sebaliknya (kedua RPC), tanpa duplikat baris.
- Sapuan semua tabel/view `jamaah*` (7 relasi): agen membaca 0 baris; 8 kolom sensitif (paspor, NIK, jalur KTP/paspor/foto, kedaluwarsa, token manifest, bukti bayar) tidak terbaca; penanda paspor/NIK/KTP/token yang ditanam tidak muncul di keluaran RPC mana pun; satu-satunya fungsi SECURITY DEFINER yang bisa dipanggil authenticated dan membaca tabel jamaah adalah dua RPC agen.
- Referral ujung ke ujung lewat jalur nyata: intake dengan `ref_code` lalu `accept_jamaah_intake` lalu registrasi membawa `agent_id`, DP Rp 5 jt (status `dp`, komisi menunggu, belum dicatat), lunas (komisi tepat 1.500.000 dari nilai live `packages.agent_commission_amount`, saldo +1.500.000), agen A melihat `earned`, agen B tidak melihat apa pun.
- Penarikan: permintaan pending tidak menggeser saldo, permintaan kedua melebihi saldo dikurangi pending ditolak (22023), tolak membawa catatan yang bisa dibaca agen, dibayar memotong saldo.
- Suspended: login Function (`status=active`) tidak menemukan agen, atribusi baru berhenti.
- Pending: tidak bisa menyetujui diri sendiri (42501), tidak melihat agen lain, tidak bisa menarik, update onboarding diterima, KTP ganda ditolak dengan nama constraint.
- `register_agent_profile()`: baris baru pending/bronze/0/saldo 0, referrer dari kode huruf kecil milik agen aktif, satu notifikasi admin, idempoten, tanpa argumen, anon ditolak.
- Komisi: semua 33-34 paket berisi 1.500.000 dan default kolom 1500000.

12 baris KNOWN (celah yang didokumentasikan, tidak menggagalkan suite; ubah jadi assertion setelah diperbaiki): AGT-024 (minimal penarikan hanya di browser), AGT-007 (dua baris: suspended masih membaca jamaah dan menarik), AGT-025 (tidak ada notifikasi admin saat onboarding lengkap), AGT-008 (dua baris: leaderboard dan komisi terbaca akun tanpa agen), AGT-003 (persentase di `agent_levels`), AGT-009 (peringkat dasbor), AGT-022 (foto profil), AGT-014 (tidak ada status ditolak), AGT-023 (alasan penolakan intake), AGT-013 (tidak ada tabel notifikasi agen).

Data live yang dibaca (hanya jumlah): 6 agen aktif (2 punya data KTP/alamat lengkap, 4 belum; 4 dari 6 adalah akun staf), 4 pending (0 lengkap), 8 dari 10 agen bernomor telepon placeholder `000...`, 34 paket semuanya Rp 1.500.000, bucket `agent-documents` privat, `agent_sales` tanpa baris `pending`.

### 5.2 Statis
- `npx tsc --noEmit -p tsconfig.app.json`: lulus (exit 0).
- `npx eslint src/pages/agent src/components/agent src/hooks/useAgentAuth.tsx`: 4 error, 1 peringatan (`no-explicit-any` di `useAgentAuth.tsx:33,295` dan `AgentCommission.tsx:230,231`; `react-refresh/only-export-components` di `useAgentAuth.tsx:61`).

### 5.3 Metrik kode (`src/pages/agent`, `src/components/agent`)
| Metrik | Hasil |
|---|---|
| Teks Inggris yang tampil ke agen | sekitar 40 baris (daftar di AGT-029) |
| Kelas palet mentah (`bg-slate-400`, dst.) | 7 baris di 4 file, plus 4 baris di `src/lib/agentLevels.ts`; 1 hex arbitrer (`AgentLayout.tsx:168`) |
| Teks di bawah 12px di portal agen | 0 (admin: `AdminLayout.tsx:233,287`, `AdminHeader.tsx:32,327`) |
| Tombol ikon tanpa nama aksesibel | 13 tombol + tombol hari kalender (daftar di AGT-032) |
| `window.confirm/alert/prompt` | 0 |
| `<img>` tanpa `alt` | 0 |
| `<table>`/`<Table>` | 4 (3 di `AgentCommission.tsx`, 1 di `AgentMarketingKit.tsx`), semua dengan gulir mendatar |
| Emoji sebagai ikon UI | 3 (`AgentProtectedRoute.tsx:77`, `AgentPackages.tsx:337,351`); emoji di templat WhatsApp adalah isi pesan, bukan ikon |
| Halaman dengan state galat dan coba lagi (`LoadError`) | 2 dari 15 |
| Item sidebar tinggi 32px | semua (target DESIGN 40/44) |
| Sapaan | "Anda" 29 baris, "kamu" 15 baris |

---

## 6. Yang sudah baik

- Database aman dan teruji: privasi paspor/NIK/token, isolasi antaragen, trigger yang mengunci status/level/saldo, bucket KTP privat dengan policy per folder, RPC komisi idempoten dan bisa dibatalkan saat pembayaran ditolak.
- `register_agent_profile()` tanpa argumen, idempoten, referrer hanya dari agen aktif, tidak pernah gagal karena nomor telepon bentrok.
- Pendaftaran jamaah oleh agen memakai form dan validasi server yang sama dengan publik; agen diambil dari login, bukan dari permintaan; kode MSF terbit dan statusnya terlacak.
- Dasbor memuat "perlu ditindaklanjuti" dengan sisa tagihan, batas lunas, dan tombol WhatsApp pengingat; Jamaah Saya menampilkan bayar terverifikasi vs menunggu verifikasi dan komisi menunggu/masuk dengan bahasa jelas.
- Alur lupa password agen benar (`/set-password?next=/agent/login`) dan tidak membocorkan email terdaftar; pesan galat auth dalam Bahasa Indonesia dipusatkan di `authErrors.ts`.
- Komisi tetap Rp 1.500.000 terbaca dari `packages`, tampil per paket, dan konsisten dengan aturan bisnis.
- Panduan Penjualan memuat aturan DP, cicilan, H-30, paspor 12 bulan dengan benar dan menandai hal yang belum pasti.
