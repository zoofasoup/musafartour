import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { Chips } from "@/components/agent/AgentPage";
import { AdminPage, AdminPanel } from "@/components/admin/AdminPage";
import { DataView, type RowAction } from "@/components/admin/DataView";
import { FilterBar } from "@/components/admin/FilterBar";
import type { FilterConfig } from "@/components/package-list/PackageFilterSheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { AgentDetailDialog } from "@/components/admin/agents/AgentDetailDialog";
import {
  LEVEL_LABEL,
  agentWaNumber,
  approvedMessage,
  missingFields,
  approvalWarnings,
  waLink,
  type Agent,
} from "@/components/admin/agents/agentData";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  UserX,
  Eye,
  Trash2,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

const STATUS_BADGE = {
  pending: { kind: "warn", label: "Calon Agen" },
  active: { kind: "ok", label: "Agen Aktif" },
  suspended: { kind: "bad", label: "Ditangguhkan" },
} as const;

type SortMode = "pending_first" | "newest";

const AgentManagement = () => {
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  // Set when the database refused a delete because the agent has commission or lead history (ADM-103)
  const [blockedDelete, setBlockedDelete] = useState<Agent | null>(null);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("pending_first");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<Agent | null>(null);

  const [logSaleAgent, setLogSaleAgent] = useState<Agent | null>(null);
  const [saleCustomerName, setSaleCustomerName] = useState("");
  const [saleCustomerPhone, setSaleCustomerPhone] = useState("");
  const [salePackageId, setSalePackageId] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [saleCommissionAmount, setSaleCommissionAmount] = useState("");
  const [saleStatus, setSaleStatus] = useState("confirmed");
  const [saleNotes, setSaleNotes] = useState("");

  const resetSaleForm = () => {
    setLogSaleAgent(null);
    setSaleCustomerName("");
    setSaleCustomerPhone("");
    setSalePackageId("");
    setSaleAmount("");
    setSaleCommissionAmount("");
    setSaleStatus("confirmed");
    setSaleNotes("");
  };

  const { data: publishedPackages = [] } = useQuery({
    queryKey: ['agent-management-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('id, package_name, departure_date, agent_commission_amount')
        .eq('status', 'published')
        .order('departure_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch agents
  const { data: agents = [], isLoading, error: agentsError, refetch: refetchAgents, isRefetching: agentsRefetching } = useQuery({
    queryKey: ['admin-agents'],
    // Agents fill in their data while the admin has this page open: always show the latest.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Agent[];
    },
  });

  const selectedAgent = agents.find((a) => a.id === selectedId) ?? null;

  // Update agent status mutation. Approving a pending agent offers a WhatsApp message (no email provider yet).
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string; notify?: Agent }) => {
      const updateData: { status: string; approved_at?: string } = { status };
      if (status === 'active') {
        updateData.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('agents')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      const agent = vars.notify;
      if (!agent) {
        toast.success("Status agen berhasil diperbarui");
        return;
      }
      const wa = agentWaNumber(agent);
      if (!wa) {
        toast.success(`${agent.name} disetujui`, {
          description: "Nomor WhatsApp asli belum ada, jadi kabari lewat cara lain.",
          duration: 10000,
        });
        return;
      }
      toast.success(`${agent.name} disetujui`, {
        duration: 15000,
        action: {
          label: "Kabari via WhatsApp",
          onClick: () => window.open(waLink(wa, approvedMessage(agent)), "_blank", "noopener,noreferrer"),
        },
      });
    },
    onError: (error) => {
      toast.error("Gagal memperbarui status: " + error.message);
    },
  });

  // Update agent level mutation
  const updateLevelMutation = useMutation({
    mutationFn: async ({ id, level }: { id: string; level: string }) => {
      const { error } = await supabase
        .from('agents')
        .update({ level })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      toast.success("Level agen berhasil diperbarui");
    },
    onError: (error) => {
      toast.error("Gagal memperbarui level: " + error.message);
    },
  });

  // Registration fee: staff mark it received (paid + paid_at) or waive it
  const updateFeeMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "paid" | "waived" }) => {
      const { error } = await supabase
        .from('agents')
        .update({ registration_fee_status: status, registration_fee_paid_at: status === 'paid' ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      toast.success(v.status === 'paid' ? "Biaya registrasi ditandai diterima" : "Biaya registrasi dibebaskan");
    },
    onError: (error) => {
      toast.error("Gagal memperbarui biaya registrasi: " + error.message);
    },
  });

  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string) => {
      // Removes the agent and the login account together (a leftover account blocks the same email from registering again).
      const { data: { session } } = await supabase.auth.getSession();
      let data: { ok?: boolean; error?: string; account_removed?: boolean } | null = null;
      try {
        const res = await fetch("/api/admin-hapus-agen", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token ?? ""}` },
          body: JSON.stringify({ agent_id: id }),
        });
        data = (await res.json().catch(() => null)) as typeof data;
      } catch {
        data = null;
      }
      if (data?.ok) {
        if (data.account_removed === false) toast.warning("Agen dihapus, tapi akun login-nya belum terhapus. Hapus manual di Supabase.");
        return;
      }
      if (data?.error) throw new Error(data.error); // a real refusal (history, not an admin...): show it as is
      // No usable answer (the endpoint is not there, e.g. a local dev server): remove just the agent row as before.
      const { error } = await supabase.from('agents').delete().eq('id', id);
      if (error) throw error;
      toast.warning(`Agen dihapus, tapi akun login-nya masih ada. Hapus di Supabase → Authentication supaya emailnya bisa daftar lagi.`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      toast.success("Agen berhasil dihapus");
    },
    onError: (error) => {
      if (/riwayat komisi atau lead|foreign key|violates/i.test(error.message)) return; // handled by the Nonaktifkan dialog
      toast.error("Gagal menghapus agen: " + error.message);
    },
  });

  // Log a sale mutation - the only write path into agent_sales; also keeps
  // total_sales/total_commission/available_balance on `agents` in sync
  // (those are stored columns, not derived on the fly).
  const logSaleMutation = useMutation({
    mutationFn: async () => {
      if (!logSaleAgent) return;
      const pkg = publishedPackages.find((p) => p.id === salePackageId);
      const { error } = await supabase.rpc('log_agent_sale', {
        _agent_id: logSaleAgent.id,
        _customer_name: saleCustomerName.trim(),
        _customer_phone: saleCustomerPhone.trim(),
        _package_id: salePackageId || null,
        _package_name: pkg?.package_name || "",
        _sale_amount: parseFloat(saleAmount),
        _commission_amount: parseFloat(saleCommissionAmount) || pkg?.agent_commission_amount || 0,
        _departure_date: pkg?.departure_date || null,
        _status: saleStatus,
        _notes: saleNotes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      toast.success("Penjualan berhasil dicatat");
      resetSaleForm();
    },
    onError: (error: Error) => {
      toast.error("Gagal mencatat penjualan: " + error.message);
    },
  });

  // Filter + sort agents
  const filteredAgents = useMemo(() => {
    const q = search.toLowerCase();
    const list = agents.filter(agent => {
      const matchesSearch =
        agent.name.toLowerCase().includes(q) ||
        agent.email.toLowerCase().includes(q) ||
        agent.phone.includes(search) ||
        agent.referral_code.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    if (sortMode === "pending_first") {
      // Array.sort is stable, so inside each group the newest-first order from the query is kept.
      return [...list].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'));
    }
    return list;
  }, [agents, search, statusFilter, sortMode]);

  // Stats
  const pendingCount = agents.filter(a => a.status === 'pending').length;
  const activeCount = agents.filter(a => a.status === 'active').length;
  const suspendedCount = agents.filter(a => a.status === 'suspended').length;

  const approve = (agent: Agent) => {
    setApproveTarget(null);
    updateStatusMutation.mutate({ id: agent.id, status: 'active', notify: agent });
  };

  // Identity fields missing: ask before approving blindly.
  const handleApprove = (agent: Agent) => {
    if (approvalWarnings(agent).length > 0) setApproveTarget(agent);
    else approve(agent);
  };

  const handleSuspend = (agent: Agent) => {
    updateStatusMutation.mutate({ id: agent.id, status: 'suspended' });
  };

  const handleReactivate = (agent: Agent) => {
    updateStatusMutation.mutate({ id: agent.id, status: 'active' });
  };

  const handleDelete = (agent: Agent) => setDeleteTarget(agent);

  // An agent who already earned something is typed-name protected: the commission history goes with the agent.
  const deleteHasMoney = !!deleteTarget && (Number(deleteTarget.total_commission) > 0 || Number(deleteTarget.available_balance) > 0 || Number(deleteTarget.total_sales) > 0);

  const openDetail = (agent: Agent) => {
    setSelectedId(agent.id);
    setDetailOpen(true);
  };

  const approveMissing = approveTarget ? approvalWarnings(approveTarget) : [];

  const filters: FilterConfig[] = [
    {
      key: "sort",
      value: sortMode === "pending_first" ? "all" : sortMode,
      onChange: (v) => setSortMode(v === "all" ? "pending_first" : (v as SortMode)),
      placeholder: "Urutkan",
      allLabel: "Menunggu dulu",
      options: [{ value: "newest", label: "Terbaru" }],
    },
  ];
  const actions: RowAction<Agent>[] = [
    { label: "Setujui", icon: UserCheck, onSelect: handleApprove, hidden: (a) => a.status !== "pending" },
    { label: "Lihat detail", icon: Eye, onSelect: openDetail },
    { label: "Catat Penjualan", icon: Receipt, onSelect: (a) => setLogSaleAgent(a), hidden: (a) => a.status !== "active" },
    { label: "Tangguhkan", icon: UserX, onSelect: handleSuspend, hidden: (a) => a.status !== "active" },
    { label: "Aktifkan", icon: UserCheck, onSelect: handleReactivate, hidden: (a) => a.status !== "suspended" },
    { label: "Hapus Permanen", icon: Trash2, onSelect: handleDelete, destructive: true },
  ];
  const notes = (a: Agent) =>
    [
      missingFields(a).length > 0 ? "Data belum lengkap" : null,
      a.status === "active" && (a.registration_fee_status ?? "unpaid") === "unpaid" ? "Menunggu biaya" : null,
    ].filter(Boolean).join(" · ");

  return (
    <AdminPage
      title="Kelola Agen"
      intro="Pendaftaran, status, dan level agen. Persetujuan dan pembayaran komisi ada di Pembayaran Komisi"
      tabs={
        <Chips<string>
          label="Status agen"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: `Semua ${agents.length}` },
            { value: "pending", label: `Menunggu ${pendingCount}` },
            { value: "active", label: `Aktif ${activeCount}` },
            { value: "suspended", label: `Ditangguhkan ${suspendedCount}` },
          ]}
        />
      }
    >
      <AdminPanel last>
        <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Cari nama, email, telepon, atau Agent ID" filters={filters} onReset={() => setSortMode("pending_first")} count={filteredAgents.length} title="Urutkan" unit="agen" />
        <DataView
          rows={filteredAgents}
          rowKey={(a) => a.id}
          loading={isLoading}
          error={agentsError}
          onRetry={() => refetchAgents()}
          retrying={agentsRefetching}
          what="Daftar agen"
          empty={{ icon: Users, text: search || statusFilter !== "all" ? "Tidak ada agen yang sesuai" : "Belum ada agen terdaftar" }}
          onOpen={openDetail}
          actions={actions}
          inlineActions={(a) =>
            a.status === "pending" ? (
              <Button size="sm" className="gap-1" onClick={() => handleApprove(a)} disabled={updateStatusMutation.isPending}>
                <UserCheck className="h-4 w-4" aria-hidden /> Setujui
              </Button>
            ) : null
          }
          columns={[
            { key: "agent", header: "Agen", cell: (a) => <><span className="font-medium">{a.name}</span><span className="block text-xs text-pkg-fg-3">{a.email}</span>{notes(a) && <span className="block text-xs text-pkg-red-deep">{notes(a)}</span>}</> },
            { key: "code", header: "Agent ID", cell: (a) => <code className="text-sm">{a.referral_code}</code> },
            { key: "status", header: "Status", cell: (a) => <StatusBadge kind={STATUS_BADGE[a.status].kind}>{STATUS_BADGE[a.status].label}</StatusBadge> },
            { key: "level", header: "Level", cell: (a) => LEVEL_LABEL[a.level] },
            { key: "sales", header: "Penjualan", cell: (a) => `${a.total_sales} paket` },
            { key: "at", header: "Terdaftar", cell: (a) => format(new Date(a.created_at), "dd MMM yyyy", { locale: id }) },
          ]}
          card={{
            title: (a) => a.name,
            subtitle: (a) => `${a.referral_code} · ${LEVEL_LABEL[a.level]}`,
            meta: (a) => notes(a) || `${a.total_sales} paket · ${format(new Date(a.created_at), "d MMM yyyy", { locale: id })}`,
            status: (a) => <StatusBadge kind={STATUS_BADGE[a.status].kind}>{STATUS_BADGE[a.status].label}</StatusBadge>,
          }}
        />
      </AdminPanel>

      <AgentDetailDialog
        agent={selectedAgent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onLevelChange={(agent, level) => updateLevelMutation.mutate({ id: agent.id, level })}
        onFeeChange={(agent, status) => updateFeeMutation.mutate({ id: agent.id, status })}
        onApprove={(agent) => {
          setDetailOpen(false);
          handleApprove(agent);
        }}
        approving={updateStatusMutation.isPending}
      />

      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(o) => !o && setApproveTarget(null)}
        title="Setujui agen ini?"
        description={
          <>
            Ada hal yang belum beres. Setujui tetap?
            {approveMissing.length > 0 && <> Yang belum: <span className="font-semibold text-foreground">{approveMissing.join(", ")}</span>.</>}
          </>
        }
        confirmLabel="Setujui tetap"
        onConfirm={() => approveTarget && approve(approveTarget)}
        busy={updateStatusMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Hapus agen ${deleteTarget?.name ?? ""}?`}
        description={
          <>
            Agen ini dihapus permanen dan tidak bisa dikembalikan. Hanya agen tanpa riwayat komisi atau lead yang bisa dihapus; selain itu, nonaktifkan saja.
            {deleteHasMoney && <> Agen ini sudah punya penjualan atau komisi, jadi ketik namanya untuk melanjutkan. Kalau hanya ingin menghentikan akses, pakai Tangguhkan.</>}
          </>
        }
        confirmLabel="Hapus agen"
        destructive
        confirmText={deleteHasMoney ? deleteTarget?.name : undefined}
        busy={deleteAgentMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          deleteAgentMutation.mutate(target.id, {
            onError: (e) => {
              if (/riwayat komisi atau lead|foreign key|violates/i.test(e.message)) setBlockedDelete(target);
            },
            onSettled: () => setDeleteTarget(null),
          });
        }}
      />

      <ConfirmDialog
        open={!!blockedDelete}
        onOpenChange={(o) => !o && setBlockedDelete(null)}
        title={`${blockedDelete?.name ?? "Agen ini"} tidak bisa dihapus`}
        description="Agen punya riwayat komisi atau lead, jadi tidak bisa dihapus. Nonaktifkan agen saja: akses ditutup, riwayat tetap tersimpan, dan agen bisa diaktifkan lagi."
        confirmLabel="Nonaktifkan agen"
        busy={updateStatusMutation.isPending}
        onConfirm={() => {
          if (!blockedDelete) return;
          updateStatusMutation.mutate({ id: blockedDelete.id, status: 'suspended' });
          setBlockedDelete(null);
        }}
      />

      {/* Log a Sale Dialog - the only write path into agent_sales */}
      <Dialog open={!!logSaleAgent} onOpenChange={(open) => !open && resetSaleForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Penjualan · {logSaleAgent?.name}</DialogTitle>
            <DialogDescription>Catat penjualan yang sudah dikonfirmasi supaya komisi dan papan peringkat agen ini ikut diperbarui.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nama Pelanggan</Label>
              <Input value={saleCustomerName} onChange={(e) => setSaleCustomerName(e.target.value)} placeholder="Nama..." />
            </div>
            <div className="space-y-1.5">
              <Label>No. WhatsApp Pelanggan</Label>
              <Input value={saleCustomerPhone} onChange={(e) => setSaleCustomerPhone(e.target.value)} placeholder="08..." />
            </div>
            <div className="space-y-1.5">
              <Label>Paket</Label>
              <Select value={salePackageId} onValueChange={setSalePackageId}>
                <SelectTrigger><SelectValue placeholder="Pilih paket..." /></SelectTrigger>
                <SelectContent>
                  {publishedPackages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.package_name} · {format(new Date(p.departure_date), "d MMM yyyy", { locale: id })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nilai Penjualan (Rp)</Label>
                <Input type="number" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} placeholder="35000000" />
              </div>
              <div className="space-y-1.5">
                <Label>Komisi (Rp)</Label>
                <Input
                  type="number"
                  value={saleCommissionAmount}
                  onChange={(e) => setSaleCommissionAmount(e.target.value)}
                  placeholder={String(publishedPackages.find((p) => p.id === salePackageId)?.agent_commission_amount ?? "500000")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={saleStatus} onValueChange={setSaleStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Terkonfirmasi (komisi langsung masuk)</SelectItem>
                  <SelectItem value="pending">Menunggu (belum masuk komisi)</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan (opsional)</Label>
              <Textarea value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} rows={2} />
            </div>
            {saleAmount && (
              <p className="text-xs text-pkg-fg-3">
                Estimasi komisi: {formatCurrency(parseFloat(saleCommissionAmount) || publishedPackages.find((p) => p.id === salePackageId)?.agent_commission_amount || 0)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetSaleForm}>Batal</Button>
            <Button
              onClick={() => logSaleMutation.mutate()}
              disabled={
                logSaleMutation.isPending ||
                !saleCustomerName.trim() ||
                !saleCustomerPhone.trim() ||
                !salePackageId ||
                !saleAmount ||
                parseFloat(saleAmount) <= 0
              }
            >
              {logSaleMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
};

export default AgentManagement;
