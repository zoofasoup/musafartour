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
        .select("id, package_name, dp_amount")
        .eq("id", packageId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!packageId,
  });

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
          <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="08..." />
        </div>
        {pkg && (
          <p className="text-sm text-muted-foreground">
            DP wajib: Rp {new Intl.NumberFormat("id-ID").format(pkg.dp_amount)}
          </p>
        )}
        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Memproses..." : "Lanjut ke Pembayaran"}
        </Button>
      </div>
    </div>
  );
};

export default BookingCreate;
