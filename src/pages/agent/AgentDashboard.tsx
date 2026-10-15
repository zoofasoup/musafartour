import { Link } from "react-router-dom";
import { copyText } from "@/lib/copy";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, ChevronRight, Clock, Copy, Share2, UserPlus, Users } from "lucide-react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { useAgentLeaderboard } from "@/hooks/useAgentLeaderboard";
import { AGENT_STATE_LABEL, byUrgency, deadlineText, needsPayment, useAgentIntakes, useAgentJamaah } from "@/hooks/useAgentJamaah";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { AgentEmpty } from "@/components/agent/AgentPage";
import { BadgeArt } from "@/components/agent/BadgeArt";
import { useMyBadges } from "@/hooks/useMyBadges";
import { BADGE_ACTIONS, nextBadges } from "@/lib/badges";
import { Skeleton } from "@/components/ui/skeleton";
import { AGENT_LEVEL_LABELS, AGENT_LEVEL_PROGRESSION, type AgentLevel } from "@/lib/agentLevels";
import { juta, reminderWhatsAppUrl, rupiah } from "@/lib/jamaah";
import { formatCurrency } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import "@/styles/pkg-v2.css";

const FOLLOW_UP_LIMIT = 5;
const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream focus-visible:ring-offset-2 focus-visible:ring-offset-pkg-ink";

