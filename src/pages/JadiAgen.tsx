import { useRef } from "react";
import { Link } from "react-router-dom";
import { Award, Banknote, CalendarClock, CheckCircle2, ClipboardCheck, Gift, IdCard, Mail, MessageCircle, Rocket, UserPlus, Wallet } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { usePkgNav } from "@/hooks/usePkgNav";
import "@/styles/pkg-v2.css";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { rupiah } from "@/lib/jamaah";
import { AGENT_CS_WHATSAPP } from "@/lib/agentSupport";
import { formatWhatsAppUrl } from "@/lib/utils";
import {
  AGENT_FEE_INCLUDES,
  AGENT_LEVEL_RULES,
  AGENT_REGISTRATION_FEE,
  AGENT_REQUIREMENTS,
  BONUS_TEXT,
  COMMISSION_PAYOUT_TEXT,
  COMMISSION_PER_LEVEL_TEXT,
} from "@/lib/sopAgen";


const BENEFITS = [
  {
    icon: Banknote,
    title: "Komisi sesuai tingkat dan paket",
    text: "Besarnya dikonfirmasi PIC Agen. Makin banyak jamaah per tahun, makin tinggi tingkatmu.",
  },
  {
    icon: CheckCircle2,
    title: "Dibayar H sampai H+2 landing",
    text: "Komisi dibayarkan hari H sampai H+2 setelah jamaah landing di negara tujuan, bila semua syarat terpenuhi. Ketentuan tanggal dapat berubah dan diinformasikan kepada agen.",
  },
  {
    icon: Award,
    title: "Pelatihan dan sertifikat",
    text: "Pelatihan sales gratis, materi promosi, dan sertifikat Agen Resmi.",
  },
] as const;

const STEPS = [
  { icon: UserPlus, title: "Daftar", text: "Isi nama, email, nomor WhatsApp, dan password." },
  { icon: Mail, title: "Konfirmasi email", text: "Buka email dari Musafar Tour, klik tautan konfirmasi, lalu masuk ke portal agen." },
  { icon: IdCard, title: "Lengkapi data dan setujui SOP", text: "Isi KTP, NIK, alamat, dan nomor WhatsApp, lalu setujui SOP Program Agen." },
  { icon: ClipboardCheck, title: "Disetujui", text: "Tim Musafar memeriksa datamu. Setelah disetujui kamu mendapat Agent ID (format MUS-XXXXXX)." },
  { icon: Wallet, title: "Bayar biaya registrasi", text: `Setelah disetujui, bayar biaya registrasi ${rupiah(AGENT_REGISTRATION_FEE)} ke rekening PT Musa Amanah Wisata, lalu kirim bukti transfer ke PIC Agen.` },
  { icon: Rocket, title: "Mulai jualan", text: "Setelah pembayaran diterima, kamu bisa mencatat lead, mendaftarkan jamaah, dan membagikan tautan promo." },
] as const;

const FAQS = [
  {
    q: "Apakah ada biaya untuk jadi agen?",
    a: `Ada, biaya registrasi ${rupiah(AGENT_REGISTRATION_FEE)} dibayar satu kali seumur hidup. Biaya ini mencakup welcome kit, perlengkapan, marketing kit, grup WhatsApp, pelatihan sales gratis, dan sertifikat Agen Resmi. Biaya dibayar setelah pendaftaranmu disetujui, hanya ke rekening PT Musa Amanah Wisata, lalu bukti transfer dikirim ke PIC Agen. Pembayaran dianjurkan sekaligus. Jika agen mundur, biaya registrasi hangus karena ditukar dengan perlengkapan dan welcome kit.`,
  },
  {
    q: "Berapa komisi saya?",
    a: `${COMMISSION_PER_LEVEL_TEXT} Tingkatnya naik mengikuti jumlah jamaah per tahun: Silver 1 sampai 15, Gold 15 sampai 30, Platinum minimal 30.`,
  },
  {
    q: "Kapan komisi dibayar?",
    a: `${COMMISSION_PAYOUT_TEXT} Ketentuan tanggal dapat berubah dan diinformasikan kepada agen.`,
  },
  {
    q: "Bagaimana kalau jamaah batal atau refund?",
    a: "Komisi tidak berlaku untuk jamaah yang batal atau refund. Kalau komisi sudah dibayar, komisi dipotong dari komisi berikutnya, dikembalikan agen, atau diselesaikan lewat mekanisme lain yang disepakati.",
  },
  {
    q: "Apakah agen menerima uang dari jamaah?",
    a: "Tidak. Semua pembayaran jamaah hanya ke rekening resmi Musafar. Agen tidak boleh menerima pembayaran ke rekening pribadi tanpa persetujuan perusahaan.",
  },
  {
    q: "Berapa lama persetujuan akun?",
    a: "Tim Musafar menyetujui akunmu setelah data dan persetujuan SOP lengkap. Setelah itu kamu membayar biaya registrasi, dan baru bisa mulai jualan begitu pembayaran diterima. Kalau menunggu terasa lama, hubungi PIC Agen lewat WhatsApp.",
  },
] as const;

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2";

