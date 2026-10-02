import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentTable } from "@/components/admin/jamaah/PaymentTable";
import { rupiah, type Payment } from "@/lib/jamaah";
import { useInvalidateJamaah, useJamaahPackages } from "@/hooks/useJamaah";

type Tab = "pending" | "verified" | "rejected" | "all";

export default function JamaahPayments() {
  const { user, userRole } = useAuth();
  const isOwner = userRole === "admin" || userRole === "superadmin";
  const [tab, setTab] = useState<Tab>("pending");
  const { data: packages = [] } = useJamaahPackages();
  const invalidate = useInvalidateJamaah();

  const { data, isLoading } = useQuery({
    queryKey: ["jamaah-payments", tab],
    queryFn: async () => {
      let q = supabase.from("jamaah_payments").select("*").order("recorded_at", { ascending: false }).limit(300);
      if (tab !== "all") q = q.eq("status", tab);
      const { data: payments, error } = await q;
      if (error) throw error;
      const ids = [...new Set((payments ?? []).map((p) => p.registration_id))];
      const { data: regs, error: regError } = ids.length
        ? await supabase.from("jamaah_registrations").select("id, full_name, package_id").in("id", ids)
        : { data: [], error: null };
      if (regError) throw regError;
      return { payments: (payments ?? []) as Payment[], regs: regs ?? [] };
    },
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["jamaah-payments", "count-pending"],
    queryFn: async () => {
      const { count } = await supabase.from("jamaah_payments").select("id", { count: "exact", head: true }).eq("status", "pending");
      return count ?? 0;
    },
  });

  const payments = data?.payments ?? [];
  const pendingTotal = tab === "pending" ? payments.reduce((s, p) => s + Number(p.amount), 0) : 0;

  const describe = (p: Payment) => {
    const reg = data?.regs.find((r) => r.id === p.registration_id);
    const pkg = packages.find((x) => x.id === reg?.package_id);
    return (
      <span>
        <span className="font-medium">{reg?.full_name ?? "–"}</span>
        {pkg && (
          <Link to={`/admin/jamaah?paket=${pkg.id}`} className="block text-xs text-muted-foreground underline-offset-2 hover:underline">
            {pkg.package_name} · {format(new Date(`${pkg.departure_date}T00:00:00`), "d MMM yyyy", { locale: localeId })}
          </Link>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verifikasi Pembayaran</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isOwner
            ? "Cocokkan dengan mutasi rekening PT, lalu verifikasi. Hanya pembayaran terverifikasi yang dihitung masuk."
            : "Pembayaran yang kamu catat menunggu verifikasi owner sebelum dihitung masuk."}
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="pending">Menunggu{pendingCount ? ` (${pendingCount})` : ""}</TabsTrigger>
          <TabsTrigger value="verified">Terverifikasi</TabsTrigger>
          <TabsTrigger value="rejected">Ditolak</TabsTrigger>
          <TabsTrigger value="all">Semua</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "pending" && payments.length > 0 && (
        <Card>
          <CardContent className="p-4 text-sm">
            {payments.length} pembayaran menunggu verifikasi, total <strong>{rupiah(pendingTotal)}</strong>.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <PaymentTable
          payments={payments}
          isOwner={isOwner}
          currentUserId={user?.id}
          describe={describe}
          onChanged={invalidate}
          empty={tab === "pending" ? "Tidak ada pembayaran yang menunggu verifikasi." : "Belum ada pembayaran."}
        />
      )}
    </div>
  );
}
