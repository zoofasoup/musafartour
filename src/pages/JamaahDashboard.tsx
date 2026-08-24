import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useJamaahAuth } from "@/hooks/useJamaahAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  held: "Menunggu DP",
  active: "Aktif (belum lunas)",
  completed: "Lunas",
  expired: "Kadaluarsa",
  cancelled: "Dibatalkan",
};

const PAYABLE_STATUSES = new Set(["held", "active"]);

const formatRupiah = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

const JamaahDashboard = () => {
  const { user, loading: authLoading } = useJamaahAuth();

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["jamaah-bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, status, total_price, amount_paid, room_type, traveler_count, packages(package_name, departure_date)"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/jamaah/auth?redirect=/jamaah/dashboard" replace />;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Booking Saya</h1>

      {bookingsLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const pkg = b.packages;
            return (
              <div key={b.id} className="rounded-lg border p-4 space-y-2">
                <p className="font-semibold break-words">{pkg?.package_name}</p>
                {pkg?.departure_date && (
                  <p className="text-sm text-muted-foreground">
                    Keberangkatan: {format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: localeId })}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {b.room_type} &middot; {b.traveler_count} orang &middot; {STATUS_LABEL[b.status] ?? b.status}
                </p>
                <p className="text-sm">
                  Terbayar: {formatRupiah(b.amount_paid)} / {formatRupiah(b.total_price)}
                </p>
                {PAYABLE_STATUSES.has(b.status) && (
                  <Button asChild size="sm" className="w-full sm:w-auto">
                    <Link to={`/booking/${b.id}/bayar`}>Bayar Sekarang</Link>
                  </Button>
                )}
              </div>
            );
          })}
          {bookings.length === 0 && (
            <p className="text-muted-foreground">Belum ada booking.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default JamaahDashboard;
