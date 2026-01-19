import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload, X, Image, Building2, DoorOpen, Bed } from "lucide-react";

const hotelSchema = z.object({
  name: z.string().min(1, "Nama hotel wajib diisi"),
  star_rating: z.number().min(1).max(5),
  location: z.enum(["makkah", "madinah"]),
  distance: z.string().min(1, "Jarak wajib diisi"),
  walking_duration: z.string().min(1, "Waktu tempuh wajib diisi"),
  exterior_photo: z.string().nullable().optional(),
  lobby_photo: z.string().nullable().optional(),
  room_photo: z.string().nullable().optional(),
});

type HotelFormData = z.infer<typeof hotelSchema>;

const HotelForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<HotelFormData>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      star_rating: 4,
      location: "makkah",
      exterior_photo: null,
      lobby_photo: null,
      room_photo: null,
    },
  });

  const starRating = watch("star_rating");
  const location = watch("location");
  const exteriorPhoto = watch("exterior_photo");
  const lobbyPhoto = watch("lobby_photo");
  const roomPhoto = watch("room_photo");

  useEffect(() => {
    if (id) {
      fetchHotel();
    }
  }, [id]);

  const fetchHotel = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("hotels")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setValue("name", data.name);
        setValue("star_rating", data.star_rating);
        setValue("location", data.location as "makkah" | "madinah");
        setValue("distance", data.distance);
        setValue("walking_duration", data.walking_duration);
        setValue("exterior_photo", data.exterior_photo);
        setValue("lobby_photo", data.lobby_photo);
        setValue("room_photo", data.room_photo);
      }
    } catch (error) {
      console.error("Error fetching hotel:", error);
      toast.error("Gagal memuat data hotel");
      navigate("/admin/hotels");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: "exterior_photo" | "lobby_photo" | "room_photo"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    try {
      setUploadingField(fieldName);

      const fileExt = file.name.split(".").pop();
      const fileName = `hotel-${fieldName}-${Date.now()}.${fileExt}`;
      const filePath = `hotels/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("package-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("package-images")
        .getPublicUrl(filePath);

      setValue(fieldName, publicUrl.publicUrl);
      toast.success("Foto berhasil diupload");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Gagal mengupload foto");
    } finally {
      setUploadingField(null);
    }
  };

  const removeImage = (fieldName: "exterior_photo" | "lobby_photo" | "room_photo") => {
    setValue(fieldName, null);
  };

  const onSubmit = async (data: HotelFormData) => {
    try {
      setSubmitting(true);

      // Add "meter" to distance if not already present
      const distance = data.distance.includes('m') 
        ? data.distance 
        : `${data.distance} m`;

      // Add "menit" to walking duration if not already present
      const walkingDuration = data.walking_duration.includes('menit') 
        ? data.walking_duration 
        : `${data.walking_duration} menit`;

      const hotelData = {
        name: data.name,
        star_rating: data.star_rating,
        location: data.location,
        distance: distance,
        walking_duration: walkingDuration,
        exterior_photo: data.exterior_photo || null,
        lobby_photo: data.lobby_photo || null,
        room_photo: data.room_photo || null,
      };

      if (id) {
        const { error } = await supabase
          .from("hotels")
          .update(hotelData)
          .eq("id", id);

        if (error) throw error;
        toast.success("Hotel berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("hotels")
          .insert([hotelData]);

        if (error) throw error;
        toast.success("Hotel berhasil ditambahkan");
      }

      navigate("/admin/hotels");
    } catch (error) {
      console.error("Error saving hotel:", error);
      toast.error("Gagal menyimpan hotel");
    } finally {
      setSubmitting(false);
    }
  };

  const PhotoUploadCard = ({
    fieldName,
    label,
    icon: Icon,
    value,
  }: {
    fieldName: "exterior_photo" | "lobby_photo" | "room_photo";
    label: string;
    icon: React.ElementType;
    value: string | null | undefined;
  }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </Label>
      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt={label}
            className="w-full h-40 object-cover rounded-lg border"
          />
          <button
            type="button"
            onClick={() => removeImage(fieldName)}
            className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {uploadingField === fieldName ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            ) : (
              <>
                <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Klik untuk upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG (max 5MB)
                </p>
              </>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, fieldName)}
            disabled={uploadingField !== null}
          />
        </label>
      )}
    </div>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/hotels")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {id ? "Edit Hotel" : "Tambah Hotel Baru"}
          </h1>
          <p className="text-muted-foreground">
            {id ? "Perbarui informasi hotel" : "Tambahkan hotel baru ke database"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Hotel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Hotel</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Contoh: Hilton Suites Makkah"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Lokasi</Label>
                <Select value={location} onValueChange={(value: "makkah" | "madinah") => setValue("location", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih lokasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="makkah">Makkah</SelectItem>
                    <SelectItem value="madinah">Madinah</SelectItem>
                  </SelectContent>
                </Select>
                {errors.location && (
                  <p className="text-sm text-destructive">{errors.location.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="star_rating">Bintang Hotel</Label>
                <Select value={starRating?.toString()} onValueChange={(value) => setValue("star_rating", parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bintang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">⭐ 1 Bintang</SelectItem>
                    <SelectItem value="2">⭐⭐ 2 Bintang</SelectItem>
                    <SelectItem value="3">⭐⭐⭐ 3 Bintang</SelectItem>
                    <SelectItem value="4">⭐⭐⭐⭐ 4 Bintang</SelectItem>
                    <SelectItem value="5">⭐⭐⭐⭐⭐ 5 Bintang</SelectItem>
                  </SelectContent>
                </Select>
                {errors.star_rating && (
                  <p className="text-sm text-destructive">{errors.star_rating.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="distance">Jarak dari Haram</Label>
                <div className="relative">
                  <Input
                    id="distance"
                    {...register("distance")}
                    placeholder="100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    meter
                  </span>
                </div>
                {errors.distance && (
                  <p className="text-sm text-destructive">{errors.distance.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="walking_duration">Waktu Tempuh Jalan Kaki</Label>
                <div className="relative">
                  <Input
                    id="walking_duration"
                    {...register("walking_duration")}
                    placeholder="5"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    menit
                  </span>
                </div>
                {errors.walking_duration && (
                  <p className="text-sm text-destructive">{errors.walking_duration.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Foto Hotel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <PhotoUploadCard
                fieldName="exterior_photo"
                label="Foto Eksterior"
                icon={Building2}
                value={exteriorPhoto}
              />
              <PhotoUploadCard
                fieldName="lobby_photo"
                label="Foto Lobby"
                icon={DoorOpen}
                value={lobbyPhoto}
              />
              <PhotoUploadCard
                fieldName="room_photo"
                label="Foto Kamar"
                icon={Bed}
                value={roomPhoto}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/hotels")}
          >
            Batal
          </Button>
          <Button type="submit" disabled={submitting || uploadingField !== null}>
            <Save className="mr-2 h-4 w-4" />
            {submitting ? "Menyimpan..." : "Simpan Hotel"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default HotelForm;
