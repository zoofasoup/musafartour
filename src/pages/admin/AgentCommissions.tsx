import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Coins, History, Info, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { CommissionCell } from "@/components/admin/commission/CommissionCell";
import { RateHistoryDrawer } from "@/components/admin/commission/RateHistoryDrawer";
import { SaveCancelled, useCommissionRates, useSaveCommissionRate, type CommissionRateRow } from "@/hooks/useCommissionRates";
import { COMMISSION_LEVELS, COMMISSION_LEVEL_LABEL, STANDARD_COMMISSION, rupiah, tierLabel, tierRank, type CommissionLevel } from "@/lib/commission";
import { todayJakarta } from "@/lib/utils";

interface GridRow {
  key: string;
  package_id: string;
  package_name: string;
  departure_date: string;
  flight: string | null;
  status: string;
  tier: string;
  amounts: Record<CommissionLevel, number | null>;
}

const isNarrow = () => window.matchMedia("(max-width: 639px)").matches;
const subscribeNarrow = (cb: () => void) => {
  const mql = window.matchMedia("(max-width: 639px)");
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};

const shortDate = (iso: string) => format(parseISO(iso), "d MMM yyyy", { locale: idLocale });
const longDate = (iso: string) => format(parseISO(iso), "EEEE, d MMMM yyyy", { locale: idLocale });
const monthLabel = (ym: string) => format(parseISO(`${ym}-01`), "MMMM yyyy", { locale: idLocale });

const rowSubtitle = (r: GridRow) => [shortDate(r.departure_date), tierLabel(r.tier), r.flight].filter(Boolean).join(" · ");

