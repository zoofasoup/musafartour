import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShoppingBag, 
  DollarSign, 
  Users, 
  TrendingUp,
  Copy,
  LogOut,
  Wallet,
  Award,
  Share2,
  ExternalLink,
  Trophy,
  Target,
  CheckCircle,
  Download,
  BookOpen,
  Package
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import musafarLogo from "@/assets/musafar-logo.svg";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";

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

const levelTargets = {
  bronze: { next: "Silver", salesNeeded: 5 },
  silver: { next: "Gold", salesNeeded: 15 },
  gold: { next: "Platinum", salesNeeded: 30 },
  platinum: { next: null, salesNeeded: 0 },
};

const AgentDashboard = () => {
  const { agent, signOut } = useAgentAuth();
  const navigate = useNavigate();

  // Fetch leaderboard data
  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['agent-leaderboard', agent?.id],
    queryFn: async () => {
      if (!agent?.id) return null;
      
      // Get all agents sorted by total_sales
      const { data: agents, error } = await supabase
        .from('agents')
        .select('id, name, total_sales')
        .eq('status', 'active')
        .order('total_sales', { ascending: false });
      
      if (error) throw error;
      
      // Find current agent's rank
      const rank = agents?.findIndex(a => a.id === agent.id) ?? -1;
      return {
        rank: rank >= 0 ? rank + 1 : null,
        totalAgents: agents?.length || 0,
        topAgents: agents?.slice(0, 5) || []
      };
    },
    enabled: !!agent?.id,
  });

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

  // Use formatCurrency from utils - already imported

  const handleSignOut = async () => {
    await signOut();
    navigate('/agent/login');
  };

  if (!agent) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Calculate level progress
  const currentLevel = agent.level as keyof typeof levelTargets;
  const levelInfo = levelTargets[currentLevel];
  const salesForNextLevel = levelInfo.salesNeeded - agent.total_sales;

  // Mock data for now (will be replaced with real data later)
  const thisMonthCommission = Number(agent.total_commission) * 0.3; // Placeholder
  const pendingCommission = Number(agent.available_balance) * 0.1; // Placeholder
  const activeLeads = 0; // Placeholder
  const conversionRate = 0; // Placeholder

  // Activity items
  const getActivityItems = () => {
    if (agent.total_sales === 0) {
      return [
        { icon: "👋", text: "Welcome! Mulai jual paket pertama kamu", type: "welcome" },
        { icon: "📦", text: "Download marketing kit untuk promosi", type: "action", link: "/agent/marketing-kit" },
        { icon: "📚", text: "Join training: Cara Closing via WhatsApp", type: "tip" },
      ];
    }
    // Placeholder for real sales history
    return [
      { icon: "✅", text: `Total ${agent.total_sales} paket terjual`, type: "sale" },
      { icon: "💰", text: `Total komisi: ${formatCurrency(Number(agent.total_commission))}`, type: "commission" },
    ];
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
        {/* Welcome Section */}
        <Card className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border-0 shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  Selamat Datang, {agent.name}! 👋
                </CardTitle>
                <CardDescription className="text-emerald-100 mt-1">
                  Member ID: <span className="font-mono font-bold">{agent.referral_code}</span>
                </CardDescription>
              </div>
              <Badge className={`${levelColors[currentLevel]} text-white text-sm px-4 py-1.5 self-start`}>
                <Award className="h-4 w-4 mr-1" />
                {levelLabels[currentLevel]} Agent
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur rounded-lg px-3 py-2">
                <span className="text-sm">Kode Referral:</span>
                <code className="font-mono font-bold">{agent.referral_code}</code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 hover:bg-white/20 text-white"
                  onClick={copyReferralCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={copyReferralLink}
                className="gap-2 bg-white text-emerald-700 hover:bg-emerald-50"
              >
                <Share2 className="h-4 w-4" />
                Bagikan Link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid - 2x2 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Total Sales */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-muted-foreground">
                <ShoppingBag className="h-4 w-4 text-emerald-600" />
                Total Sales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground">{agent.total_sales}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {agent.total_sales > 0 ? (
                  <span className="text-emerald-600">+{Math.round(agent.total_sales * 0.1)} dari bulan lalu</span>
                ) : (
                  <span>Belum ada penjualan</span>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Komisi Bulan Ini */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                Komisi Bulan Ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground">{formatCurrency(thisMonthCommission)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Pending: <span className="text-amber-600">{formatCurrency(pendingCommission)}</span>
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Active Leads */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 text-emerald-600" />
                Active Leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground">{activeLeads}</p>
              <p className="text-sm text-amber-600 mt-1">
                {activeLeads > 0 ? "Follow up!" : "Mulai cari leads!"}
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Conversion Rate */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Conversion Rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground">{conversionRate}%</p>
              <p className="text-sm text-muted-foreground mt-1">
                {conversionRate > 20 ? (
                  <span className="text-emerald-600">Great job!</span>
                ) : (
                  <span className="text-amber-600">Perlu improvement</span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Widget */}
        <Card className="shadow-md border-emerald-200 dark:border-emerald-800/30 bg-gradient-to-br from-emerald-50/50 to-background dark:from-emerald-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-amber-500" />
              Leaderboard Position
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {leaderboardLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                  <span className="text-2xl">🏆</span>
                  <div>
                    {leaderboardData?.rank ? (
                      <p className="font-semibold">
                        Posisi Anda: <span className="text-emerald-600 text-xl">#{leaderboardData.rank}</span>
                        <span className="text-muted-foreground font-normal text-sm ml-2">
                          dari {leaderboardData.totalAgents} agent
                        </span>
                      </p>
                    ) : (
                      <p className="text-muted-foreground">Belum ada ranking</p>
                    )}
                  </div>
                </div>
                
                {levelInfo.next && (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/30">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <p className="font-medium">
                        Next Target: <span className="text-amber-600">{salesForNextLevel > 0 ? salesForNextLevel : 0} sales lagi</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {levelLabels[currentLevel]} → {levelInfo.next}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getActivityItems().map((item, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <span className="text-xl">{item.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm">{item.text}</p>
                  </div>
                  {item.type === 'action' && item.link && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={item.link}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button 
            variant="default" 
            className="h-auto py-4 flex flex-col gap-2 bg-emerald-600 hover:bg-emerald-700"
            asChild
          >
            <Link to="/paket-umroh">
              <Package className="h-6 w-6" />
              <span>Lihat Paket</span>
            </Link>
          </Button>

          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
            onClick={() => toast.info("Fitur marketing kit coming soon!")}
          >
            <Download className="h-6 w-6" />
            <span>Download Marketing Kit</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            asChild
          >
            <Link to="/agent/commission">
              <Wallet className="h-6 w-6" />
              <span>Penarikan Komisi</span>
            </Link>
          </Button>
        </div>

        {/* Bank Account Warning */}
        {!agent.bank_name && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/20 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-amber-800 dark:text-amber-200">
                <Wallet className="h-5 w-5" />
                Lengkapi Data Rekening
              </CardTitle>
              <CardDescription className="text-amber-700 dark:text-amber-300">
                Lengkapi data rekening bank untuk menerima pembayaran komisi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="bg-amber-600 hover:bg-amber-700">
                <Link to="/agent/profile">Lengkapi Data</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
  );
};

export default AgentDashboard;
