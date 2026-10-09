# WhatsApp bot (ubah hotel dari grup)

Tag bot di grup WhatsApp → bot baca chat terakhir → usulkan perubahan hotel → pengguna terdaftar balas **OK** → `packages` diperbarui. Perubahan otomatis tercatat di `package_change_log` (alasan: "WhatsApp bot: ...").

Biaya: Evolution API gratis (self-host, VPS ±$4–6/bln atau free tier), Supabase & Haiku hampir nol (±$0.001 per tag).
Risiko: Evolution API tidak resmi → **pakai nomor khusus bot**, bukan nomor utama. Nomor bisa diblokir WhatsApp.

## 1. Jalankan Evolution API
Ikuti docs resmi Evolution API v2 (docker compose + Postgres + Redis). Buat 1 instance, scan QR dengan nomor bot, lalu atur webhook instance:

- URL: `https://<project>.supabase.co/functions/v1/whatsapp-bot?secret=<WHATSAPP_BOT_SECRET>`
- Event: hanya `MESSAGES_UPSERT`

Masukkan nomor bot ke grup WhatsApp.

## 2. Secrets Supabase
```
supabase secrets set WHATSAPP_BOT_SECRET=<random panjang> \
  ANTHROPIC_API_KEY=... \
  EVOLUTION_API_URL=https://evo.example.com EVOLUTION_API_KEY=... EVOLUTION_INSTANCE=<nama instance> \
  BOT_NUMBER=628123456789
supabase db push
supabase functions deploy whatsapp-bot --no-verify-jwt
```

## 3. Hubungkan grup ke paket
Dapatkan JID grup (`...@g.us`) dari payload webhook / `GET /group/fetchAllGroups/<instance>?getParticipants=false` di Evolution. Lalu di SQL editor:

```sql
INSERT INTO whatsapp_bot_groups (group_jid, package_id, allowed_senders)
VALUES ('120363012345678901@g.us', '<package uuid>', ARRAY['628111111111','628222222222']);
```

Hanya nomor di `allowed_senders` yang bisa meminta dan mengonfirmasi perubahan.

## Cara pakai di grup
1. Tim diskusi: "ganti hotel Makkah dari A ke B".
2. Setelah fix: `@bot tolong update`.
3. Bot membalas ringkasan perubahan. Balas **OK** (atau **batal**). Usulan hangus setelah 30 menit.

## Batasan v1
- Hanya ganti nama (dan bintang jika disebut) hotel Makkah/Madinah per tipe paket. Jarak & durasi jalan kaki tidak ikut berubah.
- Satu usulan aktif per grup; tag baru menggantikan usulan lama.
- Undo: lihat nilai lama di `package_change_log`, atau edit di admin.
- Jika pengirim di grup muncul sebagai LID (bukan nomor), tambahkan angka LID itu ke `allowed_senders` atau cek field `participantAlt` di payload.
