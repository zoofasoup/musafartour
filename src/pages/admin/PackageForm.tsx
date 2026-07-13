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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ArrowLeft, X, Upload, Plus, CalendarIcon, Clipboard, Link as LinkIcon, FileUp, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { compressAndConvertToWebP, generateContextualFileName } from "@/lib/imageUtils";
import { AddHotelModal } from "@/components/admin/AddHotelModal";

const SearchableHotelSelect = ({ 
  hotels, 
  value, 
  onValueChange, 
  placeholder 
}: { 
  hotels: any[], 
  value: string, 
  onValueChange: (id: string) => void, 
  placeholder: string 
}) => {
  const [open, setOpen] = useState(false);
  const selectedHotel = hotels.find((h) => h.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("flex-1 min-w-0 justify-between text-left font-normal", !selectedHotel && "text-muted-foreground")}
          >
            <span className="truncate pr-2">
              {selectedHotel ? `${selectedHotel.name} (${selectedHotel.star_rating}⭐)` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari hotel..." />
          <CommandList>
            <CommandEmpty>Hotel tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Belum dipilih"
                onSelect={() => {
                  onValueChange("none");
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !selectedHotel ? "opacity-100" : "opacity-0")} />
                Belum dipilih
              </CommandItem>
              {hotels.map((hotel) => (
                <CommandItem
                  key={hotel.id}
                  value={hotel.name}
                  onSelect={() => {
                    onValueChange(hotel.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", selectedHotel?.id === hotel.id ? "opacity-100" : "opacity-0")} />
                  {hotel.name} ({hotel.star_rating}⭐)
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const extractNumber = (val: any) => (val ? val.toString().replace(/[^0-9]/g, '') : "");

const packageSchema = z.object({
  package_name: z.string().min(1, "Nama paket wajib diisi"),
  slug: z.string().optional(),
  departure_date: z.string().min(1, "Tanggal keberangkatan wajib diisi"),
  duration_days: z.number().min(1, "Durasi minimal 1 hari"),
  flight: z.string().min(1, "Maskapai wajib diisi"),
  flight_type: z.string().min(1, "Tipe penerbangan wajib diisi"),
  available_tiers: z.array(z.enum(["hemat", "nyaman", "five-star", "pelataran-hemat"])).length(1, "Pilih tepat satu tier"),
  
  timeframe: z.string().min(1, "Wajib diisi"),
  start_airport: z.string().min(1, "Wajib diisi"),
  route: z.string().min(1, "Wajib diisi"),
  itinerary: z.string().min(1, "Wajib diisi"),
  nights_makkah: z.number().min(1, "Minimal 1 malam"),
  nights_madinah: z.number().min(1, "Minimal 1 malam"),
  nights_extra: z.number().min(0).optional(),
  hotel_extra: z.string().optional(),
  selling_points: z.string().optional(),
  max_discount: z.number().min(0, "Wajib diisi"),
  slots_total: z.number().min(1, "Wajib diisi"),

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
}).superRefine((data, ctx) => {
  const tiers = data.available_tiers || [];
  
  if (tiers.includes("hemat")) {
    if (!data.hemat_makkah_hotel_name) ctx.addIssue({ path: ["hemat_makkah_hotel_name"], message: "Wajib diisi", code: "custom" });
    if (!data.hemat_madinah_hotel_name) ctx.addIssue({ path: ["hemat_madinah_hotel_name"], message: "Wajib diisi", code: "custom" });
  }
  if (tiers.includes("nyaman")) {
    if (!data.makkah_hotel_name) ctx.addIssue({ path: ["makkah_hotel_name"], message: "Wajib diisi", code: "custom" });
    if (!data.madinah_hotel_name) ctx.addIssue({ path: ["madinah_hotel_name"], message: "Wajib diisi", code: "custom" });
  }
  if (tiers.includes("five-star")) {
    if (!data.five_star_makkah_hotel_name) ctx.addIssue({ path: ["five_star_makkah_hotel_name"], message: "Wajib diisi", code: "custom" });
    if (!data.five_star_madinah_hotel_name) ctx.addIssue({ path: ["five_star_madinah_hotel_name"], message: "Wajib diisi", code: "custom" });
  }
  if (tiers.includes("pelataran-hemat")) {
    if (!data.pelataran_makkah_hotel_name) ctx.addIssue({ path: ["pelataran_makkah_hotel_name"], message: "Wajib diisi", code: "custom" });
    if (!data.pelataran_madinah_hotel_name) ctx.addIssue({ path: ["pelataran_madinah_hotel_name"], message: "Wajib diisi", code: "custom" });
  }
});

type PackageFormValues = z.infer<typeof packageSchema>;

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

  // If single image and preview exists, show full preview with X button only
  const hasSinglePreview = !multiple && previews.length > 0;

  return (
    <div className="space-y-2" onPaste={handlePaste}>
      {hasSinglePreview ? (
        <div className="relative w-full">
          <div className="overflow-hidden rounded-lg border aspect-[4/5]">
            <img src={previews[0]} alt="Preview" className="w-full h-full object-cover" />
          </div>
          <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 w-7 h-7 shadow-md" onClick={() => onRemove(0)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <>
          {multiple && previews.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative">
                  <div className="overflow-hidden rounded-lg border aspect-square">
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
              "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
              disabled && "opacity-50 cursor-not-allowed",
              !multiple && "aspect-[4/5] flex items-center justify-center"
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
            <div className="flex flex-col items-center gap-1.5">
              <div className="p-2 bg-muted rounded-full">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs font-medium">Klik atau drag & drop</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Reusable document drop zone
const DocDropZone = ({
  preview,
  onFile,
  onRemove,
}: {
  preview: string;
  onFile: (f: File) => void;
  onRemove: () => void;
}) => {
  const isImageUrl = preview && (preview.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(preview));

  if (preview) {
    return (
      <div className="relative w-full">
        {isImageUrl ? (
          <div className="overflow-hidden rounded-lg border aspect-[4/5]">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 aspect-[4/5] justify-center flex-col p-4">
            <FileUp className="w-8 h-8 text-primary" />
            <span className="text-xs truncate max-w-full px-2 text-center">{preview.split('/').pop() || 'Uploaded file'}</span>
          </div>
        )}
        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 w-7 h-7 shadow-md" onClick={onRemove}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp';
        inp.onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) onFile(f); };
        inp.click();
      }}
      className="border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-primary/50 transition-colors aspect-[4/5] flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-1.5">
        <div className="p-2 bg-muted rounded-full">
          <Upload className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-xs font-medium">Klik atau drag & drop</p>
        <p className="text-xs text-muted-foreground">PDF, DOC, atau gambar</p>
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
  const [itineraryFile, setItineraryFile] = useState<File | null>(null);
  const [itineraryPreview, setItineraryPreview] = useState<string>("");
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [makkahHotels, setMakkahHotels] = useState<any[]>([]);
  const [madinahHotels, setMadinahHotels] = useState<any[]>([]);
  
  const [dbStandardItems, setDbStandardItems] = useState<PackageItemRecord[]>([]);
  const [dbOptionalItems, setDbOptionalItems] = useState<PackageItemRecord[]>([]);
  const [dbExcludeItems, setDbExcludeItems] = useState<PackageItemRecord[]>([]);
  
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [hotelModalLocation, setHotelModalLocation] = useState<"makkah" | "madinah">("madinah");
  const [hotelModalTier, setHotelModalTier] = useState<"best_seller" | "five_star">("best_seller");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
      nights_extra: 0,
      hotel_extra: "",
      selling_points: "",
      max_discount: 0,
      slots_total: 40,
      hemat_price_quad: 0, hemat_price_triple: 0, hemat_price_double: 0,
      hemat_transport: "Bus Eksklusif",
      price_quad: 0, price_triple: 0, price_double: 0,
      best_seller_transport: "Bus Eksklusif",
      five_star_price_quad: 0, five_star_price_triple: 0, five_star_price_double: 0,
      five_star_transport: "Kereta Cepat",
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

  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

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
      const { data, error } = await supabase.from("hotels").select("*").order("name", { ascending: true });
      if (error) throw error;
      setMakkahHotels(data?.filter((h: any) => h.location === "makkah") || []);
      setMadinahHotels(data?.filter((h: any) => h.location === "madinah") || []);
    } catch (error) {
      console.error("Error fetching hotels:", error);
      toast.error("Gagal memuat data hotel");
    }
  };

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
      form.setValue(distField, extractNumber(hotel.distance));
      form.setValue(walkField, extractNumber(hotel.walking_duration));
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
      const { data, error } = await supabase.from("packages").select("*").eq("id", id).single();
      if (error) throw error;

      if (data) {
        if (data.banner_image) setBannerPreview(data.banner_image);
        if (data.catalog_link) setKatalogPreview(data.catalog_link);
        if ((data as any).itinerary_link) setItineraryPreview((data as any).itinerary_link);
        if (data.gallery_images && Array.isArray(data.gallery_images)) setGalleryPreviews(data.gallery_images);

        const priceData = data.package_price as any;
        const fiveStarPriceData = data.five_star_package_price as any;
        const d = data as any;
        
        let optionalItems: string[] = [];
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
          nights_extra: d.nights_extra || 0,
          hotel_extra: d.hotel_extra || "",
          selling_points: d.selling_points || "",
          max_discount: d.max_discount || 0,
          slots_total: data.slots_total || 40,

          hemat_makkah_hotel_name: d.hemat_makkah_hotel_name || "",
          hemat_makkah_hotel_star: d.hemat_makkah_hotel_star || 0,
          hemat_makkah_distance: extractNumber(d.hemat_makkah_distance),
          hemat_makkah_duration_walk: extractNumber(d.hemat_makkah_duration_walk),
          hemat_madinah_hotel_name: d.hemat_madinah_hotel_name || "",
          hemat_madinah_hotel_star: d.hemat_madinah_hotel_star || 0,
          hemat_madinah_distance: extractNumber(d.hemat_madinah_distance),
          hemat_madinah_duration_walk: extractNumber(d.hemat_madinah_duration_walk),
          hemat_transport: d.hemat_transport || "Bus Eksklusif",
          hemat_price_quad: (d.hemat_package_price as any)?.quad || 0,
          hemat_price_triple: (d.hemat_package_price as any)?.triple || 0,
          hemat_price_double: (d.hemat_package_price as any)?.double || 0,

          makkah_hotel_name: data.makkah_hotel_name || "",
          makkah_hotel_star: data.makkah_hotel_star || 0,
          makkah_distance: extractNumber(data.makkah_distance),
          makkah_duration_walk: extractNumber(data.makkah_duration_walk),
          madinah_hotel_name: data.madinah_hotel_name || "",
          madinah_hotel_star: data.madinah_hotel_star || 0,
          madinah_distance: extractNumber(data.madinah_distance),
          madinah_duration_walk: extractNumber(data.madinah_duration_walk),
          price_quad: priceData?.quad || 0,
          price_triple: priceData?.triple || 0,
          price_double: priceData?.double || 0,
          best_seller_transport: data.best_seller_transport || "Bus Eksklusif",
          
          five_star_makkah_hotel_name: data.five_star_makkah_hotel_name || "",
          five_star_makkah_hotel_star: data.five_star_makkah_hotel_star || 0,
          five_star_makkah_distance: extractNumber(data.five_star_makkah_distance),
          five_star_makkah_duration_walk: extractNumber(data.five_star_makkah_duration_walk),
          five_star_madinah_hotel_name: data.five_star_madinah_hotel_name || "",
          five_star_madinah_hotel_star: data.five_star_madinah_hotel_star || 0,
          five_star_madinah_distance: extractNumber(data.five_star_madinah_distance),
          five_star_madinah_duration_walk: extractNumber(data.five_star_madinah_duration_walk),
          five_star_price_quad: fiveStarPriceData?.quad || 0,
          five_star_price_triple: fiveStarPriceData?.triple || 0,
          five_star_price_double: fiveStarPriceData?.double || 0,
          five_star_transport: data.five_star_transport || "Kereta Cepat",

          pelataran_makkah_hotel_name: d.pelataran_makkah_hotel_name || "",
          pelataran_makkah_hotel_star: d.pelataran_makkah_hotel_star || 0,
          pelataran_makkah_distance: extractNumber(d.pelataran_makkah_distance),
          pelataran_makkah_duration_walk: extractNumber(d.pelataran_makkah_duration_walk),
          pelataran_madinah_hotel_name: d.pelataran_madinah_hotel_name || "",
          pelataran_madinah_hotel_star: d.pelataran_madinah_hotel_star || 0,
          pelataran_madinah_distance: extractNumber(d.pelataran_madinah_distance),
          pelataran_madinah_duration_walk: extractNumber(d.pelataran_madinah_duration_walk),
          pelataran_transport: d.pelataran_transport || "Bus Eksklusif",
          pelataran_price_quad: (d.pelataran_package_price as any)?.quad || 0,
          pelataran_price_triple: (d.pelataran_package_price as any)?.triple || 0,
          pelataran_price_double: (d.pelataran_package_price as any)?.double || 0,
          
          optional_items: optionalItems,
          custom_optional_items: [],
          
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

  const removeBanner = useCallback(() => {
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
    const { error: uploadError } = await supabase.storage.from('package-images').upload(filePath, compressedFile, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('package-images').getPublicUrl(filePath);
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
      const { error: uploadError } = await supabase.storage.from('package-images').upload(filePath, compressedFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('package-images').getPublicUrl(filePath);
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
    const { error: uploadError } = await supabase.storage.from('package-images').upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('package-images').getPublicUrl(filePath);
    return publicUrl;
  };

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
      let bannerUrl: string | null;
      if (bannerFile) {
        bannerUrl = await uploadBannerImage();
      } else {
        bannerUrl = values.banner_link || bannerPreview || null;
      }

      let catalogUrl = '';
      if (katalogFile) {
        catalogUrl = await uploadDocumentFile(katalogFile, 'katalog');
      } else {
        catalogUrl = values.catalog_link || katalogPreview || '';
      }

      let itineraryUrl = '';
      if (itineraryFile) {
        itineraryUrl = await uploadDocumentFile(itineraryFile, 'itinerary');
      } else {
        itineraryUrl = values.itinerary_link || itineraryPreview || '';
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
        const { data: existingPackages } = await supabase.from("packages").select("slug").eq("slug", slugWithDate);
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

      const allIncluded = [
        ...dbStandardItems.map(i => i.name),
        ...(values.optional_items || []),
        ...(values.custom_optional_items || []),
      ];
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
        nights_extra: values.nights_extra || null,
        hotel_extra: values.hotel_extra || null,
        selling_points: values.selling_points || null,
        max_discount: values.max_discount || 0,
        slots_total: values.slots_total || null,

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

  const safeNavigate = (path: string) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm("Ada perubahan yang belum disimpan. Yakin ingin keluar?");
      if (!confirmed) return;
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

    const selectedMakkahHotel = form.watch(makkahHotelField);
    const selectedMadinahHotel = form.watch(madinahHotelField);

    return (
      <Card className="border-primary/30 shadow-sm overflow-hidden mb-8" data-form-section>
        <CardHeader className="bg-primary/5 pb-4 border-b">
          <CardTitle className="text-xl text-primary">Paket {tierLabel}</CardTitle>
          <CardDescription>Pengaturan spesifik untuk paket {tierLabel}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8 pt-6">
          {/* Akomodasi (Hotel) */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">🏨 Kategori Akomodasi</h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Hotel Makkah */}
              <div className="space-y-4 border p-4 rounded-xl bg-card/50">
                <h4 className="font-semibold text-primary/80 mb-2">Hotel Makkah</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name={makkahHotelField} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Hotel <span className="text-destructive">*</span></FormLabel>
                      <div className="flex gap-2">
                        <SearchableHotelSelect 
                          hotels={makkahHotels}
                          value={field.value}
                          onValueChange={(id) => handleHotelChange(id, "makkah", makkahPrefix)}
                          placeholder="Pilih hotel Makkah"
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => handleAddHotelClick("makkah", "best_seller")} title="Tambah Hotel Baru">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {selectedMakkahHotel && (
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
                  )}
                </div>
                {selectedMakkahHotel && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name={makkahDistField} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jarak ke Masjidil Haram</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input {...field} type="number" className="pr-16" placeholder="200" onChange={(e) => field.onChange(e.target.value)} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">meter</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={makkahWalkField} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durasi Jalan Kaki</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input {...field} type="number" className="pr-16" placeholder="10" onChange={(e) => field.onChange(e.target.value)} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">menit</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}
              </div>

              {/* Hotel Madinah */}
              <div className="space-y-4 border p-4 rounded-xl bg-card/50">
                <h4 className="font-semibold text-primary/80 mb-2">Hotel Madinah</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name={madinahHotelField} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Hotel <span className="text-destructive">*</span></FormLabel>
                      <div className="flex gap-2">
                        <SearchableHotelSelect 
                          hotels={madinahHotels}
                          value={field.value}
                          onValueChange={(id) => handleHotelChange(id, "madinah", madinahPrefix)}
                          placeholder="Pilih hotel Madinah"
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => handleAddHotelClick("madinah", "best_seller")} title="Tambah Hotel Baru">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {selectedMadinahHotel && (
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
                  )}
                </div>
                {selectedMadinahHotel && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name={madinahDistField} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jarak ke Masjid Nabawi</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input {...field} type="number" className="pr-16" placeholder="100" onChange={(e) => field.onChange(e.target.value)} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">meter</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={madinahWalkField} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durasi Jalan Kaki</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input {...field} type="number" className="pr-16" placeholder="5" onChange={(e) => field.onChange(e.target.value)} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">menit</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}
              </div>
            </div>
            
            {/* Hotel Kota + */}
            <div className="border p-4 rounded-xl bg-card/50">
              <FormField control={form.control} name="hotel_extra" render={({ field }) => (
                <FormItem><FormLabel>Hotel Kota Tambahan (Opsional)</FormLabel><FormControl><Input {...field} placeholder="Hotel transit / kota tambahan" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>

          <Separator className="bg-primary/10" />

          {/* Transportasi */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">🚌 Kategori Perjalanan</h3>
            <div className="border p-4 rounded-xl bg-card/50 md:w-1/2">
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
            </div>
          </div>

          <Separator className="bg-primary/10" />

          {/* Harga */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">💰 Kategori Harga Jual</h3>
            <div className="border p-4 rounded-xl bg-card/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name={priceQuad} render={({ field }) => (
                  <FormItem><FormLabel>Harga Quad (4 orang) <span className="text-destructive">*</span></FormLabel><FormControl>
                    <Input 
                      type="text" 
                      value={field.value ? `Rp ${new Intl.NumberFormat('id-ID').format(field.value)}` : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        field.onChange(raw ? parseInt(raw, 10) : 0);
                      }} 
                      placeholder="Rp 25.000.000" 
                    />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name={priceTriple} render={({ field }) => (
                  <FormItem><FormLabel>Harga Triple (3 orang) <span className="text-destructive">*</span></FormLabel><FormControl>
                    <Input 
                      type="text" 
                      value={field.value ? `Rp ${new Intl.NumberFormat('id-ID').format(field.value)}` : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        field.onChange(raw ? parseInt(raw, 10) : 0);
                      }} 
                      placeholder="Rp 27.000.000" 
                    />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name={priceDouble} render={({ field }) => (
                  <FormItem><FormLabel>Harga Double (2 orang) <span className="text-destructive">*</span></FormLabel><FormControl>
                    <Input 
                      type="text" 
                      value={field.value ? `Rp ${new Intl.NumberFormat('id-ID').format(field.value)}` : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        field.onChange(raw ? parseInt(raw, 10) : 0);
                      }} 
                      placeholder="Rp 30.000.000" 
                    />
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, handleValidationError)} className="space-y-6 pb-8">
        {/* Sticky top action bar */}
        <div className="sticky top-0 z-40 -mx-8 -mt-8 px-8 py-3 bg-background/95 backdrop-blur border-b shadow-sm mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" type="button" onClick={() => safeNavigate("/admin/packages")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-sm">{id ? "Edit Paket" : "Tambah Paket"}</span>
            </div>
            <div className="flex items-center gap-3">
              <FormField control={form.control} name="status" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              )} />
              <Button type="button" variant="outline" size="sm" onClick={() => safeNavigate("/admin/packages")}>
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || uploadingImages}
                data-save-btn
                className="bg-primary"
              >
                {uploadingImages ? "Uploading..." : loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{id ? "Edit Paket" : "Tambah Paket"}</h1>
          <p className="text-muted-foreground">Lengkapi informasi paket umroh</p>
        </div>
          <Tabs defaultValue="umum" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="umum">Informasi Umum</TabsTrigger>
              <TabsTrigger value="harga">Harga & Akomodasi</TabsTrigger>
              <TabsTrigger value="media">Fasilitas & Media</TabsTrigger>
            </TabsList>
            
            <TabsContent value="umum" className="space-y-8 mt-6">
              {/* 1. Informasi Dasar */}
          <Card data-form-section>
            <CardHeader>
              <CardTitle>Informasi Dasar</CardTitle>
              <CardDescription>Identitas utama paket umroh</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="package_name" render={({ field }) => (
                <FormItem><FormLabel>Nama Paket *</FormLabel><FormControl><Input {...field} placeholder="Umroh Hemat 9 Hari" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="timeframe" render={({ field }) => (
                  <FormItem><FormLabel>Timeframe <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} placeholder="Bulan November" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="slots_total" render={({ field }) => (
                  <FormItem><FormLabel>Seat (Kuota) <span className="text-destructive">*</span></FormLabel><FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="40" />
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* 2. Jadwal & Penerbangan */}
          <Card data-form-section>
            <CardHeader>
              <CardTitle>Jadwal & Penerbangan</CardTitle>
              <CardDescription>Detail waktu dan rute penerbangan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              <Button variant="outline" className={cn("w-full pl-3 text-left font-normal h-10", !field.value && "text-muted-foreground")}>
                                {field.value ? format(new Date(field.value), "dd MMMM yyyy", { locale: idLocale }) : <span>Pilih tanggal</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={selectedDate} defaultMonth={selectedDate || new Date()} onSelect={(date) => { if (date) field.onChange(format(date, "yyyy-MM-dd")); }} disabled={(date) => date < new Date("2024-01-01")} initialFocus className="p-3 pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField control={form.control} name="duration_days" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Durasi (Hari) *</FormLabel><FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} className="h-10" placeholder="9" />
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="start_airport" render={({ field }) => (
                  <FormItem><FormLabel>Start (Bandara) <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} placeholder="CGK" /></FormControl><FormMessage /></FormItem>
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
                        <SelectItem value="Lion Air">Lion Air</SelectItem>
                        <SelectItem value="Emirates">Emirates</SelectItem>
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
                  <FormItem><FormLabel>Rute <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} placeholder="JED-MED" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="itinerary" render={({ field }) => (
                <FormItem><FormLabel>Itinerary <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} placeholder="Makkah - Madinah" /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          {/* 3. Durasi Menginap */}
          <Card data-form-section>
            <CardHeader>
              <CardTitle>Durasi Menginap</CardTitle>
              <CardDescription>Lama menetap di setiap kota</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="nights_makkah" render={({ field }) => (
                  <FormItem><FormLabel>Malam Makkah <span className="text-destructive">*</span></FormLabel><FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="4" />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="nights_madinah" render={({ field }) => (
                  <FormItem><FormLabel>Malam Madinah <span className="text-destructive">*</span></FormLabel><FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="3" />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="nights_extra" render={({ field }) => (
                  <FormItem><FormLabel>Malam Kota +</FormLabel><FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="1" />
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

            </TabsContent>

            <TabsContent value="harga" className="space-y-8 mt-6">

          {/* Tier Selection - clickable boxes */}
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
                    <FormControl>
                      <RadioGroup
                        value={field.value?.[0] || ""}
                        onValueChange={(val) => field.onChange([val])}
                        className="grid grid-cols-2 md:grid-cols-4 gap-3"
                      >
                        {[
                          { value: "hemat", label: "Hemat" },
                          { value: "nyaman", label: "Nyaman" },
                          { value: "five-star", label: "Five Star" },
                          { value: "pelataran-hemat", label: "Pelataran Hemat" },
                        ].map((tier) => (
                          <label
                            key={tier.value}
                            htmlFor={`tier-${tier.value}`}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors",
                              field.value?.[0] === tier.value
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                : "hover:bg-accent/50"
                            )}
                          >
                            <RadioGroupItem value={tier.value} id={`tier-${tier.value}`} />
                            <span className="font-medium text-sm">{tier.label}</span>
                          </label>
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

          {/* 4. Promosi & Penjualan */}
          <Card data-form-section>
            <CardHeader>
              <CardTitle>Promosi & Penjualan</CardTitle>
              <CardDescription>Fasilitas tambahan dan diskon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="selling_points" render={({ field }) => (
                <FormItem><FormLabel>Selling Points</FormLabel><FormControl>
                  <Textarea {...field} placeholder="Thaif + Romansiah, Fotografer, Quba Night" rows={2} />
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="max_discount" render={({ field }) => (
                <FormItem><FormLabel>Maks Diskon (Rp) <span className="text-destructive">*</span></FormLabel><FormControl>
                  <Input 
                    type="text" 
                    value={field.value ? `Rp ${new Intl.NumberFormat('id-ID').format(field.value)}` : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      field.onChange(raw ? parseInt(raw, 10) : 0);
                    }} 
                    placeholder="Rp 1.000.000" 
                  />
                </FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

            </TabsContent>

            <TabsContent value="media" className="space-y-8 mt-6">
              {/* Flyer, Katalog & Itinerary - Uniform layout */}
              <Card>
            <CardHeader>
              <CardTitle>Flyer, Katalog & Itinerary</CardTitle>
              <CardDescription>Upload file dan/atau masukkan link drive</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Flyer */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Flyer</p>
                  <ImageDropZone
                    label=""
                    description="Gambar flyer, maks 5MB"
                    previews={bannerPreview ? [bannerPreview] : []}
                    onFiles={handleBannerFiles}
                    onRemove={removeBanner}
                    disabled={loading}
                  />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Link Drive</p>
                    <FormField control={form.control} name="banner_link" render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} placeholder="https://drive.google.com/..." className="text-xs h-8" /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Katalog */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Katalog</p>
                  <DocDropZone
                    preview={katalogPreview}
                    onFile={(f) => { setKatalogFile(f); setKatalogPreview(f.name); }}
                    onRemove={() => { setKatalogFile(null); setKatalogPreview(""); }}
                  />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Link Drive</p>
                    <FormField control={form.control} name="catalog_link" render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} placeholder="https://drive.google.com/..." className="text-xs h-8" /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Itinerary */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Itinerary</p>
                  <DocDropZone
                    preview={itineraryPreview}
                    onFile={(f) => { setItineraryFile(f); setItineraryPreview(f.name); }}
                    onRemove={() => { setItineraryFile(null); setItineraryPreview(""); }}
                  />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Link Drive</p>
                    <FormField control={form.control} name="itinerary_link" render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} placeholder="https://drive.google.com/..." className="text-xs h-8" /></FormControl>
                      </FormItem>
                    )} />
                  </div>
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
                      <AddItemInput onAdd={(name) => {
                        const customs = form.getValues("custom_optional_items") || [];
                        form.setValue("custom_optional_items", [...customs, name]);
                      }} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </TabsContent>
          </Tabs>
        <AddHotelModal
          open={hotelModalOpen}
          onOpenChange={setHotelModalOpen}
          location={hotelModalLocation}
          onSuccess={handleHotelAdded}
        />
        </div>
      </form>
    </Form>
  );
};

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
