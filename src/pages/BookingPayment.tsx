import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
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
  const [remaining, setRemaining] = useState<number | null>(null);
  const [installmentInput, setInstallmentInput] = useState("");
  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [va, setVa] = useState<VaDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bookingId || !user) return;

    const loadBooking = async () => {
      setBookingLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("dp_required, status, total_price, amount_paid")
        .eq("id", bookingId)
        .single();

      if (error || !data) {
        setBookingError("Booking tidak ditemukan.");
      } else if (data.status === "held") {
        setBookingStatus("held");
        setDpAmount(data.dp_required);
      } else if (data.status === "active") {
        setBookingStatus("active");
        setRemaining(data.total_price - data.amount_paid);
      } else {
        setBookingError("Booking ini tidak dapat menerima pembayaran saat ini.");
      }
      setBookingLoading(false);
    };
    loadBooking();
  }, [bookingId, user]);

  const installmentAmount = installmentInput ? Number(installmentInput) : null;
  const payAmount = bookingStatus === "held" ? dpAmount : installmentAmount;
  const canPay = payAmount !== null && !Number.isNaN(payAmount) && payAmount > 0;

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

  const handleCreatePayment = async () => {
    if (!bookingId || !canPay || payAmount === null) return;
    setLoading(true);

    const { data: rpcResult, error: rpcError } = await supabase.rpc("create_booking_payment", {
      _booking_id: bookingId,
      _amount: payAmount,
    });
    if (rpcError || !rpcResult?.[0]) {
      toast.error(rpcError?.message || "Gagal membuat pembayaran");
      setLoading(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const res = await fetch("/create-payment", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ order_id: rpcResult[0].order_id }),
    });
    setLoading(false);

    if (!res.ok) {
      toast.error("Gagal membuat Virtual Account");
      return;
    }

    const data = (await res.json()) as VaDetails;
    setVa(data);
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
            Total: Rp {new Intl.NumberFormat("id-ID").format(va.total_charged)} (termasuk biaya admin Rp 4.000)
          </p>
        </div>
      ) : bookingError ? (
        <p className="text-sm text-destructive">{bookingError}</p>
      ) : (
        <div className="space-y-4">
          {bookingStatus === "active" && remaining !== null && (
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">Sisa tagihan: {formatRupiah(remaining)}</p>
              <Label htmlFor="installment-amount">Jumlah yang ingin dibayar</Label>
              <Input
                id="installment-amount"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="0"
                value={installmentInput}
                onChange={(e) => setInstallmentInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Minimum Rp 500.000, atau lunasi sisa {formatRupiah(remaining)} sekaligus
              </p>
            </div>
          )}
          {bookingStatus === "held" && dpAmount !== null && (
            <p className="text-sm text-muted-foreground">DP: {formatRupiah(dpAmount)}</p>
          )}
          <Button className="w-full sm:w-auto" onClick={handleCreatePayment} disabled={loading || !canPay}>
            {loading ? "Memproses..." : "Buat Virtual Account"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default BookingPayment;
