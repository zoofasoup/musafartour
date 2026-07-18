import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, File, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { compressAndConvertToWebP, generateContextualFileName } from "@/lib/imageUtils";

const MarketingMaterialForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = id && id !== "new";
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [packages, setPackages] = useState<any[]>([]);
  
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("visual");
  const [packageId, setPackageId] = useState("general");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("id, package_name")
        .order("created_at", { ascending: false });
      
      if (!error && data) {
        setPackages(data);
      }
    };
    
    fetchPackages();
    
    if (isEditing) {
      const fetchMaterial = async () => {
        try {
          const { data, error } = await supabase
            .from("marketing_materials")
            .select("*")
            .eq("id", id)
            .single();
            
          if (error) throw error;
          
          setTitle(data.title);
          setCategory(data.category);
          setPackageId(data.package_id || "general");
          setDescription(data.description || "");
          setIsActive(data.is_active);
          setPreviewUrl(data.file_url);
        } catch (error: any) {
          toast.error("Gagal memuat materi: " + error.message);
        } finally {
          setInitialLoading(false);
        }
      };
      
      fetchMaterial();
    }
  }, [id, isEditing]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // If it's an image and visual category, we might want to compress it
      if (category === 'visual' && selectedFile.type.startsWith('image/')) {
        try {
          const compressed = await compressAndConvertToWebP(selectedFile);
          setFile(compressed as File);
          setPreviewUrl(URL.createObjectURL(compressed));
        } catch (error) {
          console.error("Compression error", error);
          setFile(selectedFile);
          setPreviewUrl(URL.createObjectURL(selectedFile));
        }
      } else {
        setFile(selectedFile);
        if (selectedFile.type.startsWith('image/') || selectedFile.type.startsWith('video/')) {
          setPreviewUrl(URL.createObjectURL(selectedFile));
        } else {
          setPreviewUrl(null); // Document or other
        }
      }
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!file) return previewUrl; // Return existing URL if no new file
    
    const fileExt = file.name.split('.').pop();
    let folder = 'marketing';
    let fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    if (category === 'visual') {
      fileName = generateContextualFileName('marketing', fileName);
    }
    
    const filePath = `${folder}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from("package-images")
      .upload(filePath, file, { upsert: true });
      
    if (uploadError) {
      throw uploadError;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from("package-images")
      .getPublicUrl(filePath);
      
    return publicUrl;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Judul wajib diisi");
      return;
    }
    
    if (category !== 'copy' && !file && !previewUrl) {
      toast.error("File wajib diunggah untuk kategori ini");
      return;
    }

    setLoading(true);
    try {
      let fileUrl = previewUrl;
      let fileSize = null;
      let fileFormat = null;
      
      if (file) {
        fileUrl = await uploadFile();
        fileSize = formatBytes(file.size);
        fileFormat = file.name.split('.').pop()?.toUpperCase() || null;
      }
      
      const payload = {
        title,
        category,
        package_id: packageId === "general" ? null : packageId,
        description,
        is_active: isActive,
        file_url: fileUrl || "",
        file_size: fileSize,
        format: fileFormat,
        type: category // for consistency with older implementations
      };

      if (isEditing) {
        const { error } = await supabase
          .from("marketing_materials")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        toast.success("Materi berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("marketing_materials")
          .insert([payload]);
        if (error) throw error;
        toast.success("Materi berhasil ditambahkan");
      }
      
      navigate("/admin/marketing-materials");
    } catch (error: any) {
      toast.error("Terjadi kesalahan: " + error.message);
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? "Edit Materi" : "Tambah Materi"}
          </h1>
          <p className="text-muted-foreground">Isi form di bawah untuk materi marketing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Dasar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Judul Materi <span className="text-red-500">*</span></Label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Misal: Flyer Ramadhan Spesial" 
                required 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visual">Visual (Flyer, Image)</SelectItem>
                    <SelectItem value="copy">Copywriting (Teks WA/IG)</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Target Paket</Label>
                <Select value={packageId} onValueChange={setPackageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih paket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General (Semua Paket)</SelectItem>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.package_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Status Publikasi</Label>
                <p className="text-sm text-muted-foreground">Aktifkan agar terlihat oleh agen dan publik</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </CardContent>
        </Card>

        {category === 'copy' ? (
          <Card>
            <CardHeader>
              <CardTitle>Konten Teks</CardTitle>
              <CardDescription>Masukkan teks copywriting (contoh: untuk WA broadcast atau IG caption)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Tulis pesan copywriting Anda di sini..." 
                className="min-h-[200px]"
                required={category === 'copy'}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>File Media</CardTitle>
              <CardDescription>Upload {category === 'video' ? 'video' : 'gambar'} untuk materi ini.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {category !== 'video' && (
                <div className="space-y-2">
                  <Label>Keterangan / Description (Opsional)</Label>
                  <Textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Tambahan info untuk agen..." 
                    rows={2}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Upload File <span className="text-red-500">*</span></Label>
                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept={category === 'video' ? "video/*" : "image/*,application/pdf"}
                    onChange={handleFileChange}
                  />
                  {file || previewUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      {category === 'video' ? (
                        <div className="h-20 w-20 bg-primary/10 rounded flex items-center justify-center">
                          <File className="h-10 w-10 text-primary" />
                        </div>
                      ) : previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="h-32 object-contain rounded" />
                      ) : (
                        <File className="h-10 w-10 text-primary" />
                      )}
                      <p className="text-sm font-medium">{file ? file.name : 'File sudah terupload'}</p>
                      <Button type="button" variant="outline" size="sm">Ganti File</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="h-10 w-10 mb-2" />
                      <p className="font-medium">Klik untuk upload file</p>
                      <p className="text-xs">
                        {category === 'video' ? 'MP4 maksimal 50MB' : 'JPG/PNG/PDF maksimal 10MB'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Batal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Simpan Perubahan" : "Simpan Materi"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MarketingMaterialForm;
