import { useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useHomepageData } from "@/hooks/useHomepageData";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { PkgListCard } from "@/components/package-list/PkgListCard";
import { PkgTestimonialCard } from "@/components/package-list/PkgTestimonialCard";
import { PkgCardSkeleton } from "@/components/package-list/PkgSkeletons";
import { usePkgNav } from "@/hooks/usePkgNav";
import "@/styles/pkg-v2.css";
import { getTierPrice, isPackageUnavailable, getSlotsTaken } from "@/lib/utils";
import { resolveTierHotels } from "@/lib/roomCombos";
import type { PublishedPackage } from "@/hooks/usePackages";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Heart, Baby, MapPin, Landmark, CreditCard, Phone, Mail, ExternalLink, CheckCircle2 } from "lucide-react";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

const btnFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2";

const TentangKami = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  usePkgNav(rootRef);
  const { packages, packagesLoading, testimonials, websiteSettings } = useHomepageData();

  const handleWhatsApp = () => {
    redirectToWhatsApp("Assalamu'alaikum, saya ingin konsultasi tentang paket umroh Musafar Tour", "tentang_kami");
  };

  const address = websiteSettings?.address || "Commercial Park Harapan Indah, Ruko Emerald Blok EB 1 No.28, Medan Satria, Kota Bekasi, Jawa Barat 17131";
  const phone = websiteSettings?.phone_number || "081917403797";
  const email = websiteSettings?.email || "musafartour@gmail.com";

  return (
    <div ref={rootRef} className="pkg-v2 min-h-screen">
      <SEO
        title="Tentang Kami - Musafar Tour | Travel Umroh Ramah Keluarga"
        description="Musafar Tour adalah travel umroh terpercaya, berizin resmi PPIU Kemenag, yang dirancang khusus untuk keluarga - ramah lansia dan ramah anak."
        keywords="tentang musafar tour, travel umroh ramah keluarga, umroh bersama orang tua, umroh bersama anak"
        canonicalUrl="https://musafartour.com/tentang-kami"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          mainEntity: {
            "@type": "TravelAgency",
            name: "Musafar Tour",
            description: "Travel umroh terpercaya, ramah keluarga",
          },
        }}
      />
      <Navbar />
      <main id="main">
        <PkgPanel tone="ink" top>
          <div className="mx-auto max-w-3xl">
            <p className="pkg-glass pkg-label inline-flex h-8 items-center rounded-full px-3 text-[13px]">Bukan safar biasa</p>
            <h1 className="pkg-title mt-5 text-balance !text-[46px] md:!text-[64px]">Umroh sekeluarga, tanpa cemas</h1>
            <p className="mt-5 text-[17px] leading-[1.5] text-pkg-fg-2">
              Orang tua yang sepuh atau si kecil ikut ke Tanah Suci bukan hal sederhana. Musafar dirancang supaya semua bisa beribadah dengan tenang.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={handleWhatsApp} className={`pkg-press pkg-glass-red pkg-label inline-flex h-14 items-center justify-center gap-2 rounded-full px-7 ${btnFocus} focus-visible:ring-pkg-cream focus-visible:ring-offset-pkg-ink`}>
                <WhatsAppIcon className="h-5 w-5" /> Tanya UC, gratis
              </button>
              <Link to="/paket-umroh" className={`pkg-press pkg-glass pkg-label inline-flex h-14 items-center justify-center rounded-full px-7 ${btnFocus} focus-visible:ring-pkg-cream focus-visible:ring-offset-pkg-ink`}>
                Lihat jadwal berangkat
              </Link>
            </div>
          </div>
        </PkgPanel>

        <PkgPanel tone="cream">
          <div className="mx-auto max-w-3xl">
            <h2 className="pkg-h2 text-balance">Kami urus ketenangan hatimu</h2>
            <p className="mt-5 text-[17px] leading-[1.55] text-pkg-fg-2">
              Cemas membawa orang tua, ragu membawa si kecil menempuh perjalanan jauh. Rasa khawatir itu sering memecah fokus ibadah. Kami tidak hanya mengurus tiket dan hotel.
            </p>
            <div className="mt-10 space-y-8">
              {[
                { icon: Heart, title: "Ramah lansia", desc: "Kursi roda dan GPS tracker untuk keamanan orang tua." },
                { icon: Baby, title: "Ramah anak", desc: "Children kit, stroller, dan rencana perjalanan yang tidak melelahkan." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pkg-cream-2 text-pkg-red-deep">
                    <item.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <h3 className="pkg-h3">{item.title}</h3>
                    <p className="mt-1 text-[16px] leading-[1.5] text-pkg-fg-2">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PkgPanel>

        {testimonials.length > 0 && (
          <PkgPanel tone="cream-2">
            <div className="mx-auto max-w-5xl">
              <h2 className="pkg-h2 text-balance">Cerita jamaah kami</h2>
              {websiteSettings?.google_review_url && (
                <a href={websiteSettings.google_review_url} target="_blank" rel="noopener noreferrer" className="pkg-label mt-4 inline-flex min-h-11 items-center gap-1.5 text-pkg-red-deep underline underline-offset-4">
                  Semua review di Google <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
              <div className="-mx-6 mt-8 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {testimonials.slice(0, 8).map((t) => (
                  <div key={t.id} className="w-[300px] shrink-0 snap-start">
                    <PkgTestimonialCard
                      name={t.name}
                      text={t.content}
                      location={t.location || ""}
                      gender={(t.gender as "male" | "female") || "male"}
                      imageUrl={t.image_url}
                    />
                  </div>
                ))}
              </div>
            </div>
          </PkgPanel>
        )}

        <PkgPanel tone="cream">
          <div className="mx-auto max-w-6xl">
            <h2 className="pkg-h2 text-balance">Pilih paket untuk keluarga</h2>
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {packagesLoading ? (
                <>
                  <PkgCardSkeleton />
                  <PkgCardSkeleton />
                  <PkgCardSkeleton />
                </>
              ) : packages && packages.length > 0 ? (
                [...packages]
                  .sort((a, b) => Number(isPackageUnavailable(a)) - Number(isPackageUnavailable(b)))
                  .slice(0, 3)
                  .map((pkg, i) => {
                    // Same as RelatedPackages: the package's own tier hotels, not the legacy base fields.
                    const tier = pkg.available_tiers?.[0] || "nyaman";
                    const tierHotels = resolveTierHotels(pkg as unknown as PublishedPackage, tier);
                    return (
                      <PkgListCard
                        key={pkg.id}
                        id={pkg.id}
                        slug={pkg.slug || undefined}
                        image={pkg.banner_image || "/placeholder.svg"}
                        title={pkg.package_name}
                        price={`${(getTierPrice(pkg).quad / 1_000_000).toFixed(1).replace(/\.0$/, "")} Juta`}
                        priceValue={getTierPrice(pkg).quad}
                        date={format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: localeId })}
                        dateShort={format(new Date(pkg.departure_date), "d MMM yyyy", { locale: localeId })}
                        duration={`${pkg.duration_days} Hari`}
                        airline={pkg.flight}
                        hotelMakkah={tierHotels.makkah.name || undefined}
                        hotelMakkahRating={tierHotels.makkah.star || undefined}
                        hotelMadinah={tierHotels.madinah.name || undefined}
                        hotelMadinahRating={tierHotels.madinah.star || undefined}
                        index={i}
                        isSoldOut={isPackageUnavailable(pkg)}
                        waitlistCount={pkg.waitlist_count || 0}
                        slotsTotal={pkg.slots_total}
                        slotsFilled={getSlotsTaken(pkg)}
                      />
                    );
                  })
              ) : (
                <p className="text-pkg-fg-2">Belum ada paket tersedia.</p>
              )}
            </div>
          </div>
        </PkgPanel>

        <PkgPanel tone="ink" last>
          <div className="mx-auto max-w-5xl">
            <h2 className="pkg-h2 text-balance">Siapkan niat, kami siapkan sisanya</h2>
            <div className="mt-10 grid gap-10 md:grid-cols-3">
              <div>
                <CheckCircle2 className="h-6 w-6 text-pkg-red-bright" aria-hidden />
                <h3 className="pkg-h3 mt-4">Syarat mudah</h3>
                <ul className="mt-3 space-y-2 text-[16px] leading-[1.5] text-pkg-fg-2">
                  <li>Paspor berlaku min. 12 bulan setelah berangkat</li>
                  <li>DP awal <span className="font-medium text-pkg-fg">Rp 5.000.000/pax</span></li>
                  <li>Cicilan bebas, lunas H-30</li>
                </ul>
              </div>
              <div>
                <CreditCard className="h-6 w-6 text-pkg-red-bright" aria-hidden />
                <h3 className="pkg-h3 mt-4">Pembayaran resmi</h3>
                <p className="mt-3 text-[16px] leading-[1.5] text-pkg-fg-2">
                  Transfer hanya ke rekening a.n <span className="font-medium text-pkg-fg">PT Musa Amanah Wisata</span>
                </p>
                <p className="mt-3 flex items-center gap-2 text-[16px] text-pkg-fg-2">
                  <Landmark className="h-4 w-4" aria-hidden /> BCA · BSI · BNI
                </p>
              </div>
              <div>
                <MapPin className="h-6 w-6 text-pkg-red-bright" aria-hidden />
                <h3 className="pkg-h3 mt-4">Kantor kami</h3>
                <p className="mt-3 text-[16px] leading-[1.5] text-pkg-fg-2">{address}</p>
                <p className="mt-3 flex items-center gap-2 text-[16px] text-pkg-fg-2"><Phone className="h-4 w-4" aria-hidden /> {phone}</p>
                <p className="mt-1 flex items-center gap-2 text-[16px] text-pkg-fg-2"><Mail className="h-4 w-4" aria-hidden /> {email}</p>
              </div>
            </div>
            <div className="mt-12 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={handleWhatsApp} className={`pkg-press pkg-glass-red pkg-label inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-7 ${btnFocus} focus-visible:ring-pkg-cream focus-visible:ring-offset-pkg-ink`}>
                <WhatsAppIcon className="h-5 w-5" /> Tanya UC
              </button>
              <Link to="/paket-umroh" className={`pkg-press pkg-glass pkg-label inline-flex h-14 items-center justify-center rounded-full px-7 ${btnFocus} focus-visible:ring-pkg-cream focus-visible:ring-offset-pkg-ink`}>
                Lihat paket
              </Link>
            </div>
          </div>
        </PkgPanel>
      </main>

      <Footer variant="pkg" />
    </div>
  );
};

export default TentangKami;
