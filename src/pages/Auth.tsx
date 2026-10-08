import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { safeAdminNext } from "@/lib/adminNext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import musafarLogo from "@/assets/musafar-logo.svg";
import { getSafeErrorMessage } from "@/lib/errorHandler";
import { z } from "zod";
import { AuthLayout } from "@/components/layout/AuthLayout";

// Schema untuk login - hanya validasi dasar (tidak enforce aturan password baru)
const loginSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Email tidak valid" })
    .max(255, { message: "Email terlalu panjang" }),
  password: z.string()
    .min(1, { message: "Password tidak boleh kosong" })
    .max(100, { message: "Password terlalu panjang" })
});

const emailSchema = z.string()
  .trim()
  .email({ message: "Email tidak valid" })
  .max(255, { message: "Email terlalu panjang" });

const passwordSchema = z.string()
  .min(8, { message: "Password minimal 8 karakter" })
  .max(100, { message: "Password terlalu panjang" })
  .regex(/[A-Z]/, { message: "Password harus mengandung huruf besar" })
  .regex(/[a-z]/, { message: "Password harus mengandung huruf kecil" })
  .regex(/[0-9]/, { message: "Password harus mengandung angka" });

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Where the admin was headed before the login screen (internal /admin paths only; anything else is ignored)
  const nextPath = safeAdminNext(searchParams.get("next"));
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    // Check for password recovery from URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (accessToken && (type === 'recovery' || type === 'invite')) {
      setIsRecoveryMode(true);
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Gunakan loginSchema - tidak enforce aturan password baru untuk akun lama
      const validatedData = loginSchema.parse({ email, password });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) throw error;

      if (data.session && data.user) {
        // Check if user has admin role first
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle();

        // If they are an admin, allow login (skip agent check)
        if (!adminRole) {
          // If not admin, check if user is an agent - agents should use agent portal
          const { data: agentData } = await supabase
            .from('agents')
            .select('id')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (agentData) {
            await supabase.auth.signOut();
            toast({
              title: "Dialihkan ke Portal Agent",
              description: "Ini adalah akun Agent. Mengalihkan ke halaman login Agent...",
            });
            navigate('/agent/login');
            return;
          }

          // If neither admin nor agent
          await supabase.auth.signOut();
          toast({
            title: "Akses Ditolak",
            description: "Akun ini tidak memiliki akses admin",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Login berhasil!",
          description: "Selamat datang kembali",
        });
        navigate(nextPath ?? "/admin");
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validasi gagal",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login gagal",
          description: getSafeErrorMessage(error),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };


  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedEmail = emailSchema.parse(email);
      
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      toast({
        title: "Email terkirim!",
        description: "Silakan cek email Anda untuk link reset password.",
      });
      setShowForgotPassword(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validasi gagal",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Gagal mengirim email",
          description: getSafeErrorMessage(error),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate password
      const validatedPassword = passwordSchema.parse(password);
      
      // Check if passwords match
      if (password !== confirmPassword) {
        throw new Error("Password tidak cocok");
      }
      
      const { error } = await supabase.auth.updateUser({
        password: validatedPassword,
      });

      if (error) throw error;

      toast({
        title: "Password berhasil diubah!",
        description: "Silakan login dengan password baru Anda.",
      });
      
      // Sign out and redirect to login
      await supabase.auth.signOut();
      setIsRecoveryMode(false);
      setPassword("");
      setConfirmPassword("");
      
      // Clear URL hash
      window.history.replaceState(null, '', window.location.pathname);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validasi gagal",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Gagal mengubah password",
          description: error.message || getSafeErrorMessage(error),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Recovery mode - show reset password form
  if (isRecoveryMode) {
    return (
      <AuthLayout 
        title="Reset Password Admin"
        subtitle="Masukkan password baru Anda di bawah ini."
      >
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Password Baru</Label>
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
                placeholder="Minimal 8 karakter"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Konfirmasi Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pr-10"
                placeholder="Ulangi password baru"
              />
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1 my-4">
            <p>Password harus memenuhi kriteria:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li className={password.length >= 8 ? "text-status-ok-fg" : ""}>Minimal 8 karakter</li>
              <li className={/[A-Z]/.test(password) ? "text-status-ok-fg" : ""}>Mengandung huruf besar</li>
              <li className={/[a-z]/.test(password) ? "text-status-ok-fg" : ""}>Mengandung huruf kecil</li>
              <li className={/[0-9]/.test(password) ? "text-status-ok-fg" : ""}>Mengandung angka</li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-3 mt-6">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Password Baru
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setIsRecoveryMode(false);
                setPassword("");
                setConfirmPassword("");
                window.history.replaceState(null, '', window.location.pathname);
              }}
            >
              Batal
            </Button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Admin Portal"
      subtitle="Kelola paket umroh dan konten website Musafar Tour."
    >
      {showForgotPassword ? (
        <div className="space-y-4">
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="admin@musafartour.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kirim Link Reset
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowForgotPassword(false)}
              >
                Kembali ke Login
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sign-in only: team members get accounts through the invite on the admin Team
              page, so a public sign-up form and the first-admin setup link aren't needed here.
              /admin/setup is still reachable directly and gated by its secret code. */}
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="admin@musafartour.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-sm"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Lupa password?
                  </Button>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Masuk
                  </Button>
                </form>
        </div>
      )}
    </AuthLayout>
  );
};

export default Auth;