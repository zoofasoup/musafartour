import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { todayJakarta } from "@/lib/utils";

// Shape returned by public.get_analytics_summary (supabase/migrations/20260930120000_site_events_analytics.sql).
interface Summary {
  tracking_since: string | null;
  kpis: {
    visitors: number;
    sessions: number;
    page_views: number;
    package_views: number;
    package_viewers: number;
    add_to_cart: number;
    cart_visitors: number;
    site_leads: number;
    lead_visitors: number;
    whatsapp_clicks: number;
    calculator_leads: number;
    conversions: number;
    bookings_created: number;
    bookings_paid: number;
    revenue: number;
    ad_spend: number;
  };
  daily: { day: string; visitors: number; page_views: number; add_to_cart: number; whatsapp_clicks: number; calculator_leads: number }[];
  funnel: { step: "visit" | "view_package" | "add_to_cart" | "lead"; people: number }[];
  sources: { source: string; visitors: number; leads: number }[];
  campaigns: { campaign: string; visitors: number; whatsapp_clicks: number; calculator_leads: number; conversions: number; spend: number }[];
  top_packages: { package_id: string; name: string | null; departure_date: string | null; views: number; viewers: number; add_to_cart: number; leads: number }[];
  top_pages: { path: string; views: number; visitors: number }[];
  lead_buttons: { source: string; leads: number; people: number }[];
  devices: { device: string; visitors: number }[];
  cs: { cs: string; clicks: number; conversions: number }[];
  hours: { hour: number; visitors: number; whatsapp_clicks: number }[];
  short_links: { code: string; title: string | null; clicks: number }[];
}

