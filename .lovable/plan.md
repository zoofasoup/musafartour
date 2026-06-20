## Umroh Financial Planner — Revisi

### 1. Rename & Repositioning
- Ganti semua "LEAD MAGNET" → "UMROH FINANCIAL PLANNER" di `UmrohCalculator.tsx` & `UmrohCalculatorResult.tsx`.
- Subjudul tetap: perencana finansial umroh.

### 2. Database — extend `umroh_calculator_leads`
Tambah kolom:
- `mode` (text, "A"|"B")
- `target_timeframe_months` (int, nullable — Mode B)
- `selected_package` (text)
- `calculated_monthly_target` (numeric, nullable — Mode B)
- `calculated_daily_target` (numeric)
- `status` (text default 'NEW': NEW/CONTACTED/QUALIFIED/CLOSED)
- `utm_source`, `utm_medium`, `utm_campaign`, `fbclid`, `ctwa_clid` (text nullable)

RLS sudah ada (public insert, single-id select). Tambah policy admin SELECT/UPDATE semua row (via `has_role(auth.uid(), 'admin')`).

### 3. Konfigurasi global (`src/lib/calcConfig.ts` baru)
- `USD_KURS = 18000` (1 tempat)
- Mapping "setara apa" per range harian (7 tier)
- Footnote string asumsi harga

### 4. Mode B — Goal-Based
File baru `src/lib/umrohCalc.ts` (extend) — fungsi `monthlyTargetForGoal(price, pilgrims, months, existing)`:
- `total = price*pilgrims − existing`
- `effectiveMonths = max(1, months − 1.3)` (pelunasan 40 hari sebelum berangkat)
- `monthly = total / effectiveMonths`
- `daily = monthly/30`, `weekly = monthly/4.33`

### 5. Landing flow
Di `UmrohCalculator.tsx`, setelah Hero "Mulai Hitung" → step **MODE PICKER** (2 kartu besar):
- **Forward** (sudah ada flow)
- **Goal-Based** (BARU): step input target bulan (chips 6/12/18/24/36 + slider 3–60) → pilih paket (4 kartu tier) → jumlah jamaah → tabungan awal → reveal.

### 6. Slide hasil baru (untuk Mode A & B)
Tambah/perkaya:
1. Target harian + setara apa (update mapping)
2. Tanggal keberangkatan per paket (Mode A) / Tanggal target (Mode B)
3. **Timeline progress** — bar dengan milestone 25/50/75/100%
4. **Lock harga hari ini** — pesan jujur tentang kenaikan harga
5. **Nabung sendiri vs Musafar** — komparasi singkat
6. **Kartu Share 9:16** — render div CSS, tombol "Download" via `html2canvas` + `file-saver`. Berisi nama, target, tanggal, logo Musafar.
7. CTA WhatsApp form (existing)
8. Slide penutup spiritual

Footnote `USD_KURS` di setiap slide hasil & kartu paket.

### 7. Lead capture + tracking
- Form WA: simpan dengan `mode`, `selected_package`, `calculated_*`, dan UTM/fbclid/ctwa_clid (parse dari `window.location.search` saat mount, simpan ke state).
- Fire Meta Pixel `Lead` event dengan `event_id` UUID. Simpan event_id ke field result JSON untuk dedup CAPI nanti.

### 8. Admin Dashboard — `/admin/calculator-leads`
Route baru di `AdminLayout`. Tabel:
- Kolom: tanggal masuk, nama, no WA, mode, paket, target (date/monthly), status, actions
- Sort default: terbaru di atas
- Filter: range tanggal, paket, status, search nama/WA
- Klik baris → drawer detail (semua data + result_url)
- Tombol per row: "Kirim hasil via WA" (wa.me dengan pesan prefilled + result_url), update status (dropdown), copy result link
- Export CSV (client-side)
- Panel analitik atas: total leads, leads hari ini, paket terpopuler, rata-rata nabung/bln, distribusi mode A/B

### 9. Yang DI-SKIP (per keputusan user)
- Notifikasi otomatis ke Umroh Consultant (tabel UC, round-robin, webhook UC, kolom `assigned_uc` / `uc_notified_at`) — TIDAK dibangun.
- Webhook customer otomatis (Make.com) — tidak prioritas, cukup tombol manual wa.me di admin.
- CAPI server-side — siapkan `event_id` saja, kirim CAPI lewat webhook nanti (out of scope).

### 10. File yang disentuh
- Migration baru: extend `umroh_calculator_leads` + admin SELECT/UPDATE policy
- Baru: `src/lib/calcConfig.ts`, `src/pages/UmrohCalculatorB.tsx` (atau merge ke `UmrohCalculator.tsx`), `src/pages/admin/CalculatorLeads.tsx`, `src/components/calculator/ShareCard.tsx`
- Edit: `src/lib/umrohCalc.ts`, `src/pages/UmrohCalculator.tsx`, `src/pages/UmrohCalculatorResult.tsx`, `src/App.tsx`, `src/components/admin/AdminLayout.tsx` (nav item)
- Dependencies: `html2canvas`, `file-saver` (+types)

### Konfirmasi
- Harga paket: pakai data DB existing (`useCalculatorTiers`) — tidak hardcode angka brief karena DB sudah jadi sumber kebenaran. OK?
- Mode B disubmit menyimpan `target_timeframe_months` & `calculated_monthly_target`; Mode A tetap simpan `calculated_departure_date`.
