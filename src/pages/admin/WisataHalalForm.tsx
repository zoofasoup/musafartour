import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { ArrowLeft, Upload, X } from "lucide-react";
import { compressAndConvertToWebP, generateContextualFileName } from "@/lib/imageUtils";

const wisataSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi"),
  destination: z.string().min(1, "Destinasi wajib diisi"),
  duration: z.string().min(1, "Durasi wajib diisi"),
  price: z.string().min(1, "Harga wajib diisi"),
  departure_city: z.string().min(1, "Kota keberangkatan wajib diisi"),
  airline: z.string().optional(),
  description: z.string().optional(),
  image_url: z.string().optional(),
});

type WisataFormValues = z.infer<typeof wisataSchema>;

const WisataHalalForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<WisataFormValues>({
    resolver: zodResolver(wisataSchema),
    defaultValues: {
      title: "",
      destination: "",
      duration: "",
      price: "",
      departure_city: "",
      airline: "",
      description: "",
      image_url: "",
    },
  });

  useEffect(() => {
    if (id) {
      fetchWisata();
    }
  }, [id]);

  const fetchWisata = async () => {
    try {
      const { data, error } = await supabase
        .from("wisata_halal")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        form.reset({
          title: data.title,
          destination: data.destination,
          duration: data.duration,
          price: data.price,
          departure_city: data.departure_city,
          airline: data.airline || "",
          description: data.description || "",
          image_url: data.image_url || "",
        });
        if (data.image_url) {
          setImagePreview(data.image_url);
        }
      }
    } catch (error: any) {
      toast.error("Gagal memuat data: " + error.message);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    setUploading(true);
    try {
      // Compress & convert to WebP (target: 50KB for wisata banner)
      const compressedFile = await compressAndConvertToWebP(file, 50, 0.85);
      
      // Generate name: "wisata-halal-turki-banner.webp"
      const destination = form.getValues('destination');
      const fileName = generateContextualFileName('wisata', { destination }, 'banner');
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("wisata-images")
        .upload(filePath, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("wisata-images")
        .getPublicUrl(filePath);

      form.setValue("image_url", publicUrl);
      setImagePreview(publicUrl);
      toast.success("Gambar berhasil diupload dan dioptimasi");
    } catch (error: any) {
      toast.error("Gagal upload gambar: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    form.setValue("image_url", "");
    setImagePreview(null);
  };

  const onSubmit = async (values: WisataFormValues) => {
    setLoading(true);
    try {
      if (id) {
        const { error } = await supabase
          .from("wisata_halal")
          .update(values as any)
          .eq("id", id);

        if (error) throw error;
        toast.success("Wisata halal berhasil diupdate");
      } else {
        const { error } = await supabase
          .from("wisata_halal")
          .insert(values as any);

        if (error) throw error;
        toast.success("Wisata halal berhasil dibuat");
      }

      navigate("/admin/wisata-halal");
    } catch (error: any) {
      toast.error("Gagal menyimpan: " + error.message);
    } finally {
      setLoading(false);
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
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/wisata-halal")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{id ? "Edit Wisata Halal" : "Tambah Wisata Halal"}</h1>
          <p className="text-muted-foreground">Lengkapi informasi wisata halal</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Wisata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Judul</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Wisata Turki 7 Hari" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destinasi</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Turki" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durasi</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="7 Hari 6 Malam" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Mulai dari Rp 15.000.000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="departure_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kota Keberangkatan</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Jakarta" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="airline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maskapai</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Turkish Airlines" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banner Image</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {imagePreview ? (
                          <div className="relative">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full h-64 object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={removeImage}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="h-10 w-10 mb-3 text-muted-foreground" />
                              <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Click to upload</span> atau drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (MAX. 5MB)</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={uploading}
                            />
                          </label>
                        )}
                        {uploading && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                            Mengkompress dan mengoptimasi gambar...
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Deskripsi lengkap paket wisata halal..."
                        rows={6}
                      />
                    </FormControl>
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
              onClick={() => navigate("/admin/wisata-halal")}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default WisataHalalForm;
