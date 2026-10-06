import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CalendarDays, Loader2, MessageCircle, Search, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, type StatusKind } from "@/components/ui/status-badge";
import { Turnstile, turnstileSiteKey } from "@/components/daftar/Turnstile";
import { useHomepageData } from "@/hooks/useHomepageData";
import { DP_MIN_PER_PAX, LUNAS_DAYS_BEFORE_DEPARTURE, PT_ACCOUNT_HOLDER, rupiah } from "@/lib/jamaah";
import { normalizePhone } from "@/lib/intakeForm";
import { formatWhatsAppUrl } from "@/lib/utils";

const FALLBACK_WHATSAPP = "6281917403797";
const CODE_RE = /^MSF-?[A-Z2-9]{5}$/;

type Stage = "waiting_cs" | "rejected" | "accepted" | "dp_received" | "lunas" | "cancelled";

interface StatusResult {
  code: string;
  stage: Stage;
  label: string;
  package_name: string;
  departure_date: string;
  people_count: number;
  data_pending: boolean;
  payment_checking: boolean;
}

const fmtDate = (d: string) =>
  new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

const lunasDeadline = (d: string) => {
  const date = new Date(`${d.slice(0, 10)}T00:00:00`);
  date.setDate(date.getDate() - LUNAS_DAYS_BEFORE_DEPARTURE);
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

const STAGE: Record<Stage, { kind: StatusKind; title: string; text: (s: StatusResult) => string }> = {
  waiting_cs: {
    kind: "warn",
    title: "Menunggu CS",
    text: () => "Pendaftaranmu sudah masuk. CS sedang memeriksa data dan seat, lalu akan menghubungi kamu lewat WhatsApp di nomor yang kamu isi.",
  },
  accepted: {
    kind: "warn",
    title: "Diterima CS, menunggu DP",
    text: () =>
      `CS sudah menerima pendaftaranmu. Langkah berikutnya: transfer DP ${rupiah(DP_MIN_PER_PAX)} per orang ke rekening ${PT_ACCOUNT_HOLDER}. Setelah DP, kamu mendapat link untuk melengkapi data paspor dan dokumen.`,
  },
  dp_received: {
    kind: "info",
    title: "DP diterima",
    text: (s) =>
      `DP sudah kami terima. Sisanya bisa dicicil kapan saja dan berapa saja, dan harus lunas paling lambat ${lunasDeadline(s.departure_date)} (H-${LUNAS_DAYS_BEFORE_DEPARTURE}).`,
  },
  lunas: {
    kind: "ok",
    title: "Lunas",
    text: () => "Pembayaran sudah lunas. Terima kasih. Kalau ada pertanyaan soal keberangkatan, hubungi CS lewat WhatsApp.",
  },
  rejected: {
    kind: "bad",
    title: "Belum bisa diproses",
    text: () => "CS belum bisa memproses pendaftaran ini. Hubungi CS lewat WhatsApp untuk tahu alasannya dan langkah berikutnya.",
  },
  cancelled: {
    kind: "mute",
    title: "Dibatalkan",
    text: () => "Pendaftaran ini sudah dibatalkan. Hubungi CS lewat WhatsApp kalau kamu butuh rinciannya.",
  },
};

export default function CekStatus() {
  const { websiteSettings } = useHomepageData();
  const whatsapp = websiteSettings?.whatsapp_number || FALLBACK_WHATSAPP;

  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [errors, setErrors] = useState<{ code?: string; phone?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<StatusResult | null>(null);

  const siteKeyMissing = !turnstileSiteKey();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const cleanCode = code.trim().toUpperCase();
    const next: { code?: string; phone?: string } = {};
    if (!CODE_RE.test(cleanCode)) next.code = "Kode pendaftaran diawali MSF- lalu 5 huruf atau angka, contoh MSF-7K3QX.";
    if (!normalizePhone(phone)) next.phone = "Nomor WhatsApp belum benar. Contoh: 0812 3456 7890.";
    setErrors(next);
    setServerError(null);
    if (next.code || next.phone) return;
    if (!token) {
      setServerError("Verifikasi keamanan belum selesai. Tunggu sebentar, lalu coba lagi.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/cek-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: cleanCode, phone, turnstile_token: token }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; status?: StatusResult; error?: string } | null;
      if (!res.ok || !data?.ok || !data.status) {
        setResult(null);
        setServerError(data?.error || "Status belum bisa dicek. Coba lagi sebentar lagi atau hubungi CS lewat WhatsApp.");
      } else {
        setResult(data.status);
      }
    } catch {
      setResult(null);
      setServerError("Tidak bisa terhubung ke server. Periksa internet kamu, lalu coba lagi.");
    } finally {
      // A used Turnstile token cannot be sent twice.
      setToken(null);
      setResetKey((k) => k + 1);
      setSending(false);
    }
  };

  const stage = result ? STAGE[result.stage] : null;
  const waMessage = result
    ? `Halo Musafar Tour, saya mau tanya soal pendaftaran umroh.\nKode: ${result.code}`
    : "Halo Musafar Tour, saya mau tanya soal pendaftaran umroh saya.";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-28 sm:px-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Cek status pendaftaran</h1>
          <p className="mt-2 text-muted-foreground">
            Isi kode pendaftaran dan nomor WhatsApp yang kamu pakai saat mendaftar. Kode dikirim di layar setelah kamu mengirim form, dan bentuknya seperti MSF-7K3QX.
          </p>
        </header>

        <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <div>
            <Label htmlFor="cek-code">Kode pendaftaran</Label>
            <Input
              id="cek-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="MSF-7K3QX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={10}
              aria-invalid={!!errors.code}
              aria-describedby={errors.code ? "cek-code-err" : undefined}
              className="mt-1.5 uppercase tracking-wider"
            />
            {errors.code && <FieldError id="cek-code-err" message={errors.code} />}
          </div>
          <div>
            <Label htmlFor="cek-phone">Nomor WhatsApp</Label>
            <Input
              id="cek-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0812 3456 7890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "cek-phone-err" : undefined}
              className="mt-1.5"
            />
            {errors.phone && <FieldError id="cek-phone-err" message={errors.phone} />}
          </div>

          <Turnstile onToken={setToken} resetKey={resetKey} />

          {serverError && <FieldError id="cek-server-err" message={serverError} />}

          <Button type="submit" variant="brand" className="h-12 w-full gap-2 text-base font-bold" disabled={sending || siteKeyMissing}>
            {sending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Search className="h-5 w-5" aria-hidden />}
            {sending ? "Memeriksa..." : "Cek status"}
          </Button>
        </form>

        {result && stage && (
          <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm sm:p-6" aria-live="polite" aria-labelledby="cek-hasil">
            <p className="text-sm text-muted-foreground">Kode {result.code}</p>
            <h2 id="cek-hasil" className="mt-1 text-2xl font-bold text-foreground">{result.package_name}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge kind={stage.kind}>{stage.title}</StatusBadge>
              {result.data_pending && <StatusBadge kind="warn">Data belum lengkap</StatusBadge>}
              {result.payment_checking && <StatusBadge kind="info">Pembayaran sedang diperiksa</StatusBadge>}
            </div>
            <p className="mt-4 text-foreground">{stage.text(result)}</p>

            {result.data_pending && (
              <div className="mt-4 rounded-xl bg-status-warn-bg p-4 text-status-warn-fg">
                <p className="font-bold">Data paspor dan dokumen belum lengkap</p>
                <p className="mt-1 text-sm">
                  Buka link pribadi untuk melengkapi data yang dikirim CS lewat WhatsApp. Link hilang atau belum menerima? Minta CS mengirim ulang.
                </p>
              </div>
            )}

            <dl className="mt-5 space-y-2 border-t pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                <dt className="sr-only">Berangkat</dt>
                <dd>Berangkat {fmtDate(result.departure_date)}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0" aria-hidden />
                <dt className="sr-only">Peserta</dt>
                <dd>{result.people_count} orang</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button variant="brand" asChild className="h-12 gap-2 px-6 text-base font-bold">
                <a href={formatWhatsAppUrl(whatsapp, waMessage)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-5 w-5" aria-hidden /> Chat CS
                </a>
              </Button>
              {(result.stage === "accepted" || result.stage === "dp_received") && (
                <Button variant="outline" asChild className="h-12 px-6 text-base">
                  <Link to="/cara-bayar">Lihat cara bayar</Link>
                </Button>
              )}
            </div>
          </section>
        )}

        <p className="mt-6 text-sm text-muted-foreground">
          Belum mendaftar? <Link to="/paket-umroh" className="font-semibold text-foreground underline underline-offset-4">Lihat paket umroh</Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {message}
    </p>
  );
}
