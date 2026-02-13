import { useState, useEffect, useCallback, useRef } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { ArrowLeft, X, Upload, Plus, CalendarIcon, Clipboard, Link as LinkIcon, FileUp } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { compressAndConvertToWebP, generateContextualFileName } from "@/lib/imageUtils";
import { AddHotelModal } from "@/components/admin/AddHotelModal";
import { FloatingPortal } from "@/components/admin/FloatingPortal";

const packageSchema = z.object({
  package_name: z.string().min(1, "Nama paket wajib diisi"),
  slug: z.string().optional(),
  departure_date: z.string().min(1, "Tanggal keberangkatan wajib diisi"),
  duration_days: z.number().min(1, "Durasi minimal 1 hari"),
  flight: z.string().min(1, "Maskapai wajib diisi"),
  flight_type: z.string().min(1, "Tipe penerbangan wajib diisi"),
  available_tiers: z.array(z.enum(["hemat", "nyaman", "five-star", "pelataran-hemat"])).length(1, "Pilih tepat satu tier"),
  
  // New fields
  timeframe: z.string().optional(),
  start_airport: z.string().optional(),
  route: z.string().optional(),
  itinerary: z.string().optional(),
  nights_makkah: z.number().min(0).optional(),
  nights_madinah: z.number().min(0).optional(),
  hotel_extra: z.string().optional(),
  selling_points: z.string().optional(),
  max_discount: z.number().min(0).optional(),
  slots_total: z.number().min(0).optional(),

  // Hemat Tier
  hemat_makkah_hotel_name: z.string().optional(),
  hemat_makkah_hotel_star: z.number().optional(),
  hemat_makkah_distance: z.string().optional(),
  hemat_makkah_duration_walk: z.string().optional(),
  hemat_madinah_hotel_name: z.string().optional(),
  hemat_madinah_hotel_star: z.number().optional(),
  hemat_madinah_distance: z.string().optional(),
  hemat_madinah_duration_walk: z.string().optional(),
  hemat_transport: z.string().optional(),
  hemat_price_quad: z.number().min(0, "Harga tidak valid"),
  hemat_price_triple: z.number().min(0, "Harga tidak valid"),
  hemat_price_double: z.number().min(0, "Harga tidak valid"),

  // Nyaman Tier
  makkah_hotel_name: z.string().optional(),
  makkah_hotel_star: z.number().optional(),
  makkah_distance: z.string().optional(),
  makkah_duration_walk: z.string().optional(),
  madinah_hotel_name: z.string().optional(),
  madinah_hotel_star: z.number().optional(),
  madinah_distance: z.string().optional(),
  madinah_duration_walk: z.string().optional(),
  best_seller_transport: z.string().optional(),
  price_quad: z.number().min(0, "Harga tidak valid"),
  price_triple: z.number().min(0, "Harga tidak valid"),
  price_double: z.number().min(0, "Harga tidak valid"),
  
  // Five-Star Tier
  five_star_makkah_hotel_name: z.string().optional(),
  five_star_makkah_hotel_star: z.number().optional(),
  five_star_makkah_distance: z.string().optional(),
  five_star_makkah_duration_walk: z.string().optional(),
  five_star_madinah_hotel_name: z.string().optional(),
  five_star_madinah_hotel_star: z.number().optional(),
  five_star_madinah_distance: z.string().optional(),
  five_star_madinah_duration_walk: z.string().optional(),
  five_star_transport: z.string().optional(),
  five_star_price_quad: z.number().min(0, "Harga tidak valid"),
  five_star_price_triple: z.number().min(0, "Harga tidak valid"),
  five_star_price_double: z.number().min(0, "Harga tidak valid"),

  // Pelataran Hemat Tier
  pelataran_makkah_hotel_name: z.string().optional(),
  pelataran_makkah_hotel_star: z.number().optional(),
  pelataran_makkah_distance: z.string().optional(),
  pelataran_makkah_duration_walk: z.string().optional(),
  pelataran_madinah_hotel_name: z.string().optional(),
  pelataran_madinah_hotel_star: z.number().optional(),
  pelataran_madinah_distance: z.string().optional(),
  pelataran_madinah_duration_walk: z.string().optional(),
  pelataran_transport: z.string().optional(),
  pelataran_price_quad: z.number().min(0, "Harga tidak valid"),
  pelataran_price_triple: z.number().min(0, "Harga tidak valid"),
  pelataran_price_double: z.number().min(0, "Harga tidak valid"),
  
  optional_items: z.array(z.string()).optional(),
  custom_optional_items: z.array(z.string()).optional(),
  
  catalog_link: z.string().optional(),
  itinerary_link: z.string().optional(),
  banner_link: z.string().optional(),
  status: z.string(),
  
  is_sold_out: z.boolean().default(false),
  waitlist_count: z.number().min(0).default(0),
});

type PackageFormValues = z.infer<typeof packageSchema>;

// Shake animation CSS class name
const SHAKE_CLASS = "animate-shake";

