import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound } from "lucide-react";
import { translateAuthError } from "@/lib/authErrors";
import musafarLogo from "@/assets/musafar-logo.svg";

// Internal paths the page may send the user to after saving the password (no open redirect:
// anything not in this list is ignored and the default destination is used).
const ALLOWED_NEXT = ["/agent/login", "/auth"];

const SetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedNext = searchParams.get("next");
  const nextPath = requestedNext && ALLOWED_NEXT.includes(requestedNext) ? requestedNext : null;
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    // Listen for auth state changes (Supabase parsing the URL hash)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setVerifying(false);
      }
    });

    const checkInitialSession = async () => {
      // If URL has access_token, wait for onAuthStateChange to handle it
      if (window.location.hash.includes('access_token')) {
        // Just wait, don't redirect yet
        return;
      }
      
      // If no token in URL, check if they already have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Sesi tidak valid",
          description: "Tautan tidak valid atau sudah kadaluarsa. Silakan minta undangan baru.",
          variant: "destructive"
        });
        navigate(nextPath ?? "/auth");
      } else {
        setVerifying(false);
      }
    };
    
    checkInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast, nextPath]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Password dan Konfirmasi Password tidak cocok.",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password harus memiliki minimal 6 karakter.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;

      toast({
        title: "Berhasil",
        description: nextPath === "/agent/login" ? "Password Anda berhasil disimpan." : "Password Anda berhasil dibuat! Mengalihkan ke dashboard...",
      });
      
      // Allow-listed `next` (e.g. password reset from the agent portal), otherwise admin dashboard
      navigate(nextPath ?? "/admin");
    } catch (error: any) {
      toast({
        title: "Gagal membuat password",
        description: translateAuthError(error),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center pb-6">
          <img src={musafarLogo} alt="Musafar Tour" className="h-12 mx-auto mb-4" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <KeyRound className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Buat Password</CardTitle>
          </div>
          <CardDescription>
            {nextPath === "/agent/login"
              ? "Masukkan password baru untuk akun Anda."
              : "Selamat datang di tim Musafar Tour! Silakan buat password untuk akun Anda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password Baru</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Ulangi password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full h-12 text-md mt-6" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan & Masuk"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetPassword;
