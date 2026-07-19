import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentStatCard } from "@/components/agent/AgentStatCard";
import {
  ShoppingBag,
  DollarSign,
  Wallet,
  Copy,
  Award,
  Share2,
  ExternalLink,
  Trophy,
  Target,
  Sparkles,
  Download,
  Package,
  PartyPopper,
  BadgeCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { AGENT_LEVEL_COLORS, AGENT_LEVEL_LABELS, AGENT_LEVEL_PROGRESSION, type AgentLevel } from "@/lib/agentLevels";
import { startOfMonth, endOfMonth } from "date-fns";

const AgentDashboard = () => {
  const { agent, signOut } = useAgentAuth();
  const navigate = useNavigate();

  // Fetch leaderboard data
  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['agent-leaderboard', agent?.id],
    queryFn: async () => {
      if (!agent?.id) return null;

      const { data: agents, error } = await supabase
        .from('agents')
        .select('id, name, total_sales')
        .eq('status', 'active')
        .order('total_sales', { ascending: false });

      if (error) throw error;

      const rank = agents?.findIndex(a => a.id === agent.id) ?? -1;
      return {
        rank: rank >= 0 ? rank + 1 : null,
        totalAgents: agents?.length || 0,
      };
    },
    enabled: !!agent?.id,
  });

  // Real this-month / pending commission, replacing the old `* 0.3` / `* 0.1`
  // guesses - same underlying table and status values AgentCommission.tsx uses.
  const { data: commissionData, isLoading: commissionLoading } = useQuery({
    queryKey: ['agent-dashboard-commission', agent?.id],
    queryFn: async () => {
      if (!agent?.id) return { thisMonth: 0, pending: 0 };
      const { data, error } = await supabase
        .from('agent_sales')
        .select('commission_amount, status, booking_date')
        .eq('agent_id', agent.id);

      if (error) throw error;

      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      const thisMonth = (data || [])
        .filter((s) => s.status === 'paid' && new Date(s.booking_date) >= monthStart && new Date(s.booking_date) <= monthEnd)
        .reduce((sum, s) => sum + Number(s.commission_amount), 0);

      const pending = (data || [])
        .filter((s) => s.status === 'pending')
        .reduce((sum, s) => sum + Number(s.commission_amount), 0);

      return { thisMonth, pending };
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/agent/login');
  };

  if (!agent) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  const currentLevel = agent.level as AgentLevel;
  const levelInfo = AGENT_LEVEL_PROGRESSION[currentLevel];
  const salesForNextLevel = levelInfo.salesNeeded - agent.total_sales;

  const getActivityItems = () => {
    if (agent.total_sales === 0) {
      return [
        { icon: PartyPopper, text: "Welcome! Mulai jual paket pertama kamu", type: "welcome" as const },
        { icon: Package, text: "Download marketing kit untuk promosi", type: "action" as const, link: "/agent/marketing-kit" },
      ];
    }
    return [
      { icon: BadgeCheck, text: `Total ${agent.total_sales} paket terjual`, type: "sale" as const },
      { icon: DollarSign, text: `Total komisi: ${formatCurrency(Number(agent.total_commission))}`, type: "commission" as const },
    ];
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border-0">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                Selamat Datang, {agent.name}!
              </CardTitle>
              <CardDescription className="text-emerald-100 mt-1">
                Member ID: <span className="font-mono font-bold">{agent.referral_code}</span>
              </CardDescription>
            </div>
            <Badge className={`${AGENT_LEVEL_COLORS[currentLevel]} text-white text-sm px-4 py-1.5 self-start`}>
              <Award className="h-4 w-4 mr-1" />
              {AGENT_LEVEL_LABELS[currentLevel]} Agent
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

      {/* Stats Grid - four real numbers, nothing fabricated */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AgentStatCard
          icon={ShoppingBag}
          label="Total Sales"
          value={agent.total_sales}
          helper={<span className="text-muted-foreground">Sepanjang waktu</span>}
        />
        <AgentStatCard
          icon={DollarSign}
          label="Komisi Bulan Ini"
          value={commissionLoading ? "…" : formatCurrency(commissionData?.thisMonth ?? 0)}
          helper={<span className="text-amber-600">Pending: {formatCurrency(commissionData?.pending ?? 0)}</span>}
        />
        <AgentStatCard
          icon={Wallet}
          label="Total Komisi"
          value={formatCurrency(Number(agent.total_commission))}
          helper={<span className="text-muted-foreground">Sepanjang waktu</span>}
        />
        <AgentStatCard
          icon={Sparkles}
          label="Saldo Tersedia"
          value={formatCurrency(Number(agent.available_balance))}
          helper={
            <Link to="/agent/commission" className="text-emerald-600 hover:underline">
              Tarik komisi →
            </Link>
          }
        />
      </div>

      {/* Leaderboard Widget */}
      <Card className="border-emerald-200 dark:border-emerald-800/30 bg-gradient-to-br from-emerald-50/50 to-background dark:from-emerald-950/20">
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
                <Trophy className="h-6 w-6 text-amber-500 shrink-0" />
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
                  <Target className="h-6 w-6 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-medium">
                      Next Target: <span className="text-amber-600">{salesForNextLevel > 0 ? salesForNextLevel : 0} sales lagi</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {AGENT_LEVEL_LABELS[currentLevel]} → {levelInfo.next}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Feed */}
      <Card>
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
                <item.icon className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm">{item.text}</p>
                </div>
                {item.type === 'action' && 'link' in item && item.link && (
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
          <Link to="/agent/packages">
            <Package className="h-6 w-6" />
            <span>Lihat Paket</span>
          </Link>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
          asChild
        >
          <Link to="/agent/marketing-kit">
            <Download className="h-6 w-6" />
            <span>Marketing Kit</span>
          </Link>
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
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
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
