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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const packageSchema = z.object({
  package_name: z.string().min(1, "Nama paket wajib diisi"),
  departure_date: z.string().min(1, "Tanggal keberangkatan wajib diisi"),
  duration_days: z.number().min(1, "Durasi minimal 1 hari"),
  flight: z.string().min(1, "Maskapai wajib diisi"),
  flight_type: z.string().min(1, "Tipe penerbangan wajib diisi"),
  
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
        const priceData = data.package_price as any;
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

  const onSubmit = async (values: PackageFormValues) => {
    setLoading(true);
    try {
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
              <CardTitle>Harga Paket</CardTitle>
              <CardDescription>Harga berdasarkan tipe kamar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    <FormLabel>Perlengkapan</FormLabel>
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
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Paket"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PackageForm;
