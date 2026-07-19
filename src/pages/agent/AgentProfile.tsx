import { useState, useRef, useEffect } from "react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  CreditCard, 
  Save, 
  Loader2,
  Copy,
  Check,
  Share2,
  Award,
  Camera,
  Lock,
  Bell,
  Eye,
  EyeOff,
  History,
  Shield,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { AgentPageHeader } from "@/components/agent/AgentPageHeader";
import { AGENT_LEVEL_COLORS as levelColors, AGENT_LEVEL_LABELS as levelLabels, type AgentLevel } from "@/lib/agentLevels";

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

const AgentProfile = () => {
  const { agent, refreshAgent, signOut } = useAgentAuth();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailSales: true,
    emailWithdrawal: true,
    emailPromo: false,
    pushSales: true,
    pushWithdrawal: true,
  });
  
  const [formData, setFormData] = useState({
    name: agent?.name || "",
    phone: agent?.phone || "",
    wa_number: agent?.wa_number || "",
    bank_name: agent?.bank_name || "",
    bank_account: agent?.bank_account || "",
    account_name: agent?.account_name || "",
  });

  // Update form data when agent loads
  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || "",
        phone: agent.phone || "",
        wa_number: agent.wa_number || "",
        bank_name: agent.bank_name || "",
        bank_account: agent.bank_account || "",
        account_name: agent.account_name || "",
      });
    }
  }, [agent]);

  // Fetch recent activity (sales)
  const { data: recentActivity } = useQuery({
    queryKey: ['agent-activity', agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data, error } = await supabase
        .from('agent_sales')
        .select('*')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!agent?.id,
  });

  // Fetch withdrawals
  const { data: recentWithdrawals } = useQuery({
    queryKey: ['agent-withdrawals', agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data, error } = await supabase
        .from('agent_withdrawals')
        .select('*')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!agent?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!agent?.id) throw new Error("Agent not found");
      const { error } = await supabase
        .from('agents')
        .update({
          name: data.name,
          phone: data.phone,
          wa_number: data.wa_number || data.phone,
          bank_name: data.bank_name || null,
          bank_account: data.bank_account || null,
          account_name: data.account_name || null,
        })
        .eq('id', agent.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil berhasil diperbarui");
      refreshAgent();
    },
    onError: (error) => {
      toast.error("Gagal memperbarui profil: " + (error as Error).message);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password berhasil diubah");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error) => {
      toast.error("Gagal mengubah password: " + (error as Error).message);
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agent?.id) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${agent.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('marketing-materials')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('marketing-materials')
        .getPublicUrl(fileName);

      setAvatarUrl(urlData.publicUrl + `?t=${Date.now()}`);
      toast.success("Foto profil berhasil diupload");
    } catch (error) {
      toast.error("Gagal mengupload foto: " + (error as Error).message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Nama tidak boleh kosong");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Nomor telepon tidak boleh kosong");
      return;
    }
    updateProfileMutation.mutate(formData);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    changePasswordMutation.mutate();
  };

  const copyReferralCode = async () => {
    if (agent?.referral_code) {
      await navigator.clipboard.writeText(agent.referral_code);
      setCopied(true);
      toast.success("Kode referral disalin!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Use formatCurrency from utils - already imported

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Konfirmasi</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><DollarSign className="h-3 w-3 mr-1" />Dibayar</Badge>;
      case 'processed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Check className="h-3 w-3 mr-1" />Diproses</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertTriangle className="h-3 w-3 mr-1" />Ditolak</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!agent) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const agentLevel = agent.level as AgentLevel;

  return (
    <div className="pb-24 md:pb-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <AgentPageHeader title="Profil Saya" description="Kelola akun dan pengaturan Anda" icon={User} />

        {/* Profile Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={agent.name} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {getInitials(agent.name)}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="text-center sm:text-left flex-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                  <h2 className="text-xl font-bold">{agent.name}</h2>
                  <Badge className={`${levelColors[agentLevel]} text-white`}>
                    <Award className="h-3 w-3 mr-1" />
                    {levelLabels[agentLevel]}
                  </Badge>
                  <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                    {agent.status === 'active' ? 'Aktif' : agent.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{agent.email}</p>
                
                {/* Referral Code */}
                <div className="mt-3 flex items-center gap-2 justify-center sm:justify-start">
                  <div className="bg-muted px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                    <code className="font-mono font-medium">{agent.referral_code}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={copyReferralCode}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{agent.total_sales}</p>
                <p className="text-sm text-muted-foreground">Total Sales</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(agent.total_commission)}</p>
                <p className="text-sm text-muted-foreground">Total Komisi</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{formatCurrency(agent.available_balance)}</p>
                <p className="text-sm text-muted-foreground">Saldo Tersedia</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="text-xs sm:text-sm">
              <User className="h-4 w-4 mr-1 hidden sm:block" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm">
              <Shield className="h-4 w-4 mr-1 hidden sm:block" />
              Keamanan
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">
              <Bell className="h-4 w-4 mr-1 hidden sm:block" />
              Notifikasi
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm">
              <History className="h-4 w-4 mr-1 hidden sm:block" />
              Aktivitas
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informasi Pribadi</CardTitle>
                  <CardDescription>Update data diri Anda</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        value={agent.email}
                        disabled
                        className="pl-10 bg-muted"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Email tidak dapat diubah</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Nomor Telepon</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wa_number">Nomor WhatsApp</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="wa_number"
                          value={formData.wa_number}
                          onChange={(e) => handleChange('wa_number', e.target.value)}
                          placeholder="Kosongkan jika sama"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Member Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Member sejak</p>
                      <p className="font-medium">
                        {format(new Date(agent.created_at), 'd MMMM yyyy', { locale: localeId })}
                      </p>
                    </div>
                    {agent.approved_at && (
                      <div>
                        <p className="text-muted-foreground">Diaktifkan</p>
                        <p className="font-medium">
                          {format(new Date(agent.approved_at), 'd MMMM yyyy', { locale: localeId })}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Informasi Bank
                  </CardTitle>
                  <CardDescription>Untuk pencairan komisi</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Nama Bank</Label>
                    <Select
                      value={formData.bank_name}
                      onValueChange={(value) => handleChange('bank_name', value)}
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
                        value={formData.bank_account}
                        onChange={(e) => handleChange('bank_account', e.target.value)}
                        placeholder="1234567890"
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
                        value={formData.account_name}
                        onChange={(e) => handleChange('account_name', e.target.value)}
                        placeholder="Nama sesuai rekening"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pastikan nama sesuai dengan yang tertera di buku rekening
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Simpan Perubahan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Ubah Password
                </CardTitle>
                <CardDescription>Perbarui password akun Anda</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Password Baru</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="pl-10 pr-10"
                        placeholder="Minimal 6 karakter"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="pl-10 pr-10"
                        placeholder="Ulangi password baru"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={changePasswordMutation.isPending || !passwordData.newPassword || !passwordData.confirmPassword}
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mengubah...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Ubah Password
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Zona Bahaya
                </CardTitle>
                <CardDescription>Tindakan yang tidak dapat dibatalkan</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <LogOut className="mr-2 h-4 w-4" />
                      Keluar dari Semua Perangkat
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Keluar dari semua perangkat?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Anda akan keluar dari semua perangkat yang sedang login, termasuk perangkat ini.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={signOut}>
                        Ya, Keluar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Notifikasi Email
                </CardTitle>
                <CardDescription>Kelola notifikasi yang dikirim ke email Anda</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Penjualan Baru</p>
                    <p className="text-sm text-muted-foreground">Notifikasi saat ada penjualan terkonfirmasi</p>
                  </div>
                  <Switch
                    checked={notifications.emailSales}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailSales: checked }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Status Penarikan</p>
                    <p className="text-sm text-muted-foreground">Update status pencairan komisi</p>
                  </div>
                  <Switch
                    checked={notifications.emailWithdrawal}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailWithdrawal: checked }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Promo & Update</p>
                    <p className="text-sm text-muted-foreground">Info paket baru dan promosi</p>
                  </div>
                  <Switch
                    checked={notifications.emailPromo}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailPromo: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifikasi Push
                </CardTitle>
                <CardDescription>Notifikasi real-time di browser</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Penjualan Dikonfirmasi</p>
                    <p className="text-sm text-muted-foreground">Saat penjualan Anda diverifikasi admin</p>
                  </div>
                  <Switch
                    checked={notifications.pushSales}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, pushSales: checked }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Penarikan Diproses</p>
                    <p className="text-sm text-muted-foreground">Saat pencairan selesai diproses</p>
                  </div>
                  <Switch
                    checked={notifications.pushWithdrawal}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, pushWithdrawal: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={() => toast.success("Pengaturan notifikasi disimpan")}>
              <Save className="mr-2 h-4 w-4" />
              Simpan Pengaturan
            </Button>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            {/* Recent Sales */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Riwayat Penjualan
                </CardTitle>
                <CardDescription>10 penjualan terakhir</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity && recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{sale.customer_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{sale.package_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(sale.created_at), { addSuffix: true, locale: localeId })}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          {getStatusBadge(sale.status)}
                          <p className="text-sm font-medium text-emerald-600 mt-1">
                            +{formatCurrency(sale.commission_amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Belum ada riwayat penjualan</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Withdrawals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Riwayat Penarikan
                </CardTitle>
                <CardDescription>5 penarikan terakhir</CardDescription>
              </CardHeader>
              <CardContent>
                {recentWithdrawals && recentWithdrawals.length > 0 ? (
                  <div className="space-y-3">
                    {recentWithdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{formatCurrency(withdrawal.amount)}</p>
                          <p className="text-sm text-muted-foreground">{withdrawal.bank_name} - {withdrawal.bank_account}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(withdrawal.requested_at), 'd MMM yyyy, HH:mm', { locale: localeId })}
                          </p>
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(withdrawal.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Belum ada riwayat penarikan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AgentProfile;
