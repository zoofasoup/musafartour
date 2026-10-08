import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { AlertTriangle, Banknote, CheckCircle2, Download, FileText, Gavel, Hourglass, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { PayoutDialog } from "@/components/admin/commission/PayoutDialog";
import { DisputeDialog } from "@/components/admin/commission/DisputeDialog";
import { LEVEL_LABEL } from "@/components/admin/agents/agentData";
import {
  useAdminCommissionAdjustments,
  useAdminCommissions,
  useApproveCommissions,
  useLeadDisputes,
} from "@/hooks/useCommissionPayouts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  COMMISSION_TABS,
  HOLD_LABEL,
  commissionErrorMessage,
  groupByAgent,
  payoutBatchCsv,
  tabOf,
  type CommissionRow,
  type CommissionTab,
  type DisputeRow,
} from "@/lib/commissionPayout";
import { formatCurrency, todayJakarta } from "@/lib/utils";

const fmtDate = (d: string | null | undefined) =>
  d ? format(new Date(d.length === 10 ? `${d}T00:00:00` : d), "d MMM yyyy", { locale: localeId }) : "-";

const sum = (rows: CommissionRow[]) => rows.reduce((t, r) => t + Number(r.gross_amount), 0);

const isTab = (v: string | null): v is CommissionTab => COMMISSION_TABS.some((t) => t.value === v);

