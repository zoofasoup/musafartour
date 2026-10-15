import { useMemo, useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Award } from "lucide-react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AgentEmpty, AgentPage, AgentPanel } from "@/components/agent/AgentPage";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { BadgeArt } from "@/components/agent/BadgeArt";
import { BadgeReveal } from "@/components/agent/BadgeCelebration";
import { useMyBadges } from "@/hooks/useMyBadges";
import { copyText } from "@/lib/copy";
import { BADGE_ACTIONS, BADGE_GROUPS, isNewBadge, nextBadges, type BadgeProgress } from "@/lib/badges";

const Bar = ({ value, max, label, tone = "bg-pkg-red" }: { value: number; max: number; label: string; tone?: string }) => (
  <div className="h-2 overflow-hidden rounded-full bg-pkg-hair" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
    <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(4, (value / Math.max(1, max)) * 100)}%` }} />
  </div>
);


/** The button that starts a badge: opens the right page, or copies the recruiting link. */
function BadgeCta({ b, agentCode, className = "" }: { b: BadgeProgress; agentCode: string; className?: string }) {
  const action = BADGE_ACTIONS[b.code];
  if (!action || b.earned_at) return null;
  const cls = `pkg-press pkg-glass-red pkg-label inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2 ${className}`;
  if (action.invite) {
    return (
      <button type="button" data-plain className={cls} onClick={() => void copyText(`${window.location.origin}/agent/register?ref=${agentCode}`, "Link ajakan disalin.")}>
        {action.label}
      </button>
    );
  }
  return <Link to={action.to!} className={cls}>{action.label}</Link>;
}

/** One badge as a tile: just the picture and the name. The details open in a sheet. */
function Tile({ b, onOpen }: { b: BadgeProgress; onOpen: () => void }) {
  const done = !!b.earned_at;
  return (
    <li className="min-w-0">
      <button type="button" data-plain onClick={onOpen} className="pkg-press block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2 rounded-[22px]">
        <span className="relative block">
          <BadgeArt code={b.code} earned={done} className="w-full" />
          {isNewBadge(b.earned_at) && <span className="pkg-glass-red absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-medium">Baru</span>}
        </span>
        <span className={`mt-2 block text-[14px] leading-tight ${done ? "text-pkg-fg" : "text-pkg-fg-2"}`}>{b.name}</span>
      </button>
    </li>
  );
}

function DetailSheet({ b, agentCode, onClose }: { b: BadgeProgress; agentCode: string; onClose: () => void }) {
  const done = !!b.earned_at;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader className="sr-only">
          <DialogTitle>{b.name}</DialogTitle>
          <DialogDescription>{b.description}</DialogDescription>
        </DialogHeader>
        <div className="pkg-v2 min-w-0 !bg-transparent">
          <BadgeArt code={b.code} earned={done} className="mx-auto mt-6 w-52" />
          <h2 className="mt-6 !pr-0 !text-center text-[30px] font-light leading-[1.05] tracking-[-0.035em] text-pkg-fg">{b.name}</h2>
          <p className="mt-2 text-center text-[17px] text-pkg-fg-2">{b.description}</p>
          {done ? (
            <p className="mt-3 text-center text-[15px] text-pkg-ok">Diraih {format(new Date(b.earned_at!), "d MMMM yyyy", { locale: localeId })}</p>
          ) : !b.manual && b.target > 1 ? (
            <div className="mx-auto mt-5 max-w-xs">
              <Bar value={b.current} max={b.target} label={`Progres ${b.name}`} />
              <p className="mt-2 text-center text-[14px] text-pkg-fg-3 tabular-nums">{b.current} dari {b.target}</p>
            </div>
          ) : null}
          {!done && (
            <div className="mt-6 text-center">
              <p className="text-[15px] leading-snug text-pkg-fg-3">{BADGE_ACTIONS[b.code]?.how ?? "Diberikan admin."}</p>
              <BadgeCta b={b} agentCode={agentCode} className="mt-4 w-full" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const AgentAchievements = () => {
  const { agent } = useAgentAuth();
  const [open, setOpen] = useState<BadgeProgress | null>(null);
  const { data = [], isLoading, error, refetch, isFetching } = useMyBadges();

  const earned = useMemo(() => data.filter((b) => b.earned_at).sort((a, b) => (b.earned_at! > a.earned_at! ? 1 : -1)), [data]);
  const next = useMemo(() => nextBadges(data), [data]);
  const locked = useMemo(() => data.filter((b) => !b.earned_at), [data]);
  const total = data.length;

  if (error) {
    return (
      <AgentPage title="Pencapaian">
        <AgentPanel last><LoadError what="Badge" error={error} onRetry={() => refetch()} retrying={isFetching} /></AgentPanel>
      </AgentPage>
    );
  }

  return (
    <AgentPage
      title="Pencapaian"
      hero={
        <>
          <p className="mt-6 text-[17px] text-pkg-fg-2">
            <span className="text-[44px] font-light leading-none tracking-[-0.03em] text-pkg-fg tabular-nums">{earned.length}</span> dari {total || "-"} badge
          </p>
          <div className="mt-4">
            <Bar value={earned.length} max={total || 1} label="Badge diraih" tone="bg-pkg-red-bright" />
          </div>
        </>
      }
    >
      {isLoading ? (
        <AgentPanel last>
          <div className="space-y-3" role="status" aria-label="Memuat">
            {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-[22px] bg-pkg-cream-2" />)}
          </div>
        </AgentPanel>
      ) : total === 0 ? (
        <AgentPanel last><AgentEmpty icon={Award} text="Belum ada badge" /></AgentPanel>
      ) : (
        <>
          {next.length > 0 && (
            <AgentPanel>
              <h2 className="pkg-h3 !text-[26px]">Berikutnya</h2>
              <ul className="mt-5 space-y-5">
                {next.map((b) => (
                  <li key={b.code}>
                    <button type="button" data-plain onClick={() => setOpen(b)} className="pkg-press flex w-full items-center gap-4 rounded-[22px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2">
                      <BadgeArt code={b.code} earned className="w-20 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[18px] leading-tight text-pkg-fg">{b.name}</span>
                        <span className="mt-1 block text-[14px] leading-snug text-pkg-fg-3">{b.description}</span>
                        {b.target > 1 && (
                          <span className="mt-3 block">
                            <Bar value={b.current} max={b.target} label={`Progres ${b.name}`} />
                            <span className="mt-1 block text-[13px] text-pkg-fg-3 tabular-nums">{b.current} dari {b.target}</span>
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </AgentPanel>
          )}

          <AgentPanel tone="cream-2" last={locked.length === 0}>
            <h2 className="pkg-h3 !text-[26px]">Diraih</h2>
            {earned.length === 0 ? (
              <p className="mt-4 text-[16px] text-pkg-fg-3">Belum ada. Mulai dari yang di atas.</p>
            ) : (
              <ul className="mt-5 grid grid-cols-3 gap-x-3 gap-y-6">
                {earned.map((b) => <Tile key={b.code} b={b} onOpen={() => setOpen(b)} />)}
              </ul>
            )}
          </AgentPanel>

          {locked.length > 0 && (
            <AgentPanel last>
              <h2 className="pkg-h3 !text-[26px]">Belum terbuka</h2>
              {BADGE_GROUPS.map((g) => {
                const items = locked.filter((b) => b.group_key === g.key);
                if (items.length === 0) return null;
                return (
                  <section key={g.key} className="mt-7">
                    <h3 className="pkg-label text-pkg-fg-3">{g.label}</h3>
                    <ul className="mt-3 grid grid-cols-3 gap-x-3 gap-y-6">
                      {items.map((b) => <Tile key={b.code} b={b} onOpen={() => setOpen(b)} />)}
                    </ul>
                  </section>
                );
              })}
            </AgentPanel>
          )}
        </>
      )}
      {open && (open.earned_at
        ? <BadgeReveal key={open.code} badge={open} label="Badge kamu" hint="Ketuk untuk tutup" onTap={() => setOpen(null)} />
        : <DetailSheet b={open} agentCode={agent?.referral_code ?? ""} onClose={() => setOpen(null)} />)}
    </AgentPage>
  );
};

export default AgentAchievements;
