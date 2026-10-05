import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useState } from "react";
import { ChevronDown, History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { packageStatusLabel } from "@/lib/packageStatus";
import { actorNickname } from "@/lib/jamaahHistory";

type ChangeEntry = { old: unknown; new: unknown };

interface LogRow {
  id: string;
  package_id: string;
  package_label: string | null;
  action: "insert" | "update" | "delete";
  // Updates: { field: { old, new } }. Deletes store the whole row under "_snapshot".
  changes: Record<string, ChangeEntry>;
  reason: string | null;
  actor_email: string | null;
  actor_name: string | null;
  created_at: string;
}

const TIER_PREFIX: Record<string, string> = {
  hemat: "Hemat",
  five_star: "Five-star",
  pelataran: "Pelataran",
  "": "Nyaman",
};

const FIELD_LABELS: Record<string, string> = {
  package_name: "Nama paket",
  slug: "Link paket",
  departure_date: "Tanggal berangkat",
  duration_days: "Durasi (hari)",
  flight: "Maskapai",
  flight_type: "Jenis penerbangan",
  available_tiers: "Tier",
  timeframe: "Timeframe",
  start_airport: "Bandara keberangkatan",
  route: "Rute",
  itinerary: "Itinerary",
  nights_makkah: "Malam di Makkah",
  nights_madinah: "Malam di Madinah",
  nights_extra: "Malam kota tambahan",
  hotel_extra: "Hotel kota tambahan",
  selling_points: "Selling points",
  max_discount: "Maks. diskon",
  slots_total: "Total seat",
  slots_filled: "Seat terisi",
  slots_booked_online: "Seat terisi (online)",
  agent_commission_amount: "Komisi agen",
  cogs_data: "Data COGS",
  cogs_status: "Status COGS",
  banner_image: "Flyer / banner",
  gallery_images: "Galeri foto",
  included_items: "Fasilitas termasuk",
  excluded_items: "Tidak termasuk",
  equipment_list: "Perlengkapan",
  catalog_link: "File katalog",
  itinerary_link: "File itinerary",
  status: "Status",
  is_sold_out: "Sold out",
  waitlist_count: "Jumlah waitlist",
  og_image: "Gambar share",
  canonical_url: "Canonical URL",
  best_seller_transport: "Transportasi Nyaman",
  package_price: "Harga Nyaman",
};

const TIER_FIELD_LABELS: Record<string, string> = {
  hotel_name: "hotel",
  hotel_star: "bintang hotel",
  distance: "jarak hotel",
  duration_walk: "waktu jalan kaki",
};

/** Human label for a packages column, e.g. "hemat_makkah_hotel_name" -> "Hemat: hotel Makkah". */
function fieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const price = key.match(/^(hemat|five_star|pelataran)_package_price$/);
  if (price) return `Harga ${TIER_PREFIX[price[1]]}`;
  const transport = key.match(/^(hemat|five_star|pelataran)_transport$/);
  if (transport) return `Transportasi ${TIER_PREFIX[transport[1]]}`;
  const hotel = key.match(/^(?:(hemat|five_star|pelataran)_)?(makkah|madinah)_(hotel_name|hotel_star|distance|duration_walk)$/);
  if (hotel) {
    const tier = TIER_PREFIX[hotel[1] ?? ""];
    const city = hotel[2] === "makkah" ? "Makkah" : "Madinah";
    return `${tier}: ${TIER_FIELD_LABELS[hotel[3]]} ${city}`;
  }
  return key.replace(/_/g, " ");
}

const rupiah = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
const juta = (n: number) => `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "").replace(".", ",")} jt`;

const isPriceObject = (v: unknown): v is { quad?: number; triple?: number; double?: number } =>
  !!v && typeof v === "object" && !Array.isArray(v) && ("quad" in v || "triple" in v || "double" in v);

function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined || v === "" || v === 0 || v === false) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (isPriceObject(v)) return !v.quad && !v.triple && !v.double;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

