import { useState, useEffect } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useJamaahAuth } from "@/hooks/useJamaahAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VaDetails {
  va_number: string;
  bank: string;
  total_charged: number;
}

const formatRupiah = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

const BookingPayment = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user, loading: authLoading } = useJamaahAuth();

  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [dpAmount, setDpAmount] = useState<number | null>(null);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [va, setVa] = useState<VaDetails | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bookingId || !user) return;

    const loadBooking = async () => {
      setBookingLoading(true);

      // Finding 5: a booking can already have a VA that was issued but never
      // paid. Fetching it alongside the booking lets us show that existing VA
      // instead of generating a second one for the same balance - paying both
      // would leave amount_paid > total_price with no refund path.
      // create_booking_payment now also subtracts pending payments from the
      // remaining balance server-side, so a second VA would be rejected anyway;
      // this makes the UI show the useful thing rather than an error.
      const [{ data, error }, { data: pending }] = await Promise.all([
        supabase
          .from("bookings")
          .select("dp_required, status, total_price, amount_paid")
          .eq("id", bookingId)
          .single(),
        supabase
          .from("booking_payments")
          .select("midtrans_order_id, va_number, bank, total_charged")
          .eq("booking_id", bookingId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (error || !data) {
        setBookingError("Booking tidak ditemukan.");
        setBookingLoading(false);
        return;
      }

      if (data.status === "held") {
        setBookingStatus("held");
        setDpAmount(data.dp_required);
        setTotalPrice(data.total_price);
        setAmountInput(String(data.dp_required));
      } else if (data.status === "active") {
        setBookingStatus("active");
        setTotalPrice(data.total_price);
        setRemaining(data.total_price - data.amount_paid);
      } else {
        setBookingError("Booking ini tidak dapat menerima pembayaran saat ini.");
        setBookingLoading(false);
        return;
      }

      const outstanding = pending?.[0];
      if (outstanding) {
        if (outstanding.va_number && outstanding.bank) {
          setVa({
            va_number: outstanding.va_number,
            bank: outstanding.bank,
            total_charged: outstanding.total_charged,
          });
        } else {
          // The payment row exists but Midtrans never returned VA details
          // (e.g. the tab was closed mid-request). Resume that same order
          // rather than creating another one.
          setPendingOrderId(outstanding.midtrans_order_id);
        }
      }

      setBookingLoading(false);
    };
    loadBooking();
  }, [bookingId, user]);

  // Finding 8: the first payment used to be hardcoded to exactly dp_required,
  // so paying in full up front was impossible - it required waiting for the DP
  // to settle and then paying the rest as a separate installment. The held case
  // now takes any amount from the DP up to the full total.
  const parsedAmount = amountInput ? Number(amountInput) : null;
  const minAmount = bookingStatus === "held" ? dpAmount ?? 0 : 0;
  const maxAmount = bookingStatus === "held" ? totalPrice ?? 0 : remaining ?? 0;
  const amountValid =
    parsedAmount !== null &&
    !Number.isNaN(parsedAmount) &&
    Number.isInteger(parsedAmount) && // whole rupiah only; Midtrans rejects decimal IDR
    parsedAmount > 0 &&
    parsedAmount >= minAmount &&
    (maxAmount === 0 || parsedAmount <= maxAmount);
  const canPay = amountValid || !!pendingOrderId;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/jamaah/auth?redirect=/booking/${bookingId}/bayar`} replace />;
  }

  const fetchVa = async (orderId: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const res = await fetch("/create-payment", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ order_id: orderId }),
    });

    if (!res.ok) {
      toast.error("Gagal membuat Virtual Account");
      return;
    }
    setVa((await res.json()) as VaDetails);
  };

  const handleCreatePayment = async () => {
    if (!bookingId || !canPay) return;
    setLoading(true);

    // Resume the outstanding order instead of issuing a second VA.
    if (pendingOrderId) {
      await fetchVa(pendingOrderId);
      setLoading(false);
      return;
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc("create_booking_payment", {
      _booking_id: bookingId,
      _amount: parsedAmount as number,
    });
    if (rpcError || !rpcResult?.[0]) {
      toast.error(rpcError?.message || "Gagal membuat pembayaran");
      setLoading(false);
      return;
    }

    await fetchVa(rpcResult[0].order_id);
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Pembayaran</h1>

      {bookingLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : va ? (
        <div className="space-y-2 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Transfer ke Virtual Account {va.bank.toUpperCase()}</p>
          <p className="text-2xl font-bold tracking-wide break-all">{va.va_number}</p>
          <p className="text-sm">
            Total: {formatRupiah(va.total_charged)} (termasuk biaya admin Rp 4.000)
          </p>
        </div>
      ) : bookingError ? (
        <p className="text-sm text-destructive">{bookingError}</p>
      ) : (
        <div className="space-y-4">
          {pendingOrderId ? (
            <p className="text-sm text-muted-foreground">
              Ada pembayaran yang belum selesai untuk booking ini. Lanjutkan pembayaran tersebut di bawah.
            </p>
          ) : (
            <>
              {bookingStatus === "held" && dpAmount !== null && totalPrice !== null && (
                <div className="space-y-1.5">
                  <p className="text-sm text-muted-foreground">Total tagihan: {formatRupiah(totalPrice)}</p>
                  <Label htmlFor="pay-amount">Jumlah yang ingin dibayar</Label>
                  <Input
                    id="pay-amount"
                    type="number"
                    inputMode="numeric"
                    min={dpAmount}
                    max={totalPrice}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum DP {formatRupiah(dpAmount)}, atau langsung lunas {formatRupiah(totalPrice)}
                  </p>
                </div>
              )}
              {bookingStatus === "active" && remaining !== null && (
                <div className="space-y-1.5">
                  <p className="text-sm text-muted-foreground">Sisa tagihan: {formatRupiah(remaining)}</p>
                  <Label htmlFor="pay-amount">Jumlah yang ingin dibayar</Label>
                  <Input
                    id="pay-amount"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={remaining}
                    placeholder="0"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum Rp 500.000, atau lunasi sisa {formatRupiah(remaining)} sekaligus
                  </p>
                </div>
              )}
            </>
          )}
          <Button className="w-full sm:w-auto" onClick={handleCreatePayment} disabled={loading || !canPay}>
            {loading ? "Memproses..." : pendingOrderId ? "Lihat Virtual Account" : "Buat Virtual Account"}
          </Button>
        </div>
      )}

      {/* Way back into the jamaah portal - without this a customer who has just
          been shown a VA has no link onward to their own bookings. */}
      <Link
        to="/jamaah/dashboard"
        className="mt-6 inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Lihat Booking Saya
      </Link>
    </div>
  );
};

export default BookingPayment;