const CommissionPayouts = () => {
  const { user, userRole } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab: CommissionTab = isTab(params.get("tab")) ? (params.get("tab") as CommissionTab) : "layak";
  const setTab = (v: string) => {
    setParams({ tab: v }, { replace: true });
    setSelected(new Set());
  };

  const commissions = useAdminCommissions();
  const adjustments = useAdminCommissionAdjustments();
  const disputes = useLeadDisputes();
  const approve = useApproveCommissions();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmApprove, setConfirmApprove] = useState<{ as: "manajemen" | "finance"; ids: string[] } | null>(null);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [dispute, setDispute] = useState<DisputeRow | null>(null);

  // Management = superadmin, finance = finance (one role per user). The database enforces both and that the two approvers differ.
  const myApproval: "manajemen" | "finance" | null = userRole === "superadmin" ? "manajemen" : userRole === "finance" ? "finance" : null;
  const canPay = userRole === "admin" || userRole === "superadmin" || userRole === "finance";
  const canResolve = userRole === "admin" || userRole === "superadmin" || userRole === "agent_admin";

  const rows = useMemo(() => commissions.data ?? [], [commissions.data]);
  const buckets = useMemo(() => {
    const b: Record<CommissionTab, CommissionRow[]> = { menunggu: [], layak: [], disetujui: [], dibayar: [], ditahan: [] };
    for (const r of rows) b[tabOf(r)].push(r);
    return b;
  }, [rows]);

  const q = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      buckets[tab].filter(
        (r) =>
          !q ||
          r.agent_name.toLowerCase().includes(q) ||
          r.agent_code.toLowerCase().includes(q) ||
          r.customer_name.toLowerCase().includes(q) ||
          r.package_name.toLowerCase().includes(q),
      ),
    [buckets, tab, q],
  );

  // Rows the current tab lets you select: eligible ones for approval, approved ones for payout.
  const selectable = (r: CommissionRow) => (tab === "layak" ? !!myApproval && canApproveRow(r) === null : tab === "disetujui" ? canPay : false);

  const canApproveRow = (r: CommissionRow): string | null => {
    if (!myApproval) return "Hanya manajemen (superadmin) dan finance yang bisa menyetujui.";
    if (!r.nik_ok) return "NIK agen belum lengkap";
    if (myApproval === "manajemen") {
      if (r.approved_mgmt_by) return "Sudah kamu setujui sebagai manajemen";
      if (r.approved_fin_by && r.approved_fin_by === user?.id) return "Persetujuan kedua harus dari pengguna lain";
    } else {
      if (r.approved_fin_by) return "Sudah kamu setujui sebagai finance";
      if (r.approved_mgmt_by && r.approved_mgmt_by === user?.id) return "Persetujuan kedua harus dari pengguna lain";
    }
    return null;
  };

  useEffect(() => {
    // Drop selections that disappeared after a refresh (approved, paid, held).
    setSelected((s) => {
      const ids = new Set(visible.map((r) => r.sale_id));
      const next = new Set([...s].filter((id) => ids.has(id)));
      return next.size === s.size ? s : next;
    });
  }, [visible]);

  const selectedRows = visible.filter((r) => selected.has(r.sale_id));
  const selectableRows = visible.filter(selectable);
  const allSelected = selectableRows.length > 0 && selectableRows.every((r) => selected.has(r.sale_id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectableRows.map((r) => r.sale_id)));

  const runApprove = async () => {
    if (!confirmApprove) return;
    const { as, ids } = confirmApprove;
    setConfirmApprove(null);
    try {
      const res = await approve.mutateAsync({ ids, as });
      const skipped = res.skipped?.length ?? 0;
      if (skipped > 0) toast.warning(`${res.approved} disetujui, ${skipped} dilewati.`, { description: res.skipped[0]?.reason });
      else toast.success(res.approved === 1 ? "Komisi disetujui." : `${res.approved} komisi disetujui.`);
      setSelected(new Set());
    } catch (e) {
      toast.error(commissionErrorMessage(e));
    }
  };

  const openProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("commission-proofs").createSignedUrl(path, 120);
    if (error || !data?.signedUrl) {
      toast.error("Bukti transfer belum bisa dibuka. Coba lagi sebentar lagi.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const exportCsv = () => {
    const groups = groupByAgent(selectedRows);
    if (!groups.length) return;
    const blob = new Blob([payoutBatchCsv(groups)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-komisi-${todayJakarta()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const payGroups = useMemo(() => groupByAgent(selectedRows), [selectedRows]);
  const openAdjustments = (adjustments.data ?? []).filter((a) => a.status === "open");
  const openDisputes = (disputes.data ?? []).filter((d) => d.status === "open");

  const approvalChips = (r: CommissionRow) => (
    <div className="flex flex-wrap gap-1.5">
      <StatusBadge kind={r.approved_mgmt_by ? "ok" : "mute"} icon={r.approved_mgmt_by ? CheckCircle2 : Hourglass}>Manajemen</StatusBadge>
      <StatusBadge kind={r.approved_fin_by ? "ok" : "mute"} icon={r.approved_fin_by ? CheckCircle2 : Hourglass}>Finance</StatusBadge>
    </div>
  );

  const notes = (r: CommissionRow) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {!r.nik_ok && tab !== "dibayar" && <StatusBadge kind="bad" icon={AlertTriangle}>NIK belum lengkap</StatusBadge>}
      {r.hold_reason && <StatusBadge kind="mute">{HOLD_LABEL[r.hold_reason] ?? r.hold_reason}</StatusBadge>}
      {r.share_percent != null && <StatusBadge kind="info">{r.role === "bantuan" ? "Pembantu" : "Utama"} {r.share_percent}%</StatusBadge>}
      {r.reprice_diff != null && r.reprice_diff !== 0 && (
        <StatusBadge kind="warn">Selisih harga paket {formatCurrency(r.reprice_diff)}</StatusBadge>
      )}
      {Number(r.open_clawback) > 0 && tab === "disetujui" && (
        <StatusBadge kind="over">Potongan lama {formatCurrency(r.open_clawback)}</StatusBadge>
      )}
    </div>
  );

  const rowAction = (r: CommissionRow) => {
    if (tab === "layak") {
      const why = canApproveRow(r);
      if (!myApproval) return <span className="text-[13px] text-muted-foreground">Hanya lihat</span>;
      return (
        <div className="space-y-1">
          <Button size="sm" variant="outline" disabled={!!why} onClick={() => setConfirmApprove({ as: myApproval, ids: [r.sale_id] })}>
            Setujui sebagai {myApproval}
          </Button>
          {why && <p className="text-[12.5px] text-muted-foreground">{why}</p>}
        </div>
      );
    }
    if (tab === "dibayar") {
      return (
        <div className="space-y-1 text-[13px]">
          <p>{fmtDate(r.transfer_date ?? r.paid_at)}{r.transfer_reference ? `, ref ${r.transfer_reference}` : ""}</p>
          {r.proof_path && (
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => openProof(r.proof_path!)}>
              <FileText className="mr-1 h-3.5 w-3.5" aria-hidden /> Bukti transfer
            </Button>
          )}
        </div>
      );
    }
    return null;
  };

  const hasSelect = tab === "layak" || tab === "disetujui";
  const finalMoney = tab === "disetujui" || tab === "dibayar";

  const table = (list: CommissionRow[]) => (
    <>
      <div className="hidden rounded-lg border bg-card sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              {hasSelect && (
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Pilih semua" disabled={selectableRows.length === 0} />
                </TableHead>
              )}
              <TableHead>Agen</TableHead>
              <TableHead>Jamaah</TableHead>
              <TableHead className="text-right">Komisi</TableHead>
              <TableHead className="text-right">PPh 5%</TableHead>
              <TableHead className="text-right">Diterima</TableHead>
              <TableHead>{tab === "layak" ? "Persetujuan" : "Keterangan"}</TableHead>
              <TableHead>{tab === "dibayar" ? "Transfer" : "Aksi"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((r) => (
              <TableRow key={r.sale_id} data-state={selected.has(r.sale_id) ? "selected" : undefined}>
                {hasSelect && (
                  <TableCell>
                    <Checkbox
                      checked={selected.has(r.sale_id)}
                      onCheckedChange={() => toggle(r.sale_id)}
                      disabled={!selectable(r)}
                      aria-label={`Pilih ${r.customer_name}`}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <p className="font-semibold">{r.agent_name}</p>
                  <p className="text-[13px] text-muted-foreground">{r.agent_code} · {LEVEL_LABEL[r.agent_level as keyof typeof LEVEL_LABEL] ?? r.agent_level}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{r.customer_name}</p>
                  <p className="text-[13px] text-muted-foreground">{r.package_name} · {fmtDate(r.departure_date)}</p>
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(r.gross_amount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.tax_amount)}</TableCell>
                <TableCell className="text-right">{finalMoney ? <span className="font-medium">{formatCurrency(r.net_amount)}</span> : <span className="text-muted-foreground">{formatCurrency(r.net_amount)}</span>}</TableCell>
                <TableCell className="whitespace-normal">
                  {tab === "layak" ? approvalChips(r) : null}
                  {notes(r)}
                </TableCell>
                <TableCell className="whitespace-normal">{rowAction(r)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 sm:hidden">
        {list.map((r) => (
          <Card key={r.sale_id} className={selected.has(r.sale_id) ? "border-foreground" : undefined}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                {hasSelect && (
                  <Checkbox className="mt-1" checked={selected.has(r.sale_id)} onCheckedChange={() => toggle(r.sale_id)} disabled={!selectable(r)} aria-label={`Pilih ${r.customer_name}`} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.customer_name}</p>
                  <p className="text-[13px] text-muted-foreground">{r.package_name} · {fmtDate(r.departure_date)}</p>
                  <p className="mt-1 text-[13px]">{r.agent_name} · {r.agent_code} · {LEVEL_LABEL[r.agent_level as keyof typeof LEVEL_LABEL] ?? r.agent_level}</p>
                </div>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div><dt className="text-[12.5px] text-muted-foreground">Komisi</dt><dd className="font-medium">{formatCurrency(r.gross_amount)}</dd></div>
                <div><dt className="text-[12.5px] text-muted-foreground">PPh 5%</dt><dd>{formatCurrency(r.tax_amount)}</dd></div>
                <div><dt className="text-[12.5px] text-muted-foreground">Diterima</dt><dd className={finalMoney ? "font-medium" : "text-muted-foreground"}>{formatCurrency(r.net_amount)}</dd></div>
              </dl>
              {tab === "layak" && approvalChips(r)}
              {notes(r)}
              {rowAction(r)}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );

  const heldRows = buckets.ditahan.filter(
    (r) => !q || r.agent_name.toLowerCase().includes(q) || r.customer_name.toLowerCase().includes(q) || r.agent_code.toLowerCase().includes(q),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <Banknote className="h-7 w-7" aria-hidden />
          Pembayaran Komisi
        </h1>
        <p className="mt-1 text-muted-foreground">
          Komisi layak dibayar setelah jamaah berangkat. Butuh dua persetujuan dari dua pengguna berbeda, manajemen dan finance, lalu dibayar per agen dengan bukti transfer. PPh 5% dipotong dari komisi.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto flex-wrap justify-start">
            {COMMISSION_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                {t.label}
                <span className="text-[12.5px] text-muted-foreground">
                  {t.value === "ditahan" ? buckets.ditahan.length + openDisputes.length + openAdjustments.length : buckets[t.value].length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari agen, jamaah, atau paket" className="pl-9" aria-label="Cari" />
        </div>
      </div>

      {commissions.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : commissions.isError ? (
        <LoadError what="Komisi" error={commissions.error} onRetry={() => commissions.refetch()} retrying={commissions.isFetching} />
      ) : (
        <>
          {tab !== "ditahan" && (
            <p className="text-sm text-muted-foreground">
              {visible.length} komisi, total {formatCurrency(sum(visible))} (bruto)
            </p>
          )}

          {hasSelect && selected.size > 0 && (
            <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 shadow-sm">
              <p className="text-sm font-medium">
                {selected.size} komisi dipilih · {formatCurrency(sum(selectedRows))} bruto
                {tab === "disetujui" ? ` · ${payGroups.length} agen` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {tab === "layak" && myApproval && (
                  <Button onClick={() => setConfirmApprove({ as: myApproval, ids: selectedRows.map((r) => r.sale_id) })}>
                    <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
                    Setujui sebagai {myApproval} ({selected.size})
                  </Button>
                )}
                {tab === "disetujui" && (
                  <>
                    <Button variant="outline" onClick={exportCsv}>
                      <Download className="mr-2 h-4 w-4" aria-hidden />
                      Ekspor batch (CSV)
                    </Button>
                    <Button onClick={() => setPayoutOpen(true)} disabled={!canPay}>
                      <Banknote className="mr-2 h-4 w-4" aria-hidden />
                      Tandai dibayar ({payGroups.length} agen)
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === "ditahan" ? (
            <div className="space-y-8">
              <section className="space-y-3">
                <h2 className="text-lg font-bold">Komisi ditahan ({heldRows.length})</h2>
                <p className="text-sm text-muted-foreground">Agen tidak aktif atau sengketa lead belum diputuskan. Dilepas otomatis begitu syaratnya terpenuhi.</p>
                {heldRows.length === 0 ? <EmptyState icon={CheckCircle2} title="Tidak ada komisi yang ditahan" /> : table(heldRows)}
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold">Sengketa lead ({openDisputes.length})</h2>
                {disputes.isError ? (
                  <LoadError what="Sengketa lead" error={disputes.error} onRetry={() => disputes.refetch()} />
                ) : openDisputes.length === 0 ? (
                  <EmptyState icon={Gavel} title="Tidak ada sengketa lead yang terbuka" />
                ) : (
                  <div className="space-y-2">
                    {openDisputes.map((d) => (
                      <Card key={d.id}>
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-sm">
                            <p className="font-semibold">{d.contact_name ?? "Calon jamaah"}</p>
                            <p className="text-muted-foreground">
                              Lead terlindungi: {d.lead_agent_name ?? "-"} ({d.lead_agent_code ?? "-"}) · didaftarkan oleh {d.intake_agent_name ?? "-"} ({d.intake_agent_code ?? "-"})
                            </p>
                            <p className="text-[13px] text-muted-foreground">Sejak {fmtDate(d.created_at)}</p>
                          </div>
                          {canResolve ? (
                            <Button variant="outline" onClick={() => setDispute(d)}>
                              <Gavel className="mr-2 h-4 w-4" aria-hidden />
                              Putuskan
                            </Button>
                          ) : (
                            <span className="text-[13px] text-muted-foreground">Hanya lihat</span>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold">Potongan dari pembayaran berikutnya ({openAdjustments.length})</h2>
                <p className="text-sm text-muted-foreground">Jamaah batal atau refund setelah komisinya dibayar. Jumlah yang diterima agen dipotong otomatis dari pembayaran komisi berikutnya.</p>
                {adjustments.isError ? (
                  <LoadError what="Potongan komisi" error={adjustments.error} onRetry={() => adjustments.refetch()} />
                ) : openAdjustments.length === 0 ? (
                  <EmptyState icon={CheckCircle2} title="Tidak ada potongan yang terbuka" />
                ) : (
                  <div className="space-y-2">
                    {openAdjustments.map((a) => (
                      <Card key={a.id}>
                        <CardContent className="flex flex-col gap-1 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold">{a.agent_name} · {a.agent_code}</p>
                            <p className="text-muted-foreground">{a.customer_name ?? "-"}: {a.reason}</p>
                          </div>
                          <p className="font-semibold">{formatCurrency(a.remaining)}{a.settled_amount > 0 ? ` (dari ${formatCurrency(a.amount)})` : ""}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : visible.length === 0 ? (
            <EmptyState icon={Banknote} title={q ? "Tidak ada yang cocok dengan pencarian" : "Belum ada komisi di tahap ini"}>
              {!q && tab === "layak" ? "Komisi muncul di sini sejak hari keberangkatan jamaah." : undefined}
            </EmptyState>
          ) : (
            table(visible)
          )}
        </>
      )}

      <ConfirmDialog
        open={!!confirmApprove}
        onOpenChange={(o) => !o && setConfirmApprove(null)}
        title={`Setujui ${confirmApprove?.ids.length ?? 0} komisi sebagai ${confirmApprove?.as ?? ""}?`}
        description="Persetujuan kedua harus dari pengguna lain (manajemen dan finance). Komisi baru disetujui penuh setelah keduanya."
        confirmLabel="Ya, setujui"
        onConfirm={runApprove}
        busy={approve.isPending}
      />
      <PayoutDialog open={payoutOpen} onOpenChange={setPayoutOpen} groups={payGroups} />
      <DisputeDialog dispute={dispute} onOpenChange={(o) => !o && setDispute(null)} />
    </div>
  );
};

export default CommissionPayouts;
