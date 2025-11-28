import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import musafarLogo from "@/assets/musafar-logo.svg";
import { getSafeErrorMessage } from "@/lib/errorHandler";
import { z } from "zod";

const authSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Email tidak valid" })
    .max(255, { message: "Email terlalu panjang" }),
  password: z.string()
    .min(8, { message: "Password minimal 8 karakter" })
    .max(100, { message: "Password terlalu panjang" })
    .regex(/[A-Z]/, { message: "Password harus mengandung huruf besar" })
    .regex(/[a-z]/, { message: "Password harus mengandung huruf kecil" })
    .regex(/[0-9]/, { message: "Password harus mengandung angka" })
});

const emailSchema = z.string()
  .trim()
  .email({ message: "Email tidak valid" })
  .max(255, { message: "Email terlalu panjang" });

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = authSchema.parse({ email, password });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) throw error;

      if (data.session) {
        toast({
          title: "Login berhasil!",
          description: "Selamat datang kembali",
        });
        navigate("/admin");
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = authSchema.parse({ email, password });
      
      const redirectUrl = `${window.location.origin}/admin`;
      
      const { data, error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      toast({
        title: "Registrasi berhasil!",
        description: "Akun Anda telah dibuat. Silakan login.",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validasi gagal",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registrasi gagal",
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
      // Validate email
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate password
      const passwordSchema = z.string()
        .min(8, { message: "Password minimal 8 karakter" })
        .max(100, { message: "Password terlalu panjang" })
        .regex(/[A-Z]/, { message: "Password harus mengandung huruf besar" })
        .regex(/[a-z]/, { message: "Password harus mengandung huruf kecil" })
        .regex(/[0-9]/, { message: "Password harus mengandung angka" });
      
      const validatedPassword = passwordSchema.parse(password);
      
      const { error } = await supabase.auth.updateUser({
        password: validatedPassword,
      });

      if (error) throw error;

      toast({
        title: "Password berhasil diubah!",
        description: "Silakan login dengan password baru Anda.",
      });
      navigate("/admin");
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
          description: getSafeErrorMessage(error),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={musafarLogo} alt="Musafar Tour" className="h-12 mx-auto mb-4" />
          <CardTitle>Admin Portal</CardTitle>
          <CardDescription>Kelola paket umroh dan konten website</CardDescription>
        </CardHeader>
        <CardContent>
          {showForgotPassword ? (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Reset Password</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Masukkan email Anda untuk menerima link reset password
                </p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-4">
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
              </form>
            </div>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
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
                    Sign In
                  </Button>
                </form>
              </TabsContent>
            
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="admin@musafartour.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
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
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign Up
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          <div className="mt-4 pt-4 border-t text-center">
            <Link to="/admin/setup">
              <Button variant="ghost" size="sm" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Setup Admin Pertama
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-2">
              Belum ada admin? Setup admin pertama dengan kode rahasia
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
