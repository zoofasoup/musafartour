import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import musafarLogo from "@/assets/musafar-logo.svg";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import "@/styles/pkg-v2.css";
import "@/styles/pkg-app.css";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UploadCloud, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/utils/imageCompression";
import { SuggestField } from "@/components/agent/VillageSearch";
import { nikProblem } from "@/lib/nik";
import { formatPhone } from "@/lib/phone";

const AgentOnboarding = () => {
  const { agent, user, updateAgentProfile, loading: authLoading, signOut } = useAgentAuth();
  const navigate = useNavigate();
  
  // The shadcn pieces inside (select, checklist) take the work-area palette, like every other agent screen.
  useEffect(() => {
    document.documentElement.classList.add("pkg-app");
    return () => document.documentElement.classList.remove("pkg-app");
  }, []);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    ktp_number: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    village: "",
    district: "",
    postal_code: "",
    social_links: { instagram: "", facebook: "" },
    experience_level: "",
  });
  
  
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  // The KTP photo already uploaded for the draft (so a draft restored on another device still has it).
  const [draftKtpUrl, setDraftKtpUrl] = useState<string | null>(null);
  const hydrated = useRef(false);
  const dirty = useRef(false);
  const [ktpPreview, setKtpPreview] = useState<string | null>(null);

  // Check if agent is already fully onboarded
  useEffect(() => {
    if (!authLoading && agent) {
      if (agent.ktp_number && agent.ktp_image_url && agent.address) {
        // Data is in: on to the SOP (step 2) unless it is already accepted
        navigate(agent.sop_accepted_at ? "/agent/dashboard" : "/agent/onboarding/sop", { replace: true });
      } else {
        setFormData(prev => ({
          ...prev,
          name: agent.name || '',
          // '000...' is a placeholder (Google sign-in, or the number was taken): fall back to the
          // WhatsApp number given at registration so the user only has to confirm it.
          phone: agent.phone?.startsWith('000') ? (agent.wa_number || '') : (agent.phone || '')
        }));
        // Pick up where the agent left off: the cloud draft first, else the copy kept on this device.
        if (!hydrated.current) {
          hydrated.current = true;
          let draft = agent.onboarding_draft as Record<string, any> | null | undefined;
          if (!draft) {
            try { draft = JSON.parse(localStorage.getItem(`agent-onboarding-draft:${agent.id}`) || "null"); } catch { draft = null; }
          }
          if (draft && typeof draft === "object") {
            setFormData((prev) => ({
              ...prev,
              name: draft!.name ?? prev.name,
              ktp_number: draft!.ktp_number ?? prev.ktp_number,
              phone: draft!.phone ?? prev.phone,
              address: draft!.address ?? prev.address,
              city: draft!.city ?? prev.city,
              province: draft!.province ?? prev.province,
              village: draft!.village ?? prev.village,
              district: draft!.district ?? prev.district,
              postal_code: draft!.postal_code ?? prev.postal_code,
              experience_level: draft!.experience_level ?? prev.experience_level,
              social_links: { instagram: draft!.social_links?.instagram ?? "", facebook: draft!.social_links?.facebook ?? "" },
            }));
            if (draft.ktp_url) { setDraftKtpUrl(String(draft.ktp_url)); setKtpPreview(String(draft.ktp_url)); }
          }
        }
      }
    }
  }, [agent, authLoading, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value: rawValue } = e.target;
    const value = name === "phone" ? formatPhone(rawValue) : rawValue;
    dirty.current = true;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const setRegionField = (name: "village" | "district" | "city" | "province", value: string) => {
    dirty.current = true;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (platform: 'instagram' | 'facebook', value: string) => {
    dirty.current = true;
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
      
      dirty.current = true;
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

  const uploadedFile = useRef<File | null>(null);

  /** Keeps the form in the cloud (agents.onboarding_draft); falls back to this device when the cloud save fails. */
  const saveDraft = useCallback(async () => {
    if (!agent?.id || !user) return;
    let ktpUrl = draftKtpUrl;
    if (ktpFile && uploadedFile.current !== ktpFile) {
      const url = await uploadKtpImage();
      if (url) {
        uploadedFile.current = ktpFile;
        ktpUrl = url;
        setDraftKtpUrl(url);
      }
    }
    const payload = {
      name: formData.name,
      ktp_number: formData.ktp_number,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      province: formData.province,
      village: formData.village,
      district: formData.district,
      postal_code: formData.postal_code,
      experience_level: formData.experience_level,
      social_links: formData.social_links,
      ktp_url: ktpUrl,
      saved_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("agents").update({ onboarding_draft: payload } as never).eq("id", agent.id);
    if (error) {
      try { localStorage.setItem(`agent-onboarding-draft:${agent.id}`, JSON.stringify(payload)); } catch { /* storage unavailable */ }
    } else {
      try { localStorage.removeItem(`agent-onboarding-draft:${agent.id}`); } catch { /* storage unavailable */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id, user, formData, ktpFile, draftKtpUrl]);

  // Saves by itself a moment after the agent stops typing.
  useEffect(() => {
    if (!dirty.current) return;
    const t = window.setTimeout(() => { void saveDraft(); }, 1800);
    return () => window.clearTimeout(t);
  }, [formData, ktpFile, saveDraft]);

  // Leaving the tab (switching apps on a phone) saves right away instead of waiting for the pause.
  useEffect(() => {
    const flush = () => { if (document.visibilityState === "hidden" && dirty.current) void saveDraft(); };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [saveDraft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.ktp_number || formData.ktp_number.length < 16) {
      toast.error("Nomor KTP harus valid (16 digit)");
      return;
    }
    if (!ktpFile && !draftKtpUrl) {
      toast.error("Foto KTP wajib diunggah");
      return;
    }
    if (!formData.address || !formData.village || !formData.city || !formData.province) {
      toast.error("Alamat domisili wajib diisi lengkap");
      return;
    }
    if (!formData.experience_level) {
      toast.error("Pilih tingkat pengalaman kamu");
      return;
    }

    if (!formData.phone || formData.phone.length < 10) {
      toast.error("Nomor telepon wajib diisi (min. 10 digit)");
      return;
    }
    
    setLoading(true);
    
    const ktpUrl = ktpFile ? await uploadKtpImage() : draftKtpUrl;
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
      address: [formData.address.trim(), formData.village && `Kel. ${formData.village}`, formData.district && `Kec. ${formData.district}`, formData.postal_code].filter(Boolean).join(", "),
      city: formData.city,
      province: formData.province,
      social_links: formData.social_links,
      experience_level: formData.experience_level,
    });
    
    setLoading(false);
    
    if (result.success) {
      try { localStorage.removeItem(`agent-onboarding-draft:${agent?.id}`); } catch { /* storage unavailable */ }
      // The draft is cleared on its own, after the profile is safely saved: it must never be able to fail the submit
      // (the column may not exist yet on a database that has not had the migration).
      if (agent?.id) void supabase.from("agents").update({ onboarding_draft: null } as never).eq("id", agent.id);
      toast.success("Data terkirim.");
      navigate("/agent/onboarding/sop", { replace: true });
    } else {
      const reason = result.error || "";
      if (reason.includes("agents_phone_key")) {
        toast.error("Nomor telepon sudah terdaftar pada akun lain.");
      } else if (reason.includes("agents_ktp_number_key")) {
        toast.error("Nomor KTP sudah terdaftar pada akun lain.");
      } else {
        console.error("Onboarding save failed:", reason);
        toast.error("Gagal menyimpan profil. Periksa koneksi kamu, lalu coba lagi.");
      }
    }
  };

  if (authLoading) {
    return <div className="pkg-v2 grid min-h-screen place-items-center"><Loader2 className="h-8 w-8 animate-spin text-pkg-fg-3" aria-hidden /></div>;
  }

  return (
    <div className="pkg-v2 min-h-screen">
      <PkgPanel tone="ink" top>
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" aria-label="Musafar Tour, ke beranda"><img src={musafarLogo} alt="Musafar Tour" className="h-8 brightness-0 invert" /></Link>
            <button
              type="button"
              className="pkg-press pkg-glass pkg-label inline-flex h-11 items-center rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream"
              onClick={async () => {
                await signOut();
                navigate("/agent/login");
              }}
            >
              Keluar
            </button>
          </div>
          <p className="pkg-label mt-10 text-pkg-fg-2">Langkah 1 dari 2</p>
          <h1 className="pkg-title mt-3 text-balance !text-[40px] md:!text-[56px]">Lengkapi profil agen.</h1>
          <p className="mt-4 text-[17px] leading-[1.5] text-pkg-fg-2">
            Isi data dirimu, lalu setujui SOP.
          </p>
        </div>
      </PkgPanel>

      <PkgPanel tone="cream" last className="pkg-auth">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
          <section aria-labelledby="onb-ktp">
            <h2 id="onb-ktp" className="pkg-h2">Foto KTP</h2>
            <div className="relative mt-6 flex min-h-44 flex-col items-center justify-center rounded-[24px] bg-pkg-cream-2 p-6 text-center">
              {ktpPreview ? (
                <div className="w-full space-y-4">
                  <img src={ktpPreview} alt="Foto KTP" className="mx-auto max-h-[220px] rounded-2xl shadow-sm" />
                  <button
                    type="button"
                    className="pkg-press pkg-glass pkg-label inline-flex h-11 items-center rounded-full px-5"
                    onClick={() => {
                      dirty.current = true;
                      setKtpFile(null);
                      setKtpPreview(null);
                      setDraftKtpUrl(null);
                    }}
                  >
                    Ganti foto
                  </button>
                </div>
              ) : (
                <label htmlFor="ktp-file" className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center rounded-[24px] p-6 text-center focus-within:ring-2 focus-within:ring-pkg-ink">
                  <UploadCloud className="mb-3 h-9 w-9 text-pkg-fg-3" aria-hidden />
                  <span className="text-[16px] text-pkg-fg">Ketuk untuk memilih foto KTP</span>
                  <span className="mt-1 text-[14px] text-pkg-fg-3">Foto lurus dan terang.</span>
                  <input id="ktp-file" type="file" accept="image/png, image/jpeg, image/jpg" className="sr-only" onChange={handleFileChange} />
                </label>
              )}
            </div>
          </section>

          <section aria-labelledby="onb-identitas" className="mt-14">
            <h2 id="onb-identitas" className="pkg-h2">Data diri</h2>
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Nama lengkap <span className="text-pkg-red-deep" aria-hidden>*</span></Label>
                <Input id="name" name="name" placeholder="Nama lengkap kamu" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ktp_number">Nomor KTP (NIK) <span className="text-pkg-red-deep" aria-hidden>*</span></Label>
                <Input id="ktp_number" name="ktp_number" inputMode="numeric" placeholder="16 digit NIK" value={formData.ktp_number} onChange={handleChange} maxLength={16} required />
                {formData.ktp_number.length > 0 && formData.ktp_number.length === 16 && nikProblem(formData.ktp_number) && (
                  <p className="text-[14px] text-pkg-red-deep" role="alert">{nikProblem(formData.ktp_number)} Periksa lagi dengan KTP.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor telepon / WhatsApp <span className="text-pkg-red-deep" aria-hidden>*</span></Label>
                <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="0812 3456 7890" value={formData.phone} onChange={handleChange} required />
              </div>
            </div>
          </section>

          <section aria-labelledby="onb-domisili" className="mt-14">
            <h2 id="onb-domisili" className="pkg-h2">Domisili</h2>
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="address">Alamat lengkap <span className="text-pkg-red-deep" aria-hidden>*</span></Label>
                <Textarea id="address" name="address" rows={3} placeholder="Jalan, RT/RW, nomor rumah" value={formData.address} onChange={handleChange} required />
              </div>

              {([
                ["village", "Kelurahan / desa"],
                ["district", "Kecamatan"],
                ["city", "Kota / kabupaten"],
                ["province", "Provinsi"],
              ] as const).map(([name, label]) => (
                <div key={name} className="space-y-2">
                  <Label htmlFor={name}>{label} <span className="text-pkg-red-deep" aria-hidden>*</span></Label>
                  <SuggestField
                    id={name}
                    field={name}
                    value={formData[name]}
                    context={{ regency: formData.city, province: formData.province }}
                    onChange={(v) => setRegionField(name, v)}
                    onPick={(sug) => {
                      const pl = sug.place;
                      dirty.current = true;
                      setFormData((prev) => ({
                        ...prev,
                        ...(name === "village" ? { village: pl.village ?? prev.village, postal_code: pl.code ?? prev.postal_code } : {}),
                        ...(name === "village" || name === "district" ? { district: pl.district ?? prev.district } : {}),
                        ...(name !== "province" ? { city: pl.regency ?? prev.city } : {}),
                        province: pl.province ?? prev.province,
                      }));
                    }}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="manual-postal_code">Kode pos</Label>
                <Input id="manual-postal_code" name="postal_code" inputMode="numeric" value={formData.postal_code} onChange={handleChange} />
              </div>
            </div>
          </section>

          <section aria-labelledby="onb-profil" className="mt-14">
            <h2 id="onb-profil" className="pkg-h2">Profil pemasaran</h2>
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="experience_level">Pengalaman menjual umroh <span className="text-pkg-red-deep" aria-hidden>*</span></Label>
                <Select value={formData.experience_level} onValueChange={(val) => { dirty.current = true; setFormData((prev) => ({ ...prev, experience_level: val })); }}>
                  <SelectTrigger id="experience_level">
                    <SelectValue placeholder="Pilih pengalamanmu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pemula">Baru mulai (pemula)</SelectItem>
                    <SelectItem value="< 1 tahun">Kurang dari 1 tahun</SelectItem>
                    <SelectItem value="1-3 tahun">1 sampai 3 tahun</SelectItem>
                    <SelectItem value="> 3 tahun">Lebih dari 3 tahun</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ig">Link Instagram <span className="text-pkg-fg-3">(opsional)</span></Label>
                <Input id="ig" placeholder="instagram.com/username" value={formData.social_links.instagram} onChange={(e) => handleSocialChange("instagram", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fb">Link Facebook <span className="text-pkg-fg-3">(opsional)</span></Label>
                <Input id="fb" placeholder="facebook.com/username" value={formData.social_links.facebook} onChange={(e) => handleSocialChange("facebook", e.target.value)} />
              </div>
            </div>
          </section>

          <div className="mt-12 space-y-4">
            <button type="submit" disabled={loading || uploading} className="pkg-press w-full disabled:opacity-60">
              {loading || uploading ? (
                <span className="inline-flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Menyimpan...</span>
              ) : (
                "Selesai dan kirim profil"
              )}
            </button>
            <p className="flex items-center justify-center gap-2 text-[14px] text-pkg-fg-3">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Datamu aman dan terenkripsi
            </p>
          </div>
        </form>

      </PkgPanel>
    </div>
  );
};

export default AgentOnboarding;
