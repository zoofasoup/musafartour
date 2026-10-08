# Tes regresi database
Tes SQL untuk aturan keamanan database (`01_security.sql`), portal agen (`02_agent_portal.sql`) dan alur
pendaftaran jamaah beserta komisi agen (`03_registration.sql`), dan fungsi Cek status pendaftaran beserta batas percobaannya (`06_intake_status.sql`).

**Lead agen** (`08_agent_leads.sql`) menguji migrasi `20261006180000_agent_leads.sql`: perlindungan 30 hari, isolasi antaragen, dan tautan ke pendaftaran.

**Komisi per level** (`09_commission_rates.sql`) menguji migrasi `20261007100000_commission_rates.sql`: tarif per keberangkatan, kelas dan level agen, fallback ke komisi flat, dan alur lunas sampai komisi tercatat.

**Level dan gerbang biaya** (`12_levels_fee_gate.sql`) menguji migrasi `20261008100000_levels_silver_start.sql`: level hanya Silver/Gold/Platinum (agen baru mulai Silver, tanpa 'duta'), dan agen aktif dengan biaya registrasi belum diterima tidak bisa mencatat lead atau mendaftarkan jamaah.

**Siklus komisi** (`13_commission_lifecycle.sql`) menguji migrasi `20261008105000_role_finance.sql`, `20261008110000_commission_lifecycle.sql` dan `20261008111000_commission_proofs_storage.sql`: PENDING, ELIGIBLE, APPROVED, PAID, dua persetujuan dari dua pengguna berbeda, PPh 5%, NIK, bukti transfer, clawback, hitung ulang saat pindah paket, penahanan sengketa lead dan agen suspended. Peran `finance` tidak bisa dipakai di transaksi yang sama dengan `ALTER TYPE ... ADD VALUE`, jadi file ini mengganti SATU fungsi pembantu (`commission_is_finance`) dengan stub yang menganggap `agent_admin` sebagai finance, dan menandainya `KNOWN`. Setelah migrasi di-push, jalankan ulang: bagian pertama menguji peran `finance` yang asli.

**Menjalankan** (dari folder mana pun): `./scripts/run-db-tests.sh`, atau satu file: `./scripts/run-db-tests.sh tests/db/03_registration.sql`

**Aman.** Tes berjalan di database live yang di-link, tetapi di dalam transaksi yang selalu dibatalkan di akhir
(`RAISE EXCEPTION 'RESULTS'`). Tidak ada data tersimpan; laporan dibawa oleh pesan error itu.

**Kapan:** sebelum `supabase db push` dan sebelum deploy. Skrip keluar dengan kode 1 bila ada `FAIL` atau ada file tes
yang error tanpa laporan.

**Menambah tes:** tambah blok `BEGIN ... EXCEPTION WHEN OTHERS ... END;` di salah satu file, atau buat `NN_nama.sql` baru
dengan pola yang sama. Simulasikan pengguna dengan `set_config('request.jwt.claims', ...)` + `SET LOCAL ROLE`, tutup dengan
`RESET ROLE`. Untuk "harus ditolak": raise `XX001` bila perintah ternyata berhasil, lalu cek `SQLSTATE` di handler.
Setiap baris laporan diawali `PASS`, `FAIL`, `SKIP`, atau `KNOWN`.

**Arti status:** `PASS` sesuai harapan. `FAIL` bug di tes atau cacat nyata: perbaiki sumbernya, jangan lemahkan tesnya.
`SKIP` data prasyarat tidak ada (mis. belum ada agen aktif), tes dilewati. `KNOWN` celah yang sudah diketahui dan belum
diperbaiki; suite tetap hijau, ubah jadi assertion biasa setelah diperbaiki.

**Migrasi yang belum di-push.** Daftarkan di `tests/db/pending-migrations.txt` (satu path per baris). `run-db-tests.sh`
menjalankannya di dalam transaksi tiap tes (tepat setelah `BEGIN;` pertama), jadi tes bisa memeriksa migrasi itu sebelum
`supabase db push`. Kosongkan daftar setelah push. `06_agent_misc.sql` menguji `set_agent_referrer` dan `get_agent_leaderboard`
(migrasi `20261006170000_agent_misc.sql`).
