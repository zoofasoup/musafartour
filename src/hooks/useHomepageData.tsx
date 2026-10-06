import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PUBLIC_PACKAGE_COLUMNS } from "@/hooks/usePackages";
import { todayJakarta } from "@/lib/utils";

export type PackageData = Tables<"packages"> & {
  package_price: {
    quad: number;
    triple: number;
    double: number;
  };
  five_star_package_price?: {
    quad: number;
    triple: number;
    double: number;
  };
};

export type HeroData = Tables<"hero_section">;
export type SellingPoint = Tables<"selling_points">;
export type Testimonial = Tables<"testimonials">;
export type FAQItem = Tables<"faq_items">;
export type WebsiteSettings = Tables<"website_settings">;

const fetchPackages = async (): Promise<PackageData[]> => {
  const { data, error } = await supabase
    .from("packages")
    .select(PUBLIC_PACKAGE_COLUMNS)
    .eq("status", "published")
    .gte("departure_date", todayJakarta())
    .order("departure_date", { ascending: true });

  if (error) throw error;
  return (data as unknown as PackageData[]) || [];
};

const fetchHeroData = async (): Promise<HeroData | null> => {
  const { data, error } = await supabase
    .from("hero_section")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const fetchSellingPoints = async (): Promise<SellingPoint[]> => {
  const { data, error } = await supabase
    .from("selling_points")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data || [];
};

const fetchTestimonials = async (): Promise<Testimonial[]> => {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  // No stand-in reviews: when there are none (or the query fails) the section is hidden.
  if (error) throw error;
  return data ?? [];
};

/** Same query key as the homepage's own testimonials fetch, so pages sharing it also share the cache. */
export const useTestimonials = () => {
  return useQuery({
    queryKey: ["homepage-testimonials"],
    queryFn: fetchTestimonials,
    staleTime: 5 * 60 * 1000,
  });
};

const stamp = { is_active: true, created_at: "2026-10-06T00:00:00Z", updated_at: "2026-10-06T00:00:00Z" } as const;

/**
 * Shown only while the faq_items table is empty. Every statement here holds for every package
 * (PRODUCT.md: no claim about hotels, airlines or schedules that does not apply to all of them).
 */
const fallbackFaqs: FAQItem[] = [
  {
    id: "fallback-1",
    question: "Bagaimana cara daftar dan membayar?",
    category: "general",
    answer:
      "Isi form pendaftaran di halaman paket yang kamu pilih. CS kami menghubungi lewat WhatsApp untuk mengecek data dan seat, lalu kamu transfer DP Rp 5.000.000 per orang (DP tidak dapat dikembalikan). Cicilan bebas, kapan saja dan berapa saja, asalkan lunas paling lambat 30 hari sebelum tanggal berangkat. Semua pembayaran hanya ke rekening atas nama PT Musa Amanah Wisata.",
    display_order: 1,
    ...stamp,
  },
  {
    id: "fallback-2",
    question: "Apa syarat paspor?",
    category: "general",
    answer:
      "Paspor berlaku minimal 12 bulan setelah tanggal berangkat, dan nama di paspor minimal dua kata. Data paspor dan dokumen dilengkapi setelah DP, lewat link pribadi yang dikirim CS.",
    display_order: 2,
    ...stamp,
  },
  {
    id: "fallback-3",
    question: "Apakah Musafar Tour berizin resmi?",
    category: "general",
    answer:
      "Musafar Tour adalah PT Musa Amanah Wisata, penyelenggara perjalanan ibadah umrah dengan izin PPIU Kemenag nomor 17102200953750002.",
    display_order: 3,
    ...stamp,
  },
  {
    id: "fallback-4",
    question: "Apa saja yang termasuk dalam harga paket?",
    category: "general",
    answer:
      "Berbeda untuk setiap paket. Rincian yang termasuk dan tidak termasuk, hotel, dan maskapai tertulis di halaman masing-masing paket. Kalau ada yang belum jelas, tanyakan ke CS sebelum mendaftar.",
    display_order: 4,
    ...stamp,
  },
  {
    id: "fallback-5",
    question: "Bagaimana cara mengecek status pendaftaranku?",
    category: "general",
    answer:
      "Buka halaman Cek status pendaftaran, lalu isi kode pendaftaran (contoh MSF-12345) dan nomor WhatsApp yang kamu pakai saat mendaftar.",
    display_order: 5,
    ...stamp,
  },
];

const fetchFaqItems = async (): Promise<FAQItem[]> => {
  const { data, error } = await supabase
    .from("faq_items")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error || !data || data.length === 0) {
    return fallbackFaqs;
  }
  return data;
};

const fetchWebsiteSettings = async (): Promise<WebsiteSettings | null> => {
  const { data, error } = await supabase
    .from("website_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const useHomepageData = () => {
  const packagesQuery = useQuery({
    queryKey: ["homepage-packages"],
    queryFn: fetchPackages,
    staleTime: 5 * 60 * 1000,
  });

  const heroQuery = useQuery({
    queryKey: ["homepage-hero"],
    queryFn: fetchHeroData,
    staleTime: 5 * 60 * 1000,
  });

  const sellingPointsQuery = useQuery({
    queryKey: ["homepage-selling-points"],
    queryFn: fetchSellingPoints,
    staleTime: 5 * 60 * 1000,
  });

  const testimonialsQuery = useQuery({
    queryKey: ["homepage-testimonials"],
    queryFn: fetchTestimonials,
    staleTime: 5 * 60 * 1000,
  });

  const faqQuery = useQuery({
    queryKey: ["homepage-faq"],
    queryFn: fetchFaqItems,
    staleTime: 5 * 60 * 1000,
  });

  const settingsQuery = useQuery({
    queryKey: ["homepage-settings"],
    queryFn: fetchWebsiteSettings,
    staleTime: 5 * 60 * 1000,
  });

  return {
    packages: packagesQuery.data || [],
    packagesLoading: packagesQuery.isLoading,
    heroData: heroQuery.data,
    heroLoading: heroQuery.isLoading,
    sellingPoints: sellingPointsQuery.data || [],
    testimonials: testimonialsQuery.data || [],
    faqItems: faqQuery.data || [],
    websiteSettings: settingsQuery.data,
    isLoading: packagesQuery.isLoading,
  };
};