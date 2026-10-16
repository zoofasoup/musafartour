import { Link } from "react-router-dom";
import { AlertCircle, Banknote, ChevronRight, CalendarClock, Gavel, Inbox, UserCheck, Users, Wallet, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { useAdminWorkCounts } from "@/hooks/useAdminWorkCounts";
import { buildWorkQueue } from "@/lib/workQueue";

const ICONS: Record<string, LucideIcon> = { payments: Wallet, intakes: Inbox, belumdp: AlertCircle, lunas: CalendarClock, komisi: Banknote, agen: UserCheck, sengketa: Gavel, seat: Users };

/**
 * "Perlu ditangani": the owner's work queues in one glance, each card opens the page where the work is done.
 * Numbers come from one read (admin_work_counts) and refresh every minute.
 */
export function WorkQueueCards() {
  const { data, isPending, error, refetch, isFetching } = useAdminWorkCounts();

  if (error) return <LoadError what="Angka pekerjaan" error={error} onRetry={() => refetch()} retrying={isFetching} />;

  if (isPending || !data) {
    return (
      <div className="space-y-2" role="status" aria-label="Memuat pekerjaan yang perlu ditangani">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-[14px]" />
        ))}
      </div>
    );
  }

  const cards = buildWorkQueue(data).map((c) => ({ ...c, icon: ICONS[c.key] }));

  return (
    <ul className="divide-y divide-pkg-hair md:grid md:grid-cols-2 md:gap-x-8 md:divide-y-0" aria-label="Perlu ditangani">
      {cards.map((c) => {
        const Icon = c.icon;
        const hot = c.urgent && c.value > 0;
        return (
          <li key={c.key} className="md:border-b md:border-pkg-hair">
            <Link to={c.to} className="pkg-press flex min-h-16 items-center gap-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${hot ? "bg-pkg-red-deep/10 text-pkg-red-deep" : "bg-pkg-cream-2 text-pkg-fg-3"}`}><Icon className="h-5 w-5" aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] leading-tight text-pkg-fg">{c.label}</span>
                {c.hint && <span className="mt-0.5 block text-[13px] text-pkg-fg-3">{c.hint}</span>}
              </span>
              <span className={`shrink-0 text-[24px] font-light leading-none ${hot ? "text-pkg-red-deep" : "text-pkg-fg"}`}>{c.value}</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-pkg-fg-3" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
