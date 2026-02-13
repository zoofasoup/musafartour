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
  BedDouble,
  CheckCircle2,
  Crown,
} from "lucide-react";

/* ── Constants ─────────────────────────────────────────────── */
const CHILD_PRICE = 25_000_000;
const INFANT_PRICE = 12_000_000;

const fmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtShort = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
};

/* ── Types ─────────────────────────────────────────────────── */
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

interface RoomCombo {
  quad: number;
  triple: number;
  double: number;
  totalAdults: number;
  totalRoomCost: number;
  perAdult: number;
  label: string;
}

/* ── Tier helpers ──────────────────────────────────────────── */
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

/* ── Room Optimization Engine ─────────────────────────────── */
function generateRoomCombos(adults: number, price: PackagePrice, discount: number): RoomCombo[] {
  if (adults <= 0) return [];
  const combos: RoomCombo[] = [];
  const maxQuad = Math.floor(adults / 4);
  const maxTriple = Math.floor(adults / 3);
  const maxDouble = Math.floor(adults / 2);

  for (let q = 0; q <= maxQuad; q++) {
    for (let t = 0; t <= maxTriple; t++) {
      const remaining = adults - (q * 4 + t * 3);
      if (remaining < 0) break;
      if (remaining % 2 !== 0) continue;
      const d = remaining / 2;
      if (d > maxDouble) continue;

      const totalRoomCost =
        q * 4 * Math.max(0, price.quad - discount) +
        t * 3 * Math.max(0, price.triple - discount) +
        d * 2 * Math.max(0, price.double - discount);

      const parts: string[] = [];
      if (q > 0) parts.push(`${q} Quad`);
      if (t > 0) parts.push(`${t} Triple`);
      if (d > 0) parts.push(`${d} Double`);

      combos.push({
        quad: q,
        triple: t,
        double: d,
        totalAdults: adults,
        totalRoomCost,
        perAdult: Math.round(totalRoomCost / adults),
        label: parts.join(" + "),
      });
    }
  }

  // Sort by total cost ascending
  combos.sort((a, b) => a.totalRoomCost - b.totalRoomCost);
  // Return top 4 most interesting options
  return combos.slice(0, 4);
}

/* ── Sub-components ───────────────────────────────────────── */
function CounterInput({ value, onChange, min = 0, max = 99 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        <Minus className="h-4 w-4" />
      </Button>
      <div className="text-center min-w-[3rem]">
        <span className="text-2xl font-bold tracking-tighter">{value}</span>
      </div>
      <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
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

function RoomComboCard({
  combo,
  isSelected,
  isBest,
  onSelect,
  childTotal,
  infantTotal,
}: {
  combo: RoomCombo;
  isSelected: boolean;
  isBest: boolean;
  onSelect: () => void;
  childTotal: number;
  infantTotal: number;
}) {
  const grandTotal = combo.totalRoomCost + childTotal + infantTotal;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        isSelected
          ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
          : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <BedDouble className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-sm tracking-tight">{combo.label}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isBest && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
              <Crown className="h-2.5 w-2.5 mr-0.5" /> Hemat
            </Badge>
          )}
          {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground tracking-tight">
          <span>{combo.totalAdults} Dewasa</span>
          <span className="font-medium text-foreground">{fmtShort(combo.totalRoomCost)}</span>
        </div>
        {childTotal > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground tracking-tight">
            <span>Anak (Sharing)</span>
            <span className="font-medium text-foreground">{fmtShort(childTotal)}</span>
          </div>
        )}
        {infantTotal > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground tracking-tight">
            <span>Infant</span>
            <span className="font-medium text-foreground">{fmtShort(infantTotal)}</span>
          </div>
        )}
      </div>

      <Separator className="my-3" />

      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] text-muted-foreground tracking-tight uppercase">Per Dewasa</p>
          <p className="text-sm font-bold tracking-tighter">{fmtShort(combo.perAdult)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground tracking-tight uppercase">Total</p>
          <p className="text-lg font-bold tracking-tighter text-primary">{fmtShort(grandTotal)}</p>
        </div>
      </div>
    </button>
  );
}