/** What an agent needs on landing: money first, the one action they do most, then who still owes and how they are doing. */
const AgentDashboard = () => {
  const { agent } = useAgentAuth();
  const jamaah = useAgentJamaah(!!agent?.id);
  const intakes = useAgentIntakes(!!agent?.id);
  const myBadges = useMyBadges();

  // Rank among the active agents, from the same function as the Peringkat page.
  const ranking = useAgentLeaderboard(!!agent?.id);
  const leaderboard = (() => {
    if (!ranking.data || !agent) return undefined;
    const rank = ranking.data.findIndex((a) => a.id === agent.id);
    return { rank: rank >= 0 ? rank + 1 : null, totalAgents: ranking.data.length };
  })();

  if (!agent) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-56 w-full rounded-[32px]" />
        <Skeleton className="h-32 w-full rounded-[32px]" />
      </div>
    );
  }

  const list = jamaah.data ?? [];
  const active = list.filter((j) => j.pay_state !== "batal");
  const owing = list.filter(needsPayment);
  const followUp = [...owing].sort(byUrgency).slice(0, FOLLOW_UP_LIMIT);
  const held = list.filter((j) => j.commission_status === "waiting").reduce((s, j) => s + j.commission_amount, 0);
  const owed = owing.reduce((s, j) => s + Math.max(0, j.outstanding), 0);
  const waitingUc = (intakes.data ?? []).filter((i) => i.status === "new").length;

  // Unknown/legacy level values fall back to the starting level instead of crashing the page.
  const level = (agent.level in AGENT_LEVEL_PROGRESSION ? agent.level : "silver") as AgentLevel;
  const levelInfo = AGENT_LEVEL_PROGRESSION[level];
  const salesLeft = Math.max(0, levelInfo.salesNeeded - agent.total_sales);
  const progress = levelInfo.salesNeeded > 0 ? Math.min(1, agent.total_sales / levelInfo.salesNeeded) : 1;

  const copy = (text: string, done: string) => {
    void copyText(text, done);
  };
  const firstName = agent.name.split(" ")[0];
  // Approved but the registration fee is not received yet: the database refuses leads, jamaah and promo-link attribution.
  const canSell = agent.status === "active" && (agent.registration_fee_status ?? "unpaid") !== "unpaid";


  const misi = (myBadges.data ? nextBadges(myBadges.data, 3) : []);
  // Money that is late comes first; otherwise the next missions lead.
  const misiFirst = followUp.length === 0;

  const misiPanel = misi.length > 0 && (
    <PkgPanel tone={misiFirst ? "cream" : "cream-2"} className={misiFirst ? "!pb-12 !pt-14" : "!pb-12"}>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="pkg-h3">Misi</h2>
          <Link to="/agent/achievements" className="pkg-label text-pkg-red-deep underline underline-offset-4">Semua</Link>
        </div>
        <ul className="mt-5 space-y-5">
          {misi.map((b) => {
            const action = BADGE_ACTIONS[b.code];
            const to = action?.to ?? "/agent/achievements";
            return (
              <li key={b.code}>
                <Link to={to} className="pkg-press flex items-center gap-4 rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2">
                  <BadgeArt code={b.code} earned className="w-16 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[18px] leading-tight text-pkg-fg">{b.name}</span>
                    <span className="mt-0.5 block text-[14px] leading-snug text-pkg-fg-3">{action?.how ?? b.description}</span>
                    {b.target > 1 && (
                      <span className="mt-2 block">
                        <span className="block h-1.5 overflow-hidden rounded-full bg-pkg-hair" role="progressbar" aria-valuenow={b.current} aria-valuemin={0} aria-valuemax={b.target} aria-label={`Progres ${b.name}`}>
                          <span className="block h-full rounded-full bg-pkg-red" style={{ width: `${Math.max(4, (b.current / b.target) * 100)}%` }} />
                        </span>
                        <span className="mt-1 block text-[13px] text-pkg-fg-3 tabular-nums">{b.current} dari {b.target}</span>
                      </span>
                    )}
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-pkg-fg-3" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </PkgPanel>
  );

  const showFollow = jamaah.isPending || !!jamaah.error || list.length > 0 || waitingUc > 0;
  const followPanel = showFollow && (
    <PkgPanel tone={misiFirst ? "cream-2" : "cream"} className={misiFirst ? "!pb-12" : "!pb-12 !pt-14"}>
      <div className="mx-auto max-w-3xl">
        {jamaah.error && <LoadError what="Data jamaah" error={jamaah.error} onRetry={() => jamaah.refetch()} retrying={jamaah.isFetching} />}
        {list.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: String(active.length), label: "Jamaah aktif", note: `${list.filter((j) => j.pay_state === "lunas").length} lunas` },
              { value: String(owing.length), label: "Belum lunas", note: `Sisa ${juta(owed)}` },
              { value: juta(held), label: "Komisi menunggu", note: "Perkiraan" },
            ].map((x) => (
              <div key={x.label} className="min-w-0">
                <p className="text-[30px] font-light leading-none tracking-[-0.03em] text-pkg-fg">{x.value}</p>
                <p className="mt-2 text-[14px] leading-tight text-pkg-fg">{x.label}</p>
                <p className="mt-0.5 text-[13px] leading-tight text-pkg-fg-3">{x.note}</p>
              </div>
            ))}
          </div>
        )}

        {jamaah.isPending ? (
          <Skeleton className="mt-6 h-20 w-full rounded-3xl" />
        ) : followUp.length > 0 ? (
          <>
            <div className="mt-10 flex items-baseline justify-between gap-3">
              <h2 className="pkg-h3">Perlu ditindaklanjuti</h2>
              {owing.length > FOLLOW_UP_LIMIT && <Link to="/agent/jamaah" className="pkg-label text-pkg-red-deep underline underline-offset-4">Semua ({owing.length})</Link>}
            </div>
            <ul className="mt-4 divide-y divide-pkg-hair">
              {followUp.map((j) => (
                <li key={j.registration_id} className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-[17px] text-pkg-fg">{j.full_name}</p>
                    <p className="mt-0.5 text-[14px] text-pkg-fg-3">{rupiah(Math.max(0, j.outstanding))} lagi · {deadlineText(j.due_date)}</p>
                    <p className="mt-0.5 text-[13px] text-pkg-fg-3">{AGENT_STATE_LABEL[j.pay_state]}</p>
                  </div>
                  {j.phone && (
                    <a
                      aria-label={`Ingatkan ${j.full_name} lewat WhatsApp`}
                      target="_blank"
                      rel="noopener noreferrer"
                      href={reminderWhatsAppUrl({ phone: j.phone, name: j.full_name, packageName: j.package_name, departureDate: j.departure_date, outstanding: j.outstanding, dueDate: j.due_date })}
                      className="pkg-press pkg-glass grid h-12 w-12 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink"
                    >
                      <WhatsAppIcon className="h-5 w-5" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : list.length > 0 ? (
          <AgentEmpty icon={CheckCircle2} text="Semua sudah lunas" />
        ) : null}

        {waitingUc > 0 && (
          <Link to="/agent/jamaah" className="pkg-label mt-4 inline-flex min-h-11 items-center gap-2 text-pkg-red-deep underline underline-offset-4"><Clock className="h-4 w-4" aria-hidden /> {waitingUc} menunggu UC</Link>
        )}
        {list.length > 0 && (
          <Link to="/agent/jamaah" className="pkg-press pkg-glass pkg-label mt-6 inline-flex h-12 items-center justify-center rounded-full px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink">
            Semua jamaah saya
          </Link>
        )}
      </div>
    </PkgPanel>
  );

  return (
    // The shell pads its content; the panels run edge to edge on the phone, so cancel that padding here.
    <div className="pkg-v2 pkg-float -mx-4 -mt-4 -mb-24 md:mx-0 md:mt-0 md:mb-0 md:overflow-hidden md:rounded-[32px]">
      <PkgPanel tone="ink" top className="!pb-14 !pt-9">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="pkg-title !text-[40px] md:!text-[52px]">Halo, {firstName}</h1>
            <span className="pkg-glass pkg-label inline-flex h-8 items-center rounded-full px-3 text-[13px]">{AGENT_LEVEL_LABELS[level]}</span>
          </div>

          <button
            type="button"
            onClick={() => copy(agent.referral_code, "Agent ID disalin.")}
            aria-label={`Salin Agent ID ${agent.referral_code}`}
            className={`pkg-press mt-4 inline-flex min-h-11 items-center gap-2.5 rounded-full text-[15px] text-pkg-fg-2 ${focus}`}
          >
            <span>Agent ID</span>
            <span className="rounded-full bg-pkg-cream/10 px-3 py-1 font-mono text-[14px] text-pkg-cream">{agent.referral_code}</span>
            <Copy className="h-4 w-4" aria-hidden />
          </button>

          <p className="pkg-caption mt-8 text-pkg-fg-3">Saldo komisi</p>
          <p className="mt-1 text-[48px] font-light leading-none tracking-[-0.04em] text-pkg-fg">{formatCurrency(Number(agent.available_balance))}</p>
          <Link to="/agent/commission" className={`pkg-label mt-3 inline-flex min-h-11 items-center gap-1.5 text-pkg-cream underline underline-offset-4 ${focus}`}>
            Lihat komisi <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {canSell ? (
              <Link to="/agent/daftar-jamaah" className={`pkg-press pkg-glass-red pkg-label inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-7 ${focus}`}>
                <UserPlus className="h-5 w-5" aria-hidden /> Daftarkan jamaah
              </Link>
            ) : (
              <button type="button" disabled title="Bayar biaya registrasi dulu" className="pkg-glass pkg-label inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-7 opacity-60">
                <UserPlus className="h-5 w-5" aria-hidden /> Daftarkan jamaah
              </button>
            )}
            <button
              type="button"
              disabled={!canSell}
              title={canSell ? undefined : "Bayar biaya registrasi dulu"}
              onClick={() => copy(`${window.location.origin}/r/${agent.referral_code}`, "Link disalin. Pendaftaran lewat link ini tercatat atas namamu.")}
              className={`pkg-press pkg-glass pkg-label inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-7 disabled:opacity-60 ${focus}`}
            >
              <Share2 className="h-5 w-5" aria-hidden /> Salin link
            </button>
          </div>

        </div>
      </PkgPanel>

      {misiFirst ? <>{misiPanel}{followPanel}</> : <>{followPanel}{misiPanel}</>}

      <PkgPanel tone={misiFirst ? "cream" : "cream-2"} last>
        <div className="mx-auto max-w-3xl">
          <Link to="/agent/leaderboard" className="pkg-press flex min-h-14 items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2">
            <span className="min-w-0 text-[17px] text-pkg-fg">
              {ranking.isLoading ? "…" : leaderboard?.rank ? <>Peringkat <span className="text-[26px] font-light tracking-[-0.03em]">#{leaderboard.rank}</span></> : "Peringkat"}
              {levelInfo.next && <span className="text-pkg-fg-3"> · {salesLeft} jamaah lagi ke {levelInfo.next}</span>}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-pkg-fg-3" aria-hidden />
          </Link>
        </div>
      </PkgPanel>
    </div>
  );
};

export default AgentDashboard;
