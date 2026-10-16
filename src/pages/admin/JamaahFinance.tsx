import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Check, Inbox, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { Chips } from "@/components/agent/AgentPage";
import { AdminPage, AdminPanel } from "@/components/admin/AdminPage";
import { DataView } from "@/components/admin/DataView";
import { cogsPerRoom } from "@/lib/cogs";
import {
  LUNAS_DAYS_BEFORE_DEPARTURE,
  balanceOf,
  daysUntil,
  dueDateFor,
  juta,
  payState,
  reminderWhatsAppUrl,
  rupiah,
  todayIso,
  type Payment,
  type Registration,
} from "@/lib/jamaah";
import { StatCard } from "@/components/admin/jamaah/StatCard";
import { useJamaahPackages } from "@/hooks/useJamaah";

const DUE_LABEL = `H-${LUNAS_DAYS_BEFORE_DEPARTURE}`;
import { useAuth } from "@/hooks/useAuth";

type Period = "upcoming" | "departed" | "all";
const REMIND_WITHIN_DAYS = 14;

const fmtDay = (d: string) => format(new Date(`${d.slice(0, 10)}T00:00:00`), "d MMM yyyy", { locale: localeId });

export default function JamaahFinance() {
  const { userRole } = useAuth();
  const isOwner = userRole === "admin" || userRole === "superadmin";
  const [period, setPeriod] = useState<Period>("upcoming");
  const { data: packages = [], isLoading: loadingPackages } = useJamaahPackages();

  const { data, isLoading } = useQuery({
    queryKey: ["jamaah-finance"],
    queryFn: async () => {
      const [regs, pays] = await Promise.all([
        supabase.from("jamaah_registrations").select("*"),
        supabase.from("jamaah_payments").select("registration_id, amount, status"),
      ]);
      if (regs.error) throw regs.error;
      if (pays.error) throw pays.error;
      return { registrations: (regs.data ?? []) as Registration[], payments: (pays.data ?? []) as Payment[] };
    },
  });

  const today = todayIso();
  const report = useMemo(() => {
    const registrations = data?.registrations ?? [];
    const payments = data?.payments ?? [];
    const paymentsOf = (id: string) => payments.filter((p) => p.registration_id === id);

    const rows = packages
      .filter((p) => (period === "upcoming" ? p.departure_date >= today : period === "departed" ? p.departure_date < today : true))
      .map((pkg) => {
        const regs = registrations.filter((r) => r.package_id === pkg.id);
        const active = regs.filter((r) => r.status === "active");
        const cancelled = regs.filter((r) => r.status === "cancelled");
        const balances = active.map((r) => ({ r, b: balanceOf(r, paymentsOf(r.id)) }));
        const agreed = balances.reduce((s, x) => s + x.b.agreed, 0);
        const paid = balances.reduce((s, x) => s + x.b.paidVerified, 0);
        const pending = balances.reduce((s, x) => s + x.b.paidPending, 0);
        const outstanding = balances.reduce((s, x) => s + Math.max(0, x.b.outstanding), 0);
        // Cancelled jamaah: verified money kept after the refund (DP hangus) is still revenue.
        const kept = cancelled.reduce((s, r) => s + balanceOf(r, paymentsOf(r.id)).paidVerified - Number(r.refund_amount ?? 0), 0);
        const refunds = cancelled.reduce((s, r) => s + (r.refund_paid_at ? Number(r.refund_amount ?? 0) : 0), 0);
        const hppRoom = cogsPerRoom(pkg.cogs_data);
        const hpp = hppRoom ? active.reduce((s, r) => s + (hppRoom[r.room_type as "quad" | "triple" | "double"] ?? 0), 0) : null;
        const revenue = agreed + kept;
        return {
          pkg,
          count: active.length,
          belumDp: balances.filter((x) => payState(x.b) === "belum_dp").length,
          lunas: balances.filter((x) => ["lunas", "lebih"].includes(payState(x.b))).length,
          agreed,
          paid,
          pending,
          outstanding,
          refunds,
          revenue,
          hpp,
          margin: hpp != null ? revenue - hpp : null,
          due: dueDateFor(pkg.departure_date),
        };
      });

    const totals = rows.reduce(
      (t, r) => ({
        agreed: t.agreed + r.agreed,
        paid: t.paid + r.paid,
        pending: t.pending + r.pending,
        outstanding: t.outstanding + r.outstanding,
        refunds: t.refunds + r.refunds,
        margin: t.margin + (r.margin ?? 0),
        missingCogs: t.missingCogs + (r.count && r.hpp == null ? 1 : 0),
      }),
      { agreed: 0, paid: 0, pending: 0, outstanding: 0, refunds: 0, margin: 0, missingCogs: 0 }
    );

    // Jamaah who still owe money and whose H-30 is close or already passed.
    const reminders = registrations
      .filter((r) => r.status === "active")
      .map((r) => {
        const pkg = packages.find((p) => p.id === r.package_id);
        if (!pkg || pkg.departure_date < today) return null;
        const b = balanceOf(r, paymentsOf(r.id));
        const due = dueDateFor(pkg.departure_date);
        const days = daysUntil(due);
        return b.outstanding > 0 && days <= REMIND_WITHIN_DAYS ? { r, pkg, b, due, days } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => a.days - b.days);

    return { rows, totals, reminders };
  }, [data, packages, period, today]);

  const [openRow, setOpenRow] = useState<(typeof report.rows)[number] | null>(null);
  const [openReminder, setOpenReminder] = useState<(typeof report.reminders)[number] | null>(null);
  const loading = isLoading || loadingPackages;

  // The admin route guard allows sub-paths of /admin/jamaah, so keep this owner-only here.
  if (!isOwner) {
    return <p className="py-16 text-center text-sm text-pkg-fg-3">Laporan keuangan hanya untuk owner</p>;
  }

  type Row = (typeof report.rows)[number];
  type Reminder = (typeof report.reminders)[number];
  const dueNote = (r: Row) => {
    const days = daysUntil(r.due);
    if (r.pkg.departure_date < today || r.outstanding <= 0) return null;
    return days < 0 ? `lewat ${-days} hari` : `${days} hari lagi`;
  };
  const line = (label: string, value: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-4 border-b border-pkg-hair py-3 last:border-0">
      <dt className="text-[14px] text-pkg-fg-3">{label}</dt>
      <dd className="min-w-0 text-right text-[16px] text-pkg-fg">{value}</dd>
    </div>
  );
  const waLink = ({ r, pkg, b, due }: Reminder) =>
    reminderWhatsAppUrl({ phone: r.phone ?? "", name: r.full_name, packageName: pkg.package_name, departureDate: pkg.departure_date, outstanding: b.outstanding, dueDate: due });

  return (
    <AdminPage
      title="Laporan Keuangan"
      intro={`Uang masuk dari pembayaran terverifikasi. Lunas paling lambat ${DUE_LABEL}`}
      tabs={
        <Chips<Period>
          label="Periode"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "upcoming", label: "Akan berangkat" },
            { value: "departed", label: "Sudah berangkat" },
            { value: "all", label: "Semua" },
          ]}
        />
      }
    >
      {loading ? (
        <AdminPanel last><DataView rows={[]} loading rowKey={() => ""} columns={[]} card={{ title: () => null }} /></AdminPanel>
      ) : (
        <>
          <AdminPanel title="Ringkasan">
            <section aria-label="Total" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {[
                ["Total tagihan", juta(report.totals.agreed)],
                ["Uang masuk", juta(report.totals.paid)],
                ["Menunggu verifikasi", juta(report.totals.pending)],
                ["Sisa tagihan", juta(report.totals.outstanding)],
                ["Refund dibayar", juta(report.totals.refunds)],
                ["Estimasi margin", juta(report.totals.margin), report.totals.missingCogs ? `${report.totals.missingCogs} paket tanpa COGS` : undefined],
              ].map(([label, value, hint]) => (
                <StatCard key={label} label={label} value={value} hint={hint} />
              ))}
            </section>
          </AdminPanel>

          <AdminPanel title="Per paket" description="Ketuk paket untuk rincian">
            <DataView
              rows={report.rows}
              rowKey={(r) => r.pkg.id}
              what="Laporan per paket"
              empty={{ icon: Inbox, text: "Tidak ada paket" }}
              onOpen={(r) => setOpenRow(r)}
              columns={[
                { key: "pkg", header: "Paket", cell: (r) => (
                  <Link to={`/admin/jamaah?paket=${r.pkg.id}`} className="font-medium underline-offset-2 hover:underline">
                    {r.pkg.package_name}
                    <span className="block text-xs font-normal text-pkg-fg-3">{fmtDay(r.pkg.departure_date)} · {r.pkg.duration_days} hari</span>
                  </Link>
                ) },
                { key: "count", header: "Jamaah", align: "right", cell: (r) => <>{r.count}{r.pkg.slots_total ? <span className="text-pkg-fg-3">/{r.pkg.slots_total}</span> : null}</> },
                { key: "belumDp", header: "Belum DP", align: "right", cell: (r) => r.belumDp },
                { key: "lunas", header: "Lunas", align: "right", cell: (r) => r.lunas },
                { key: "agreed", header: "Tagihan", align: "right", cell: (r) => juta(r.agreed) },
                { key: "paid", header: "Masuk", align: "right", cell: (r) => <>{juta(r.paid)}{r.pending > 0 && <span className="block text-xs text-pkg-fg-3">+{juta(r.pending)}</span>}</> },
                { key: "out", header: "Sisa", align: "right", cell: (r) => <span className="font-medium">{juta(r.outstanding)}</span> },
                { key: "due", header: `Batas ${DUE_LABEL}`, cell: (r) => <span className="whitespace-nowrap">{fmtDay(r.due)}{dueNote(r) && <span className="block text-xs text-pkg-fg-3">{dueNote(r)}</span>}</span> },
                { key: "hpp", header: "HPP", align: "right", cell: (r) => (r.hpp == null ? <span className="text-xs text-pkg-fg-3">COGS kosong</span> : juta(r.hpp)) },
                { key: "margin", header: "Margin", align: "right", cell: (r) => (r.margin == null ? "–" : <span className="font-medium">{juta(r.margin)}{r.revenue > 0 && <span className="block text-xs font-normal text-pkg-fg-3">{((r.margin / r.revenue) * 100).toFixed(1)}%</span>}</span>) },
              ]}
              card={{
                title: (r) => r.pkg.package_name,
                subtitle: (r) => `${fmtDay(r.pkg.departure_date)} · ${r.count} jamaah`,
                meta: (r) => `Masuk ${juta(r.paid)} · Sisa ${juta(r.outstanding)}`,
                status: (r) => (r.outstanding > 0 && dueNote(r) ? <StatusBadge kind={daysUntil(r.due) < 0 ? "bad" : daysUntil(r.due) <= REMIND_WITHIN_DAYS ? "warn" : "mute"}>{dueNote(r)}</StatusBadge> : null),
              }}
            />
          </AdminPanel>

          <AdminPanel
            last
            title="Perlu diingatkan"
            description={`Sisa tagihan, batas ${DUE_LABEL} dalam ${REMIND_WITHIN_DAYS} hari atau sudah lewat`}
          >
            <DataView
              rows={report.reminders}
              rowKey={(x) => x.r.id}
              what="Daftar pengingat"
              empty={{ icon: Check, text: "Tidak ada yang perlu diingatkan" }}
              onOpen={(x) => setOpenReminder(x)}
              columns={[
                { key: "who", header: "Jamaah", cell: ({ r }) => <><span className="font-medium">{r.full_name}</span><span className="block text-xs text-pkg-fg-3">{r.phone || "tanpa no. WA"}</span></> },
                { key: "pkg", header: "Paket", cell: ({ pkg }) => `${pkg.package_name} · ${fmtDay(pkg.departure_date)}` },
                { key: "due", header: "Batas", cell: ({ due, days }) => <span className="whitespace-nowrap">{fmtDay(due)} · {days < 0 ? `lewat ${-days} hari` : days === 0 ? "hari ini" : `${days} hari lagi`}</span> },
                { key: "out", header: "Sisa", align: "right", cell: ({ b }) => <span className="font-medium">{rupiah(b.outstanding)}</span> },
              ]}
              inlineActions={(x) =>
                x.r.phone ? (
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <a href={waLink(x)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp</a>
                  </Button>
                ) : null
              }
              card={{
                title: ({ r }) => r.full_name,
                subtitle: ({ b }) => `Sisa ${rupiah(b.outstanding)}`,
                meta: ({ pkg }) => pkg.package_name,
                status: ({ days }) => <StatusBadge kind={days < 0 ? "bad" : "warn"}>{days < 0 ? `lewat ${-days} hari` : days === 0 ? "hari ini" : `${days} hari`}</StatusBadge>,
              }}
            />
          </AdminPanel>
        </>
      )}

      <Dialog open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
        <DialogContent className="sm:max-w-md">
          {openRow && (
            <>
              <DialogHeader>
                <DialogTitle>{openRow.pkg.package_name}</DialogTitle>
                <DialogDescription>{fmtDay(openRow.pkg.departure_date)} · {openRow.pkg.duration_days} hari</DialogDescription>
              </DialogHeader>
              <dl className="pkg-v2 !bg-transparent">
                {line("Jamaah", <>{openRow.count}{openRow.pkg.slots_total ? `/${openRow.pkg.slots_total}` : ""}</>)}
                {line("Belum DP", openRow.belumDp)}
                {line("Lunas", openRow.lunas)}
                {line("Tagihan", juta(openRow.agreed))}
                {line("Masuk", <>{juta(openRow.paid)}{openRow.pending > 0 && ` (+${juta(openRow.pending)} menunggu)`}</>)}
                {line("Sisa", juta(openRow.outstanding))}
                {line(`Batas ${DUE_LABEL}`, <>{fmtDay(openRow.due)}{dueNote(openRow) && ` · ${dueNote(openRow)}`}</>)}
                {line("HPP", openRow.hpp == null ? "COGS kosong" : juta(openRow.hpp))}
                {line("Margin", openRow.margin == null ? "–" : <>{juta(openRow.margin)}{openRow.revenue > 0 && ` · ${((openRow.margin / openRow.revenue) * 100).toFixed(1)}%`}</>)}
              </dl>
              <p className="text-[13px] text-pkg-fg-3">Margin = tagihan aktif + uang batal yang tidak dikembalikan − HPP per kamar.</p>
              <Button asChild size="lg"><Link to={`/admin/jamaah?paket=${openRow.pkg.id}`}>Lihat jamaah paket ini</Link></Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!openReminder} onOpenChange={(o) => !o && setOpenReminder(null)}>
        <DialogContent className="sm:max-w-md">
          {openReminder && (
            <>
              <DialogHeader>
                <DialogTitle>{openReminder.r.full_name}</DialogTitle>
                <DialogDescription>{openReminder.pkg.package_name} · {fmtDay(openReminder.pkg.departure_date)}</DialogDescription>
              </DialogHeader>
              <dl className="pkg-v2 !bg-transparent">
                {line("Sisa", rupiah(openReminder.b.outstanding))}
                {line("Batas", `${fmtDay(openReminder.due)} · ${openReminder.days < 0 ? `lewat ${-openReminder.days} hari` : openReminder.days === 0 ? "hari ini" : `${openReminder.days} hari lagi`}`)}
                {line("No. WA", openReminder.r.phone || "belum diisi")}
              </dl>
              {openReminder.r.phone ? (
                <Button asChild size="lg" className="gap-2">
                  <a href={waLink(openReminder)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" aria-hidden /> Kirim pengingat WhatsApp</a>
                </Button>
              ) : (
                <p className="text-center text-[14px] text-pkg-fg-3">Isi no. WA jamaah dulu</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
