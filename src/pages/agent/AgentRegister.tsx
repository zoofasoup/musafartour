import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Eye, EyeOff, Loader2, UserPlus, LogIn, Phone, Mail, User, IdCard, Clock } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ResendConfirmation } from "@/components/agent/ResendConfirmation";
import { peekAgentReferral, rememberAgentReferral } from "@/lib/agentReferral";

type FieldName = "name" | "email" | "phone" | "password" | "confirmPassword" | "consent";
type FieldErrors = Partial<Record<FieldName, string>>;

/** Order on screen, so the first mistake gets the focus. */
const FIELD_ORDER: FieldName[] = ["name", "email", "phone", "password", "confirmPassword", "consent"];

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <p id={id} className="flex items-start gap-1.5 text-sm text-status-bad-fg">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  ) : null;

const AgentRegister = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, signInWithGoogle, user, agent, loading: authLoading } = useAgentAuth();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    referral_code: searchParams.get("ref") || peekAgentReferral(),
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Handle redirect if user is already logged in (e.g. via Google OAuth)
  useEffect(() => {
    if (!authLoading && user && agent) {
      navigate("/agent/dashboard");
    }
  }, [authLoading, user, agent, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // The message goes away as soon as the person starts fixing the field.
    if (errors[name as FieldName]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validateForm = (): FieldErrors => {
    const found: FieldErrors = {};
    if (formData.name.trim().length < 2) {
      found.name = "Isi nama lengkap, minimal 2 huruf.";
    }
    if (!formData.email.trim()) {
      found.email = "Isi email kamu.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      found.email = "Format email belum benar, contohnya nama@email.com.";
    }
    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (!formData.phone.trim()) {
      found.phone = "Isi nomor WhatsApp yang aktif.";
    } else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      found.phone = "Nomor harus 10 sampai 15 angka, contohnya 081234567890.";
    }
    if (!formData.password) {
      found.password = "Buat password untuk akunmu.";
    } else if (formData.password.length < 8) {
      found.password = "Password minimal 8 karakter.";
    }
    if (!formData.confirmPassword) {
      found.confirmPassword = "Ketik ulang passwordmu.";
    } else if (formData.password !== formData.confirmPassword) {
      found.confirmPassword = "Konfirmasi password belum sama dengan password.";
    }
    if (!consent) {
      found.consent = "Centang persetujuan ini untuk melanjutkan.";
    }
    return found;
  };

  const focusFirst = (found: FieldErrors) => {
    const first = FIELD_ORDER.find((f) => found[f]);
    if (first) formRef.current?.querySelector<HTMLElement>(`#${first}`)?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const found = validateForm();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirst(found);
      return;
    }

    setLoading(true);
    const result = await signUp({
      name: formData.name,
      email: formData.email,
      phone: formData.phone.replace(/\D/g, ''),
      wa_number: formData.phone.replace(/\D/g, ''),
      password: formData.password,
      referral_code: formData.referral_code || undefined,
    });
    setLoading(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setFormError(result.error || "Pendaftaran belum berhasil. Coba lagi sebentar lagi.");
    }
  };

  // Google has no form fields to carry the referral code, so it is remembered for after the redirect.
  const handleGoogle = async () => {
    setFormError(null);
    if (!consent) {
      const found: FieldErrors = { consent: "Centang persetujuan ini untuk melanjutkan." };
      setErrors(found);
      focusFirst(found);
      return;
    }
    rememberAgentReferral(formData.referral_code);
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    if (!result.success) {
      setGoogleLoading(false);
      setFormError(result.error || "Daftar dengan Google belum berhasil. Coba lagi.");
      toast.error(result.error || "Daftar dengan Google belum berhasil. Coba lagi.");
    }
    // On success the browser leaves for Google.
  };

  if (success) {
    const steps = [
      { icon: Mail, title: "Konfirmasi email", text: `Buka email yang kami kirim ke ${formData.email.trim()}, lalu klik tautan konfirmasi. Cek folder spam jika belum ada.` },
      { icon: LogIn, title: "Masuk ke portal agen", text: "Setelah email dikonfirmasi, masuk dengan email dan password yang baru kamu buat." },
      { icon: IdCard, title: "Lengkapi data identitas", text: "Isi KTP, foto KTP, dan alamat domisili. Data ini dipakai admin untuk verifikasi." },
      { icon: Clock, title: "Tunggu persetujuan admin", text: "Admin memeriksa data kamu, biasanya 1-2 hari kerja. Setelah disetujui, akun kamu aktif." },
    ];
    return (
      <AuthLayout
        title="Pendaftaran Berhasil"
        subtitle="Satu langkah lagi: konfirmasi email kamu, lalu lanjutkan sesuai urutan di bawah."
      >
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-3 rounded-lg border bg-muted/50 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card border text-sm font-semibold">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <step.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  {step.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <section aria-labelledby="resend-heading" className="mt-6 rounded-lg border bg-card p-4">
          <h2 id="resend-heading" className="mb-3 text-sm font-semibold text-foreground">Email belum masuk?</h2>
          <ResendConfirmation email={formData.email.trim()} />
        </section>

        <Button className="mt-6 w-full" onClick={() => navigate("/agent/login")}>
          <LogIn className="mr-2 h-4 w-4" />
          Ke Halaman Login
        </Button>
      </AuthLayout>
    );
  }

  const ICON = "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground";
  const EYE_BUTTON = "absolute right-0 top-0 h-full px-3 hover:bg-transparent";
  const describedBy = (field: FieldName, hint?: string) => [errors[field] ? `${field}-error` : null, hint ?? null].filter(Boolean).join(" ") || undefined;

  return (
    <AuthLayout
      title="Daftar Agen"
      subtitle="Isi formulir di bawah untuk mendaftar sebagai mitra resmi Musafar Tour."
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-3">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap <span className="text-destructive" aria-hidden>*</span></Label>
                <div className="relative">
                  <User className={ICON} aria-hidden />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Nama lengkap kamu"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={loading}
                    className="pl-10"
                    autoComplete="name"
                    required
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={describedBy("name")}
                  />
                </div>
                <FieldError id="name-error" message={errors.name} />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-destructive" aria-hidden>*</span></Label>
                <div className="relative">
                  <Mail className={ICON} aria-hidden />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="email@contoh.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    className="pl-10"
                    autoComplete="email"
                    inputMode="email"
                    required
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={describedBy("email")}
                  />
                </div>
                <FieldError id="email-error" message={errors.email} />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon / WhatsApp <span className="text-destructive" aria-hidden>*</span></Label>
                <div className="relative">
                  <Phone className={ICON} aria-hidden />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="081234567890"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-10"
                    disabled={loading}
                    autoComplete="tel"
                    inputMode="tel"
                    required
                    aria-invalid={errors.phone ? true : undefined}
                    aria-describedby={describedBy("phone")}
                  />
                </div>
                <FieldError id="phone-error" message={errors.phone} />
              </div>

              {/* Referral Code */}
              <div className="space-y-2">
                <Label htmlFor="referral_code">Kode Referral (opsional)</Label>
                <Input
                  id="referral_code"
                  name="referral_code"
                  type="text"
                  placeholder="MUS-XXXXXX"
                  value={formData.referral_code}
                  onChange={handleChange}
                  disabled={loading}
                  className="uppercase"
                  autoComplete="off"
                  autoCapitalize="characters"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password <span className="text-destructive" aria-hidden>*</span></Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 8 karakter"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    className="pr-12"
                    autoComplete="new-password"
                    required
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={describedBy("password", "password-hint")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={EYE_BUTTON}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" aria-hidden />
                    )}
                  </Button>
                </div>
                <p id="password-hint" className="text-sm text-muted-foreground">Minimal 8 karakter.</p>
                <FieldError id="password-error" message={errors.password} />
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password <span className="text-destructive" aria-hidden>*</span></Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                    className="pr-12"
                    autoComplete="new-password"
                    required
                    aria-invalid={errors.confirmPassword ? true : undefined}
                    aria-describedby={describedBy("confirmPassword")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={EYE_BUTTON}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" aria-hidden />
                    )}
                  </Button>
                </div>
                <FieldError id="confirmPassword-error" message={errors.confirmPassword} />
              </div>

              {/* UU PDP consent: required for the form and for Google */}
              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent"
                    name="consent"
                    checked={consent}
                    onCheckedChange={(checked) => {
                      setConsent(checked === true);
                      if (checked === true && errors.consent) setErrors(prev => ({ ...prev, consent: undefined }));
                    }}
                    disabled={loading || googleLoading}
                    className="mt-0.5 h-5 w-5 [@media(pointer:coarse)]:h-6 [@media(pointer:coarse)]:w-6"
                    aria-required
                    aria-invalid={errors.consent ? true : undefined}
                    aria-describedby={describedBy("consent", "consent-links")}
                  />
                  <Label htmlFor="consent" className="cursor-pointer text-sm font-normal leading-snug text-foreground">
                    Saya setuju data saya diproses untuk keperluan keagenan sesuai{" "}
                    <Link to="/kebijakan-privasi" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
                      Kebijakan Privasi
                    </Link>
                    <span aria-hidden className="text-destructive"> *</span>
                  </Label>
                </div>
                <p id="consent-links" className="pl-8 text-sm text-muted-foreground">
                  Baca juga{" "}
                  <Link to="/syarat-ketentuan" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
                    Syarat &amp; Ketentuan
                  </Link>
                  . Linknya terbuka di tab baru, isianmu tidak hilang.
                </p>
                <div className="pl-8">
                  <FieldError id="consent-error" message={errors.consent} />
                </div>
              </div>
        </div>

        {formError && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-status-bad-border bg-status-bad-bg p-3 text-sm text-status-bad-fg">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 mt-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Daftar
                  </>
                )}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Atau daftar dengan
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogle}
                disabled={loading || googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                  </svg>
                )}
                Google
              </Button>

              <div className="text-center text-sm mt-4">
                <span className="text-muted-foreground">Sudah punya akun? </span>
                <Link 
                  to="/agent/login" 
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <LogIn className="h-3 w-3" />
                  Masuk di sini
                </Link>
              </div>
        </div>
      </form>
    </AuthLayout>
  );
};

export default AgentRegister;