export default function JadiAgen() {
  const rootRef = useRef<HTMLDivElement>(null);
  usePkgNav(rootRef);
  const csUrl = formatWhatsAppUrl(AGENT_CS_WHATSAPP, "Halo Musafar Tour, saya tertarik jadi agen. Boleh tanya-tanya dulu?");

  return (
    <div ref={rootRef} className="pkg-v2 min-h-screen">
      <Navbar />
      <main id="main">
        <PkgPanel tone="ink" top>
          <div className="mx-auto max-w-3xl">
            <p className="pkg-glass pkg-label inline-flex h-8 items-center rounded-full px-3 text-[13px]">Program agen Musafar Tour</p>
            <h1 className="pkg-title mt-5 text-balance !text-[46px] md:!text-[64px]">Jadi Duta Musafar.</h1>
            <p className="mt-5 text-[17px] leading-[1.5] text-pkg-fg-2">
              Ajak keluarga, teman, atau jamaah pengajianmu berangkat umroh. Komisi sesuai tingkat dan paket. Registrasi sekali seumur hidup.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/agent/register" className={`pkg-press pkg-glass-red pkg-label inline-flex h-14 items-center justify-center gap-2 rounded-full px-7 ${focus} focus-visible:ring-pkg-cream focus-visible:ring-offset-pkg-ink`}>
                <UserPlus className="h-5 w-5" aria-hidden /> Daftar jadi agen
              </Link>
              <a href={csUrl} target="_blank" rel="noopener noreferrer" className={`pkg-press pkg-glass pkg-label inline-flex h-14 items-center justify-center gap-2 rounded-full px-7 ${focus} focus-visible:ring-pkg-cream focus-visible:ring-offset-pkg-ink`}>
                <MessageCircle className="h-5 w-5" aria-hidden /> Tanya CS dulu
              </a>
            </div>
            <p className="mt-5 text-[15px] text-pkg-fg-2">
              Sudah punya akun? <Link to="/agent/login" className="font-medium text-pkg-fg underline underline-offset-4">Masuk ke portal agen</Link>
            </p>
          </div>
        </PkgPanel>

        <PkgPanel tone="cream">
          <div className="mx-auto max-w-5xl">
            <h2 id="keuntungan" className="pkg-h2">Yang kamu dapat</h2>
            <ul className="mt-8 grid gap-8 md:grid-cols-3">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pkg-cream-2 text-pkg-red-deep">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <h3 className="pkg-h3">{title}</h3>
                    <p className="mt-1 text-[16px] leading-[1.5] text-pkg-fg-2">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </PkgPanel>

        <PkgPanel tone="cream-2">
          <div className="mx-auto max-w-3xl">
            <h2 id="biaya" className="pkg-h2 text-balance">Registrasi {rupiah(AGENT_REGISTRATION_FEE)}, sekali seumur hidup.</h2>
            <p className="pkg-label mt-5 text-pkg-fg-2">Sudah termasuk</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {AGENT_FEE_INCLUDES.map((i) => (
                <li key={i} className="flex items-start gap-3 text-[16px] text-pkg-fg">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-pkg-ok" aria-hidden />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 flex items-start gap-2 text-[14px] leading-[1.5] text-pkg-fg-3">
              <Wallet className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>Dibayar setelah pendaftaranmu disetujui, ke rekening PT Musa Amanah Wisata, lalu bukti transfer dikirim ke PIC Agen. Pembayaran dianjurkan sekaligus. Jika agen mundur, biaya registrasi hangus karena ditukar dengan perlengkapan dan welcome kit.</span>
            </p>
            <h3 className="pkg-h3 mt-12 flex items-center gap-2"><Gift className="h-6 w-6" aria-hidden />Program dan bonus</h3>
            <p className="mt-3 text-[16px] leading-[1.55] text-pkg-fg-2">{BONUS_TEXT}</p>
          </div>
        </PkgPanel>

        <PkgPanel tone="cream">
          <div className="mx-auto max-w-3xl">
            <h2 id="tingkat" className="pkg-h2">Tiga tingkat agen</h2>
            <p className="mt-4 text-[16px] leading-[1.55] text-pkg-fg-2">Duta Musafar adalah nama komunitas agen kami, bukan tingkat. Semua agen baru mulai dari Silver. Tingkat dihitung dari jumlah jamaah per tahun. {COMMISSION_PER_LEVEL_TEXT}</p>
            <ul className="mt-8 space-y-5">
              {AGENT_LEVEL_RULES.filter((l) => l.key !== "duta").map((l) => (
                <li key={l.key}>
                  <h3 className="pkg-sub">{l.label}</h3>
                  <p className="mt-1 text-[16px] text-pkg-fg-2">{l.range}</p>
                </li>
              ))}
            </ul>

            <h2 id="cara" className="pkg-h2 mt-16">Cara bergabung</h2>
            <ol className="mt-8 space-y-7">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pkg-cream-2 text-pkg-fg">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="pkg-caption text-pkg-fg-3">Langkah {i + 1}</p>
                    <h3 className="pkg-h3 mt-0.5">{title}</h3>
                    <p className="mt-1 text-[16px] leading-[1.5] text-pkg-fg-2">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </PkgPanel>

        <PkgPanel tone="ink">
          <div className="mx-auto max-w-3xl">
            <h2 id="syarat" className="pkg-h2">Syarat jadi agen</h2>
            <ul className="mt-6 space-y-3">
              {AGENT_REQUIREMENTS.map((r) => (
                <li key={r} className="flex items-start gap-3 text-[16px] text-pkg-fg">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-pkg-red-bright" aria-hidden />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 flex items-start gap-2 text-[14px] leading-[1.5] text-pkg-fg-2">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Baca <Link to="/sop-agen" className="font-medium text-pkg-fg underline underline-offset-4">SOP Program Agen</Link>. Data diproses sesuai <Link to="/kebijakan-privasi" className="font-medium text-pkg-fg underline underline-offset-4">Kebijakan Privasi</Link> dan{" "}
                <Link to="/syarat-ketentuan" className="font-medium text-pkg-fg underline underline-offset-4">Syarat &amp; Ketentuan</Link>.
              </span>
            </p>
          </div>
        </PkgPanel>

        <PkgPanel tone="cream-2">
          <div className="mx-auto max-w-3xl">
            <h2 id="faq" className="pkg-h2 text-balance">Pertanyaan umum</h2>
            <Accordion type="single" collapsible className="mt-6">
              {FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`faq-${i}`} className={i === FAQS.length - 1 ? "border-b-0" : "border-pkg-hair"}>
                  <AccordionTrigger className="min-h-14 text-left text-[17px] font-medium text-pkg-fg hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-[16px] leading-[1.55] text-pkg-fg-2">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </PkgPanel>
      </main>

      <PkgPanel tone="red" className="!pb-24">
        <div className="mx-auto max-w-3xl">
          <h2 id="ajakan" className="pkg-h2 text-pkg-on-red text-balance">Siap jadi agen resmi?</h2>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/agent/register" className="pkg-press pkg-glass-deep pkg-label inline-flex h-14 items-center justify-center gap-2 rounded-full px-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-on-red focus-visible:ring-offset-2">
              <UserPlus className="h-5 w-5" aria-hidden /> Daftar jadi agen
            </Link>
            <a href={csUrl} target="_blank" rel="noopener noreferrer" className="pkg-press pkg-glass pkg-label inline-flex h-14 items-center justify-center gap-2 rounded-full px-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-on-red focus-visible:ring-offset-2">
              <MessageCircle className="h-5 w-5" aria-hidden /> Hubungi PIC Agen
            </a>
          </div>
        </div>
      </PkgPanel>

      <Footer variant="pkg" />
    </div>
  );
}
