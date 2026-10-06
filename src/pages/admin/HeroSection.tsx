import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { FileUpload } from "@/components/admin/FileUpload";
import { compressAndConvertToWebP } from "@/lib/imageUtils";

const HeroSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, isAdmin: isOwner, userRole } = useAuth();
  // The menu also shows this page to content_admin, so the page has to let that role in (it used to render blank).
  const isAdmin = isOwner || userRole === "content_admin";
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [heroData, setHeroData] = useState({
    id: "",
    title: "",
    subtitle: "",
    cta_text: "Konsultasi Gratis",
    cta_link: "https://wa.me/6281917403797",
    background_image: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchHeroData();
    }
  }, [isAdmin]);

  const fetchHeroData = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("hero_section")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setHeroData(data);
      }
    } catch (error: any) {
      console.error("Error fetching hero data:", error);
      toast({
        title: "Gagal",
        description: "Data hero belum bisa dimuat.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      
      // Compress and convert to WebP
      const compressedFile = await compressAndConvertToWebP(file);
      
      // Generate filename
      const timestamp = Date.now();
      const fileName = `hero-background-${timestamp}.webp`;
      const filePath = `hero/${fileName}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('package-images')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('package-images')
        .getPublicUrl(filePath);

      setHeroData({ ...heroData, background_image: publicUrl });
      
      toast({
        title: "Berhasil",
        description: "Gambar latar berhasil diunggah.",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Gagal",
        description: error.message || "Gambar gagal diunggah.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setHeroData({ ...heroData, background_image: "" });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (heroData.id) {
        // Update existing
        const { error } = await (supabase as any)
          .from("hero_section")
          .update({
            title: heroData.title,
            subtitle: heroData.subtitle,
            cta_text: heroData.cta_text,
            cta_link: heroData.cta_link,
            background_image: heroData.background_image,
          })
          .eq("id", heroData.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await (supabase as any)
          .from("hero_section")
          .insert({
            title: heroData.title,
            subtitle: heroData.subtitle,
            cta_text: heroData.cta_text,
            cta_link: heroData.cta_link,
            background_image: heroData.background_image,
            is_active: true,
          });

        if (error) throw error;
      }

      toast({
        title: "Berhasil",
        description: "Bagian hero diperbarui.",
      });
      
      fetchHeroData();
    } catch (error: any) {
      console.error("Error saving hero:", error);
      toast({
        title: "Gagal",
        description: error.message || "Bagian hero gagal disimpan.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hero Beranda</h1>
        <p className="text-muted-foreground">Atur judul dan gambar utama di beranda</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Isi hero</CardTitle>
          <CardDescription>
            Ubah bagian utama yang pertama dilihat pengunjung di beranda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Judul</Label>
            <Input
              id="title"
              value={heroData.title}
              onChange={(e) => setHeroData({ ...heroData, title: e.target.value })}
              placeholder="Contoh: Wujudkan Impian Umroh Anda"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subjudul</Label>
            <Textarea
              id="subtitle"
              value={heroData.subtitle || ""}
              onChange={(e) => setHeroData({ ...heroData, subtitle: e.target.value })}
              placeholder="Contoh: Paket umroh terpercaya dengan layanan terbaik"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cta_text">Teks tombol</Label>
              <Input
                id="cta_text"
                value={heroData.cta_text}
                onChange={(e) => setHeroData({ ...heroData, cta_text: e.target.value })}
                placeholder="Contoh: Konsultasi Gratis"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta_link">Link tombol</Label>
              <Input
                id="cta_link"
                value={heroData.cta_link}
                onChange={(e) => setHeroData({ ...heroData, cta_link: e.target.value })}
                placeholder="Contoh: https://wa.me/6281917403797"
              />
            </div>
          </div>

          <FileUpload
            label="Gambar latar"
            currentImage={heroData.background_image}
            onFileSelect={handleImageUpload}
            onRemove={handleRemoveImage}
            loading={uploading}
            maxSizeMB={5}
          />

          <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan perubahan
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default HeroSection;
