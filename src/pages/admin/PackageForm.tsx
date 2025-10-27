import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, X, Upload } from "lucide-react";

const packageSchema = z.object({
  package_name: z.string().min(1, "Nama paket wajib diisi"),
  departure_date: z.string().min(1, "Tanggal keberangkatan wajib diisi"),
  duration_days: z.number().min(1, "Durasi minimal 1 hari"),
  flight: z.string().min(1, "Maskapai wajib diisi"),
  flight_type: z.string().min(1, "Tipe penerbangan wajib diisi"),
  
  // Best Seller Tier
  madinah_hotel_name: z.string().optional(),
  madinah_hotel_star: z.number().optional(),
  madinah_distance: z.string().optional(),
  madinah_duration_walk: z.string().optional(),
  
  makkah_hotel_name: z.string().optional(),
  makkah_hotel_star: z.number().optional(),
  makkah_distance: z.string().optional(),
  makkah_duration_walk: z.string().optional(),
  
  price_quad: z.number().min(0, "Harga tidak valid"),
  price_triple: z.number().min(0, "Harga tidak valid"),
  price_double: z.number().min(0, "Harga tidak valid"),
  
  best_seller_transport: z.string().optional(),
  
  // Five-Star Tier
  five_star_madinah_hotel_name: z.string().optional(),
  five_star_madinah_hotel_star: z.number().optional(),
  five_star_madinah_distance: z.string().optional(),
  five_star_madinah_duration_walk: z.string().optional(),
  
  five_star_makkah_hotel_name: z.string().optional(),
  five_star_makkah_hotel_star: z.number().optional(),
  five_star_makkah_distance: z.string().optional(),
  five_star_makkah_duration_walk: z.string().optional(),
  
  five_star_price_quad: z.number().min(0, "Harga tidak valid"),
  five_star_price_triple: z.number().min(0, "Harga tidak valid"),
  five_star_price_double: z.number().min(0, "Harga tidak valid"),
  
  five_star_transport: z.string().optional(),
  
  included_items: z.array(z.string()).optional(),
  optional_items: z.array(z.string()).optional(),
  equipment_type: z.enum(["lengkap", "minimalis"]),
  
  catalog_link: z.string().optional(),
  itinerary_link: z.string().optional(),
  status: z.string(),
});

type PackageFormValues = z.infer<typeof packageSchema>;

const PackageForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [makkahHotels, setMakkahHotels] = useState<any[]>([]);
  const [madinahHotels, setMadinahHotels] = useState<any[]>([]);

  // Standard items yang selalu termasuk
  const standardIncludedItems = [
    "Tiket dan Visa",
    "Hotel Fullboard",
    "Makan 3x Sehari",
    "Handling",
    "Manasik",
    "City Tour",
    "Transportasi",
    "Tour Leader",
    "Muthowwif",
    "Perlengkapan",
    "Transmitter",
    "Al Baik"
  ];

  // Optional items yang bisa dipilih
  const optionalIncludedItems = [
    "Free Hotel Transit",
    "Al Romansiah",
    "Museum Al Wahyu",
    "Museum As Safiyyah",
    "Tour Badar",
    "Tour Thaif",
    "Tour Al Ula",
    "City Tour Singapore",
    "City Tour Doha",
    "Kereta Cepat",
    "Transport GMC",
    "Al Ula Bus VIP 12"
  ];

  // Items yang tidak termasuk (fixed)
  const excludedItems = [
    "Pembuatan Paspor",
    "Vaksin Meningitis",
    "Tiket PP Daerah",
    "Biaya Kelebihan Bagasi",
    "Pengeluaran Pribadi",
    "Biaya Kirim Perlengkapan"
  ];

  // Equipment options
  const equipmentOptions = {
    lengkap: [
      "Ransel",
      "Koper 24 Inch",
      "Buku Panduan Umroh & Notebook",
      "Syal",
      "Kain Ihram",
      "Baju Koko",
      "Gamis",
      "Mukena",
      "Kaos Ikhwan",
      "Strap Id Card",
      "Tumbler"
    ],
    minimalis: [
      "Koper 24 Inch",
      "Buku Panduan Umroh & Notebook",
      "Kain Ihram",
      "Mukena",
      "Baju Koko",
      "Gamis"
    ]
  };

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      package_name: "",
      departure_date: "",
      duration_days: 10,
      flight: "",
      flight_type: "Direct",
      price_quad: 0,
      price_triple: 0,
      price_double: 0,
      best_seller_transport: "Bus Eksklusif",
      five_star_price_quad: 0,
      five_star_price_triple: 0,
      five_star_price_double: 0,
      five_star_transport: "Kereta Cepat",
      included_items: standardIncludedItems,
      optional_items: [],
      equipment_type: "lengkap" as const,
      status: "draft",
    },
  });

  useEffect(() => {
    fetchHotels();
    if (id) {
      fetchPackage();
    }
  }, [id]);

  const fetchHotels = async () => {
    try {
      const { data, error } = await supabase
        .from("hotels")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      const makkah = data?.filter((h: any) => h.location === "makkah") || [];
      const madinah = data?.filter((h: any) => h.location === "madinah") || [];
      
      setMakkahHotels(makkah);
      setMadinahHotels(madinah);
    } catch (error) {
      console.error("Error fetching hotels:", error);
      toast.error("Gagal memuat data hotel");
    }
  };

  const handleBestSellerMadinahHotelChange = (hotelId: string) => {
    const hotel = madinahHotels.find((h) => h.id === hotelId);
    if (hotel) {
      form.setValue("madinah_hotel_name", hotel.name);
      form.setValue("madinah_hotel_star", hotel.star_rating);
      form.setValue("madinah_distance", hotel.distance);
      form.setValue("madinah_duration_walk", hotel.walking_duration);
    }
  };

  const handleBestSellerMakkahHotelChange = (hotelId: string) => {
    const hotel = makkahHotels.find((h) => h.id === hotelId);
    if (hotel) {
      form.setValue("makkah_hotel_name", hotel.name);
      form.setValue("makkah_hotel_star", hotel.star_rating);
      form.setValue("makkah_distance", hotel.distance);
      form.setValue("makkah_duration_walk", hotel.walking_duration);
    }
  };

  const handleFiveStarMadinahHotelChange = (hotelId: string) => {
    const hotel = madinahHotels.find((h) => h.id === hotelId);
    if (hotel) {
      form.setValue("five_star_madinah_hotel_name", hotel.name);
      form.setValue("five_star_madinah_hotel_star", hotel.star_rating);
      form.setValue("five_star_madinah_distance", hotel.distance);
      form.setValue("five_star_madinah_duration_walk", hotel.walking_duration);
    }
  };

  const handleFiveStarMakkahHotelChange = (hotelId: string) => {
    const hotel = makkahHotels.find((h) => h.id === hotelId);
    if (hotel) {
      form.setValue("five_star_makkah_hotel_name", hotel.name);
      form.setValue("five_star_makkah_hotel_star", hotel.star_rating);
      form.setValue("five_star_makkah_distance", hotel.distance);
      form.setValue("five_star_makkah_duration_walk", hotel.walking_duration);
    }
  };

  const fetchPackage = async () => {
    try {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        // Set image previews
        if (data.banner_image) {
          setBannerPreview(data.banner_image);
        }
        if (data.gallery_images && Array.isArray(data.gallery_images)) {
          setGalleryPreviews(data.gallery_images);
        }

        const priceData = data.package_price as any;
        const fiveStarPriceData = data.five_star_package_price as any;
        form.reset({
          package_name: data.package_name,
          departure_date: data.departure_date,
          duration_days: data.duration_days,
          flight: data.flight,
          flight_type: data.flight_type,
          
          madinah_hotel_name: data.madinah_hotel_name || "",
          madinah_hotel_star: data.madinah_hotel_star || 0,
          madinah_distance: data.madinah_distance || "",
          madinah_duration_walk: data.madinah_duration_walk || "",
          
          makkah_hotel_name: data.makkah_hotel_name || "",
          makkah_hotel_star: data.makkah_hotel_star || 0,
          makkah_distance: data.makkah_distance || "",
          makkah_duration_walk: data.makkah_duration_walk || "",
          
          price_quad: priceData?.quad || 0,
          price_triple: priceData?.triple || 0,
          price_double: priceData?.double || 0,
          best_seller_transport: data.best_seller_transport || "Bus Eksklusif",
          
          five_star_madinah_hotel_name: data.five_star_madinah_hotel_name || "",
          five_star_madinah_hotel_star: data.five_star_madinah_hotel_star || 0,
          five_star_madinah_distance: data.five_star_madinah_distance || "",
          five_star_madinah_duration_walk: data.five_star_madinah_duration_walk || "",
          
          five_star_makkah_hotel_name: data.five_star_makkah_hotel_name || "",
          five_star_makkah_hotel_star: data.five_star_makkah_hotel_star || 0,
          five_star_makkah_distance: data.five_star_makkah_distance || "",
          five_star_makkah_duration_walk: data.five_star_makkah_duration_walk || "",
          
          five_star_price_quad: fiveStarPriceData?.quad || 0,
          five_star_price_triple: fiveStarPriceData?.triple || 0,
          five_star_price_double: fiveStarPriceData?.double || 0,
          five_star_transport: data.five_star_transport || "Kereta Cepat",
          
          included_items: standardIncludedItems,
          optional_items: (() => {
            if (typeof data.included_items === 'string') {
              const items = data.included_items.split(",").map((item: string) => item.trim());
              return items.filter((item: string) => !standardIncludedItems.includes(item));
            }
            return [];
          })(),
          equipment_type: (data.equipment_list?.includes("Ransel") ? "lengkap" : "minimalis") as "lengkap" | "minimalis",
          
          catalog_link: data.catalog_link || "",
          itinerary_link: data.itinerary_link || "",
          status: data.status,
        });
      }
    } catch (error: any) {
      toast.error("Gagal memuat data: " + error.message);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File terlalu besar. Maksimal 5MB");
        return;
      }
      setBannerImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + galleryImages.length > 10) {
      toast.error("Maksimal 10 gambar untuk galeri");
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} melebihi 5MB`);
        return false;
      }
      return true;
    });

    setGalleryImages(prev => [...prev, ...validFiles]);
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGalleryPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeBannerImage = () => {
    setBannerImage(null);
    setBannerPreview("");
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadBannerImage = async (): Promise<string | null> => {
    if (!bannerImage) return bannerPreview || null;

    const fileExt = bannerImage.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('package-images')
      .upload(filePath, bannerImage);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('package-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const uploadGalleryImages = async (): Promise<string[]> => {
    const existingUrls = galleryPreviews.filter(url => url.startsWith('http'));
    
    if (galleryImages.length === 0) return existingUrls;

    const uploadPromises = galleryImages.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `galleries/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('package-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('package-images')
        .getPublicUrl(filePath);

      return publicUrl;
    });

    const newUrls = await Promise.all(uploadPromises);
    return [...existingUrls, ...newUrls];
  };

  const onSubmit = async (values: PackageFormValues) => {
    setLoading(true);
    setUploadingImages(true);
    try {
      // Upload images first
      const bannerUrl = await uploadBannerImage();
      const galleryUrls = await uploadGalleryImages();
      
      setUploadingImages(false);

      const packageData = {
        package_name: values.package_name,
        departure_date: values.departure_date,
        duration_days: values.duration_days,
        flight: values.flight,
        flight_type: values.flight_type,
        
        madinah_hotel_name: values.madinah_hotel_name,
        madinah_hotel_star: values.madinah_hotel_star,
        madinah_distance: values.madinah_distance,
        madinah_duration_walk: values.madinah_duration_walk,
        
        makkah_hotel_name: values.makkah_hotel_name,
        makkah_hotel_star: values.makkah_hotel_star,
        makkah_distance: values.makkah_distance,
        makkah_duration_walk: values.makkah_duration_walk,
        
        package_price: {
          quad: values.price_quad,
          triple: values.price_triple,
          double: values.price_double,
        },
        best_seller_transport: values.best_seller_transport,
        
        five_star_madinah_hotel_name: values.five_star_madinah_hotel_name,
        five_star_madinah_hotel_star: values.five_star_madinah_hotel_star,
        five_star_madinah_distance: values.five_star_madinah_distance,
        five_star_madinah_duration_walk: values.five_star_madinah_duration_walk,
        
        five_star_makkah_hotel_name: values.five_star_makkah_hotel_name,
        five_star_makkah_hotel_star: values.five_star_makkah_hotel_star,
        five_star_makkah_distance: values.five_star_makkah_distance,
        five_star_makkah_duration_walk: values.five_star_makkah_duration_walk,
        
        five_star_package_price: {
          quad: values.five_star_price_quad,
          triple: values.five_star_price_triple,
          double: values.five_star_price_double,
        },
        five_star_transport: values.five_star_transport,
        
        banner_image: bannerUrl,
        gallery_images: galleryUrls,
        
        included_items: [...standardIncludedItems, ...(values.optional_items || [])].join(", "),
        excluded_items: excludedItems.join(", "),
        equipment_list: equipmentOptions[values.equipment_type].join(", "),
        
        catalog_link: values.catalog_link,
        itinerary_link: values.itinerary_link,
        status: values.status,
      };

      if (id) {
        const { error } = await supabase
          .from("packages")
          .update(packageData)
          .eq("id", id);

        if (error) throw error;
        toast.success("Paket berhasil diupdate");
      } else {
        const { error } = await supabase
          .from("packages")
          .insert(packageData);

        if (error) throw error;
        toast.success("Paket berhasil dibuat");
      }

      navigate("/admin/packages");
    } catch (error: any) {
      toast.error("Gagal menyimpan paket: " + error.message);
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/packages")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{id ? "Edit Paket" : "Tambah Paket"}</h1>
          <p className="text-muted-foreground">Lengkapi informasi paket umroh</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Paket</CardTitle>
              <CardDescription>Detail dasar paket umroh</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="package_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Paket</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Umroh 10 Hari Reguler" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="departure_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal Keberangkatan</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durasi (Hari)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="flight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maskapai</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih maskapai" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Garuda Indonesia">Garuda Indonesia</SelectItem>
                          <SelectItem value="Saudia">Saudia</SelectItem>
                          <SelectItem value="Scoot Airlines">Scoot Airlines</SelectItem>
                          <SelectItem value="Oman Air">Oman Air</SelectItem>
                          <SelectItem value="Qatar Airways">Qatar Airways</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="flight_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipe Penerbangan</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih tipe" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="direct">Direct</SelectItem>
                          <SelectItem value="transit">Transit</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Akomodasi Madinah</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="madinah_hotel_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Hotel</FormLabel>
                      <Select
                        onValueChange={handleBestSellerMadinahHotelChange}
                        value={madinahHotels.find((h) => h.name === field.value)?.id}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih hotel Madinah" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {madinahHotels.map((hotel) => (
                            <SelectItem key={hotel.id} value={hotel.id}>
                              {hotel.name} ({hotel.star_rating}⭐)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="madinah_hotel_star"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bintang Hotel</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(parseInt(val))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih bintang" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="3">3 Bintang</SelectItem>
                          <SelectItem value="4">4 Bintang</SelectItem>
                          <SelectItem value="5">5 Bintang</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="madinah_distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jarak ke Masjid Nabawi</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="100 meter" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="madinah_duration_walk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durasi Jalan Kaki</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="5 menit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Akomodasi Makkah</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="makkah_hotel_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Hotel</FormLabel>
                      <Select
                        onValueChange={handleBestSellerMakkahHotelChange}
                        value={makkahHotels.find((h) => h.name === field.value)?.id}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih hotel Makkah" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {makkahHotels.map((hotel) => (
                            <SelectItem key={hotel.id} value={hotel.id}>
                              {hotel.name} ({hotel.star_rating}⭐)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="makkah_hotel_star"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bintang Hotel</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(parseInt(val))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih bintang" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="3">3 Bintang</SelectItem>
                          <SelectItem value="4">4 Bintang</SelectItem>
                          <SelectItem value="5">5 Bintang</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="makkah_distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jarak ke Masjidil Haram</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="200 meter" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="makkah_duration_walk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durasi Jalan Kaki</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="10 menit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tier Best Seller</CardTitle>
              <CardDescription>Hotel, harga dan transportasi untuk paket Best Seller</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="best_seller_transport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transportasi Makkah-Madinah</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Bus Eksklusif" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="price_quad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quad (4 orang)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder="25000000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price_triple"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Triple (3 orang)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder="27000000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price_double"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Double (2 orang)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder="30000000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Akomodasi Madinah - Five Star</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="five_star_madinah_hotel_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Hotel</FormLabel>
                      <Select
                        onValueChange={handleFiveStarMadinahHotelChange}
                        value={madinahHotels.find((h) => h.name === field.value)?.id}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih hotel Madinah (Five Star)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {madinahHotels.map((hotel) => (
                            <SelectItem key={hotel.id} value={hotel.id}>
                              {hotel.name} ({hotel.star_rating}⭐)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="five_star_madinah_hotel_star"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bintang Hotel</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(parseInt(val))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih bintang" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="3">3 Bintang</SelectItem>
                          <SelectItem value="4">4 Bintang</SelectItem>
                          <SelectItem value="5">5 Bintang</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="five_star_madinah_distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jarak ke Masjid Nabawi</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="100 meter" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="five_star_madinah_duration_walk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durasi Jalan Kaki</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="5 menit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Akomodasi Makkah - Five Star</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="five_star_makkah_hotel_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Hotel</FormLabel>
                      <Select
                        onValueChange={handleFiveStarMakkahHotelChange}
                        value={makkahHotels.find((h) => h.name === field.value)?.id}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih hotel Makkah (Five Star)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {makkahHotels.map((hotel) => (
                            <SelectItem key={hotel.id} value={hotel.id}>
                              {hotel.name} ({hotel.star_rating}⭐)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="five_star_makkah_hotel_star"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bintang Hotel</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(parseInt(val))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih bintang" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="3">3 Bintang</SelectItem>
                          <SelectItem value="4">4 Bintang</SelectItem>
                          <SelectItem value="5">5 Bintang</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="five_star_makkah_distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jarak ke Masjidil Haram</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="200 meter" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="five_star_makkah_duration_walk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durasi Jalan Kaki</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="10 menit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tier Five Star</CardTitle>
              <CardDescription>Harga dan transportasi untuk paket Five Star</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="five_star_transport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transportasi Makkah-Madinah</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Kereta Cepat" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="five_star_price_quad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quad (4 orang)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder="35000000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="five_star_price_triple"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Triple (3 orang)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder="37000000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="five_star_price_double"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Double (2 orang)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder="40000000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Banner Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Banner Image</CardTitle>
              <CardDescription>Upload banner untuk paket (1080x1350px)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Banner
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Ukuran ideal: 1080x1350px (portrait). Maksimal 5MB
                </p>
              </div>

              {bannerPreview && (
                <div className="relative w-48 mx-auto">
                  <div className="aspect-[1080/1350] overflow-hidden rounded-lg border">
                    <img
                      src={bannerPreview}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2"
                    onClick={removeBannerImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gallery Images Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Gallery Images</CardTitle>
              <CardDescription>Upload gambar galeri (maksimal 10 gambar)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Gallery Images
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryChange}
                  disabled={loading || galleryPreviews.length >= 10}
                />
                <p className="text-xs text-muted-foreground">
                  Maksimal 10 gambar. Masing-masing maksimal 5MB
                </p>
              </div>

              {galleryPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {galleryPreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <div className="aspect-square overflow-hidden rounded-lg border">
                        <img
                          src={preview}
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 w-6 h-6"
                        onClick={() => removeGalleryImage(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fasilitas & Perlengkapan</CardTitle>
              <CardDescription>Kelola fasilitas yang termasuk dan tidak termasuk</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Standard Included Items */}
              <div className="space-y-3">
                <FormLabel className="text-base font-semibold">Termasuk (Standard)</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
                  {standardIncludedItems.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <Checkbox checked disabled />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional Included Items */}
              <FormField
                control={form.control}
                name="optional_items"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Termasuk (Opsional)</FormLabel>
                    <p className="text-sm text-muted-foreground mb-3">
                      Pilih fasilitas tambahan yang termasuk dalam paket ini
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg">
                      {optionalIncludedItems.map((item) => (
                        <FormField
                          key={item}
                          control={form.control}
                          name="optional_items"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item}
                                className="flex flex-row items-center space-x-2 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), item])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== item)
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {item}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Excluded Items (Fixed) */}
              <div className="space-y-3">
                <FormLabel className="text-base font-semibold">Tidak Termasuk</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
                  {excludedItems.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <X className="w-4 h-4 text-destructive" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment Type Selection */}
              <FormField
                control={form.control}
                name="equipment_type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base font-semibold">Pilihan Perlengkapan</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="space-y-4"
                      >
                        <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                          <RadioGroupItem value="lengkap" id="lengkap" />
                          <div className="space-y-2 flex-1">
                            <Label htmlFor="lengkap" className="font-semibold cursor-pointer">
                              Perlengkapan Lengkap
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {equipmentOptions.lengkap.join(", ")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                          <RadioGroupItem value="minimalis" id="minimalis" />
                          <div className="space-y-2 flex-1">
                            <Label htmlFor="minimalis" className="font-semibold cursor-pointer">
                              Perlengkapan Minimalis
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {equipmentOptions.minimalis.join(", ")}
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Link & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="catalog_link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link Katalog</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="itinerary_link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link Itinerary</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 p-4">
            <div className="container mx-auto flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/packages")}
              >
                Batal
              </Button>
              <Button type="submit" disabled={loading || uploadingImages}>
                {uploadingImages ? "Uploading images..." : loading ? "Menyimpan..." : "Simpan Paket"}
              </Button>
            </div>
          </div>
          {/* Spacer to prevent content from being hidden behind floating buttons */}
          <div className="h-20"></div>
        </form>
      </Form>
    </div>
  );
};

export default PackageForm;
