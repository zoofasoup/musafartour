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
  
  included_items: z.string().optional(),
  excluded_items: z.string().optional(),
  equipment_list: z.string().optional(),
  
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
      status: "draft",
    },
  });

  useEffect(() => {
    if (id) {
      fetchPackage();
    }
  }, [id]);

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
          
          included_items: data.included_items || "",
          excluded_items: data.excluded_items || "",
          equipment_list: data.equipment_list || "",
          
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
        
        included_items: values.included_items,
        excluded_items: values.excluded_items,
        equipment_list: values.equipment_list,
        
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
                          <SelectItem value="Lion Air">Lion Air</SelectItem>
                          <SelectItem value="Emirates">Emirates</SelectItem>
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
                          <SelectItem value="Direct">Direct</SelectItem>
                          <SelectItem value="Transit">Transit</SelectItem>
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
                      <FormControl>
                        <Input {...field} placeholder="Nama hotel di Madinah" />
                      </FormControl>
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
                      <FormControl>
                        <Input {...field} placeholder="Nama hotel di Makkah" />
                      </FormControl>
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
                      <FormControl>
                        <Input {...field} placeholder="Nama hotel di Madinah (Five Star)" />
                      </FormControl>
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
                      <FormControl>
                        <Input {...field} placeholder="Nama hotel di Makkah (Five Star)" />
                      </FormControl>
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
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="included_items"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Termasuk</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Tiket pesawat, Hotel, Visa, Makan 3x sehari..."
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="excluded_items"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tidak Termasuk</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Pengeluaran pribadi, Laundry..."
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="equipment_list"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perlengkapan yang Disediakan</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Koper, Tas ransel, Mukena..."
                        rows={4}
                      />
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

          <div className="flex justify-end gap-4">
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
        </form>
      </Form>
    </div>
  );
};

export default PackageForm;
