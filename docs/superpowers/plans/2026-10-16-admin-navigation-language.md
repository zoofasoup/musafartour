# Admin Navigasi dan Bahasa (Tahap A dan B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tugas harian admin (pendaftaran masuk, pembayaran, agen, komisi) terjangkau dalam satu ketukan dari menu dan beranda tiap peran, dan semua teks admin berbahasa Indonesia yang seragam.

**Architecture:** Menu, beranda peran, dan isi kartu antrean dijadikan modul murni (tanpa React) yang bisa dites dengan vitest. Komponen hanya membaca modul itu. Bahasa dijaga satu tes yang memindai file halaman admin untuk kata Inggris terlarang, jadi kemunduran tertangkap di `npm test`.

**Tech Stack:** React 18, TypeScript, Vite 5, vitest 2 (lingkungan `node`, hanya `src/**/*.test.ts` dan `tests/**/*.test.ts`), lucide-react.

## Global Constraints

- Bahasa UI: Indonesia sederhana, teks singkat, tanpa titik di judul (preferensi pengguna).
- Pengecekan tipe: `npx tsc --noEmit -p tsconfig.app.json` (tsc di root tidak memeriksa apa pun). Build: `npx vite build`. Tes: `npm test`.
- Tidak commit, push, atau deploy produksi tanpa izin pengguna. Pratinjau Cloudflare (`--branch admin-wave-N`) boleh.
- Target sentuh minimal 44px, warna lewat token `pkg-*`, tanpa warna palet mentah di kode baru.
- Rute `/admin/jamaah/*` sudah diizinkan oleh penjaga rute lewat awalan `/admin/jamaah`; jangan melonggarkan penjaga.
- Temuan koreksi dari evaluasi: lencana angka di sidebar SUDAH ada (`menuBadgeFor` di `src/hooks/useAdminWorkCounts.ts`) untuk `/admin/jamaah`, `/admin/jamaah/pembayaran`, `/admin/pembayaran-komisi`, `/admin/agents`. Yang kurang adalah menu "Pendaftaran Masuk" sendiri dan isi kartu antrean.

## File Structure

- Modify `src/components/admin/adminMenu.ts`: urutan grup, item baru Pendaftaran Masuk, label Indonesia, beranda peran.
- Create `src/components/admin/adminMenu.test.ts`: tes menu dan beranda peran.
- Modify `src/hooks/useAdminWorkCounts.ts`: `menuBadgeFor` untuk path baru.
- Modify `src/components/admin/AdminLayout.tsx`: `BADGE_LABEL`, `alsoActive`.
- Create `src/lib/workQueue.ts` dan `src/lib/workQueue.test.ts`: isi kartu antrean (label, petunjuk langkah berikutnya).
- Modify `src/components/admin/WorkQueueCards.tsx`: memakai `buildWorkQueue`.
- Create `src/lib/adminLanguage.test.ts`: penjaga kata Inggris.
- Modify judul dan teks di halaman yang disebut Task 5.

---

### Task 1: Menu "Pendaftaran Masuk" dan urutan grup

**Files:**
- Modify: `src/components/admin/adminMenu.ts` (grup "Jamaah & Keuangan", sekitar baris 30-40)
- Modify: `src/hooks/useAdminWorkCounts.ts` (fungsi `menuBadgeFor`)
- Modify: `src/components/admin/AdminLayout.tsx` (`BADGE_LABEL` baris 31-36, `alsoActive` baris 124)
- Test: `src/components/admin/adminMenu.test.ts`

**Interfaces:**
- Consumes: `ADMIN_MENU_SECTIONS`, `getMenuSectionsForRole(role)`, `menuBadgeFor(path, counts)` yang sudah ada.
- Produces: item menu `{ label: "Pendaftaran Masuk", path: "/admin/jamaah/masuk" }`; `menuBadgeFor("/admin/jamaah/masuk", c)` mengembalikan `c.intakes_new ?? 0` dan `menuBadgeFor("/admin/jamaah", c)` mengembalikan 0.

- [ ] **Step 1: Tulis tes yang gagal**

```ts
// src/components/admin/adminMenu.test.ts
import { describe, expect, it } from "vitest";
import { getMenuSectionsForRole } from "./adminMenu";
import { menuBadgeFor } from "@/hooks/useAdminWorkCounts";
import { findActiveItem } from "@/components/shell/navMatch";
import type { ShellNavGroup } from "@/components/shell/types";

const paths = (role: string) => getMenuSectionsForRole(role).flatMap((s) => s.items.map((i) => i.path));

describe("menu Pendaftaran Masuk", () => {
  it("ada untuk CS dan owner, tidak untuk finance", () => {
    expect(paths("cs_admin")).toContain("/admin/jamaah/masuk");
    expect(paths("admin")).toContain("/admin/jamaah/masuk");
    expect(paths("finance")).not.toContain("/admin/jamaah/masuk");
  });

  it("tampil tepat sebelum Data Jamaah", () => {
    const list = paths("cs_admin");
    expect(list.indexOf("/admin/jamaah/masuk")).toBe(list.indexOf("/admin/jamaah") - 1);
  });

  it("lencana pendaftaran pindah ke menu barunya", () => {
    const counts = { intakes_new: 4 };
    expect(menuBadgeFor("/admin/jamaah/masuk", counts)).toBe(4);
    expect(menuBadgeFor("/admin/jamaah", counts)).toBe(0);
  });

  it("rute /admin/jamaah/masuk menyorot menu barunya, bukan Data Jamaah", () => {
    const groups: ShellNavGroup[] = [
      {
        label: "x",
        items: [
          { title: "Pendaftaran Masuk", url: "/admin/jamaah/masuk", icon: (() => null) as never },
          { title: "Data Jamaah", url: "/admin/jamaah", icon: (() => null) as never, alsoActive: ["/admin/jamaah/semua"] },
        ],
      },
    ];
    expect(findActiveItem(groups, "/admin/jamaah/masuk")?.title).toBe("Pendaftaran Masuk");
    expect(findActiveItem(groups, "/admin/jamaah/semua")?.title).toBe("Data Jamaah");
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/components/admin/adminMenu.test.ts`
Expected: FAIL (`toContain("/admin/jamaah/masuk")` gagal; badge `/admin/jamaah` masih 4).

- [ ] **Step 3: Implementasi minimal**

Di `adminMenu.ts`, tambahkan `Inbox` ke impor lucide-react dan sisipkan item sebelum Data Jamaah:

```ts
      { icon: Inbox, label: "Pendaftaran Masuk", path: "/admin/jamaah/masuk", roles: ["admin", "superadmin", "cs_admin"] },
      { icon: CalendarCheck, label: "Data Jamaah", path: "/admin/jamaah", roles: ["admin", "superadmin", "cs_admin"] },
```

Di `useAdminWorkCounts.ts`, ganti dua baris pertama `switch`:

```ts
    case "/admin/jamaah/masuk": return c.intakes_new ?? 0;
```

dan hapus baris `case "/admin/jamaah": return c.intakes_new ?? 0;`.

Di `AdminLayout.tsx`:

```ts
const BADGE_LABEL: Record<string, string> = {
  "/admin/jamaah/masuk": "pendaftaran baru menunggu",
  "/admin/jamaah/pembayaran": "pembayaran menunggu verifikasi",
  "/admin/pembayaran-komisi": "komisi menunggu persetujuan",
  "/admin/agents": "agen menunggu persetujuan",
};
```

