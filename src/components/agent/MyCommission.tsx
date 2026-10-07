import { Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { useMyCommissionRates } from "@/hooks/useMyCommissionRates";
import { COMMISSION_LEVEL_LABEL, commissionSummary, packageCommissionRows, rupiah, tierLabel } from "@/lib/commission";

const PENDING_TEXT = "Komisi dikonfirmasi PIC Agen";

/**
 * "Komisi kamu" for one package, at the signed-in agent's own level. Never shows another level's number
 * (the server only sends the caller's level) and never an estimate: with no row it says the PIC confirms.
 *  - card: one line, "Mulai Rp 2.000.000" when tiers differ
 *  - compact: same, smaller, for schedule cards
 *  - detail: per-tier amounts plus the level they apply to
 */
export function MyCommission({ packageId, variant = "card" }: { packageId: string; variant?: "card" | "compact" | "detail" }) {
  const { agent } = useAgentAuth();
  const { data, isLoading } = useMyCommissionRates(!!agent);
  const levelLabel = agent ? COMMISSION_LEVEL_LABEL[agent.level] : null;

  if (isLoading) return <Skeleton className={variant === "compact" ? "h-5 w-32" : "h-6 w-48"} />;

  const rows = packageCommissionRows(data, packageId);
  const summary = commissionSummary(rows);

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
        <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {summary ? <span>Komisi kamu: {summary}</span> : <span className="font-medium text-muted-foreground">{PENDING_TEXT}</span>}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Komisi kamu</p>
        {rows.length === 0 ? (
          <p className="font-semibold text-foreground">{PENDING_TEXT}</p>
        ) : rows.length === 1 ? (
          <p className="text-2xl font-bold text-foreground">{rupiah(rows[0].amount)}<span className="text-sm font-normal text-muted-foreground"> /pax</span></p>
        ) : (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {rows.map((r) => (
              <li key={r.tier} className="text-base font-semibold text-foreground">
                <span className="font-normal text-muted-foreground">{tierLabel(r.tier)}</span> {rupiah(r.amount)}
              </li>
            ))}
          </ul>
        )}
        {rows.length > 0 && levelLabel && <p className="text-[13px] text-muted-foreground">Komisi untuk tingkat {levelLabel}, per jamaah yang lunas.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 font-semibold text-foreground">
        <Wallet className="h-4 w-4 shrink-0" aria-hidden />
        {summary ? <span>Komisi kamu: {summary}</span> : <span className="text-muted-foreground">{PENDING_TEXT}</span>}
      </div>
      {summary && levelLabel && <p className="pl-[22px] text-[13px] text-muted-foreground">Komisi untuk tingkat {levelLabel}</p>}
    </div>
  );
}
