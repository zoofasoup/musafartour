import * as XLSX from "xlsx";
import { PAY_STATE_LABEL, ROOM_SHORT, balanceOf, payState, type JamaahGroup, type Payment, type Registration } from "@/lib/jamaah";
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
  if (s.includes("quad") || s.includes("ber 4") || s.includes("ber-4")) return "quad";
  if (s.includes("triple") || s.includes("tripel") || s.includes("ber 3") || s.includes("ber-3")) return "triple";
  if (s.includes("double") || s.includes("dobel") || s.includes("ber 2") || s.includes("ber-2")) return "double";
  return null;
};
const isTaken = (v: unknown) => {
  const s = String(v ?? "").trim().toLowerCase();
  return !!s && !["-", "belum", "tidak", "no", "0", "false", "x"].includes(s);
};

export function parseSheetFile(buffer: ArrayBuffer, agents: AgentOption[], existingNames: string[]): ImportRow[] {
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
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
  const get = (r: unknown[], key: string) => (col[key] >= 0 ? r[col[key]] : "");

  return rows
    .slice(headerIdx + 1)
    .map((raw, i) => ({ raw: raw as unknown[], line: headerIdx + i + 2 }))
    .filter(({ raw }) => toText(get(raw, "name")))
    .map(({ raw, line }) => {
      const full_name = toText(get(raw, "name"))!;
      const agentRaw = toText(get(raw, "agent"));
      const agent = agentRaw
        ? agents.find(
            (a) => a.name.toLowerCase() === agentRaw.toLowerCase() || a.referral_code.toLowerCase() === agentRaw.toLowerCase()
          )
        : undefined;
      const row: ImportRow = {
        line,
        full_name,
        phone: toText(get(raw, "phone")),
        room_type: toRoom(get(raw, "room")),
        list_price: toNumber(get(raw, "plan")),
        paid: toNumber(get(raw, "paid")),
        equipment_size: toText(get(raw, "size")),
        equipment_taken: isTaken(get(raw, "taken")),
        domicile: toText(get(raw, "domicile")),
        start_city: toText(get(raw, "start")),
        price_note: toText(get(raw, "note")),
        agent_raw: agentRaw,
        agent_id: agent?.id ?? null,
        errors: [],
        duplicate: existing.has(full_name.toLowerCase()),
      };
      if (!row.room_type) row.errors.push("Kamar (quad/triple/double) tidak dikenali");
      if (!row.list_price) row.errors.push("Harga (Rencana) kosong");
      if (row.paid > row.list_price && row.list_price) row.errors.push("Realisasi lebih besar dari harga");
      return row;
    });
}