/* ── Main Component ───────────────────────────────────────── */
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
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [selectedComboIdx, setSelectedComboIdx] = useState(0);

  const selectedPkg = packages.find((p) => p.id === selectedPkgId);
  const availableTiers = selectedPkg?.available_tiers || ["nyaman"];
  const effectiveTier = availableTiers.includes(selectedTier) ? selectedTier : availableTiers[0];

  const price = selectedPkg ? getTierPrice(selectedPkg, effectiveTier) : null;
  const hotels = selectedPkg ? getTierHotels(selectedPkg, effectiveTier) : null;

  const childTotal = children * CHILD_PRICE;
  const infantTotal = infants * INFANT_PRICE;

  const combos = useMemo(() => {
    if (!price) return [];
    const result = generateRoomCombos(adults, price, discount);
    return result;
  }, [price, adults, discount]);

  // Reset selected combo when combos change
  const safeComboIdx = combos.length > 0 ? Math.min(selectedComboIdx, combos.length - 1) : 0;
  const selectedCombo = combos[safeComboIdx] || null;

  const grandTotal = selectedCombo ? selectedCombo.totalRoomCost + childTotal + infantTotal : 0;
  const totalSavings = adults * discount;

  const handleWhatsApp = () => {
    if (!selectedPkg || !selectedCombo) return;
    const tierLabel = TIER_LABELS[effectiveTier] || effectiveTier;
    const name = customerName || "Bapak/Ibu";
    const depDate = fmtDate(selectedPkg.departure_date);

    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} Dewasa`);
    if (children > 0) parts.push(`${children} Anak (Sharing Bed)`);
    if (infants > 0) parts.push(`${infants} Infant`);

    let msg = `Assalamu'alaikum ${name},\n\nTerima kasih telah mengunjungi booth kami! Berikut estimasi biaya Umroh dari *Musafar Tour*:\n\n`;
    msg += `📦 *Paket:* ${selectedPkg.package_name} (${tierLabel})\n`;
    msg += `📅 *Keberangkatan:* ${depDate}\n`;
    msg += `🛏️ *Komposisi Kamar:* ${selectedCombo.label}\n`;
    msg += `👥 *Peserta:* ${parts.join(", ")}\n\n`;
    msg += `💰 *Rincian Harga:*\n`;
    msg += `• ${adults}x Dewasa = ${fmtShort(selectedCombo.totalRoomCost)}\n`;
    if (children > 0) msg += `• ${children}x Anak (Sharing) @ ${fmtShort(CHILD_PRICE)} = ${fmtShort(childTotal)}\n`;
    if (infants > 0) msg += `• ${infants}x Infant @ ${fmtShort(INFANT_PRICE)} = ${fmtShort(infantTotal)}\n`;
    msg += `\n*TOTAL: ${fmtShort(grandTotal)}*\n`;
    if (totalSavings > 0) {
      msg += `🎉 Diskon Exhibition: ${fmtShort(discount)}/dewasa × ${adults} = hemat *${fmtShort(totalSavings)}*!\n`;
    }
    msg += `\n_Musafar Tour – Booth Exhibition_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Calculator className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-foreground">Booth Optimizer</h1>
          <p className="text-sm text-muted-foreground tracking-tight">Hitung komposisi kamar & harga terbaik</p>
        </div>
      </div>

      {/* ─── Package Selection ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base tracking-tight">Pilih Paket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="tracking-tight">Paket Umroh</Label>
            <Select value={selectedPkgId} onValueChange={(v) => { setSelectedPkgId(v); setSelectedTier(""); setSelectedComboIdx(0); }}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih paket..." />
              </SelectTrigger>
              <SelectContent>
                {isLoading && <SelectItem value="_loading" disabled>Memuat...</SelectItem>}
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.package_name} — {fmtDate(p.departure_date)}
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
                    onClick={() => { setSelectedTier(t); setSelectedComboIdx(0); }}
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

          {/* Rate preview */}
          {price && (
            <div className="grid grid-cols-3 gap-2">
              {(["quad", "triple", "double"] as const).map((rt) => (
                <div key={rt} className="p-3 rounded-xl text-center border border-border bg-muted/30">
                  <span className="block text-xs text-muted-foreground tracking-tight capitalize">{rt}</span>
                  <span className="block text-sm font-bold tracking-tighter mt-0.5">
                    {price[rt] > 0 ? fmtShort(price[rt]) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Participants ─── */}
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
                  <p className="text-xs text-muted-foreground tracking-tight">Menentukan komposisi kamar</p>
                </div>
              </div>
              <CounterInput value={adults} onChange={(v) => { setAdults(v); setSelectedComboIdx(0); }} min={1} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <PersonStanding className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">Anak (&lt;15 thn)</p>
                  <p className="text-xs text-muted-foreground tracking-tight">{fmt.format(CHILD_PRICE)} · Sharing Bed</p>
                </div>
              </div>
              <CounterInput value={children} onChange={setChildren} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <Baby className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">Infant (0-2 thn)</p>
                  <p className="text-xs text-muted-foreground tracking-tight">{fmt.format(INFANT_PRICE)}</p>
                </div>
              </div>
              <CounterInput value={infants} onChange={setInfants} />
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
                onChange={(e) => { setDiscount(Number(e.target.value) || 0); setSelectedComboIdx(0); }}
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Room Optimization ─── */}
      {combos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight flex items-center gap-2">
              <BedDouble className="h-4 w-4" />
              Opsi Komposisi Kamar
              <Badge variant="outline" className="ml-auto text-xs font-normal">{combos.length} opsi</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {combos.map((combo, i) => (
                <RoomComboCard
                  key={combo.label}
                  combo={combo}
                  isSelected={safeComboIdx === i}
                  isBest={i === 0}
                  onSelect={() => setSelectedComboIdx(i)}
                  childTotal={childTotal}
                  infantTotal={infantTotal}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Hotels ─── */}
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

      {/* ─── Summary + WhatsApp ─── */}
      {selectedCombo && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground tracking-tight">{adults}x Dewasa ({selectedCombo.label})</span>
              <span className="font-semibold tracking-tighter">{fmtShort(selectedCombo.totalRoomCost)}</span>
            </div>
            {children > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground tracking-tight">{children}x Anak (Sharing Bed)</span>
                <span className="font-semibold tracking-tighter">{fmtShort(childTotal)}</span>
              </div>
            )}
            {infants > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground tracking-tight">{infants}x Infant</span>
                <span className="font-semibold tracking-tighter">{fmtShort(infantTotal)}</span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between items-center">
              <span className="font-bold tracking-tight">TOTAL</span>
              <span className="text-xl font-bold tracking-tighter text-primary">{fmtShort(grandTotal)}</span>
            </div>

            {totalSavings > 0 && (
              <Badge variant="secondary" className="w-full justify-center py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                <Sparkles className="h-3 w-3 mr-1" />
                Hemat {fmtShort(totalSavings)} total diskon!
              </Badge>
            )}

            <Separator />

            <div className="space-y-3 pt-1">
              <div className="space-y-2">
                <Label className="tracking-tight">Nama Calon Jamaah</Label>
                <Input placeholder="Masukkan nama..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <Button onClick={handleWhatsApp} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" size="lg">
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
