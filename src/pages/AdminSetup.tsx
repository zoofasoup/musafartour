import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";
import musafarLogo from "@/assets/musafar-logo.svg";

// Validation schema matching server-side validation in bootstrap-admin
const setupSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Email tidak valid" })
    .max(255, { message: "Email terlalu panjang" }),
  setupCode: z.string()
    .trim()
    .min(8, { message: "Kode setup minimal 8 karakter" })
    .max(100, { message: "Kode setup terlalu panjang" })
});

const AdminSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [setupCode, setSetupCode] = useState("");

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs before sending to server
      const validationResult = setupSchema.safeParse({ email, setupCode });
      
      if (!validationResult.success) {
        toast({
          title: "Validasi gagal",
          description: validationResult.error.errors[0].message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('bootstrap-admin', {
        body: validationResult.data
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Setup gagal",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "✅ Admin berhasil dibuat!",
        description: "Silakan login dengan akun Anda untuk mengakses admin panel.",
      });
      
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Setup gagal",
        description: error.message || "Terjadi kesalahan saat setup admin",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={musafarLogo} alt="Musafar Tour" className="h-12 mx-auto mb-4" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <CardTitle>Setup Admin Pertama</CardTitle>
          </div>
          <CardDescription>
            Gunakan kode rahasia untuk membuat admin pertama. Fitur ini hanya bisa digunakan sekali.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Akun</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@musafartour.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
              />
              <p className="text-xs text-muted-foreground">
                Email akun yang sudah terdaftar (sign up dulu di /auth jika belum punya)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="setupCode">Kode Setup Rahasia</Label>
              <Input
                id="setupCode"
                type="password"
                placeholder="Masukkan kode setup"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value)}
                required
                minLength={8}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Kode rahasia yang Anda buat saat setup (minimal 8 karakter)
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buat Admin Pertama
            </Button>

            <div className="pt-4 space-y-2 text-center">
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/auth")}
              >
                Kembali ke Login
              </Button>
              <p className="text-xs text-muted-foreground">
                Sudah punya akun admin? Login di halaman Auth
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSetup;