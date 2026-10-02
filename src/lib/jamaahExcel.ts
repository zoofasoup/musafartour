import * as XLSX from "xlsx";
import { PAY_STATE_LABEL, ROOM_SHORT, balanceOf, payState, splitEvenly, type JamaahGroup, type Payment, type Registration } from "@/lib/jamaah";
import type { AgentOption } from "@/hooks/useJamaah";

/**
 * Excel export for one package: a "Keuangan" sheet laid out like the old Google
 * Sheet (so finance can keep their habit) and a "Manifest" sheet for airline/visa.
 */
export function exportJamaahWorkbook(opts: {
  packageName: string;
  departureDate: string;
  registrations: Registration[];
  payments: Payment[];
  groups: JamaahGroup[];
  agents: AgentOption[];
}) {
  const { registrations, payments, groups, agents } = opts;
  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? "";
  const agentName = (r: Registration) => agents.find((a) => a.id === r.agent_id)?.name ?? r.referral_note ?? "";
  const active = registrations.filter((r) => r.status === "active");

  const finance = active.map((r, i) => {
    const b = balanceOf(r, payments.filter((p) => p.registration_id === r.id));
    return {
      No: i + 1,
      "Nama Jamaah": r.full_name,
      Rombongan: groupName(r.group_id),
      "No. WA": r.phone ?? "",
      Size: r.equipment_size ?? "",
      "Ambil Perlengkapan": r.equipment_taken_at ? "Sudah" : "Belum",
      Paket: ROOM_SHORT[r.room_type] ?? r.room_type,
      "Rencana (Harga Paket)": Number(r.list_price),
      Diskon: Number(r.discount),
      Tagihan: b.agreed,
      "Realisasi (Terverifikasi)": b.paidVerified,
      "Menunggu Verifikasi": b.paidPending,
      Selisih: b.outstanding,
      "Status Bayar": PAY_STATE_LABEL[payState(b)],
      Domisili: r.domicile ?? "",
      Start: r.start_city ?? "",
      Keterangan: r.price_note ?? "",
      Agen: agentName(r),
    };
  });

  const manifest = active.map((r, i) => ({
    No: i + 1,
    "Nama (sesuai paspor)": r.full_name,
    "L/P": r.gender ?? "",
    NIK: r.nik ?? "",
    "Tempat Lahir": r.birth_place ?? "",
    "Tanggal Lahir": r.date_of_birth ?? "",
    "No. Paspor": r.passport_number ?? "",
    "Tanggal Terbit": r.passport_issued_at ?? "",
    "Berlaku Sampai": r.passport_expiry ?? "",
    "Kantor Imigrasi": r.passport_issue_office ?? "",
    Mahram: r.mahram_name ?? "",
    "Hubungan Mahram": r.mahram_relation ?? "",
    "Vaksin Meningitis": r.meningitis_vaccinated_at ?? "",
    "Vaksin Polio": r.polio_vaccinated_at ?? "",
    Kamar: ROOM_SHORT[r.room_type] ?? r.room_type,
    "Teman Sekamar": r.roommate_note ?? "",
    "Nama Ayah": r.father_name ?? "",
    "Status Kawin": r.marital_status === "married" ? "Menikah" : r.marital_status === "single" ? "Tidak menikah" : "",
    Alamat: r.address ?? "",
    Email: r.email ?? "",
    Pekerjaan: r.occupation ?? "",
    Pendidikan: r.education ?? "",
    "Gol. Darah": r.blood_type ?? "",
    "Kontak Darurat": r.emergency_name ?? "",
    "Hubungan Darurat": r.emergency_relation ?? "",
    "HP Darurat": r.emergency_phone ?? "",
    "Riwayat Penyakit": r.medical_notes ?? "",
    Rombongan: groupName(r.group_id),
    "No. WA": r.phone ?? "",
  }));

  const wb = XLSX.utils.book_new();
  const financeSheet = XLSX.utils.json_to_sheet(finance);
  financeSheet["!cols"] = Object.keys(finance[0] ?? { No: 0 }).map((k) => ({ wch: Math.max(k.length + 2, 12) }));
  XLSX.utils.book_append_sheet(wb, financeSheet, "Keuangan");
  const manifestSheet = XLSX.utils.json_to_sheet(manifest);
  manifestSheet["!cols"] = Object.keys(manifest[0] ?? { No: 0 }).map((k) => ({ wch: Math.max(k.length + 2, 12) }));
  XLSX.utils.book_append_sheet(wb, manifestSheet, "Manifest");

  const safe = opts.packageName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  XLSX.writeFile(wb, `jamaah-${safe}-${opts.departureDate.slice(0, 10)}.xlsx`);
}

// ---------------------------------------------------------------------------
// One-time import of the old Google Sheet (downloaded as .xlsx or .csv)
// ---------------------------------------------------------------------------

export interface ImportRow {
  line: number;
  full_name: string;
  phone: string | null;
  room_type: string | null;
  list_price: number;
  paid: number;
  equipment_size: string | null;
  equipment_taken: boolean;
  domicile: string | null;
  start_city: string | null;
  price_note: string | null;
  agent_raw: string | null;
  agent_id: string | null;
  errors: string[];
  duplicate: boolean;
  /** Not a jamaah at all (empty or total row of the old sheet): left out without counting as an error. */
  skipped: string | null;
  /** Realisasi is higher than the price although it is not a merged family payment. */
  overpaid: boolean;
  /** "L" or "P", taken from a "(L)" / "(P)" mark after the name. */
  gender: string | null;
  /** Rows sharing one merged Realisasi cell are one family: same key, one transfer split evenly. */
  group_key: string | null;
  group_name: string | null;
}

const HEADERS: Record<string, RegExp> = {
  name: /nama/i,
  phone: /(no\.?\s*)?(hp|wa|whatsapp|telp|telepon)/i,
  size: /size|ukuran/i,
  taken: /ambil/i,
  room: /^paket|kamar|room/i,
  plan: /rencana/i,
  paid: /realisasi/i,
  domicile: /domisili/i,
  start: /^start|keberangkatan/i,
  note: /keterangan/i,
  agent: /agen|referral/i,
};

const toNumber = (v: unknown) => {
  if (typeof v === "number") return Math.round(v);
  const digits = String(v ?? "").replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
};
const toText = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s && s !== "-" ? s : null;
};
const toRoom = (v: unknown) => {
  const s = String(v ?? "").toLowerCase();
  if (/non\s*-?\s*bed/.test(s)) return "non_bed";
  if (s.includes("infant") || s.includes("bayi")) return "infant";
  if (s.includes("quad") || s.includes("ber 4") || s.includes("ber-4")) return "quad";
  if (s.includes("triple") || s.includes("tripel") || s.includes("ber 3") || s.includes("ber-3")) return "triple";
  if (s.includes("double") || s.includes("dobel") || s.includes("ber 2") || s.includes("ber-2")) return "double";
  return null;
};

/** What the old "Paket" cell said besides the room, e.g. "quad *5", "double vip", "triple/hemat". */
const roomExtras = (v: unknown) => {
  const s = String(v ?? "").toLowerCase();
  const extras: string[] = [];
  if (/\*\s*5|bintang\s*5/.test(s)) extras.push("Bintang 5");
  if (/\bvip\b/.test(s)) extras.push("VIP");
  if (/hemat/.test(s)) extras.push("Hemat");
  return extras;
};

const row_overpaid = (paid: number, plan: number) => plan > 0 && paid > plan;

const TOTAL_NAME = /^(total|jumlah|sub\s*-?\s*total|grand\s*total)\b/i;
const isTaken = (v: unknown) => {
  const s = String(v ?? "").trim().toLowerCase();
  return !!s && !["-", "belum", "tidak", "no", "0", "false", "x"].includes(s);
};

/** Tab names of an uploaded workbook (a .csv has just one). */
export function listSheetNames(buffer: ArrayBuffer): string[] {
  return XLSX.read(new Uint8Array(buffer), { type: "array", bookSheets: true }).SheetNames;
}

const MONTH_PREFIX = ["jan", "feb", "mar", "apr", "mei", "jun", "jul", "agu", "sep", "okt", "nov", "des"];

/**
 * Best tab for a package: the old sheet names tabs by departure day and month ("11 OKT", "5 AGUSTUS"),
 * with a suffix for the airline (SV = Saudia, GA = Garuda) when two trips left on the same date.
 */
export function guessSheetName(sheetNames: string[], departureDate: string, flight: string | null): string | undefined {
  const day = parseInt(departureDate.slice(8, 10), 10);
  const month = MONTH_PREFIX[parseInt(departureDate.slice(5, 7), 10) - 1];
  const matches = sheetNames.filter((n) => {
    const m = n.trim().toLowerCase().match(/^(\d{1,2})\s*([a-z]{2,})/);
    // "NO" and "AGUSTUS" both count for the month: tabs were typed by hand ("16 NO" for 16 Nov).
    return !!m && parseInt(m[1], 10) === day && (m[2].startsWith(month) || month.startsWith(m[2]));
  });
  if (matches.length <= 1) return matches[0];
  const code = /garuda/i.test(flight ?? "") ? "ga" : /saudia/i.test(flight ?? "") ? "sv" : "";
  return matches.find((n) => code && new RegExp(`\\b${code}\\b`, "i").test(n)) ?? matches[0];
}

/** "1. HENDAR (P)" -> name "HENDAR", gender "P": the old sheet numbered some families and marked gender. */
const cleanName = (raw: string) => {
  const gender = raw.match(/\(\s*([LP])\s*\)\s*$/i)?.[1]?.toUpperCase() ?? null;
  const name = raw.replace(/^\s*\d+\s*[.)-]\s*/, "").replace(/\s*\(\s*[LP]\s*\)\s*$/i, "").trim();
  return { name: name || raw, gender };
};

