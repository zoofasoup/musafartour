import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Mail, KeyRound, Eye, EyeOff, Shield, Save } from "lucide-react";
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
  const [profileLoading, setProfileLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || "");
  const [avatarEmoji, setAvatarEmoji] = useState(user?.user_metadata?.avatar_emoji || "😎");

  const emojis = ["😎", "🤠", "🤖", "👽", "👻", "🦊", "🦁", "🐯", "🐼", "🐨", "🐸", "🚀", "👑", "💎", "🎯", "🎲"];

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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_emoji: avatarEmoji }
      });
      if (error) throw error;
      toast({
        title: "Profil berhasil diperbarui!",
        description: "Nama Anda telah disimpan.",
      });
    } catch (error: any) {
      toast({
        title: "Gagal memperbarui profil",
        description: error.message || "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
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
          <CardContent className="space-y-6">
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-semibold text-slate-700">Nama Lengkap</Label>
                <Input 
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masukkan nama Anda"
                  className="max-w-md"
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Emoji Profil</Label>
                <div className="flex flex-wrap gap-2.5">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatarEmoji(emoji)}
                      className={`w-10 h-10 rounded-xl cursor-pointer transition-all flex items-center justify-center text-xl
                        ${avatarEmoji === emoji ? 'bg-slate-100 ring-2 ring-slate-800 scale-110 shadow-sm' : 'hover:bg-slate-50 hover:scale-110'}
                      `}
                      title="Pilih emoji"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">Emoji ini akan ditampilkan sebagai ikon profil Anda di sidebar.</p>
              </div>

              <Button type="submit" disabled={profileLoading} className="w-full max-w-md">
                {profileLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Simpan Perubahan
              </Button>
            </form>

            <div className="pt-5 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email Terdaftar</Label>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {user?.email}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Hak Akses</Label>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <Shield className="h-3.5 w-3.5 text-slate-400" />
                    Administrator
                  </div>
                </div>
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
