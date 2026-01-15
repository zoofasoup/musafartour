import { useState } from "react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
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
  Award
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

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

const levelColors = {
  bronze: "bg-amber-600",
  silver: "bg-gray-400",
  gold: "bg-yellow-500",
  platinum: "bg-purple-500",
};

const levelLabels = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

const AgentProfile = () => {
  const { agent, refreshAgent } = useAgentAuth();
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    name: agent?.name || "",
    phone: agent?.phone || "",
    wa_number: agent?.wa_number || "",
    bank_name: agent?.bank_name || "",
    bank_account: agent?.bank_account || "",
    account_name: agent?.account_name || "",
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const agentLevel = agent.level as keyof typeof levelColors;

  return (
    <div className="py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profil Saya</h1>
          <p className="text-muted-foreground">Kelola informasi akun dan rekening bank</p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center sm:text-left flex-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                  <h2 className="text-xl font-bold">{agent.name}</h2>
                  <Badge className={`${levelColors[agentLevel]} text-white`}>
                    <Award className="h-3 w-3 mr-1" />
                    {levelLabels[agentLevel]}
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
                <p className="text-2xl font-bold text-green-600">{formatCurrency(agent.total_commission)}</p>
                <p className="text-sm text-muted-foreground">Total Komisi</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{formatCurrency(agent.available_balance)}</p>
                <p className="text-sm text-muted-foreground">Saldo Tersedia</p>
              </div>
            </div>

            <Separator className="my-6" />

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

        {/* Edit Form */}
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
      </div>
    </div>
  );
};

export default AgentProfile;