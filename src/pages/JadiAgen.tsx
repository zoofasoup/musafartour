import { Link } from "react-router-dom";
import { Award, BadgeCheck, Banknote, CalendarClock, CheckCircle2, ClipboardCheck, FileText, Gift, IdCard, MessageCircle, UserPlus, Wallet } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
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
    text: "Komisi dibayarkan hari H sampai H+2 setelah jamaah landing di negara tujuan, bila semua syarat terpenuhi.",
  },
  {
    icon: Award,
    title: "Pelatihan dan sertifikat",
    text: "Pelatihan sales gratis, materi promosi, dan sertifikat Agen Resmi.",
  },
] as const;

const STEPS = [
  { icon: UserPlus, title: "Daftar", text: "Isi nama, email, nomor WhatsApp, dan password." },
  { icon: IdCard, title: "Verifikasi data", text: "Lengkapi KTP dan alamat, bayar biaya registrasi, lalu setujui SOP." },
  { icon: ClipboardCheck, title: "Disetujui", text: "Admin memeriksa datamu, biasanya 1-2 hari kerja." },
  { icon: BadgeCheck, title: "Dapat Agent ID", text: "Agent ID (format MUS-XXXXXX) mencatat jamaah yang kamu ajak." },
  { icon: FileText, title: "Onboarding", text: "Ikuti pembinaan dan pelatihan, lalu mulai menawarkan paket." },
] as const;

const FAQS = [
  {
    q: "Apakah ada biaya untuk jadi agen?",
    a: `Ada, biaya registrasi ${rupiah(AGENT_REGISTRATION_FEE)} dibayar satu kali seumur hidup. Biaya ini mencakup welcome kit, perlengkapan, marketing kit, grup WhatsApp, pelatihan sales gratis, dan sertifikat Agen Resmi. Pembayaran hanya ke rekening PT Musa Amanah Wisata, lalu bukti transfer dikirim ke PIC Agen.`,
  },
  {
    q: "Berapa komisi saya?",
    a: `${COMMISSION_PER_LEVEL_TEXT} Tingkatnya naik mengikuti jumlah jamaah per tahun: Silver 1 sampai 15, Gold 15 sampai 30, Platinum di atas 30.`,
  },
  {
    q: "Kapan komisi dibayar?",
    a: `${COMMISSION_PAYOUT_TEXT} Ketentuan tanggal dapat berubah dan akan diinformasikan.`,
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
    a: "Biasanya 1-2 hari kerja setelah data, biaya registrasi, dan persetujuan SOP lengkap. Kalau lebih lama, hubungi PIC Agen lewat WhatsApp.",
  },
] as const;

