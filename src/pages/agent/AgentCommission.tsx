import { useEffect, useState } from "react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Wallet,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  CreditCard,
  User,
  FileText,
  Hourglass,
  BadgeCheck,
  Banknote,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, type StatusKind } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { AgentPageHeader } from "@/components/agent/AgentPageHeader";
import { AgentStatCard } from "@/components/agent/AgentStatCard";
import { formatCurrency } from "@/lib/utils";

/** The statement shown to the agent: one row per jamaah, from list_my_commissions() (own rows only). */
interface MyCommission {
  sale_id: string;
  registration_id: string | null;
  customer_name: string;
  package_name: string;
  departure_date: string | null;
  role: string;
  share_percent: number | null;
  state: string;
  hold_reason: string | null;
  gross_amount: number;
  tax_amount: number;
  net_amount: number;
  eligible_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  transfer_date: string | null;
  transfer_reference: string | null;
  proof_path: string | null;
  created_at: string;
}

interface Adjustment {
  id: string;
  customer_name: string | null;
  amount: number;
  settled_amount: number;
  remaining: number;
  reason: string;
  status: string;
  created_at: string;
}

/** Old self-service requests: read only history. */
interface Withdrawal {
  id: string;
  amount: number;
  bank_name: string;
  bank_account: string;
  status: string;
  requested_at: string;
  admin_notes: string | null;
}

const BANK_LIST = [
  "Bank BCA",
  "Bank Mandiri",
  "Bank BNI",
  "Bank BRI",
  "Bank CIMB Niaga",
  "Bank Danamon",
  "Bank Permata",
  "Bank OCBC NISP",
  "Bank Panin",
  "Bank Maybank",
  "Bank BSI (Syariah)",
  "Bank Muamalat",
  "Bank BTPN",
  "Bank Jago",
  "Bank Jenius (BTPN)",
  "SeaBank",
  "Bank Neo Commerce",
  "Bank Digital BCA",
];

const COMMISSION_STATEMENT_NOTE =
  "Pencairan dilakukan admin setelah jamaah berangkat dan disetujui manajemen dan finance. Dipotong PPh 5%.";
const COMMISSION_WINDOW_NOTE = "Dibayarkan paling lambat H+2 setelah jamaah landing.";

type StateKey = "pending" | "held" | "eligible" | "approved" | "paid";

/** A held row (suspended agent, open lead dispute) is still PENDING in the database but shown as "Ditahan". */
const commissionStateKey = (c: Pick<MyCommission, "state" | "hold_reason">): StateKey =>
  c.state === "pending" && c.hold_reason ? "held" : (c.state as StateKey);

const STATE_LABEL: Record<StateKey, { kind: StatusKind; label: string }> = {
  pending: { kind: "warn", label: "Menunggu" },
  held: { kind: "mute", label: "Ditahan" },
  eligible: { kind: "info", label: "Layak dibayar" },
  approved: { kind: "info", label: "Disetujui" },
  paid: { kind: "ok", label: "Dibayar" },
};

const HOLD_TEXT: Record<string, string> = {
  suspended: "Ditahan sampai akun agenmu aktif kembali.",
  dispute: "Ditahan sampai manajemen memutuskan sengketa lead.",
};

const fmtDate = (d: string | null | undefined) =>
  d ? format(new Date(d.length === 10 ? `${d}T00:00:00` : d), "dd MMM yyyy", { locale: localeId }) : "-";

const sum = (rows: MyCommission[], pick: (c: MyCommission) => number) => rows.reduce((t, c) => t + Number(pick(c)), 0);

const CommissionStatusChip = ({ c }: { c: MyCommission }) => {
  const key = commissionStateKey(c);
  const s = STATE_LABEL[key] ?? { kind: "mute" as StatusKind, label: c.state };
  return <StatusBadge kind={s.kind} icon={key === "approved" ? CheckCircle2 : undefined}>{s.label}</StatusBadge>;
};

