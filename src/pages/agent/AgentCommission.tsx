import { useEffect, useState } from "react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { AlertCircle, Clock, CreditCard, FileText, Loader2, User, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AgentEmpty, AgentPage, AgentPanel, Chips, Figures, agentGlass, agentPrimary } from "@/components/agent/AgentPage";
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

const STATE_LABEL: Record<StateKey, string> = {
  pending: "Menunggu",
  held: "Ditahan",
  eligible: "Layak dibayar",
  approved: "Disetujui",
  paid: "Dibayar",
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
  return <span className="pkg-label shrink-0 whitespace-nowrap rounded-full bg-pkg-cream-2 px-3 py-1 text-[13px] text-pkg-fg">{STATE_LABEL[key] ?? c.state}</span>;
};

/** What the agent should read next to a row, by state. */
const rowInfo = (c: MyCommission): string => {
  const key = commissionStateKey(c);
  if (key === "held") return HOLD_TEXT[c.hold_reason ?? ""] ?? "Ditahan.";
  if (key === "paid") return `Dibayar ${fmtDate(c.transfer_date ?? c.paid_at)}${c.transfer_reference ? `, ref ${c.transfer_reference}` : ""}`;
  if (key === "approved") return `Disetujui ${fmtDate(c.approved_at)}`;
  if (key === "eligible") return "Jamaah sudah berangkat, menunggu persetujuan";
  return `Menunggu jamaah berangkat ${fmtDate(c.departure_date)}`;
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
      <AgentPage title="Komisi.">
        <AgentPanel last><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-pkg-fg-3" aria-label="Memuat" /></div></AgentPanel>
      </AgentPage>
    );
  }

  if (isError && commissionRows === undefined) {
    return (
      <AgentPage title="Komisi.">
        <AgentPanel last>
          <AgentEmpty icon={AlertCircle} text="Komisi belum bisa dimuat" action={<button type="button" className={agentGlass} onClick={() => refetch()}>Coba lagi</button>} />
        </AgentPanel>
      </AgentPage>
    );
  }

  const list = (rows: MyCommission[], empty: string) =>
    rows.length === 0 ? (
      <AgentEmpty icon={Wallet} text={empty} />
    ) : (
      <ul className="mt-2 divide-y divide-pkg-hair">
        {rows.map((c) => {
          const final = c.state === "approved" || c.state === "paid";
          return (
            <li key={c.sale_id} className="py-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[19px] leading-tight text-pkg-fg">{c.customer_name}</p>
                  <p className="mt-1 text-[14px] text-pkg-fg-3">{c.package_name} · berangkat {fmtDate(c.departure_date)}</p>
                </div>
                <CommissionStatusChip c={c} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3">
                <div><dt className="text-[13px] text-pkg-fg-3">Komisi</dt><dd className="mt-0.5 text-[16px] text-pkg-fg">{formatCurrency(c.gross_amount)}</dd></div>
                <div><dt className="text-[13px] text-pkg-fg-3">PPh 5%</dt><dd className="mt-0.5 text-[16px] text-pkg-fg">{final ? formatCurrency(c.tax_amount) : "-"}</dd></div>
                <div><dt className="text-[13px] text-pkg-fg-3">Diterima</dt><dd className="mt-0.5 text-[16px] text-pkg-fg">{final ? formatCurrency(c.net_amount) : "-"}</dd></div>
              </dl>
              {c.share_percent != null && <p className="mt-3 text-[14px] text-pkg-fg-3">{c.role === "bantuan" ? "Bagian agen pembantu" : "Bagian agen utama"} {c.share_percent}%</p>}
              <p className="mt-3 text-[14px] text-pkg-fg-3">{rowInfo(c)}</p>
              {c.proof_path && (
                <button type="button" className={`${agentGlass} mt-4`} onClick={() => openProof(c.proof_path!)}>
                  <FileText className="h-5 w-5" aria-hidden /> Bukti transfer
                </button>
              )}
            </li>
          );
        })}
      </ul>
    );

  return (
    <>
    <AgentPage
      title="Komisi."
      hero={
        <>
          <Figures
            cols={2}
            items={[
              { value: formatCurrency(sum(waiting, (c) => c.gross_amount)), label: "Menunggu", note: `${waiting.length} jamaah` },
              { value: formatCurrency(sum(eligible, (c) => c.gross_amount)), label: "Layak dibayar", note: `${eligible.length} jamaah` },
              { value: formatCurrency(sum(approved, (c) => c.net_amount)), label: "Disetujui", note: `${approved.length} jamaah, bersih` },
              { value: formatCurrency(sum(paid, (c) => c.net_amount)), label: "Dibayar", note: `${paid.length} jamaah, bersih` },
            ]}
          />
          <p className="mt-8 flex items-center gap-2 text-[14px] text-pkg-fg-3"><Clock className="h-4 w-4 shrink-0" aria-hidden /> Dibayar paling lambat H+2 setelah jamaah landing. PPh 5% dipotong.</p>
          {openClawback > 0 && (
            <p role="status" className="mt-3 flex items-center gap-2 text-[14px] text-pkg-red-bright"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> Potongan {formatCurrency(openClawback)} dari komisi berikutnya (jamaah batal atau refund).</p>
          )}
        </>
      }
    >
      <AgentPanel tone="cream-2">
        <h2 className="pkg-h3">Rekening</h2>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {hasBankInfo ? (
              <>
                <p className="text-[17px] text-pkg-fg">{agent?.bank_name} · {agent?.bank_account}</p>
                <p className="mt-0.5 text-[14px] text-pkg-fg-3">a.n. {agent?.account_name}</p>
              </>
            ) : (
              <p className="text-[17px] text-pkg-fg-2">Belum diatur</p>
            )}
          </div>
          <button type="button" className={hasBankInfo ? agentGlass : agentPrimary.replace("h-14", "h-12")} onClick={openBankModal}>
            {hasBankInfo ? "Ubah" : "Atur rekening"}
          </button>
        </div>
      </AgentPanel>

      <AgentPanel last>
        <Chips
          label="Filter komisi"
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: `Semua ${commissions.length}` },
            { value: "waiting", label: `Menunggu ${waiting.length}` },
            { value: "eligible", label: `Layak ${eligible.length}` },
            { value: "approved", label: `Disetujui ${approved.length}` },
            { value: "paid", label: `Dibayar ${paid.length}` },
            ...(withdrawals.length > 0 ? [{ value: "old", label: "Penarikan lama" }] : []),
          ]}
        />
        {tab === "all" && list(commissions, "Belum ada komisi")}
        {tab === "waiting" && list(waiting, "Tidak ada yang menunggu")}
        {tab === "eligible" && list(eligible, "Belum ada")}
        {tab === "approved" && list(approved, "Belum ada")}
        {tab === "paid" && list(paid, "Belum ada")}
        {tab === "old" && (
          <ul className="mt-2 divide-y divide-pkg-hair">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex items-start justify-between gap-3 py-6">
                <div className="min-w-0">
                  <p className="text-[17px] text-pkg-fg">{formatCurrency(w.amount)}</p>
                  <p className="mt-0.5 text-[14px] text-pkg-fg-3">{w.bank_name} {w.bank_account}</p>
                  <p className="text-[13px] text-pkg-fg-3">{fmtDate(w.requested_at)}{w.admin_notes ? ` · ${w.admin_notes}` : ""}</p>
                </div>
                <span className={`pkg-label shrink-0 rounded-full bg-pkg-cream-2 px-3 py-1 text-[13px] ${w.status === "rejected" ? "text-pkg-red-deep" : "text-pkg-fg"}`}>
                  {w.status === "paid" || w.status === "completed" ? "Dibayar" : w.status === "rejected" ? "Ditolak" : "Diproses"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AgentPanel>
    </AgentPage>

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
    </>
  );
};

export default AgentCommission;