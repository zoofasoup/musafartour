import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Download, FileSpreadsheet, Loader2, Plus, Search, Users, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RegistrationDialog } from "@/components/admin/jamaah/RegistrationDialog";
import { PaymentDialog } from "@/components/admin/jamaah/PaymentDialog";
import { RegistrationSheet } from "@/components/admin/jamaah/RegistrationSheet";
import { ImportSheetDialog } from "@/components/admin/jamaah/ImportSheetDialog";
import { ImportWorkbookDialog } from "@/components/admin/jamaah/ImportWorkbookDialog";
import { JamaahCardList, type CardItem, type FamilySummary } from "@/components/admin/jamaah/JamaahCardList";
import { JamaahViewSwitch } from "@/components/admin/jamaah/JamaahViewSwitch";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { StatCard } from "@/components/admin/jamaah/StatCard";
import { STICKY_HEAD, stickyNameCell } from "@/components/admin/jamaah/stickyName";
import {
  PAY_STATE_CLASS,
  PAY_STATE_LABEL,
  ROOM_SHORT,
  balanceOf,
  DP_MIN_PER_PAX,
  LUNAS_DAYS_BEFORE_DEPARTURE,
  clusterByGroup,
  daysUntil,
  documentChecklist,
  dueDateFor,
  groupBalance,
  groupPayState,
  groupRuns,
  juta,
  payState,
  rupiah,
  todayIso,
  type PayState,
  type Registration,
} from "@/lib/jamaah";
import { exportJamaahWorkbook } from "@/lib/jamaahExcel";
import { useAgentOptions, useInvalidateJamaah, useJamaahForPackage, useJamaahPackages } from "@/hooks/useJamaah";

/** Who counts as a family member for merged cells: active jamaah with a group. */
function groupOf<T extends { r: Pick<Registration, "status" | "group_id"> }>({ r }: T): string | null {
  return r.status === "active" ? r.group_id : null;
}
const DUE_LABEL = `H-${LUNAS_DAYS_BEFORE_DEPARTURE}`;

type Filter = "all" | PayState | "cancelled";

const fmtDay = (d: string) => format(new Date(`${d.slice(0, 10)}T00:00:00`), "d MMM yyyy", { locale: localeId });

export default function Jamaah() {
  const { user, userRole } = useAuth();
  const isOwner = userRole === "admin" || userRole === "superadmin";
  const [params, setParams] = useSearchParams();
  const { data: packages = [], isLoading: loadingPackages, error: packagesError, refetch: refetchPackages, isFetching: fetchingPackages } = useJamaahPackages();
  const { data: agents = [] } = useAgentOptions();
  const invalidate = useInvalidateJamaah();
  const queryClient = useQueryClient();

  // Default to the next departure; ?paket=<id> deep-links from the finance report.
  const packageId = params.get("paket") || packages.find((p) => p.departure_date >= todayIso())?.id || packages[0]?.id;
  const pkg = packages.find((p) => p.id === packageId);
  // isPending (not isLoading): a request waiting to retry after a failure is still "no data yet", not "no jamaah".
  const { data, isPending: isLoading, error: jamaahError, refetch: refetchJamaah, isFetching: fetchingJamaah } = useJamaahForPackage(packageId);
  const registrations = useMemo(() => data?.registrations ?? [], [data]);
  const payments = useMemo(() => data?.payments ?? [], [data]);
  const groups = useMemo(() => data?.groups ?? [], [data]);

  const [query, setQuery] = useState(params.get("cari") ?? "");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Registration | null>(null);
  const [regOpen, setRegOpen] = useState(false);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [detail, setDetail] = useState<Registration | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importAllOpen, setImportAllOpen] = useState(false);
  const [switchTo, setSwitchTo] = useState<"sheet" | "website" | null>(null);
  // Hovering any member highlights the whole family, merged cells included.
  const [hoverGroup, setHoverGroup] = useState<string | null>(null);

  // Arriving from "Semua jamaah" (?buka=<id>): open that jamaah's detail once the list is in, then drop the parameter
  // so closing the panel or reloading does not open it again.
  const openId = params.get("buka");
  useEffect(() => {
    if (!openId || !registrations.length) return;
    const target = registrations.find((r) => r.id === openId);
    if (target) setDetail(target);
    if (target || !isLoading) {
      const next = new URLSearchParams(params);
      next.delete("buka");
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, registrations]);

  // Keep the open detail panel in sync after edits.
  useEffect(() => {
    if (detail) setDetail(registrations.find((r) => r.id === detail.id) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrations]);

  const rows = useMemo(
    () =>
      registrations.map((r) => {
        const b = balanceOf(r, payments.filter((p) => p.registration_id === r.id));
        return { r, b, state: payState(b), docs: documentChecklist(r) };
      }),
    [registrations, payments]
  );

  const visible = useMemo(
    () =>
      rows.filter(({ r, state }) => {
        if (query && !`${r.full_name} ${r.phone ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
        if (filter === "cancelled") return r.status === "cancelled";
        if (r.status === "cancelled") return false;
        return filter === "all" || state === filter;
      }),
    [rows, query, filter]
  );

  // Families pay together: keep members side by side and show money, remaining bill and status once per family.
  const ordered = useMemo(() => clusterByGroup(visible, groupOf), [visible]);
  const { runAt, coveredByRun } = useMemo(() => {
    const runs = groupRuns(ordered, groupOf);
    return {
      runAt: new Map(runs.map((run) => [run.start, run])),
      coveredByRun: new Set(runs.flatMap((run) => Array.from({ length: run.length - 1 }, (_, k) => run.start + 1 + k))),
    };
  }, [ordered]);
  // Everyone in a family, not just the rows a filter leaves visible: the merged cells show the whole family.
  const families = useMemo(() => {
    const byGroup = new Map<string, typeof rows>();
    for (const row of rows) {
      const g = groupOf(row);
      if (g) byGroup.set(g, [...(byGroup.get(g) ?? []), row]);
    }
    return byGroup;
  }, [rows]);
  const groupNames = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);
  const agentNames = useMemo(() => new Map(agents.map((a) => [a.id, a.name])), [agents]);

  const active = rows.filter(({ r }) => r.status === "active");
  const totals = active.reduce(
    (t, { b, state }) => ({
      agreed: t.agreed + b.agreed,
      paid: t.paid + b.paidVerified,
      pending: t.pending + b.paidPending,
      outstanding: t.outstanding + Math.max(0, b.outstanding),
      belum_dp: t.belum_dp + (state === "belum_dp" ? 1 : 0),
      lunas: t.lunas + (state === "lunas" || state === "lebih" ? 1 : 0),
    }),
    { agreed: 0, paid: 0, pending: 0, outstanding: 0, belum_dp: 0, lunas: 0 }
  );
  const due = pkg ? dueDateFor(pkg.departure_date) : null;
  const groupName = (id: string | null) => (id ? groupNames.get(id) : undefined);
  const agentName = (r: Registration) => (r.agent_id ? agentNames.get(r.agent_id) : undefined) ?? r.referral_note;

  // Tick the box at once and save in the background; the old way waited for the server before showing anything.
  const toggleEquipment = async (r: Registration, taken: boolean) => {
    const key = ["jamaah", packageId];
    const previous = queryClient.getQueryData<typeof data>(key);
    const stamp = taken ? new Date().toISOString() : null;
    queryClient.setQueryData<typeof data>(key, (old) =>
      old ? { ...old, registrations: old.registrations.map((x) => (x.id === r.id ? { ...x, equipment_taken_at: stamp } : x)) } : old
    );
    const { error } = await supabase.from("jamaah_registrations").update({ equipment_taken_at: stamp }).eq("id", r.id);
    if (error) {
      queryClient.setQueryData(key, previous);
      toast.error("Perlengkapan belum bisa disimpan. Coba lagi.");
    } else {
      invalidate();
    }
  };

  const switchSeatSource = async () => {
    if (!pkg || !switchTo) return;
    const { data: updated, error } = await supabase.from("packages").update({ seat_source: switchTo }).eq("id", pkg.id).select("id");
    setSwitchTo(null);
    if (error || !updated?.length) toast.error(error ? "Pengaturan seat belum tersimpan. Coba lagi." : "Akun kamu tidak bisa mengubah paket ini.");
    else {
      toast.success(switchTo === "website" ? "Seat paket ini sekarang dihitung dari data jamaah di website" : "Seat kembali mengikuti Google Sheet");
      invalidate();
    }
  };

  const openNew = () => {
    setEditing(null);
    setRegOpen(true);
  };
  const openPay = (registrationId: string | null) => {
    setPayFor(registrationId);
    setPayOpen(true);
  };

  const sheetSeats = pkg?.slots_filled ?? 0;
  const websiteSeats = pkg?.slots_registered ?? 0;

  // The phone layout reads the same ordered rows as the table.
  const cardItems: CardItem[] = ordered.map(({ r, b, state, docs }) => ({
    id: r.id,
    name: r.full_name,
    groupId: r.group_id,
    cancelled: r.status === "cancelled",
    room: ROOM_SHORT[r.room_type] ?? r.room_type,
    agreed: b.agreed,
    discount: Number(r.discount),
    paid: b.paidVerified,
    pending: b.paidPending,
    outstanding: b.outstanding,
    state,
    phone: r.phone,
    meta: [r.domicile, agentName(r)].filter(Boolean).join(" · "),
    equipmentTaken: !!r.equipment_taken_at,
    docs: { done: docs.filter((d) => d.done).length, total: docs.length },
  }));
  const familySummary = (groupId: string): FamilySummary | undefined => {
    const members = families.get(groupId);
    if (!members?.length) return undefined;
    const fb = groupBalance(members.map((m) => m.b));
    return {
      name: groupName(groupId) ?? "Keluarga",
      count: members.length,
      paid: fb.paidVerified,
      pending: fb.paidPending,
      outstanding: fb.outstanding,
      state: groupPayState(members.map((m) => m.b)),
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Jamaah</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pendaftaran, pembayaran, dan kelengkapan dokumen per paket.</p>
        </div>
        <div className="w-full lg:w-[420px]">
          <Select
            value={packageId ?? ""}
            onValueChange={(v) => {
              setParams({ paket: v });
              setQuery("");
              setFilter("all");
            }}
          >
            <SelectTrigger aria-label="Pilih paket">
              <SelectValue placeholder={loadingPackages ? "Memuat paket..." : "Pilih paket"} />
            </SelectTrigger>
            <SelectContent>
              {/* Newest departure first; the list opens on the next departure by default (see packageId above). */}
              {[...packages].sort((a, b) => b.departure_date.localeCompare(a.departure_date)).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {fmtDay(p.departure_date)} · {p.package_name} · {p.duration_days}H
                  {p.departure_date < todayIso() ? " (sudah berangkat)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <JamaahViewSwitch active="paket" />

      {packagesError && !packages.length && (
        <LoadError what="Daftar paket" error={packagesError} onRetry={() => refetchPackages()} retrying={fetchingPackages} />
      )}

      {!pkg && !loadingPackages && !packagesError && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Belum ada paket berstatus Final atau Tayang.</CardContent></Card>
      )}

      {/* A failed load must not look like an empty package: zeros and "belum ada jamaah" would be a lie. */}
      {pkg && jamaahError && (
        <LoadError what="Data jamaah paket ini" error={jamaahError} onRetry={() => refetchJamaah()} retrying={fetchingJamaah} />
      )}

      {pkg && !jamaahError && (
        <>
          <section aria-label="Ringkasan" className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {[
              ["Jamaah aktif", `${active.length}`, pkg.slots_total ? `dari ${pkg.slots_total} seat` : undefined],
              ["Belum DP", `${totals.belum_dp}`, `DP min. ${juta(DP_MIN_PER_PAX)} / pax`],
              ["Lunas", `${totals.lunas}`, due ? `batas ${fmtDay(due)}` : undefined],
              ["Total tagihan", juta(totals.agreed)],
              ["Sudah masuk", juta(totals.paid), totals.pending ? `+${juta(totals.pending)} menunggu verifikasi` : undefined],
              ["Sisa tagihan", juta(totals.outstanding), due ? (daysUntil(due) < 0 ? `lewat ${-daysUntil(due)} hari dari ${DUE_LABEL}` : `${daysUntil(due)} hari ke ${DUE_LABEL}`) : undefined],
            ].map(([label, value, hint]) => (
              <StatCard key={label} label={label} value={value} hint={hint} />
            ))}
          </section>

          <Card>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm">
                <div className="font-medium">
                  Seat di website dihitung dari:{" "}
                  <Badge variant="outline" className={pkg.seat_source === "website" ? "bg-status-ok-bg text-status-ok-fg border-status-ok-border" : "bg-muted"}>
                    {pkg.seat_source === "website" ? "Data jamaah di sini" : "Google Sheet"}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  Google Sheet: {sheetSeats} terisi · Terdaftar di sini: {websiteSeats}
                  {pkg.seat_source === "sheet" && sheetSeats !== websiteSeats && " · belum cocok, import/lengkapi dulu sebelum dipindah"}
                </p>
              </div>
              {isOwner && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSwitchTo(pkg.seat_source === "website" ? "sheet" : "website")}
                >
                  {pkg.seat_source === "website" ? "Kembalikan ke Google Sheet" : "Pakai data di sini untuk seat"}
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Cari nama / no. WA" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari jamaah" />
              </div>
              <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <SelectTrigger className="sm:w-48" aria-label="Filter status bayar"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua jamaah aktif</SelectItem>
                  <SelectItem value="belum_dp">Belum DP</SelectItem>
                  <SelectItem value="dp">Sudah DP</SelectItem>
                  <SelectItem value="lunas">Lunas</SelectItem>
                  <SelectItem value="cancelled">Batal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 [@media(pointer:coarse)]:h-11"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}/daftar/${pkg.slug}`);
                    toast.success("Link pendaftaran disalin. Kirim ke jamaah atau agen.");
                  } catch {
                    toast.error("Link belum bisa disalin. Salin manual dari /daftar/" + pkg.slug);
                  }
                }}
              >
                <Link2 className="h-4 w-4" /> Salin link pendaftaran
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1 [@media(pointer:coarse)]:h-11" onClick={() => setImportOpen(true)}>
                <FileSpreadsheet className="h-4 w-4" /> Import dari Sheet
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1 [@media(pointer:coarse)]:h-11" onClick={() => setImportAllOpen(true)}>
                <FileSpreadsheet className="h-4 w-4" /> Import semua tab
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 [@media(pointer:coarse)]:h-11"
                disabled={!active.length}
                onClick={() =>
                  exportJamaahWorkbook({ packageName: pkg.package_name, departureDate: pkg.departure_date, registrations, payments, groups, agents })
                }
              >
                <Download className="h-4 w-4" /> Export Excel
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1 [@media(pointer:coarse)]:h-11" disabled={!active.length} onClick={() => openPay(null)}>
                <CreditCard className="h-4 w-4" /> Catat Pembayaran
              </Button>
              <Button type="button" size="sm" className="order-first col-span-2 gap-1 sm:order-none sm:col-span-1 [@media(pointer:coarse)]:h-11" onClick={openNew}>
                <Plus className="h-4 w-4" /> Tambah Jamaah
              </Button>
            </div>
          </div>

          <div className="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableCaption className="sr-only">Daftar jamaah {pkg.package_name}, berangkat {fmtDay(pkg.departure_date)}</TableCaption>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-10">No</TableHead>
                  <TableHead className={`min-w-[200px] ${STICKY_HEAD}`}>Nama</TableHead>
                  <TableHead>Kamar</TableHead>
                  <TableHead className="text-right">Tagihan</TableHead>
                  <TableHead className="text-right">Masuk</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-center">Perlengkapan</TableHead>
                  <TableHead className="text-center">Dokumen</TableHead>
                  <TableHead>Domisili / Start</TableHead>
                  <TableHead>Agen</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={13} className="py-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !visible.length && (
                  <TableRow>
                    <TableCell colSpan={13} className="py-10 text-center text-sm text-muted-foreground">
                      {registrations.length ? "Tidak ada jamaah yang cocok dengan filter." : (
                        <span className="inline-flex flex-col items-center gap-2">
                          <Users className="h-6 w-6" />
                          Belum ada jamaah di paket ini. Tambah satu per satu, atau import dari Google Sheet.
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )}
                {ordered.map(({ r, b, state, docs }, i) => {
                  const run = runAt.get(i);
                  const family = run ? families.get(run.group) ?? [] : [];
                  const fb = run ? groupBalance(family.map((m) => m.b)) : null;
                  const fstate = run ? groupPayState(family.map((m) => m.b)) : null;
                  const inFamily = !!run || coveredByRun.has(i);
                  // Two levels: the whole family is tinted lightly (the row background shows through the merged cells),
                  // and the person under the pointer gets a stronger tint on the cells that are theirs alone.
                  const hot = inFamily && hoverGroup === r.group_id ? "bg-muted/60 hover:bg-muted/60" : "";
                  const person = inFamily ? "[&:hover>td:not([rowspan]):not([data-sticky])]:bg-muted-foreground/15" : "";
                  const docsDone = docs.filter((d) => d.done).length;
                  return (
                    <TableRow
                      key={r.id}
                      className={`group/row cursor-pointer [&>td]:py-2 ${hot} ${person}`}
                      onClick={() => setDetail(r)}
                      onMouseEnter={inFamily ? () => setHoverGroup(r.group_id) : undefined}
                      onMouseLeave={inFamily ? () => setHoverGroup(null) : undefined}
                      onFocusCapture={inFamily ? () => setHoverGroup(r.group_id) : undefined}
                      onBlurCapture={inFamily ? () => setHoverGroup(null) : undefined}
                    >
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell data-sticky className={stickyNameCell(inFamily, !!hot)}>
                        <button
                          type="button"
                          className="-my-1 rounded-sm py-1 text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-haspopup="dialog"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetail(r);
                          }}
                        >
                          {r.full_name}
                        </button>
                        {[inFamily ? null : groupName(r.group_id), r.phone].some(Boolean) && (
                          <span className="block text-[13px] text-muted-foreground">
                            {[inFamily ? null : groupName(r.group_id), r.phone].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{ROOM_SHORT[r.room_type]}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {rupiah(b.agreed)}
                        {Number(r.discount) > 0 && <span className="block text-[13px] text-muted-foreground">diskon {rupiah(Number(r.discount))}</span>}
                      </TableCell>
                      {coveredByRun.has(i) ? null : run && fb && fstate ? (
                        <>
                          <TableCell rowSpan={run.length} className="whitespace-nowrap border-l text-right align-middle">
                            {rupiah(fb.paidVerified)}
                            {fb.paidPending > 0 && <span className="block text-[13px] text-status-warn-text">+{rupiah(fb.paidPending)} menunggu</span>}
                            <span className="block text-[13px] text-muted-foreground">{groupName(r.group_id)} · {family.length} orang</span>
                          </TableCell>
                          <TableCell rowSpan={run.length} className="whitespace-nowrap border-l text-right align-middle font-medium">
                            {rupiah(Math.max(0, fb.outstanding))}
                          </TableCell>
                          <TableCell rowSpan={run.length} className="border-l align-middle">
                            <Badge variant="outline" className={PAY_STATE_CLASS[fstate]}>{PAY_STATE_LABEL[fstate]}</Badge>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="whitespace-nowrap text-right">
                            {rupiah(b.paidVerified)}
                            {b.paidPending > 0 && <span className="block text-[13px] text-status-warn-text">+{rupiah(b.paidPending)} menunggu</span>}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-medium">{rupiah(Math.max(0, b.outstanding))}</TableCell>
                          <TableCell>
                            {r.status === "cancelled" ? (
                              <Badge variant="outline" className="bg-status-bad-bg text-status-bad-fg border-status-bad-border">Batal</Badge>
                            ) : (
                              <Badge variant="outline" className={PAY_STATE_CLASS[state]}>{PAY_STATE_LABEL[state]}</Badge>
                            )}
                          </TableCell>
                        </>
                      )}
                      <TableCell>{r.equipment_size || "–"}</TableCell>
                      <TableCell className="text-center [&:has([role=checkbox])]:pr-4" onClick={(e) => e.stopPropagation()}>
                        {/* The label makes the whole 44px square tappable; negative margins keep the row height. */}
                        <label
                          className="-my-2 mx-auto flex h-11 w-11 cursor-pointer items-center justify-center"
                          title={r.equipment_taken_at ? "Perlengkapan sudah diambil" : "Perlengkapan belum diambil"}
                        >
                          <Checkbox
                            checked={!!r.equipment_taken_at}
                            disabled={r.status === "cancelled"}
                            onCheckedChange={(c) => toggleEquipment(r, !!c)}
                            aria-label={`Perlengkapan ${r.full_name} sudah diambil`}
                          />
                        </label>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={docsDone === docs.length ? "text-status-ok-text" : "text-muted-foreground"}>
                          {docsDone}/{docs.length}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {r.domicile || "–"}
                        {r.start_city && r.start_city.toLowerCase() !== (r.domicile ?? "").toLowerCase() && (
                          <span className="block text-[13px] text-muted-foreground">Start {r.start_city}</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm" title={agentName(r) ?? undefined}>{agentName(r) || "–"}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {r.status === "active" && (
                          <Button type="button" size="sm" variant="outline" className="h-8 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:px-5" onClick={() => openPay(r.id)}>
                            Bayar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <JamaahCardList
            items={cardItems}
            family={familySummary}
            loading={isLoading}
            emptyText={registrations.length ? "Tidak ada jamaah yang cocok dengan filter." : "Belum ada jamaah di paket ini. Tambah satu per satu, atau import dari Google Sheet."}
            onOpen={(id) => setDetail(registrations.find((x) => x.id === id) ?? null)}
            onPay={openPay}
            onEquipment={(id, taken) => {
              const reg = registrations.find((x) => x.id === id);
              if (reg) toggleEquipment(reg, taken);
            }}
          />
        </>
      )}

      <RegistrationDialog open={regOpen} onOpenChange={setRegOpen} pkg={pkg} groups={groups} registration={editing} onSaved={invalidate} />
      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        registrations={registrations}
        payments={payments}
        groups={groups}
        registrationId={payFor}
        isOwner={isOwner}
        onSaved={invalidate}
      />
      <ImportSheetDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        pkg={pkg}
        registrations={registrations}
        agents={agents}
        isOwner={isOwner}
        onImported={invalidate}
      />
      <ImportWorkbookDialog
        open={importAllOpen}
        onOpenChange={setImportAllOpen}
        packages={packages}
        agents={agents}
        isOwner={isOwner}
        onImported={invalidate}
      />
      <RegistrationSheet
        registration={detail}
        payments={payments}
        agents={agents}
        groups={groups}
        departureDate={pkg?.departure_date}
        isOwner={isOwner}
        currentUserId={user?.id}
        onOpenChange={(o) => !o && setDetail(null)}
        onEdit={() => {
          setEditing(detail);
          setRegOpen(true);
        }}
        onPay={() => openPay(detail?.id ?? null)}
        onChanged={invalidate}
      />

      <AlertDialog open={!!switchTo} onOpenChange={(o) => !o && setSwitchTo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {switchTo === "website" ? "Hitung seat dari data jamaah di website?" : "Kembalikan seat ke Google Sheet?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {switchTo === "website"
                ? `Sisa seat di website akan dihitung dari ${websiteSeats} jamaah terdaftar di sini (Google Sheet saat ini: ${sheetSeats}). Sync Google Sheet tengah malam tidak lagi mengubah paket ini.`
                : "Sisa seat di website kembali mengikuti angka Google Sheet yang disinkronkan tiap tengah malam."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={switchSeatSource}>Ya, ubah</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
