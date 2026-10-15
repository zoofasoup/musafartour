import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Clock, Copy, Share2, UserPlus, Users } from "lucide-react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { useAgentLeaderboard } from "@/hooks/useAgentLeaderboard";
import { AGENT_STATE_LABEL, byUrgency, deadlineText, needsPayment, useAgentIntakes, useAgentJamaah } from "@/hooks/useAgentJamaah";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { AgentEmpty } from "@/components/agent/AgentPage";
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
    navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Belum bisa menyalin. Coba lagi."));
  };
  const firstName = agent.name.split(" ")[0];
  // Approved but the registration fee is not received yet: the database refuses leads, jamaah and promo-link attribution.
  const canSell = agent.status === "active" && (agent.registration_fee_status ?? "unpaid") !== "unpaid";

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

          {!agent.bank_name && (
            <Link to="/agent/profile" className={`pkg-label mt-6 inline-flex min-h-11 items-center gap-1.5 text-pkg-red-bright underline underline-offset-4 ${focus}`}>
              Isi rekening supaya komisi bisa cair <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
      </PkgPanel>

      <PkgPanel tone="cream" className="!pb-12 !pt-14">
        <div className="mx-auto max-w-3xl">
          {jamaah.error && <LoadError what="Data jamaah" error={jamaah.error} onRetry={() => jamaah.refetch()} retrying={jamaah.isFetching} />}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: jamaah.isPending ? "…" : String(active.length), label: "Jamaah aktif", note: `${list.filter((j) => j.pay_state === "lunas").length} lunas` },
              { value: jamaah.isPending ? "…" : String(owing.length), label: "Belum lunas", note: `Sisa ${juta(owed)}` },
              { value: jamaah.isPending ? "…" : juta(held), label: "Komisi menunggu", note: "Perkiraan" },
            ].map((s) => (
              <div key={s.label} className="min-w-0">
                <p className="text-[30px] font-light leading-none tracking-[-0.03em] text-pkg-fg">{s.value}</p>
                <p className="mt-2 text-[14px] leading-tight text-pkg-fg">{s.label}</p>
                <p className="mt-0.5 text-[13px] leading-tight text-pkg-fg-3">{s.note}</p>
              </div>
            ))}
          </div>
        </div>
      </PkgPanel>

      <PkgPanel tone="cream-2" className="!pb-12">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="pkg-h3">Perlu ditindaklanjuti</h2>
            {owing.length > FOLLOW_UP_LIMIT && <Link to="/agent/jamaah" className="pkg-label text-pkg-red-deep underline underline-offset-4">Semua ({owing.length})</Link>}
          </div>

          {jamaah.isPending ? (
            <Skeleton className="mt-6 h-20 w-full rounded-3xl" />
          ) : list.length === 0 ? (
            <AgentEmpty icon={Users} text="Belum ada jamaah" />
          ) : followUp.length === 0 ? (
            <AgentEmpty icon={CheckCircle2} text="Semua sudah lunas" />
          ) : (
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
          )}

          {waitingUc > 0 && (
            <Link to="/agent/jamaah" className="pkg-label mt-4 inline-flex min-h-11 items-center gap-2 text-pkg-red-deep underline underline-offset-4"><Clock className="h-4 w-4" aria-hidden /> {waitingUc} menunggu UC</Link>
          )}
          <Link to="/agent/jamaah" className="pkg-press pkg-glass pkg-label mt-6 inline-flex h-12 items-center justify-center rounded-full px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink">
            Semua jamaah saya
          </Link>
        </div>
      </PkgPanel>

      <PkgPanel tone="cream" last>
        <div className="mx-auto max-w-3xl">
          <h2 className="pkg-h3">Level dan peringkat</h2>
          <p className="mt-4 text-[17px] text-pkg-fg">
            {ranking.isLoading ? "…" : leaderboard?.rank ? <>Peringkat <span className="text-[28px] font-light tracking-[-0.03em]">#{leaderboard.rank}</span> <span className="text-pkg-fg-3">dari {leaderboard.totalAgents} agen</span></> : <span className="text-pkg-fg-3">Belum ada peringkat</span>}
          </p>
          {levelInfo.next && (
            <div className="mt-6">
              <div className="flex items-baseline justify-between gap-3 text-[15px] text-pkg-fg">
                <span>{salesLeft} jamaah lagi ke {levelInfo.next}</span>
                <span className="text-pkg-fg-3">{AGENT_LEVEL_LABELS[level]}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-pkg-hair" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Menuju level berikutnya">
                <div className="h-full rounded-full bg-pkg-red transition-[width] duration-500" style={{ width: `${Math.max(4, progress * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      </PkgPanel>
    </div>
  );
};

export default AgentDashboard;
