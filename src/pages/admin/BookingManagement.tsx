import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  held: "Menunggu DP",
  active: "Aktif",
  completed: "Lunas",
  expired: "Kadaluarsa",
  cancelled: "Dibatalkan",
};

const BookingManagement = () => {
  const queryClient = useQueryClient();
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: bookings = [] } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, total_price, amount_paid, created_at, packages(package_name), agents(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["admin-booking-payments", detailId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_payments")
        .select("id, amount, status, midtrans_order_id, created_at, paid_at")
        .eq("booking_id", detailId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!detailId,
  });

  const handleMarkPaid = async (orderId: string) => {
    const notes = window.prompt("Alasan override manual (misal: webhook gagal masuk):");
    if (notes === null) return;

    const { error } = await supabase.rpc("admin_mark_payment_settled", {
      _order_id: orderId,
      _admin_notes: notes,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pembayaran ditandai lunas");
    queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["admin-booking-payments", detailId] });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Kelola Booking</h1>
      <div className="space-y-2">
        {bookings.map((b) => (
          <button
            key={b.id}
            onClick={() => setDetailId(b.id)}
            className="w-full text-left rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex justify-between">
              <span className="font-semibold">{(b.packages as any)?.package_name}</span>
              <span className="text-sm text-muted-foreground">{STATUS_LABEL[b.status] ?? b.status}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Rp {new Intl.NumberFormat("id-ID").format(b.amount_paid)} / Rp{" "}
              {new Intl.NumberFormat("id-ID").format(b.total_price)}
              {(b.agents as any)?.name && ` · Agent: ${(b.agents as any).name}`}
            </p>
          </button>
        ))}
      </div>

      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Riwayat Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="text-sm">Rp {new Intl.NumberFormat("id-ID").format(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">{p.status} · {p.midtrans_order_id}</p>
                </div>
                {p.status !== "settled" && (
                  <Button size="sm" variant="outline" onClick={() => handleMarkPaid(p.midtrans_order_id)}>
                    Tandai Lunas
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingManagement;