const RANGES = [
  { key: "today", label: "Hari ini", days: 1 },
  { key: "7d", label: "7 hari", days: 7 },
  { key: "30d", label: "30 hari", days: 30 },
  { key: "90d", label: "90 hari", days: 90 },
  { key: "month", label: "Bulan ini", days: 0 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const FUNNEL_LABELS: Record<Summary["funnel"][number]["step"], string> = {
  visit: "Berkunjung",
  view_package: "Lihat paket",
  add_to_cart: "Masuk keranjang",
  lead: "Hubungi (WA / kalkulator)",
};

// Matches the `source` passed to redirectToWhatsApp / trackLead across the site.
const LEAD_BUTTON_LABELS: Record<string, string> = {
  floating_button: "Tombol WA melayang",
  package_calculator: "Kalkulator harga paket",
  package_solo: "Berangkat sendiri",
  package_waitlist: "Waitlist (halaman paket)",
  package_card_waitlist: "Waitlist (kartu paket)",
  cart_drawer: "Keranjang",
  home_hero: "Hero homepage",
  home_cta_section: "CTA homepage",
  home_package_request: "Minta paket (homepage)",
  paket_umroh_request: "Minta paket (daftar paket)",
  jadwal_daftar: "Daftar (jadwal)",
  jadwal_waitlist: "Waitlist (jadwal)",
  tentang_kami: "Tentang Kami",
  artikel_subscribe: "Langganan info (artikel)",
  footer: "Footer",
  booth: "Booth / pameran",
  umroh_calculator: "Kalkulator tabungan",
  whatsapp_button: "Tombol WA lainnya",
};

const DEVICE_LABELS: Record<string, string> = { mobile: "HP", tablet: "Tablet", desktop: "Komputer", unknown: "Tidak diketahui" };

const num = (n: number | null | undefined) => new Intl.NumberFormat("id-ID").format(n ?? 0);
const rupiah = (n: number | null | undefined) => {
  const v = n ?? 0;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return `Rp ${num(Math.round(v))}`;
};
const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%` : "–");

/** Shift a YYYY-MM-DD date string by whole days. */
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** [from, to) as Jakarta day boundaries: whole days, including today. */
function rangeBounds(key: RangeKey) {
  const today = todayJakarta();
  const range = RANGES.find((r) => r.key === key)!;
  const fromDay = key === "month" ? `${today.slice(0, 8)}01` : addDays(today, -(range.days - 1));
  return { from: `${fromDay}T00:00:00+07:00`, to: `${addDays(today, 1)}T00:00:00+07:00`, fromDay };
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function SimpleTable<T>({ rows, columns, empty = "Belum ada data." }: {
  rows: T[];
  columns: { header: string; cell: (row: T) => React.ReactNode; align?: "right" }[];
  empty?: string;
}) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c.header} className={c.align === "right" ? "text-right" : undefined}>{c.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i}>
            {columns.map((c) => (
              <TableCell key={c.header} className={c.align === "right" ? "text-right" : undefined}>{c.cell(row)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function Analytics() {
  const [range, setRange] = useState<RangeKey>("30d");
  const bounds = useMemo(() => rangeBounds(range), [range]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics-summary", bounds.from, bounds.to],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_analytics_summary", { _from: bounds.from, _to: bounds.to });
      if (error) throw error;
      return data as unknown as Summary;
    },
    staleTime: 60 * 1000,
  });

  const k = data?.kpis;
  const leadsTotal = (k?.whatsapp_clicks ?? 0) + (k?.calculator_leads ?? 0);
  const trackingStartsLate = !!data && (!data.tracking_since || data.tracking_since > bounds.from);

  const daily = useMemo(
    () => (data?.daily ?? []).map((d) => ({ ...d, label: format(new Date(`${d.day}T00:00:00`), "d MMM", { locale: localeId }) })),
    [data?.daily]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pengunjung website, klik WhatsApp, lead, closing, dan belanja iklan di satu tempat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Rentang waktu">
          {RANGES.map((r) => (
            <Button key={r.key} size="sm" variant={range === r.key ? "default" : "outline"} onClick={() => setRange(r.key)}>
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            Data analytics belum bisa dimuat. {(error as Error).message.includes("akses") ? "Akun kamu tidak punya akses ke halaman ini." : "Coba muat ulang halaman."}
          </CardContent>
        </Card>
      )}

      {data && k && (
        <>
          {trackingStartsLate && (
            <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Data pengunjung website (kunjungan, lihat paket, keranjang) baru tercatat
                {data.tracking_since
                  ? ` sejak ${format(new Date(data.tracking_since), "d MMMM yyyy, HH.mm", { locale: localeId })}`
                  : " setelah update ini aktif"}
                . Klik WhatsApp, lead kalkulator, closing, dan booking sudah tercatat sebelumnya.
              </p>
            </div>
          )}

          <section aria-label="Ringkasan" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Pengunjung" value={num(k.visitors)} hint={`${num(k.sessions)} kunjungan · ${num(k.page_views)} halaman`} />
            <Kpi label="Lihat paket" value={num(k.package_viewers)} hint={`${num(k.package_views)} kali dilihat`} />
            <Kpi label="Masuk keranjang" value={num(k.cart_visitors)} hint={`${num(k.add_to_cart)} kali diklik`} />
            <Kpi label="Klik WhatsApp" value={num(k.whatsapp_clicks)} hint={`${num(k.lead_visitors)} orang dari website`} />
            <Kpi label="Lead kalkulator" value={num(k.calculator_leads)} />
            <Kpi label="Closing (konversi WA)" value={num(k.conversions)} hint={`${pct(k.conversions, k.whatsapp_clicks)} dari klik WA`} />
            <Kpi label="Pembayaran masuk" value={rupiah(k.revenue)} hint={`${num(k.bookings_paid)} booking dibayar · ${num(k.bookings_created)} booking baru`} />
            <Kpi
              label="Belanja iklan"
              value={rupiah(k.ad_spend)}
              hint={leadsTotal > 0 && k.ad_spend > 0 ? `${rupiah(k.ad_spend / leadsTotal)} per lead` : "Dicatat di halaman Ad Spend"}
            />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Tren harian</CardTitle>
              <CardDescription>Pengunjung, klik WhatsApp, dan lead kalkulator per hari (WIB).</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ left: -16, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={16} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="visitors" name="Pengunjung" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.12} />
                  <Area type="monotone" dataKey="whatsapp_clicks" name="Klik WhatsApp" stroke="#16a34a" fill="#16a34a" fillOpacity={0.12} />
                  <Area type="monotone" dataKey="calculator_leads" name="Lead kalkulator" stroke="#d97706" fill="#d97706" fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Funnel pengunjung</CardTitle>
                <CardDescription>Jumlah orang di setiap tahap (dari data website).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.funnel.map((f, i) => {
                  const top = data.funnel[0].people || 1;
                  const prev = i > 0 ? data.funnel[i - 1].people : f.people;
                  return (
                    <div key={f.step}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{FUNNEL_LABELS[f.step]}</span>
                        <span className="text-muted-foreground">
                          {num(f.people)} orang{i > 0 && <> · {pct(f.people, prev)} dari tahap sebelumnya</>}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (f.people / top) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tombol yang menghasilkan lead</CardTitle>
                <CardDescription>Tombol WhatsApp / kalkulator yang diklik pengunjung.</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleTable
                  rows={data.lead_buttons}
                  columns={[
                    { header: "Tombol", cell: (r) => LEAD_BUTTON_LABELS[r.source] ?? r.source },
                    { header: "Klik", cell: (r) => num(r.leads), align: "right" },
                    { header: "Orang", cell: (r) => num(r.people), align: "right" },
                  ]}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campaign iklan</CardTitle>
              <CardDescription>
                Dicocokkan lewat utm_campaign. Belanja iklan diambil dari halaman Ad Spend, dihitung proporsional untuk rentang ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleTable
                rows={data.campaigns}
                empty="Belum ada campaign dengan utm_campaign di rentang ini."
                columns={[
                  { header: "Campaign", cell: (r) => <span className="font-medium">{r.campaign}</span> },
                  { header: "Pengunjung", cell: (r) => num(r.visitors), align: "right" },
                  { header: "Klik WA", cell: (r) => num(r.whatsapp_clicks), align: "right" },
                  { header: "Lead kalkulator", cell: (r) => num(r.calculator_leads), align: "right" },
                  { header: "Closing", cell: (r) => num(r.conversions), align: "right" },
                  { header: "Belanja", cell: (r) => (r.spend ? rupiah(r.spend) : "–"), align: "right" },
                  {
                    header: "Biaya / lead",
                    align: "right",
                    cell: (r) => {
                      const leads = r.whatsapp_clicks + r.calculator_leads;
                      return r.spend && leads ? rupiah(r.spend / leads) : "–";
                    },
                  },
                ]}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sumber traffic</CardTitle>
                <CardDescription>utm_source, atau website asal kalau tanpa UTM.</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleTable
                  rows={data.sources}
                  columns={[
                    { header: "Sumber", cell: (r) => (r.source === "direct" ? "Langsung / tidak diketahui" : r.source) },
                    { header: "Pengunjung", cell: (r) => num(r.visitors), align: "right" },
                    { header: "Jadi lead", cell: (r) => `${num(r.leads)} (${pct(r.leads, r.visitors)})`, align: "right" },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Paket paling diminati</CardTitle>
                <CardDescription>Dilihat, masuk keranjang, dan lead dari halaman paket.</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleTable
                  rows={data.top_packages}
                  columns={[
                    {
                      header: "Paket",
                      cell: (r) => (
                        <span>
                          <span className="font-medium">{r.name ?? "Paket dihapus"}</span>
                          {r.departure_date && (
                            <span className="block text-xs text-muted-foreground">
                              {format(new Date(`${r.departure_date}T00:00:00`), "d MMM yyyy", { locale: localeId })}
                            </span>
                          )}
                        </span>
                      ),
                    },
                    { header: "Dilihat", cell: (r) => num(r.views), align: "right" },
                    { header: "Keranjang", cell: (r) => num(r.add_to_cart), align: "right" },
                    { header: "Lead", cell: (r) => num(r.leads), align: "right" },
                  ]}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Jam ramai</CardTitle>
                <CardDescription>Pengunjung dan klik WhatsApp per jam (WIB). Pakai untuk jadwal iklan dan jaga CS.</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.hours} margin={{ left: -16, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 12 }} tickFormatter={(h) => `${h}`} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip labelFormatter={(h) => `Jam ${h}.00–${h}.59`} />
                    <Legend />
                    <Bar dataKey="visitors" name="Pengunjung" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="whatsapp_clicks" name="Klik WhatsApp" fill="#16a34a" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Perangkat</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleTable
                  rows={data.devices}
                  columns={[
                    { header: "Perangkat", cell: (r) => DEVICE_LABELS[r.device] ?? r.device },
                    { header: "Pengunjung", cell: (r) => `${num(r.visitors)} (${pct(r.visitors, k.visitors)})`, align: "right" },
                  ]}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Performa CS</CardTitle>
                <CardDescription>Klik WhatsApp yang diterima dan closing.</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleTable
                  rows={data.cs}
                  columns={[
                    { header: "CS", cell: (r) => r.cs },
                    { header: "Klik", cell: (r) => num(r.clicks), align: "right" },
                    { header: "Closing", cell: (r) => `${num(r.conversions)} (${pct(r.conversions, r.clicks)})`, align: "right" },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Halaman terpopuler</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleTable
                  rows={data.top_pages}
                  columns={[
                    { header: "Halaman", cell: (r) => <span className="break-all">{r.path}</span> },
                    { header: "Dilihat", cell: (r) => num(r.views), align: "right" },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Short link</CardTitle>
                <CardDescription>Klik link pendek dari Pemendek Link.</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleTable
                  rows={data.short_links}
                  columns={[
                    { header: "Link", cell: (r) => <span><span className="font-medium">/{r.code}</span>{r.title && <span className="block text-xs text-muted-foreground">{r.title}</span>}</span> },
                    { header: "Klik", cell: (r) => num(r.clicks), align: "right" },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
