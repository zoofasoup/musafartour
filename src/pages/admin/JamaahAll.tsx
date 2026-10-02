import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Download, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  PAY_STATE_CLASS,
  PAY_STATE_LABEL,
  ROOM_SHORT,
  clusterByGroup,
  groupBalance,
  groupPayState,
  groupRuns,
  juta,
  payState,
  rupiah,
  todayIso,
  type PayState,
} from "@/lib/jamaah";
import { exportAllJamaah } from "@/lib/jamaahExcel";
import { useAgentOptions, useAllJamaah, useJamaahPackages } from "@/hooks/useJamaah";

const PAGE_SIZE = 50;
const ALL = "all";
const NO_AGENT = "none";

type When = "all" | "upcoming" | "departed";
type StatusFilter = "all" | PayState | "cancelled";
type SortKey = "newest" | "oldest" | "name" | "outstanding";

const day = (d: string) => format(new Date(`${d.slice(0, 10)}T00:00:00`), "d MMM yyyy", { locale: localeId });

/** Every jamaah on every package, all time. Click a row to open it in its package. */
export default function JamaahAll() {
  const navigate = useNavigate();
  const { data: all = [], isLoading } = useAllJamaah();
  const { data: packages = [] } = useJamaahPackages();
  const { data: agents = [] } = useAgentOptions();

  const [query, setQuery] = useState("");
  const [packageId, setPackageId] = useState(ALL);
  const [when, setWhen] = useState<When>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [agentId, setAgentId] = useState(ALL);
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(0);

  const pkgById = useMemo(() => new Map(packages.map((p) => [p.id, p])), [packages]);
  const agentName = (id: string | null, note: string | null) => agents.find((a) => a.id === id)?.name ?? note ?? "";
  const today = todayIso();

  const rows = useMemo(
    () =>
      all.map(({ reg, balance }) => ({
        reg,
        balance,
        pkg: pkgById.get(reg.package_id),
        state: payState(balance),
      })),
    [all, pkgById]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(({ reg, pkg, state }) => {
      if (q && !`${reg.full_name} ${reg.phone ?? ""}`.toLowerCase().includes(q)) return false;
      if (packageId !== ALL && reg.package_id !== packageId) return false;
      const departed = !!pkg && pkg.departure_date.slice(0, 10) < today;
      if (when === "upcoming" && departed) return false;
      if (when === "departed" && !departed) return false;
      if (agentId === NO_AGENT ? !!reg.agent_id || !!reg.referral_note : agentId !== ALL && reg.agent_id !== agentId) return false;
      if (status === "cancelled") return reg.status === "cancelled";
      if (reg.status === "cancelled") return false;
      return status === "all" || state === status;
    });
    const date = (r: (typeof list)[number]) => r.pkg?.departure_date ?? "";
    if (sort === "name") return list.sort((a, b) => a.reg.full_name.localeCompare(b.reg.full_name, "id"));
    if (sort === "outstanding") return list.sort((a, b) => Math.max(0, b.balance.outstanding) - Math.max(0, a.balance.outstanding));
    // By departure: keep the sheet's order within a package so family members stay together.
    return list.sort((a, b) => {
      const byDate = sort === "oldest" ? date(a).localeCompare(date(b)) : date(b).localeCompare(date(a));
      return byDate || a.reg.package_id.localeCompare(b.reg.package_id) || a.reg.created_at.localeCompare(b.reg.created_at);
    });
  }, [rows, query, packageId, when, status, agentId, sort, today]);

  // Back to the first page whenever the list changes.
  useEffect(() => setPage(0), [query, packageId, when, status, agentId, sort]);

  const active = visible.filter(({ reg }) => reg.status === "active");
  const totals = active.reduce(
    (t, { balance }) => ({
      agreed: t.agreed + balance.agreed,
      paid: t.paid + balance.paidVerified,
      outstanding: t.outstanding + Math.max(0, balance.outstanding),
    }),
    { agreed: 0, paid: 0, outstanding: 0 }
  );
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  // Families pay together: with the by-departure orders, neighbours of one group share one Masuk, Sisa and Status cell.
  const mergeFamilies = sort === "newest" || sort === "oldest";
  const groupOf = ({ reg }: (typeof rows)[number]) => (mergeFamilies && reg.status === "active" ? reg.group_id : null);
  const clustered = useMemo(() => clusterByGroup(visible, groupOf), [visible, mergeFamilies]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = clustered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const runs = groupRuns(shown, groupOf);
  const runAt = new Map(runs.map((run) => [run.start, run]));
  const coveredByRun = new Set(runs.flatMap((run) => Array.from({ length: run.length - 1 }, (_, k) => run.start + 1 + k)));
  const familyOf = (groupId: string) => rows.filter((x) => x.reg.group_id === groupId && x.reg.status === "active");
  const packageLabel = (id: string) => {
    const p = pkgById.get(id);
    return p ? `${day(p.departure_date)} · ${p.package_name}` : "–";
  };
  const statusLabel = (reg: { status: string }, state: PayState) => (reg.status === "cancelled" ? "Batal" : PAY_STATE_LABEL[state]);

  const download = () =>
    exportAllJamaah(
      visible.map(({ reg, balance, state }) => ({
        name: reg.full_name,
        phone: reg.phone,
        packageLabel: packageLabel(reg.package_id),
        room: ROOM_SHORT[reg.room_type] ?? reg.room_type,
        agreed: balance.agreed,
        paid: balance.paidVerified,
        pending: balance.paidPending,
        outstanding: balance.outstanding,
        status: statusLabel(reg, state),
        agent: agentName(reg.agent_id, reg.referral_note),
        domicile: reg.domicile ?? "",
        start: reg.start_city ?? "",
      }))
    );

  const stat = (label: string, value: string, hint?: string) => (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Semua Jamaah</h1>
        <p className="text-muted-foreground">Seluruh jamaah dari semua paket, sepanjang waktu. Klik baris untuk membukanya di paketnya.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat("Jamaah aktif", String(active.length), `${visible.length - active.length} batal di tampilan ini`)}
        {stat("Total tagihan", juta(totals.agreed))}
        {stat("Sudah masuk", juta(totals.paid))}
        {stat("Sisa tagihan", juta(totals.outstanding))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama / no. WA" className="pl-9" aria-label="Cari jamaah" />
        </div>
        <Select value={packageId} onValueChange={setPackageId}>
          <SelectTrigger className="w-full sm:w-[300px]" aria-label="Paket"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua paket</SelectItem>
            {[...packages].sort((a, b) => b.departure_date.localeCompare(a.departure_date)).map((p) => (
              <SelectItem key={p.id} value={p.id}>{day(p.departure_date)} · {p.package_name} · {p.duration_days}H</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={when} onValueChange={(v) => setWhen(v as When)}>
          <SelectTrigger className="w-[170px]" aria-label="Waktu"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua waktu</SelectItem>
            <SelectItem value="upcoming">Akan berangkat</SelectItem>
            <SelectItem value="departed">Sudah berangkat</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-[170px]" aria-label="Status bayar"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua jamaah aktif</SelectItem>
            <SelectItem value="belum_dp">Belum DP</SelectItem>
            <SelectItem value="dp">Sudah DP</SelectItem>
            <SelectItem value="lunas">Lunas</SelectItem>
            <SelectItem value="lebih">Lebih bayar</SelectItem>
            <SelectItem value="cancelled">Batal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={agentId} onValueChange={setAgentId}>
          <SelectTrigger className="w-[190px]" aria-label="Agen"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua agen</SelectItem>
            <SelectItem value={NO_AGENT}>Tanpa agen</SelectItem>
            {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-[190px]" aria-label="Urutkan"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Berangkat terbaru</SelectItem>
            <SelectItem value="oldest">Berangkat terlama</SelectItem>
            <SelectItem value="name">Nama A sampai Z</SelectItem>
            <SelectItem value="outstanding">Sisa tagihan terbesar</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" className="ml-auto gap-1" onClick={download} disabled={!visible.length}>
          <Download className="h-4 w-4" /> Export Excel
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <TableHead className="min-w-[200px]">Nama</TableHead>
              <TableHead className="min-w-[230px]">Paket</TableHead>
              <TableHead>Kamar</TableHead>
              <TableHead className="text-right">Tagihan</TableHead>
              <TableHead className="text-right">Masuk</TableHead>
              <TableHead className="text-right">Sisa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Agen</TableHead>
              <TableHead>Domisili</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  {all.length ? "Tidak ada jamaah yang cocok dengan pencarian ini." : "Belum ada jamaah. Import dari Google Sheet lewat halaman Data Jamaah."}
                </TableCell>
              </TableRow>
            ) : (
              shown.map(({ reg, balance, state, pkg }, i) => {
                const run = runAt.get(i);
                const family = run ? familyOf(run.group) : [];
                const fb = run ? groupBalance(family.map((m) => m.balance)) : null;
                const fstate = run ? groupPayState(family.map((m) => m.balance)) : null;
                return (
                <TableRow
                  key={reg.id}
                  className={`cursor-pointer ${reg.status === "cancelled" ? "text-muted-foreground" : ""}`}
                  onClick={() => navigate(`/admin/jamaah?paket=${reg.package_id}&cari=${encodeURIComponent(reg.full_name)}`)}
                >
                  <TableCell>{page * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell>
                    <p className="font-medium">{reg.full_name}</p>
                    <p className="text-xs text-muted-foreground">{reg.phone || "–"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{pkg ? day(pkg.departure_date) : "–"}</p>
                    <p className="text-xs text-muted-foreground">{pkg?.package_name}</p>
                  </TableCell>
                  <TableCell>{ROOM_SHORT[reg.room_type] ?? reg.room_type}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">{rupiah(balance.agreed)}</TableCell>
                  {coveredByRun.has(i) ? null : run && fb && fstate ? (
                    <>
                      <TableCell rowSpan={run.length} className="whitespace-nowrap border-l text-right align-middle">
                        {rupiah(fb.paidVerified)}
                        {fb.paidPending > 0 && <p className="text-xs text-amber-700">+{rupiah(fb.paidPending)} menunggu</p>}
                        <p className="text-xs text-muted-foreground">{family.length} orang</p>
                      </TableCell>
                      <TableCell rowSpan={run.length} className="whitespace-nowrap border-l text-right align-middle">{rupiah(Math.max(0, fb.outstanding))}</TableCell>
                      <TableCell rowSpan={run.length} className="border-l align-middle">
                        <Badge variant="outline" className={PAY_STATE_CLASS[fstate]}>{PAY_STATE_LABEL[fstate]}</Badge>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="whitespace-nowrap text-right">
                        {rupiah(balance.paidVerified)}
                        {balance.paidPending > 0 && <p className="text-xs text-amber-700">+{rupiah(balance.paidPending)} menunggu</p>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">{rupiah(Math.max(0, balance.outstanding))}</TableCell>
                      <TableCell>
                        {reg.status === "cancelled" ? (
                          <Badge variant="outline" className="bg-red-100 text-red-900">Batal</Badge>
                        ) : (
                          <Badge variant="outline" className={PAY_STATE_CLASS[state]}>{PAY_STATE_LABEL[state]}</Badge>
                        )}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-sm">{agentName(reg.agent_id, reg.referral_note) || "–"}</TableCell>
                  <TableCell className="text-sm">{reg.domicile || "–"}</TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {visible.length ? `${page * PAGE_SIZE + 1} sampai ${Math.min(visible.length, (page + 1) * PAGE_SIZE)} dari ${visible.length} jamaah` : "0 jamaah"}
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Halaman sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>Halaman {page + 1} dari {pages}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} aria-label="Halaman berikutnya">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
