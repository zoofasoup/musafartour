import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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
    .select("*")
    .eq("status", "published")
    .order("departure_date", { ascending: true });

  if (error) throw error;
  return (data as PackageData[]) || [];
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

  if (error) throw error;
  return data || [];
};

const fetchFaqItems = async (): Promise<FAQItem[]> => {
  const { data, error } = await supabase
    .from("faq_items")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data || [];
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