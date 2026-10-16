import { Link } from "react-router-dom";
import { AlertCircle, Banknote, ChevronRight, CalendarClock, Gavel, Inbox, UserCheck, Users, Wallet, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { useAdminWorkCounts } from "@/hooks/useAdminWorkCounts";
import { rupiah } from "@/lib/jamaah";

interface QueueCard {
  key: string;
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
  to: string;
  /** Needs a person today (amber accent) when true and value > 0. */
  urgent?: boolean;
}

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

  const cards: QueueCard[] = [
    {
      key: "payments", icon: Wallet, label: "Pembayaran menunggu verifikasi", value: data.payments_pending?.count ?? 0,
      hint: data.payments_pending?.count ? `Total ${rupiah(data.payments_pending.amount)}` : undefined,
      to: "/admin/jamaah/pembayaran", urgent: true,
    },
    { key: "intakes", icon: Inbox, label: "Pendaftaran baru belum diproses", value: data.intakes_new ?? 0, to: "/admin/jamaah/masuk", urgent: true },
    { key: "belumdp", icon: AlertCircle, label: "Jamaah belum DP", value: data.belum_dp ?? 0, hint: "Keberangkatan yang akan datang", to: "/admin/jamaah" },
    {
      key: "lunas", icon: CalendarClock, label: "Jatuh tempo lunas dalam 14 hari", value: data.lunas_due?.count ?? 0,
      hint: [data.lunas_due?.count ? `Sisa ${rupiah(data.lunas_due.amount)}` : "", data.lunas_overdue ? `${data.lunas_overdue} sudah lewat` : ""].filter(Boolean).join(" · ") || undefined,
      to: "/admin/jamaah", urgent: true,
    },
    {
      key: "komisi", icon: Banknote, label: "Komisi menunggu persetujuan", value: data.commission_eligible ?? 0,
      hint: `${data.commission_approved ?? 0} sudah disetujui, layak dibayar`, to: "/admin/pembayaran-komisi", urgent: true,
    },
    { key: "agen", icon: UserCheck, label: "Agen menunggu persetujuan", value: data.agents_pending ?? 0, to: "/admin/agents", urgent: true },
    { key: "sengketa", icon: Gavel, label: "Lead sengketa terbuka", value: data.disputes_open ?? 0, hint: "Komisinya ditahan sampai diputuskan", to: "/admin/agent-leads", urgent: true },
    { key: "seat", icon: Users, label: "Seat hampir penuh", value: data.seats_low ?? 0, hint: "Sisa 3 seat atau kurang", to: "/admin/jadwal" },
  ];

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
