# Template email Supabase

Tempel isi tiap file HTML di Supabase, Authentication, Emails (Templates), lalu isi Subject sesuai tabel.

| Template Supabase | File | Subject |
|---|---|---|
| Confirm signup | `1-confirm-signup.html` | Konfirmasi emailmu untuk jadi Agen Musafar |
| Reset password | `2-reset-password.html` | Atur ulang password Musafar Tour |
| Invite user | `3-invite.html` | Kamu diundang bergabung di tim Musafar Tour |

Logo diambil dari `https://musafartour.com/email/logo-cream.png` (ada di `public/email/`, aktif setelah deploy production).
Variabel yang dipakai: `{{ .ConfirmationURL }}`, `{{ .Email }}`. Gaya: tabel dan CSS inline, tanpa font eksternal, supaya aman di Gmail dan Outlook.

Tambahan (Authentication, Emails, bagian Security, hidupkan tombolnya): `4-password-changed.html`, Password changed, subject: Passwordmu sudah diubah. Variabel: `{{ .Email }}`, `{{ .SiteURL }}`. Tombol WhatsApp ke PIC Agen; ganti nomor kalau perlu.