export function parseSheetFile(buffer: ArrayBuffer, agents: AgentOption[], existingNames: string[], sheetName?: string): ImportRow[] {
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const ws = wb.Sheets[sheetName && wb.Sheets[sheetName] ? sheetName : wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

  // Header = first row (within the first 10) that has a "Nama" column.
  const headerIdx = rows.slice(0, 10).findIndex((r) => (r as unknown[]).some((c) => HEADERS.name.test(String(c))));
  if (headerIdx < 0) throw new Error('Kolom "Nama Jamaah" tidak ditemukan di 10 baris pertama.');
  const header = (rows[headerIdx] as unknown[]).map((c) => String(c).trim());
  const col: Record<string, number> = {};
  for (const [key, re] of Object.entries(HEADERS)) col[key] = header.findIndex((h) => re.test(h));
  // "Nama Jamaah" also matches nothing else, but "Paket" must not grab the price columns.
  if (col.room >= 0 && (col.room === col.plan || col.room === col.paid)) col.room = -1;

  const existing = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  const tabName = sheetName && wb.Sheets[sheetName] ? sheetName : wb.SheetNames[0];

  // Merged cells hold their value only in the top-left cell. Text columns repeat it on every row of the
  // merge (a family sharing one agent); the money column is handled below as one family payment.
  const merges = (ws["!merges"] ?? []) as { s: { r: number; c: number }; e: { r: number; c: number } }[];
  const mergeAt = (r: number, c: number) => merges.find((m) => r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c);
  const get = (r: unknown[], key: string, rowIdx = -1) => {
    if (col[key] < 0) return "";
    const v = r[col[key]];
    if (key === "paid" || rowIdx < 0 || (v !== "" && v != null)) return v;
    const m = mergeAt(rowIdx, col[key]);
    return m ? (rows[m.s.r] as unknown[])[m.s.c] : v;
  };

  const built = rows
    .slice(headerIdx + 1)
    .map((raw, i) => ({ raw: raw as unknown[], line: headerIdx + i + 2 }))
    .filter(({ raw }) => toText(get(raw, "name")))
    .map(({ raw, line }) => {
      const rowIdx = line - 1;
      const { name: full_name, gender } = cleanName(toText(get(raw, "name"))!);
      const paketCell = get(raw, "room");
      const planNum = toNumber(get(raw, "plan"));
      const paidNum = toNumber(get(raw, "paid"));
      const skipped = TOTAL_NAME.test(String(get(raw, "name"))) || TOTAL_NAME.test(String(paketCell ?? "").trim())
        ? "Baris total"
        : /^[\d.,\s]+$/.test(String(paketCell ?? "").trim()) && toNumber(paketCell) > 0
          ? "Baris jumlah"
          : !String(paketCell ?? "").trim() && !planNum && !paidNum
            ? "Baris kosong"
            : null;
      const agentRaw = toText(get(raw, "agent", rowIdx));
      const agent = agentRaw
        ? agents.find(
            (a) => a.name.toLowerCase() === agentRaw.toLowerCase() || a.referral_code.toLowerCase() === agentRaw.toLowerCase()
          )
        : undefined;
      const row: ImportRow = {
        line,
        full_name,
        phone: toText(get(raw, "phone")),
        room_type: toRoom(paketCell),
        list_price: planNum,
        paid: paidNum,
        equipment_size: toText(get(raw, "size", rowIdx)),
        equipment_taken: isTaken(get(raw, "taken", rowIdx)),
        domicile: toText(get(raw, "domicile", rowIdx)),
        start_city: toText(get(raw, "start", rowIdx)),
        price_note: [toText(get(raw, "note", rowIdx)), ...roomExtras(paketCell)].filter(Boolean).join(" · ") || null,
        agent_raw: agentRaw,
        agent_id: agent?.id ?? null,
        errors: [],
        duplicate: existing.has(full_name.toLowerCase()),
        skipped,
        overpaid: row_overpaid(paidNum, planNum),
        gender,
        group_key: null,
        group_name: null,
      };
      if (skipped) return row;
      if (!row.room_type) row.errors.push("Kamar (quad/triple/double/non bed/infant) tidak dikenali");
      if (!row.list_price) row.errors.push("Harga (Rencana) kosong");
      return row;
    });

  // A merged Realisasi cell over several rows = one family or rombongan that paid once.
  for (const m of merges) {
    if (col.paid < 0 || m.s.c !== col.paid || m.e.c !== col.paid || m.e.r <= m.s.r || m.s.r <= headerIdx) continue;
    const members = built.filter((r) => r.line - 1 >= m.s.r && r.line - 1 <= m.e.r && !r.skipped);
    if (members.length < 2) continue;
    const total = toNumber((rows[m.s.r] as unknown[])[col.paid]);

    if (members.some((r) => r.duplicate)) {
      members.forEach((r) => ((r.duplicate = true), (r.paid = 0)));
      continue;
    }
    const incomplete = members.filter((r) => r.errors.length);
    if (incomplete.length) {
      // One payment covers everyone, so nobody in it is imported until every row is complete.
      const lines = incomplete.slice(0, 5).map((r) => r.line).join(", ") + (incomplete.length > 5 ? ", ..." : "");
      members.forEach((r) => {
        r.paid = 0;
        r.errors.push(`Satu pembayaran untuk ${members.length} orang, ${incomplete.length} barisnya belum lengkap (baris ${lines}): lengkapi dulu`);
      });
      continue;
    }
    const share = splitEvenly(total, members.map((r) => ({ id: String(r.line), outstanding: r.list_price })));
    const first = cleanName(members[0].full_name).name;
    const name = `${members.length > 6 ? "Rombongan" : "Keluarga"} ${first}`.slice(0, 120);
    for (const r of members) {
      r.paid = share[String(r.line)] ?? 0;
      r.overpaid = r.paid > r.list_price;
      r.group_key = `${tabName}#${m.s.r + 1}`;
      r.group_name = name;
    }
  }
  return built;
}

/** Spreadsheet of the jamaah currently shown in "Semua Jamaah" (after filters). */
export function exportAllJamaah(
  rows: {
    name: string;
    phone: string | null;
    packageLabel: string;
    room: string;
    agreed: number;
    paid: number;
    pending: number;
    outstanding: number;
    status: string;
    agent: string;
    domicile: string;
    start: string;
  }[]
) {
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((r, i) => ({
      No: i + 1,
      "Nama Jamaah": r.name,
      "No. WA": r.phone ?? "",
      Paket: r.packageLabel,
      Kamar: r.room,
      Tagihan: r.agreed,
      "Sudah masuk": r.paid,
      "Menunggu verifikasi": r.pending,
      Sisa: Math.max(0, r.outstanding),
      Status: r.status,
      Agen: r.agent,
      Domisili: r.domicile,
      Start: r.start,
    }))
  );
  sheet["!cols"] = [6, 28, 16, 38, 10, 14, 14, 18, 14, 14, 20, 18, 14].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Semua Jamaah");
  XLSX.writeFile(wb, `semua-jamaah-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