function formatValue(key: string, v: unknown, side: "old" | "new" = "new"): string {
  if (isEmptyValue(v) && typeof v !== "boolean") return "(kosong)";
  if (key === "status") return packageStatusLabel(String(v));
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  if (isPriceObject(v)) {
    return [
      v.quad ? `Quad ${juta(v.quad)}` : null,
      v.triple ? `Triple ${juta(v.triple)}` : null,
      v.double ? `Double ${juta(v.double)}` : null,
    ].filter(Boolean).join(" · ");
  }
  if (typeof v === "number" && (key === "max_discount" || key === "agent_commission_amount")) return rupiah(v);
  if (key === "departure_date" && typeof v === "string") {
    return format(new Date(`${v.slice(0, 10)}T00:00:00`), "d MMM yyyy", { locale: localeId });
  }
  if (Array.isArray(v)) {
    return key === "gallery_images" ? `${v.length} foto` : v.join(", ");
  }
  if (typeof v === "string" && /^https?:\/\//.test(v)) return side === "old" ? "file lama" : "file baru";
  if (typeof v === "object") return "diperbarui";
  const text = String(v);
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

/** Fields worth showing: drop changes between two "empty" values (e.g. null -> 0). */
function visibleChanges(changes: LogRow["changes"]) {
  return Object.entries(changes)
    .filter(([key]) => key !== "_snapshot")
    .filter(([, c]) => !(isEmptyValue(c.old) && isEmptyValue(c.new)))
    .map(([key, c]) => ({
      key,
      label: fieldLabel(key),
      // Big blobs (COGS, long text) only say that they changed.
      summaryOnly: key === "cogs_data",
      from: formatValue(key, c.old, "old"),
      to: formatValue(key, c.new),
    }));
}

/** Nickname only: the display name, else the email name before "@". */
const actorLabel = (row: LogRow) => (row.actor_name || row.actor_email ? actorNickname(row.actor_name, row.actor_email) : "Sistem (otomatis)");

const ACTION_TEXT: Record<LogRow["action"], string> = {
  insert: "membuat paket",
  update: "mengubah",
  delete: "menghapus paket",
};

/** Entries by the same person doing the same kind of action within this gap belong to one burst. */
const BURST_GAP_MS = 10 * 60 * 1000;

type Entry = { row: LogRow; changes: ReturnType<typeof visibleChanges> };

interface EntryGroup {
  key: string;
  entries: Entry[]; // newest first
}

/** Collapses bulk actions (an import, a bulk flyer upload) into one group; single edits stay alone. */
function groupBursts(entries: Entry[]): EntryGroup[] {
  const groups: EntryGroup[] = [];
  for (const e of entries) {
    const g = groups[groups.length - 1];
    const prev = g?.entries[g.entries.length - 1].row;
    const sameBurst =
      prev &&
      prev.action === e.row.action &&
      actorLabel(prev) === actorLabel(e.row) &&
      new Date(prev.created_at).getTime() - new Date(e.row.created_at).getTime() <= BURST_GAP_MS;
    if (sameBurst) g.entries.push(e);
    else groups.push({ key: e.row.id, entries: [e] });
  }
  return groups;
}

const FILE_FIELDS = new Set(["banner_image", "og_image", "catalog_link", "itinerary_link"]);

/** One line saying what the burst did, e.g. "Flyer / banner: 9 diisi, 3 diganti". */
function burstSummary(entries: Entry[]): string {
  const labels = new Map<string, string>();
  for (const { changes } of entries) for (const c of changes) labels.set(c.key, c.label);
  const keys = [...labels.keys()];
  if (keys.length === 0) return "";
  if (keys.length === 1 && FILE_FIELDS.has(keys[0])) {
    const filled = entries.filter(({ changes }) => changes.some(c => c.from === "(kosong)")).length;
    const replaced = entries.length - filled;
    const parts = [filled ? `${filled} diisi` : null, replaced ? `${replaced} diganti` : null].filter(Boolean);
    return `${labels.get(keys[0])}: ${parts.join(", ")}`;
  }
  const shown = keys.slice(0, 3).map(k => labels.get(k));
  return keys.length > 3 ? `${shown.join(", ")} +${keys.length - 3} bidang lain` : shown.join(", ");
}

const fmtTime = (iso: string) => format(new Date(iso), "d MMM yyyy, HH.mm", { locale: localeId });

interface PackageChangeLogProps {
  /** Limit to one package; omit to show recent changes across all packages. */
  packageId?: string;
}

export function PackageChangeLog({ packageId }: PackageChangeLogProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const { data: rows, isLoading, error } = useQuery({
    queryKey: ["package-change-log", packageId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("package_change_log")
        .select("id, package_id, package_label, action, changes, reason, actor_email, actor_name, created_at")
        .order("created_at", { ascending: false })
        .limit(packageId ? 200 : 300);
      if (packageId) query = query.eq("package_id", packageId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as LogRow[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive py-6">Riwayat perubahan belum bisa dimuat. Coba muat ulang halaman.</p>;
  }

  // Updates whose only differences were empty -> empty are noise; hide them.
  const entries = (rows ?? [])
    .map((row) => ({ row, changes: row.action === "update" ? visibleChanges(row.changes) : [] }))
    .filter(({ row, changes }) => row.action !== "update" || changes.length > 0);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
        <History className="h-6 w-6" />
        <p className="text-sm">Belum ada perubahan yang tercatat.</p>
      </div>
    );
  }

  const renderChanges = (changes: Entry["changes"]) => (
    <ul className="mt-2 space-y-1 text-sm">
      {changes.map((c) => (
        <li key={c.key}>
          <span className="text-muted-foreground">{c.label}:</span>{" "}
          {c.summaryOnly ? (
            <span>diperbarui</span>
          ) : (
            <>
              <span className="line-through decoration-slate-400 text-slate-500">{c.from}</span>
              {" → "}
              <span className="font-medium">{c.to}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );

  const renderSingle = ({ row, changes }: Entry) => (
    <li key={row.id} className="rounded-md border bg-white p-3">
      <p className="text-sm">
        <span className="font-semibold">{actorLabel(row)}</span>{" "}
        <span className="text-muted-foreground">{ACTION_TEXT[row.action]}</span>
        {!packageId && row.package_label && <span className="font-medium"> {row.package_label}</span>}
      </p>
      <p className="text-xs text-muted-foreground">{fmtTime(row.created_at)}</p>
      {row.reason && <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-sm text-amber-900">Alasan: {row.reason}</p>}
      {changes.length > 0 && renderChanges(changes)}
    </li>
  );

  const renderGroup = (g: EntryGroup) => {
    if (g.entries.length === 1) return renderSingle(g.entries[0]);
    const first = g.entries[0].row; // newest
    const last = g.entries[g.entries.length - 1].row; // oldest
    const isOpen = expanded.has(g.key);
    const summary = first.action === "update" ? burstSummary(g.entries) : "";
    const sharedReason = g.entries.every(e => e.row.reason === first.reason) ? first.reason : null;
    return (
      <li key={g.key} className="rounded-md border bg-white">
        <button
          type="button"
          onClick={() => toggle(g.key)}
          aria-expanded={isOpen}
          className="flex w-full items-start justify-between gap-3 p-3 text-left"
        >
          <span className="min-w-0">
            <span className="block text-sm">
              <span className="font-semibold">{actorLabel(first)}</span>{" "}
              <span className="text-muted-foreground">{ACTION_TEXT[first.action]}</span>{" "}
              <span className="font-medium">{g.entries.length} paket</span>
            </span>
            {summary && <span className="block text-sm text-slate-700">{summary}</span>}
            <span className="block text-xs text-muted-foreground">
              {fmtTime(last.created_at)}
              {fmtTime(last.created_at) !== fmtTime(first.created_at) && ` – ${format(new Date(first.created_at), "HH.mm", { locale: localeId })}`}
            </span>
            {sharedReason && <span className="mt-1 block rounded bg-amber-50 px-2 py-1 text-sm text-amber-900">Alasan: {sharedReason}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-1 pt-0.5 text-xs font-medium text-slate-500">
            {isOpen ? "Tutup" : "Lihat semua"}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
          </span>
        </button>
        {isOpen && (
          <ul className="space-y-2 border-t bg-slate-50/60 p-3">
            {g.entries.map(({ row, changes }) => (
              <li key={row.id} className="rounded border bg-white p-2">
                <p className="text-sm font-medium">{row.package_label ?? "Paket"}</p>
                {!sharedReason && row.reason && <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-sm text-amber-900">Alasan: {row.reason}</p>}
                {changes.length > 0 && renderChanges(changes)}
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return <ol className="space-y-3">{(packageId ? entries.map(e => ({ key: e.row.id, entries: [e] })) : groupBursts(entries)).map(renderGroup)}</ol>;
}
