import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Mail, KeyRound, Eye, EyeOff, Shield } from "lucide-react";
import { z } from "zod";

const passwordSchema = z.string()
  .min(8, { message: "Password minimal 8 karakter" })
  .max(100, { message: "Password terlalu panjang" })
  .regex(/[A-Z]/, { message: "Password harus mengandung huruf besar" })
  .regex(/[a-z]/, { message: "Password harus mengandung huruf kecil" })
  .regex(/[0-9]/, { message: "Password harus mengandung angka" });

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate password
      passwordSchema.parse(newPassword);

      // Check if passwords match
      if (newPassword !== confirmPassword) {
        throw new Error("Password tidak cocok");
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password berhasil diubah!",
        description: "Password baru Anda telah disimpan.",
      });

      setNewPassword("");
      setConfirmPassword("");
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
          description: error.message || "Terjadi kesalahan saat mengubah password.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordEmail = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Email terkirim!",
        description: "Cek email Anda untuk link reset password.",
      });
    } catch (error: any) {
      toast({
        title: "Gagal mengirim email",
        description: error.message || "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil Admin</h1>
        <p className="text-muted-foreground">Kelola informasi akun Anda</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informasi Akun
            </CardTitle>
            <CardDescription>Detail akun Anda saat ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Email</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{user?.email}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Role</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Administrator</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">User ID</Label>
              <div className="p-3 bg-muted rounded-md">
                <span className="font-mono text-xs text-muted-foreground break-all">{user?.id}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Ubah Password
            </CardTitle>
            <CardDescription>
              Password terenkripsi dan tidak bisa dilihat. Gunakan form ini untuk mengubah password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Password Baru</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru"
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

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Konfirmasi Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                />
              </div>

              {/* Password requirements */}
              <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-md">
                <p className="font-medium">Password harus memenuhi:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li className={newPassword.length >= 8 ? "text-green-600" : ""}>
                    Minimal 8 karakter
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? "text-green-600" : ""}>
                    Mengandung huruf besar
                  </li>
                  <li className={/[a-z]/.test(newPassword) ? "text-green-600" : ""}>
                    Mengandung huruf kecil
                  </li>
                  <li className={/[0-9]/.test(newPassword) ? "text-green-600" : ""}>
                    Mengandung angka
                  </li>
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={loading || !newPassword || !confirmPassword}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Password Baru
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Atau kirim link reset password ke email Anda:
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResetPasswordEmail}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kirim Link Reset via Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
