# Tes regresi database
Tes SQL untuk aturan keamanan database (`01_security.sql`), portal agen (`02_agent_portal.sql`) dan alur
pendaftaran jamaah beserta komisi agen (`03_registration.sql`).

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
