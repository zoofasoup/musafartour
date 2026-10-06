import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { AgentDetailDialog } from "@/components/admin/agents/AgentDetailDialog";
import { WithdrawalsPanel } from "@/components/admin/agents/WithdrawalsPanel";
import {
  LEVEL_LABEL,
  agentWaNumber,
  approvedMessage,
  missingFields,
  approvalWarnings,
  waLink,
  type Agent,
  type Withdrawal,
} from "@/components/admin/agents/agentData";
import { toast } from "sonner";
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  Eye,
  Loader2,
  Trash2,
  MoreHorizontal,
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
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "penarikan" ? "penarikan" : "agen";
  const setTab = (value: string) => setSearchParams(value === "penarikan" ? { tab: "penarikan" } : {}, { replace: true });

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
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Agent[];
    },
  });

  // Fetch withdrawals (agent names are joined in memory from the agents list)
  const {
    data: withdrawals = [],
    isLoading: withdrawalsLoading,
    error: withdrawalsError,
    refetch: refetchWithdrawals,
  } = useQuery({
    queryKey: ['admin-agent-withdrawals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_withdrawals')
        .select('*')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return data as Withdrawal[];
    },
  });
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending').length;

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
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      toast.success("Agen berhasil dihapus");
    },
    onError: (error) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          Kelola Agent
        </h1>
        <p className="text-muted-foreground mt-1">
          Kelola pendaftaran, status, dan penarikan komisi agent Musafar Tour
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="agen">Agen</TabsTrigger>
          <TabsTrigger value="penarikan" className="gap-2">
            Penarikan
            {pendingWithdrawals > 0 && (
              <Badge variant="brand" className="h-5 min-w-5 justify-center px-1.5 text-xs" aria-label={`${pendingWithdrawals} menunggu`}>
                {pendingWithdrawals}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agen" className="mt-0 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('pending')}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Menunggu Persetujuan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingCount}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('active')}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Agen Aktif
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('suspended')}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Ditangguhkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{suspendedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Agen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="agent-search"
                placeholder="Cari nama, email, telepon, atau Agent ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter status">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="suspended">Ditangguhkan</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="w-full sm:w-[180px]" aria-label="Urutkan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending_first">Menunggu dulu</SelectItem>
                <SelectItem value="newest">Terbaru</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {agentsError ? (
            <LoadError what="Daftar agen" error={agentsError} onRetry={() => refetchAgents()} retrying={agentsRefetching} />
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAgents.length === 0 ? (
            <EmptyState icon={Users} title={search || statusFilter !== "all" ? "Tidak ada agen yang sesuai filter" : "Belum ada agen terdaftar"} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Agen</TableHead>
                    <TableHead>Agent ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Penjualan</TableHead>
                    <TableHead>Terdaftar</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => {
                    const badge = STATUS_BADGE[agent.status];
                    const incomplete = missingFields(agent).length > 0;
                    return (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-semibold">{agent.name}</p>
                            <p className="text-sm text-muted-foreground">{agent.email}</p>
                            {incomplete && <StatusBadge kind="warn">Data belum lengkap</StatusBadge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded-sm">
                            {agent.referral_code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <StatusBadge kind={badge.kind}>{badge.label}</StatusBadge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{LEVEL_LABEL[agent.level]}</Badge>
                        </TableCell>
                        <TableCell>{agent.total_sales} paket</TableCell>
                        <TableCell>
                          {format(new Date(agent.created_at), "dd MMM yyyy", { locale: id })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Lihat detail ${agent.name}`}
                              onClick={() => openDetail(agent)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {agent.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleApprove(agent)}
                                disabled={updateStatusMutation.isPending}
                                className="gap-1"
                              >
                                <UserCheck className="h-4 w-4" />
                                Setujui
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Aksi lain untuk ${agent.name}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {agent.status === 'active' && (
                                  <DropdownMenuItem onClick={() => setLogSaleAgent(agent)} className="cursor-pointer">
                                    <Receipt className="mr-2 h-4 w-4" />
                                    <span>Catat Penjualan</span>
                                  </DropdownMenuItem>
                                )}
                                {agent.status === 'active' && (
                                  <DropdownMenuItem onClick={() => handleSuspend(agent)} className="cursor-pointer">
                                    <UserX className="mr-2 h-4 w-4" />
                                    <span>Tangguhkan</span>
                                  </DropdownMenuItem>
                                )}
                                {agent.status === 'suspended' && (
                                  <DropdownMenuItem onClick={() => handleReactivate(agent)} className="cursor-pointer">
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    <span>Aktifkan</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleDelete(agent)}
                                  className="cursor-pointer text-destructive focus:bg-status-bad-bg focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Hapus Permanen</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="penarikan" className="mt-0">
          <WithdrawalsPanel
            withdrawals={withdrawals}
            agents={agents}
            loading={withdrawalsLoading}
            error={withdrawalsError}
            onRetry={() => refetchWithdrawals()}
          />
        </TabsContent>
      </Tabs>

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
            Agen ini dihapus permanen dan tidak bisa dikembalikan. Data terkait (komisi, riwayat penjualan) ikut hilang.
            {deleteHasMoney && <> Agen ini sudah punya penjualan atau komisi, jadi ketik namanya untuk melanjutkan. Kalau hanya ingin menghentikan akses, pakai Tangguhkan.</>}
          </>
        }
        confirmLabel="Hapus agen"
        destructive
        confirmText={deleteHasMoney ? deleteTarget?.name : undefined}
        busy={deleteAgentMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteAgentMutation.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
      />

      {/* Log a Sale Dialog - the only write path into agent_sales */}
      <Dialog open={!!logSaleAgent} onOpenChange={(open) => !open && resetSaleForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Penjualan · {logSaleAgent?.name}</DialogTitle>
            <DialogDescription>Catat penjualan yang sudah dikonfirmasi supaya komisi dan leaderboard agent ini ikut terupdate.</DialogDescription>
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
                  <SelectItem value="confirmed">Confirmed (komisi langsung masuk)</SelectItem>
                  <SelectItem value="pending">Pending (belum masuk komisi)</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan (opsional)</Label>
              <Textarea value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} rows={2} />
            </div>
            {saleAmount && (
              <p className="text-xs text-muted-foreground">
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
    </div>
  );
};

export default AgentManagement;
