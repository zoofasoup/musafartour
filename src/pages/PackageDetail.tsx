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
import { PackageHotels } from "@/components/package-detail/PackageHotels";
import { PackageFeatures } from "@/components/package-detail/PackageFeatures";
import { PackagePricing } from "@/components/package-detail/PackagePricing";
import { PackageCtaButtons } from "@/components/package-detail/PackageCtaButtons";
import { PackageTestimonials } from "@/components/package-detail/PackageTestimonials";
import { PackageStickyMobileBar } from "@/components/package-detail/PackageStickyMobileBar";
import { RelatedPackages } from "@/components/package-detail/RelatedPackages";
import { useProductTour } from "@/hooks/useProductTour";
import { ProductTour } from "@/components/tour/ProductTour";
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
  const [calculatorExpanded, setCalculatorExpanded] = useState(false);

  const tour = useProductTour("package-detail", !loading && !!packageData);
  const tourSteps = [
    {
      targets: ["#tour-cta-solo"],
      title: "Berangkat Sendiri?",
      body: "Mau daftar sendiri tanpa rombongan? Klik tombol ini untuk chat langsung dengan tim kami.",
    },
    {
      targets: ["#tour-cta-calculator"],
      title: "Hitung Biaya Rombongan",
      body: "Berangkat rame-rame? Klik di sini untuk membuka kalkulator dan menghitung total biaya sesuai jumlah peserta.",
    },
  ];

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

  const handleWhatsApp = () => {
    if (!packageData || !selectedCombo) return;
    const tierLabel = TIER_LABELS[effectiveTier] || effectiveTier;
    const name = customerName.trim();
    const depDate = fmtDate(packageData.departure_date);

    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} Dewasa`);
    if (children > 0) parts.push(`${children} Anak (Sharing Bed)`);
    if (infants > 0) parts.push(`${infants} Infant`);

    // This message is sent BY the customer TO Musafar Tour's WhatsApp (see
    // redirectToWhatsApp) - it must read as the customer's own inquiry, not
    // as Musafar Tour addressing the customer.
    let msg = `Assalamu'alaikum Musafar Tour,\n\n`;
    msg += name ? `Saya ${name}, tertarik dengan paket Umroh berikut:\n\n` : `Saya tertarik dengan paket Umroh berikut:\n\n`;
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
    msg += `\nMohon informasi lebih lanjut mengenai ketersediaan dan proses pendaftarannya. Terima kasih.`;

    redirectToWhatsApp(msg);
  };

  // Skips the calculator entirely - for a solo jamaah who just wants to ask
  // sales directly rather than configure a multi-pax room combo.
  const handleSoloWhatsApp = () => {
    if (!packageData) return;
    const depDate = fmtDate(packageData.departure_date);

    let msg = `Assalamu'alaikum Musafar Tour,\n\n`;
    msg += `Saya tertarik dengan paket Umroh berikut, rencana berangkat sendiri (tanpa rombongan):\n\n`;
    msg += `📦 *Paket:* ${packageData.package_name}\n`;
    msg += `📅 *Keberangkatan:* ${depDate}\n`;
    if (price?.quad) msg += `💰 *Harga mulai dari:* ${formatCurrency(price.quad)}/orang\n`;
    msg += `\nMohon info lebih lanjut mengenai opsi kamar untuk 1 orang. Terima kasih.`;

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
        <main className="flex-1 min-w-0 lg:pr-2 space-y-6">
          {/* Gallery shows here on mobile only - on desktop it moves into the
              sidebar, stacked above the calculator, so this column is a
              single full-width block instead of splitting into two narrower
              ones. */}
          {hasImages && (
            <div className="lg:hidden">
              <PackageGallery packageData={packageData} price={price} />
            </div>
          )}

          <PackageHeader packageData={packageData} price={price} transport={transport} />

          <PackageHotels packageData={packageData} hotels={hotels} />

          <PackageFeatures
            includedItems={includedItems}
            excludedItems={excludedItems}
          />

          <PackageTestimonials />

          <RelatedPackages currentPackageId={packageData.id} currentTier={effectiveTier} />
        </main>

        <div className="hidden lg:flex lg:flex-col gap-6 w-[360px] shrink-0">
          {hasImages && <PackageGallery packageData={packageData} price={price} />}

          {/* Sticky so the CTA (and calculator, once expanded) stays clickable
              while the user scrolls through hotels/features/testimonials below. */}
          <div className="sticky top-24 space-y-6 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <PackageCtaButtons
              packageData={packageData}
              price={price}
              onSoloWhatsApp={handleSoloWhatsApp}
              calculatorExpanded={calculatorExpanded}
              onToggleCalculator={() => setCalculatorExpanded((v) => !v)}
            />

            <PackagePricing
              expanded={calculatorExpanded}
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
            />
          </div>
        </div>
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
      />

      <Footer />

      <ProductTour steps={tourSteps} active={tour.active} onFinish={tour.finish} />
    </div>
  );
};

export default PackageDetailPage;
