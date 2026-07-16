import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ArrowLeft, ExternalLink, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePackageBySlug, type PublishedPackage } from "@/hooks/usePackages";
import { parsePackagePrice, type PackagePrice } from "@/lib/packageSchema";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { TierSelector, TIER_LABELS } from "@/components/package-detail/TierSelector";
import { PackageHero } from "@/components/package-detail/PackageHero";
import { PackageMetrics } from "@/components/package-detail/PackageMetrics";
import { PackageHotels } from "@/components/package-detail/PackageHotels";
import { PackageFeatures } from "@/components/package-detail/PackageFeatures";
import { PackagePricing, type RoomCombo } from "@/components/package-detail/PackagePricing";
import { Card, CardContent } from "@/components/ui/card";

/* ── Constants & Helpers ─────────────────────────────────────────────── */
const CHILD_PRICE = 25_000_000;
const INFANT_PRICE = 12_000_000;
const fmtShort = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
const fmtDate = (d: string) => {
  try { return format(new Date(d), "d MMM yyyy", { locale: localeId }); }
  catch { return d; }
};

const parseListItems = (items?: string | null) => {
  if (!items) return [];
  return items.split("\n").filter(item => item.trim() && item.trim() !== "-");
};

function getTierPrice(pkg: PublishedPackage, tier: string): PackagePrice {
  const tierMap: Record<string, string> = {
    "five-star": "five_star",
    "hemat": "hemat",
    "pelataran-hemat": "pelataran",
    "nyaman": "best_seller"
  };
  const mappedTier = tierMap[tier] || "best_seller";
  const tierData = (pkg.tiers_data as any)?.[mappedTier];

  if (tierData?.pricing) {
    return parsePackagePrice(tierData.pricing);
  }
  return parsePackagePrice(pkg.pricing);
}

function getTierHotels(pkg: PublishedPackage, tier: string) {
  const tierMap: Record<string, string> = {
    "five-star": "five_star",
    "hemat": "hemat",
    "pelataran-hemat": "pelataran",
    "nyaman": "best_seller"
  };
  const mappedTier = tierMap[tier] || "best_seller";
  const tierData = (pkg.tiers_data as any)?.[mappedTier];

  if (tierData?.hotels) {
    return tierData.hotels;
  }
  return {
    makkah: { name: pkg.hotel_makkah || "", star: pkg.hotel_makkah_rating || 0, distance: "", walk: "" },
    madinah: { name: pkg.hotel_madinah || "", star: pkg.hotel_madinah_rating || 0, distance: "", walk: "" }
  };
}

function getTierTransport(pkg: PublishedPackage, tier: string) {
  const tierMap: Record<string, string> = {
    "five-star": "five_star",
    "hemat": "hemat",
    "pelataran-hemat": "pelataran",
    "nyaman": "best_seller"
  };
  const mappedTier = tierMap[tier] || "best_seller";
  const tierData = (pkg.tiers_data as any)?.[mappedTier];
  return tierData?.transport || pkg.best_seller_transport;
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
  return combos;
}

/* ── Main Page ─────────────────────────────────────────────── */
const PackageDetailPage = () => {
  const { id: slug } = useParams();
  const navigate = useNavigate();

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
    document.getElementById("kalkulator-harga")?.scrollIntoView({ behavior: "smooth" });
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
    "brand": { "@type": "Brand", "name": "Musafar Tour" },
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

      <TierSelector
        availableTiers={availableTiers}
        effectiveTier={effectiveTier}
        packageName={packageData.package_name}
        onSelectTier={(t) => { setSelectedTier(t); setSelectedComboIdx(0); }}
      />

      <div className="flex flex-col lg:flex-row container mx-auto px-6 md:px-8 min-h-[calc(100vh-4rem)] gap-6 mt-6">
        <main className="flex-1 lg:pr-2 space-y-6">
          <PackageHero packageData={packageData} price={price}>
            <PackageMetrics packageData={packageData} transport={transport} seatPercentage={seatPercentage} />
            <PackageHotels packageData={packageData} hotels={hotels} />
          </PackageHero>

          <PackageFeatures
            packageData={packageData}
            sellingPoints={sellingPoints}
            includedItems={includedItems}
            excludedItems={excludedItems}
            equipmentItems={equipmentItems}
          />

          {packageData.gallery_images && packageData.gallery_images.length > 0 && (
            <Card className="border shadow-sm mt-8">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4">Galeri Foto</h3>
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

          <div className="flex flex-wrap gap-3 mt-8 pb-8">
            {packageData.catalog_link && (
              <a href={packageData.catalog_link} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2 text-sm">
                  <ExternalLink className="h-4 w-4" /> Lihat Katalog
                </Button>
              </a>
            )}
            {packageData.itinerary_link && (
              <a href={packageData.itinerary_link} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2 text-sm">
                  <Download className="h-4 w-4" /> Download Itinerary
                </Button>
              </a>
            )}
          </div>
        </main>

        <PackagePricing
          packageData={packageData}
          price={price}
          adults={adults}
          setAdults={setAdults}
          children={children}
          setChildren={setChildren}
          infants={infants}
          setInfants={setInfants}
          discount={discount}
          setDiscount={setDiscount}
          combos={combos}
          safeComboIdx={safeComboIdx}
          setSelectedComboIdx={setSelectedComboIdx}
          childTotal={childTotal}
          infantTotal={infantTotal}
          selectedCombo={selectedCombo}
          grandTotal={grandTotal}
          totalSavings={totalSavings}
          customerName={customerName}
          setCustomerName={setCustomerName}
          handleWhatsApp={handleWhatsApp}
          handleNotifyMe={handleNotifyMe}
          handleBooking={handleBooking}
        />
      </div>

      <Footer />
    </div>
  );
};

export default PackageDetailPage;
