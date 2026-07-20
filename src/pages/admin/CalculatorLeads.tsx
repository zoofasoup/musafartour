import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Download, MessageCircle, Copy, Search, UserCheck } from "lucide-react";
import { STATUS_OPTIONS, type LeadStatus } from "@/lib/calcConfig";
import { formatIDR } from "@/lib/umrohCalc";

interface Lead {
  id: string;
  created_at: string;
  name: string;
  whatsapp: string;
  mode: string;
  monthly_saving: number | null;
  target_timeframe_months: number | null;
  selected_package: string | null;
  recommended_tier: string | null;
  calculated_monthly_target: number | null;
  calculated_daily_target: number | null;
  daily_target: number | null;
  pilgrim_count: number | null;
  existing_savings: number | null;
  months_to_departure: number | null;
  status: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  fbclid: string | null;
  ctwa_clid: string | null;
  event_id: string | null;
  result_data: any;
  assigned_to: string | null;
  assigned_to_email: string | null;
}

export default function CalculatorLeads() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [packageFilter, setPackageFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [openLead, setOpenLead] = useState<Lead | null>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["calculator-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("umroh_calculator_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as unknown as Lead[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("umroh_calculator_leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status diperbarui");
      qc.invalidateQueries({ queryKey: ["calculator-leads"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const claimLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("umroh_calculator_leads")
        .update({ assigned_to: user?.id, assigned_to_email: user?.email })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead diklaim");
      qc.invalidateQueries({ queryKey: ["calculator-leads"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!leads) return [];
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (modeFilter !== "all" && l.mode !== modeFilter) return false;
      if (packageFilter !== "all" && (l.selected_package ?? l.recommended_tier ?? "") !== packageFilter) return false;
      if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(l.created_at) > new Date(dateTo + "T23:59:59")) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!l.name.toLowerCase().includes(q) && !l.whatsapp.includes(q)) return false;
      }
      return true;
    });
  }, [leads, search, statusFilter, modeFilter, packageFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    if (!leads) return { total: 0, today: 0, modeA: 0, modeB: 0, avgSaving: 0, topPackage: "—" };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayCount = leads.filter((l) => new Date(l.created_at) >= today).length;
    const modeA = leads.filter((l) => l.mode === "A").length;
    const modeB = leads.filter((l) => l.mode === "B").length;
    const savings = leads.filter((l) => l.monthly_saving).map((l) => l.monthly_saving!);
    const avg = savings.length ? savings.reduce((a, b) => a + b, 0) / savings.length : 0;
    const pkgCounts: Record<string, number> = {};
    leads.forEach((l) => {
      const p = l.selected_package || l.recommended_tier;
      if (p) pkgCounts[p] = (pkgCounts[p] || 0) + 1;
    });
    const top = Object.entries(pkgCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    return { total: leads.length, today: todayCount, modeA, modeB, avgSaving: avg, topPackage: top };
  }, [leads]);

  const exportCSV = () => {
    const rows = filtered;
    const headers = ["Tanggal", "Nama", "WhatsApp", "Mode", "Paket", "Target Bulan", "Nabung/Bln", "Jamaah", "Status", "UTM Source", "UTM Campaign", "Result URL"];
    const csv = [
      headers.join(","),
      ...rows.map((l) => [
        new Date(l.created_at).toLocaleString("id-ID"),
        `"${l.name}"`,
        l.whatsapp,
        l.mode,
        l.selected_package || l.recommended_tier || "",
        l.target_timeframe_months ?? l.months_to_departure ?? "",
        l.calculated_monthly_target ?? l.monthly_saving ?? "",
        l.pilgrim_count ?? "",
        l.status,
        l.utm_source || "",
        l.utm_campaign || "",
        `${window.location.origin}/kalkulator/hasil/${l.id}`,
      ].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `calculator-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const buildWaLink = (l: Lead) => {
    const url = `${window.location.origin}/kalkulator/hasil/${l.id}`;
    const targetText = l.mode === "B"
      ? `${l.target_timeframe_months} bulan lagi, butuh nabung ${formatIDR(l.calculated_monthly_target ?? 0)}/bulan`
      : `Insya Allah berangkat dalam ${l.months_to_departure ?? "-"} bulan`;
    const msg = `Assalamu'alaikum ${l.name},\n\nTerima kasih sudah pakai Umroh Financial Planner Musafar. Ini ringkasan rencanamu:\n\n• Paket: ${l.selected_package || l.recommended_tier || "-"}\n• ${targetText}\n• Target harian: ${formatIDR(l.daily_target ?? 0)}\n\nLink lengkap: ${url}\n\nKami siap bantu kapan pun. Barakallah.`;
    const wa = l.whatsapp.replace(/[^0-9]/g, "").replace(/^0/, "62");
    return `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
  };

  const packageOptions = useMemo(() => {
    const set = new Set<string>();
    leads?.forEach((l) => {
      const p = l.selected_package || l.recommended_tier;
      if (p) set.add(p);
    });
    return Array.from(set);
  }, [leads]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Calculator Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">Lead dari Umroh Financial Planner</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Lead" value={stats.total.toString()} />
        <StatCard label="Hari Ini" value={stats.today.toString()} accent />
        <StatCard label="Mode A / B" value={`${stats.modeA} / ${stats.modeB}`} />
        <StatCard label="Avg Nabung" value={stats.avgSaving > 0 ? formatIDR(stats.avgSaving) : "—"} />
        <StatCard label="Paket Top" value={stats.topPackage} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama / no WA…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Mode</SelectItem>
              <SelectItem value="A">Mode A</SelectItem>
              <SelectItem value="B">Mode B</SelectItem>
            </SelectContent>
          </Select>
          <Select value={packageFilter} onValueChange={setPackageFilter}>
            <SelectTrigger><SelectValue placeholder="Paket" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Paket</SelectItem>
              {packageOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>Lead List · {filtered.length}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Tidak ada lead.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground tracking-wider">
                  <tr>
                    <th className="text-left py-2">Tanggal</th>
                    <th className="text-left py-2">Nama</th>
                    <th className="text-left py-2">WA</th>
                    <th className="text-left py-2">Mode</th>
                    <th className="text-left py-2">Paket</th>
                    <th className="text-left py-2">Target</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Ditugaskan</th>
                    <th className="text-right py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setOpenLead(l)}>
                      <td className="py-3 text-xs">{new Date(l.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td className="py-3 font-medium">{l.name}</td>
                      <td className="py-3 text-xs">{l.whatsapp}</td>
                      <td className="py-3"><Badge variant={l.mode === "A" ? "default" : "secondary"}>{l.mode}</Badge></td>
                      <td className="py-3 text-xs">{l.selected_package || l.recommended_tier || "—"}</td>
                      <td className="py-3 text-xs">
                        {l.mode === "B"
                          ? `${l.target_timeframe_months} bln · ${formatIDR(l.calculated_monthly_target ?? 0)}/bln`
                          : `${l.months_to_departure ?? "—"} bln`}
                      </td>
                      <td className="py-3" onClick={(e) => e.stopPropagation()}>
                        <Select value={l.status} onValueChange={(v) => updateStatus.mutate({ id: l.id, status: v })}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 text-xs" onClick={(e) => e.stopPropagation()}>
                        {l.assigned_to_email ? (
                          <span className="text-muted-foreground" title={l.assigned_to_email}>
                            {l.assigned_to_email.split("@")[0]}
                          </span>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => claimLead.mutate(l.id)}>
                            <UserCheck className="h-3.5 w-3.5" /> Klaim
                          </Button>
                        )}
                      </td>
                      <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" asChild>
                            <a href={buildWaLink(l)} target="_blank" rel="noopener noreferrer" title="Kirim hasil via WA">
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/kalkulator/hasil/${l.id}`);
                            toast.success("Link disalin");
                          }} title="Salin link hasil">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!openLead} onOpenChange={(o) => !o && setOpenLead(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{openLead?.name}</SheetTitle>
          </SheetHeader>
          {openLead && (
            <div className="space-y-3 mt-6 text-sm">
              <Row k="Tanggal" v={new Date(openLead.created_at).toLocaleString("id-ID")} />
              <Row k="WhatsApp" v={openLead.whatsapp} />
              <Row k="Mode" v={openLead.mode} />
              <Row k="Paket" v={openLead.selected_package || openLead.recommended_tier || "—"} />
              <Row k="Jamaah" v={`${openLead.pilgrim_count ?? "-"} orang`} />
              <Row k="Tabungan awal" v={formatIDR(openLead.existing_savings ?? 0)} />
              {openLead.mode === "A" && <Row k="Nabung/bulan" v={formatIDR(openLead.monthly_saving ?? 0)} />}
              {openLead.mode === "B" && <Row k="Target bulan" v={`${openLead.target_timeframe_months} bulan`} />}
              {openLead.mode === "B" && <Row k="Harus nabung" v={`${formatIDR(openLead.calculated_monthly_target ?? 0)}/bln`} />}
              <Row k="Target harian" v={formatIDR(openLead.daily_target ?? 0)} />
              <Row k="Status" v={openLead.status} />
              {openLead.utm_source && <Row k="UTM Source" v={openLead.utm_source} />}
              {openLead.utm_campaign && <Row k="UTM Campaign" v={openLead.utm_campaign} />}
              {openLead.fbclid && <Row k="fbclid" v={openLead.fbclid.slice(0, 20) + "…"} />}
              {openLead.ctwa_clid && <Row k="ctwa_clid" v={openLead.ctwa_clid.slice(0, 20) + "…"} />}
              <div className="pt-3 space-y-2">
                <Button asChild className="w-full gap-2">
                  <a href={buildWaLink(openLead)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" /> Kirim hasil via WhatsApp
                  </a>
                </Button>
                <Button variant="outline" className="w-full gap-2" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/kalkulator/hasil/${openLead.id}`);
                  toast.success("Link disalin");
                }}>
                  <Copy className="h-4 w-4" /> Salin link hasil
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-red-600" : ""}>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-black mt-1 tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b pb-2">
      <span className="text-muted-foreground text-xs uppercase tracking-wider">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}
