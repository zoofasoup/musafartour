import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parsePackagePrice, type PackagePrice } from "@/lib/packageSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar, Plane, Hotel, Star, Clock, Users, MapPin,
  CheckCircle2, ExternalLink, ArrowLeft, Bus, Minus, Plus,
  Sparkles, Footprints, BedDouble, Crown, MessageCircle,
  Baby, PersonStanding, Route, Timer, PlaneTakeoff,
  FileText, Download, Package,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

/* ── Constants ─────────────────────────────────────────────── */
const CHILD_PRICE = 25_000_000;
const INFANT_PRICE = 15_000_000;
const fmtShort = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
const fmtDate = (d: string) => {
  try { return format(new Date(d), "d MMM yyyy", { locale: localeId }); }
  catch { return d; }
};

/* ── Types ─────────────────────────────────────────────────── */
interface PackageRow {
  id: string;
  slug: string;
  package_name: string;
  departure_date: string;
  duration_days: number;
  flight: string;
  flight_type: string;
  banner_image: string | null;
  package_price: any;
  five_star_package_price: any;
  hemat_package_price: any;
  pelataran_package_price: any;
  available_tiers: string[] | null;
  best_seller_transport: string | null;
  five_star_transport: string | null;
  hemat_transport: string | null;
  pelataran_transport: string | null;
  start_airport: string | null;
  route: string | null;
  timeframe: string | null;
  slots_total: number | null;
  slots_filled: number | null;
  selling_points: string | null;
  included_items: string | null;
  excluded_items: string | null;
  equipment_list: string | null;
  catalog_link: string | null;
  itinerary_link: string | null;
  itinerary: string | null;
  nights_makkah: number | null;
  nights_madinah: number | null;
  nights_extra: number | null;
  hotel_extra: string | null;
  is_sold_out: boolean;
  // Hotel fields for all tiers
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

function getTierTransport(pkg: PackageRow, tier: string) {
  switch (tier) {
    case "five-star": return pkg.five_star_transport || pkg.best_seller_transport;
    case "hemat": return pkg.hemat_transport || pkg.best_seller_transport;
    case "pelataran-hemat": return pkg.pelataran_transport || pkg.best_seller_transport;
    default: return pkg.best_seller_transport;
  }
}

/* ── Room Optimization Engine ─────────────────────────────── */
function generateRoomCombos(adults: number, price: PackagePrice, discount: number): RoomCombo[] {
  if (adults <= 0) return [];
  const combos: RoomCombo[] = [];
  const maxQuad = Math.floor(adults / 4);
  const maxTriple = Math.floor(adults / 3);

  for (let q = 0; q <= maxQuad; q++) {
    for (let t = 0; t <= maxTriple; t++) {
      const remaining = adults - (q * 4 + t * 3);
      if (remaining < 0) break;
      if (remaining % 2 !== 0) continue;
      const d = remaining / 2;

      const totalRoomCost =
        q * 4 * Math.max(0, price.quad - discount) +
        t * 3 * Math.max(0, price.triple - discount) +
        d * 2 * Math.max(0, price.double - discount);

      const parts: string[] = [];
      if (q > 0) parts.push(`${q} Quad`);
      if (t > 0) parts.push(`${t} Triple`);
      if (d > 0) parts.push(`${d} Double`);

      combos.push({
        quad: q, triple: t, double: d,
        totalAdults: adults,
        totalRoomCost,
        perAdult: Math.round(totalRoomCost / adults),
        label: parts.join(" + "),
      });
    }
  }

  combos.sort((a, b) => a.totalRoomCost - b.totalRoomCost);
  return combos.slice(0, 4);
}

/* ── Sub-components ───────────────────────────────────────── */
function CounterInput({ value, onChange, min = 0, max = 99 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0 rounded-full" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        <Minus className="h-3 w-3" />
      </Button>
      <span className="text-lg font-bold tracking-tighter min-w-[2rem] text-center">{value}</span>
      <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0 rounded-full" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`} />
      ))}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────── */
