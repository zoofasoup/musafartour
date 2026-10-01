import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parsePackagePrice, type PackagePrice } from '@/lib/packageSchema';
import { todayJakarta } from '@/lib/utils';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const LONG_CACHE_TIME = 10 * 60 * 1000; // 10 minutes

// Explicit allowlist for the public site. Excludes admin-only/business-sensitive
// columns on the same table (cogs_data, agent_commission_amount, cogs_status, etc.) —
// never widen this back to select('*'), that would leak supplier costs/margins publicly.
export const PUBLIC_PACKAGE_COLUMNS = [
  'id', 'slug', 'package_name', 'departure_date', 'duration_days', 'flight', 'flight_type',
  'banner_image', 'package_price', 'five_star_package_price', 'hemat_package_price',
  'pelataran_package_price', 'available_tiers',
  'makkah_hotel_name', 'makkah_hotel_star', 'makkah_distance', 'makkah_duration_walk',
  'madinah_hotel_name', 'madinah_hotel_star', 'madinah_distance', 'madinah_duration_walk',
  'five_star_makkah_hotel_name', 'five_star_makkah_hotel_star', 'five_star_makkah_distance', 'five_star_makkah_duration_walk',
  'five_star_madinah_hotel_name', 'five_star_madinah_hotel_star', 'five_star_madinah_distance', 'five_star_madinah_duration_walk',
  'hemat_makkah_hotel_name', 'hemat_makkah_hotel_star', 'hemat_makkah_distance', 'hemat_makkah_duration_walk',
  'hemat_madinah_hotel_name', 'hemat_madinah_hotel_star', 'hemat_madinah_distance', 'hemat_madinah_duration_walk',
  'pelataran_makkah_hotel_name', 'pelataran_makkah_hotel_star', 'pelataran_makkah_distance', 'pelataran_makkah_duration_walk',
  'pelataran_madinah_hotel_name', 'pelataran_madinah_hotel_star', 'pelataran_madinah_distance', 'pelataran_madinah_duration_walk',
  'best_seller_transport', 'five_star_transport', 'hemat_transport', 'pelataran_transport',
  'selling_points', 'included_items', 'excluded_items', 'equipment_list', 'catalog_link',
  'itinerary_link', 'itinerary', 'gallery_images',
  'start_airport', 'route', 'timeframe', 'slots_total', 'slots_filled', 'slots_booked_online', 'seat_source', 'slots_registered',
  'nights_makkah', 'nights_madinah', 'nights_extra', 'hotel_extra', 'is_sold_out', 'sold_out_date',
  'waitlist_count', 'meta_title', 'meta_description', 'og_image', 'canonical_url',
].join(', ');

// Agents also need their flat commission; still no COGS/margin data.
export const AGENT_PACKAGE_COLUMNS = `${PUBLIC_PACKAGE_COLUMNS}, agent_commission_amount, commission_rate, status`;

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
  hemat_package_price: PackagePrice | undefined;
  pelataran_package_price: PackagePrice | undefined;
  available_tiers: string[] | null;
  // Nyaman / Best Seller hotels
  makkah_hotel_name: string | null;
  makkah_hotel_star: number | null;
  makkah_distance: string | null;
  makkah_duration_walk: string | null;
  madinah_hotel_name: string | null;
  madinah_hotel_star: number | null;
  madinah_distance: string | null;
  madinah_duration_walk: string | null;
  // Five Star hotels
  five_star_makkah_hotel_name: string | null;
  five_star_makkah_hotel_star: number | null;
  five_star_makkah_distance: string | null;
  five_star_makkah_duration_walk: string | null;
  five_star_madinah_hotel_name: string | null;
  five_star_madinah_hotel_star: number | null;
  five_star_madinah_distance: string | null;
  five_star_madinah_duration_walk: string | null;
  // Hemat hotels
  hemat_makkah_hotel_name: string | null;
  hemat_makkah_hotel_star: number | null;
  hemat_makkah_distance: string | null;
  hemat_makkah_duration_walk: string | null;
  hemat_madinah_hotel_name: string | null;
  hemat_madinah_hotel_star: number | null;
  hemat_madinah_distance: string | null;
  hemat_madinah_duration_walk: string | null;
  // Pelataran hotels
  pelataran_makkah_hotel_name: string | null;
  pelataran_makkah_hotel_star: number | null;
  pelataran_makkah_distance: string | null;
  pelataran_makkah_duration_walk: string | null;
  pelataran_madinah_hotel_name: string | null;
  pelataran_madinah_hotel_star: number | null;
  pelataran_madinah_distance: string | null;
  pelataran_madinah_duration_walk: string | null;
  // Transport
  best_seller_transport: string | null;
  five_star_transport: string | null;
  hemat_transport: string | null;
  pelataran_transport: string | null;
  // Content
  selling_points: string | null;
  included_items: string | null;
  excluded_items: string | null;
  equipment_list: string | null;
  catalog_link: string | null;
  itinerary_link: string | null;
  itinerary: string | null;
  gallery_images: string[] | null;
  // Metadata
  start_airport: string | null;
  route: string | null;
  timeframe: string | null;
  slots_total: number | null;
  /** Seats sold offline, overwritten wholesale by the daily sheet sync. */
  slots_filled: number | null;
  /** Seats held/sold through the online booking system. See getSlotsTaken(). */
  slots_booked_online: number | null;
  seat_source?: string | null;
  slots_registered?: number | null;
  nights_makkah: number | null;
  nights_madinah: number | null;
  nights_extra: number | null;
  hotel_extra: string | null;
  is_sold_out: boolean;
  sold_out_date: string | null;
  waitlist_count: number | null;
  // SEO
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
}

const transformPackage = (row: any): PublishedPackage => ({
  ...row,
  package_price: parsePackagePrice(row.package_price),
  five_star_package_price: row.five_star_package_price
    ? parsePackagePrice(row.five_star_package_price)
    : undefined,
  hemat_package_price: row.hemat_package_price
    ? parsePackagePrice(row.hemat_package_price)
    : undefined,
  pelataran_package_price: row.pelataran_package_price
    ? parsePackagePrice(row.pelataran_package_price)
    : undefined,
});

export const usePublishedPackages = () => {
  return useQuery({
    queryKey: ['published-packages'],
    queryFn: async (): Promise<PublishedPackage[]> => {
      const { data, error } = await supabase
        .from('packages')
        .select(PUBLIC_PACKAGE_COLUMNS)
        .eq('status', 'published')
        .gte('departure_date', todayJakarta())
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
        .select(PUBLIC_PACKAGE_COLUMNS)
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
