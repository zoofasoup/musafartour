import { useState } from "react";
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
  Mail,
  Phone,
  Calendar,
  Award,
  Loader2,
  Key,
  Trash2,
  MoreHorizontal,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

interface Agent {
  id: string;
  user_id: string;
  email: string;
  phone: string;
  wa_number: string | null;
  name: string;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  total_sales: number;
  total_commission: number;
  available_balance: number;
  referral_code: string;
  referred_by_id: string | null;
  bank_name: string | null;
  bank_account: string | null;
  account_name: string | null;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  approved_at: string | null;
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-500", icon: Clock },
  active: { label: "Aktif", color: "bg-green-500", icon: CheckCircle },
  suspended: { label: "Suspended", color: "bg-red-500", icon: XCircle },
};

const levelConfig = {
  bronze: { label: "Bronze", color: "bg-amber-600" },
  silver: { label: "Silver", color: "bg-gray-400" },
  gold: { label: "Gold", color: "bg-yellow-500" },
  platinum: { label: "Platinum", color: "bg-purple-500" },
};

const AgentManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [logSaleAgent, setLogSaleAgent] = useState<Agent | null>(null);
  const [saleCustomerName, setSaleCustomerName] = useState("");
  const [saleCustomerPhone, setSaleCustomerPhone] = useState("");
  const [salePackageId, setSalePackageId] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [saleCommissionRate, setSaleCommissionRate] = useState("4.5");
  const [saleStatus, setSaleStatus] = useState("confirmed");
  const [saleNotes, setSaleNotes] = useState("");

  const resetSaleForm = () => {
    setLogSaleAgent(null);
    setSaleCustomerName("");
    setSaleCustomerPhone("");
    setSalePackageId("");
    setSaleAmount("");
    setSaleCommissionRate("4.5");
    setSaleStatus("confirmed");
    setSaleNotes("");
  };

  const { data: publishedPackages = [] } = useQuery({
    queryKey: ['agent-management-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('id, package_name, departure_date')
        .eq('status', 'published')
        .order('departure_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    if (!selectedAgent) return;
    
    setIsChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-password', {
        body: { userId: selectedAgent.user_id, newPassword }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Password agent berhasil diubah!");
      setNewPassword("");
    } catch (error: any) {
      toast.error("Gagal mengubah password: Pastikan Edge Function telah ter-deploy (" + error.message + ")");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Fetch agents
  const { data: agents = [], isLoading } = useQuery({
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

  // Update agent status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === 'active') {
        updateData.approved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('agents')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      toast.success("Status agent berhasil diupdate");
    },
    onError: (error) => {
      toast.error("Gagal mengupdate status: " + error.message);
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
      toast.success("Level agent berhasil diupdate");
    },
    onError: (error) => {
      toast.error("Gagal mengupdate level: " + error.message);
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
      toast.success("Agent berhasil dihapus");
    },
    onError: (error) => {
      toast.error("Gagal menghapus agent: " + error.message);
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
        _commission_rate: parseFloat(saleCommissionRate) || 4.5,
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
    onError: (error: any) => {
      toast.error("Gagal mencatat penjualan: " + error.message);
    },
  });

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = 
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.email.toLowerCase().includes(search.toLowerCase()) ||
      agent.phone.includes(search) ||
      agent.referral_code.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" 
      ? agent.status !== "pending" 
      : agent.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Stats
  const pendingCount = agents.filter(a => a.status === 'pending').length;
  const activeCount = agents.filter(a => a.status === 'active').length;
  const suspendedCount = agents.filter(a => a.status === 'suspended').length;

  const handleApprove = (agent: Agent) => {
    updateStatusMutation.mutate({ id: agent.id, status: 'active' });
  };

  const handleSuspend = (agent: Agent) => {
    updateStatusMutation.mutate({ id: agent.id, status: 'suspended' });
  };

  const handleReactivate = (agent: Agent) => {
    updateStatusMutation.mutate({ id: agent.id, status: 'active' });
  };

  const handleDelete = (agent: Agent) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus agen ${agent.name} secara permanen? Semua data terkait (komisi, riwayat) mungkin ikut terhapus.`)) {
      deleteAgentMutation.mutate(agent.id);
    }
  };

  // formatCurrency imported from utils

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          Kelola Agent
        </h1>
        <p className="text-muted-foreground mt-1">
          Kelola pendaftaran dan status agent Musafar Tour
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('pending')}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Menunggu Approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('active')}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Agent Aktif
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('suspended')}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Suspended
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{suspendedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="agent-search"
                placeholder="Cari nama, email, telepon, atau kode referral..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search || statusFilter !== "all" 
                ? "Tidak ada agent yang sesuai filter" 
                : "Belum ada agent terdaftar"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Kode Referral</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Penjualan</TableHead>
                    <TableHead>Terdaftar</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => {
                    const StatusIcon = statusConfig[agent.status].icon;
                    return (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{agent.name}</p>
                            <p className="text-sm text-muted-foreground">{agent.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {agent.referral_code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig[agent.status].color} text-white gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig[agent.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${levelConfig[agent.level].color} text-white`}>
                            {levelConfig[agent.level].label}
                          </Badge>
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
                              onClick={() => {
                                setSelectedAgent(agent);
                                setDetailOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {agent.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleApprove(agent)}
                                disabled={updateStatusMutation.isPending}
                                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <UserCheck className="h-4 w-4" />
                                Approve
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {agent.status === 'active' && (
                                  <DropdownMenuItem
                                    onClick={() => setLogSaleAgent(agent)}
                                    className="text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer"
                                  >
                                    <Receipt className="mr-2 h-4 w-4" />
                                    <span>Log Penjualan</span>
                                  </DropdownMenuItem>
                                )}
                                {agent.status === 'active' && (
                                  <DropdownMenuItem
                                    onClick={() => handleSuspend(agent)}
                                    className="text-amber-600 focus:bg-amber-50 focus:text-amber-700 cursor-pointer"
                                  >
                                    <UserX className="mr-2 h-4 w-4" />
                                    <span>Suspend</span>
                                  </DropdownMenuItem>
                                )}
                                {agent.status === 'suspended' && (
                                  <DropdownMenuItem 
                                    onClick={() => handleReactivate(agent)}
                                    className="text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer"
                                  >
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    <span>Aktifkan</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(agent)}
                                  className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer"
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

      {/* Agent Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
          {/* Header Gradient */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Award className="w-32 h-32" />
            </div>
            
            {selectedAgent && (
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{selectedAgent.name}</h2>
                    <p className="text-slate-300 flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4" /> {selectedAgent.email}
                    </p>
                  </div>
                  <Badge className={`${statusConfig[selectedAgent.status].color} border-0 text-white shadow-sm px-3 py-1`}>
                    {statusConfig[selectedAgent.status].label}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">Level:</span>
                    <Badge variant="outline" className={`${levelConfig[selectedAgent.level].color.replace('bg-', 'text-')} border-current`}>
                      {levelConfig[selectedAgent.level].label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">Referral:</span>
                    <code className="bg-slate-800 px-2 py-1 rounded text-emerald-400 font-mono text-sm border border-slate-700">
                      {selectedAgent.referral_code}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">Terdaftar:</span>
                    <span className="text-slate-200 text-sm">{format(new Date(selectedAgent.created_at), "dd MMM yyyy", { locale: id })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {selectedAgent && (
            <div className="p-6 sm:p-8 bg-slate-50 space-y-8 max-h-[60vh] overflow-y-auto">
              
              {/* Financial Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-500">Total Penjualan</span>
                  <span className="text-2xl font-bold text-slate-900">{selectedAgent.total_sales} <span className="text-sm font-normal text-slate-500">paket</span></span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-500">Total Komisi</span>
                  <span className="text-2xl font-bold text-slate-900">{formatCurrency(Number(selectedAgent.total_commission))}</span>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col gap-1">
                  <span className="text-sm font-medium text-emerald-700">Saldo Tersedia</span>
                  <span className="text-2xl font-bold text-emerald-600">{formatCurrency(Number(selectedAgent.available_balance))}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Contact & Settings */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Kontak & Level</h3>
                    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden divide-y divide-slate-100">
                      <div className="p-3 sm:p-4 flex items-center justify-between">
                        <span className="text-sm text-slate-500 flex items-center gap-2"><Phone className="h-4 w-4" /> Telepon</span>
                        <span className="font-medium text-sm text-slate-900">{selectedAgent.phone}</span>
                      </div>
                      <div className="p-3 sm:p-4 flex items-center justify-between">
                        <span className="text-sm text-slate-500 flex items-center gap-2"><Mail className="h-4 w-4" /> WhatsApp</span>
                        <span className="font-medium text-sm text-slate-900">{selectedAgent.wa_number || selectedAgent.phone}</span>
                      </div>
                      <div className="p-3 sm:p-4 flex items-center justify-between">
                        <span className="text-sm text-slate-500 flex items-center gap-2"><Award className="h-4 w-4" /> Ubah Level</span>
                        <Select 
                          value={selectedAgent.level} 
                          onValueChange={(value) => {
                            updateLevelMutation.mutate({ id: selectedAgent.id, level: value });
                            setSelectedAgent({ ...selectedAgent, level: value as any });
                          }}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs bg-slate-50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bronze">Bronze</SelectItem>
                            <SelectItem value="silver">Silver</SelectItem>
                            <SelectItem value="gold">Gold</SelectItem>
                            <SelectItem value="platinum">Platinum</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bank Info */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Informasi Bank</h3>
                    {selectedAgent.bank_name ? (
                      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 space-y-3">
                        <div>
                          <p className="text-xs text-slate-500">Bank</p>
                          <p className="font-medium text-sm text-slate-900">{selectedAgent.bank_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">No. Rekening</p>
                          <p className="font-medium text-sm text-slate-900 font-mono">{selectedAgent.bank_account}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Atas Nama</p>
                          <p className="font-medium text-sm text-slate-900">{selectedAgent.account_name}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-100/50 border border-slate-200 border-dashed rounded-xl p-6 text-center">
                        <p className="text-sm text-slate-500">Agent belum melengkapi data bank</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security Settings */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Keamanan & Akses</h3>
                    
                    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 space-y-5">
                      {/* Password Reset Force */}
                      <div>
                        <label className="text-sm font-medium text-slate-900 mb-2 block">Setel Ulang Password (Admin)</label>
                        <div className="flex gap-2 mb-2">
                          <div className="relative flex-1">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                              type="password" 
                              name="new-agent-password"
                              placeholder="Ketik password baru..." 
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="pl-9 bg-slate-50"
                              autoComplete="new-password"
                            />
                          </div>
                          <Button 
                            onClick={handleChangePassword}
                            disabled={isChangingPassword || !newPassword}
                            className="bg-slate-900 hover:bg-slate-800 text-white"
                          >
                            {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
                          </Button>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Fungsi ini akan mengganti password agent secara paksa. Membutuhkan Edge Function <code>admin-update-password</code> yang aktif.
                        </p>
                      </div>

                      <div className="h-px bg-slate-100 w-full" />

                      {/* Password Reset Email */}
                      <div>
                        <label className="text-sm font-medium text-slate-900 mb-2 block">Kirim Link Reset</label>
                        <p className="text-xs text-slate-500 mb-3">
                          Kirimkan email berisi tautan ke agent untuk mengatur ulang password mereka sendiri secara mandiri.
                        </p>
                        <Button 
                          variant="outline" 
                          className="w-full justify-center gap-2 hover:bg-slate-50 hover:text-slate-900"
                          onClick={async () => {
                            try {
                              const { error } = await supabase.auth.resetPasswordForEmail(selectedAgent.email, {
                                redirectTo: `${window.location.origin}/agent/login?reset=true`,
                              });
                              if (error) throw error;
                              toast.success("Link reset password telah dikirim ke email agent");
                            } catch (error: any) {
                              toast.error("Gagal mengirim email reset: " + error.message);
                            }
                          }}
                        >
                          <Mail className="h-4 w-4" />
                          Kirim Email Reset Password
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-100 p-4 sm:px-8 border-t border-slate-200 flex justify-end">
            <Button variant="outline" className="bg-white hover:bg-slate-50" onClick={() => setDetailOpen(false)}>
              Tutup Panel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                <Label>Komisi (%)</Label>
                <Input type="number" step="0.1" value={saleCommissionRate} onChange={(e) => setSaleCommissionRate(e.target.value)} />
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
            {saleAmount && saleCommissionRate && (
              <p className="text-xs text-muted-foreground">
                Estimasi komisi: {formatCurrency(Math.round((parseFloat(saleAmount) || 0) * (parseFloat(saleCommissionRate) || 0) / 100))}
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
