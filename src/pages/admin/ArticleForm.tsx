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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { ArrowLeft, Upload, X } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { compressAndConvertToWebP, generateContextualFileName } from "@/lib/imageUtils";

const articleSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi"),
  slug: z.string().min(1, "Slug wajib diisi"),
  author_name: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().min(1, "Konten wajib diisi"),
  category: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  featured_image: z.string().optional(),
  status: z.string(),
  publish_at: z.string().optional(),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

/** ISO timestamp from the DB -> the local "YYYY-MM-DDTHH:mm" format a datetime-local input expects. */
const toDatetimeLocal = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ArticleForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      slug: "",
      author_name: "",
      excerpt: "",
      content: "",
      category: "",
      meta_title: "",
      meta_description: "",
      featured_image: "",
      status: "draft",
      publish_at: "",
    },
  });

  useEffect(() => {
    if (id) {
      fetchArticle();
    }
  }, [id]);

  const fetchArticle = async () => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        form.reset({
          title: data.title,
          slug: data.slug,
          author_name: data.author_name || "",
          excerpt: data.excerpt || "",
          content: data.content,
          category: data.category || "",
          meta_title: data.meta_title || "",
          meta_description: data.meta_description || "",
          featured_image: data.featured_image || "",
          status: data.status || "draft",
          publish_at: data.publish_at ? toDatetimeLocal(data.publish_at) : "",
        });
        if (data.featured_image) {
          setImagePreview(data.featured_image);
        }
      }
    } catch (error: any) {
      toast.error("Gagal memuat data: " + error.message);
    } finally {
      setInitialLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
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
      // Compress & convert to WebP (target: 60KB for article featured image)
      const compressedFile = await compressAndConvertToWebP(file, 60, 0.85);
      
      // Generate name: "artikel-tips-memilih-paket-umroh-featured.webp"
      const articleSlug = form.getValues('slug') || 'artikel-baru';
      const fileName = generateContextualFileName('article', { slug: articleSlug }, 'featured');
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("article-images")
        .upload(filePath, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("article-images")
        .getPublicUrl(filePath);

      form.setValue("featured_image", publicUrl);
      setImagePreview(publicUrl);
      toast.success("Gambar berhasil diupload dan dioptimasi");
    } catch (error: any) {
      toast.error("Gagal upload gambar: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    form.setValue("featured_image", "");
    setImagePreview(null);
  };

  const onSubmit = async (values: ArticleFormValues) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        publish_at: values.publish_at ? new Date(values.publish_at).toISOString() : null,
      };

      if (id) {
        const { error } = await supabase
          .from("articles")
          .update(payload as any)
          .eq("id", id);

        if (error) throw error;
        toast.success("Artikel berhasil diupdate");
      } else {
        const { error } = await supabase
          .from("articles")
          .insert(payload as any);

        if (error) throw error;
        toast.success("Artikel berhasil dibuat");
      }

      navigate("/admin/articles");
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
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/articles")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{id ? "Edit Artikel" : "Tambah Artikel"}</h1>
          <p className="text-muted-foreground">Tulis artikel untuk blog</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Artikel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Judul</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Tips Memilih Paket Umroh"
                        onChange={(e) => {
                          field.onChange(e);
                          if (!id) {
                            form.setValue("slug", generateSlug(e.target.value));
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug (URL)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="tips-memilih-paket-umroh" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="author_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Penulis</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nama penulis artikel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Tips, Panduan, Berita" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="featured_image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Header Image</FormLabel>
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
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt (Ringkasan)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Ringkasan singkat artikel..." rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konten</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Tulis konten artikel lengkap..."
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
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="meta_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Judul untuk SEO (60 karakter)" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meta_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Deskripsi untuk SEO (160 karakter)" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Publikasi</FormLabel>
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

              <FormField
                control={form.control}
                name="publish_at"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Jadwalkan Publikasi (opsional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Kosongkan untuk publish langsung. Isi untuk menjadwalkan artikel muncul otomatis di waktu tertentu.
                    </p>
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
              onClick={() => navigate("/admin/articles")}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Artikel"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ArticleForm;