function toGridRows(rows: CommissionRateRow[]): GridRow[] {
  const map = new Map<string, GridRow>();
  for (const r of rows) {
    const key = `${r.package_id}|${r.tier}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        package_id: r.package_id,
        package_name: r.package_name,
        departure_date: r.departure_date,
        flight: r.flight,
        status: r.status,
        tier: r.tier,
        amounts: { silver: null, gold: null, platinum: null },
      };
      map.set(key, g);
    }
    if (r.level in g.amounts) g.amounts[r.level] = r.amount;
  }
  return [...map.values()].sort(
    (a, b) =>
      a.departure_date.localeCompare(b.departure_date) ||
      a.package_name.localeCompare(b.package_name, "id") ||
      tierRank(a.tier) - tierRank(b.tier),
  );
}

const isIncomplete = (r: GridRow) => COMMISSION_LEVELS.some((l) => r.amounts[l] == null);

const AgentCommissions = () => {
  const query = useCommissionRates();
  const save = useSaveCommissionRate();
  const narrow = useSyncExternalStore(subscribeNarrow, isNarrow, () => false);

  const [month, setMonth] = useState("upcoming");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  // Rows that were incomplete when the filter was switched on. Without the snapshot a row would vanish
  // the moment its fourth cell is filled, in the middle of typing.
  const [incompleteKeys, setIncompleteKeys] = useState<Set<string> | null>(null);

  const all = useMemo(() => toGridRows(query.data ?? []), [query.data]);
  const today = todayJakarta();

  const months = useMemo(() => [...new Set(all.map((r) => r.departure_date.slice(0, 7)))].sort(), [all]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((r) => {
      if (month === "upcoming" ? r.departure_date < today : month !== "all" && !r.departure_date.startsWith(month)) return false;
      if (status !== "all" && r.status !== status) return false;
      if (q && !r.package_name.toLowerCase().includes(q)) return false;
      if (incompleteKeys && !incompleteKeys.has(r.key)) return false;
      return true;
    });
  }, [all, month, status, search, incompleteKeys, today]);

  const groups = useMemo(() => {
    const out: { date: string; rows: GridRow[] }[] = [];
    for (const r of visible) {
      const last = out[out.length - 1];
      if (last && last.date === r.departure_date) last.rows.push(r);
      else out.push({ date: r.departure_date, rows: [r] });
    }
    return out;
  }, [visible]);

  const totalCells = visible.length * COMMISSION_LEVELS.length;
  const filledCells = visible.reduce((n, r) => n + COMMISSION_LEVELS.filter((l) => r.amounts[l] != null).length, 0);

  // First number on a row that has no rate at all: the other two levels would silently become Rp 0 (ADM-106). Ask first.
  const [firstRate, setFirstRate] = useState<{ row: GridRow; level: CommissionLevel; amount: number } | null>(null);
  const [fillingAll, setFillingAll] = useState(false);
  const decision = useRef<{ resolve: () => void; reject: (e: Error) => void } | null>(null);
  const [historyFor, setHistoryFor] = useState<{ id: string; name: string } | null>(null);

  const saveCell = useCallback(
    (row: GridRow, level: CommissionLevel) => (amount: number | null) => {
      const unconfigured = COMMISSION_LEVELS.every((l) => row.amounts[l] == null);
      if (amount != null && unconfigured) {
        return new Promise<void>((resolve, reject) => {
          decision.current = { resolve, reject };
          setFirstRate({ row, level, amount });
        });
      }
      return save.mutateAsync({ package_id: row.package_id, tier: row.tier, level, amount });
    },
    [save],
  );

  const settleFirstRate = async (mode: "one" | "all" | "cancel") => {
    const d = decision.current;
    const pending = firstRate;
    if (!d || !pending) return;
    if (mode === "cancel") {
      d.reject(new SaveCancelled());
    } else {
      try {
        const levels = mode === "all" ? COMMISSION_LEVELS : [pending.level];
        setFillingAll(true);
        for (const l of levels) await save.mutateAsync({ package_id: pending.row.package_id, tier: pending.row.tier, level: l, amount: pending.amount });
        d.resolve();
      } catch (e) {
        d.reject(e instanceof Error ? e : new Error("Komisi belum tersimpan"));
      } finally {
        setFillingAll(false);
      }
    }
    decision.current = null;
    setFirstRate(null);
  };

  const toggleIncomplete = (on: boolean) => setIncompleteKeys(on ? new Set(all.filter(isIncomplete).map((r) => r.key)) : null);

  const filtersActive = month !== "upcoming" || status !== "all" || !!search.trim() || !!incompleteKeys;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <Coins className="h-7 w-7" aria-hidden />
          Komisi Agen
        </h1>
        <p className="mt-1 text-muted-foreground">Atur komisi per keberangkatan, kelas, dan tingkat agen. Perubahan tersimpan otomatis.</p>
      </div>

      <div className="flex items-start gap-3 rounded-lg bg-card p-4 shadow-sm">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="space-y-1 text-sm">
          <p>
            Komisi dibayarkan sesuai tingkat agen saat jamaah lunas. Paket yang belum punya angka sama sekali memakai komisi standar {rupiah(STANDARD_COMMISSION)}.
          </p>
          {query.data && (
            <p className="font-semibold" aria-live="polite">
              {filledCells} dari {totalCells} sel terisi
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative flex-1">
          <Label htmlFor="komisi-cari" className="sr-only">
            Cari nama paket
          </Label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="komisi-cari" className="pl-9" placeholder="Cari nama paket" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:flex">
          <div className="lg:w-52">
            <Label htmlFor="komisi-bulan" className="mb-1 block text-xs font-medium text-muted-foreground">
              Bulan
            </Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger id="komisi-bulan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Semua mendatang</SelectItem>
                <SelectItem value="all">Termasuk yang sudah lewat</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>
                    {monthLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="lg:w-40">
            <Label htmlFor="komisi-status" className="mb-1 block text-xs font-medium text-muted-foreground">
              Status paket
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="komisi-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="published">Terbit</SelectItem>
                <SelectItem value="draft">Draf</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex h-10 items-center gap-2 [@media(pointer:coarse)]:h-11">
          <Checkbox id="komisi-belum" checked={!!incompleteKeys} onCheckedChange={(c) => toggleIncomplete(c === true)} />
          <Label htmlFor="komisi-belum" className="cursor-pointer text-sm font-medium">
            Hanya yang belum lengkap
          </Label>
        </div>
      </div>

      {query.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <LoadError what="Daftar komisi" error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
      ) : visible.length === 0 ? (
        <EmptyState icon={Coins} title={filtersActive ? "Tidak ada paket yang cocok" : "Belum ada paket berangkat"}>
          {filtersActive ? "Ubah atau hapus penyaring untuk melihat paket lain." : "Paket yang berangkat 30 hari terakhir dan ke depan akan muncul di sini."}
        </EmptyState>
      ) : narrow ? (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.date} aria-label={longDate(g.date)} className="space-y-3">
              <h2 className="text-base font-bold">{longDate(g.date)}</h2>
              {g.rows.map((r) => (
                <div key={r.key} className="space-y-3 rounded-lg bg-card p-4 shadow-sm">
                  <div className="space-y-1">
                    <p className="font-semibold leading-tight">{r.package_name}</p>
                    <p className="text-[13px] text-muted-foreground">{rowSubtitle(r)}</p>
                    <RowStatus status={r.status} />
                    <HistoryButton name={r.package_name} onClick={() => setHistoryFor({ id: r.package_id, name: `${r.package_name} · ${shortDate(r.departure_date)}` })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {COMMISSION_LEVELS.map((l) => (
                      <div key={l}>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{COMMISSION_LEVEL_LABEL[l]}</p>
                        <CommissionCell
                          value={r.amounts[l]}
                          ariaLabel={`Komisi ${COMMISSION_LEVEL_LABEL[l]}, ${r.package_name}, ${rowSubtitle(r)}`}
                          onSave={saveCell(r, l)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="max-h-[calc(100dvh-14rem)] min-h-[320px] overflow-auto rounded-lg bg-card shadow-sm">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th scope="col" className="sticky top-0 z-10 h-10 bg-muted px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Paket dan kelas
                </th>
                {COMMISSION_LEVELS.map((l) => (
                  <th key={l} scope="col" className="sticky top-0 z-10 h-10 w-[168px] bg-muted px-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground last:pr-4">
                    {COMMISSION_LEVEL_LABEL[l]}
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.date}>
                <tr>
                  <th colSpan={5} scope="colgroup" className="border-t border-border bg-field/60 px-4 py-2 text-left text-[13px] font-semibold">
                    {longDate(g.date)}
                  </th>
                </tr>
                {g.rows.map((r) => (
                  <tr key={r.key} className="h-12 hover:bg-muted/40">
                    <th scope="row" className="h-12 border-t border-border px-4 py-1.5 text-left font-normal">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-semibold">{r.package_name}</span>
                        <RowStatus status={r.status} />
                        <HistoryButton name={r.package_name} onClick={() => setHistoryFor({ id: r.package_id, name: `${r.package_name} · ${shortDate(r.departure_date)}` })} />
                      </div>
                      <div className="text-[13px] text-muted-foreground">{rowSubtitle(r)}</div>
                    </th>
                    {COMMISSION_LEVELS.map((l) => (
                      <td key={l} className="border-t border-border px-2 py-1.5 last:pr-4">
                        <CommissionCell
                          value={r.amounts[l]}
                          ariaLabel={`Komisi ${COMMISSION_LEVEL_LABEL[l]}, ${r.package_name}, ${rowSubtitle(r)}`}
                          onSave={saveCell(r, l)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}

      <Dialog open={!!firstRate} onOpenChange={(o) => !o && !fillingAll && void settleFirstRate("cancel")}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Paket ini belum punya tarif</DialogTitle>
            <DialogDescription>
              Setelah kamu mengisi satu tingkat, tingkat lain yang kosong dihitung Rp 0 (tidak lagi {rupiah(STANDARD_COMMISSION)}). Isi ketiga tingkat?
            </DialogDescription>
          </DialogHeader>
          {firstRate && (
            <p className="rounded-lg bg-field p-3 text-sm">
              {firstRate.row.package_name} · {tierLabel(firstRate.row.tier)}: {COMMISSION_LEVEL_LABEL[firstRate.level]} {rupiah(firstRate.amount)}
            </p>
          )}
          <DialogFooter className="gap-2 sm:flex-col sm:space-x-0">
            <Button type="button" className="min-h-11" onClick={() => void settleFirstRate("all")} disabled={fillingAll}>
              {fillingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Isi ketiga tingkat dengan angka ini
            </Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => void settleFirstRate("one")} disabled={fillingAll}>
              Isi satu tingkat saja
            </Button>
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => void settleFirstRate("cancel")} disabled={fillingAll}>
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RateHistoryDrawer packageId={historyFor?.id ?? null} packageName={historyFor?.name ?? ""} onClose={() => setHistoryFor(null)} />
    </div>
  );
};

function HistoryButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Riwayat tarif ${name}`}
      className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] font-medium text-muted-foreground outline-none hover:bg-field-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:h-11"
    >
      <History className="h-3.5 w-3.5" aria-hidden />
      Riwayat
    </button>
  );
}

function RowStatus({ status }: { status: string }) {
  if (status === "published") return <StatusBadge kind="ok">Terbit</StatusBadge>;
  return <StatusBadge kind="mute">{status === "draft" ? "Draf" : status}</StatusBadge>;
}

export default AgentCommissions;
