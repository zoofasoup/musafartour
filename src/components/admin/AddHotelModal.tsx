import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Upload, Clipboard, X, Loader2 } from "lucide-react";
import { compressAndConvertToWebP } from "@/lib/imageUtils";

const hotelSchema = z.object({
  name: z.string().min(1, "Nama hotel wajib diisi"),
  location: z.enum(["makkah", "madinah"]),
  star_rating: z.number().min(1).max(5),
  distance: z.string().min(1, "Jarak wajib diisi"),
  walking_duration: z.string().min(1, "Durasi jalan kaki wajib diisi"),
  google_maps_url: z.string().optional(),
});

type HotelFormValues = z.infer<typeof hotelSchema>;

interface AddHotelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: "makkah" | "madinah";
  onSuccess: (hotel: any) => void;
}

export const AddHotelModal = ({ open, onOpenChange, location, onSuccess }: AddHotelModalProps) => {
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<{
    exterior: File | null;
    lobby: File | null;
    room: File | null;
  }>({ exterior: null, lobby: null, room: null });
  const [photoPreviews, setPhotoPreviews] = useState<{
    exterior: string;
    lobby: string;
    room: string;
  }>({ exterior: "", lobby: "", room: "" });

  const form = useForm<HotelFormValues>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      name: "",
      location: location,
      star_rating: 4,
      distance: "",
      walking_duration: "",
      google_maps_url: "",
    },
  });

  // Reset form when location changes
  const resetForm = () => {
    form.reset({
      name: "",
      location: location,
      star_rating: 4,
      distance: "",
      walking_duration: "",
      google_maps_url: "",
    });
    setPhotos({ exterior: null, lobby: null, room: null });
    setPhotoPreviews({ exterior: "", lobby: "", room: "" });
  };

  const handlePhotoChange = (type: "exterior" | "lobby" | "room", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File terlalu besar. Maksimal 5MB");
        return;
      }
      setPhotos(prev => ({ ...prev, [type]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => ({ ...prev, [type]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasteFromClipboard = async (type: "exterior" | "lobby" | "room") => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(t => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `${type}-${Date.now()}.png`, { type: imageType });
          setPhotos(prev => ({ ...prev, [type]: file }));
          const reader = new FileReader();
          reader.onloadend = () => {
            setPhotoPreviews(prev => ({ ...prev, [type]: reader.result as string }));
          };
          reader.readAsDataURL(file);
          toast.success(`Foto ${type} berhasil ditempel`);
          return;
        }
      }
      toast.error("Tidak ada gambar di clipboard");
    } catch (error) {
      toast.error("Gagal membaca clipboard");
    }
  };

  const removePhoto = (type: "exterior" | "lobby" | "room") => {
    setPhotos(prev => ({ ...prev, [type]: null }));
    setPhotoPreviews(prev => ({ ...prev, [type]: "" }));
  };

  const uploadPhoto = async (file: File, hotelName: string, type: string): Promise<string | null> => {
    if (!file) return null;
    
    const compressedFile = await compressAndConvertToWebP(file, 80, 0.85);
    const fileName = `${hotelName.toLowerCase().replace(/\s+/g, '-')}-${type}-${Date.now()}.webp`;
    const filePath = `hotels/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('package-images')
      .upload(filePath, compressedFile, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('package-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const onSubmit = async (values: HotelFormValues) => {
    setLoading(true);
    try {
      // Upload photos
      const [exteriorUrl, lobbyUrl, roomUrl] = await Promise.all([
        photos.exterior ? uploadPhoto(photos.exterior, values.name, 'exterior') : null,
        photos.lobby ? uploadPhoto(photos.lobby, values.name, 'lobby') : null,
        photos.room ? uploadPhoto(photos.room, values.name, 'room') : null,
      ]);

      // Format distance and walking_duration
      let distance = values.distance;
      if (!distance.toLowerCase().includes('meter') && !distance.toLowerCase().includes('m')) {
        distance = `${distance} meter`;
      }

      let walkingDuration = values.walking_duration;
      if (!walkingDuration.toLowerCase().includes('menit') && !walkingDuration.toLowerCase().includes('min')) {
        walkingDuration = `${walkingDuration} menit`;
      }

      const { data, error } = await supabase
        .from("hotels")
        .insert({
          name: values.name,
          location: values.location,
          star_rating: values.star_rating,
          distance: distance,
          walking_duration: walkingDuration,
          google_maps_url: values.google_maps_url || null,
          exterior_photo: exteriorUrl,
          lobby_photo: lobbyUrl,
          room_photo: roomUrl,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Hotel berhasil ditambahkan");
      onSuccess(data);
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Gagal menambahkan hotel: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const locationLabel = location === "makkah" ? "Makkah" : "Madinah";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Hotel Baru</DialogTitle>
          <DialogDescription>
            Menambahkan hotel baru untuk {locationLabel}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Hotel *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nama hotel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="star_rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bintang *</FormLabel>
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
                        {[1, 2, 3, 4, 5].map((star) => (
                          <SelectItem key={star} value={star.toString()}>
                            {star} Bintang {"⭐".repeat(star)}
                          </SelectItem>
                        ))}
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
                name="distance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jarak ke {location === "makkah" ? "Masjidil Haram" : "Masjid Nabawi"} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Contoh: 100 atau 100 meter" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="walking_duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durasi Jalan Kaki *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Contoh: 5 atau 5 menit" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="google_maps_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link Google Maps</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://maps.google.com/..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo Uploads */}
            <div className="space-y-3">
              <FormLabel>Foto Hotel (Opsional)</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(["exterior", "lobby", "room"] as const).map((type) => (
                  <div key={type} className="space-y-2">
                    <p className="text-sm text-muted-foreground capitalize">{type === "exterior" ? "Eksterior" : type === "lobby" ? "Lobby" : "Kamar"}</p>
                    {photoPreviews[type] ? (
                      <div className="relative aspect-video rounded-lg overflow-hidden border">
                        <img src={photoPreviews[type]} alt={type} className="w-full h-full object-cover" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removePhoto(type)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <label className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-center gap-1 h-16 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Upload</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoChange(type, e)}
                          />
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-16 w-12"
                          onClick={() => handlePasteFromClipboard(type)}
                        >
                          <Clipboard className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  onOpenChange(false);
                }}
                disabled={loading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Hotel"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
