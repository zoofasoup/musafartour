import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Package, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePackageBySlug } from "@/hooks/usePackages";
import { isPackageUnavailable, formatCurrency, parseListItems } from "@/lib/utils";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { SEO } from "@/components/SEO";
import { generateProductSchema, generateBreadcrumbSchema } from "@/lib/structuredData";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { TierSelector, TIER_LABELS } from "@/components/package-detail/TierSelector";
import { PackageGallery } from "@/components/package-detail/PackageGallery";
import { PackageHeader } from "@/components/package-detail/PackageHeader";
import { PackageMetrics } from "@/components/package-detail/PackageMetrics";
import { PackageHotels } from "@/components/package-detail/PackageHotels";
import { PackageFeatures } from "@/components/package-detail/PackageFeatures";
import { PackagePricing } from "@/components/package-detail/PackagePricing";
import { PackageStickyMobileBar } from "@/components/package-detail/PackageStickyMobileBar";
import { RelatedPackages } from "@/components/package-detail/RelatedPackages";
import {
  generateRoomCombos,
  resolveTierPrice,
  resolveTierHotels,
  resolveTierTransport,
  CHILD_PRICE,
  INFANT_PRICE,
} from "@/lib/roomCombos";

const fmtDate = (d: string) => {
  try {
    return format(new Date(d), "d MMM yyyy", { locale: localeId });
  } catch {
    return d;
  }
};

const SITE_URL = "https://musafartour.com";

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

  const price = packageData ? resolveTierPrice(packageData, effectiveTier) : null;
  const hotels = packageData ? resolveTierHotels(packageData, effectiveTier) : null;

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
    msg += `• ${adults}x Dewasa = ${formatCurrency(selectedCombo.totalRoomCost)}\n`;
    if (children > 0) msg += `• ${children}x Anak (Sharing) @ ${formatCurrency(CHILD_PRICE)} = ${formatCurrency(childTotal)}\n`;
    if (infants > 0) msg += `• ${infants}x Infant @ ${formatCurrency(INFANT_PRICE)} = ${formatCurrency(infantTotal)}\n`;
    msg += `\n*TOTAL: ${formatCurrency(grandTotal)}*\n`;
    if (totalSavings > 0) {
      msg += `🎉 Diskon: ${formatCurrency(discount)}/dewasa × ${adults} = hemat *${formatCurrency(totalSavings)}*!\n`;
    }
    msg += `\n_Musafar Tour & Travel_`;

    redirectToWhatsApp(msg);
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
            <div className="col-span-8">
              <Skeleton className="h-[600px]" />
            </div>
            <div className="col-span-4">
              <Skeleton className="h-[400px]" />
            </div>
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
  const transport = resolveTierTransport(packageData, effectiveTier);
  const hasImages = !!(packageData.banner_image || packageData.gallery_images?.length);

  const pageUrl = packageData.canonical_url || `${SITE_URL}/paket-umroh/${packageData.slug}`;
  const pageTitle = packageData.meta_title || `Paket Umroh ${packageData.package_name} - Musafar Tour`;
  const pageDescription =
    packageData.meta_description ||
    `Daftar Paket Umroh ${packageData.package_name} bersama Musafar Tour. Berangkat ${fmtDate(packageData.departure_date)}, durasi ${packageData.duration_days} hari.`;
  const pageImage = packageData.og_image || packageData.banner_image || undefined;

  const { "@context": _pc, ...productSchema } = generateProductSchema({
    name: `Paket Umroh ${packageData.package_name}`,
    description: pageDescription,
    image: packageData.banner_image || packageData.gallery_images?.[0],
    price: price?.quad || 0,
    currency: "IDR",
    availability: isPackageUnavailable(packageData) ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    url: pageUrl,
  });
  const { "@context": _bc, ...breadcrumbSchema } = generateBreadcrumbSchema([
    { name: "Beranda", url: `${SITE_URL}/` },
    { name: "Paket Umroh", url: `${SITE_URL}/paket-umroh` },
    { name: packageData.package_name, url: pageUrl },
  ]);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [productSchema, breadcrumbSchema],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={pageTitle}
        description={pageDescription}
        ogImage={pageImage}
        canonicalUrl={pageUrl}
        structuredData={structuredData}
      />
      <Navbar />

      <TierSelector
        availableTiers={availableTiers}
        effectiveTier={effectiveTier}
        onSelectTier={(t) => {
          setSelectedTier(t);
          setSelectedComboIdx(0);
        }}
      />

      <div className="container mx-auto px-6 md:px-8 pt-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Beranda</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/paket-umroh">Paket Umroh</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-[200px]">{packageData.package_name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-col lg:flex-row container mx-auto px-6 md:px-8 min-h-[calc(100vh-4rem)] gap-6 mt-4 pb-24 lg:pb-8">
        <main className="flex-1 lg:pr-2 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {hasImages && (
              <div className="lg:col-span-5 self-start">
                <PackageGallery packageData={packageData} price={price} />
              </div>
            )}
            <div className={hasImages ? "lg:col-span-7" : "lg:col-span-12"}>
              <PackageHeader packageData={packageData} price={price} />
            </div>
          </div>

          <PackageMetrics packageData={packageData} transport={transport} />
          <PackageHotels packageData={packageData} hotels={hotels} />

          <PackageFeatures
            sellingPoints={sellingPoints}
            includedItems={includedItems}
            excludedItems={excludedItems}
            equipmentItems={equipmentItems}
          />

          <RelatedPackages currentPackageId={packageData.id} currentTier={effectiveTier} />
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

      <PackageStickyMobileBar
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

      <Footer />
    </div>
  );
};

export default PackageDetailPage;
