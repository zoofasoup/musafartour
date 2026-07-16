import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Calendar, Plane, Hotel, Star, Clock, Users, MapPin,
  CheckCircle2, XCircle, Package, ExternalLink, ArrowLeft, Bus,
  Bell, AlertTriangle, PanelLeftClose, PanelLeftOpen, ChevronRight,
  Minus, Plus, Sparkles, Footprints, BedDouble, Crown, MessageCircle,
  Baby, PersonStanding, Route, Timer, PlaneTakeoff, Download,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatPriceJuta } from "@/lib/utils";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { usePackageBySlug, usePublishedPackages, type PublishedPackage } from "@/hooks/usePackages";
import { parsePackagePrice, type PackagePrice } from "@/lib/packageSchema";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";

/* ── Constants ─────────────────────────────────────────────── */
const CHILD_PRICE = 25_000_000;
const INFANT_PRICE = 12_000_000;
const fmtShort = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
const fmtDate = (d: string) => {
  try { return format(new Date(d), "d MMM yyyy", { locale: localeId }); }
  catch { return d; }
};

/* ── Tier Helpers ──────────────────────────────────────────── */
const TIER_LABELS: Record<string, string> = {
  nyaman: "Best Seller",
  "five-star": "Five Star",
  hemat: "Hemat",
  "pelataran-hemat": "Pelataran",
};

function getTierPrice(pkg: PublishedPackage, tier: string): PackagePrice {
  switch (tier) {
    case "five-star": return pkg.five_star_package_price || pkg.package_price;
    case "hemat": return pkg.hemat_package_price || pkg.package_price;
    case "pelataran-hemat": return pkg.pelataran_package_price || pkg.package_price;
    default: return pkg.package_price;
  }
}

function getTierHotels(pkg: PublishedPackage, tier: string) {
  const p = pkg as any;
  const prefix = tier === "five-star" ? "five_star_" : tier === "hemat" ? "hemat_" : tier === "pelataran-hemat" ? "pelataran_" : "";
  return {
    makkah: {
      name: p[`${prefix}makkah_hotel_name`] || pkg.makkah_hotel_name,
      star: p[`${prefix}makkah_hotel_star`] || pkg.makkah_hotel_star,
      distance: p[`${prefix}makkah_distance`] || pkg.makkah_distance,
      walk: p[`${prefix}makkah_duration_walk`] || pkg.makkah_duration_walk,
    },
    madinah: {
      name: p[`${prefix}madinah_hotel_name`] || pkg.madinah_hotel_name,
      star: p[`${prefix}madinah_hotel_star`] || pkg.madinah_hotel_star,
      distance: p[`${prefix}madinah_distance`] || pkg.madinah_distance,
      walk: p[`${prefix}madinah_duration_walk`] || pkg.madinah_duration_walk,
    },
  };
}

function getTierTransport(pkg: PublishedPackage, tier: string) {
  switch (tier) {
    case "five-star": return pkg.five_star_transport || pkg.best_seller_transport;
    case "hemat": return pkg.hemat_transport || pkg.best_seller_transport;
    case "pelataran-hemat": return pkg.pelataran_transport || pkg.best_seller_transport;
    default: return pkg.best_seller_transport;
  }
}

/* ── Room Optimization ─────────────────────────────────────── */
interface RoomCombo {
  quad: number; triple: number; double: number;
  totalAdults: number; totalRoomCost: number; perAdult: number; label: string;
}

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

      combos.push({ quad: q, triple: t, double: d, totalAdults: adults, totalRoomCost, perAdult: Math.round(totalRoomCost / adults), label: parts.join(" + ") });
    }
  }
  combos.sort((a, b) => a.totalRoomCost - b.totalRoomCost);
  return combos.slice(0, 4);
}

