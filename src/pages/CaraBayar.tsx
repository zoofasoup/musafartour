import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Banknote, CalendarCheck, Check, Copy, Info, Landmark, MessageCircle, Repeat, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useHomepageData } from "@/hooks/useHomepageData";
import { DP_MIN_PER_PAX, LUNAS_DAYS_BEFORE_DEPARTURE, PT_ACCOUNTS, PT_ACCOUNT_HOLDER, rupiah } from "@/lib/jamaah";
import { formatWhatsAppUrl } from "@/lib/utils";

const FALLBACK_WHATSAPP = "6281917403797";

const STEPS = [
  {
    icon: Banknote,
    title: `DP ${rupiah(DP_MIN_PER_PAX)} per orang`,
    text: "Setelah CS menerima pendaftaranmu, transfer DP untuk mengamankan seat.",
    badge: "DP tidak dapat dikembalikan",
  },
  {
    icon: Repeat,
    title: "Cicilan bebas",
    text: "Sisanya bisa kamu bayar kapan saja dan berapa saja. Tidak ada jadwal angsuran tetap.",
  },
  {
    icon: CalendarCheck,
    title: `Lunas paling lambat H-${LUNAS_DAYS_BEFORE_DEPARTURE}`,
    text: `Seluruh pembayaran harus lunas ${LUNAS_DAYS_BEFORE_DEPARTURE} hari sebelum tanggal berangkat.`,
  },
] as const;

function CopyNumber({ value, bank }: { value: string; bank: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 gap-2"
      aria-label={`Salin nomor rekening ${bank}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success(`Nomor rekening ${bank} disalin`);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Tidak bisa menyalin. Salin nomornya secara manual.");
        }
      }}
    >
      {done ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {done ? "Tersalin" : "Salin"}
    </Button>
  );
}

export default function CaraBayar() {
  const { websiteSettings } = useHomepageData();
  const whatsapp = websiteSettings?.whatsapp_number || FALLBACK_WHATSAPP;
  const holder = websiteSettings?.company_legal_name || PT_ACCOUNT_HOLDER;

  // Account numbers live in the code (PT_ACCOUNTS); the bank names in website_settings decide which ones are shown.
  const bankNames = (websiteSettings?.bank_names ?? []).map((b) => b.trim().toUpperCase()).filter(Boolean);
  const accounts = bankNames.length ? PT_ACCOUNTS.filter((a) => bankNames.includes(a.code)) : [...PT_ACCOUNTS];
  const namesWithoutNumber = bankNames.filter((b) => !PT_ACCOUNTS.some((a) => a.code === b));

  const proofMessage = "Halo Musafar Tour, saya mau kirim bukti transfer.\nKode pendaftaran: \nNama: \nNominal: ";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Cara bayar</h1>
          <p className="mt-2 text-muted-foreground">
            Tiga langkah, semuanya lewat transfer ke rekening PT. Kamu bisa mulai setelah mendaftar dan CS menerima pendaftaranmu.
          </p>
        </header>

        <ol className="space-y-4">
          {STEPS.map(({ icon: Icon, title, text, ...rest }, i) => (
            <li key={title} className="flex items-start gap-4 rounded-2xl border bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-muted-foreground">Langkah {i + 1}</p>
                <h2 className="text-lg font-bold text-foreground">{title}</h2>
                <p className="mt-1 text-foreground">{text}</p>
                {"badge" in rest && (
                  <StatusBadge kind="warn" className="mt-2">
                    {rest.badge}
                  </StatusBadge>
                )}
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-8" aria-labelledby="rekening">
          <h2 id="rekening" className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Landmark className="h-6 w-6 text-brand" aria-hidden /> Rekening resmi
          </h2>
          <p className="mt-2 text-foreground">
            Semua pembayaran hanya ke rekening atas nama <strong>{holder}</strong>. Jangan transfer ke rekening pribadi, termasuk rekening agen atau staf.
          </p>

          {accounts.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {accounts.map((a) => (
                <li key={a.code} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Bank {a.code}</p>
                    <p className="text-xl font-bold tracking-wide text-foreground">{a.number}</p>
                    <p className="text-sm text-muted-foreground">a.n. {holder}</p>
                  </div>
                  <CopyNumber value={a.number} bank={a.code} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl border bg-white p-4 text-foreground shadow-sm">
              Bank yang dipakai: <strong>{(namesWithoutNumber.length ? namesWithoutNumber : bankNames).join(", ") || "tanyakan ke CS"}</strong>. Minta nomor rekeningnya ke CS lewat WhatsApp.
            </p>
          )}
          {accounts.length > 0 && namesWithoutNumber.length > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">Untuk {namesWithoutNumber.join(", ")}, minta nomor rekeningnya ke CS.</p>
          )}
        </section>

        <section className="mt-8 rounded-2xl border bg-white p-5 shadow-sm" aria-labelledby="bukti">
          <h2 id="bukti" className="flex items-center gap-2 text-xl font-bold text-foreground">
            <ShieldCheck className="h-5 w-5 text-brand" aria-hidden /> Kirim bukti transfer
          </h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-foreground">
            <li>Simpan bukti transfer (tangkapan layar atau foto struk).</li>
            <li>Kirim ke CS lewat WhatsApp, sebut kode pendaftaran dan namamu.</li>
            <li>CS memeriksa transfernya di rekening PT, lalu mencatatnya. Kamu bisa melihat tahapnya di Cek status.</li>
          </ol>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button variant="brand" asChild className="h-12 gap-2 px-6 text-base font-bold">
              <a href={formatWhatsAppUrl(whatsapp, proofMessage)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" aria-hidden /> Kirim lewat WhatsApp
              </a>
            </Button>
            <Button variant="outline" asChild className="h-12 px-6 text-base">
              <Link to="/cek-status">Cek status pendaftaran</Link>
            </Button>
          </div>
        </section>

        <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            DP tidak dapat dikembalikan. Rincian lengkap ada di <Link to="/syarat-umroh" className="font-semibold text-foreground underline underline-offset-4">Persyaratan dan Term of Service</Link>. Ada pertanyaan? Tanyakan ke CS sebelum transfer.
          </span>
        </p>
      </main>
      <Footer />
    </div>
  );
}
