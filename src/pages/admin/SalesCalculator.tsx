import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parsePackagePrice, type PackagePrice } from "@/lib/packageSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  Users,
  Baby,
  PersonStanding,
  MessageCircle,
  Hotel,
  Minus,
  Plus,
  Sparkles,
  MapPin,
  Star,
  Footprints,
} from "lucide-react";

const CHILD_PRICE = 25_000_000;
const INFANT_PRICE = 12_000_000;

const fmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtShort = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

type RoomType = "quad" | "triple" | "double";

interface PackageRow {
  id: string;
  slug: string;
  package_name: string;
  available_tiers: string[] | null;
  package_price: any;
  five_star_package_price: any;
  hemat_package_price: any;
  pelataran_package_price: any;
  makkah_hotel_name: string | null;
  makkah_hotel_star: number | null;
  makkah_distance: string | null;
  makkah_duration_walk: string | null;
  madinah_hotel_name: string | null;
  madinah_hotel_star: number | null;
  madinah_distance: string | null;
  madinah_duration_walk: string | null;
  five_star_makkah_hotel_name: string | null;
  five_star_makkah_hotel_star: number | null;
  five_star_makkah_distance: string | null;
  five_star_makkah_duration_walk: string | null;
  five_star_madinah_hotel_name: string | null;
  five_star_madinah_hotel_star: number | null;
  five_star_madinah_distance: string | null;
  five_star_madinah_duration_walk: string | null;
  hemat_makkah_hotel_name: string | null;
  hemat_makkah_hotel_star: number | null;
  hemat_makkah_distance: string | null;
  hemat_makkah_duration_walk: string | null;
  hemat_madinah_hotel_name: string | null;
  hemat_madinah_hotel_star: number | null;
  hemat_madinah_distance: string | null;
  hemat_madinah_duration_walk: string | null;
  pelataran_makkah_hotel_name: string | null;
  pelataran_makkah_hotel_star: number | null;
  pelataran_makkah_distance: string | null;
  pelataran_makkah_duration_walk: string | null;
  pelataran_madinah_hotel_name: string | null;
  pelataran_madinah_hotel_star: number | null;
  pelataran_madinah_distance: string | null;
  pelataran_madinah_duration_walk: string | null;
  departure_date: string;
  duration_days: number;
  flight: string;
}

const TIER_LABELS: Record<string, string> = {
  nyaman: "Best Seller",
  "five-star": "Five Star",
  hemat: "Hemat",
  "pelataran-hemat": "Pelataran",
};

function getTierPrice(pkg: PackageRow, tier: string): PackagePrice {
  switch (tier) {
    case "five-star": return parsePackagePrice(pkg.five_star_package_price);
    case "hemat": return parsePackagePrice(pkg.hemat_package_price);
    case "pelataran-hemat": return parsePackagePrice(pkg.pelataran_package_price);
    default: return parsePackagePrice(pkg.package_price);
  }
}

function getTierHotels(pkg: PackageRow, tier: string) {
  const prefix = tier === "five-star" ? "five_star_" : tier === "hemat" ? "hemat_" : tier === "pelataran-hemat" ? "pelataran_" : "";
  return {
    makkah: {
      name: (pkg as any)[`${prefix}makkah_hotel_name`] || pkg.makkah_hotel_name,
      star: (pkg as any)[`${prefix}makkah_hotel_star`] || pkg.makkah_hotel_star,
      distance: (pkg as any)[`${prefix}makkah_distance`] || pkg.makkah_distance,
      walk: (pkg as any)[`${prefix}makkah_duration_walk`] || pkg.makkah_duration_walk,
    },
    madinah: {
      name: (pkg as any)[`${prefix}madinah_hotel_name`] || pkg.madinah_hotel_name,
      star: (pkg as any)[`${prefix}madinah_hotel_star`] || pkg.madinah_hotel_star,
      distance: (pkg as any)[`${prefix}madinah_distance`] || pkg.madinah_distance,
      walk: (pkg as any)[`${prefix}madinah_duration_walk`] || pkg.madinah_duration_walk,
    },
  };
}

