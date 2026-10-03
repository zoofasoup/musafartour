import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, Clock, Copy, MessageCircle, Share2, Sparkles, Target, Trophy, UserPlus, Users, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { AGENT_STATE_CLASS, AGENT_STATE_LABEL, byUrgency, deadlineText, needsPayment, useAgentIntakes, useAgentJamaah } from "@/hooks/useAgentJamaah";
import { AgentStatCard } from "@/components/agent/AgentStatCard";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { TOUCH_H } from "@/components/admin/jamaah/touch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AGENT_LEVEL_COLORS, AGENT_LEVEL_LABELS, AGENT_LEVEL_PROGRESSION, type AgentLevel } from "@/lib/agentLevels";
import { juta, reminderWhatsAppUrl, rupiah } from "@/lib/jamaah";
import { formatCurrency } from "@/lib/utils";

const FOLLOW_UP_LIMIT = 5;

/** What an agent needs on landing: who still owes money, what is waiting on CS, and what commission is coming. */
const AgentDashboard = () => {
  const { agent } = useAgentAuth();
  const jamaah = useAgentJamaah(!!agent?.id);
  const intakes = useAgentIntakes(!!agent?.id);

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ["agent-leaderboard", agent?.id],
    enabled: !!agent?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("agents").select("id, total_sales").eq("status", "active").order("total_sales", { ascending: false });
      if (error) throw error;
      const rank = data?.findIndex((a) => a.id === agent!.id) ?? -1;
      return { rank: rank >= 0 ? rank + 1 : null, totalAgents: data?.length ?? 0 };
    },
  });

  if (!agent) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)}
        </div>
      </div>
    );
  }

  const list = jamaah.data ?? [];
  const active = list.filter((j) => j.pay_state !== "batal");
  const owing = list.filter(needsPayment);
  const followUp = [...owing].sort(byUrgency).slice(0, FOLLOW_UP_LIMIT);
  const held = list.filter((j) => j.commission_status === "waiting").reduce((s, j) => s + j.commission_amount, 0);
  const owed = owing.reduce((s, j) => s + Math.max(0, j.outstanding), 0);
  const waitingCs = (intakes.data ?? []).filter((i) => i.status === "new").length;

  const level = agent.level as AgentLevel;
  const levelInfo = AGENT_LEVEL_PROGRESSION[level];
  const salesLeft = Math.max(0, levelInfo.salesNeeded - agent.total_sales);

  const copy = (text: string, done: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Belum bisa menyalin. Coba lagi."));
  };
  const firstName = agent.name.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="border-0 bg-gradient-to-r from-primary to-primary text-white">
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">Halo, {firstName}</h1>
              <Badge className={`${AGENT_LEVEL_COLORS[level]} gap-1 text-white`}><Award className="h-3.5 w-3.5" aria-hidden />{AGENT_LEVEL_LABELS[level]}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-primary-foreground">
              <span>Kode referral kamu:</span>
              <span className="inline-flex items-center gap-1">
                <code className="rounded bg-white/15 px-1.5 py-0.5 font-mono font-bold">{agent.referral_code}</code>
                <button type="button" aria-label="Salin kode referral" className={`inline-flex h-8 w-8 items-center justify-center rounded hover:bg-white/15 ${TOUCH_H} [@media(pointer:coarse)]:w-11`} onClick={() => copy(agent.referral_code, "Kode referral disalin.")}>
                  <Copy className="h-4 w-4" aria-hidden />
                </button>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className={`h-11 gap-2 bg-white font-semibold text-foreground hover:bg-muted`}>
              <Link to="/agent/daftar-jamaah"><UserPlus className="h-4 w-4" aria-hidden /> Daftarkan jamaah</Link>
            </Button>
            <Button type="button" variant="outline" className="h-11 gap-2 border-white/40 bg-transparent text-white hover:bg-white/15 hover:text-white" onClick={() => copy(`${window.location.origin}/r/${agent.referral_code}`, "Link disalin. Kirim ke calon jamaah, pendaftarannya tercatat atas namamu.")}>
              <Share2 className="h-4 w-4" aria-hidden /> Salin link untuk calon jamaah
            </Button>
          </div>
        </CardContent>
      </Card>

      {jamaah.error && <LoadError what="Data jamaah" error={jamaah.error} onRetry={() => jamaah.refetch()} retrying={jamaah.isFetching} />}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AgentStatCard icon={Users} label="Jamaah aktif" value={jamaah.isPending ? "…" : active.length} helper={<span className="text-muted-foreground">{list.filter((j) => j.pay_state === "lunas").length} sudah lunas</span>} />
        <AgentStatCard icon={Clock} label="Belum lunas" value={jamaah.isPending ? "…" : owing.length} helper={<span className="text-muted-foreground">Sisa {juta(owed)}</span>} />
        <AgentStatCard icon={Sparkles} label="Komisi menunggu" value={jamaah.isPending ? "…" : juta(held)} helper={<span className="text-muted-foreground">Masuk saat jamaah lunas</span>} />
        <AgentStatCard icon={Wallet} label="Saldo komisi" value={formatCurrency(Number(agent.available_balance))} helper={<Link to="/agent/commission" className="inline-block py-2 font-medium text-foreground underline-offset-2 hover:underline">Lihat dan tarik komisi</Link>} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
          <CardTitle className="text-lg">Perlu ditindaklanjuti</CardTitle>
          {owing.length > FOLLOW_UP_LIMIT && <Button asChild variant="ghost" size="sm"><Link to="/agent/jamaah">Lihat semua ({owing.length})</Link></Button>}
        </CardHeader>
        <CardContent>
          {jamaah.isPending ? (
            <Skeleton className="h-20 w-full" />
          ) : list.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-lg bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Belum ada jamaah atas namamu. Daftarkan jamaah pertamamu, atau kirim link supaya jamaah mengisi sendiri.</p>
              <Button asChild className="h-11 shrink-0"><Link to="/agent/daftar-jamaah">Daftarkan jamaah</Link></Button>
            </div>
          ) : followUp.length === 0 ? (
            <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">Tidak ada yang perlu ditagih. Semua jamaahmu sudah lunas.</p>
          ) : (
            <ul className="divide-y">
              {followUp.map((j) => (
                <li key={j.registration_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{j.full_name}</p>
                    <p className="text-[13px] text-muted-foreground">{rupiah(Math.max(0, j.outstanding))} lagi · {deadlineText(j.due_date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`shrink-0 whitespace-nowrap ${AGENT_STATE_CLASS[j.pay_state]}`}>{AGENT_STATE_LABEL[j.pay_state]}</Badge>
                    {j.phone && (
                      <Button asChild variant="outline" size="icon" className={`h-9 w-9 ${TOUCH_H} [@media(pointer:coarse)]:w-11`}>
                        <a aria-label={`Ingatkan ${j.full_name} lewat WhatsApp`} target="_blank" rel="noopener noreferrer" href={reminderWhatsAppUrl({ phone: j.phone, name: j.full_name, packageName: j.package_name, departureDate: j.departure_date, outstanding: j.outstanding, dueDate: j.due_date })}>
                          <MessageCircle className="h-4 w-4" aria-hidden />
                        </a>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {waitingCs > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              {waitingCs} pendaftaran masih menunggu dicek CS. <Link to="/agent/jamaah" className="inline-block py-3 font-medium text-foreground underline-offset-2 hover:underline">Lihat statusnya</Link>
            </p>
          )}
          <Button asChild variant="outline" className={`mt-4 ${TOUCH_H}`}><Link to="/agent/jamaah">Semua jamaah saya</Link></Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg"><Trophy className="h-5 w-5 text-status-warn-fg" aria-hidden />Level dan peringkat</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            {leaderboardLoading ? <Skeleton className="h-10 w-full" /> : leaderboard?.rank ? (
              <p className="font-semibold">Peringkat <span className="text-xl text-foreground">#{leaderboard.rank}</span> <span className="text-sm font-normal text-muted-foreground">dari {leaderboard.totalAgents} agen</span></p>
            ) : (
              <p className="text-muted-foreground">Belum ada peringkat</p>
            )}
            <p className="mt-1 text-[13px] text-muted-foreground">Dihitung dari jumlah jamaah yang sudah lunas.</p>
          </div>
          {levelInfo.next && (
            <div className="flex items-center gap-3 rounded-lg border border-status-warn-border bg-status-warn-bg p-3 text-status-warn-text">
              <Target className="h-6 w-6 shrink-0" aria-hidden />
              <div>
                <p className="font-medium">{salesLeft} jamaah lunas lagi</p>
                <p className="text-sm">{AGENT_LEVEL_LABELS[level]} → {levelInfo.next}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!agent.bank_name && (
        <Card className="border-status-warn-border bg-status-warn-bg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-status-warn-text"><Wallet className="h-5 w-5" aria-hidden />Lengkapi data rekening</CardTitle>
            <p className="text-sm text-status-warn-text">Komisi hanya bisa dicairkan setelah rekening bank kamu terisi.</p>
          </CardHeader>
          <CardContent>
            <Button asChild className="h-11"><Link to="/agent/profile">Lengkapi data</Link></Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgentDashboard;
