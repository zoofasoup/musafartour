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
        .select(
          "id, status, total_price, amount_paid, dp_required, cancel_reason, refund_due, refund_sent_at, created_at, packages(package_name), agents(name)"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const selectedBooking = bookings.find((b) => b.id === detailId);

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
    // Cancel returns null; OK with an empty (or whitespace-only) box returns "".
    // Both must abort - a forced settlement is the one action here that moves
    // money without Midtrans confirming it, so it has to carry a real reason.
    // admin_mark_payment_settled rejects a blank reason server-side too.
    if (notes === null) return;
    if (!notes.trim()) {
      toast.error("Alasan override wajib diisi");
      return;
    }

    const { error } = await supabase.rpc("admin_mark_payment_settled", {
      _order_id: orderId,
      _admin_notes: notes.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pembayaran ditandai lunas");
    queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["admin-booking-payments", detailId] });
  };

  // Policy (decided with the user): DP is forfeited on cancellation,
  // everything paid beyond DP is refunded in full, no cancellation fee.
  // Doesn't touch already-credited agent commission either way - that's a
  // separate decision not made yet.
  const handleCancelBooking = async (booking: NonNullable<typeof selectedBooking>) => {
    const refundPreview = Math.max(0, booking.amount_paid - booking.dp_required);
    const confirmed = window.confirm(
      `Batalkan booking ini? DP Rp ${new Intl.NumberFormat("id-ID").format(booking.dp_required)} hangus. ` +
        `Sisa yang perlu dikembalikan ke jamaah: Rp ${new Intl.NumberFormat("id-ID").format(refundPreview)}.`
    );
    if (!confirmed) return;

    const reason = window.prompt("Alasan pembatalan:");
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("Alasan pembatalan wajib diisi");
      return;
    }

    const { error } = await supabase.rpc("cancel_booking", {
      _booking_id: booking.id,
      _reason: reason.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Booking dibatalkan");
    queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
  };

  const handleMarkRefundSent = async (bookingId: string) => {
    const confirmed = window.confirm("Tandai refund sudah dikirim ke jamaah?");
    if (!confirmed) return;

    const { error } = await supabase.rpc("mark_refund_sent", { _booking_id: bookingId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Refund ditandai terkirim");
    queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
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
              <span className="text-sm text-muted-foreground">
                {STATUS_LABEL[b.status] ?? b.status}
                {b.status === "cancelled" && (b.refund_due ?? 0) > 0 && !b.refund_sent_at && (
                  <span className="ml-2 text-destructive font-medium">· Refund belum dikirim</span>
                )}
              </span>
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

          {selectedBooking && ["held", "active", "completed"].includes(selectedBooking.status) && (
            <Button size="sm" variant="destructive" onClick={() => handleCancelBooking(selectedBooking)}>
              Batalkan Booking
            </Button>
          )}

          {selectedBooking?.status === "cancelled" && (
            <div className="rounded-md border p-3 space-y-1 text-sm">
              <p className="font-medium">Booking dibatalkan</p>
              {selectedBooking.cancel_reason && (
                <p className="text-muted-foreground">Alasan: {selectedBooking.cancel_reason}</p>
              )}
              <p>
                Refund yang perlu dikirim: Rp{" "}
                {new Intl.NumberFormat("id-ID").format(selectedBooking.refund_due ?? 0)}
              </p>
              {(selectedBooking.refund_due ?? 0) > 0 && (
                selectedBooking.refund_sent_at ? (
                  <p className="text-muted-foreground">Sudah dikirim</p>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleMarkRefundSent(selectedBooking.id)}>
                    Tandai Refund Terkirim
                  </Button>
                )
              )}
            </div>
          )}

          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="text-sm">Rp {new Intl.NumberFormat("id-ID").format(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">{p.status} · {p.midtrans_order_id}</p>
                </div>
                {/* Only a payment still genuinely awaiting the customer can be
                    force-settled here. Midtrans has already told us an
                    'expired'/'failed' VA never received money, so offering a
                    one-click "mark paid" on it is a way to credit money that
                    provably never arrived; overriding one of those needs a more
                    deliberate path than this button. */}
                {p.status === "pending" && (
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