/* ── Sub-Components ────────────────────────────────────────── */
const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[...Array(5)].map((_, i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`} />
    ))}
  </div>
);

function CounterInput({ value, onChange, min = 0, max = 99 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0 rounded-full" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        <Minus className="h-3 w-3" />
      </Button>
      <span className="text-lg font-bold  min-w-[2rem] text-center">{value}</span>
      <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0 rounded-full" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}

const parseListItems = (items?: string | null) => {
  if (!items) return [];
  return items.split("\n").filter(item => item.trim() && item.trim() !== "-");
};

/* ── PackageSidebar Removed ── */

/* ── Main Page ─────────────────────────────────────────────── */
const PackageDetailPage = () => {
  const { id: slug } = useParams();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: packageData, isLoading: loading } = usePackageBySlug(slug);

  // Calculator state
  const [selectedTier, setSelectedTier] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [selectedComboIdx, setSelectedComboIdx] = useState(0);

  const availableTiers = packageData?.available_tiers || ["nyaman"];
  const effectiveTier = availableTiers.includes(selectedTier) ? selectedTier : availableTiers[0];

  const price = packageData ? getTierPrice(packageData, effectiveTier) : null;
  const hotels = packageData ? getTierHotels(packageData, effectiveTier) : null;

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

  const seatPercentage = packageData?.slots_total && packageData?.slots_filled
    ? Math.min(100, Math.round((packageData.slots_filled / packageData.slots_total) * 100))
    : null;

  const handleBooking = () => {
    if (!packageData) return;
    const message = `Halo Musafar Tour, saya tertarik dengan paket ${packageData.package_name}. Mohon info lebih lanjut untuk pendaftaran.`;
    redirectToWhatsApp(message);
  };

  const handleWhatsApp = () => {
    if (!packageData || !selectedCombo) return;
    const tierLabel = TIER_LABELS[effectiveTier] || effectiveTier;
    const name = customerName || "Bapak/Ibu";
    const depDate = fmtDate(packageData.departure_date);

    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} Dewasa`);
    if (children > 0) parts.push(`${children} Anak (Sharing Bed)`);
    if (infants > 0) parts.push(`${infants} Infant`);

    let msg = `Assalamu'alaikum ${name},\n\nBerikut estimasi biaya Umroh dari *Musafar Tour*:\n\n`;
    msg += `📦 *Paket:* ${packageData.package_name} (${tierLabel})\n`;
    msg += `📅 *Keberangkatan:* ${depDate}\n`;
    msg += `🛏️ *Komposisi Kamar:* ${selectedCombo.label}\n`;
    msg += `👥 *Peserta:* ${parts.join(", ")}\n\n`;
    msg += `💰 *Rincian Harga:*\n`;
    msg += `• ${adults}x Dewasa = ${fmtShort(selectedCombo.totalRoomCost)}\n`;
    if (children > 0) msg += `• ${children}x Anak (Sharing) @ ${fmtShort(CHILD_PRICE)} = ${fmtShort(childTotal)}\n`;
    if (infants > 0) msg += `• ${infants}x Infant @ ${fmtShort(INFANT_PRICE)} = ${fmtShort(infantTotal)}\n`;
    msg += `\n*TOTAL: ${fmtShort(grandTotal)}*\n`;
    if (totalSavings > 0) {
      msg += `🎉 Diskon: ${fmtShort(discount)}/dewasa × ${adults} = hemat *${fmtShort(totalSavings)}*!\n`;
    }
    msg += `\n_Musafar Tour & Travel_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleNotifyMe = () => {
    toast({
      title: "Notifikasi Aktif",
      description: `Kami akan memberitahu Anda jika ada seat tersedia untuk ${packageData?.package_name}`,
    });
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 md:px-8 py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8"><Skeleton className="h-[600px]" /></div>
            <div className="col-span-4"><Skeleton className="h-[400px]" /></div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Not Found ─── */
  if (!packageData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 md:px-8 py-16 text-center">
          <Package className="h-24 w-24 mx-auto mb-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold mb-4 text-foreground">Paket tidak ditemukan</h1>
          <p className="text-muted-foreground mb-8">Paket yang Anda cari tidak tersedia atau sudah tidak aktif.</p>
          <Button onClick={() => navigate("/paket-umroh")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Paket Umroh
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const includedItems = parseListItems(packageData.included_items);
  const excludedItems = parseListItems(packageData.excluded_items);
  const equipmentItems = parseListItems(packageData.equipment_list);
  const sellingPoints = parseListItems(packageData.selling_points);
  const transport = getTierTransport(packageData, effectiveTier);

  const schemaData = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": `Paket Umroh ${packageData.package_name}`,
    "image": packageData.banner_image || (packageData.gallery_images?.[0]),
    "description": `Paket Umroh ${packageData.package_name} selama ${packageData.duration_days} hari keberangkatan ${fmtDate(packageData.departure_date)}.`,
    "brand": {
      "@type": "Brand",
      "name": "Musafar Tour"
    },
    "offers": {
      "@type": "Offer",
      "url": typeof window !== 'undefined' ? window.location.href : '',
      "priceCurrency": "IDR",
      "price": price?.quad || 0,
      "availability": packageData.is_sold_out ? "https://schema.org/SoldOut" : "https://schema.org/InStock"
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`Paket Umroh ${packageData.package_name} - Musafar Tour`}</title>
        <meta name="description" content={`Daftar Paket Umroh ${packageData.package_name} bersama Musafar Tour. Berangkat ${fmtDate(packageData.departure_date)}, durasi ${packageData.duration_days} hari.`} />
      </Helmet>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />
      <Navbar />

      {/* Sold Out Banner */}
      {packageData.is_sold_out && (
        <div className="bg-destructive text-destructive-foreground">
          <div className="container mx-auto px-6 md:px-8 py-3">
            <div className="flex items-center justify-center gap-3 text-center">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p className="font-semibold text-sm ">
                Paket ini sudah penuh untuk keberangkatan {fmtDate(packageData.departure_date)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tier selector bar */}
      {availableTiers.length > 1 && (
        <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="container mx-auto px-6 md:px-8 py-2 flex items-center justify-between">
            <h1 className="text-sm font-bold  truncate max-w-xs lg:max-w-md">{packageData.package_name}</h1>
            <div className="flex gap-1.5">
              {availableTiers.map((t) => (
                <button
                  key={t}
                  onClick={() => { setSelectedTier(t); setSelectedComboIdx(0); }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium  transition-all",
                    effectiveTier === t
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {TIER_LABELS[t] || t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="flex container mx-auto px-6 md:px-8 min-h-[calc(100vh-4rem)]">
        {/* ── Column A: Brochure Content ── */}
        <main className="flex-1 py-6 lg:pr-8 space-y-6">

            {/* Hero: Flyer + Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Flyer Image */}
              {packageData.banner_image && (
                <div className="lg:col-span-5 relative rounded-2xl overflow-hidden shadow-lg bg-card border self-start">
                  <img
                    src={packageData.banner_image}
                    alt={packageData.package_name}
                    className="w-full h-auto object-cover max-h-[700px]"
                    loading="eager"
                    fetchPriority="high"
                  />
                  {packageData.is_sold_out && (
                    <div className="absolute top-4 right-4 z-10">
                      <Badge className="bg-destructive text-destructive-foreground border-0 shadow text-sm px-3 py-1">SOLD OUT</Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Product Details (Right Column) */}
              <div className={cn("flex flex-col space-y-6", packageData.banner_image ? "lg:col-span-7" : "lg:col-span-12")}>
                
                {/* 1. Title & Price Block */}
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                    {packageData.package_name}
                  </h1>
                  
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-muted-foreground mb-1">Harga mulai dari</span>
                    <span className="text-4xl font-black text-primary tracking-tight">
                      {price?.quad ? `Rp ${new Intl.NumberFormat("id-ID").format(price.quad)}` : 'Harga belum tersedia'}
                    </span>
                  </div>

                  {/* Quick Info Badges */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-sm py-1">
                      <Clock className="h-4 w-4 mr-1.5" /> {packageData.duration_days} Hari
                    </Badge>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-sm py-1">
                      <Plane className="h-4 w-4 mr-1.5" /> {packageData.flight}
                    </Badge>
                    {packageData.hotel_makkah_rating && (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-sm py-1">
                        Hotel ⭐️ {packageData.hotel_makkah_rating}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 2. Key Metrics Card */}
                <Card className="border shadow-sm">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-bold mb-4 text-muted-foreground uppercase tracking-wider">Info Keberangkatan</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground  uppercase">Berangkat</p>
                          <p className="text-sm font-bold ">{fmtDate(packageData.departure_date)}</p>
                        </div>
                      </div>
                      {packageData.start_airport && (
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <PlaneTakeoff className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground  uppercase">Bandara</p>
                            <p className="text-sm font-bold ">{packageData.start_airport}</p>
                          </div>
                        </div>
                      )}
                      {packageData.route && packageData.route !== "-" && (
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Route className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground  uppercase">Rute</p>
                            <p className="text-sm font-bold ">{packageData.route}</p>
                          </div>
                        </div>
                      )}
                      {packageData.timeframe && packageData.timeframe !== "-" && (
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Timer className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground  uppercase">Timeframe</p>
                            <p className="text-sm font-bold ">{packageData.timeframe}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Transport */}
                    {transport && (
                      <div className="flex items-start gap-3 mt-4 pt-4 border-t">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Bus className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground  uppercase">Transport</p>
                          <p className="text-sm font-bold ">{transport}</p>
                        </div>
                      </div>
                    )}

                    {/* Seat Progress */}
                    {seatPercentage !== null && packageData.slots_total && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-muted-foreground ">Ketersediaan Seat</span>
                          <span className="text-xs font-bold ">{packageData.slots_filled}/{packageData.slots_total}</span>
                        </div>
                        <Progress value={seatPercentage} className="h-2" />
                        <p className="text-[10px] text-muted-foreground mt-1 ">
                          {packageData.slots_total - (packageData.slots_filled || 0)} seat tersisa
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Hotels */}
                {hotels && (hotels.makkah.name || hotels.madinah.name) && (
                  <Card className="border shadow-sm">
                    <CardContent className="p-5">
                      <h3 className="text-sm font-bold  text-muted-foreground uppercase mb-4">Akomodasi</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">                      {hotels.makkah.name && (
                        <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="text-xs font-bold  uppercase text-muted-foreground">Makkah</span>
                              {packageData.nights_makkah && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{packageData.nights_makkah} Malam</Badge>
                              )}
                            </div>
                            {hotels.makkah.star && <StarRating rating={hotels.makkah.star} />}
                          </div>
                          <p className="font-semibold text-sm ">{hotels.makkah.name}</p>
                          {(hotels.makkah.distance || hotels.makkah.walk) && (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {hotels.makkah.distance && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {hotels.makkah.distance}</span>}
                              {hotels.makkah.walk && <span className="inline-flex items-center gap-1"><Footprints className="h-3 w-3" /> {hotels.makkah.walk}</span>}
                            </div>
                          )}
                        </div>
                      )}

                      {hotels.madinah.name && (
                        <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="text-xs font-bold  uppercase text-muted-foreground">Madinah</span>
                              {packageData.nights_madinah && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{packageData.nights_madinah} Malam</Badge>
                              )}
                            </div>
                            {hotels.madinah.star && <StarRating rating={hotels.madinah.star} />}
                          </div>
                          <p className="font-semibold text-sm ">{hotels.madinah.name}</p>
                          {(hotels.madinah.distance || hotels.madinah.walk) && (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {hotels.madinah.distance && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {hotels.madinah.distance}</span>}
                              {hotels.madinah.walk && <span className="inline-flex items-center gap-1"><Footprints className="h-3 w-3" /> {hotels.madinah.walk}</span>}
                            </div>
                          )}
                        </div>
                      )}

                      {packageData.hotel_extra && packageData.hotel_extra !== "-" && packageData.nights_extra && (
                        <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
                          <div className="flex items-center gap-2">
                            <Hotel className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold  uppercase text-muted-foreground">Kota Tambahan</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{packageData.nights_extra} Malam</Badge>
                          </div>
                          <p className="font-semibold text-sm ">{packageData.hotel_extra}</p>
                        </div>
                      )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div className="mt-8">
              <Accordion type="single" collapsible className="w-full space-y-4" defaultValue="item-1">
                {/* Selling Points */}
                {sellingPoints.length > 0 && (
                  <AccordionItem value="item-1" className="border rounded-lg bg-card px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <span className="text-sm font-bold  text-muted-foreground uppercase flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" /> Keunggulan Paket
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {sellingPoints.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 py-1">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="text-sm ">{item}</span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Included & Excluded */}
                {(includedItems.length > 0 || excludedItems.length > 0) && (
                  <AccordionItem value="item-2" className="border rounded-lg bg-card px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <span className="text-sm font-bold  text-muted-foreground uppercase flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" /> Termasuk & Tidak Termasuk
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {includedItems.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold  text-emerald-600 uppercase mb-3 flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Termasuk
                            </h4>
                            <ul className="space-y-2">
                              {includedItems.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm ">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {excludedItems.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold  text-destructive uppercase mb-3 flex items-center gap-2">
                              <XCircle className="h-3.5 w-3.5" /> Tidak Termasuk
                            </h4>
                            <ul className="space-y-2">
                              {excludedItems.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm  text-muted-foreground">
                                  <span className="text-destructive shrink-0 font-bold mt-0.5">✕</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Equipment */}
                {equipmentItems.length > 0 && (
                  <AccordionItem value="item-3" className="border rounded-lg bg-card px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <span className="text-sm font-bold  text-muted-foreground uppercase flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" /> Perlengkapan
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="grid grid-cols-2 gap-3">
                        {equipmentItems.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm  py-1">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Itinerary */}
                {packageData.itinerary && packageData.itinerary !== "-" && (
                  <AccordionItem value="item-4" className="border rounded-lg bg-card px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <span className="text-sm font-bold  text-muted-foreground uppercase flex items-center gap-2">
                        <Route className="h-4 w-4 text-primary" /> Itinerary Perjalanan
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="relative pl-5 space-y-4 mt-2">
                        {parseListItems(packageData.itinerary).map((item, idx) => (
                          <div key={idx} className="relative">
                            <div className="absolute -left-5 top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm" />
                            {idx < parseListItems(packageData.itinerary).length - 1 && (
                              <div className="absolute -left-[15px] top-4 w-0.5 h-[calc(100%+16px)] bg-border" />
                            )}
                            <p className="text-sm  leading-relaxed">{item}</p>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>

            {/* Gallery */}
            {packageData.gallery_images && packageData.gallery_images.length > 0 && (
              <Card className="border shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold  text-muted-foreground uppercase mb-4">Galeri Foto</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {packageData.gallery_images.map((image, idx) => (
                      <div key={idx} className="relative aspect-square overflow-hidden rounded-lg shadow-sm">
                        <img src={image} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" loading="lazy" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Links */}
            <div className="flex flex-wrap gap-3">
              {packageData.catalog_link && (
                <a href={packageData.catalog_link} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2  text-sm">
                    <ExternalLink className="h-4 w-4" /> Lihat Katalog
                  </Button>
                </a>
              )}
              {packageData.itinerary_link && (
                <a href={packageData.itinerary_link} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2  text-sm">
                    <Download className="h-4 w-4" /> Download Itinerary
                  </Button>
                </a>
              )}
            </div>

            <div className="pb-24 lg:pb-8" />
        </main>

        {/* ── Column B: Sticky Sales Calculator (Temporarily Hidden) ── */}
        {false && (
        <aside className="w-[340px] shrink-0 border-l bg-card/50 backdrop-blur-sm overflow-y-auto hidden lg:block">
          <div className="p-4 space-y-4 sticky top-0">
            <div className="flex items-center gap-2 mb-1">
              <BedDouble className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold ">Kalkulator Harga</h3>
            </div>

            {/* Rate preview */}
            {price && (
              <div className="grid grid-cols-3 gap-1.5">
                {(["quad", "triple", "double"] as const).map((rt) => (
                  <div key={rt} className="p-2 rounded-lg text-center border bg-muted/30">
                    <span className="block text-[10px] text-muted-foreground  capitalize">{rt}</span>
                    <span className="block text-xs font-bold  mt-0.5">
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
                  <span className="text-xs font-semibold ">Dewasa</span>
                </div>
                <CounterInput value={adults} onChange={(v) => { setAdults(v); setSelectedComboIdx(0); }} min={1} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PersonStanding className="h-3.5 w-3.5 text-emerald-500" />
                  <div>
                    <span className="text-xs font-semibold ">Anak</span>
                    <span className="text-[10px] text-muted-foreground ml-1">25jt</span>
                  </div>
                </div>
                <CounterInput value={children} onChange={setChildren} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Baby className="h-3.5 w-3.5 text-pink-500" />
                  <div>
                    <span className="text-xs font-semibold ">Infant</span>
                    <span className="text-[10px] text-muted-foreground ml-1">12jt</span>
                  </div>
                </div>
                <CounterInput value={infants} onChange={setInfants} />
              </div>
            </div>

            {/* Discount */}
            <div className="space-y-1.5">
              <Label className="text-xs  flex items-center gap-1.5">
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
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all text-xs",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold ">{combo.label}</span>
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
                    <span className="font-semibold ">{fmtShort(selectedCombo.totalRoomCost)}</span>
                  </div>
                  {children > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{children}x Anak</span>
                      <span className="font-semibold ">{fmtShort(childTotal)}</span>
                    </div>
                  )}
                  {infants > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{infants}x Infant</span>
                      <span className="font-semibold ">{fmtShort(infantTotal)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold ">TOTAL</span>
                    <span className="text-base font-bold  text-primary">{fmtShort(grandTotal)}</span>
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

            {/* Simple booking CTA */}
            <Separator />
            {packageData.is_sold_out ? (
              <Button onClick={handleNotifyMe} className="w-full gap-2 text-xs" variant="outline" size="sm">
                <Bell className="h-3.5 w-3.5" /> Notify Me
              </Button>
            ) : (
              <Button onClick={handleBooking} className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white text-xs" size="sm">
                <Users className="h-3.5 w-3.5" /> Daftar Sekarang
              </Button>
            )}
          </div>
        </aside>
        )}
      </div>

      {/* Sticky Mobile CTA */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t shadow-lg z-50 p-3">
        <div className="flex gap-2">
          <Button
            onClick={handleBooking}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-sm py-5"
          >
            <Users className="mr-2 h-4 w-4" />
            Daftar Sekarang
          </Button>
          {price && (
            <div className="text-right shrink-0 flex flex-col justify-center">
              <p className="text-[10px] text-muted-foreground ">Mulai</p>
              <p className="text-sm font-bold  text-primary">{fmtShort(price.quad)}</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PackageDetailPage;
