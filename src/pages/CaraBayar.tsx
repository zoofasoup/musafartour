import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Banknote, CalendarCheck, Check, Copy, Info, Landmark, Repeat, ShieldCheck } from "lucide-react";
import { PkgPage, pkgFocus } from "@/components/PkgPage";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { useHomepageData } from "@/hooks/useHomepageData";
import { DP_MIN_PER_PAX, LUNAS_DAYS_BEFORE_DEPARTURE, PT_ACCOUNTS, PT_ACCOUNT_HOLDER, rupiah } from "@/lib/jamaah";
import { formatWhatsAppUrl } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

const FALLBACK_WHATSAPP = "6281917403797";

const STEPS = [
  {
    icon: Banknote,
    title: `DP ${rupiah(DP_MIN_PER_PAX)} per orang`,
    text: "Setelah UC menerima pendaftaranmu, transfer DP untuk mengamankan seat.",
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
    <button
      type="button"
      className={`pkg-press pkg-glass pkg-label inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-5 ${pkgFocus}`}
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
    </button>
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
    <PkgPage title="Cara bayar." intro="Tiga langkah, lewat transfer ke rekening PT. Mulai setelah Umroh Consultant (UC) menerima pendaftaranmu.">
      <PkgPanel tone="cream">
        <ol className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text, ...rest }, i) => (
            <li key={title} className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pkg-cream-2 text-pkg-red-deep">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="pkg-caption text-pkg-fg-3">Langkah {i + 1}</p>
                <h2 className="mt-0.5 text-[19px] font-normal leading-[1.2] tracking-[-0.02em] text-pkg-fg">{title}</h2>
                <p className="mt-1 text-[16px] leading-[1.5] text-pkg-fg-2">{text}</p>
                {"badge" in rest && <p className="pkg-label mt-2 inline-block rounded-full bg-pkg-cream-2 px-3 py-1 text-pkg-red-deep">{rest.badge}</p>}
              </div>
            </li>
          ))}
        </ol>
      </PkgPanel>

      <PkgPanel tone="cream-2">
        <section className="mx-auto max-w-3xl" aria-labelledby="rekening">
          <h2 id="rekening" className="pkg-h2">Rekening resmi</h2>
          <p className="mt-4 text-[17px] leading-[1.5] text-pkg-fg-2">
            Semua pembayaran hanya ke rekening atas nama <span className="text-pkg-fg">{holder}</span>. Jangan transfer ke rekening pribadi, termasuk rekening agen atau staf.
          </p>

          {accounts.length > 0 ? (
            <ul className="mt-6">
              {accounts.map((a, i) => (
                <li key={a.code} className={`flex items-center justify-between gap-4 py-5 ${i > 0 ? "border-t border-pkg-hair" : ""}`}>
                  <div className="min-w-0">
                    <p className="pkg-caption text-pkg-fg-3">Bank {a.code}</p>
                    <p className="mt-0.5 text-[24px] font-normal leading-tight tracking-[-0.02em] text-pkg-fg">{a.number}</p>
                    <p className="mt-0.5 text-[14px] text-pkg-fg-3">a.n. {holder}</p>
                  </div>
                  <CopyNumber value={a.number} bank={a.code} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-[17px] leading-[1.5] text-pkg-fg">
              Bank yang dipakai: {(namesWithoutNumber.length ? namesWithoutNumber : bankNames).join(", ") || "tanyakan ke UC"}. Minta nomor rekeningnya ke UC lewat WhatsApp.
            </p>
          )}
          {accounts.length > 0 && namesWithoutNumber.length > 0 && (
            <p className="mt-3 text-[14px] text-pkg-fg-3">Untuk {namesWithoutNumber.join(", ")}, minta nomor rekeningnya ke UC.</p>
          )}
        </section>
      </PkgPanel>

      <PkgPanel tone="cream" last>
        <section className="mx-auto max-w-3xl" aria-labelledby="bukti">
          <h2 id="bukti" className="pkg-h2">Kirim bukti transfer</h2>
          <ol className="mt-5 space-y-3">
            {[
              "Simpan bukti transfer (tangkapan layar atau foto struk).",
              "Kirim ke UC lewat WhatsApp, sebut kode pendaftaran dan namamu.",
              "UC memeriksa transfernya di rekening PT, lalu mencatatnya. Kamu bisa melihat tahapnya di Cek status.",
            ].map((t, i) => (
              <li key={t} className="flex items-start gap-3 text-[16px] leading-[1.5] text-pkg-fg-2">
                <span className="pkg-label mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pkg-cream-2 text-pkg-fg">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href={formatWhatsAppUrl(whatsapp, proofMessage)} target="_blank" rel="noopener noreferrer" className={`pkg-press pkg-glass-red pkg-label inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-7 ${pkgFocus}`}>
              <WhatsAppIcon className="h-5 w-5" /> Kirim lewat WhatsApp
            </a>
            <Link to="/cek-status" className={`pkg-press pkg-glass pkg-label inline-flex h-14 items-center justify-center rounded-full px-7 ${pkgFocus}`}>
              Cek status pendaftaran
            </Link>
          </div>
          <p className="mt-6 flex items-start gap-2 text-[14px] leading-[1.5] text-pkg-fg-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              DP tidak dapat dikembalikan. Rincian lengkap ada di <Link to="/syarat-umroh" className="font-medium text-pkg-fg underline underline-offset-4">Persyaratan dan Term of Service</Link>. Ada pertanyaan? Tanyakan ke UC sebelum transfer.
            </span>
          </p>
        </section>
      </PkgPanel>
    </PkgPage>
  );
}