// Reusable image drop zone component
const ImageDropZone = ({
  label,
  description,
  multiple = false,
  maxFiles = 1,
  previews,
  onFiles,
  onRemove,
  disabled = false,
}: {
  label: string;
  description: string;
  multiple?: boolean;
  maxFiles?: number;
  previews: string[];
  onFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: File[]) => {
    const valid = files.filter(f => {
      if (!f.type.startsWith("image/")) { toast.error("Hanya file gambar"); return false; }
      if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name} melebihi 5MB`); return false; }
      return true;
    });
    if (valid.length > 0) onFiles(valid);
  }, [onFiles]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageFiles = items
      .filter(item => item.type.startsWith("image/"))
      .map(item => item.getAsFile())
      .filter(Boolean) as File[];
    if (imageFiles.length > 0) {
      e.preventDefault();
      handleFiles(imageFiles);
    }
  }, [handleFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [handleFiles]);

  return (
    <div className="space-y-3" onPaste={handlePaste}>
      <label className="text-sm font-medium flex items-center gap-2">
        <Upload className="w-4 h-4" />
        {label}
      </label>

      {previews.length > 0 && (
        <div className={cn("grid gap-4", multiple ? "grid-cols-3" : "flex justify-center")}>
          {previews.map((preview, index) => (
            <div key={index} className={cn("relative", !multiple && "w-48")}>
              <div className={cn("overflow-hidden rounded-lg border", multiple ? "aspect-square" : "aspect-[1080/1350]")}>
                <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
              </div>
              <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6" onClick={() => onRemove(index)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
          className="hidden"
          disabled={disabled}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-muted rounded-full">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Klik, drag & drop, atau paste dari clipboard</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clipboard className="w-3 h-3" />
            <span>{description}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PackageItemRecord {
  id: string;
  name: string;
  type: "include" | "exclude";
  is_essential: boolean;
  display_order: number;
}

const PackageForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [katalogFile, setKatalogFile] = useState<File | null>(null);
  const [katalogPreview, setKatalogPreview] = useState<string>("");
  const [katalogMode, setKatalogMode] = useState<"link" | "upload">("link");
  const [itineraryFile, setItineraryFile] = useState<File | null>(null);
  const [itineraryPreview, setItineraryPreview] = useState<string>("");
  const [itineraryMode, setItineraryMode] = useState<"link" | "upload">("link");
  const [flyerMode, setFlyerMode] = useState<"link" | "upload">("upload");
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [makkahHotels, setMakkahHotels] = useState<any[]>([]);
  const [madinahHotels, setMadinahHotels] = useState<any[]>([]);
  
  // DB-driven items
  const [dbStandardItems, setDbStandardItems] = useState<PackageItemRecord[]>([]);
  const [dbOptionalItems, setDbOptionalItems] = useState<PackageItemRecord[]>([]);
  const [dbExcludeItems, setDbExcludeItems] = useState<PackageItemRecord[]>([]);
  
  // Hotel modal states
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [hotelModalLocation, setHotelModalLocation] = useState<"makkah" | "madinah">("madinah");
  const [hotelModalTier, setHotelModalTier] = useState<"best_seller" | "five_star">("best_seller");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Default transport based on tier
  const getDefaultTransport = (tier: string) => {
    return tier === "five-star" ? "Kereta Cepat" : "Bus Eksklusif";
  };

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      package_name: "",
      departure_date: "",
      duration_days: 10,
      flight: "",
      flight_type: "Direct",
      available_tiers: ["nyaman"],
      timeframe: "",
      start_airport: "",
      route: "",
      itinerary: "",
      nights_makkah: 0,
      nights_madinah: 0,
      hotel_extra: "",
      selling_points: "",
      max_discount: 0,
      slots_total: 40,
      // Hemat
      hemat_price_quad: 0, hemat_price_triple: 0, hemat_price_double: 0,
      hemat_transport: "Bus Eksklusif",
      // Nyaman
      price_quad: 0, price_triple: 0, price_double: 0,
      best_seller_transport: "Bus Eksklusif",
      // Five Star
      five_star_price_quad: 0, five_star_price_triple: 0, five_star_price_double: 0,
      five_star_transport: "Kereta Cepat",
      // Pelataran Hemat
      pelataran_price_quad: 0, pelataran_price_triple: 0, pelataran_price_double: 0,
      pelataran_transport: "Bus Eksklusif",
      
      optional_items: [],
      custom_optional_items: [],
      banner_link: "",
      status: "draft",
      is_sold_out: false,
      waitlist_count: 0,
    },
  });

  useEffect(() => {
    fetchHotels();
    fetchPackageItems();
    if (id) {
      fetchPackage();
    }
  }, [id]);

  // Track unsaved changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchPackageItems = async () => {
    const { data, error } = await supabase
      .from("package_items")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (error) { console.error(error); return; }
    const items = (data || []) as PackageItemRecord[];
    setDbStandardItems(items.filter(i => i.type === "include" && i.is_essential));
    setDbOptionalItems(items.filter(i => i.type === "include" && !i.is_essential));
    setDbExcludeItems(items.filter(i => i.type === "exclude"));
  };

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

  // Generic hotel change handler for any tier
  const handleHotelChange = (hotelId: string, location: "makkah" | "madinah", prefix: string) => {
    const hotels = location === "makkah" ? makkahHotels : madinahHotels;
    const hotelNameField = `${prefix}_hotel_name` as any;
    const hotelStarField = `${prefix}_hotel_star` as any;
    const distField = `${prefix}_distance` as any;
    const walkField = `${prefix}_duration_walk` as any;

    if (hotelId === "none") {
      form.setValue(hotelNameField, "");
      form.setValue(hotelStarField, 0);
      form.setValue(distField, "");
      form.setValue(walkField, "");
      return;
    }
    const hotel = hotels.find((h) => h.id === hotelId);
    if (hotel) {
      form.setValue(hotelNameField, hotel.name);
      form.setValue(hotelStarField, hotel.star_rating);
      form.setValue(distField, hotel.distance);
      form.setValue(walkField, hotel.walking_duration);
    }
  };

  const handleAddHotelClick = (location: "makkah" | "madinah", tier: "best_seller" | "five_star") => {
    setHotelModalLocation(location);
    setHotelModalTier(tier);
    setHotelModalOpen(true);
  };

  const handleHotelAdded = (hotel: any) => {
    if (hotel.location === "makkah") {
      setMakkahHotels(prev => [...prev, hotel].sort((a, b) => a.name.localeCompare(b.name)));
    } else {
      setMadinahHotels(prev => [...prev, hotel].sort((a, b) => a.name.localeCompare(b.name)));
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
        if (data.banner_image) {
          setBannerPreview(data.banner_image);
          // If banner_image is a URL, check if it looks like an uploaded file or a drive link
          if (data.banner_image.startsWith('http') && !data.banner_image.includes('supabase')) {
            setFlyerMode("link");
          }
        }
        if (data.catalog_link) {
          if (data.catalog_link.startsWith('http') && !data.catalog_link.includes('supabase')) {
            setKatalogMode("link");
          } else {
            setKatalogMode("upload");
            setKatalogPreview(data.catalog_link);
          }
        }
        if ((data as any).itinerary_link) {
          if ((data as any).itinerary_link.startsWith('http') && !(data as any).itinerary_link.includes('supabase')) {
            setItineraryMode("link");
          } else {
            setItineraryMode("upload");
            setItineraryPreview((data as any).itinerary_link);
          }
        }
        if (data.gallery_images && Array.isArray(data.gallery_images)) setGalleryPreviews(data.gallery_images);

        const priceData = data.package_price as any;
        const fiveStarPriceData = data.five_star_package_price as any;
        const d = data as any;
        
        // Parse optional items from included_items string
        let optionalItems: string[] = [];
        let customOptional: string[] = [];
        if (typeof data.included_items === 'string') {
          const items = data.included_items.split(",").map((item: string) => item.trim()).filter(Boolean);
          optionalItems = items.filter((item: string) => {
            const isStandard = dbStandardItems.some(s => s.name === item);
            return !isStandard;
          });
        }

        form.reset({
          package_name: data.package_name,
          departure_date: data.departure_date,
          duration_days: data.duration_days,
          flight: data.flight,
          flight_type: data.flight_type,
          available_tiers: (data.available_tiers as any[]) || ["nyaman"],
          
          timeframe: d.timeframe || "",
          start_airport: d.start_airport || "",
          route: d.route || "",
          itinerary: d.itinerary || "",
          nights_makkah: d.nights_makkah || 0,
          nights_madinah: d.nights_madinah || 0,
          hotel_extra: d.hotel_extra || "",
          selling_points: d.selling_points || "",
          max_discount: d.max_discount || 0,
          slots_total: data.slots_total || 40,

          // Hemat
          hemat_makkah_hotel_name: d.hemat_makkah_hotel_name || "",
          hemat_makkah_hotel_star: d.hemat_makkah_hotel_star || 0,
          hemat_makkah_distance: d.hemat_makkah_distance || "",
          hemat_makkah_duration_walk: d.hemat_makkah_duration_walk || "",
          hemat_madinah_hotel_name: d.hemat_madinah_hotel_name || "",
          hemat_madinah_hotel_star: d.hemat_madinah_hotel_star || 0,
          hemat_madinah_distance: d.hemat_madinah_distance || "",
          hemat_madinah_duration_walk: d.hemat_madinah_duration_walk || "",
          hemat_transport: d.hemat_transport || "Bus Eksklusif",
          hemat_price_quad: (d.hemat_package_price as any)?.quad || 0,
          hemat_price_triple: (d.hemat_package_price as any)?.triple || 0,
          hemat_price_double: (d.hemat_package_price as any)?.double || 0,

          // Nyaman
          makkah_hotel_name: data.makkah_hotel_name || "",
          makkah_hotel_star: data.makkah_hotel_star || 0,
          makkah_distance: data.makkah_distance || "",
          makkah_duration_walk: data.makkah_duration_walk || "",
          madinah_hotel_name: data.madinah_hotel_name || "",
          madinah_hotel_star: data.madinah_hotel_star || 0,
          madinah_distance: data.madinah_distance || "",
          madinah_duration_walk: data.madinah_duration_walk || "",
          price_quad: priceData?.quad || 0,
          price_triple: priceData?.triple || 0,
          price_double: priceData?.double || 0,
          best_seller_transport: data.best_seller_transport || "Bus Eksklusif",
          
          // Five Star
          five_star_makkah_hotel_name: data.five_star_makkah_hotel_name || "",
          five_star_makkah_hotel_star: data.five_star_makkah_hotel_star || 0,
          five_star_makkah_distance: data.five_star_makkah_distance || "",
          five_star_makkah_duration_walk: data.five_star_makkah_duration_walk || "",
          five_star_madinah_hotel_name: data.five_star_madinah_hotel_name || "",
          five_star_madinah_hotel_star: data.five_star_madinah_hotel_star || 0,
          five_star_madinah_distance: data.five_star_madinah_distance || "",
          five_star_madinah_duration_walk: data.five_star_madinah_duration_walk || "",
          five_star_price_quad: fiveStarPriceData?.quad || 0,
          five_star_price_triple: fiveStarPriceData?.triple || 0,
          five_star_price_double: fiveStarPriceData?.double || 0,
          five_star_transport: data.five_star_transport || "Kereta Cepat",

          // Pelataran Hemat
          pelataran_makkah_hotel_name: d.pelataran_makkah_hotel_name || "",
          pelataran_makkah_hotel_star: d.pelataran_makkah_hotel_star || 0,
          pelataran_makkah_distance: d.pelataran_makkah_distance || "",
          pelataran_makkah_duration_walk: d.pelataran_makkah_duration_walk || "",
          pelataran_madinah_hotel_name: d.pelataran_madinah_hotel_name || "",
          pelataran_madinah_hotel_star: d.pelataran_madinah_hotel_star || 0,
          pelataran_madinah_distance: d.pelataran_madinah_distance || "",
          pelataran_madinah_duration_walk: d.pelataran_madinah_duration_walk || "",
          pelataran_transport: d.pelataran_transport || "Bus Eksklusif",
          pelataran_price_quad: (d.pelataran_package_price as any)?.quad || 0,
          pelataran_price_triple: (d.pelataran_package_price as any)?.triple || 0,
          pelataran_price_double: (d.pelataran_package_price as any)?.double || 0,
          
          optional_items: optionalItems,
          custom_optional_items: customOptional,
          
          catalog_link: data.catalog_link || "",
          itinerary_link: data.itinerary_link || "",
          banner_link: data.banner_image || "",
          status: data.status,
          is_sold_out: data.is_sold_out || false,
          waitlist_count: data.waitlist_count || 0,
        });
      }
    } catch (error: any) {
      toast.error("Gagal memuat data: " + error.message);
    } finally {
      setInitialLoading(false);
    }
  };

  // Image handlers
  const handleBannerFiles = useCallback((files: File[]) => {
    const file = files[0];
    setBannerFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setBannerPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const removeBanner = useCallback((index: number) => {
    setBannerFile(null);
    setBannerPreview("");
  }, []);

  const handleGalleryFiles = useCallback((files: File[]) => {
    if (files.length + galleryPreviews.length > 10) {
      toast.error("Maksimal 10 gambar untuk galeri");
      return;
    }
    setGalleryFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setGalleryPreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  }, [galleryPreviews.length]);

  const removeGalleryImage = useCallback((index: number) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadBannerImage = async (): Promise<string | null> => {
    if (!bannerFile) return bannerPreview || null;

    const compressedFile = await compressAndConvertToWebP(bannerFile, 80, 0.85);
    const packageName = form.getValues('package_name');
    const fileName = generateContextualFileName('package', { name: packageName }, 'banner');
    const filePath = `banners/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('package-images')
      .upload(filePath, compressedFile, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('package-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const uploadGalleryImages = async (): Promise<string[]> => {
    const existingUrls = galleryPreviews.filter(url => url.startsWith('http'));
    
    if (galleryFiles.length === 0) return existingUrls;

    const packageName = form.getValues('package_name');
    
    const uploadPromises = galleryFiles.map(async (file, index) => {
      const compressedFile = await compressAndConvertToWebP(file, 40, 0.8);
      const fileName = generateContextualFileName('package', { name: packageName, index: index + 1 }, 'gallery');
      const filePath = `galleries/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('package-images')
        .upload(filePath, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('package-images')
        .getPublicUrl(filePath);

      return publicUrl;
    });

    const newUrls = await Promise.all(uploadPromises);
    return [...existingUrls, ...newUrls];
  };

  const uploadDocumentFile = async (file: File, folder: string): Promise<string> => {
    const packageName = form.getValues('package_name');
    const ext = file.name.split('.').pop() || 'pdf';
    const safeName = packageName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const fileName = `${safeName}-${folder}-${Date.now()}.${ext}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('package-images')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('package-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Shake + scroll to first error
  const handleValidationError = () => {
    const errorEl = document.querySelector('[data-field-error="true"]') || document.querySelector('.text-destructive');
    if (errorEl) {
      errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const card = errorEl.closest('[data-form-section]');
      if (card) {
        card.classList.add(SHAKE_CLASS);
        setTimeout(() => card.classList.remove(SHAKE_CLASS), 600);
      }
    }
    toast.error("Mohon lengkapi semua field yang wajib diisi");
  };

  const onSubmit = async (values: PackageFormValues) => {
    setLoading(true);
    setUploadingImages(true);
    try {
      // Upload flyer (banner)
      let bannerUrl: string | null;
      if (flyerMode === "link") {
        bannerUrl = values.banner_link || bannerPreview || null;
      } else {
        bannerUrl = await uploadBannerImage();
      }

      // Upload katalog
      let catalogUrl = values.catalog_link || '';
      if (katalogMode === "upload" && katalogFile) {
        catalogUrl = await uploadDocumentFile(katalogFile, 'katalog');
      } else if (katalogMode === "upload" && katalogPreview) {
        catalogUrl = katalogPreview;
      }

      // Upload itinerary
      let itineraryUrl = values.itinerary_link || '';
      if (itineraryMode === "upload" && itineraryFile) {
        itineraryUrl = await uploadDocumentFile(itineraryFile, 'itinerary');
      } else if (itineraryMode === "upload" && itineraryPreview) {
        itineraryUrl = itineraryPreview;
      }

      const galleryUrls = await uploadGalleryImages();
      
      setUploadingImages(false);

      const generateSlug = (name: string): string => {
        return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
      };

      let slug = values.slug;
      if (values.status === 'published' && !slug) {
        const baseSlug = generateSlug(values.package_name);
        const departureDate = new Date(values.departure_date);
        const formattedDate = format(departureDate, 'dd-MMM-yyyy').toLowerCase();
        const slugWithDate = `${baseSlug}-${formattedDate}`;
        
        const { data: existingPackages } = await supabase
          .from("packages")
          .select("slug")
          .eq("slug", slugWithDate);
        
        if (existingPackages && existingPackages.length > 0) {
          let counter = 2;
          let uniqueSlug = `${slugWithDate}-${counter}`;
          let exists = true;
          while (exists) {
            const { data } = await supabase.from("packages").select("slug").eq("slug", uniqueSlug);
            if (!data || data.length === 0) { exists = false; slug = uniqueSlug; }
            else { counter++; uniqueSlug = `${slugWithDate}-${counter}`; }
          }
        } else {
          slug = slugWithDate;
        }
      }

      // Combine all included items from DB
      const allIncluded = [
        ...dbStandardItems.map(i => i.name),
        ...(values.optional_items || []),
        ...(values.custom_optional_items || []),
      ];

      // All excluded items from DB
      const allExcluded = dbExcludeItems.map(i => i.name);

      const packageData: any = {
        package_name: values.package_name,
        slug: slug,
        departure_date: values.departure_date,
        duration_days: values.duration_days,
        flight: values.flight,
        flight_type: values.flight_type,
        available_tiers: values.available_tiers,
        
        timeframe: values.timeframe || null,
        start_airport: values.start_airport || null,
        route: values.route || null,
        itinerary: values.itinerary || null,
        nights_makkah: values.nights_makkah || null,
        nights_madinah: values.nights_madinah || null,
        hotel_extra: values.hotel_extra || null,
        selling_points: values.selling_points || null,
        max_discount: values.max_discount || 0,
        slots_total: values.slots_total || null,

        // Hemat
        hemat_makkah_hotel_name: values.hemat_makkah_hotel_name,
        hemat_makkah_hotel_star: values.hemat_makkah_hotel_star,
        hemat_makkah_distance: values.hemat_makkah_distance,
        hemat_makkah_duration_walk: values.hemat_makkah_duration_walk,
        hemat_madinah_hotel_name: values.hemat_madinah_hotel_name,
        hemat_madinah_hotel_star: values.hemat_madinah_hotel_star,
        hemat_madinah_distance: values.hemat_madinah_distance,
        hemat_madinah_duration_walk: values.hemat_madinah_duration_walk,
        hemat_transport: values.hemat_transport,
        hemat_package_price: { quad: values.hemat_price_quad, triple: values.hemat_price_triple, double: values.hemat_price_double },

        // Nyaman
        makkah_hotel_name: values.makkah_hotel_name,
        makkah_hotel_star: values.makkah_hotel_star,
        makkah_distance: values.makkah_distance,
        makkah_duration_walk: values.makkah_duration_walk,
        madinah_hotel_name: values.madinah_hotel_name,
        madinah_hotel_star: values.madinah_hotel_star,
        madinah_distance: values.madinah_distance,
        madinah_duration_walk: values.madinah_duration_walk,
        package_price: { quad: values.price_quad, triple: values.price_triple, double: values.price_double },
        best_seller_transport: values.best_seller_transport,
        
        // Five Star
        five_star_makkah_hotel_name: values.five_star_makkah_hotel_name,
        five_star_makkah_hotel_star: values.five_star_makkah_hotel_star,
        five_star_makkah_distance: values.five_star_makkah_distance,
        five_star_makkah_duration_walk: values.five_star_makkah_duration_walk,
        five_star_madinah_hotel_name: values.five_star_madinah_hotel_name,
        five_star_madinah_hotel_star: values.five_star_madinah_hotel_star,
        five_star_madinah_distance: values.five_star_madinah_distance,
        five_star_madinah_duration_walk: values.five_star_madinah_duration_walk,
        five_star_package_price: { quad: values.five_star_price_quad, triple: values.five_star_price_triple, double: values.five_star_price_double },
        five_star_transport: values.five_star_transport,

        // Pelataran Hemat
        pelataran_makkah_hotel_name: values.pelataran_makkah_hotel_name,
        pelataran_makkah_hotel_star: values.pelataran_makkah_hotel_star,
        pelataran_makkah_distance: values.pelataran_makkah_distance,
        pelataran_makkah_duration_walk: values.pelataran_makkah_duration_walk,
        pelataran_madinah_hotel_name: values.pelataran_madinah_hotel_name,
        pelataran_madinah_hotel_star: values.pelataran_madinah_hotel_star,
        pelataran_madinah_distance: values.pelataran_madinah_distance,
        pelataran_madinah_duration_walk: values.pelataran_madinah_duration_walk,
        pelataran_transport: values.pelataran_transport,
        pelataran_package_price: { quad: values.pelataran_price_quad, triple: values.pelataran_price_triple, double: values.pelataran_price_double },
        
        banner_image: bannerUrl,
        gallery_images: galleryUrls,
        
        included_items: allIncluded.join(", "),
        excluded_items: allExcluded.join(", "),
        equipment_list: "Perlengkapan Lengkap",
        
        catalog_link: catalogUrl,
        itinerary_link: itineraryUrl,
        status: values.status,
        is_sold_out: values.is_sold_out,
        waitlist_count: values.waitlist_count,
      };

      if (id) {
        const { error } = await supabase.from("packages").update(packageData).eq("id", id);
        if (error) throw error;
        toast.success("Paket berhasil diupdate");
      } else {
        const { error } = await supabase.from("packages").insert(packageData);
        if (error) throw error;
        toast.success("Paket berhasil dibuat");
      }

      setHasUnsavedChanges(false);
      navigate("/admin/packages");
    } catch (error: any) {
      toast.error("Gagal menyimpan paket: " + error.message);
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  // Safe navigation with unsaved changes warning
  const safeNavigate = (path: string) => {
    if (hasUnsavedChanges) {
      toast.error("Ada perubahan yang belum disimpan! Simpan terlebih dahulu.");
      const saveBtn = document.querySelector('[data-save-btn]');
      if (saveBtn) {
        saveBtn.classList.add('animate-shake');
        setTimeout(() => saveBtn.classList.remove('animate-shake'), 600);
      }
      return;
    }
    navigate(path);
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const watchedTiers = form.watch("available_tiers") || [];
  const hasHemat = watchedTiers.includes("hemat");
  const hasNyaman = watchedTiers.includes("nyaman");
  const hasFiveStar = watchedTiers.includes("five-star");
  const hasPelataranHemat = watchedTiers.includes("pelataran-hemat");

  // Helper to render full tier section: Hotel Makkah → Hotel Madinah → Hotel Kota + → Transport → Price
  const renderTierSection = (
    tierLabel: string,
    makkahPrefix: string,
    madinahPrefix: string,
    pricePrefix: string,
    transportField: string,
  ) => {
    const makkahHotelField = `${makkahPrefix}_hotel_name` as any;
    const makkahStarField = `${makkahPrefix}_hotel_star` as any;
    const makkahDistField = `${makkahPrefix}_distance` as any;
    const makkahWalkField = `${makkahPrefix}_duration_walk` as any;
    const madinahHotelField = `${madinahPrefix}_hotel_name` as any;
    const madinahStarField = `${madinahPrefix}_hotel_star` as any;
    const madinahDistField = `${madinahPrefix}_distance` as any;
    const madinahWalkField = `${madinahPrefix}_duration_walk` as any;
    const priceQuad = `${pricePrefix}_quad` as any;
    const priceTriple = `${pricePrefix}_triple` as any;
    const priceDouble = `${pricePrefix}_double` as any;
    const transportFormField = transportField as any;

    return (
      <>
        {/* Tier Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">{tierLabel}</CardTitle>
          </CardHeader>
        </Card>

        {/* 1. Hotel Makkah */}
        <Card data-form-section>
          <CardHeader><CardTitle>Hotel Makkah - {tierLabel}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name={makkahHotelField} render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Hotel</FormLabel>
                  <div className="flex gap-2">
                    <Select onValueChange={(id) => handleHotelChange(id, "makkah", makkahPrefix)} value={makkahHotels.find((h) => h.name === field.value)?.id || "none"}>
                      <FormControl><SelectTrigger className="flex-1"><SelectValue placeholder="Pilih hotel Makkah" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">Belum dipilih</SelectItem>
                        {makkahHotels.map((hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id}>{hotel.name} ({hotel.star_rating}⭐)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={() => handleAddHotelClick("makkah", "best_seller")} title="Tambah Hotel Baru">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name={makkahStarField} render={({ field }) => (
                <FormItem>
                  <FormLabel>Bintang Hotel</FormLabel>
                  <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih bintang" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="3">3 Bintang</SelectItem>
                      <SelectItem value="4">4 Bintang</SelectItem>
                      <SelectItem value="5">5 Bintang</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name={makkahDistField} render={({ field }) => (
                <FormItem><FormLabel>Jarak ke Masjidil Haram</FormLabel><FormControl><Input {...field} placeholder="200 meter" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name={makkahWalkField} render={({ field }) => (
                <FormItem><FormLabel>Durasi Jalan Kaki</FormLabel><FormControl><Input {...field} placeholder="10 menit" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* 2. Hotel Madinah */}
        <Card data-form-section>
          <CardHeader><CardTitle>Hotel Madinah - {tierLabel}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name={madinahHotelField} render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Hotel</FormLabel>
                  <div className="flex gap-2">
                    <Select onValueChange={(id) => handleHotelChange(id, "madinah", madinahPrefix)} value={madinahHotels.find((h) => h.name === field.value)?.id || "none"}>
                      <FormControl><SelectTrigger className="flex-1"><SelectValue placeholder="Pilih hotel Madinah" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">Belum dipilih</SelectItem>
                        {madinahHotels.map((hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id}>{hotel.name} ({hotel.star_rating}⭐)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={() => handleAddHotelClick("madinah", "best_seller")} title="Tambah Hotel Baru">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name={madinahStarField} render={({ field }) => (
                <FormItem>
                  <FormLabel>Bintang Hotel</FormLabel>
                  <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih bintang" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="3">3 Bintang</SelectItem>
                      <SelectItem value="4">4 Bintang</SelectItem>
                      <SelectItem value="5">5 Bintang</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name={madinahDistField} render={({ field }) => (
                <FormItem><FormLabel>Jarak ke Masjid Nabawi</FormLabel><FormControl><Input {...field} placeholder="100 meter" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name={madinahWalkField} render={({ field }) => (
                <FormItem><FormLabel>Durasi Jalan Kaki</FormLabel><FormControl><Input {...field} placeholder="5 menit" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* 3. Hotel Kota + (below Madinah) */}
        <Card data-form-section>
          <CardHeader><CardTitle>Hotel Kota + - {tierLabel}</CardTitle></CardHeader>
          <CardContent>
            <FormField control={form.control} name="hotel_extra" render={({ field }) => (
              <FormItem><FormLabel>Hotel Kota Tambahan</FormLabel><FormControl><Input {...field} placeholder="Hotel transit / kota tambahan" /></FormControl><FormMessage /></FormItem>
            )} />
          </CardContent>
        </Card>

        {/* 4. Transportasi */}
        <Card data-form-section>
          <CardHeader><CardTitle>Transportasi - {tierLabel}</CardTitle></CardHeader>
          <CardContent>
            <FormField control={form.control} name={transportFormField} render={({ field }) => (
              <FormItem>
                <FormLabel>Transportasi Makkah-Madinah</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih transportasi" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Bus Eksklusif">Bus Eksklusif</SelectItem>
                    <SelectItem value="Kereta Cepat">Kereta Cepat</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* 5. Harga */}
        <Card data-form-section>
          <CardHeader><CardTitle>Harga - {tierLabel}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name={priceQuad} render={({ field }) => (
                <FormItem><FormLabel>Harga Quad (4 orang)</FormLabel><FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="25000000" />
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name={priceTriple} render={({ field }) => (
                <FormItem><FormLabel>Harga Triple (3 orang)</FormLabel><FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="27000000" />
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name={priceDouble} render={({ field }) => (
                <FormItem><FormLabel>Harga Double (2 orang)</FormLabel><FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="30000000" />
                </FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => safeNavigate("/admin/packages")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{id ? "Edit Paket" : "Tambah Paket"}</h1>
          <p className="text-muted-foreground">Lengkapi informasi paket umroh</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, handleValidationError)} className="space-y-6">
          {/* Package Info */}
          <Card data-form-section>
            <CardHeader>
              <CardTitle>Informasi Paket</CardTitle>
              <CardDescription>Detail dasar paket umroh</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="package_name" render={({ field }) => (
                <FormItem><FormLabel>Nama Paket *</FormLabel><FormControl><Input {...field} placeholder="Umroh 10 Hari Reguler" /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="timeframe" render={({ field }) => (
                  <FormItem><FormLabel>Timeframe</FormLabel><FormControl><Input {...field} placeholder="Bulan Juli" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="slots_total" render={({ field }) => (
                  <FormItem><FormLabel>Seat (Kuota)</FormLabel><FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="40" />
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pretty Calendar Date Picker - synced to selected date */}
                <FormField
                  control={form.control}
                  name="departure_date"
                  render={({ field }) => {
                    const selectedDate = field.value ? new Date(field.value) : undefined;
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Keberangkatan *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal h-10",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "dd MMMM yyyy", { locale: idLocale })
                                ) : (
                                  <span>Pilih tanggal</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              defaultMonth={selectedDate || new Date()}
                              onSelect={(date) => {
                                if (date) field.onChange(format(date, "yyyy-MM-dd"));
                              }}
                              disabled={(date) => date < new Date("2024-01-01")}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField control={form.control} name="duration_days" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Durasi (Hari) *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} className="h-10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="start_airport" render={({ field }) => (
                  <FormItem><FormLabel>Start (Bandara)</FormLabel><FormControl><Input {...field} placeholder="CGK" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="flight" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maskapai *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Pilih maskapai" /></SelectTrigger></FormControl>
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
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="flight_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Penerbangan *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="direct">Direct</SelectItem>
                        <SelectItem value="transit">Transit</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="route" render={({ field }) => (
                  <FormItem><FormLabel>Rute</FormLabel><FormControl><Input {...field} placeholder="JED-MED" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="itinerary" render={({ field }) => (
                <FormItem><FormLabel>Itinerary</FormLabel><FormControl><Input {...field} placeholder="Makkah - Madinah" /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="nights_makkah" render={({ field }) => (
                  <FormItem><FormLabel>Malam Makkah</FormLabel><FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="7" />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="nights_madinah" render={({ field }) => (
                  <FormItem><FormLabel>Malam Madinah</FormLabel><FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="3" />
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="selling_points" render={({ field }) => (
                <FormItem><FormLabel>Selling Points</FormLabel><FormControl>
                  <Textarea {...field} placeholder="Thaif + Romansiah, Fotografer" rows={2} />
                </FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="max_discount" render={({ field }) => (
                <FormItem><FormLabel>Maks Diskon (Rp)</FormLabel><FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="1000000" />
                </FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Tier Selection */}
          <Card data-form-section>
            <CardHeader>
              <CardTitle>Tier Paket</CardTitle>
              <CardDescription>Pilih satu tier untuk paket ini</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="available_tiers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tier Paket *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value?.[0] || ""}
                        onValueChange={(val) => field.onChange([val])}
                        className="space-y-3"
                      >
                        {[
                          { value: "hemat", label: "Hemat", desc: "Paket ekonomis dengan hotel bintang 3" },
                          { value: "nyaman", label: "Nyaman", desc: "Paket terlaris dengan hotel bintang 4" },
                          { value: "five-star", label: "Five Star", desc: "Paket premium hotel bintang 5" },
                          { value: "pelataran-hemat", label: "Pelataran Hemat", desc: "Paket hemat area pelataran" },
                        ].map((tier) => (
                          <div key={tier.value} className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                            <RadioGroupItem value={tier.value} id={`tier-${tier.value}`} />
                            <div className="flex-1">
                              <Label htmlFor={`tier-${tier.value}`} className="font-medium cursor-pointer">{tier.label}</Label>
                              <p className="text-xs text-muted-foreground">{tier.desc}</p>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Tier Sections */}
          {hasHemat && renderTierSection("Hemat", "hemat_makkah", "hemat_madinah", "hemat_price", "hemat_transport")}
          {hasNyaman && renderTierSection("Nyaman", "makkah", "madinah", "price", "best_seller_transport")}
          {hasFiveStar && renderTierSection("Five Star", "five_star_makkah", "five_star_madinah", "five_star_price", "five_star_transport")}
          {hasPelataranHemat && renderTierSection("Pelataran Hemat", "pelataran_makkah", "pelataran_madinah", "pelataran_price", "pelataran_transport")}

          {/* Flyer, Katalog & Itinerary - Side by side */}
          <Card>
            <CardHeader>
              <CardTitle>Flyer, Katalog & Itinerary</CardTitle>
              <CardDescription>Upload file atau masukkan link drive untuk masing-masing dokumen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Flyer */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold">Flyer</label>
                    <div className="flex gap-1 rounded-lg border p-0.5">
                      <button type="button" onClick={() => setFlyerMode("upload")} className={cn("px-2 py-1 text-xs rounded-md transition-colors", flyerMode === "upload" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                        <FileUp className="w-3 h-3 inline mr-1" />Upload
                      </button>
                      <button type="button" onClick={() => setFlyerMode("link")} className={cn("px-2 py-1 text-xs rounded-md transition-colors", flyerMode === "link" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                        <LinkIcon className="w-3 h-3 inline mr-1" />Link
                      </button>
                    </div>
                  </div>
                  {flyerMode === "upload" ? (
                    <ImageDropZone
                      label=""
                      description="1080x1350px, Maks 5MB"
                      previews={bannerPreview ? [bannerPreview] : []}
                      onFiles={handleBannerFiles}
                      onRemove={removeBanner}
                      disabled={loading}
                    />
                  ) : (
                    <FormField control={form.control} name="banner_link" render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} placeholder="https://drive.google.com/..." className="text-xs" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>

                {/* Katalog */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold">Katalog</label>
                    <div className="flex gap-1 rounded-lg border p-0.5">
                      <button type="button" onClick={() => setKatalogMode("upload")} className={cn("px-2 py-1 text-xs rounded-md transition-colors", katalogMode === "upload" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                        <FileUp className="w-3 h-3 inline mr-1" />Upload
                      </button>
                      <button type="button" onClick={() => setKatalogMode("link")} className={cn("px-2 py-1 text-xs rounded-md transition-colors", katalogMode === "link" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                        <LinkIcon className="w-3 h-3 inline mr-1" />Link
                      </button>
                    </div>
                  </div>
                  {katalogMode === "upload" ? (
                    <div className="space-y-2">
                      {katalogPreview && (
                        <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50">
                          <FileUp className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-xs truncate flex-1">{katalogPreview.split('/').pop() || 'Uploaded file'}</span>
                          <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setKatalogFile(null); setKatalogPreview(""); }}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      <div
                        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setKatalogFile(f); setKatalogPreview(f.name); } }}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp'; inp.onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) { setKatalogFile(f); setKatalogPreview(f.name); } }; inp.click(); }}
                        className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Drag & drop atau klik</p>
                      </div>
                    </div>
                  ) : (
                    <FormField control={form.control} name="catalog_link" render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} placeholder="https://drive.google.com/..." className="text-xs" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>

                {/* Itinerary */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold">Itinerary</label>
                    <div className="flex gap-1 rounded-lg border p-0.5">
                      <button type="button" onClick={() => setItineraryMode("upload")} className={cn("px-2 py-1 text-xs rounded-md transition-colors", itineraryMode === "upload" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                        <FileUp className="w-3 h-3 inline mr-1" />Upload
                      </button>
                      <button type="button" onClick={() => setItineraryMode("link")} className={cn("px-2 py-1 text-xs rounded-md transition-colors", itineraryMode === "link" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                        <LinkIcon className="w-3 h-3 inline mr-1" />Link
                      </button>
                    </div>
                  </div>
                  {itineraryMode === "upload" ? (
                    <div className="space-y-2">
                      {itineraryPreview && (
                        <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50">
                          <FileUp className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-xs truncate flex-1">{itineraryPreview.split('/').pop() || 'Uploaded file'}</span>
                          <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setItineraryFile(null); setItineraryPreview(""); }}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      <div
                        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setItineraryFile(f); setItineraryPreview(f.name); } }}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp'; inp.onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) { setItineraryFile(f); setItineraryPreview(f.name); } }; inp.click(); }}
                        className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Drag & drop atau klik</p>
                      </div>
                    </div>
                  ) : (
                    <FormField control={form.control} name="itinerary_link" render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} placeholder="https://drive.google.com/..." className="text-xs" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gallery Images */}
          <Card>
            <CardHeader>
              <CardTitle>Gallery Images</CardTitle>
              <CardDescription>Upload gambar galeri (maksimal 10 gambar)</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageDropZone
                label="Upload Gallery Images"
                description="Maks 10 gambar, 5MB each. Drag & drop atau Ctrl+V."
                multiple
                maxFiles={10}
                previews={galleryPreviews}
                onFiles={handleGalleryFiles}
                onRemove={removeGalleryImage}
                disabled={loading || galleryPreviews.length >= 10}
              />
            </CardContent>
          </Card>

          {/* Fasilitas */}
          <Card data-form-section>
            <CardHeader>
              <CardTitle>Fasilitas Paket</CardTitle>
              <CardDescription>Fasilitas dikelola di halaman <a href="/admin/package-items" className="text-primary underline" target="_blank">Fasilitas Paket</a></CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Standard Included Items - read-only from DB */}
              <div className="space-y-3">
                <FormLabel className="text-base font-semibold">Termasuk (Standard)</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/50">
                  {dbStandardItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="text-sm">✓ {item.name}</span>
                    </div>
                  ))}
                  {dbStandardItems.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-2">Belum ada item standard. Tambah di halaman Fasilitas Paket.</p>
                  )}
                </div>
              </div>

              {/* Optional Included Items - checkboxes + can add new */}
              <FormField
                control={form.control}
                name="optional_items"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-3">
                      <FormLabel className="text-base font-semibold">Termasuk (Opsional)</FormLabel>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-lg border">
                        {dbOptionalItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={field.value?.includes(item.name)}
                              onCheckedChange={(checked) => {
                                if (checked) field.onChange([...(field.value || []), item.name]);
                                else field.onChange(field.value?.filter((v) => v !== item.name));
                              }}
                            />
                            <span className="text-sm">{item.name}</span>
                          </div>
                        ))}
                        {/* Custom optional items */}
                        {(form.watch("custom_optional_items") || []).map((item, idx) => (
                          <div key={`custom-${idx}`} className="flex items-center gap-2 group">
                            <Checkbox
                              checked={field.value?.includes(item)}
                              onCheckedChange={(checked) => {
                                if (checked) field.onChange([...(field.value || []), item]);
                                else field.onChange(field.value?.filter((v) => v !== item));
                              }}
                            />
                            <span className="text-sm flex-1">{item}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                const customs = form.getValues("custom_optional_items") || [];
                                form.setValue("custom_optional_items", customs.filter((_, i) => i !== idx));
                                field.onChange(field.value?.filter((v) => v !== item));
                              }}
                            >
                              <X className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      {/* Add new optional item */}
                      <AddItemInput onAdd={(name) => {
                        const customs = form.getValues("custom_optional_items") || [];
                        form.setValue("custom_optional_items", [...customs, name]);
                      }} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Excluded Items - read-only from DB */}
              <div className="space-y-3">
                <FormLabel className="text-base font-semibold">Tidak Termasuk</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/50">
                  {dbExcludeItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <X className="w-4 h-4 text-destructive flex-shrink-0" />
                      <span className="text-sm">{item.name}</span>
                    </div>
                  ))}
                  {dbExcludeItems.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-2">Belum ada item. Tambah di halaman Fasilitas Paket.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card data-form-section>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status Paket</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Floating Action Buttons */}
          <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
            <Button
              type="submit"
              disabled={loading || uploadingImages}
              data-save-btn
              className="flex items-center gap-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-6"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
              </svg>
              <span className="font-medium">
                {uploadingImages ? "Uploading..." : loading ? "Menyimpan..." : "Simpan"}
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => safeNavigate("/admin/packages")}
              className="flex items-center gap-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-6 bg-background"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Batal</span>
            </Button>
          </div>
        </form>
      </Form>

      {/* Add Hotel Modal */}
      <AddHotelModal
        open={hotelModalOpen}
        onOpenChange={setHotelModalOpen}
        location={hotelModalLocation}
        onSuccess={handleHotelAdded}
      />
    </div>
  );
};

// Small helper component for adding new optional items
const AddItemInput = ({ onAdd }: { onAdd: (name: string) => void }) => {
  const [value, setValue] = useState("");
  const add = () => {
    const trimmed = value.trim();
    if (trimmed) { onAdd(trimmed); setValue(""); }
  };
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tambah item opsional baru..."
        className="flex-1"
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
      />
      <Button type="button" variant="outline" size="sm" onClick={add} disabled={!value.trim()}>
        <Plus className="w-4 h-4 mr-1" /> Tambah
      </Button>
    </div>
  );
};

export default PackageForm;