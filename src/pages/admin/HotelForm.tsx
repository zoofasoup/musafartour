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
import { ArrowLeft, Save } from "lucide-react";

const hotelSchema = z.object({
  name: z.string().min(1, "Nama hotel wajib diisi"),
  star_rating: z.number().min(1).max(5),
  location: z.enum(["makkah", "madinah"]),
  distance: z.string().min(1, "Jarak wajib diisi"),
  walking_duration: z.string().min(1, "Waktu tempuh wajib diisi"),
});

type HotelFormData = z.infer<typeof hotelSchema>;

const HotelForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    },
  });

  const starRating = watch("star_rating");
  const location = watch("location");

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
      }
    } catch (error) {
      console.error("Error fetching hotel:", error);
      toast.error("Gagal memuat data hotel");
      navigate("/admin/hotels");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: HotelFormData) => {
    try {
      setSubmitting(true);

      const hotelData = {
        name: data.name,
        star_rating: data.star_rating,
        location: data.location,
        distance: data.distance,
        walking_duration: data.walking_duration,
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

      <form onSubmit={handleSubmit(onSubmit)}>
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
                <Input
                  id="distance"
                  {...register("distance")}
                  placeholder="Contoh: 100 m"
                />
                {errors.distance && (
                  <p className="text-sm text-destructive">{errors.distance.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="walking_duration">Waktu Tempuh Jalan Kaki</Label>
                <Input
                  id="walking_duration"
                  {...register("walking_duration")}
                  placeholder="Contoh: 5 menit"
                />
                {errors.walking_duration && (
                  <p className="text-sm text-destructive">{errors.walking_duration.message}</p>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/hotels")}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                <Save className="mr-2 h-4 w-4" />
                {submitting ? "Menyimpan..." : "Simpan Hotel"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default HotelForm;
