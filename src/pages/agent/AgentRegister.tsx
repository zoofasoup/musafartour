import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, UserPlus, LogIn, CheckCircle, Phone, Mail, User } from "lucide-react";
import { toast } from "sonner";
import musafarLogo from "@/assets/musafar-logo.svg";

const AgentRegister = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp } = useAgentAuth();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    wa_number: "",
    password: "",
    confirmPassword: "",
    referral_code: searchParams.get("ref") || "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Nama lengkap harus diisi");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("Email harus diisi");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Format email tidak valid");
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error("Nomor telepon harus diisi");
      return false;
    }
    if (formData.phone.length < 10) {
      toast.error("Nomor telepon minimal 10 digit");
      return false;
    }
    if (!formData.password) {
      toast.error("Password harus diisi");
      return false;
    }
    if (formData.password.length < 8) {
      toast.error("Password minimal 8 karakter");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    const result = await signUp({
      name: formData.name,
      email: formData.email,
      phone: formData.phone.replace(/\D/g, ''),
      wa_number: formData.wa_number.replace(/\D/g, '') || formData.phone.replace(/\D/g, ''),
      password: formData.password,
      referral_code: formData.referral_code || undefined,
    });
    setLoading(false);

    if (result.success) {
      setSuccess(true);
    } else {
      toast.error(result.error || "Pendaftaran gagal");
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Pendaftaran Berhasil!</CardTitle>
            <CardDescription className="text-base mt-2">
              Akun Anda telah dibuat dan sedang menunggu persetujuan admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="mb-2">📧 Kami akan mengirimkan email konfirmasi setelah akun Anda disetujui.</p>
              <p>⏰ Proses persetujuan biasanya memakan waktu 1-2 hari kerja.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={() => navigate("/agent/login")}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Kembali ke Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/">
            <img 
              src={musafarLogo} 
              alt="Musafar Tour" 
              className="h-12 mx-auto mb-4"
            />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Agent Portal</h1>
          <p className="text-muted-foreground">Daftar menjadi agent Musafar Tour</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Daftar Agent
            </CardTitle>
            <CardDescription>
              Isi formulir di bawah untuk mendaftar sebagai agent
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Nama lengkap Anda"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={loading}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="email@contoh.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="08123456789"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={loading}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* WhatsApp */}
              <div className="space-y-2">
                <Label htmlFor="wa_number">Nomor WhatsApp (opsional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="wa_number"
                    name="wa_number"
                    type="tel"
                    placeholder="Kosongkan jika sama dengan telepon"
                    value={formData.wa_number}
                    onChange={handleChange}
                    disabled={loading}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 8 karakter"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
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
                />
                <p className="text-xs text-muted-foreground">
                  Masukkan kode referral jika Anda direkomendasikan oleh agent lain
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
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

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Sudah punya akun? </span>
                <Link 
                  to="/agent/login" 
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <LogIn className="h-3 w-3" />
                  Masuk di sini
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Link 
            to="/" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Kembali ke halaman utama
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AgentRegister;
