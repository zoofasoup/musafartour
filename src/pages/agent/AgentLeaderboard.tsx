import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { useAgentLeaderboard } from "@/hooks/useAgentLeaderboard";
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
import { AgentEmpty, AgentPage, AgentPanel, Figures, agentGlass } from "@/components/agent/AgentPage";
import { AGENT_LEVEL_COLORS as levelColors, AGENT_LEVEL_ICONS as levelIcons, agentLevelLabel } from "@/lib/agentLevels";

// Icon mapping
/** The Rewards Store has no way to redeem and no points are awarded yet. Flip to true when both exist. */
const SHOW_REWARDS_STORE = false;

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

import { formatCurrency } from "@/lib/utils";

export default function AgentLeaderboard() {
  const { agent } = useAgentAuth();

  // Fetch leaderboard data (name, sales, level; never anyone's commission)
  const { data: leaderboardAll, isLoading: loadingLeaderboard } = useAgentLeaderboard();
  const leaderboard = leaderboardAll?.slice(0, 100);

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

  const lvlLabel = agentLevelLabel(agent?.level);

  return (
    <AgentPage
      title="Peringkat."
      hero={
        agent && (
          <>
            <Figures
              items={[
                { value: myRank >= 0 ? `#${myRank + 1}` : '-', label: 'Peringkat' },
                { value: String(agent.total_sales || 0), label: 'Jamaah' },
                { value: lvlLabel, label: 'Level' },
              ]}
            />
            {myRank > 9 && leaderboard?.[9] && (
              <p className="mt-6 flex items-center gap-2 text-[15px] text-pkg-fg-2"><Target className="h-4 w-4" aria-hidden /> {leaderboard[9].total_sales - (agent.total_sales || 0)} jamaah lagi ke 10 besar</p>
            )}
          </>
        )
      }
    >
      <AgentPanel>
        <h2 className="pkg-h3">10 teratas</h2>
        {loadingLeaderboard ? (
          <div className="mt-5 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}</div>
        ) : (
          <ul className="mt-4">
            {leaderboard?.slice(0, 10).map((item, index) => (
              <li key={item.id} className={`flex items-center gap-4 rounded-2xl px-3 py-3.5 ${item.id === agent?.id ? 'bg-pkg-cream-2' : ''}`}>
                <span className="w-9 shrink-0 text-center text-[22px] font-light tracking-[-0.02em] text-pkg-fg">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] text-pkg-fg">{item.name}{item.id === agent?.id && <span className="text-pkg-fg-3"> · kamu</span>}</p>
                  <p className="text-[13px] text-pkg-fg-3">{agentLevelLabel(item.level)}</p>
                </div>
                <span className="shrink-0 text-[15px] text-pkg-fg-2">{item.total_sales} jamaah</span>
              </li>
            ))}
          </ul>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className={`${agentGlass} mt-5`}>Lihat semua <ChevronRight className="h-4 w-4" aria-hidden /></button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] max-w-2xl">
            <DialogHeader>
              <DialogTitle>100 teratas</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh]">
              <ul className="divide-y pr-4">
                {leaderboard?.map((item, index) => (
                  <li key={item.id} className={`flex items-center gap-4 py-3 ${item.id === agent?.id ? 'font-semibold' : ''}`}>
                    <span className="w-8 text-center text-muted-foreground">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className="text-sm text-muted-foreground">{item.total_sales} jamaah · {agentLevelLabel(item.level)}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </AgentPanel>

      <AgentPanel tone="cream-2">
        <h2 className="pkg-h3">Tantangan bulan ini</h2>
        {(!challenges || challenges.length === 0) ? (
          <AgentEmpty icon={Target} text="Belum ada tantangan" />
        ) : (
          <ul className="mt-4 divide-y divide-pkg-hair">
            {challenges.map((challenge) => {
              const progress = getProgressForChallenge(challenge.id);
              const pct = Math.min(((progress?.current_progress || 0) / challenge.target_value) * 100, 100);
              const done = progress?.completed_at != null;
              return (
                <li key={challenge.id} className="py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[18px] leading-tight text-pkg-fg">{challenge.title}{done && <CheckCircle2 className="h-4 w-4 text-pkg-ok" aria-label="Selesai" />}</p>
                      {challenge.description && <p className="mt-1 text-[14px] text-pkg-fg-3">{challenge.description}</p>}
                    </div>
                    <span className="pkg-label shrink-0 rounded-full bg-pkg-cream px-3 py-1 text-[13px] text-pkg-fg">
                      {challenge.reward_type === 'cash' && formatCurrency(Number(challenge.reward_value))}
                      {challenge.reward_type === 'points' && `${challenge.reward_value} poin`}
                      {challenge.reward_type === 'badge' && challenge.reward_value}
                    </span>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-pkg-hair" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={challenge.title}>
                    <div className="h-full rounded-full bg-pkg-red" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 flex justify-between text-[13px] text-pkg-fg-3"><span>{progress?.current_progress || 0} dari {challenge.target_value}</span><span>Sampai {format(new Date(challenge.end_date), 'd MMM yyyy', { locale: id })}</span></p>
                </li>
              );
            })}
          </ul>
        )}
      </AgentPanel>

      <AgentPanel>
        <h2 className="pkg-h3">Badge</h2>
        <p className="mt-1 text-[14px] text-pkg-fg-3">{earnedBadges?.length || 0} dari {badges?.length || 0}</p>
        <ul className="mt-5 grid grid-cols-3 gap-x-3 gap-y-6">
          {badges?.slice(0, 12).map((badge) => {
            const isEarned = earnedBadgeIds.has(badge.id);
            const IconComponent = iconMap[badge.icon] || Award;
            return (
              <li key={badge.id} className={`flex flex-col items-center text-center ${isEarned ? '' : 'opacity-45'}`}>
                <span className={`grid h-14 w-14 place-items-center rounded-full ${isEarned ? 'bg-pkg-red text-pkg-on-red' : 'bg-pkg-cream-2 text-pkg-fg-3'}`}>
                  {isEarned ? <IconComponent className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                </span>
                <p className="mt-2 line-clamp-2 text-[13px] leading-tight text-pkg-fg">{badge.name}</p>
              </li>
            );
          })}
        </ul>
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className={`${agentGlass} mt-6`}>Semua badge <ChevronRight className="h-4 w-4" aria-hidden /></button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] max-w-2xl">
            <DialogHeader>
              <DialogTitle>Semua badge</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh]">
              <ul className="divide-y pr-4">
                {badges?.map((badge) => {
                  const isEarned = earnedBadgeIds.has(badge.id);
                  const IconComponent = iconMap[badge.icon] || Award;
                  return (
                    <li key={badge.id} className={`flex items-center gap-3 py-3 ${isEarned ? '' : 'opacity-60'}`}>
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted">{isEarned ? <IconComponent className="h-5 w-5" /> : <Lock className="h-4 w-4" />}</span>
                      <div className="min-w-0">
                        <p className="font-medium">{badge.name}</p>
                        <p className="line-clamp-2 text-sm text-muted-foreground">{badge.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </AgentPanel>

      <AgentPanel tone="cream-2" last>
        <h2 className="pkg-h3">Level</h2>
        {nextLevel && (
          <div className="mt-5">
            <p className="flex justify-between text-[15px] text-pkg-fg"><span>{salesNeeded} jamaah lagi ke {agentLevelLabel(nextLevel.level_name)}</span><span className="text-pkg-fg-3">{agent?.total_sales || 0}/{nextLevel.min_sales}</span></p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-pkg-hair" role="progressbar" aria-valuenow={Math.round(((agent?.total_sales || 0) / nextLevel.min_sales) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Menuju level berikutnya">
              <div className="h-full rounded-full bg-pkg-red" style={{ width: `${Math.max(4, Math.min(100, ((agent?.total_sales || 0) / nextLevel.min_sales) * 100))}%` }} />
            </div>
          </div>
        )}
        <ul className="mt-6 divide-y divide-pkg-hair">
          {levels?.map((level) => (
            <li key={level.level_name} className="py-5">
              <p className="flex items-center gap-2 text-[19px] text-pkg-fg">
                {agentLevelLabel(level.level_name)}
                {level.level_name === agent?.level && <span className="pkg-label rounded-full bg-pkg-red px-3 py-0.5 text-[12px] text-pkg-on-red">Levelmu</span>}
              </p>
              <p className="mt-1 text-[14px] text-pkg-fg-3">Mulai {level.min_sales} jamaah per tahun</p>
              {level.benefits && level.benefits.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {level.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-[14px] text-pkg-fg-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pkg-ok" aria-hidden />{benefit}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </AgentPanel>
    </AgentPage>
  );
}
