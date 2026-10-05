import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailCheck, ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { translateAuthError } from "@/lib/authErrors";

const AgentForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Masukkan alamat email yang valid");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(value, {
        redirectTo: `${window.location.origin}/set-password?next=/agent/login`,
      });
      // Only surface errors that say nothing about the account (limit, network). Every other
      // outcome shows the same message, so the form cannot be used to find out which emails exist.
      if (error && (error.status === 429 || /rate limit|too many|for security purposes|fetch|network/i.test(error.message))) {
        toast.error(translateAuthError(error));
        return;
      }
      if (error) console.error("Reset password error:", error);
      setSent(true);
    } catch (err) {
      toast.error(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title="Cek Email Anda"
        subtitle="Jika email tersebut terdaftar, kami sudah mengirim tautan untuk membuat password baru."
      >
        <div className="flex gap-3 rounded-lg border bg-muted/50 p-4">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Buka email dari kami dan klik tautannya. Belum ada? Tunggu beberapa menit dan cek folder spam.
          </p>
        </div>
        <Button className="mt-6 w-full" asChild>
          <Link to="/agent/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Login
          </Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Lupa Password"
      subtitle="Masukkan email akun agen Anda. Kami kirim tautan untuk membuat password baru."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Kirim Tautan
              </>
            )}
          </Button>
          <div className="text-center text-sm">
            <Link to="/agent/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              <ArrowLeft className="h-3 w-3" />
              Kembali ke login
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
};

export default AgentForgotPassword;
