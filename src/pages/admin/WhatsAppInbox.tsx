import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Search, UserCheck } from "lucide-react";

interface Click {
  id: string;
  clicked_at: string;
  cs_id: string | null;
  cs_name: string;
  message: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  assigned_to_email: string | null;
}

interface Conversion {
  id: string;
  click_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  package_name: string | null;
}

/** Sales' lead queue for WhatsApp inquiries - lets them record which clicks turned into a real booking, closing the gap where whatsapp_conversions existed but nothing ever wrote to it. */
export default function WhatsAppInbox() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [convertClick, setConvertClick] = useState<Click | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [packageName, setPackageName] = useState("");
  const [notes, setNotes] = useState("");

  const { data: clicks, isLoading } = useQuery({
    queryKey: ["whatsapp-clicks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_clicks")
        .select("id, clicked_at, cs_id, cs_name, message, utm_source, utm_campaign, assigned_to_email")
        .order("clicked_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Click[];
    },
  });

  const { data: conversions } = useQuery({
    queryKey: ["whatsapp-conversions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversions")
        .select("id, click_id, customer_name, customer_phone, package_name");
      if (error) throw error;
      return data as Conversion[];
    },
  });

  const convertedClickIds = useMemo(
    () => new Set((conversions || []).map((c) => c.click_id).filter(Boolean)),
    [conversions]
  );

  const filtered = useMemo(() => {
    if (!clicks) return [];
    if (!search) return clicks;
    const q = search.toLowerCase();
    return clicks.filter(
      (c) => c.cs_name.toLowerCase().includes(q) || (c.message || "").toLowerCase().includes(q)
    );
  }, [clicks, search]);

  const openConvertDialog = (click: Click) => {
    setConvertClick(click);
    setCustomerName("");
    setCustomerPhone("");
    setPackageName("");
    setNotes("");
  };

  const recordConversion = useMutation({
    mutationFn: async () => {
      if (!convertClick) return;
      const { error } = await supabase.from("whatsapp_conversions").insert({
        click_id: convertClick.id,
        cs_id: convertClick.cs_id,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        package_name: packageName || null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Konversi dicatat");
      qc.invalidateQueries({ queryKey: ["whatsapp-conversions"] });
      setConvertClick(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const claimClick = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_clicks")
        .update({ assigned_to: user?.id, assigned_to_email: user?.email })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Klik diklaim");
      qc.invalidateQueries({ queryKey: ["whatsapp-clicks"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">WhatsApp Inbox</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Setiap klik "Chat via WhatsApp" di seluruh situs. Tandai yang berhasil jadi booking supaya conversion rate di Chat Rotation tercatat beneran.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari CS / pesan…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Klik Terbaru · {filtered.length}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Belum ada klik WhatsApp.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground tracking-wider">
                  <tr>
                    <th className="text-left py-2">Tanggal</th>
                    <th className="text-left py-2">CS</th>
                    <th className="text-left py-2">Pesan</th>
                    <th className="text-left py-2">Campaign</th>
                    <th className="text-left py-2">Ditugaskan</th>
                    <th className="text-right py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const converted = convertedClickIds.has(c.id);
                    return (
                      <tr key={c.id} className="border-b hover:bg-muted/30">
                        <td className="py-3 text-xs whitespace-nowrap">
                          {new Date(c.clicked_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="py-3 font-medium">{c.cs_name}</td>
                        <td className="py-3 text-xs max-w-xs truncate" title={c.message || ""}>{c.message || "—"}</td>
                        <td className="py-3 text-xs">{c.utm_campaign || c.utm_source || "—"}</td>
                        <td className="py-3 text-xs">
                          {c.assigned_to_email ? (
                            <span className="text-muted-foreground" title={c.assigned_to_email}>
                              {c.assigned_to_email.split("@")[0]}
                            </span>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => claimClick.mutate(c.id)}>
                              <UserCheck className="h-3.5 w-3.5" /> Klaim
                            </Button>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {converted ? (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Konversi
                            </Badge>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => openConvertDialog(c)}>
                              Tandai Konversi
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!convertClick} onOpenChange={(o) => !o && setConvertClick(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tandai sebagai Konversi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nama Jamaah</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama..." />
            </div>
            <div className="space-y-1.5">
              <Label>No. WhatsApp</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="08..." />
            </div>
            <div className="space-y-1.5">
              <Label>Paket</Label>
              <Input value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="Nama paket..." />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertClick(null)}>Batal</Button>
            <Button onClick={() => recordConversion.mutate()} disabled={recordConversion.isPending}>
              {recordConversion.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
