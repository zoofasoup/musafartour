import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, Send, RotateCcw } from "lucide-react";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import musafarLogo from "@/assets/musafar-logo-dark.svg";
import { z } from "zod";

const leadSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  whatsapp: z
    .string()
    .trim()
    .min(10, "Nomor WhatsApp minimal 10 digit")
    .max(15)
    .regex(/^[0-9+]+$/, "Nomor WhatsApp hanya boleh angka"),
});

const BoothLead = () => {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [errors, setErrors] = useState<{ name?: string; whatsapp?: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = leadSchema.safeParse({ name, whatsapp });
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof typeof errors;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSending(true);

    const message = `Assalamu'alaikum, saya ${result.data.name} (WA: ${result.data.whatsapp}). Saya baru saja mengunjungi booth Musafar Tour dan tertarik dengan paket umroh. Mohon informasi lebih lanjut. Terima kasih!`;

    await redirectToWhatsApp(message);

    setSending(false);
    setSubmitted(true);
  };

  const handleReset = () => {
    setName("");
    setWhatsapp("");
    setErrors({});
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-card">
        <CardHeader className="text-center pb-4">
          <img
            src={musafarLogo}
            alt="Musafar Tour"
            className="h-10 mx-auto mb-4"
            width="200"
            height="40"
          />
          <CardTitle className="text-2xl tracking-tight font-bold">
            {submitted ? "Terima Kasih! 🤍" : "Daftar Sekarang"}
          </CardTitle>
          <CardDescription className="text-sm leading-snug">
            {submitted
              ? `${name}, tim kami akan segera menghubungi Anda via WhatsApp.`
              : "Isi data singkat, tim kami langsung follow up via WhatsApp."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <div className="flex flex-col items-center gap-6 py-4">
              <CheckCircle className="w-16 h-16 text-primary" />
              <p className="text-center text-muted-foreground text-sm">
                Pesan otomatis telah dikirim ke tim CS kami. Anda juga bisa langsung klik tombol di bawah untuk chat.
              </p>
              <Button onClick={handleReset} variant="outline" className="gap-2 w-full">
                <RotateCcw className="w-4 h-4" />
                Input Lead Baru
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nama Lengkap
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ahmad Fauzi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  autoFocus
                  className="h-12 text-base"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-sm font-medium">
                  Nomor WhatsApp
                </Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="08123456789"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  autoComplete="tel"
                  className="h-12 text-base"
                />
                {errors.whatsapp && (
                  <p className="text-xs text-destructive">{errors.whatsapp}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={sending}
                className="w-full h-12 text-base font-semibold gap-2"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Kirim & Hubungi via WhatsApp
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BoothLead;
