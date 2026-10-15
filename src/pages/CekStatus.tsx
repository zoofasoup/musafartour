import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CalendarDays, Loader2, Search, Users } from "lucide-react";
import { PkgPage, pkgFocus, pkgInput, pkgLabel } from "@/components/PkgPage";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import type { StatusKind } from "@/components/ui/status-badge";
import { Turnstile, turnstileSiteKey } from "@/components/daftar/Turnstile";
import { useHomepageData } from "@/hooks/useHomepageData";
import { DP_MIN_PER_PAX, LUNAS_DAYS_BEFORE_DEPARTURE, PT_ACCOUNT_HOLDER, rupiah } from "@/lib/jamaah";
import { normalizePhone } from "@/lib/intakeForm";
import { formatWhatsAppUrl } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { formatPhone } from "@/lib/phone";

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
    title: "Menunggu UC",
    text: () => "Pendaftaranmu sudah masuk. Umroh Consultant (UC) sedang memeriksa data dan seat, lalu akan menghubungi kamu lewat WhatsApp di nomor yang kamu isi.",
  },
  accepted: {
    kind: "warn",
    title: "Diterima UC, menunggu DP",
    text: () =>
      `UC sudah menerima pendaftaranmu. Langkah berikutnya: transfer DP ${rupiah(DP_MIN_PER_PAX)} per orang ke rekening ${PT_ACCOUNT_HOLDER}. Setelah DP, kamu mendapat link untuk melengkapi data paspor dan dokumen.`,
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
    text: () => "Pembayaran sudah lunas. Terima kasih. Kalau ada pertanyaan soal keberangkatan, hubungi UC lewat WhatsApp.",
  },
  rejected: {
    kind: "bad",
    title: "Belum bisa diproses",
    text: () => "UC belum bisa memproses pendaftaran ini. Hubungi UC lewat WhatsApp untuk tahu alasannya dan langkah berikutnya.",
  },
  cancelled: {
    kind: "mute",
    title: "Dibatalkan",
    text: () => "Pendaftaran ini sudah dibatalkan. Hubungi UC lewat WhatsApp kalau kamu butuh rinciannya.",
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
        setServerError(data?.error || "Status belum bisa dicek. Coba lagi sebentar lagi atau hubungi UC lewat WhatsApp.");
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
  // Link pribadi baru ada setelah DP; sebelum itu jangan suruh buka link.
  const dataPending = !!result?.data_pending && (result.stage === "dp_received" || result.stage === "lunas");
  const waMessage = result
    ? `Halo Musafar Tour, saya mau tanya soal pendaftaran umroh.\nKode: ${result.code}`
    : "Halo Musafar Tour, saya mau tanya soal pendaftaran umroh saya.";

  return (
    <PkgPage title="Cek status pendaftaran." intro="Masukkan kode pendaftaran dan nomor WhatsAppmu.">
      <PkgPanel tone="cream" last={!result}>
        <form onSubmit={onSubmit} noValidate className="mx-auto max-w-xl space-y-5">
          <div>
            <label htmlFor="cek-code" className={pkgLabel}>Kode pendaftaran</label>
            <input
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
              className={`${pkgInput} uppercase tracking-wider`}
            />
            {errors.code && <FieldError id="cek-code-err" message={errors.code} />}
          </div>
          <div>
            <label htmlFor="cek-phone" className={pkgLabel}>Nomor WhatsApp</label>
            <input
              id="cek-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0812 3456 7890"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "cek-phone-err" : undefined}
              className={pkgInput}
            />
            {errors.phone && <FieldError id="cek-phone-err" message={errors.phone} />}
          </div>

          <Turnstile onToken={setToken} resetKey={resetKey} />

          {serverError && <FieldError id="cek-server-err" message={serverError} />}

          <button type="submit" disabled={sending || siteKeyMissing} className={`pkg-press pkg-glass-red pkg-label inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full px-7 disabled:opacity-50 ${pkgFocus}`}>
            {sending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Search className="h-5 w-5" aria-hidden />}
            {sending ? "Memeriksa..." : "Cek status"}
          </button>
          <p className="text-[15px] text-pkg-fg-2">
            Belum mendaftar? <Link to="/paket-umroh" className="font-medium text-pkg-fg underline underline-offset-4">Lihat paket umroh</Link>
          </p>
        </form>
      </PkgPanel>

      {result && stage && (
        <PkgPanel tone="cream-2" last>
          <section className="mx-auto max-w-xl" aria-live="polite" aria-labelledby="cek-hasil">
            <p className="pkg-caption text-pkg-fg-3">Kode {result.code}</p>
            <h2 id="cek-hasil" className="pkg-h2 mt-1">{result.package_name}</h2>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Pill kind={stage.kind}>{stage.title}</Pill>
              {dataPending && <Pill>Data belum lengkap</Pill>}
              {result.payment_checking && <Pill>Pembayaran sedang diperiksa</Pill>}
            </div>
            <p className="mt-5 text-[17px] leading-[1.55] text-pkg-fg-2">{stage.text(result)}</p>

            {dataPending && (
              <div className="mt-5">
                <p className="text-[17px] text-pkg-fg">Data paspor dan dokumen belum lengkap</p>
                <p className="mt-1 text-[15px] leading-[1.5] text-pkg-fg-2">
                  Buka link pribadi untuk melengkapi data yang dikirim UC lewat WhatsApp. Link hilang atau belum menerima? Minta UC mengirim ulang.
                </p>
              </div>
            )}

            <dl className="mt-6 space-y-2 text-[15px] text-pkg-fg-2">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                <dt className="sr-only">Berangkat</dt>
                <dd>Berangkat {fmtDate(result.departure_date)}</dd>
              </div>
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 shrink-0" aria-hidden />
                <dt className="sr-only">Peserta</dt>
                <dd>{result.people_count} orang</dd>
              </div>
            </dl>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href={formatWhatsAppUrl(whatsapp, waMessage)} target="_blank" rel="noopener noreferrer" className={`pkg-press pkg-glass-red pkg-label inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-7 ${pkgFocus}`}>
                <WhatsAppIcon className="h-5 w-5" /> Chat UC
              </a>
              {(result.stage === "accepted" || result.stage === "dp_received") && (
                <Link to="/cara-bayar" className={`pkg-press pkg-glass pkg-label inline-flex h-14 items-center justify-center rounded-full px-7 ${pkgFocus}`}>
                  Lihat cara bayar
                </Link>
              )}
            </div>
          </section>
        </PkgPanel>
      )}
    </PkgPage>
  );
}

/** Small status label: neutral cream, dark red for a problem, never a loud colour. */
function Pill({ kind, children }: { kind?: StatusKind; children: React.ReactNode }) {
  return <span className={`pkg-label inline-block rounded-full bg-pkg-cream px-3 py-1 ${kind === "bad" ? "text-pkg-red-deep" : "text-pkg-fg"}`}>{children}</span>;
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="mt-2 flex items-start gap-1.5 text-[14px] leading-[1.4] text-pkg-red-deep">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {message}
    </p>
  );
}