dan `alsoActive: item.path === "/admin/jamaah" ? ["/admin/jamaah/semua"] : undefined,`

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `npx vitest run src/components/admin/adminMenu.test.ts && npx tsc --noEmit -p tsconfig.app.json`
Expected: PASS, tsc tanpa keluaran.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/adminMenu.ts src/components/admin/adminMenu.test.ts src/hooks/useAdminWorkCounts.ts src/components/admin/AdminLayout.tsx
git commit -m "feat(admin): Pendaftaran Masuk jadi menu sendiri dengan lencana"
```

---

### Task 2: Beranda per peran

**Files:**
- Modify: `src/components/admin/adminMenu.ts` (`HOME_OVERRIDE`, sekitar baris 100-106)
- Test: `src/components/admin/adminMenu.test.ts` (tambah blok)

**Interfaces:**
- Consumes: `getAdminHomePath(role)` yang sudah ada.
- Produces: `getAdminHomePath("cs_admin") === "/admin/jamaah/masuk"`, `"agent_admin" → "/admin/agents"`, `"content_admin" → "/admin/articles"`, `"advertiser" → "/admin/analytics"`; `finance` tetap `/admin/pembayaran-komisi`; owner tetap `null`.

- [ ] **Step 1: Tulis tes yang gagal**

```ts
import { getAdminHomePath } from "./adminMenu";

