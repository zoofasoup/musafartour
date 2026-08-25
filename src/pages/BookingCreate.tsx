import { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useJamaahAuth } from "@/hooks/useJamaahAuth";
import { getReferralCookie } from "@/hooks/useReferralCapture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const ROOM_CAPACITY: Record<string, number> = { quad: 4, triple: 3, double: 2 };

const formatRupiah = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

type TierPrice = { quad?: number; triple?: number; double?: number } | null;

interface PricedPackage {
  available_tiers: string[] | null;
  package_price: TierPrice;
  hemat_package_price: TierPrice;
  five_star_package_price: TierPrice;
  pelataran_package_price: TierPrice;
}

/**
 * Per-person price for a room type, mirroring create_booking's CASE exactly:
 * a package has one active tier (available_tiers[0], which is SQL's
 * available_tiers[1]) and only that tier's price column is read - no
 * cross-tier fallback. getTierPrice() in lib/utils does fall back to other
 * columns, which is right for a "from Rp X" listing but wrong here: the number
 * shown before a jamaah commits must be the number create_booking will charge,
 * and returning 0 (so the UI shows nothing) matches the RPC raising rather
 * than quietly quoting some other tier's price.
 */
function resolvePricePerPerson(pkg: PricedPackage, roomType: string): number {
  const tier = pkg.available_tiers?.[0] ?? "";
  const column: TierPrice =
    tier === "hemat" ? pkg.hemat_package_price
    : tier === "five-star" ? pkg.five_star_package_price
    : tier.startsWith("pelataran") ? pkg.pelataran_package_price
    : pkg.package_price;
  return Number(column?.[roomType as "quad" | "triple" | "double"] ?? 0) || 0;
}

const BookingCreate = () => {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useJamaahAuth();

  const [roomType, setRoomType] = useState("quad");
  const [travelerCount, setTravelerCount] = useState(1);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: pkg } = useQuery({
    queryKey: ["booking-package", packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select(
          "id, package_name, dp_amount, available_tiers, package_price, hemat_package_price, five_star_package_price, pelataran_package_price",
        )
        .eq("id", packageId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!packageId,
  });

  const pricePerPerson = pkg ? resolvePricePerPerson(pkg as PricedPackage, roomType) : 0;
  const totalPrice = pricePerPerson * travelerCount;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/jamaah/auth?redirect=/booking/baru/${packageId}`} replace />;
  }

  const handleSubmit = async () => {
    if (!packageId) return;
    if (!contactName.trim() || !contactPhone.trim()) {
      toast.error("Nama dan no. HP wajib diisi");
      return;
    }

    setSubmitting(true);
    const { data: bookingId, error } = await supabase.rpc("create_booking", {
      _package_id: packageId,
      _room_type: roomType,
      _traveler_count: travelerCount,
      _primary_contact_name: contactName.trim(),
      _primary_contact_phone: contactPhone.trim(),
      _referral_code: getReferralCookie(),
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    navigate(`/booking/${bookingId}/bayar`);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Booking {pkg?.package_name}</h1>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Tipe Kamar</Label>
          <Select value={roomType} onValueChange={(v) => { setRoomType(v); setTravelerCount(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="quad">Quad (maks. 4 orang)</SelectItem>
              <SelectItem value="triple">Triple (maks. 3 orang)</SelectItem>
              <SelectItem value="double">Double (maks. 2 orang)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Jumlah Jamaah</Label>
          <Input
            type="number"
            min={1}
            max={ROOM_CAPACITY[roomType]}
            value={travelerCount}
            onChange={(e) => setTravelerCount(Math.min(ROOM_CAPACITY[roomType], Math.max(1, parseInt(e.target.value, 10) || 1)))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Nama Kontak Utama</Label>
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>No. WhatsApp</Label>
          <Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="08..." />
        </div>
        {/* The total has to be visible before the jamaah commits - previously
            only the DP was shown, so they agreed to a booking without ever
            seeing what it costs. */}
        {pkg && (
          <div className="rounded-lg border p-4 space-y-1.5">
            {pricePerPerson > 0 ? (
              <>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {formatRupiah(pricePerPerson)} × {travelerCount} jamaah
                  </span>
                  <span>{roomType}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>{formatRupiah(totalPrice)}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-destructive">
                Harga untuk tipe kamar ini belum tersedia. Silakan pilih tipe kamar lain.
              </p>
            )}
            <p className="text-sm text-muted-foreground pt-1 border-t">
              DP wajib: {formatRupiah(pkg.dp_amount)}
              {pricePerPerson > 0 && " — sisanya dapat dicicil"}
            </p>
          </div>
        )}
        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Memproses..." : "Lanjut ke Pembayaran"}
        </Button>
      </div>
    </div>
  );
};

export default BookingCreate;