export default function JadiAgen() {
  const csUrl = formatWhatsAppUrl(AGENT_CS_WHATSAPP, "Halo Musafar Tour, saya tertarik jadi agen. Boleh tanya-tanya dulu?");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        {/* Dark block with the one crimson action (DESIGN.md public hero) */}
        <section className="rounded-3xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 sm:py-14" aria-labelledby="judul">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/70">Program agen Musafar Tour</p>
          <h1 id="judul" className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight [text-wrap:balance] sm:text-5xl">
            Jadi agen resmi umroh Musafar Tour
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-primary-foreground/85">
            Ajak keluarga, teman, atau jamaah pengajianmu berangkat umroh. Komisi sesuai tingkat dan paket. Registrasi sekali seumur hidup.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="brand" className="h-12 gap-2 px-6 text-base font-bold">
              <Link to="/agent/register">
                <UserPlus className="h-5 w-5" aria-hidden /> Daftar jadi agen
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 gap-2 border-primary-foreground/30 bg-transparent px-6 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <a href={csUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" aria-hidden /> Tanya CS dulu
              </a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-primary-foreground/70">
            Sudah punya akun? <Link to="/agent/login" className="font-semibold text-primary-foreground underline underline-offset-4">Masuk ke portal agen</Link>
          </p>
        </section>

        <section className="mt-12" aria-labelledby="keuntungan">
          <h2 id="keuntungan" className="text-2xl font-bold text-foreground sm:text-3xl">Yang kamu dapat</h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl border bg-card p-5 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-bold text-foreground">{title}</h3>
                <p className="mt-1 text-foreground/80">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 rounded-2xl border bg-card p-6 shadow-sm" aria-labelledby="biaya">
          <h2 id="biaya" className="text-2xl font-bold text-foreground">Biaya registrasi {rupiah(AGENT_REGISTRATION_FEE)}, sekali seumur hidup</h2>
          <p className="mt-2 text-foreground/80">Sudah termasuk:</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {AGENT_FEE_INCLUDES.map((i) => (
              <li key={i} className="flex items-start gap-3 text-foreground">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-ok-text" aria-hidden />
                <span>{i}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
            <Wallet className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>Dibayar ke rekening PT Musa Amanah Wisata, lalu bukti transfer dikirim ke PIC Agen.</span>
          </p>
        </section>

        <section className="mt-12" aria-labelledby="tingkat">
          <h2 id="tingkat" className="text-2xl font-bold text-foreground sm:text-3xl">Empat tingkat agen</h2>
          <p className="mt-2 text-foreground/80">Tingkat dihitung dari jumlah jamaah per tahun. {COMMISSION_PER_LEVEL_TEXT}</p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AGENT_LEVEL_RULES.map((l) => (
              <li key={l.key} className="rounded-2xl border bg-card p-5 shadow-sm">
                <h3 className="text-lg font-bold text-foreground">{l.label}</h3>
                <p className="mt-1 text-foreground/80">{l.range}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 rounded-2xl border bg-card p-6 shadow-sm" aria-labelledby="program-bonus">
          <h2 id="program-bonus" className="flex items-center gap-2 text-2xl font-bold text-foreground"><Gift className="h-6 w-6" aria-hidden />Program dan bonus</h2>
          <p className="mt-3 text-foreground/80">{BONUS_TEXT}</p>
        </section>

        <section className="mt-12" aria-labelledby="cara">
          <h2 id="cara" className="text-2xl font-bold text-foreground sm:text-3xl">Cara bergabung, 5 langkah</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-muted-foreground">Langkah {i + 1}</p>
                  <h3 className="text-lg font-bold text-foreground">{title}</h3>
                  <p className="mt-1 text-foreground/80">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12 rounded-2xl border bg-card p-6 shadow-sm" aria-labelledby="syarat">
          <h2 id="syarat" className="text-2xl font-bold text-foreground">Syarat jadi agen</h2>
          <ul className="mt-4 space-y-3">
            {AGENT_REQUIREMENTS.map((r) => (
              <li key={r} className="flex items-start gap-3 text-foreground">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-ok-text" aria-hidden />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Baca <Link to="/sop-agen" className="font-semibold text-foreground underline underline-offset-4">SOP Program Agen</Link> selengkapnya. Data diproses sesuai <Link to="/kebijakan-privasi" className="font-semibold text-foreground underline underline-offset-4">Kebijakan Privasi</Link> dan{" "}
              <Link to="/syarat-ketentuan" className="font-semibold text-foreground underline underline-offset-4">Syarat &amp; Ketentuan</Link>.
            </span>
          </p>
        </section>

        <section className="mt-12" aria-labelledby="faq">
          <h2 id="faq" className="text-2xl font-bold text-foreground sm:text-3xl">Pertanyaan yang sering diajukan</h2>
          <Accordion type="single" collapsible className="mt-4 rounded-2xl border bg-card px-5 shadow-sm">
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`} className={i === FAQS.length - 1 ? "border-b-0" : undefined}>
                <AccordionTrigger className="min-h-11 text-left text-base font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-base text-foreground/80">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mt-12 rounded-3xl bg-primary px-6 py-10 text-center text-primary-foreground sm:px-10" aria-labelledby="ajakan">
          <h2 id="ajakan" className="text-2xl font-bold sm:text-3xl [text-wrap:balance]">Siap jadi agen resmi Musafar Tour?</h2>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="brand" className="h-12 gap-2 px-6 text-base font-bold">
              <Link to="/agent/register">
                <UserPlus className="h-5 w-5" aria-hidden /> Daftar jadi agen
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 gap-2 border-primary-foreground/30 bg-transparent px-6 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <a href={csUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" aria-hidden /> Hubungi PIC Agen lewat WhatsApp
              </a>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
