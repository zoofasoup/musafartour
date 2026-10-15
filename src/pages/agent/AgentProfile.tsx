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
import { AgentPage, AgentPanel, Chips, Figures } from "@/components/agent/AgentPage";
import { AvatarCropper } from "@/components/agent/AvatarCropper";
import { ImageLightbox } from "@/components/ImageLightbox";
import { agentAvatarUrl } from "@/lib/agentAvatar";
import { AgentIdCard } from "@/components/agent/AgentIdCard";
import { agentStatusLabel } from "@/lib/agentSupport";
import { AGENT_LEVEL_COLORS as levelColors, AGENT_LEVEL_LABELS as levelLabels, type AgentLevel } from "@/lib/agentLevels";

// The old Card structure is kept but drawn as flat sections (a heading, then the content, a hairline between them).
const Card = ({ children }: { children: React.ReactNode; className?: string }) => <section className="py-8 first:pt-0 last:pb-0">{children}</section>;
const CardHeader = ({ children }: { children: React.ReactNode; className?: string }) => <div className="mb-5">{children}</div>;
const CardTitle = ({ children }: { children: React.ReactNode; className?: string }) => (
  <h2 className="pkg-h3 flex items-center gap-3 text-pretty [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0 [&_svg]:text-pkg-fg-3">{children}</h2>
);
const CardDescription = ({ children }: { children: React.ReactNode; className?: string }) => <p className="mt-1.5 text-[14px] text-pkg-fg-3">{children}</p>;
const CardContent = ({ children }: { children: React.ReactNode; className?: string }) => <div className="space-y-4">{children}</div>;

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(agent?.id ? agentAvatarUrl(agent.id) : null);
  const [hasAvatar, setHasAvatar] = useState(false);
  useEffect(() => {
    if (agent?.id && !avatarUrl) setAvatarUrl(agentAvatarUrl(agent.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id]);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [viewAvatar, setViewAvatar] = useState(false);
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

  // Choosing a photo opens the cropper; what the person frames there is what gets saved.
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 15 MB");
      return;
    }
    setCropFile(file);
  };

  const saveAvatar = async (blob: Blob) => {
    if (!agent?.id) return;
    setUploadingAvatar(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('marketing-materials')
        .upload(`${agent.id}/avatar.jpg`, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '60' });
      if (uploadError) throw uploadError;
      setAvatarUrl(agentAvatarUrl(agent.id, Date.now()));
      setHasAvatar(true);
      setCropFile(null);
      toast.success("Foto terpasang");
    } catch (error) {
      toast.error("Foto belum bisa dipasang. Coba lagi.");
      console.error("Avatar upload failed:", error);
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
      toast.success("Agent ID disalin!");
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
        return <Badge variant="outline" className="bg-status-ok-bg text-status-ok-fg border-status-ok-border"><CheckCircle2 className="h-3 w-3 mr-1" />Konfirmasi</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-status-warn-bg text-status-warn-fg border-status-warn-border"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-status-info-bg text-status-info-fg border-status-info-border"><DollarSign className="h-3 w-3 mr-1" />Dibayar</Badge>;
      case 'processed':
        return <Badge variant="outline" className="bg-status-info-bg text-status-info-fg border-status-info-border"><Check className="h-3 w-3 mr-1" />Diproses</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-status-bad-bg text-status-bad-fg border-status-bad-border"><AlertTriangle className="h-3 w-3 mr-1" />Ditolak</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!agent) {
    return (
      <AgentPage title="Profil.">
        <AgentPanel last><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-pkg-fg-3" aria-label="Memuat" /></div></AgentPanel>
      </AgentPage>
    );
  }

  const agentLevel = agent.level as AgentLevel;

  return (
    <>
    <AgentPage
      title="Profil."
      hero={
        <>
          <div className="mt-7 flex items-center gap-5">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => (hasAvatar ? setViewAvatar(true) : fileInputRef.current?.click())}
                aria-label={hasAvatar ? "Lihat foto profil" : "Pasang foto profil"}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream focus-visible:ring-offset-2 focus-visible:ring-offset-pkg-ink"
              >
                <Avatar className="h-20 w-20">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={agent.name} onLoadingStatusChange={(st) => setHasAvatar(st === "loaded")} /> : null}
                  <AvatarFallback className="bg-pkg-red text-2xl font-light text-pkg-on-red">{getInitials(agent.name)}</AvatarFallback>
                </Avatar>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <button
                type="button"
                className="pkg-press pkg-glass absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Ganti foto profil"
              >
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[22px] font-light tracking-[-0.02em] text-pkg-fg">{agent.name}</p>
              <p className="truncate text-[14px] text-pkg-fg-3">{agent.email}</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-pkg-fg-2">
                <span className="pkg-glass pkg-label inline-flex h-7 items-center rounded-full px-3">{levelLabels[agentLevel]}</span>
                <span>{agentStatusLabel(agent.status)}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={copyReferralCode}
            aria-label="Salin Agent ID"
            className="pkg-press mt-5 inline-flex min-h-11 items-center gap-2.5 rounded-full text-[15px] text-pkg-fg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream"
          >
            <span>Agent ID</span>
            <span className="rounded-full bg-pkg-cream/10 px-3 py-1 font-mono text-[14px] text-pkg-cream">{agent.referral_code}</span>
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          </button>

          <Figures
            items={[
              { value: String(agent.total_sales), label: "Jamaah lunas" },
              { value: formatCurrency(agent.total_commission), label: "Total komisi" },
              { value: formatCurrency(agent.available_balance), label: "Saldo" },
            ]}
          />
        </>
      }
    >
      <AgentPanel last>
        <AgentIdCard name={agent.name} agentId={agent.referral_code} level={agent.level} status={agent.status} since={agent.approved_at} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="pkg-form mt-8 space-y-6">
          <Chips
            label="Bagian profil"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: "profile", label: "Profil" },
              { value: "security", label: "Keamanan" },
              { value: "activity", label: "Aktivitas" },
            ]}
          />

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informasi Pribadi</CardTitle>
                  <CardDescription>Update data diri kamu</CardDescription>
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
                <CardDescription>Perbarui password akun kamu</CardDescription>
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
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        aria-label={showPasswords.new ? "Sembunyikan password baru" : "Tampilkan password baru"}
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
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        aria-label={showPasswords.confirm ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
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
                        Kamu akan keluar dari semua perangkat yang sedang login, termasuk perangkat ini.
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
                          <p className="text-sm font-medium text-foreground mt-1">
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
      </AgentPanel>
    </AgentPage>
    <AvatarCropper file={cropFile} onCancel={() => setCropFile(null)} onSave={saveAvatar} />
    <ImageLightbox images={avatarUrl ? [avatarUrl] : []} currentIndex={0} isOpen={viewAvatar} onClose={() => setViewAvatar(false)} />
    </>
  );
};

export default AgentProfile;
