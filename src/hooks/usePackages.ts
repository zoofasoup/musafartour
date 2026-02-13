import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parsePackagePrice, type PackagePrice } from '@/lib/packageSchema';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const LONG_CACHE_TIME = 10 * 60 * 1000; // 10 minutes

export interface PublishedPackage {
  id: string;
  slug: string | null;
  package_name: string;
  departure_date: string;
  duration_days: number;
  flight: string;
  flight_type: string;
  banner_image: string | null;
  package_price: PackagePrice;
  five_star_package_price: PackagePrice | undefined;
  available_tiers: string[] | null;
  makkah_hotel_name: string | null;
  makkah_hotel_star: number | null;
  makkah_distance: string | null;
  makkah_duration_walk: string | null;
  madinah_hotel_name: string | null;
  madinah_hotel_star: number | null;
  madinah_distance: string | null;
  madinah_duration_walk: string | null;
  five_star_makkah_hotel_name: string | null;
  five_star_makkah_hotel_star: number | null;
  five_star_makkah_distance: string | null;
  five_star_makkah_duration_walk: string | null;
  five_star_madinah_hotel_name: string | null;
  five_star_madinah_hotel_star: number | null;
  five_star_madinah_distance: string | null;
  five_star_madinah_duration_walk: string | null;
  best_seller_transport: string | null;
  five_star_transport: string | null;
  included_items: string | null;
  excluded_items: string | null;
  equipment_list: string | null;
  catalog_link: string | null;
  itinerary_link: string | null;
  gallery_images: string[] | null;
  is_sold_out: boolean;
  sold_out_date: string | null;
  waitlist_count: number | null;
}

const transformPackage = (row: any): PublishedPackage => ({
  ...row,
  package_price: parsePackagePrice(row.package_price),
  five_star_package_price: row.five_star_package_price
    ? parsePackagePrice(row.five_star_package_price)
    : undefined,
});

export const usePublishedPackages = () => {
  return useQuery({
    queryKey: ['published-packages'],
    queryFn: async (): Promise<PublishedPackage[]> => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('status', 'published')
        .order('departure_date', { ascending: true });

      if (error) throw error;
      return (data || []).map(transformPackage);
    },
    staleTime: STALE_TIME,
  });
};

export const usePackageBySlug = (
  slug: string | undefined,
  options?: Partial<UseQueryOptions<PublishedPackage | null, Error>>
) => {
  return useQuery({
    queryKey: ['package-detail', slug],
    queryFn: async (): Promise<PublishedPackage | null> => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('slug', slug!)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;
      return data ? transformPackage(data) : null;
    },
    staleTime: LONG_CACHE_TIME,
    enabled: !!slug,
    refetchOnWindowFocus: false,
    ...options,
  });
};
