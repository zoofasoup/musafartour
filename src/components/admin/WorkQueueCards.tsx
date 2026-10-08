import { Link } from "react-router-dom";
import { AlertCircle, Banknote, CalendarClock, Gavel, Inbox, UserCheck, Users, Wallet, type LucideIcon } from "lucide-react";
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Memuat pekerjaan yang perlu ditangani">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
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
    <section aria-labelledby="work-queue-title" className="space-y-3">
      <h2 id="work-queue-title" className="text-lg font-bold">Perlu ditangani</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const hot = c.urgent && c.value > 0;
          return (
            <li key={c.key}>
              <Link
                to={c.to}
                className={`flex h-full min-h-24 flex-col justify-between gap-2 rounded-lg border bg-card p-4 shadow-sm outline-none transition-colors hover:bg-field-hover focus-visible:ring-2 focus-visible:ring-ring ${hot ? "border-status-warn-border" : ""}`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-medium text-muted-foreground">{c.label}</span>
                  <Icon className={`h-4 w-4 shrink-0 ${hot ? "text-status-warn-fg" : "text-muted-foreground"}`} aria-hidden />
                </span>
                <span>
                  <span className="block text-2xl font-bold leading-none">{c.value}</span>
                  {c.hint && <span className="mt-1 block text-[13px] text-muted-foreground">{c.hint}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
