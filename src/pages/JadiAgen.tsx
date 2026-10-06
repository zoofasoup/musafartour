import { Link } from "react-router-dom";
import { BadgeCheck, Banknote, CalendarClock, CheckCircle2, ClipboardCheck, IdCard, Mail, MessageCircle, UserPlus, Wallet } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useHomepageData } from "@/hooks/useHomepageData";
import { AGENT_COMMISSION_PER_JAMAAH, AGENT_MIN_WITHDRAWAL } from "@/lib/agentSupport";
import { LUNAS_DAYS_BEFORE_DEPARTURE, rupiah } from "@/lib/jamaah";
import { formatWhatsAppUrl } from "@/lib/utils";

const FALLBACK_WHATSAPP = "6281917403797";

const BENEFITS = [
  {
    icon: Banknote,
    title: `${rupiah(AGENT_COMMISSION_PER_JAMAAH)} per jamaah`,
    text: "Komisi tetap, sama untuk semua paket. Kamu tahu penghasilanmu sebelum menawarkan paket.",
  },
  {
    icon: CheckCircle2,
    title: "Dibayar setelah jamaah lunas",
    text: "Komisi masuk ke saldo saat jamaah yang kamu ajak sudah melunasi pembayarannya.",
  },
  {
    icon: Wallet,
    title: `Tarik mulai ${rupiah(AGENT_MIN_WITHDRAWAL)}`,
    text: "Ajukan penarikan kapan saja dari portal agen, ke rekening bank atas namamu sendiri.",
  },
] as const;

const STEPS = [
  { icon: UserPlus, title: "Daftar", text: "Isi nama, email, nomor WhatsApp, dan password. Gratis, tidak ada biaya bergabung." },
  { icon: Mail, title: "Konfirmasi email", text: "Buka email dari kami dan klik tautan konfirmasi. Belum masuk? Kamu bisa minta kirim ulang." },
  { icon: IdCard, title: "Lengkapi data KTP", text: "Isi nomor KTP, foto KTP, dan alamat. Dipakai admin untuk memastikan kamu orang yang tepat." },
  { icon: ClipboardCheck, title: "Disetujui admin", text: "Admin memeriksa datamu, biasanya 1-2 hari kerja. Setelah disetujui, portal agenmu aktif." },
] as const;

const REQUIREMENTS = [
  "KTP yang masih berlaku, untuk verifikasi identitas.",
  "Rekening bank atas nama sendiri, untuk pencairan komisi.",
  "Nomor WhatsApp dan email yang aktif.",
  "Setuju dengan Kebijakan Privasi dan Syarat & Ketentuan Musafar Tour.",
] as const;

const FAQS = [
  {
    q: "Kapan komisi saya masuk?",
    a: `Komisi dicatat saat jamaah yang kamu ajak sudah lunas, yaitu seluruh pembayarannya terverifikasi. Pelunasan paling lambat H-${LUNAS_DAYS_BEFORE_DEPARTURE} sebelum keberangkatan. Selama jamaah belum lunas, komisinya tampil sebagai "menunggu" dan belum bisa ditarik.`,
  },
  {
    q: "Bagaimana kalau jamaah hanya bayar DP lalu batal?",
    a: "DP tidak dapat dikembalikan, dan komisi hanya dibayar untuk jamaah yang lunas. Jamaah yang batal sebelum lunas tidak menghasilkan komisi. Jelaskan aturan DP ini ke calon jamaah sejak awal.",
  },
  {
    q: "Apakah ada biaya untuk jadi agen?",
    a: "Tidak ada. Mendaftar, memakai portal agen, dan materi marketing semuanya gratis.",
  },
  {
    q: "Apakah agen menerima uang dari jamaah?",
    a: "Tidak. Semua pembayaran jamaah hanya ke rekening resmi PT, tidak pernah ke rekening pribadi agen. Tugasmu mengajak dan mendampingi, pembayaran dicatat langsung oleh CS.",
  },
  {
    q: "Berapa lama persetujuan akun?",
    a: "Biasanya 1-2 hari kerja setelah data KTP dan alamatmu lengkap. Kalau lebih lama, hubungi CS lewat WhatsApp.",
  },
  {
    q: "Bagaimana cara menarik komisi?",
    a: `Atur rekening di portal agen, lalu ajukan penarikan. Jumlah minimal ${rupiah(AGENT_MIN_WITHDRAWAL)}, dan rekening harus atas namamu sendiri.`,
  },
] as const;

export default function JadiAgen() {
  const { websiteSettings } = useHomepageData();
  const whatsapp = websiteSettings?.whatsapp_number || FALLBACK_WHATSAPP;
  const csUrl = formatWhatsAppUrl(whatsapp, "Halo Musafar Tour, saya tertarik jadi agen. Boleh tanya-tanya dulu?");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        {/* Dark block with the one crimson action (DESIGN.md public hero) */}
        <section className="rounded-3xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 sm:py-14" aria-labelledby="judul">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/70">Program agen Musafar Tour</p>
          <h1 id="judul" className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight [text-wrap:balance] sm:text-5xl">
            Jadi agen umroh, komisi {rupiah(AGENT_COMMISSION_PER_JAMAAH)} per jamaah lunas
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-primary-foreground/85">
            Ajak keluarga, teman, atau jamaah pengajianmu berangkat umroh. Kami yang mengurus pendaftaran, pembayaran, dan keberangkatan.
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
          <p className="mt-4 flex items-start gap-2 text-foreground/80">
            <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
            <span>Portal agen berisi daftar paket dan jadwal, materi marketing, tautan referral pribadi, dan pantauan status jamaah serta komisimu.</span>
          </p>
        </section>

        <section className="mt-12" aria-labelledby="cara">
          <h2 id="cara" className="text-2xl font-bold text-foreground sm:text-3xl">Cara bergabung, 4 langkah</h2>
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
          <h2 id="syarat" className="text-2xl font-bold text-foreground">Yang perlu disiapkan</h2>
          <ul className="mt-4 space-y-3">
            {REQUIREMENTS.map((r) => (
              <li key={r} className="flex items-start gap-3 text-foreground">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-ok-text" aria-hidden />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Data diproses sesuai <Link to="/kebijakan-privasi" className="font-semibold text-foreground underline underline-offset-4">Kebijakan Privasi</Link> dan{" "}
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
          <h2 id="ajakan" className="text-2xl font-bold sm:text-3xl [text-wrap:balance]">Siap mulai? Daftarnya gratis dan cuma beberapa menit</h2>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="brand" className="h-12 gap-2 px-6 text-base font-bold">
              <Link to="/agent/register">
                <UserPlus className="h-5 w-5" aria-hidden /> Daftar jadi agen
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 gap-2 border-primary-foreground/30 bg-transparent px-6 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <a href={csUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" aria-hidden /> Hubungi CS lewat WhatsApp
              </a>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
