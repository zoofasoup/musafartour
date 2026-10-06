import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ResendConfirmation } from "@/components/agent/ResendConfirmation";

const AgentLogin = () => {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, user, agent, loading: authLoading } = useAgentAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // The confirmation email is the first dead end of the journey: show a way out, not just a message.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [linkExpired, setLinkExpired] = useState(false);

  // Supabase sends an expired or already used confirmation link back here with #error_code=otp_expired.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = params.get("error_code");
    if (code === "otp_expired" || (params.get("error") === "access_denied" && code)) {
      setLinkExpired(true);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  // Handle redirect after Google OAuth
  useEffect(() => {
    if (!authLoading && user && agent) {
      navigate("/agent/dashboard");
    }
  }, [authLoading, user, agent, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Mohon isi email dan password");
      return;
    }

    setUnconfirmedEmail(null);
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.success) {
      toast.success("Login berhasil!");
      navigate("/agent/dashboard");
    } else if (result.needsEmailConfirmation) {
      setUnconfirmedEmail(email.trim());
    } else {
      toast.error(result.error || "Login gagal");
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    
    if (!result.success) {
      toast.error(result.error || "Login dengan Google gagal");
      setGoogleLoading(false);
    }
    // If successful, the page will redirect to Google OAuth
  };

  return (
    <AuthLayout
      title="Login Agent"
      subtitle="Masukkan email dan password untuk melanjutkan ke dasbor kamu."
    >
      {linkExpired && !unconfirmedEmail && (
        <div role="alert" className="mb-6 rounded-lg border border-status-warn-border bg-status-warn-bg p-4 text-status-warn-fg">
          <p className="flex items-start gap-2 text-sm font-semibold">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Tautan konfirmasi sudah kedaluwarsa atau sudah pernah dipakai.
          </p>
          <p className="mt-1 text-sm">Kalau akunmu sudah aktif, langsung masuk di bawah. Kalau belum, minta email konfirmasi baru.</p>
          <ResendConfirmation className="mt-3 rounded-md bg-card p-3 text-foreground" />
        </div>
      )}

      {unconfirmedEmail && (
        <div role="alert" className="mb-6 rounded-lg border border-status-warn-border bg-status-warn-bg p-4 text-status-warn-fg">
          <p className="flex items-start gap-2 text-sm font-semibold">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Email {unconfirmedEmail} belum dikonfirmasi.
          </p>
          <p className="mt-1 text-sm">Buka email konfirmasi yang kami kirim saat kamu mendaftar, lalu klik tautannya. Belum ada atau tautannya mati? Kirim ulang di bawah.</p>
          <ResendConfirmation email={unconfirmedEmail} className="mt-3 rounded-md bg-card p-3 text-foreground" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="agent@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                  inputMode="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember" className="text-sm cursor-pointer">
                    Ingat saya
                  </Label>
                </div>
                <Link 
                  to="/agent/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  Lupa password?
                </Link>
              </div>
        </div>

        <div className="flex flex-col gap-4 mt-6">
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
                    <LogIn className="mr-2 h-4 w-4" />
                    Masuk
                  </>
                )}
              </Button>

              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">atau</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Masuk dengan Google
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Belum punya akun? </span>
                <Link 
                  to="/agent/register" 
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <UserPlus className="h-3 w-3" />
                  Daftar sekarang
                </Link>
              </div>
        </div>
      </form>
    </AuthLayout>
  );
};

export default AgentLogin;
