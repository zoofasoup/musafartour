import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentTable } from "@/components/admin/jamaah/PaymentTable";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { rupiah, type Payment } from "@/lib/jamaah";
import { useInvalidateJamaah, useJamaahPackages } from "@/hooks/useJamaah";

type Tab = "pending" | "verified" | "rejected" | "all";
type PaymentRow = Payment & { jamaah_registrations: { id: string; full_name: string; package_id: string } | null };

const PAGE_SIZE = 50;

export default function JamaahPayments() {
  const { user, userRole } = useAuth();
  const isOwner = userRole === "admin" || userRole === "superadmin";
  const [tab, setTab] = useState<Tab>("pending");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const { data: packages = [] } = useJamaahPackages();
  const invalidate = useInvalidateJamaah();

  // Wait for a pause in typing before asking the server, and go back to page 1 on every new list.
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(0), [tab, term]);

  // One request per page. The jamaah name and package come from the same query (embedded relation), so there is
  // no second request with a long `.in("id", ...)` list, which breaks past ~200 ids.
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["jamaah-payments", tab, term, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      // The generated types do not list this relation, so the embedded select is typed loosely.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from("jamaah_payments")
        .select(`*, jamaah_registrations${term ? "!inner" : ""}(id, full_name, package_id)`, { count: "exact" })
        .order("recorded_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (tab !== "all") q = q.eq("status", tab);
      if (term) q = q.ilike("jamaah_registrations.full_name", `%${term}%`);
      const { data: rows, count, error: err } = await q;
      if (err) throw err;
      return { payments: (rows ?? []) as PaymentRow[], total: (count ?? 0) as number };
    },
  });

  // Amount of everything waiting, across all pages (the page itself only holds 50 rows).
  const { data: pending } = useQuery({
    queryKey: ["jamaah-payments", "pending-summary"],
    queryFn: async () => {
      const { data: rows, count, error: err } = await supabase
        .from("jamaah_payments")
        .select("amount", { count: "exact" })
        .eq("status", "pending")
        .range(0, 999);
      if (err) throw err;
      return { count: count ?? 0, total: (rows ?? []).reduce((s, r) => s + Number(r.amount), 0) };
    },
  });
  const pendingCount = pending?.count ?? 0;

  const payments = data?.payments ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // After deleting or verifying the last row of the last page, step back instead of showing an empty page.
  useEffect(() => {
    if (data && page > 0 && page >= pages) setPage(pages - 1);
  }, [data, page, pages]);

  const describe = (p: Payment) => {
    const reg = (p as PaymentRow).jamaah_registrations;
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

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama jamaah"
          aria-label="Cari pembayaran berdasarkan nama jamaah"
          className="pl-9"
        />
      </div>

      {tab === "pending" && pendingCount > 0 && !term && (
        <Card>
          <CardContent className="p-4 text-sm">
            {pendingCount} pembayaran menunggu verifikasi, total <strong>{rupiah(pending?.total ?? 0)}</strong>.
          </CardContent>
        </Card>
      )}

      {error && !data ? (
        <LoadError what="Daftar pembayaran" error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : isLoading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Memuat pembayaran">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <>
          {error && <LoadError what="Halaman terbaru" error={error} onRetry={() => refetch()} retrying={isFetching} />}
          <PaymentTable
            payments={payments}
            isOwner={isOwner}
            currentUserId={user?.id}
            describe={describe}
            confirmName={(p) => (p as PaymentRow).jamaah_registrations?.full_name}
            onChanged={invalidate}
            empty={
              term
                ? `Tidak ada pembayaran atas nama "${term}" di tab ini.`
                : tab === "pending"
                  ? "Tidak ada pembayaran yang menunggu verifikasi."
                  : "Belum ada pembayaran."
            }
          />
          {total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {page * PAGE_SIZE + 1} sampai {Math.min(total, (page + 1) * PAGE_SIZE)} dari {total} pembayaran
              </span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setPage((n) => Math.max(0, n - 1))} disabled={page === 0 || isFetching} aria-label="Halaman sebelumnya">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>Halaman {page + 1} dari {pages}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setPage((n) => Math.min(pages - 1, n + 1))} disabled={page >= pages - 1 || isFetching} aria-label="Halaman berikutnya">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
