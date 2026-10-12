import { useParams, Link } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
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
import { Package, ArrowLeft, CalendarCheck } from "lucide-react";
import { usePackageBySlug } from "@/hooks/usePackages";
import { useReferralCapture } from "@/hooks/useReferralCapture";
import { isPackageUnavailable, isPackageDeparted, formatCurrency, parseListItems, getSlotsRemaining, getOptimizedImageUrl } from "@/lib/utils";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { trackViewContent } from "@/lib/tracking";
import { SEO } from "@/components/SEO";
import { generateProductSchema, generateBreadcrumbSchema } from "@/lib/structuredData";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { TierSelector, TIER_LABELS } from "@/components/package-detail/TierSelector";
import { PackageGallery } from "@/components/package-detail/PackageGallery";
import { PackageHeader } from "@/components/package-detail/PackageHeader";
import { PackageHotels } from "@/components/package-detail/PackageHotels";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { PkgDetailSkeleton } from "@/components/package-list/PkgSkeletons";
import { PackageFeatures } from "@/components/package-detail/PackageFeatures";
import { PackagePricing } from "@/components/package-detail/PackagePricing";
import { PackagePaymentTerms } from "@/components/package-detail/PackagePaymentTerms";
import { PackageCtaButtons } from "@/components/package-detail/PackageCtaButtons";
import { PackageTestimonials } from "@/components/package-detail/PackageTestimonials";
import { PackageMobileView } from "@/components/package-detail/PackageMobileView";
import type { PackagePricingBodyProps } from "@/components/package-detail/PackagePricing";
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

/** Phone layout below the lg breakpoint. Read synchronously so the wrong layout never flashes (and tour ids exist once). */
function useIsDesktop() {
  const query = "(min-width: 1024px)";
  const [isDesktop, setIsDesktop] = useState(() => (typeof window === "undefined" ? true : window.matchMedia(query).matches));
  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", on);
    on();
    return () => mql.removeEventListener("change", on);
  }, []);
  return isDesktop;
}