function CounterInput({ value, onChange, min = 0, max = 99, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 rounded-full"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <div className="text-center min-w-[3rem]">
        <span className="text-2xl font-bold tracking-tighter">{value}</span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 rounded-full"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function HotelCard({ city, name, star, distance, walk }: { city: string; name: string | null; star: number | null; distance: string | null; walk: string | null }) {
  if (!name) return null;
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Hotel className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground tracking-tight">{city}</p>
        <p className="font-semibold text-sm tracking-tight truncate">{name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {star && (
            <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
              <Star className="h-3 w-3 fill-current" /> {star}★
            </span>
          )}
          {distance && (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {distance}
            </span>
          )}
          {walk && (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <Footprints className="h-3 w-3" /> {walk}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SalesCalculator() {
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["calc-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("status", "published")
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return data as PackageRow[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const [selectedPkgId, setSelectedPkgId] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [roomType, setRoomType] = useState<RoomType>("quad");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState("");

  const selectedPkg = packages.find((p) => p.id === selectedPkgId);
  const availableTiers = selectedPkg?.available_tiers || ["nyaman"];
  const effectiveTier = availableTiers.includes(selectedTier) ? selectedTier : availableTiers[0];

  const price = selectedPkg ? getTierPrice(selectedPkg, effectiveTier) : null;
  const hotels = selectedPkg ? getTierHotels(selectedPkg, effectiveTier) : null;
  const baseRate = price ? price[roomType] : 0;

  const calc = useMemo(() => {
    const adultRate = Math.max(0, baseRate - discount);
    const adultTotal = adults * adultRate;
    const childTotal = children * CHILD_PRICE;
    const infantTotal = infants * INFANT_PRICE;
    const grandTotal = adultTotal + childTotal + infantTotal;
    const totalSavings = adults * discount;
    return { adultRate, adultTotal, childTotal, infantTotal, grandTotal, totalSavings };
  }, [baseRate, discount, adults, children, infants]);

  const handleWhatsApp = () => {
    const tierLabel = TIER_LABELS[effectiveTier] || effectiveTier;
    const name = customerName || "Calon Jamaah";
    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} Dewasa`);
    if (children > 0) parts.push(`${children} Anak (Sharing Bed)`);
    if (infants > 0) parts.push(`${infants} Infant`);

    let msg = `Assalamu'alaikum ${name},\n\nBerikut estimasi biaya Umroh dari *Musafar Tour*:\n\n`;
    msg += `📦 *Paket:* ${selectedPkg?.package_name} (${tierLabel})\n`;
    msg += `🛏️ *Kamar:* ${roomType.charAt(0).toUpperCase() + roomType.slice(1)}\n`;
    msg += `👥 *Peserta:* ${parts.join(", ")}\n\n`;
    msg += `💰 *Rincian Harga:*\n`;
    if (adults > 0) msg += `• ${adults}x Dewasa @ ${fmtShort(calc.adultRate)} = ${fmtShort(calc.adultTotal)}\n`;
    if (children > 0) msg += `• ${children}x Anak @ ${fmtShort(CHILD_PRICE)} = ${fmtShort(calc.childTotal)}\n`;
    if (infants > 0) msg += `• ${infants}x Infant @ ${fmtShort(INFANT_PRICE)} = ${fmtShort(calc.infantTotal)}\n`;
    msg += `\n*TOTAL: ${fmtShort(calc.grandTotal)}*\n`;
    if (calc.totalSavings > 0) {
      msg += `🎉 Termasuk diskon spesial ${fmtShort(discount)}/pax untuk ${adults} dewasa = hemat *${fmtShort(calc.totalSavings)}*!\n`;
    }
    msg += `\n_Musafar Tour_`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Calculator className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-foreground">Kalkulator Harga</h1>
          <p className="text-sm text-muted-foreground tracking-tight">Hitung estimasi biaya Umroh instan</p>
        </div>
      </div>

      {/* Package Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base tracking-tight">Pilih Paket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="tracking-tight">Paket Umroh</Label>
            <Select value={selectedPkgId} onValueChange={(v) => { setSelectedPkgId(v); setSelectedTier(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih paket..." />
              </SelectTrigger>
              <SelectContent>
                {isLoading && <SelectItem value="_loading" disabled>Memuat...</SelectItem>}
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.package_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPkg && availableTiers.length > 1 && (
            <div className="space-y-2">
              <Label className="tracking-tight">Tipe Paket</Label>
              <div className="flex flex-wrap gap-2">
                {availableTiers.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTier(t)}
                    className={`px-4 py-2 rounded-full text-sm font-medium tracking-tight transition-all ${
                      effectiveTier === t
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {TIER_LABELS[t] || t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedPkg && (
            <div className="space-y-2">
              <Label className="tracking-tight">Tipe Kamar</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["quad", "triple", "double"] as RoomType[]).map((rt) => {
                  const rateVal = price ? price[rt] : 0;
                  return (
                    <button
                      key={rt}
                      onClick={() => setRoomType(rt)}
                      className={`p-3 rounded-xl text-center transition-all border ${
                        roomType === rt
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <span className="block text-xs text-muted-foreground tracking-tight capitalize">{rt}</span>
                      <span className="block text-sm font-bold tracking-tighter mt-0.5">
                        {rateVal > 0 ? fmtShort(rateVal) : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants */}
      {selectedPkg && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">Peserta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">Dewasa</p>
                  <p className="text-xs text-muted-foreground tracking-tight">{fmt.format(calc.adultRate)}/pax</p>
                </div>
              </div>
              <CounterInput value={adults} onChange={setAdults} min={1} label="adults" />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <PersonStanding className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">Anak (&lt;15 thn)</p>
                  <p className="text-xs text-muted-foreground tracking-tight">{fmt.format(CHILD_PRICE)}/pax</p>
                </div>
              </div>
              <CounterInput value={children} onChange={setChildren} label="children" />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <Baby className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">Infant (0-2 thn)</p>
                  <p className="text-xs text-muted-foreground tracking-tight">{fmt.format(INFANT_PRICE)}/pax</p>
                </div>
              </div>
              <CounterInput value={infants} onChange={setInfants} label="infants" />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="tracking-tight flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Diskon per Pax (Dewasa only)
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hotels */}
      {hotels && (hotels.makkah.name || hotels.madinah.name) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">Info Hotel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <HotelCard city="Makkah" {...hotels.makkah} />
            <HotelCard city="Madinah" {...hotels.madinah} />
          </CardContent>
        </Card>
      )}

      {/* Breakdown */}
      {selectedPkg && baseRate > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">Rincian Harga</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {adults > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground tracking-tight">{adults}x Dewasa ({roomType})</span>
                <span className="font-semibold tracking-tighter">{fmtShort(calc.adultTotal)}</span>
              </div>
            )}
            {children > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground tracking-tight">{children}x Anak (Sharing Bed)</span>
                <span className="font-semibold tracking-tighter">{fmtShort(calc.childTotal)}</span>
              </div>
            )}
            {infants > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground tracking-tight">{infants}x Infant</span>
                <span className="font-semibold tracking-tighter">{fmtShort(calc.infantTotal)}</span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between items-center">
              <span className="font-bold tracking-tight">TOTAL</span>
              <span className="text-xl font-bold tracking-tighter text-primary">{fmtShort(calc.grandTotal)}</span>
            </div>

            {calc.totalSavings > 0 && (
              <Badge variant="secondary" className="w-full justify-center py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                <Sparkles className="h-3 w-3 mr-1" />
                Hemat {fmtShort(calc.totalSavings)} total diskon!
              </Badge>
            )}

            <Separator />

            {/* Customer Name + WhatsApp */}
            <div className="space-y-3 pt-1">
              <div className="space-y-2">
                <Label className="tracking-tight">Nama Calon Jamaah</Label>
                <Input
                  placeholder="Masukkan nama..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <Button
                onClick={handleWhatsApp}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                size="lg"
              >
                <MessageCircle className="h-5 w-5" />
                Kirim via WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!selectedPkg && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Calculator className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground tracking-tight">Pilih paket untuk mulai menghitung</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
