import { useState } from "react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  Wallet, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  Building2,
  CreditCard,
  User,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface Sale {
  id: string;
  customer_name: string;
  customer_phone: string;
  package_name: string;
  sale_amount: number;
  commission_amount: number;
  commission_rate: number;
  status: string;
  booking_date: string;
  departure_date: string | null;
}

interface Withdrawal {
  id: string;
  amount: number;
  bank_name: string;
  bank_account: string;
  account_name: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
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
  "Bank Digital BCA"
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const AgentCommission = () => {
  const { agent, refreshAgent } = useAgentAuth();
  const queryClient = useQueryClient();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("booking_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Withdrawal form
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  
  // Bank setup modal
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank_name: agent?.bank_name || "",
    bank_account: agent?.bank_account || "",
    account_name: agent?.account_name || "",
  });

  // Fetch sales data
  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['agent-sales', agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data, error } = await supabase
        .from('agent_sales')
        .select('*')
        .eq('agent_id', agent.id)
        .order('booking_date', { ascending: false });
      
      if (error) throw error;
      return data as Sale[];
    },
    enabled: !!agent?.id,
  });

  // Fetch withdrawals
  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useQuery({
    queryKey: ['agent-withdrawals', agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data, error } = await supabase
        .from('agent_withdrawals')
        .select('*')
        .eq('agent_id', agent.id)
        .order('requested_at', { ascending: false });
      
      if (error) throw error;
      return data as Withdrawal[];
    },
    enabled: !!agent?.id,
  });

  // Update bank info mutation
  const updateBankMutation = useMutation({
    mutationFn: async (data: typeof bankForm) => {
      if (!agent?.id) throw new Error("Agent not found");
      const { error } = await supabase
        .from('agents')
        .update({
          bank_name: data.bank_name,
          bank_account: data.bank_account,
          account_name: data.account_name,
        })
        .eq('id', agent.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Informasi bank berhasil disimpan");
      setShowBankModal(false);
      refreshAgent();
    },
    onError: (error) => {
      toast.error("Gagal menyimpan: " + (error as Error).message);
    },
  });

  // Request withdrawal mutation
  const withdrawMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!agent?.id) throw new Error("Agent not found");
      
      const { error } = await supabase
        .from('agent_withdrawals')
        .insert({
          agent_id: agent.id,
          amount,
          bank_name: agent.bank_name!,
          bank_account: agent.bank_account!,
          account_name: agent.account_name!,
          status: 'pending',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Permintaan penarikan berhasil diajukan");
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      queryClient.invalidateQueries({ queryKey: ['agent-withdrawals'] });
    },
    onError: (error) => {
      toast.error("Gagal mengajukan penarikan: " + (error as Error).message);
    },
  });

  // Calculate stats
  const totalEarned = sales
    .filter(s => s.status === 'paid')
    .reduce((sum, s) => sum + Number(s.commission_amount), 0);
  
  const pendingCommission = sales
    .filter(s => s.status === 'pending')
    .reduce((sum, s) => sum + Number(s.commission_amount), 0);
  
  const totalWithdrawn = withdrawals
    .filter(w => w.status === 'completed')
    .reduce((sum, w) => sum + Number(w.amount), 0);
  
  const availableBalance = agent?.available_balance || 0;

  // Filter sales by month
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  
  const monthSales = sales.filter(s => {
    const date = new Date(s.booking_date);
    return date >= monthStart && date <= monthEnd;
  });

  const monthEarned = monthSales
    .filter(s => s.status === 'paid')
    .reduce((sum, s) => sum + Number(s.commission_amount), 0);

  // Filter and sort sales for table
  const filteredSales = sales.filter(s => 
    s.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.package_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedSales = [...filteredSales].sort((a, b) => {
    let aVal: any = a[sortField as keyof Sale];
    let bVal: any = b[sortField as keyof Sale];
    
    if (sortField === 'booking_date') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 100000) {
      toast.error("Minimal penarikan Rp 100.000");
      return;
    }
    if (amount > availableBalance) {
      toast.error("Jumlah melebihi saldo tersedia");
      return;
    }
    withdrawMutation.mutate(amount);
  };

  const handleSaveBank = () => {
    if (!bankForm.bank_name || !bankForm.bank_account || !bankForm.account_name) {
      toast.error("Semua field harus diisi");
      return;
    }
    updateBankMutation.mutate(bankForm);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Dibayar</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Diproses</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Ditolak</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const hasBankInfo = agent?.bank_name && agent?.bank_account && agent?.account_name;
  const canWithdraw = availableBalance >= 100000 && hasBankInfo;

  if (salesLoading || withdrawalsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Komisi & Penarikan</h1>
          <p className="text-muted-foreground">Kelola komisi dan penarikan saldo Anda</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Earned</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(totalEarned)}</p>
                  <p className="text-xs text-muted-foreground">Sepanjang waktu</p>
                </div>
                <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(pendingCommission)}</p>
                  <p className="text-xs text-muted-foreground">Belum cair</p>
                </div>
                <div className="h-10 w-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bisa Ditarik</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(availableBalance)}</p>
                  <p className="text-xs text-muted-foreground">Saldo tersedia</p>
                </div>
                <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sudah Ditarik</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(totalWithdrawn)}</p>
                  <p className="text-xs text-muted-foreground">Total penarikan</p>
                </div>
                <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawal Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Penarikan Saldo</CardTitle>
            <CardDescription>Tarik komisi ke rekening bank Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasBankInfo ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Anda harus setup rekening bank terlebih dahulu</span>
                  <Button size="sm" onClick={() => {
                    setBankForm({
                      bank_name: agent?.bank_name || "",
                      bank_account: agent?.bank_account || "",
                      account_name: agent?.account_name || "",
                    });
                    setShowBankModal(true);
                  }}>
                    Setup Rekening
                  </Button>
                </AlertDescription>
              </Alert>
            ) : availableBalance < 100000 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Minimal penarikan Rp 100.000. Saldo Anda saat ini: {formatCurrency(availableBalance)}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex-1 w-full sm:w-auto">
                  <Label className="text-sm text-muted-foreground">Rekening Tujuan</Label>
                  <p className="font-medium">{agent?.bank_name} - {agent?.bank_account}</p>
                  <p className="text-sm text-muted-foreground">a.n. {agent?.account_name}</p>
                </div>
                <Button 
                  onClick={() => setShowWithdrawModal(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Tarik Saldo
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setBankForm({
                      bank_name: agent?.bank_name || "",
                      bank_account: agent?.bank_account || "",
                      account_name: agent?.account_name || "",
                    });
                    setShowBankModal(true);
                  }}
                >
                  Ubah Rekening
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs: Monthly / All Time */}
        <Tabs defaultValue="monthly" className="space-y-4">
          <TabsList>
            <TabsTrigger value="monthly">Bulanan</TabsTrigger>
            <TabsTrigger value="all">Semua Waktu</TabsTrigger>
            <TabsTrigger value="withdrawals">Riwayat Penarikan</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="space-y-4">
            {/* Month Selector */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold">
                {format(selectedMonth, 'MMMM yyyy', { locale: localeId })}
              </h3>
              <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Monthly Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(monthEarned)}</p>
                  <p className="text-sm text-muted-foreground">Earned</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{monthSales.length}</p>
                  <p className="text-sm text-muted-foreground">Deals</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {monthSales.length > 0 
                      ? formatCurrency(monthEarned / monthSales.length)
                      : 'Rp 0'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Komisi</p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Sales Table */}
            <Card>
              <CardContent className="pt-6">
                {monthSales.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Belum ada penjualan di bulan ini</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Paket</TableHead>
                          <TableHead className="text-right">Penjualan</TableHead>
                          <TableHead className="text-right">Komisi</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(sale.booking_date), 'dd MMM yyyy', { locale: localeId })}
                            </TableCell>
                            <TableCell>{sale.customer_name}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{sale.package_name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(sale.sale_amount)}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {formatCurrency(sale.commission_amount)}
                            </TableCell>
                            <TableCell>{getStatusBadge(sale.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari customer atau paket..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* All Sales Table */}
            <Card>
              <CardContent className="pt-6">
                {sortedSales.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Belum ada riwayat penjualan</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button variant="ghost" size="sm" onClick={() => handleSort('booking_date')}>
                              Tanggal
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Paket</TableHead>
                          <TableHead className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('sale_amount')}>
                              Penjualan
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('commission_amount')}>
                              Komisi
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(sale.booking_date), 'dd MMM yyyy', { locale: localeId })}
                            </TableCell>
                            <TableCell>{sale.customer_name}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{sale.package_name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(sale.sale_amount)}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {formatCurrency(sale.commission_amount)}
                            </TableCell>
                            <TableCell>{getStatusBadge(sale.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Riwayat Penarikan</CardTitle>
              </CardHeader>
              <CardContent>
                {withdrawals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Belum ada riwayat penarikan</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead className="text-right">Jumlah</TableHead>
                          <TableHead>Bank</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Catatan Admin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawals.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(w.requested_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(w.amount)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{w.bank_name}</p>
                                <p className="text-xs text-muted-foreground">{w.bank_account}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(w.status)}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {w.admin_notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Withdrawal Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tarik Saldo</DialogTitle>
            <DialogDescription>
              Masukkan jumlah yang ingin ditarik. Minimal Rp 100.000
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Saldo Tersedia</Label>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(availableBalance)}</p>
            </div>

            <div>
              <Label htmlFor="amount">Jumlah Penarikan</Label>
              <Input
                id="amount"
                type="number"
                placeholder="100000"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min={100000}
                max={availableBalance}
              />
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <Label className="text-sm text-muted-foreground">Rekening Tujuan</Label>
              <p className="font-medium">{agent?.bank_name} - {agent?.bank_account}</p>
              <p className="text-sm text-muted-foreground">a.n. {agent?.account_name}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawModal(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleWithdraw}
              disabled={withdrawMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {withdrawMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Ajukan Penarikan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Setup Modal */}
      <Dialog open={showBankModal} onOpenChange={setShowBankModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setup Rekening Bank</DialogTitle>
            <DialogDescription>
              Masukkan informasi rekening untuk pencairan komisi
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Nama Bank</Label>
              <Select
                value={bankForm.bank_name}
                onValueChange={(value) => setBankForm(prev => ({ ...prev, bank_name: value }))}
              >
                <SelectTrigger>
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
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="bank_account"
                  placeholder="1234567890"
                  value={bankForm.bank_account}
                  onChange={(e) => setBankForm(prev => ({ ...prev, bank_account: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_name">Nama Pemilik Rekening</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="account_name"
                  placeholder="Nama sesuai rekening/KTP"
                  value={bankForm.account_name}
                  onChange={(e) => setBankForm(prev => ({ ...prev, account_name: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Pastikan nama sesuai dengan yang tertera di buku rekening/KTP
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBankModal(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleSaveBank}
              disabled={updateBankMutation.isPending}
            >
              {updateBankMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentCommission;