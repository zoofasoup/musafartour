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
  Key
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

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = 
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.email.toLowerCase().includes(search.toLowerCase()) ||
      agent.phone.includes(search) ||
      agent.referral_code.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
    
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
                placeholder="Cari nama, email, telepon, atau kode referral..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
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
                                className="gap-1"
                              >
                                <UserCheck className="h-4 w-4" />
                                Approve
                              </Button>
                            )}
                            
                            {agent.status === 'active' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleSuspend(agent)}
                                disabled={updateStatusMutation.isPending}
                                className="gap-1"
                              >
                                <UserX className="h-4 w-4" />
                                Suspend
                              </Button>
                            )}
                            
                            {agent.status === 'suspended' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReactivate(agent)}
                                disabled={updateStatusMutation.isPending}
                                className="gap-1"
                              >
                                <UserCheck className="h-4 w-4" />
                                Aktifkan
                              </Button>
                            )}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Agent</DialogTitle>
            <DialogDescription>
              Informasi lengkap agent
            </DialogDescription>
          </DialogHeader>
          
          {selectedAgent && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nama</p>
                  <p className="font-medium">{selectedAgent.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={`${statusConfig[selectedAgent.status].color} text-white`}>
                    {statusConfig[selectedAgent.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </p>
                  <p className="font-medium">{selectedAgent.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Telepon
                  </p>
                  <p className="font-medium">{selectedAgent.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp</p>
                  <p className="font-medium">{selectedAgent.wa_number || selectedAgent.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kode Referral</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {selectedAgent.referral_code}
                  </code>
                </div>
              </div>

              {/* Level & Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Award className="h-3 w-3" /> Level
                  </p>
                  <Select 
                    value={selectedAgent.level} 
                    onValueChange={(value) => {
                      updateLevelMutation.mutate({ id: selectedAgent.id, level: value });
                      setSelectedAgent({ ...selectedAgent, level: value as any });
                    }}
                  >
                    <SelectTrigger className="mt-1">
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
                <div>
                  <p className="text-sm text-muted-foreground">Total Penjualan</p>
                  <p className="text-xl font-bold">{selectedAgent.total_sales}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Komisi</p>
                  <p className="text-xl font-bold">{formatCurrency(Number(selectedAgent.total_commission))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo Tersedia</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(Number(selectedAgent.available_balance))}</p>
                </div>
              </div>

              {/* Bank Info */}
              <div>
                <h4 className="font-medium mb-2">Informasi Bank</h4>
                {selectedAgent.bank_name ? (
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Bank</p>
                      <p className="font-medium">{selectedAgent.bank_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">No. Rekening</p>
                      <p className="font-medium">{selectedAgent.bank_account}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Atas Nama</p>
                      <p className="font-medium">{selectedAgent.account_name}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Belum mengisi data bank</p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Terdaftar:</span>
                  <span>{format(new Date(selectedAgent.created_at), "dd MMM yyyy HH:mm", { locale: id })}</span>
                </div>
                {selectedAgent.approved_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground">Diapprove:</span>
                    <span>{format(new Date(selectedAgent.approved_at), "dd MMM yyyy HH:mm", { locale: id })}</span>
                  </div>
                )}
              </div>

              {/* Account Actions */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">Ubah Password Agent (Super Admin)</h4>
                <div className="flex gap-2 max-w-md">
                  <Input 
                    type="password" 
                    placeholder="Masukkan password baru..." 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button 
                    onClick={handleChangePassword}
                    disabled={isChangingPassword || !newPassword}
                  >
                    {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ubah Password"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  *Catatan: Fitur ini membutuhkan <code>admin-update-password</code> Edge Function yang sudah di-deploy ke Supabase. Jika belum, Anda masih bisa menggunakan fungsi 'Kirim Link Reset Password' atau mendesploy fungsi tersebut.
                </p>
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 text-sm h-8"
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
                    <Mail className="h-3 w-3" />
                    Kirim Link Reset
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentManagement;
