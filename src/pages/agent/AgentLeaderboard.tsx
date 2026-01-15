import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, Medal, Award, Star, Crown, Users, Flame, Zap, Clock, 
  Target, Gift, ShoppingBag, Ticket, GraduationCap, DollarSign,
  ChevronRight, Lock, CheckCircle2, TrendingUp, UserPlus
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'trophy': Trophy,
  'medal': Medal,
  'award': Award,
  'star': Star,
  'crown': Crown,
  'users': Users,
  'flame': Flame,
  'zap': Zap,
  'clock': Clock,
  'target': Target,
  'user-plus': UserPlus,
  'network': Users,
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const levelColors: Record<string, string> = {
  bronze: "bg-amber-600",
  silver: "bg-slate-400",
  gold: "bg-yellow-500",
  platinum: "bg-gradient-to-r from-purple-500 to-blue-500",
};

const levelIcons: Record<string, React.ReactNode> = {
  bronze: <Award className="h-5 w-5 text-amber-600" />,
  silver: <Medal className="h-5 w-5 text-slate-400" />,
  gold: <Trophy className="h-5 w-5 text-yellow-500" />,
  platinum: <Crown className="h-5 w-5 text-purple-500" />,
};

export default function AgentLeaderboard() {
  const { agent } = useAgentAuth();
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"month" | "week" | "all">("month");

  // Fetch leaderboard data
  const { data: leaderboard, isLoading: loadingLeaderboard } = useQuery({
    queryKey: ["agent-leaderboard", leaderboardPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id, name, total_sales, total_commission, level")
        .eq("status", "active")
        .order("total_sales", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch levels
  const { data: levels } = useQuery({
    queryKey: ["agent-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_levels")
        .select("*")
        .order("min_sales", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch badges
  const { data: badges } = useQuery({
    queryKey: ["agent-badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_badges")
        .select("*")
        .order("requirement_value", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch earned badges
  const { data: earnedBadges } = useQuery({
    queryKey: ["agent-earned-badges", agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data, error } = await supabase
        .from("agent_earned_badges")
        .select("*, badge:agent_badges(*)")
        .eq("agent_id", agent.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!agent?.id,
  });

  // Fetch challenges
  const { data: challenges } = useQuery({
    queryKey: ["agent-challenges"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("agent_challenges")
        .select("*")
        .eq("is_active", true)
        .gte("end_date", today)
        .order("end_date", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch challenge progress
  const { data: challengeProgress } = useQuery({
    queryKey: ["agent-challenge-progress", agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data, error } = await supabase
        .from("agent_challenge_progress")
        .select("*")
        .eq("agent_id", agent.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!agent?.id,
  });

  // Fetch rewards
  const { data: rewards } = useQuery({
    queryKey: ["agent-rewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_rewards")
        .select("*")
        .eq("is_active", true)
        .order("points_cost", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch agent points
  const { data: agentPoints } = useQuery({
    queryKey: ["agent-points", agent?.id],
    queryFn: async () => {
      if (!agent?.id) return null;
      const { data, error } = await supabase
        .from("agent_points")
        .select("*")
        .eq("agent_id", agent.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!agent?.id,
  });

  const myRank = leaderboard?.findIndex(a => a.id === agent?.id) ?? -1;
  const currentLevel = levels?.find(l => l.level_name === agent?.level);
  const nextLevel = levels?.find(l => l.min_sales > (agent?.total_sales || 0));
  const salesNeeded = nextLevel ? nextLevel.min_sales - (agent?.total_sales || 0) : 0;
  const earnedBadgeIds = new Set(earnedBadges?.map(eb => eb.badge_id) || []);

  const getProgressForChallenge = (challengeId: string) => {
    return challengeProgress?.find(cp => cp.challenge_id === challengeId);
  };

  const rewardCategoryIcons: Record<string, React.ReactNode> = {
    merchandise: <ShoppingBag className="h-5 w-5" />,
    voucher: <Ticket className="h-5 w-5" />,
    training: <GraduationCap className="h-5 w-5" />,
    cash: <DollarSign className="h-5 w-5" />,
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Leaderboard & Gamification</h1>
        <p className="text-muted-foreground">Raih prestasi, kumpulkan badge, dan tukar rewards!</p>
      </div>

      {/* Your Ranking Widget - Sticky */}
      {agent && (
        <Card className="sticky top-0 z-10 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/20">
                  {myRank >= 0 && myRank < 3 ? (
                    myRank === 0 ? <Trophy className="h-6 w-6 text-yellow-500" /> :
                    myRank === 1 ? <Medal className="h-6 w-6 text-slate-400" /> :
                    <Medal className="h-6 w-6 text-amber-600" />
                  ) : (
                    <span className="text-lg font-bold text-primary">#{myRank >= 0 ? myRank + 1 : '--'}</span>
                  )}
                </div>
                <div>
                  <p className="font-semibold">Ranking Kamu: #{myRank >= 0 ? myRank + 1 : '--'}</p>
                  <p className="text-sm text-muted-foreground">{agent.total_sales} penjualan</p>
                </div>
              </div>
              {myRank > 9 && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Target Top 10:</p>
                  <p className="text-sm font-medium text-primary">
                    {leaderboard && leaderboard[9] 
                      ? `${leaderboard[9].total_sales - (agent.total_sales || 0)} sales lagi!`
                      : 'Ayo mulai jualan!'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Leaderboard
              </CardTitle>
              <CardDescription>Top agents dengan penjualan terbanyak</CardDescription>
            </div>
            <Tabs value={leaderboardPeriod} onValueChange={(v) => setLeaderboardPeriod(v as typeof leaderboardPeriod)}>
              <TabsList className="h-8">
                <TabsTrigger value="week" className="text-xs px-2">Minggu Ini</TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-2">Bulan Ini</TabsTrigger>
                <TabsTrigger value="all" className="text-xs px-2">All Time</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loadingLeaderboard ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard?.slice(0, 10).map((item, index) => (
                <div 
                  key={item.id}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    item.id === agent?.id ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full shrink-0">
                    {index === 0 ? (
                      <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <span className="text-xl">🥇</span>
                      </div>
                    ) : index === 1 ? (
                      <div className="w-10 h-10 rounded-full bg-slate-400/20 flex items-center justify-center">
                        <span className="text-xl">🥈</span>
                      </div>
                    ) : index === 2 ? (
                      <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center">
                        <span className="text-xl">🥉</span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="font-bold text-muted-foreground">#{index + 1}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{item.name}</p>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {levelIcons[item.level]}
                        <span className="ml-1 capitalize">{item.level}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {item.total_sales} paket
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(Number(item.total_commission))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full Leaderboard Modal */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full mt-4">
                Lihat Semua Ranking
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Full Leaderboard - Top 100</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2 pr-4">
                  {leaderboard?.map((item, index) => (
                    <div 
                      key={item.id}
                      className={`flex items-center gap-4 p-3 rounded-lg ${
                        item.id === agent?.id ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                      }`}
                    >
                      <span className="w-8 text-center font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.total_sales} penjualan</p>
                      </div>
                      <Badge variant="outline" className="capitalize">{item.level}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Challenges Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" />
            🎯 Challenges Bulan Ini
          </CardTitle>
          <CardDescription>Selesaikan tantangan dan dapatkan reward ekstra!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {challenges?.map((challenge) => {
              const progress = getProgressForChallenge(challenge.id);
              const progressPercent = Math.min(
                ((progress?.current_progress || 0) / challenge.target_value) * 100,
                100
              );
              const isCompleted = progress?.completed_at != null;

              return (
                <Card key={challenge.id} className={isCompleted ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          {challenge.title}
                          {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        </h4>
                        <p className="text-sm text-muted-foreground">{challenge.description}</p>
                      </div>
                      <Badge variant={
                        challenge.reward_type === 'cash' ? 'default' :
                        challenge.reward_type === 'points' ? 'secondary' : 'outline'
                      }>
                        {challenge.reward_type === 'cash' && formatCurrency(Number(challenge.reward_value))}
                        {challenge.reward_type === 'points' && `${challenge.reward_value} pts`}
                        {challenge.reward_type === 'badge' && `🏅 ${challenge.reward_value}`}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{progress?.current_progress || 0}/{challenge.target_value}</span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Berakhir: {format(new Date(challenge.end_date), 'dd MMMM yyyy', { locale: id })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {(!challenges || challenges.length === 0) && (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                Belum ada challenge aktif saat ini
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Badges Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-500" />
            🏅 Badges & Achievements
          </CardTitle>
          <CardDescription>
            Koleksi badge kamu: {earnedBadges?.length || 0}/{badges?.length || 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {badges?.slice(0, 12).map((badge) => {
              const isEarned = earnedBadgeIds.has(badge.id);
              const IconComponent = iconMap[badge.icon] || Award;
              
              return (
                <div
                  key={badge.id}
                  className={`relative flex flex-col items-center p-3 rounded-lg border transition-all ${
                    isEarned 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'bg-muted/30 border-transparent opacity-50 grayscale'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isEarned ? 'bg-primary/20' : 'bg-muted'
                  }`}>
                    {isEarned ? (
                      <IconComponent className="h-6 w-6 text-primary" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <p className="mt-2 text-xs font-medium text-center line-clamp-2">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">+{badge.points_reward} pts</p>
                </div>
              );
            })}
          </div>

          {/* All Badges Modal */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full mt-4">
                Lihat Semua Badge ({badges?.length || 0})
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Semua Badge</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[60vh]">
                <div className="grid grid-cols-2 gap-4 pr-4">
                  {badges?.map((badge) => {
                    const isEarned = earnedBadgeIds.has(badge.id);
                    const IconComponent = iconMap[badge.icon] || Award;
                    
                    return (
                      <div
                        key={badge.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          isEarned 
                            ? 'bg-primary/10 border-primary/30' 
                            : 'bg-muted/30 opacity-60'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                          isEarned ? 'bg-primary/20' : 'bg-muted'
                        }`}>
                          {isEarned ? (
                            <IconComponent className="h-6 w-6 text-primary" />
                          ) : (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{badge.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{badge.description}</p>
                          <p className="text-xs text-primary mt-1">+{badge.points_reward} pts</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Levels Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            ⭐ Agent Levels
          </CardTitle>
          <CardDescription>Tingkatkan level untuk unlock benefit lebih besar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Level Card */}
          <div className={`p-4 rounded-lg ${levelColors[agent?.level || 'bronze']} text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Level Saat Ini</p>
                <p className="text-2xl font-bold capitalize">{agent?.level || 'Bronze'}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                {agent?.level === 'platinum' ? <Crown className="h-8 w-8" /> :
                 agent?.level === 'gold' ? <Trophy className="h-8 w-8" /> :
                 agent?.level === 'silver' ? <Medal className="h-8 w-8" /> :
                 <Award className="h-8 w-8" />}
              </div>
            </div>
            <p className="mt-2 text-sm opacity-90">{agent?.total_sales || 0} penjualan</p>
          </div>

          {/* Level Progression */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {levels?.map((level, index) => (
                <div 
                  key={level.level_name}
                  className={`flex flex-col items-center ${
                    level.level_name === agent?.level ? 'scale-110' : 'opacity-60'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${levelColors[level.level_name]}`}>
                    {levelIcons[level.level_name]}
                  </div>
                  <p className="text-xs mt-1 capitalize font-medium">{level.level_name}</p>
                  <p className="text-xs text-muted-foreground">{level.min_sales}+ sales</p>
                </div>
              ))}
            </div>

            {/* Progress to Next Level */}
            {nextLevel && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress ke {nextLevel.level_name}</span>
                  <span className="font-medium">{agent?.total_sales || 0}/{nextLevel.min_sales}</span>
                </div>
                <Progress 
                  value={((agent?.total_sales || 0) / nextLevel.min_sales) * 100} 
                  className="h-3" 
                />
                <p className="text-sm text-center text-muted-foreground">
                  {salesNeeded} penjualan lagi untuk naik level!
                </p>
              </div>
            )}
          </div>

          {/* Level Benefits */}
          <div className="grid gap-3 md:grid-cols-2">
            {levels?.map((level) => (
              <div
                key={level.level_name}
                className={`p-4 rounded-lg border ${
                  level.level_name === agent?.level ? 'border-primary bg-primary/5' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {levelIcons[level.level_name]}
                  <span className="font-semibold capitalize">{level.level_name}</span>
                  {level.level_name === agent?.level && (
                    <Badge variant="default" className="ml-auto text-xs">Current</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Komisi: {level.commission_rate_min}% - {level.commission_rate_max}%
                </p>
                <ul className="space-y-1">
                  {level.benefits?.map((benefit, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rewards Store Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-500" />
                🎁 Rewards Store
              </CardTitle>
              <CardDescription>Tukarkan poin kamu dengan hadiah menarik</CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-1">
              {agentPoints?.available_points || 0} pts
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rewards?.map((reward) => {
              const canRedeem = (agentPoints?.available_points || 0) >= reward.points_cost;
              const outOfStock = reward.stock !== null && reward.stock <= 0;

              return (
                <Card key={reward.id} className={`overflow-hidden ${outOfStock ? 'opacity-50' : ''}`}>
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    {rewardCategoryIcons[reward.category] || <Gift className="h-12 w-12 text-muted-foreground" />}
                  </div>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{reward.name}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{reward.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="outline">{reward.points_cost} pts</Badge>
                      <Button 
                        size="sm" 
                        disabled={!canRedeem || outOfStock}
                        variant={canRedeem && !outOfStock ? "default" : "outline"}
                      >
                        {outOfStock ? 'Habis' : 'Redeem'}
                      </Button>
                    </div>
                    {reward.stock !== null && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Stok: {reward.stock}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {(!rewards || rewards.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada rewards tersedia
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
