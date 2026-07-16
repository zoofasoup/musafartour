import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, UploadCloud, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/utils/imageCompression";
import { RegionSelector } from "@/components/agent/RegionSelector";

const AgentOnboarding = () => {
  const { agent, user, updateAgentProfile, loading: authLoading, signOut } = useAgentAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    ktp_number: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    social_links: { instagram: "", facebook: "" },
    experience_level: "",
  });
  
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("");
  
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [ktpPreview, setKtpPreview] = useState<string | null>(null);

  // Check if agent is already fully onboarded
  useEffect(() => {
    if (!authLoading && agent) {
      if (agent.ktp_number && agent.ktp_image_url && agent.address) {
        // Already onboarded
        navigate("/agent/dashboard");
      } else {
        setFormData(prev => ({
          ...prev,
          name: agent.name || '',
          phone: agent.phone?.startsWith('000') ? '' : (agent.phone || '')
        }));
      }
    }
  }, [agent, authLoading, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (platform: 'instagram' | 'facebook', value: string) => {
    setFormData(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: value
      }
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 5MB");
        return;
      }
      
      setKtpFile(file);
      setKtpPreview(URL.createObjectURL(file));
    }
  };

  const uploadKtpImage = async (): Promise<string | null> => {
    if (!ktpFile || !user) return null;
    
    setUploading(true);
    try {
      const fileExt = ktpFile.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.jpg`; // Forced to .jpg due to compression
      const filePath = `${user.id}/${fileName}`;
      
      // Compress the image before uploading to save storage space
      const compressedFile = await compressImage(ktpFile, 1000, 0.7); // Max width 1000px, 70% quality
      
      const { error: uploadError } = await supabase.storage
        .from('agent-documents')
        .upload(filePath, compressedFile);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('agent-documents')
        .getPublicUrl(filePath);
        
      return publicUrl;
    } catch (error) {
      console.error("Error uploading KTP:", error);
      toast.error("Gagal mengunggah foto KTP");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.ktp_number || formData.ktp_number.length < 16) {
      toast.error("Nomor KTP harus valid (16 digit)");
      return;
    }
    if (!ktpFile) {
      toast.error("Foto KTP wajib diunggah");
      return;
    }
    if (!formData.address || !formData.city || !formData.province) {
      toast.error("Alamat domisili wajib diisi lengkap");
      return;
    }
    if (!formData.experience_level) {
      toast.error("Pilih tingkat pengalaman Anda");
      return;
    }

    if (!formData.phone || formData.phone.length < 10) {
      toast.error("Nomor telepon wajib diisi (min. 10 digit)");
      return;
    }
    
    setLoading(true);
    
    const ktpUrl = await uploadKtpImage();
    if (!ktpUrl) {
      setLoading(false);
      return;
    }
    
    const result = await updateAgentProfile({
      name: formData.name,
      ktp_number: formData.ktp_number,
      phone: formData.phone.replace(/\D/g, ''),
      wa_number: formData.phone.replace(/\D/g, ''),
      ktp_image_url: ktpUrl,
      address: formData.address,
      city: formData.city,
      province: formData.province,
      social_links: formData.social_links,
      experience_level: formData.experience_level,
    });
    
    setLoading(false);
    
    if (result.success) {
      toast.success("Profil berhasil dilengkapi! Menunggu verifikasi admin.");
      navigate("/agent/dashboard");
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 mb-8">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-foreground">Lengkapi Profil Agent</h1>
            <p className="text-muted-foreground mt-2">
              Langkah terakhir sebelum Anda bisa mulai berjualan paket umroh
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              await signOut();
              navigate("/agent/login");
            }}
          >
            Keluar (Logout)
          </Button>
        </div>
        
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Data Identitas & Domisili</CardTitle>
              <CardDescription>
                Data ini diperlukan untuk verifikasi legalitas dan perhitungan komisi Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap <span className="text-destructive">*</span></Label>
                  <Input 
                    id="name" 
                    name="name"
                    placeholder="Nama Lengkap Anda"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ktp_number">Nomor KTP (NIK) <span className="text-destructive">*</span></Label>
                  <Input 
                    id="ktp_number" 
                    name="ktp_number"
                    placeholder="16 Digit NIK"
                    value={formData.ktp_number}
                    onChange={handleChange}
                    maxLength={16}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon / WhatsApp <span className="text-destructive">*</span></Label>
                <Input 
                  id="phone" 
                  name="phone"
                  placeholder="Contoh: 08123456789"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Foto KTP Asli <span className="text-destructive">*</span></Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors relative">
                  {ktpPreview ? (
                    <div className="space-y-4 w-full">
                      <img src={ktpPreview} alt="Preview KTP" className="max-h-[200px] mx-auto rounded-md shadow-sm" />
                      <div className="flex justify-center">
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          setKtpFile(null);
                          setKtpPreview(null);
                        }}>
                          Ganti Foto
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
                      <div className="text-sm">
                        <span className="font-semibold text-primary cursor-pointer hover:underline">Klik untuk upload</span> atau drag and drop
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        PNG, JPG max 5MB. Pastikan tulisan terbaca jelas.
                      </p>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        required
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Alamat Domisili Lengkap <span className="text-destructive">*</span></Label>
                <Textarea 
                  id="address" 
                  name="address"
                  placeholder="Nama jalan, RT/RW, Kelurahan, Kecamatan"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Provinsi <span className="text-destructive">*</span></Label>
                  <RegionSelector
                    type="province"
                    value={formData.province}
                    onChange={(val, id) => {
                      setFormData((prev) => ({ ...prev, province: val, city: "" }));
                      if (id) setSelectedProvinceId(id);
                    }}
                    placeholder="Pilih Provinsi"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Kota / Kabupaten <span className="text-destructive">*</span></Label>
                  <RegionSelector
                    type="city"
                    provinceId={selectedProvinceId}
                    value={formData.city}
                    onChange={(val) => setFormData((prev) => ({ ...prev, city: val }))}
                    placeholder="Pilih Kota/Kabupaten"
                  />
                </div>
              </div>

              <hr className="my-6" />
              
              <div className="space-y-4">
                <h3 className="font-medium">Profil Pemasaran</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="experience_level">Pengalaman Menjual Umroh <span className="text-destructive">*</span></Label>
                  <Select 
                    value={formData.experience_level} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, experience_level: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pengalaman Anda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pemula">Baru Mulai (Pemula)</SelectItem>
                      <SelectItem value="< 1 tahun">Kurang dari 1 Tahun</SelectItem>
                      <SelectItem value="1-3 tahun">1 - 3 Tahun</SelectItem>
                      <SelectItem value="> 3 tahun">Lebih dari 3 Tahun</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="ig">Link Instagram (Opsional)</Label>
                    <Input 
                      id="ig" 
                      placeholder="instagram.com/username"
                      value={formData.social_links.instagram}
                      onChange={(e) => handleSocialChange('instagram', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fb">Link Facebook (Opsional)</Label>
                    <Input 
                      id="fb" 
                      placeholder="facebook.com/username"
                      value={formData.social_links.facebook}
                      onChange={(e) => handleSocialChange('facebook', e.target.value)}
                    />
                  </div>
                </div>
              </div>

            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t pt-6">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Data Anda aman & terenkripsi
              </p>
              <Button type="submit" disabled={loading || uploading} className="w-full sm:w-auto min-w-[200px]">
                {(loading || uploading) ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
                ) : "Selesai & Kirim Profil"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AgentOnboarding;