describe("beranda per peran", () => {
  it.each([
    ["cs_admin", "/admin/jamaah/masuk"],
    ["agent_admin", "/admin/agents"],
    ["content_admin", "/admin/articles"],
    ["advertiser", "/admin/analytics"],
    ["finance", "/admin/pembayaran-komisi"],
    ["product_admin", "/admin/packages"],
  ])("%s mendarat di %s", (role, path) => {
    expect(getAdminHomePath(role)).toBe(path);
  });

  it("owner tetap di Dashboard", () => {
    expect(getAdminHomePath("admin")).toBeNull();
    expect(getAdminHomePath("superadmin")).toBeNull();
  });

  it("setiap beranda ada di menu peran itu", () => {
    for (const role of ["cs_admin", "agent_admin", "content_admin", "advertiser", "finance", "product_admin"]) {
      expect(paths(role)).toContain(getAdminHomePath(role));
    }
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/components/admin/adminMenu.test.ts`
Expected: FAIL untuk `cs_admin` (mendarat di `/admin/jamaah/masuk`? tergantung urutan; dan `content_admin`, `advertiser` bukan yang diharapkan).

- [ ] **Step 3: Implementasi minimal**

```ts
const HOME_OVERRIDE: Record<string, string> = {
  product_admin: "/admin/packages",
  product_contributor: "/admin/packages",
  finance: "/admin/pembayaran-komisi",
  cs_admin: "/admin/jamaah/masuk",
  agent_admin: "/admin/agents",
  content_admin: "/admin/articles",
  advertiser: "/admin/analytics",
};
```

Periksa bahwa `/admin/articles` memang ada di menu `content_admin`; jika tes terakhir gagal, sesuaikan nilai ke item pertama menu peran itu, jangan ke rute di luar menu.

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `npx vitest run src/components/admin/adminMenu.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/adminMenu.ts src/components/admin/adminMenu.test.ts
git commit -m "feat(admin): beranda tiap peran mengarah ke tugas utamanya"
```

---

### Task 3: Kartu antrean menyebut langkah berikutnya

**Files:**
- Create: `src/lib/workQueue.ts`
- Create: `src/lib/workQueue.test.ts`
- Modify: `src/components/admin/WorkQueueCards.tsx` (blok `cards` dan render, baris 40-90)

**Interfaces:**
- Consumes: `AdminWorkCounts` dari `@/hooks/useAdminWorkCounts`; `rupiah(n)` dari `@/lib/jamaah` (format "Rp 16.750.000").
- Produces: `buildWorkQueue(c: AdminWorkCounts): QueueItem[]` dengan `QueueItem = { key: string; label: string; value: number; hint?: string; to: string; urgent: boolean }`. Item dengan `value === 0` tetap dikembalikan (UI memutuskan tampil) tetapi diurutkan setelah item bernilai >0 yang `urgent`.

- [ ] **Step 1: Tulis tes yang gagal**

```ts
// src/lib/workQueue.test.ts
import { describe, expect, it } from "vitest";
import { buildWorkQueue } from "./workQueue";

describe("buildWorkQueue", () => {
  it("menyebut langkah dan nominal pada pembayaran menunggu", () => {
    const q = buildWorkQueue({ payments_pending: { count: 3, amount: 16750000 } });
    const item = q.find((x) => x.key === "payments")!;
    expect(item.label).toBe("Verifikasi pembayaran");
    expect(item.hint).toBe("3 menunggu, Rp 16.750.000");
    expect(item.to).toBe("/admin/jamaah/pembayaran");
  });

  it("antrean yang punya pekerjaan dan mendesak tampil lebih dulu", () => {
    const q = buildWorkQueue({ belum_dp: 44, agents_pending: 5, intakes_new: 0 });
    expect(q[0].key).toBe("agen");
    expect(q.findIndex((x) => x.key === "intakes")).toBeGreaterThan(q.findIndex((x) => x.key === "belumdp"));
  });

  it("jatuh tempo menyebut yang sudah lewat", () => {
    const q = buildWorkQueue({ lunas_due: { count: 12, amount: 2786100000 }, lunas_overdue: 93 });
    expect(q.find((x) => x.key === "lunas")!.hint).toContain("93 sudah lewat");
  });

  it("tanpa data tidak melempar galat", () => {
    expect(() => buildWorkQueue({})).not.toThrow();
    expect(buildWorkQueue({}).every((x) => x.value === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/workQueue.test.ts`
Expected: FAIL (modul tidak ada).

- [ ] **Step 3: Implementasi minimal**

```ts
// src/lib/workQueue.ts
import type { AdminWorkCounts } from "@/hooks/useAdminWorkCounts";
import { rupiah } from "@/lib/jamaah";

export interface QueueItem {
  key: string;
  label: string;
  value: number;
  hint?: string;
  to: string;
  urgent: boolean;
}

/** Antrean pekerjaan owner. Tiap item menyebut langkahnya; yang mendesak dan berisi tampil lebih dulu, urutan awal dijaga untuk selebihnya. */
export function buildWorkQueue(c: AdminWorkCounts): QueueItem[] {
  const pay = c.payments_pending;
  const due = c.lunas_due;
  const items: QueueItem[] = [
    { key: "payments", label: "Verifikasi pembayaran", value: pay?.count ?? 0, hint: pay?.count ? `${pay.count} menunggu, ${rupiah(pay.amount)}` : undefined, to: "/admin/jamaah/pembayaran", urgent: true },
    { key: "intakes", label: "Terima pendaftaran baru", value: c.intakes_new ?? 0, to: "/admin/jamaah/masuk", urgent: true },
    { key: "belumdp", label: "Jamaah belum DP", value: c.belum_dp ?? 0, hint: "Keberangkatan yang akan datang", to: "/admin/jamaah", urgent: false },
    {
      key: "lunas",
      label: "Ingatkan pelunasan",
      value: due?.count ?? 0,
      hint: [due?.count ? `Sisa ${rupiah(due.amount)}` : "", c.lunas_overdue ? `${c.lunas_overdue} sudah lewat` : ""].filter(Boolean).join(", ") || undefined,
      to: "/admin/jamaah/keuangan",
      urgent: true,
    },
    { key: "komisi", label: "Setujui komisi", value: c.commission_eligible ?? 0, hint: `${c.commission_approved ?? 0} sudah disetujui, layak dibayar`, to: "/admin/pembayaran-komisi", urgent: true },
    { key: "agen", label: "Setujui agen baru", value: c.agents_pending ?? 0, to: "/admin/agents", urgent: true },
    { key: "sengketa", label: "Putuskan sengketa lead", value: c.disputes_open ?? 0, hint: "Komisinya ditahan sampai diputuskan", to: "/admin/agent-leads", urgent: true },
    { key: "seat", label: "Seat hampir penuh", value: c.seats_low ?? 0, hint: "Sisa 3 seat atau kurang", to: "/admin/jadwal", urgent: false },
  ];
  const rank = (x: QueueItem) => (x.urgent && x.value > 0 ? 0 : x.value > 0 ? 1 : 2);
  return items.map((x, i) => ({ x, i })).sort((a, b) => rank(a.x) - rank(b.x) || a.i - b.i).map(({ x }) => x);
}
```

Catatan untuk tes kedua: `agents_pending: 5` mendesak dan berisi, sedangkan `belum_dp: 44` tidak mendesak, jadi `agen` harus urutan pertama. Tes ketiga memakai `to: "/admin/jamaah/keuangan"` untuk pelunasan; tidak diuji, tetapi rute itu ada di `App.tsx`.

Di `WorkQueueCards.tsx`, hapus array `cards` lokal, impor `buildWorkQueue`, dan petakan ikon berdasarkan `key`:

```ts
const ICONS: Record<string, LucideIcon> = { payments: Wallet, intakes: Inbox, belumdp: AlertCircle, lunas: CalendarClock, komisi: Banknote, agen: UserCheck, sengketa: Gavel, seat: Users };
const cards = buildWorkQueue(data).map((c) => ({ ...c, icon: ICONS[c.key] }));
```

Render tetap memakai `c.label`, `c.hint`, `c.value`, `c.to`, `c.icon`, `c.urgent`.

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `npx vitest run src/lib/workQueue.test.ts && npx tsc --noEmit -p tsconfig.app.json`
Expected: PASS, tsc bersih.

- [ ] **Step 5: Commit**

```bash
git add src/lib/workQueue.ts src/lib/workQueue.test.ts src/components/admin/WorkQueueCards.tsx
git commit -m "feat(admin): kartu antrean menyebut langkah berikutnya dan urut menurut mendesak"
```

---

### Task 4: Penjaga bahasa (tes gagal dulu)

**Files:**
- Create: `src/lib/adminLanguage.test.ts`

**Interfaces:**
- Consumes: sistem berkas lewat `node:fs`; tidak ada impor dari aplikasi.
- Produces: tes `admin tidak memuat kata Inggris terlarang` yang memindai teks tampilan (judul halaman, label menu, teks JSX, isi atribut `title`/`placeholder`/`label`), bukan nama variabel.

- [ ] **Step 1: Tulis tes yang gagal**

```ts
// src/lib/adminLanguage.test.ts
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const files = [
  ...readdirSync(join(ROOT, "pages/admin")).filter((f) => f.endsWith(".tsx")).map((f) => join(ROOT, "pages/admin", f)),
  join(ROOT, "components/admin/adminMenu.ts"),
];

/** Kata Inggris yang harus Indonesia di teks tampilan. Dicocokkan utuh, tanpa membedakan huruf besar. */
const BANNED = [
  "Add", "Edit", "Delete", "Save", "Cancel", "Submit", "Loading", "Confirmed", "Pending", "Cancelled",
  "Occupancy", "Challenge", "Challenges", "Leaderboard", "Analytics", "Inbox", "Rotation", "Generator",
  "Optimizer", "Development", "Calculator", "Leads", "Marketing", "Settings", "Dashboard",
];
/** Istilah yang sah tetap dipakai apa adanya (nama produk atau kata baku). */
const ALLOWED_LINES = [/Google Analytics/, /WhatsApp/, /Meta/, /TikTok/];

/** Teks tampilan: isi antar tag JSX, dan nilai atribut title, label, placeholder, description, intro. */
function displayStrings(src: string): { text: string; line: number }[] {
  const out: { text: string; line: number }[] = [];
  src.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (line.startsWith("//") || line.startsWith("*") || line.startsWith("import ")) return;
    for (const m of line.matchAll(/(?:title|label|placeholder|description|intro|aria-label)=\{?"([^"]+)"/g)) out.push({ text: m[1], line: i + 1 });
    for (const m of line.matchAll(/(?:title|label):\s*"([^"]+)"/g)) out.push({ text: m[1], line: i + 1 });
    for (const m of line.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) out.push({ text: m[1], line: i + 1 });
  });
  return out;
}

describe("bahasa admin", () => {
  it("tidak memuat kata Inggris terlarang di teks tampilan", () => {
    const hits: string[] = [];
    for (const file of files) {
      for (const { text, line } of displayStrings(readFileSync(file, "utf8"))) {
        if (ALLOWED_LINES.some((r) => r.test(text))) continue;
        for (const word of BANNED) {
          if (new RegExp(`\\b${word}\\b`, "i").test(text)) hits.push(`${file.replace(ROOT, "src")}:${line} "${text.trim()}" memuat ${word}`);
        }
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal dan catat daftar temuan**

Run: `npx vitest run src/lib/adminLanguage.test.ts`
Expected: FAIL; daftar mencakup antara lain `Product Development`, `Calculator Leads`, `Flyer Generator`, `WhatsApp Inbox`, `WhatsApp Rotation`, `Booth Optimizer`, `Pengaturan Marketing`, `Add Challenge`, `Confirmed`, `Pending`, `Cancelled`, dan label menu di `adminMenu.ts` yang masih Inggris. Salin daftar itu ke catatan Task 5.

- [ ] **Step 3: Commit tes (masih merah, disengaja)**

Tes merah tidak boleh dikomit sendirian. Jangan commit di langkah ini; komit bersama Task 5 setelah hijau.

---

### Task 5: Ganti teks Inggris ke Indonesia

**Files (ubah teks tampilan saja, bukan nama variabel, nilai enum, atau kolom database):**
- Modify: `src/components/admin/adminMenu.ts` (label menu)
- Modify: `src/pages/admin/ProductDevelopment.tsx:72`, `CalculatorLeads.tsx:177`, `FlyerGenerator.tsx:91`, `WhatsAppInbox.tsx:130`, `ChatRotation.tsx:271`, `SalesCalculator.tsx:387`, `MarketingSettings.tsx:123`, `Gamification.tsx:395`, `PackageBrochure.tsx:716`, `AgentManagement.tsx:513-515` dan judul dialog "Log Penjualan"
- Modify: `src/pages/admin/Analytics.tsx` (judul "Analytics")
- Test: `src/lib/adminLanguage.test.ts`

**Interfaces:**
- Consumes: daftar temuan Task 4 (kerjakan sampai tes hijau; temuan baru yang muncul ikut diganti).
- Produces: istilah baku di bawah ini dipakai konsisten.

| Sekarang | Jadi |
|---|---|
| Product Development | Pengembangan Produk |
| Calculator Leads | Lead Kalkulator |
| Flyer Generator / Pembuat Flyer | Pembuat Flyer (judul halaman disamakan dengan menu) |
| WhatsApp Inbox | Kotak Masuk WhatsApp |
| WhatsApp Rotation | Rotasi WhatsApp |
| Booth Optimizer | Pengoptimal Booth |
| Pengaturan Marketing / Pengaturan Pemasaran | Pengaturan Pemasaran |
| Master COGS | Master HPP |
| Analytics | Analitik |
| Add Challenge | Tambah Tantangan |
| Confirmed (komisi langsung masuk) | Terkonfirmasi (komisi langsung masuk) |
| Pending (belum masuk komisi) | Menunggu (belum masuk komisi) |
| Cancelled | Dibatalkan |
| Log Penjualan | Catat Penjualan |
| Kelola Agent (jika ada) | Kelola Agen |

- [ ] **Step 1: Ganti per berkas**

Contoh perubahan tepat, `Gamification.tsx:395`:

```tsx
                  Tambah Tantangan
```

`AgentManagement.tsx:513-515`:

```tsx
                  <SelectItem value="confirmed">Terkonfirmasi (komisi langsung masuk)</SelectItem>
                  <SelectItem value="pending">Menunggu (belum masuk komisi)</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
```

(`value` tetap `confirmed`/`pending`/`cancelled` karena itu nilai database.) Untuk judul halaman: `<AdminPage title="Pengembangan Produk"`, `title="Lead Kalkulator"`, `title="Kotak Masuk WhatsApp"`, `title="Rotasi WhatsApp"`, `title="Pengoptimal Booth"`, `title="Pengaturan Pemasaran"`, `title="Analitik"`, `title="Pembuat Flyer"`, `title="Master HPP"`. Label menu "Master COGS" di `adminMenu.ts` menjadi "Master HPP"; label "Kalkulator Harga" tetap.

- [ ] **Step 2: Jalankan tes bahasa**

Run: `npx vitest run src/lib/adminLanguage.test.ts`
Expected: PASS. Bila masih ada temuan, ganti sampai kosong; jangan menambah kata ke `ALLOWED_LINES` kecuali nama produk resmi.

- [ ] **Step 3: Jalankan seluruh pemeriksaan**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm test && npx vite build`
Expected: tsc bersih, semua tes lulus (termasuk 23 tes lama), build selesai.

- [ ] **Step 4: Commit**

```bash
git add src/lib/adminLanguage.test.ts src/components/admin/adminMenu.ts src/pages/admin
git commit -m "feat(admin): teks tampilan berbahasa Indonesia, dijaga tes"
```

---

### Task 6: Verifikasi di HP dan pratinjau

**Files:** tidak ada perubahan kode.

- [ ] **Step 1: Jalankan server lokal**

Run: `npx vite --port 8105 --host` (di terminal terpisah). Buka `http://localhost:8105/admin`, login sebagai owner.

- [ ] **Step 2: Periksa di 390px**

Periksa dengan browser panel (`resize_window` 390x844): (a) drawer menampilkan "Pendaftaran Masuk" tepat di atas "Data Jamaah" dengan lencana saat ada pendaftaran baru; (b) membuka `/admin/jamaah/masuk` menyorot "Pendaftaran Masuk" saja; (c) `/admin/jamaah/semua` menyorot "Data Jamaah"; (d) Dashboard menampilkan antrean berurut dan petunjuk seperti "3 menunggu, Rp 16.750.000"; (e) tidak ada judul Inggris di 10 halaman acak.

- [ ] **Step 3: Uji peran**

Masuk sebagai `cs_admin` (akun uji, bukan akun asli pengguna): `/admin` mengarahkan ke `/admin/jamaah/masuk`. Ulangi untuk `finance`.

- [ ] **Step 4: Rilis pratinjau (bukan produksi)**

Run: `npx vite build && npx wrangler pages deploy dist --project-name musafartour --branch admin-wave-2 --commit-dirty=true`
Expected: `Deployment complete` dengan alias `admin-wave-2.musafartour.pages.dev`. Kirim tautan ke pengguna; produksi hanya atas izin tertulisnya.

---

## Self-Review

- **Cakupan evaluasi:** A1 menu dan grup (Task 1), A2 lencana (sudah ada, dikoreksi di Global Constraints, label dipindah di Task 1), A3 menu sendiri (Task 1), A4 langkah berikutnya (Task 3), A5 beranda peran (Task 2), B1 sampai B3 istilah, penggantian, dan penjaga (Task 4 dan 5). A6 (pencarian jamaah dan agen di palet perintah) sengaja belum dimasukkan karena butuh keputusan privasi hasil pencarian di header; jadikan rencana terpisah.
- **Placeholder:** tidak ada TBD; satu kondisi yang dijelaskan sebagai bercabang (rute `/admin/articles` di menu `content_admin`) disertai instruksi tes yang memutuskan.
- **Konsistensi tipe:** `buildWorkQueue`, `QueueItem`, `menuBadgeFor`, `getAdminHomePath`, `findActiveItem` dipakai dengan nama dan tanda tangan yang sama di semua task.
- **Risiko:** (1) tes bahasa memakai regex, jadi bisa ada positif palsu pada teks yang sah; solusi hanya lewat `ALLOWED_LINES` untuk nama produk. (2) `WorkQueueCards` memakai ikon per `key`; kunci baru wajib ditambahkan ke `ICONS`.
