import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { TrustElements } from "@/components/TrustElements";
import { useHomepageData } from "@/hooks/useHomepageData";
import { HeroSection } from "@/components/home/HeroSection";
import { PackageFilterSection } from "@/components/home/PackageFilterSection";
import { SellingPointsSection } from "@/components/home/SellingPointsSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";

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

  // Dynamic structured data from settings
  const structuredData = {
    "@context": "https://schema.org",
    "@type": ["TravelAgency", "Organization"],
    name: websiteSettings?.site_name || "Musafar Tour",
    url: "https://musafartour.com",
    logo: "https://musafartour.com/logo.png",
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
    priceRange: "Rp 20.000.000 - Rp 60.000.000",
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title="Musafar Tour - Paket Umroh & Haji Terpercaya 2025"
        description="Paket umroh mulai 20 jutaan dengan pelayanan terbaik. Hotel bintang 5, katering Indonesia, pembimbing berpengalaman. Daftar sekarang!"
        keywords="paket umroh, travel umroh terpercaya, umroh 2025, haji khusus, wisata halal"
        canonicalUrl="https://musafartour.com/"
        structuredData={structuredData}
      />
      <Navbar />

      <HeroSection heroData={heroData} websiteSettings={websiteSettings} isLoading={heroLoading} />

      <TrustElements />

      <PackageFilterSection packages={packages} loading={packagesLoading} />

      <SellingPointsSection sellingPoints={sellingPoints} />

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