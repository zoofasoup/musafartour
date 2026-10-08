import { useEffect, useRef, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { translateAuthError } from "@/lib/authErrors";
import { AGENT_CS_WHATSAPP } from "@/lib/agentSupport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COOLDOWN_SECONDS = 60;

interface ResendConfirmationProps {
  /** Known from the form the person just filled in. When missing, the person types it here. */
  email?: string;
  className?: string;
}

/**
 * Sends the sign-up confirmation email again. Used where a confirmation dead end used to be:
 * the register success screen, "Email belum dikonfirmasi" at login and an expired link.
 * The email lives in component state only (never stored). The answer is the same whether or not the
 * address is registered, so this cannot be used to find out who has an account.
 */
export const ResendConfirmation = ({ email: knownEmail, className }: ResendConfirmationProps) => {
  const [typedEmail, setTypedEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const email = (knownEmail ?? typedEmail).trim();

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const resend = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Isi email dengan format yang benar, misalnya nama@email.com.");
      return;
    }
    setSending(true);
    setError(null);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin + "/agent/login" },
    });
    setSending(false);
    if (resendError) {
      setError(translateAuthError(resendError));
      // A rate limit means an email went out a moment ago: still hold the button for a minute.
      if (resendError.status === 429) startCooldown();
      return;
    }
    setSent(true);
    startCooldown();
  };

  return (
    <div className={className}>
      {knownEmail === undefined && (
        <div className="mb-3 space-y-2">
          <Label htmlFor="resend-email">Email yang kamu pakai untuk mendaftar</Label>
          <Input
            id="resend-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={typedEmail}
            onChange={(e) => setTypedEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby="resend-status"
          />
        </div>
      )}

      <Button type="button" variant="outline" className="w-full" onClick={resend} disabled={sending || cooldown > 0}>
        {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Mail className="mr-2 h-4 w-4" aria-hidden />}
        {cooldown > 0 ? `Kirim ulang email konfirmasi (${cooldown} dtk)` : "Kirim ulang email konfirmasi"}
      </Button>

      <div id="resend-status" role="status" aria-live="polite" className="mt-3 text-sm">
        {error && <p className="text-status-bad-fg">{error}</p>}
        {sent && !error && (
          <p className="text-muted-foreground">
            Kalau email itu terdaftar dan belum dikonfirmasi, email baru sudah kami kirim. Buka yang paling baru, lalu cek folder spam kalau belum terlihat.
          </p>
        )}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Tautan konfirmasi hanya berlaku sebentar. Kalau tautannya sudah kedaluwarsa atau tidak bisa dibuka, kirim ulang di sini lalu pakai tautan di email terbaru; tautan lama tidak berlaku lagi. Sudah dicoba tapi email tidak datang?{" "}
        <a
          href={`https://wa.me/${AGENT_CS_WHATSAPP}?text=${encodeURIComponent("Halo PIC Agen Musafar, email konfirmasi akun agen saya belum masuk. Mohon dibantu.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-foreground underline underline-offset-2"
        >
          Hubungi PIC Agen lewat WhatsApp
        </a>
        .
      </p>
    </div>
  );
};