/** What the agent should read next to a row, by state. */
const rowInfo = (c: MyCommission): string => {
  const key = commissionStateKey(c);
  if (key === "held") return `${HOLD_TEXT[c.hold_reason ?? ""] ?? "Ditahan."}`;
  if (key === "paid") return `Dibayar ${fmtDate(c.transfer_date ?? c.paid_at)}${c.transfer_reference ? `, ref ${c.transfer_reference}` : ""}`;
  if (key === "approved") return `Disetujui ${fmtDate(c.approved_at)}. ${COMMISSION_WINDOW_NOTE}`;
  if (key === "eligible") return `Jamaah sudah berangkat. Menunggu persetujuan. ${COMMISSION_WINDOW_NOTE}`;
  return `Menunggu jamaah berangkat ${fmtDate(c.departure_date)}. ${COMMISSION_WINDOW_NOTE}`;
};

const AgentCommission = () => {
  const { agent, refreshAgent } = useAgentAuth();
  const [tab, setTab] = useState("all");

  // Bank setup modal (the payout goes to this account)
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank_name: agent?.bank_name || "",
    bank_account: agent?.bank_account || "",
    account_name: agent?.account_name || "",
  });

  useEffect(() => {
    refreshAgent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: commissionRows, isLoading, isError, refetch } = useQuery({
    queryKey: ["agent-commissions", agent?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_my_commissions");
      if (error) throw error;
      return (data ?? []) as MyCommission[];
    },
    enabled: !!agent?.id,
  });

  const { data: adjustments = [] } = useQuery({
    queryKey: ["agent-commission-adjustments", agent?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_my_commission_adjustments");
      if (error) throw error;
      return (data ?? []) as Adjustment[];
    },
    enabled: !!agent?.id,
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["agent-withdrawals", agent?.id, "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_withdrawals")
        .select("id, amount, bank_name, bank_account, status, requested_at, admin_notes")
        .eq("agent_id", agent!.id)
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Withdrawal[];
    },
    enabled: !!agent?.id,
  });

  const updateBankMutation = useMutation({
    mutationFn: async (data: typeof bankForm) => {
      if (!agent?.id) throw new Error("Agent not found");
      const { error } = await supabase
        .from("agents")
        .update({ bank_name: data.bank_name, bank_account: data.bank_account, account_name: data.account_name })
        .eq("id", agent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Informasi bank berhasil disimpan");
      setShowBankModal(false);
      refreshAgent();
    },
    onError: (error) => {
      console.error("Update bank info failed:", error);
      toast.error("Rekening belum tersimpan. Periksa koneksi kamu, lalu coba lagi.");
    },
  });

  const openProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("commission-proofs").createSignedUrl(path, 120);
    if (error || !data?.signedUrl) {
      toast.error("Bukti transfer belum bisa dibuka. Coba lagi sebentar lagi.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleSaveBank = () => {
    if (!bankForm.bank_name || !bankForm.bank_account || !bankForm.account_name) {
      toast.error("Semua kolom harus diisi");
      return;
    }
    updateBankMutation.mutate(bankForm);
  };

  const openBankModal = () => {
    setBankForm({
      bank_name: agent?.bank_name || "",
      bank_account: agent?.bank_account || "",
      account_name: agent?.account_name || "",
    });
    setShowBankModal(true);
  };

  // A failed background refresh must not hide rows that were already loaded.
  const commissions = commissionRows ?? [];
  const hasBankInfo = agent?.bank_name && agent?.bank_account && agent?.account_name;

  const by = (k: StateKey) => commissions.filter((c) => commissionStateKey(c) === k);
  const waiting = [...by("pending"), ...by("held")];
  const eligible = by("eligible");
  const approved = by("approved");
  const paid = by("paid");
  const openClawback = adjustments.filter((a) => a.status === "open").reduce((t, a) => t + Number(a.remaining), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Memuat" />
      </div>
    );
  }

  if (isError && commissionRows === undefined) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <AgentPageHeader title="Komisi" description="Status komisi tiap jamaah kamu" icon={Wallet} />
        <EmptyState
          icon={AlertCircle}
          title="Komisi belum bisa dimuat"
          action={<Button variant="outline" onClick={() => refetch()}>Coba lagi</Button>}
        >
          Periksa koneksi kamu, lalu coba lagi.
        </EmptyState>
      </div>
    );
  }

  const list = (rows: MyCommission[], empty: string) =>
    rows.length === 0 ? (
      <EmptyState icon={Wallet} title={empty}>Komisi muncul di sini setelah jamaah kamu lunas.</EmptyState>
    ) : (
      <>
        {/* Table from 640px */}
        <div className="hidden sm:block rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jamaah</TableHead>
                <TableHead className="text-right">Komisi</TableHead>
                <TableHead className="text-right">PPh 5%</TableHead>
                <TableHead className="text-right">Diterima</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const final = c.state === "approved" || c.state === "paid";
                return (
                  <TableRow key={c.sale_id}>
                    <TableCell>
                      <p className="font-semibold">{c.customer_name}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {c.package_name} · berangkat {fmtDate(c.departure_date)}
                      </p>
                      {c.share_percent != null && (
                        <p className="text-[13px] text-muted-foreground">
                          {c.role === "bantuan" ? "Bagian agen pembantu" : "Bagian agen utama"} {c.share_percent}%
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(c.gross_amount)}</TableCell>
                    <TableCell className="text-right">{final ? formatCurrency(c.tax_amount) : "-"}</TableCell>
                    <TableCell className="text-right font-medium">{final ? formatCurrency(c.net_amount) : "-"}</TableCell>
                    <TableCell><CommissionStatusChip c={c} /></TableCell>
                    <TableCell className="max-w-[280px] whitespace-normal text-[13px] text-muted-foreground">
                      {rowInfo(c)}
                      {c.proof_path && (
                        <Button variant="link" size="sm" className="h-auto p-0 pl-1" onClick={() => openProof(c.proof_path!)}>
                          <FileText className="mr-1 h-3.5 w-3.5" aria-hidden />
                          Bukti transfer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Cards under 640px */}
        <div className="space-y-3 sm:hidden">
          {rows.map((c) => {
            const final = c.state === "approved" || c.state === "paid";
            return (
              <Card key={c.sale_id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{c.customer_name}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {c.package_name} · berangkat {fmtDate(c.departure_date)}
                      </p>
                    </div>
                    <CommissionStatusChip c={c} />
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <dt className="text-[12.5px] text-muted-foreground">Komisi</dt>
                      <dd className="font-medium">{formatCurrency(c.gross_amount)}</dd>
                    </div>
                    <div>
                      <dt className="text-[12.5px] text-muted-foreground">PPh 5%</dt>
                      <dd>{final ? formatCurrency(c.tax_amount) : "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-[12.5px] text-muted-foreground">Diterima</dt>
                      <dd className="font-medium">{final ? formatCurrency(c.net_amount) : "-"}</dd>
                    </div>
                  </dl>
                  {c.share_percent != null && (
                    <p className="text-[13px] text-muted-foreground">
                      {c.role === "bantuan" ? "Bagian agen pembantu" : "Bagian agen utama"} {c.share_percent}%
                    </p>
                  )}
                  <p className="text-[13px] text-muted-foreground">{rowInfo(c)}</p>
                  {c.proof_path && (
                    <Button variant="outline" size="sm" onClick={() => openProof(c.proof_path!)}>
                      <FileText className="mr-2 h-4 w-4" aria-hidden />
                      Bukti transfer
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </>
    );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <AgentPageHeader title="Komisi" description="Status komisi tiap jamaah kamu" icon={Wallet} />

      <p className="flex items-start gap-2 rounded-lg border bg-card p-3 text-sm text-muted-foreground">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          {COMMISSION_STATEMENT_NOTE} {COMMISSION_WINDOW_NOTE} Biaya transfer ditanggung Musafar.
        </span>
      </p>

      {openClawback > 0 && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-status-warn-border bg-status-warn-bg p-3 text-sm text-status-warn-fg">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Ada potongan {formatCurrency(openClawback)} dari komisi yang sudah dibayar untuk jamaah yang kemudian batal atau refund.
            Jumlah ini dipotong dari pembayaran komisi kamu berikutnya.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AgentStatCard
          icon={Hourglass}
          label="Menunggu"
          value={formatCurrency(sum(waiting, (c) => c.gross_amount))}
          helper={<span className="text-muted-foreground">{waiting.length} jamaah, sebelum berangkat</span>}
        />
        <AgentStatCard
          icon={Clock}
          label="Layak dibayar"
          value={formatCurrency(sum(eligible, (c) => c.gross_amount))}
          helper={<span className="text-muted-foreground">{eligible.length} jamaah, menunggu persetujuan</span>}
        />
        <AgentStatCard
          icon={BadgeCheck}
          label="Disetujui"
          value={formatCurrency(sum(approved, (c) => c.net_amount))}
          helper={<span className="text-muted-foreground">{approved.length} jamaah, setelah PPh 5%</span>}
        />
        <AgentStatCard
          icon={Banknote}
          label="Dibayar"
          value={formatCurrency(sum(paid, (c) => c.net_amount))}
          helper={<span className="text-muted-foreground">{paid.length} jamaah, setelah PPh 5%</span>}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rekening tujuan</CardTitle>
          <CardDescription>Komisi yang sudah disetujui ditransfer admin ke rekening ini.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {hasBankInfo ? (
              <>
                <p className="font-medium">{agent?.bank_name} - {agent?.bank_account}</p>
                <p className="text-sm text-muted-foreground">a.n. {agent?.account_name}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Belum diatur. Atur rekening dulu supaya komisi bisa dikirim ke kamu.</p>
            )}
          </div>
          <Button variant={hasBankInfo ? "outline" : "default"} onClick={openBankModal}>
            {hasBankInfo ? "Ubah rekening" : "Atur rekening"}
          </Button>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="all">Semua ({commissions.length})</TabsTrigger>
          <TabsTrigger value="waiting">Menunggu ({waiting.length})</TabsTrigger>
          <TabsTrigger value="eligible">Layak dibayar ({eligible.length})</TabsTrigger>
          <TabsTrigger value="approved">Disetujui ({approved.length})</TabsTrigger>
          <TabsTrigger value="paid">Dibayar ({paid.length})</TabsTrigger>
          {withdrawals.length > 0 && <TabsTrigger value="old">Riwayat penarikan lama</TabsTrigger>}
        </TabsList>
        <TabsContent value="all">{list(commissions, "Belum ada komisi")}</TabsContent>
        <TabsContent value="waiting">{list(waiting, "Tidak ada komisi yang menunggu")}</TabsContent>
        <TabsContent value="eligible">{list(eligible, "Belum ada komisi yang layak dibayar")}</TabsContent>
        <TabsContent value="approved">{list(approved, "Belum ada komisi yang disetujui")}</TabsContent>
        <TabsContent value="paid">{list(paid, "Belum ada komisi yang dibayar")}</TabsContent>
        {withdrawals.length > 0 && (
          <TabsContent value="old">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Riwayat penarikan lama</CardTitle>
                <CardDescription>Permintaan penarikan sebelum pencairan dipegang admin. Hanya untuk dibaca.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{formatCurrency(w.amount)} · {w.bank_name} {w.bank_account}</p>
                      <p className="text-[13px] text-muted-foreground">{fmtDate(w.requested_at)}{w.admin_notes ? ` · ${w.admin_notes}` : ""}</p>
                    </div>
                    <StatusBadge kind={w.status === "paid" || w.status === "completed" ? "ok" : w.status === "rejected" ? "bad" : "warn"}>
                      {w.status === "paid" || w.status === "completed" ? "Dibayar" : w.status === "rejected" ? "Ditolak" : "Diproses"}
                    </StatusBadge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Bank Setup Modal */}
      <Dialog open={showBankModal} onOpenChange={setShowBankModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atur Rekening Bank</DialogTitle>
            <DialogDescription>Masukkan informasi rekening untuk pencairan komisi</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Nama Bank</Label>
              <Select value={bankForm.bank_name} onValueChange={(value) => setBankForm((prev) => ({ ...prev, bank_name: value }))}>
                <SelectTrigger id="bank_name">
                  <SelectValue placeholder="Pilih bank" />
                </SelectTrigger>
                <SelectContent>
                  {BANK_LIST.map((bank) => (
                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_account">Nomor Rekening</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="bank_account"
                  placeholder="1234567890"
                  value={bankForm.bank_account}
                  onChange={(e) => setBankForm((prev) => ({ ...prev, bank_account: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_name">Nama Pemilik Rekening</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="account_name"
                  placeholder="Nama sesuai rekening/KTP"
                  value={bankForm.account_name}
                  onChange={(e) => setBankForm((prev) => ({ ...prev, account_name: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <p className="text-[13px] text-muted-foreground">Pastikan nama sesuai dengan yang tertera di buku rekening/KTP</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBankModal(false)}>Batal</Button>
            <Button onClick={handleSaveBank} disabled={updateBankMutation.isPending}>
              {updateBankMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentCommission;
