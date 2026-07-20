import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface SpendRow {
  id: string;
  campaign_name: string;
  platform: string;
  amount: number;
  period_start: string;
  period_end: string;
  notes: string | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  tiktok: "TikTok Ads",
  other: "Lainnya",
};

/** Advertiser's manual spend log, joined against the site's existing UTM-tagged conversions to compute real CPA - spend lives in Meta/Google/TikTok Ads Manager, conversions live here, and nothing connected the two before this page. */
export default function AdSpend() {
  const qc = useQueryClient();
  const [campaignName, setCampaignName] = useState("");
  const [platform, setPlatform] = useState("meta");
  const [amount, setAmount] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");

  const { data: spendRows = [], isLoading } = useQuery({
    queryKey: ["campaign-spend"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_spend")
        .select("*")
        .order("period_start", { ascending: false });
      if (error) throw error;
      return data as SpendRow[];
    },
  });

  const { data: waConversions = [] } = useQuery({
    queryKey: ["ad-spend-wa-conversions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversions")
        .select("id, whatsapp_clicks(utm_campaign)");
      if (error) throw error;
      return data as { id: string; whatsapp_clicks: { utm_campaign: string | null } | null }[];
    },
  });

  const { data: calculatorLeads = [] } = useQuery({
    queryKey: ["ad-spend-calculator-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("umroh_calculator_leads")
        .select("id, utm_campaign, status")
        .eq("status", "CLOSED");
      if (error) throw error;
      return data as { id: string; utm_campaign: string | null; status: string }[];
    },
  });

  const addSpend = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("campaign_spend").insert({
        campaign_name: campaignName.trim(),
        platform,
        amount: parseFloat(amount),
        period_start: periodStart,
        period_end: periodEnd,
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Spend dicatat");
      qc.invalidateQueries({ queryKey: ["campaign-spend"] });
      setCampaignName("");
      setAmount("");
      setPeriodStart("");
      setPeriodEnd("");
      setNotes("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSpend = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaign_spend").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign-spend"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const performance = useMemo(() => {
    const byCampaign: Record<string, { spend: number; waConversions: number; leadConversions: number }> = {};
    const ensure = (name: string) => {
      if (!byCampaign[name]) byCampaign[name] = { spend: 0, waConversions: 0, leadConversions: 0 };
      return byCampaign[name];
    };

    for (const row of spendRows) {
      ensure(row.campaign_name).spend += row.amount;
    }
    for (const c of waConversions) {
      const campaign = c.whatsapp_clicks?.utm_campaign;
      if (campaign) ensure(campaign).waConversions += 1;
    }
    for (const l of calculatorLeads) {
      if (l.utm_campaign) ensure(l.utm_campaign).leadConversions += 1;
    }

    return Object.entries(byCampaign)
      .map(([campaign, v]) => {
        const totalConversions = v.waConversions + v.leadConversions;
        return {
          campaign,
          spend: v.spend,
          totalConversions,
          cpa: totalConversions > 0 ? v.spend / totalConversions : null,
        };
      })
      .sort((a, b) => b.spend - a.spend);
  }, [spendRows, waConversions, calculatorLeads]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Ad Spend & Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Catat pengeluaran iklan per campaign supaya cost-per-conversion terlihat di sini, tanpa perlu bolak-balik ke Ads Manager.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Spend</CardTitle>
          <CardDescription>Nama campaign harus sama persis dengan utm_campaign yang dipakai di iklan supaya bisa dicocokkan dengan data konversi.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Campaign</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="mis. ramadan_promo_2026" />
            </div>
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Spend (Rp)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000000" />
            </div>
            <div className="space-y-1.5">
              <Label>Mulai</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Selesai</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <Label>Catatan (opsional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button
            className="mt-3"
            onClick={() => addSpend.mutate()}
            disabled={addSpend.isPending || !campaignName.trim() || !amount || !periodStart || !periodEnd}
          >
            {addSpend.isPending ? "Menyimpan..." : "Simpan Spend"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Performa per Campaign</CardTitle></CardHeader>
        <CardContent>
          {performance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Belum ada data spend atau konversi.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground tracking-wider">
                  <tr>
                    <th className="text-left py-2">Campaign</th>
                    <th className="text-right py-2">Total Spend</th>
                    <th className="text-right py-2">Konversi</th>
                    <th className="text-right py-2">CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((p) => (
                    <tr key={p.campaign} className="border-b">
                      <td className="py-3 font-medium">{p.campaign}</td>
                      <td className="py-3 text-right">{formatCurrency(p.spend)}</td>
                      <td className="py-3 text-right">{p.totalConversions}</td>
                      <td className="py-3 text-right font-semibold">{p.cpa !== null ? formatCurrency(p.cpa) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Riwayat Spend · {spendRows.length}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : spendRows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Belum ada spend tercatat.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground tracking-wider">
                  <tr>
                    <th className="text-left py-2">Periode</th>
                    <th className="text-left py-2">Campaign</th>
                    <th className="text-left py-2">Platform</th>
                    <th className="text-right py-2">Spend</th>
                    <th className="text-right py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {spendRows.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      <td className="py-3 text-xs whitespace-nowrap">{row.period_start} — {row.period_end}</td>
                      <td className="py-3 font-medium">{row.campaign_name}</td>
                      <td className="py-3 text-xs">{PLATFORM_LABELS[row.platform] || row.platform}</td>
                      <td className="py-3 text-right">{formatCurrency(row.amount)}</td>
                      <td className="py-3 text-right">
                        <Button size="icon" variant="ghost" onClick={() => deleteSpend.mutate(row.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
