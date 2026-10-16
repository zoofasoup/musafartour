import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { useAgentLeaderboard } from "@/hooks/useAgentLeaderboard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Crown, Target, ChevronRight, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { AgentEmpty, AgentPage, AgentPanel, agentGlass } from "@/components/agent/AgentPage";
import { FlowerDefs, RankAvatar } from "@/components/agent/RankAvatar";
import { BadgeArt } from "@/components/agent/BadgeArt";
import { useMyBadges } from "@/hooks/useMyBadges";
import { AGENT_LEVEL_INFO, AGENT_LEVEL_SHARED_PERKS, agentLevelLabel } from "@/lib/agentLevels";

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

  const nextLevel = levels?.find(l => l.min_sales > (agent?.total_sales || 0));
  const { data: myBadges } = useMyBadges();
  const earnedMine = (myBadges ?? []).filter((b) => b.earned_at).sort((a, b) => (b.earned_at! > a.earned_at! ? 1 : -1));
  const ranked = (leaderboard ?? []).map((r, i) => ({ ...r, rank: i + 1 }));
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3, 10);
  const salesNeeded = nextLevel ? nextLevel.min_sales - (agent?.total_sales || 0) : 0;

  const getProgressForChallenge = (challengeId: string) => {
    return challengeProgress?.find(cp => cp.challenge_id === challengeId);
  };


  return (
    <AgentPage
      title="Peringkat"
      hero={
        <>
          <FlowerDefs />
          {!loadingLeaderboard && top3.length > 0 && (
            <div className="mt-8 grid grid-cols-3 items-end gap-3" role="list" aria-label="Tiga teratas">
              {[1, 0, 2].map((i) => {
                const r = top3[i];
                if (!r) return <div key={i} />;
                const first = i === 0;
                return (
                  <div key={r.id} role="listitem" className="flex min-w-0 flex-col items-center text-center">
                    <RankAvatar id={r.id} name={r.name} size={first ? 96 : 72} ring={first ? "#f4efe6" : "rgb(244 239 230 / 0.3)"} />
                    <p className="mt-2 w-full truncate text-[16px] font-medium text-pkg-fg">{r.name.split(" ")[0]}</p>
                    <p className="text-[13px] text-pkg-fg-2 tabular-nums">{r.total_sales} jamaah</p>
                    <div className={`pkg-glass${first ? "-red" : ""} mt-3 grid w-full place-items-start justify-items-center rounded-t-[22px] pt-4 ${first ? "h-28" : i === 1 ? "h-20" : "h-14"}`} aria-hidden>
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-pkg-cream text-[17px] font-medium text-pkg-ink">{i + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      }
    >
      <AgentPanel>
        <h2 className="pkg-h3">Peserta lain</h2>
        {loadingLeaderboard ? (
          <div className="mt-5 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}</div>
        ) : rest.length === 0 ? (
          <AgentEmpty icon={Trophy} text="Belum ada peserta lain" />
        ) : (
          <ul id="rank-list" className="mt-4">
            {rest.map((item) => (
              <li key={item.id} data-me={item.id === agent?.id ? "" : undefined} className={`flex items-center gap-4 rounded-2xl px-3 py-3 ${item.id === agent?.id ? 'bg-pkg-cream-2' : ''}`}>
                <span className="w-6 shrink-0 text-center text-[15px] text-pkg-fg-3 tabular-nums">{item.rank}</span>
                <RankAvatar id={item.id} name={item.name} size={44} />
                <p className="min-w-0 flex-1 truncate text-[17px] text-pkg-fg">{item.name}{item.id === agent?.id && <span className="text-pkg-fg-3"> · kamu</span>}</p>
                <span className="shrink-0 text-[15px] text-pkg-fg-2 tabular-nums">{item.total_sales} jamaah</span>
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
        <p className="mt-1 text-[14px] text-pkg-fg-3 tabular-nums">{earnedMine.length} dari {myBadges?.length || 0}</p>
        {earnedMine.length > 0 && (
          <ul className="mt-5 grid grid-cols-4 gap-3">
            {earnedMine.slice(0, 4).map((b) => (
              <li key={b.code}><BadgeArt code={b.code} earned className="w-full" /></li>
            ))}
          </ul>
        )}
        <Link to="/agent/achievements" className={`${agentGlass} mt-6`}>{earnedMine.length > 4 ? `Lihat semua (+${earnedMine.length - 4})` : "Lihat pencapaian"} <ChevronRight className="h-4 w-4" aria-hidden /></Link>
      </AgentPanel>

      <AgentPanel tone="cream-2" last>
        <h2 className="pkg-h3">Level</h2>
        {nextLevel && (
          <div className="mt-5">
            <p className="flex justify-between text-[15px] text-pkg-fg"><span>{salesNeeded} jamaah lagi ke {agentLevelLabel(nextLevel.level_name)}</span><span className="text-pkg-fg-3 tabular-nums">{agent?.total_sales || 0}/{nextLevel.min_sales}</span></p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-pkg-hair" role="progressbar" aria-valuenow={Math.round(((agent?.total_sales || 0) / nextLevel.min_sales) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Menuju level berikutnya">
              <div className="h-full rounded-full bg-pkg-red" style={{ width: `${Math.max(4, Math.min(100, ((agent?.total_sales || 0) / nextLevel.min_sales) * 100))}%` }} />
            </div>
          </div>
        )}
        <ol className="relative mt-8 space-y-4">
          {(["silver", "gold", "platinum"] as const).map((key, i, list) => {
            const info = AGENT_LEVEL_INFO[key];
            const mine = agent?.level === key;
            const reached = list.indexOf((agent?.level as typeof key) ?? "silver") >= i;
            return (
              <li key={key} className={`relative rounded-[26px] p-5 ${mine ? "pkg-glass-red text-pkg-on-red" : "bg-pkg-cream"}`}>
                <div className="flex items-center gap-4">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${mine ? "bg-pkg-cream text-pkg-red" : reached ? "bg-pkg-ink text-pkg-cream" : "bg-pkg-cream-2 text-pkg-fg-3"}`}>
                    {key === "silver" ? <Medal className="h-6 w-6" aria-hidden /> : key === "gold" ? <Trophy className="h-6 w-6" aria-hidden /> : <Crown className="h-6 w-6" aria-hidden />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[21px] leading-tight">
                      {agentLevelLabel(key)}
                      {mine && <span className="rounded-full bg-pkg-cream px-3 py-0.5 text-[12px] font-medium text-pkg-red">Levelmu</span>}
                    </p>
                    <p className={`mt-0.5 text-[14px] ${mine ? "text-pkg-on-red/85" : "text-pkg-fg-3"}`}>{info.range}</p>
                  </div>
                </div>
                <div className="mt-5">
                  <p className={`text-[13px] ${mine ? "text-pkg-on-red/85" : "text-pkg-fg-3"}`}>Komisi per jamaah</p>
                  <p className="mt-0.5 text-[26px] font-light leading-tight tracking-[-0.02em] tabular-nums">{info.commission}</p>
                  <p className={`mt-3 text-[15px] ${mine ? "text-pkg-on-red" : "text-pkg-fg-2"}`}>{info.perk}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-6 text-[14px] text-pkg-fg-3">{AGENT_LEVEL_SHARED_PERKS}</p>
      </AgentPanel>
    </AgentPage>
  );
}
