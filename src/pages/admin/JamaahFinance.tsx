import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const loading = isLoading || loadingPackages;

  // The admin route guard allows sub-paths of /admin/jamaah, so keep this owner-only here.
  if (!isOwner) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Laporan keuangan hanya untuk owner.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Keuangan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Uang masuk dihitung dari pembayaran terverifikasi. Pelunasan paling lambat {DUE_LABEL} keberangkatan.
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="upcoming">Akan berangkat</TabsTrigger>
            <TabsTrigger value="departed">Sudah berangkat</TabsTrigger>
            <TabsTrigger value="all">Semua</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <section aria-label="Total" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              ["Total tagihan", juta(report.totals.agreed)],
              ["Uang masuk", juta(report.totals.paid)],
              ["Menunggu verifikasi", juta(report.totals.pending)],
              ["Sisa tagihan", juta(report.totals.outstanding)],
              ["Refund dibayar", juta(report.totals.refunds)],
              ["Estimasi margin", juta(report.totals.margin), report.totals.missingCogs ? `${report.totals.missingCogs} paket tanpa COGS` : "dari HPP di COGS"],
            ].map(([label, value, hint]) => (
              <StatCard key={label} label={label} value={value} hint={hint} />
            ))}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Per paket</CardTitle>
              <CardDescription>
                Margin = tagihan jamaah aktif + uang pembatalan yang tidak dikembalikan − HPP per kamar dari COGS.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Paket</TableHead>
                    <TableHead className="text-right">Jamaah</TableHead>
                    <TableHead className="text-right">Belum DP</TableHead>
                    <TableHead className="text-right">Lunas</TableHead>
                    <TableHead className="text-right">Tagihan</TableHead>
                    <TableHead className="text-right">Masuk</TableHead>
                    <TableHead className="text-right">Sisa</TableHead>
                    <TableHead>Batas {DUE_LABEL}</TableHead>
                    <TableHead className="text-right">HPP</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((r) => {
                    const days = daysUntil(r.due);
                    return (
                      <TableRow key={r.pkg.id}>
                        <TableCell>
                          <Link to={`/admin/jamaah?paket=${r.pkg.id}`} className="font-medium underline-offset-2 hover:underline">
                            {r.pkg.package_name}
                          </Link>
                          <span className="block text-xs text-muted-foreground">{fmtDay(r.pkg.departure_date)} · {r.pkg.duration_days} hari</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {r.count}
                          {r.pkg.slots_total ? <span className="text-muted-foreground">/{r.pkg.slots_total}</span> : null}
                        </TableCell>
                        <TableCell className={`text-right ${r.belumDp ? "text-status-warn-text" : ""}`}>{r.belumDp}</TableCell>
                        <TableCell className="text-right">{r.lunas}</TableCell>
                        <TableCell className="text-right">{juta(r.agreed)}</TableCell>
                        <TableCell className="text-right">
                          {juta(r.paid)}
                          {r.pending > 0 && <span className="block text-xs text-status-warn-text">+{juta(r.pending)}</span>}
                        </TableCell>
                        <TableCell className="text-right font-medium">{juta(r.outstanding)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {fmtDay(r.due)}
                          {r.pkg.departure_date >= today && r.outstanding > 0 && (
                            <span className={`block text-xs ${days < 0 ? "text-status-bad-text" : days <= REMIND_WITHIN_DAYS ? "text-status-warn-text" : "text-muted-foreground"}`}>
                              {days < 0 ? `lewat ${-days} hari` : `${days} hari lagi`}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{r.hpp == null ? <span className="text-xs text-muted-foreground">COGS kosong</span> : juta(r.hpp)}</TableCell>
                        <TableCell className={`text-right font-medium ${r.margin != null && r.margin < 0 ? "text-status-bad-text" : ""}`}>
                          {r.margin == null ? "–" : juta(r.margin)}
                          {r.margin != null && r.revenue > 0 && (
                            <span className="block text-xs font-normal text-muted-foreground">{((r.margin / r.revenue) * 100).toFixed(1)}%</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!report.rows.length && (
                    <TableRow><TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">Tidak ada paket.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Perlu diingatkan</CardTitle>
              <CardDescription>
                Jamaah dengan sisa tagihan yang batas pelunasannya ({DUE_LABEL}) {REMIND_WITHIN_DAYS} hari lagi atau sudah lewat.
                Tombol WhatsApp membuka pesan pengingat yang tinggal dikirim.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jamaah</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>Batas</TableHead>
                    <TableHead className="text-right">Sisa</TableHead>
                    <TableHead className="text-right">Ingatkan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.reminders.map(({ r, pkg, b, due, days }) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <span className="font-medium">{r.full_name}</span>
                        <span className="block text-xs text-muted-foreground">{r.phone || "tanpa no. WA"}</span>
                      </TableCell>
                      <TableCell className="text-sm">{pkg.package_name} · {fmtDay(pkg.departure_date)}</TableCell>
                      <TableCell className={`whitespace-nowrap text-sm ${days < 0 ? "text-status-bad-text" : "text-status-warn-text"}`}>
                        {fmtDay(due)} · {days < 0 ? `lewat ${-days} hari` : days === 0 ? "hari ini" : `${days} hari lagi`}
                      </TableCell>
                      <TableCell className="text-right font-medium">{rupiah(b.outstanding)}</TableCell>
                      <TableCell className="text-right">
                        {r.phone ? (
                          <Button asChild size="sm" variant="outline" className="h-8 gap-1">
                            <a
                              href={reminderWhatsAppUrl({ phone: r.phone, name: r.full_name, packageName: pkg.package_name, departureDate: pkg.departure_date, outstanding: b.outstanding, dueDate: due })}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Isi no. WA dulu</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!report.reminders.length && (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Tidak ada yang perlu diingatkan.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
