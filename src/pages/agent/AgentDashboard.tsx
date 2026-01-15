import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Package, 
  DollarSign, 
  Users, 
  TrendingUp,
  Copy,
  LogOut,
  Wallet,
  Award,
  Share2,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import musafarLogo from "@/assets/musafar-logo.svg";

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

const AgentDashboard = () => {
  const { agent, signOut } = useAgentAuth();

  const copyReferralCode = () => {
    if (agent?.referral_code) {
      navigator.clipboard.writeText(agent.referral_code);
      toast.success("Kode referral berhasil disalin!");
    }
  };

  const copyReferralLink = () => {
    if (agent?.referral_code) {
      const link = `${window.location.origin}/agent/register?ref=${agent.referral_code}`;
      navigator.clipboard.writeText(link);
      toast.success("Link referral berhasil disalin!");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={musafarLogo} alt="Musafar Tour" className="h-8" />
            <span className="font-semibold text-sm text-muted-foreground">Agent Portal</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-medium text-sm">{agent.name}</p>
              <Badge className={`${levelColors[agent.level]} text-white text-xs`}>
                {levelLabels[agent.level]}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Welcome Card */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Selamat Datang, {agent.name}!
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Dashboard Agent Musafar Tour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                <span className="text-sm">Kode Referral:</span>
                <code className="font-mono font-bold">{agent.referral_code}</code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 hover:bg-white/20"
                  onClick={copyReferralCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={copyReferralLink}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Bagikan Link Referral
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Penjualan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{agent.total_sales}</p>
              <p className="text-sm text-muted-foreground">paket terjual</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Komisi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(Number(agent.total_commission))}</p>
              <p className="text-sm text-muted-foreground">sepanjang waktu</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Saldo Tersedia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(Number(agent.available_balance))}</p>
              <p className="text-sm text-muted-foreground">dapat ditarik</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Level Agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge className={`${levelColors[agent.level]} text-white text-lg px-3 py-1`}>
                  {levelLabels[agent.level]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {agent.level === 'platinum' ? 'Level tertinggi!' : 'Tingkatkan penjualan untuk naik level'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/agent/packages">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-primary" />
                  Lihat Paket
                </CardTitle>
                <CardDescription>
                  Lihat daftar paket umroh yang tersedia untuk dijual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full gap-2">
                  Buka <ExternalLink className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/agent/commission">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Riwayat Komisi
                </CardTitle>
                <CardDescription>
                  Lihat detail komisi dan ajukan penarikan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full gap-2">
                  Buka <ExternalLink className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/agent/referrals">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  Agent Referral
                </CardTitle>
                <CardDescription>
                  Lihat agent yang bergabung melalui referral Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full gap-2">
                  Buka <ExternalLink className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Bank Account Info */}
        {!agent.bank_name && (
          <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-yellow-800 dark:text-yellow-200">
                <Wallet className="h-5 w-5" />
                Lengkapi Data Rekening
              </CardTitle>
              <CardDescription className="text-yellow-700 dark:text-yellow-300">
                Anda belum mengisi data rekening bank. Lengkapi data rekening untuk menerima pembayaran komisi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/agent/profile">Lengkapi Data</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AgentDashboard;