const PackageDetailPage = () => {
  const { id: slug } = useParams();
  const isDesktop = useIsDesktop();

  const { data: packageData, isLoading: loading } = usePackageBySlug(slug);

  // Capture ?ref={agentCode} from agent share links into a first-touch
  // cookie, read later by BookingCreate.tsx when the customer books.
  useReferralCapture();

  // Calculator state
  const [selectedTier, setSelectedTier] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [selectedComboIdx, setSelectedComboIdx] = useState(0);
  const [calculatorExpanded, setCalculatorExpanded] = useState(false);

  // On the phone the walkthrough starts only once the visitor has scrolled past the flyer into the price panel.
  const [scrolledIn, setScrolledIn] = useState(false);
  useEffect(() => {
    if (isDesktop || scrolledIn) return;
    const check = () => {
      if (window.scrollY > window.innerHeight * 0.5) setScrolledIn(true);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [isDesktop, scrolledIn]);
  const tour = useProductTour("package-detail", !loading && !!packageData && (isDesktop || scrolledIn), isDesktop ? 900 : 500);
  const tourSteps = [
    {
      targets: ["#tour-rooms"],
      title: "Pilih Tipe Kamar",
      body: "Quad, Triple, atau Double. Harga ikut berubah sesuai pilihanmu.",
    },
    {
      targets: ["#tour-cta-solo"],
      title: "Berangkat Sendiri?",
      body: "Mau daftar sendiri tanpa rombongan? Klik tombol ini untuk chat langsung dengan tim kami.",
    },
    {
      targets: ["#tour-cta-calculator"],
      title: "Hitung Biaya Rombongan",
      body: "Berangkat rame-rame? Buka kalkulator untuk menghitung total biaya sesuai jumlah peserta.",
    },
    {
      targets: ["#tour-cart"],
      title: "Simpan ke Keranjang",
      body: "Belum yakin? Simpan paket ini dan bandingkan nanti.",
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

  // Seats still bookable (adults + children). Undefined when no seat limit is set.
  const seatsLeft = packageData?.slots_total ? getSlotsRemaining(packageData) : undefined;

  // The calculator defaulted to 2 adults even when only 1 seat was left.
  useEffect(() => {
    if (seatsLeft && adults + children > seatsLeft) {
      setChildren(0);
      setAdults(Math.max(1, seatsLeft));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatsLeft]);

  // Meta ViewContent (catalog / dynamic ads): once per package opened.
  const quadPrice = price?.quad || 0;
  useEffect(() => {
    if (!packageData?.id) return;
    trackViewContent({ id: packageData.id, name: packageData.package_name, value: quadPrice || undefined, category: effectiveTier });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageData?.id]);

  const trackedPackage = (value?: number) =>
    packageData ? { id: packageData.id, name: packageData.package_name, value: value || quadPrice || undefined, category: effectiveTier } : undefined;

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

    // Lead value = the quote the customer just built.
    redirectToWhatsApp(msg, "package_calculator", trackedPackage(grandTotal));
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

    redirectToWhatsApp(msg, "package_solo", trackedPackage());
  };

  // "Book Now" on the phone layout: the chosen room and its price go into the message.
  const handleBookWhatsApp = (room?: { label: string; price: number }) => {
    if (!packageData) return;
    const depDate = fmtDate(packageData.departure_date);
    let msg = `Assalamu'alaikum Musafar Tour,\n\nSaya ingin booking paket Umroh berikut:\n\n`;
    msg += `📦 *Paket:* ${packageData.package_name}\n`;
    msg += `📅 *Keberangkatan:* ${depDate}\n`;
    if (room) msg += `🛏️ *Kamar:* ${room.label}\n💰 *Harga:* ${formatCurrency(room.price)}/orang\n`;
    msg += `\nMohon info langkah selanjutnya. Terima kasih.`;
    redirectToWhatsApp(msg, "package_book", trackedPackage());
  };

  // Waitlist goes through WhatsApp like every other CTA - the old toast
  // promised a notification but never recorded who asked.
  const handleNotifyMe = () => {
    if (!packageData) return;
    let msg = `Assalamu'alaikum Musafar Tour,\n\n`;
    msg += `Saya ingin masuk waitlist untuk paket berikut:\n\n`;
    msg += `📦 *Paket:* ${packageData.package_name}\n`;
    msg += `📅 *Keberangkatan:* ${fmtDate(packageData.departure_date)}\n\n`;
    msg += `Mohon kabari saya jika ada seat kosong, atau info jadwal terdekat lainnya. Terima kasih.`;
    redirectToWhatsApp(msg, "package_waitlist", trackedPackage());
  };

  if (loading && !isDesktop) {
    return (
      <>
        <Navbar />
        <PkgDetailSkeleton />
      </>
    );
  }

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
        <SEO title="Paket Tidak Ditemukan - Musafar Tour" noindex useDefaults={false} />
        <Navbar />
        <div className="container mx-auto px-6 md:px-8 py-16 text-center">
          <Package className="h-24 w-24 mx-auto mb-6 text-muted-foreground" aria-hidden />
          <h1 className="text-3xl font-bold mb-4 text-foreground">Paket tidak ditemukan</h1>
          <p className="text-muted-foreground mb-8">Paket yang kamu cari tidak tersedia atau sudah tidak aktif.</p>
          <Button variant="brand" asChild>
            <Link to="/paket-umroh">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Lihat semua paket umroh
            </Link>
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

  const pricingProps: PackagePricingBodyProps = {
    packageData,
    price,
    adults,
    setAdults,
    children,
    setChildren,
    infants,
    setInfants,
    discount,
    setDiscount,
    combos,
    safeComboIdx,
    setSelectedComboIdx,
    childTotal,
    infantTotal,
    selectedCombo,
    grandTotal,
    totalSavings,
    customerName,
    setCustomerName,
    handleWhatsApp,
    handleNotifyMe,
    maxPax: seatsLeft,
  };

  const pageUrl = packageData.canonical_url || `${SITE_URL}/paket-umroh/${packageData.slug}`;
  // Package names already start with "Umroh" ("Umroh Hemat"), which rendered as "Paket Umroh Umroh Hemat".
  const displayName = /^umroh\b/i.test(packageData.package_name)
    ? packageData.package_name
    : `Umroh ${packageData.package_name}`;
  const pageTitle =
    packageData.meta_title || `Paket ${displayName} ${fmtDate(packageData.departure_date)} - Musafar Tour`;
  const pageDescription =
    packageData.meta_description ||
    `Daftar Paket ${displayName} bersama Musafar Tour. Berangkat ${fmtDate(packageData.departure_date)}, durasi ${packageData.duration_days} hari${price?.quad ? `, mulai ${formatCurrency(price.quad)}/orang` : ""}.`;
  // Originals are up to 2.5 MB; share previews and schema only need ~1200px.
  const shareImage = packageData.og_image || packageData.banner_image || packageData.gallery_images?.[0];
  const pageImage = shareImage ? getOptimizedImageUrl(shareImage, 1200) : undefined;

  const { "@context": _pc, ...productSchema } = generateProductSchema({
    name: `Paket ${displayName}`,
    description: pageDescription,
    image: pageImage,
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
        noindex={isPackageDeparted(packageData)}
      />
      <Navbar />

      {isDesktop && (
        <>
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
        <main id="main" className="flex-1 min-w-0 lg:pr-2 space-y-6">
          {/* Gallery shows here on mobile only - on desktop it moves into the
              sidebar, stacked above the calculator, so this column is a
              single full-width block instead of splitting into two narrower
              ones. */}
          {hasImages && (
            <div className="lg:hidden">
              <PackageGallery packageData={packageData} />
            </div>
          )}

          <PackageHeader packageData={packageData} price={price} transport={transport} />


          <PackageHotels packageData={packageData} hotels={hotels} />

          <PackageFeatures
            includedItems={includedItems}
            excludedItems={excludedItems}
          />

          <PackagePaymentTerms />

          <PackageTestimonials />

          <RelatedPackages currentPackageId={packageData.id} currentTier={effectiveTier} />
        </main>

        <div className="hidden lg:flex lg:flex-col gap-6 w-[360px] shrink-0">
          {hasImages && <PackageGallery packageData={packageData} />}

          {/* Sticky so the CTA (and calculator, once expanded) stays clickable
              while the user scrolls through hotels/features/testimonials below. */}
          <div className="sticky top-24 space-y-6 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <PackageCtaButtons
              packageData={packageData}
              price={price}
              onSoloWhatsApp={handleSoloWhatsApp}
              calculatorExpanded={calculatorExpanded}
              onToggleCalculator={() => setCalculatorExpanded((v) => !v)}
              handleNotifyMe={handleNotifyMe}
            />

            {/* Direct online booking button removed per user request (all CTAs to WhatsApp) */}

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
              maxPax={seatsLeft}
            />
          </div>
        </div>
      </div>
        </>
      )}

      {!isDesktop && (
        <>
          <PackageMobileView
            packageData={packageData}
            price={price}
            transport={transport}
            onBookWhatsApp={handleBookWhatsApp}
            handleNotifyMe={handleNotifyMe}
            pricing={pricingProps}
            availableTiers={availableTiers}
            effectiveTier={effectiveTier}
            onSelectTier={(t) => {
              setSelectedTier(t);
              setSelectedComboIdx(0);
            }}
          >
            {hotels && (hotels.makkah.name || hotels.madinah.name) && (
              <PkgPanel tone="ink">
                <PackageHotels packageData={packageData} hotels={hotels} mobile />
              </PkgPanel>
            )}
            {(includedItems.length > 0 || excludedItems.length > 0) && (
              <PkgPanel tone="cream-2">
                <PackageFeatures includedItems={includedItems} excludedItems={excludedItems} mobile />
              </PkgPanel>
            )}
            <PkgPanel tone="cream" last>
              <PackagePaymentTerms flat />
              <div className="mt-14 [&>section]:mt-0">
                <PackageTestimonials headingClassName="pkg-h2 mb-6" flat />
              </div>
              <div className="mt-14 [&>section]:mt-0">
                <RelatedPackages currentPackageId={packageData.id} currentTier={effectiveTier} headingClassName="pkg-h2 mb-6" flat />
              </div>
            </PkgPanel>
          </PackageMobileView>
        </>
      )}

      <Footer variant={isDesktop ? undefined : "pkg"} />

      <ProductTour steps={tourSteps} active={tour.active} onFinish={tour.finish} />
    </div>
  );
};

export default PackageDetailPage;