export default function PackageBrochure() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Fetch all published packages for sidebar
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["brochure-packages"],
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

  const currentPkg = packages.find((p) => p.slug === slug) || packages[0];

  // Calculator state
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [selectedComboIdx, setSelectedComboIdx] = useState(0);

  const availableTiers = currentPkg?.available_tiers || ["nyaman"];
  const effectiveTier = availableTiers.includes(selectedTier) ? selectedTier : availableTiers[0];

  const price = currentPkg ? getTierPrice(currentPkg, effectiveTier) : null;
  const hotels = currentPkg ? getTierHotels(currentPkg, effectiveTier) : null;

  const childTotal = children * CHILD_PRICE;
  const infantTotal = infants * INFANT_PRICE;

  const combos = useMemo(() => {
    if (!price) return [];
    return generateRoomCombos(adults, price, discount);
  }, [price, adults, discount]);

  const safeComboIdx = combos.length > 0 ? Math.min(selectedComboIdx, combos.length - 1) : 0;
  const selectedCombo = combos[safeComboIdx] || null;
  const grandTotal = selectedCombo ? selectedCombo.totalRoomCost + childTotal + infantTotal : 0;
  const totalSavings = adults * discount;

  // Group packages by month for sidebar
  const groupedPackages = useMemo(() => {
    const groups: Record<string, PackageRow[]> = {};
    packages.forEach((p) => {
      const monthKey = format(new Date(p.departure_date), "MMMM yyyy", { locale: localeId });
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(p);
    });
    return groups;
  }, [packages]);

  const parseListItems = (items?: string | null) => {
    if (!items) return [];
    return items.split("\n").filter(item => item.trim() && item.trim() !== "-");
  };

  const seatPercentage = currentPkg?.slots_total && currentPkg?.slots_filled
    ? Math.min(100, Math.round((currentPkg.slots_filled / currentPkg.slots_total) * 100))
    : null;

  const handleWhatsApp = () => {
    if (!currentPkg || !selectedCombo) return;
    const tierLabel = TIER_LABELS[effectiveTier] || effectiveTier;
    const name = customerName || "Bapak/Ibu";
    const depDate = fmtDate(currentPkg.departure_date);

    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} Dewasa`);
    if (children > 0) parts.push(`${children} Anak (Sharing Bed)`);
    if (infants > 0) parts.push(`${infants} Infant`);

    let msg = `Assalamu'alaikum ${name},\n\nTerima kasih telah mengunjungi booth kami! Berikut estimasi biaya Umroh dari *Musafar Tour*:\n\n`;
    msg += `📦 *Paket:* ${currentPkg.package_name} (${tierLabel})\n`;
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3"><Skeleton className="h-[600px]" /></div>
          <div className="col-span-6"><Skeleton className="h-[600px]" /></div>
          <div className="col-span-3"><Skeleton className="h-[600px]" /></div>
        </div>
      </div>
    );
  }

  if (!currentPkg) {
    return (
      <div className="text-center py-16">
        <Package className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-bold tracking-tighter mb-2">Tidak ada paket tersedia</h2>
        <p className="text-muted-foreground tracking-tight">Belum ada paket yang dipublish.</p>
      </div>
    );
  }

  return (
    <div className="-m-8">
      {/* Top bar */}
      <div className="border-b bg-card px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/packages")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Paket
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-lg font-bold tracking-tighter truncate max-w-md">{currentPkg.package_name}</h1>
          <Badge variant="outline" className="text-xs tracking-tight">{fmtDate(currentPkg.departure_date)}</Badge>
        </div>

        {/* Tier selector in top bar */}
        {availableTiers.length > 1 && (
          <div className="flex gap-1.5">
            {availableTiers.map((t) => (
              <button
                key={t}
                onClick={() => { setSelectedTier(t); setSelectedComboIdx(0); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium tracking-tight transition-all ${
                  effectiveTier === t
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {TIER_LABELS[t] || t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Three-column layout */}
      <div className="flex min-h-[calc(100svh-8rem)]">
        {/* ── LEFT: Package Navigation Sidebar ── */}
        <aside className="w-64 shrink-0 border-r bg-card/50 backdrop-blur-sm overflow-y-auto hidden lg:block">
          <div className="p-4 space-y-4">
            {Object.entries(groupedPackages).map(([month, pkgs]) => (
              <div key={month}>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">{month}</p>
                <div className="space-y-1">
                  {pkgs.map((p) => {
                    const isActive = p.slug === currentPkg.slug;
                    return (
                      <Link
                        key={p.id}
                        to={`/admin/brochure/${p.slug}`}
                        className={`block px-3 py-2.5 rounded-lg text-xs tracking-tight transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold shadow-md"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="block font-medium truncate">{p.package_name}</span>
                        <span className={`block text-[10px] mt-0.5 ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {fmtDate(p.departure_date)} · {p.duration_days}H
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ── CENTER: Brochure Content ── */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 min-w-0">
          {/* Hero: Flyer + Badges */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Flyer Image */}
            {currentPkg.banner_image && (
              <div className="relative rounded-2xl overflow-hidden shadow-xl bg-card border">
                <img
                  src={currentPkg.banner_image}
                  alt={currentPkg.package_name}
                  className="w-full h-auto object-contain"
                  loading="eager"
                  fetchPriority="high"
                />
                {/* Overlay badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <Badge className="bg-card/90 backdrop-blur text-foreground border shadow-lg text-xs">
                    <Plane className="h-3 w-3 mr-1" /> {currentPkg.flight}
                  </Badge>
                  <Badge className="bg-card/90 backdrop-blur text-foreground border shadow-lg text-xs">
                    {currentPkg.flight_type}
                  </Badge>
                  <Badge className="bg-card/90 backdrop-blur text-foreground border shadow-lg text-xs">
                    <Clock className="h-3 w-3 mr-1" /> {currentPkg.duration_days} Hari
                  </Badge>
                </div>
                {currentPkg.is_sold_out && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-destructive text-destructive-foreground border-0 shadow-lg">SOLD OUT</Badge>
                  </div>
                )}
              </div>
            )}

            {/* Key Metrics + Hotels */}
            <div className="space-y-4">
              {/* Key Metrics Grid */}
              <Card className="border shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold tracking-tighter mb-4 text-muted-foreground uppercase">Info Keberangkatan</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground tracking-tight uppercase">Berangkat</p>
                        <p className="text-sm font-bold tracking-tighter">{fmtDate(currentPkg.departure_date)}</p>
                      </div>
                    </div>
                    {currentPkg.start_airport && (
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <PlaneTakeoff className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground tracking-tight uppercase">Bandara</p>
                          <p className="text-sm font-bold tracking-tighter">{currentPkg.start_airport}</p>
                        </div>
                      </div>
                    )}
                    {currentPkg.route && currentPkg.route !== "-" && (
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Route className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground tracking-tight uppercase">Rute</p>
                          <p className="text-sm font-bold tracking-tighter">{currentPkg.route}</p>
                        </div>
                      </div>
                    )}
                    {currentPkg.timeframe && currentPkg.timeframe !== "-" && (
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Timer className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground tracking-tight uppercase">Timeframe</p>
                          <p className="text-sm font-bold tracking-tighter">{currentPkg.timeframe}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Transport */}
                  {getTierTransport(currentPkg, effectiveTier) && (
                    <div className="flex items-start gap-3 mt-4 pt-4 border-t">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Bus className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground tracking-tight uppercase">Transport</p>
                        <p className="text-sm font-bold tracking-tighter">{getTierTransport(currentPkg, effectiveTier)}</p>
                      </div>
                    </div>
                  )}

                  {/* Seat Progress */}
                  {seatPercentage !== null && currentPkg.slots_total && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-muted-foreground tracking-tight">Ketersediaan Seat</span>
                        <span className="text-xs font-bold tracking-tighter">
                          {currentPkg.slots_filled}/{currentPkg.slots_total}
                        </span>
                      </div>
                      <Progress value={seatPercentage} className="h-2" />
                      <p className="text-[10px] text-muted-foreground mt-1 tracking-tight">
                        {currentPkg.slots_total - (currentPkg.slots_filled || 0)} seat tersisa
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Hotels */}
              {hotels && (hotels.makkah.name || hotels.madinah.name) && (
                <Card className="border shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-sm font-bold tracking-tighter text-muted-foreground uppercase">Akomodasi</h3>
                    
                    {hotels.makkah.name && (
                      <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold tracking-tight uppercase text-muted-foreground">Makkah</span>
                            {currentPkg.nights_makkah && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{currentPkg.nights_makkah} Malam</Badge>
                            )}
                          </div>
                          {hotels.makkah.star && <StarRating rating={hotels.makkah.star} />}
                        </div>
                        <p className="font-semibold text-sm tracking-tight">{hotels.makkah.name}</p>
                        {(hotels.makkah.distance || hotels.makkah.walk) && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {hotels.makkah.distance && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {hotels.makkah.distance}
                              </span>
                            )}
                            {hotels.makkah.walk && (
                              <span className="inline-flex items-center gap-1">
                                <Footprints className="h-3 w-3" /> {hotels.makkah.walk}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {hotels.madinah.name && (
                      <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold tracking-tight uppercase text-muted-foreground">Madinah</span>
                            {currentPkg.nights_madinah && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{currentPkg.nights_madinah} Malam</Badge>
                            )}
                          </div>
                          {hotels.madinah.star && <StarRating rating={hotels.madinah.star} />}
                        </div>
                        <p className="font-semibold text-sm tracking-tight">{hotels.madinah.name}</p>
                        {(hotels.madinah.distance || hotels.madinah.walk) && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {hotels.madinah.distance && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {hotels.madinah.distance}
                              </span>
                            )}
                            {hotels.madinah.walk && (
                              <span className="inline-flex items-center gap-1">
                                <Footprints className="h-3 w-3" /> {hotels.madinah.walk}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Extra hotel if available */}
                    {currentPkg.hotel_extra && currentPkg.hotel_extra !== "-" && currentPkg.nights_extra && (
                      <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
                        <div className="flex items-center gap-2">
                          <Hotel className="h-4 w-4 text-primary" />
                          <span className="text-xs font-bold tracking-tight uppercase text-muted-foreground">Kota Tambahan</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{currentPkg.nights_extra} Malam</Badge>
                        </div>
                        <p className="font-semibold text-sm tracking-tight">{currentPkg.hotel_extra}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Selling Points */}
          {currentPkg.selling_points && currentPkg.selling_points !== "-" && (
            <Card className="border shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold tracking-tighter text-muted-foreground uppercase mb-4">Selling Points</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {parseListItems(currentPkg.selling_points).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 py-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm tracking-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Included / Excluded */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentPkg.included_items && (
              <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold tracking-tighter text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Termasuk
                  </h3>
                  <ul className="space-y-1.5">
                    {parseListItems(currentPkg.included_items).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs tracking-tight">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {currentPkg.excluded_items && (
              <Card className="border-l-4 border-l-destructive shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold tracking-tighter text-destructive mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" /> Tidak Termasuk
                  </h3>
                  <ul className="space-y-1.5">
                    {parseListItems(currentPkg.excluded_items).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs tracking-tight text-muted-foreground">
                        <span className="text-destructive shrink-0">✕</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Equipment */}
          {currentPkg.equipment_list && (
            <Card className="border shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold tracking-tighter text-muted-foreground uppercase mb-3">Perlengkapan</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {parseListItems(currentPkg.equipment_list).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs tracking-tight py-1">
                      <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Links: Catalog + Itinerary */}
          <div className="flex flex-wrap gap-3">
            {currentPkg.catalog_link && (
              <a href={currentPkg.catalog_link} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2 tracking-tight">
                  <ExternalLink className="h-4 w-4" /> Lihat Katalog
                </Button>
              </a>
            )}
            {currentPkg.itinerary_link && (
              <a href={currentPkg.itinerary_link} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2 tracking-tight">
                  <Download className="h-4 w-4" /> Download Itinerary
                </Button>
              </a>
            )}
          </div>
        </main>

        {/* ── RIGHT: Sticky Sales Calculator ── */}
        <aside className="w-80 shrink-0 border-l bg-card/50 backdrop-blur-sm overflow-y-auto hidden xl:block">
          <div className="p-4 space-y-4 sticky top-0">
            <div className="flex items-center gap-2 mb-1">
              <BedDouble className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold tracking-tighter">Booth Optimizer</h3>
            </div>

            {/* Rate preview */}
            {price && (
              <div className="grid grid-cols-3 gap-1.5">
                {(["quad", "triple", "double"] as const).map((rt) => (
                  <div key={rt} className="p-2 rounded-lg text-center border bg-muted/30">
                    <span className="block text-[10px] text-muted-foreground tracking-tight capitalize">{rt}</span>
                    <span className="block text-xs font-bold tracking-tighter mt-0.5">
                      {price[rt] > 0 ? fmtShort(price[rt]) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Participants */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-semibold tracking-tight">Dewasa</span>
                </div>
                <CounterInput value={adults} onChange={(v) => { setAdults(v); setSelectedComboIdx(0); }} min={1} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PersonStanding className="h-3.5 w-3.5 text-emerald-500" />
                  <div>
                    <span className="text-xs font-semibold tracking-tight">Anak</span>
                    <span className="text-[10px] text-muted-foreground ml-1">25jt</span>
                  </div>
                </div>
                <CounterInput value={children} onChange={setChildren} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Baby className="h-3.5 w-3.5 text-pink-500" />
                  <div>
                    <span className="text-xs font-semibold tracking-tight">Infant</span>
                    <span className="text-[10px] text-muted-foreground ml-1">15jt</span>
                  </div>
                </div>
                <CounterInput value={infants} onChange={setInfants} />
              </div>
            </div>

            {/* Discount */}
            <div className="space-y-1.5">
              <Label className="text-xs tracking-tight flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-amber-500" /> Diskon/Pax
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={discount || ""}
                onChange={(e) => { setDiscount(Number(e.target.value) || 0); setSelectedComboIdx(0); }}
                className="font-mono text-xs h-8"
              />
            </div>

            <Separator />

            {/* Room combos */}
            {combos.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Opsi Kamar</p>
                {combos.map((combo, i) => {
                  const gt = combo.totalRoomCost + childTotal + infantTotal;
                  const isSelected = safeComboIdx === i;
                  return (
                    <button
                      key={combo.label}
                      onClick={() => setSelectedComboIdx(i)}
                      className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold tracking-tight">{combo.label}</span>
                        {i === 0 && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                            <Crown className="h-2 w-2 mr-0.5" /> Hemat
                          </Badge>
                        )}
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{fmtShort(combo.perAdult)}/pax</span>
                        <span className="font-bold text-foreground">{fmtShort(gt)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Summary */}
            {selectedCombo && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{adults}x Dewasa</span>
                    <span className="font-semibold tracking-tighter">{fmtShort(selectedCombo.totalRoomCost)}</span>
                  </div>
                  {children > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{children}x Anak</span>
                      <span className="font-semibold tracking-tighter">{fmtShort(childTotal)}</span>
                    </div>
                  )}
                  {infants > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{infants}x Infant</span>
                      <span className="font-semibold tracking-tighter">{fmtShort(infantTotal)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold tracking-tight">TOTAL</span>
                    <span className="text-base font-bold tracking-tighter text-primary">{fmtShort(grandTotal)}</span>
                  </div>
                  {totalSavings > 0 && (
                    <Badge variant="secondary" className="w-full justify-center py-1 text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                      <Sparkles className="h-2.5 w-2.5 mr-1" /> Hemat {fmtShort(totalSavings)}
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* WhatsApp */}
                <div className="space-y-2">
                  <Input
                    placeholder="Nama jamaah..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button onClick={handleWhatsApp} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs" size="sm">
                    <MessageCircle className="h-3.5 w-3.5" /> Kirim via WhatsApp
                  </Button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
