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
import { ArrowLeft } from "lucide-react";

const wisataSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi"),
  destination: z.string().min(1, "Destinasi wajib diisi"),
  duration: z.string().min(1, "Durasi wajib diisi"),
  price: z.string().min(1, "Harga wajib diisi"),
  departure_city: z.string().min(1, "Kota keberangkatan wajib diisi"),
  airline: z.string().optional(),
  description: z.string().optional(),
});

type WisataFormValues = z.infer<typeof wisataSchema>;

const WisataHalalForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

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
        });
      }
    } catch (error: any) {
      toast.error("Gagal memuat data: " + error.message);
    } finally {
      setInitialLoading(false);
    }
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
