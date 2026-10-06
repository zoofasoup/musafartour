import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useHomepageData } from "@/hooks/useHomepageData";
import { HeroSection } from "@/components/home/HeroSection";
import { AirlinesCarousel } from "@/components/home/AirlinesCarousel";
import { JamaahCarousel } from "@/components/home/JamaahCarousel";
import { PackageRadialCarousel } from "@/components/home/PackageRadialCarousel";
import { WhyChooseSection } from "@/components/home/WhyChooseSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTierPrice } from "@/lib/utils";

const Index = () => {
  const {
    packages,
    packagesLoading,
    heroData,
    heroLoading,
    sellingPoints,
    testimonials,
    faqItems,
    websiteSettings,
  } = useHomepageData();

  // Fetch page-level SEO settings
  const { data: pageSEO } = useQuery({
    queryKey: ["page-seo", "/"],
    queryFn: async () => {
      const { data } = await supabase
        .from("page_seo")
        .select("*")
        .eq("page_path", "/")
        .maybeSingle();
      return data;
    },
  });

  // Price range only from real packages: with none loaded there is nothing honest to publish.
  const quads = (packages ?? []).map((p) => getTierPrice(p).quad).filter((q) => q > 0);
  const doubles = (packages ?? []).map((p) => getTierPrice(p).double).filter((q) => q > 0);
  const minPrice = quads.length ? Math.min(...quads) : 0;
  const maxPrice = doubles.length ? Math.max(...doubles) : 0; // Double is usually highest

  const fmtShort = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

  // Dynamic structured data from settings
  const structuredData = {
    "@context": "https://schema.org",
    "@type": ["TravelAgency", "Organization"],
    "@id": "https://musafartour.com/#organization",
    name: websiteSettings?.site_name || "Musafar Tour",
    url: "https://musafartour.com",
    logo: "https://musafartour.com/logo.webp",
    description:
      websiteSettings?.site_tagline ||
      "Travel umroh dan haji terpercaya dengan pelayanan terbaik sejak 2015",
    address: {
      "@type": "PostalAddress",
      addressCountry: "ID",
      streetAddress: websiteSettings?.address || undefined,
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: `+${websiteSettings?.whatsapp_number || "6281917403797"}`,
      contactType: "customer service",
      availableLanguage: ["id", "ar"],
    },
    sameAs: [
      websiteSettings?.instagram_url,
      websiteSettings?.facebook_url,
      websiteSettings?.youtube_url,
      `https://wa.me/${websiteSettings?.whatsapp_number || "6281917403797"}`,
    ].filter(Boolean),
    ...(minPrice > 0 && maxPrice >= minPrice ? { priceRange: `${fmtShort(minPrice)} - ${fmtShort(maxPrice)}` } : {}),
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={pageSEO?.meta_title || "Musafar Tour - Paket Umroh & Haji Terpercaya 2026"}
        description={pageSEO?.meta_description || "Paket umroh dari PT Musa Amanah Wisata, berizin resmi PPIU Kemenag. Lihat jadwal, harga, dan hotel tiap paket. DP Rp 5 juta, cicilan bebas, lunas H-30."}
        keywords={pageSEO?.focus_keyword || "paket umroh, travel umroh terpercaya, umroh 2026, haji khusus, wisata halal"}
        canonicalUrl={pageSEO?.canonical_url || "https://musafartour.com/"}
        ogImage={pageSEO?.og_image}
        structuredData={structuredData}
      />
      <Navbar />

      {/* Cinematic page intro curtain */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[9999] bg-primary animate-site-intro-out"
      />

      <HeroSection heroData={heroData} websiteSettings={websiteSettings} isLoading={heroLoading} />

      <AirlinesCarousel />
      <JamaahCarousel />

      <PackageRadialCarousel packages={packages} loading={packagesLoading} />

      <WhyChooseSection sellingPoints={sellingPoints} />

      <TestimonialsSection
        testimonials={testimonials}
        websiteSettings={websiteSettings}
      />

      <FAQSection faqItems={faqItems} />

      <CTASection websiteSettings={websiteSettings} />

      <Footer />
    </div>
  );
};

export default Index;
