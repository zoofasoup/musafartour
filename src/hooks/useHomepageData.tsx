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

const fallbackReviews: Testimonial[] = [
  {
    id: "1",
    name: "Budi Santoso",
    content: "Alhamdulillah perjalanan umroh bersama Musafar Tour sangat berkesan. Pelayanannya luar biasa dari awal pendaftaran sampai kembali ke tanah air. Hotelnya benar-benar dekat dengan Masjidil Haram, makanan khas Indonesia cocok untuk orang tua, dan muthawif sangat sabar membimbing. Sangat direkomendasikan untuk umroh keluarga!",
    location: "Bekasi",
    gender: "male",
    image_url: null,
    rating: 5,
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "2",
    name: "Siti Aminah",
    content: "Travel yang sangat amanah. Saya berangkat bawa anak kecil dan orang tua yang butuh kursi roda. Tim Musafar sangat responsif membantu dari bandara sampai di Mekkah. Fasilitas pas di kantong tapi layanannya rasa VIP. InsyaAllah kalau ada rezeki umroh lagi pasti pakai Musafar Tour.",
    location: "Jakarta",
    gender: "female",
    image_url: null,
    rating: 5,
    is_active: true,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "3",
    name: "Ahmad Fauzi",
    content: "Harga transparan dan tidak ada biaya tersembunyi. Hotel di Madinah dekat pintu gate, hotel di Mekkah juga tinggal turun lift. Muthawif ustadznya sangat berilmu dan kajiannya mendalam. Kajian sejarah di Madinah sangat berkesan. Terima kasih Musafar Tour!",
    location: "Depok",
    gender: "male",
    image_url: null,
    rating: 5,
    is_active: true,
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "4",
    name: "Rina Kusuma",
    content: "Berangkat umroh sendirian awalnya ragu, tapi ternyata jamaahnya sangat kekeluargaan. Tour leader dari Jakarta sangat care memastikan semua jamaah kumpul dan tidak nyasar. Makanannya enak banget berasa masakan rumah. Sukses terus Musafar Tour PT Musa Amanah Wisata!",
    location: "Tangerang",
    gender: "female",
    image_url: null,
    rating: 5,
    is_active: true,
    display_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "5",
    name: "Hendra Wijaya",
    content: "Sangat profesional. Pengurusan visa dan paspor cepat dibantu. Pas di sana ada jamaah yang sakit langsung ditangani dengan sigap oleh dokter pendamping. Benar-benar travel yang memprioritaskan ibadah dan keselamatan jamaah. Recommended 100%.",
    location: "Bogor",
    gender: "male",
    image_url: null,
    rating: 5,
    is_active: true,
    display_order: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const fetchTestimonials = async (): Promise<Testimonial[]> => {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error || !data || data.length === 0) {
    return fallbackReviews;
  }
  return data;
};

const fallbackFaqs: FAQItem[] = [
  {
    id: "1",
    question: "Apakah jadwal keberangkatan sudah pasti?",
    category: "general",
    answer: "Ya, InsyaAllah 100% PASTI BERANGKAT. Kami menggunakan sistem block seat pesawat sejak awal, sehingga tiket pesawat dan jadwal sudah terjamin tidak akan berubah-ubah atau tertunda.",
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "2",
    question: "Apa saja fasilitas yang termasuk dalam harga paket?",
    category: "general",
    answer: "Harga sudah All-In meliputi: Tiket Pesawat PP, Visa Umroh, Hotel Bintang 4/5 (sangat dekat dengan masjid), Katering 3x sehari dengan menu khas Nusantara, Bus AC eksklusif selama di Arab Saudi, Muthawwif bersertifikat, perlengkapan umroh (koper, ihram/mukena, seragam), asuransi, dan air Zam-zam 5 liter.",
    is_active: true,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "3",
    question: "Bagaimana jika ada jamaah lansia atau yang menggunakan kursi roda?",
    category: "general",
    answer: "Musafar Tour sangat dikenal sebagai Travel Umroh Ramah Lansia dan Keluarga. Muthawwif kami akan memberikan pendampingan khusus. Jika membutuhkan kursi roda, kami bisa menyediakannya beserta jasa pendorong selama tawaf dan sa'i (biaya tambahan berlaku untuk jasa pendorong dari pihak Masjidil Haram).",
    is_active: true,
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "4",
    question: "Berapa jarak hotel ke Masjidil Haram dan Masjid Nabawi?",
    category: "general",
    answer: "Kami menjamin lokasi hotel yang sangat strategis. Untuk paket Premium, jarak hotel di Mekkah (seperti Zamzam Tower) dan Madinah berada tepat di pelataran masjid (0-100 meter). Anda cukup turun lift dan langsung berada di area masjid.",
    is_active: true,
    display_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "5",
    question: "Bagaimana prosedur pendaftaran dan sistem pembayarannya?",
    category: "general",
    answer: "Sangat mudah! Anda cukup membayar Uang Muka (DP) sebesar Rp 5.000.000/pax untuk booking seat (DP non-refundable). Pelunasan dapat dilakukan secara bertahap dan maksimal dibayarkan H-35 sebelum tanggal keberangkatan. Demi keamanan, SEMUA transaksi hanya ditransfer ke Rekening Resmi Perusahaan (PT Musa Amanah Wisata).",
    is_active: true,
    display_order: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
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