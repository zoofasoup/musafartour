import { useRef } from "react";
import { Link } from "react-router-dom";
import { Banknote, ClipboardCheck, GraduationCap, MessageCircle, Rocket, UserPlus, Wallet } from "lucide-react";
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
  AGENT_REGISTRATION_FEE,
} from "@/lib/sopAgen";


const POINTS = [
  { icon: Banknote, title: "Komisi per jamaah", text: "Sesuai tingkat dan paket. Dibayar hari H sampai H+2 setelah jamaah landing." },
  { icon: Wallet, title: `Registrasi ${rupiah(AGENT_REGISTRATION_FEE)}, sekali`, text: "Sudah termasuk welcome kit, perlengkapan, marketing kit, dan sertifikat Agen Resmi." },
  { icon: GraduationCap, title: "Pelatihan gratis", text: "Pelatihan sales, materi promosi, dan grup WhatsApp agen." },
] as const;

const STEPS = [
  { icon: UserPlus, title: "Daftar", text: "Isi data, konfirmasi email, lalu lengkapi KTP dan setujui SOP." },
  { icon: ClipboardCheck, title: "Disetujui", text: `Tim memeriksa datamu dan memberi Agent ID. Setelah itu bayar registrasi ${rupiah(AGENT_REGISTRATION_FEE)}.` },
  { icon: Rocket, title: "Mulai jualan", text: "Catat lead, daftarkan jamaah, dan bagikan tautan promo." },
] as const;

const FAQS = [
  { q: "Berapa komisi saya?", a: "Sesuai tingkat dan paket, dikonfirmasi PIC Agen. Silver 1 sampai 15, Gold 15 sampai 30, Platinum minimal 30 jamaah per tahun." },
  { q: "Kapan komisi dibayar?", a: "Hari H sampai H+2 setelah jamaah landing, bila syarat terpenuhi." },
  { q: "Apa syarat jadi agen?", a: "Minimal 17 tahun, WNI, punya KTP, WhatsApp dan rekening bank aktif, bukan karyawan Musafar atau mitra travel lain." },
  { q: "Ada bonus?", a: "Closing 5 jamaah Rp500.000, 10 jamaah Rp1.500.000, 40 jamaah motor listrik atau tunai. Hanya untuk jamaah yang kamu bawa langsung." },
  { q: "Registrasi dibayar ke mana?", a: `${rupiah(AGENT_REGISTRATION_FEE)}, sekali, setelah disetujui, ke rekening PT Musa Amanah Wisata. Jika mundur, biaya hangus karena ditukar perlengkapan dan welcome kit.` },
  { q: "Kalau jamaah batal atau refund?", a: "Tidak ada komisi. Komisi yang sudah dibayar dipotong dari komisi berikutnya atau dikembalikan." },
  { q: "Apakah agen menerima uang jamaah?", a: "Tidak. Semua pembayaran hanya ke rekening resmi Musafar." },
  { q: "Berapa lama persetujuan akun?", a: "Biasanya 1 sampai 2 hari kerja setelah data dan SOP lengkap." },
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
            <h1 className="pkg-title text-balance !text-[46px] md:!text-[64px]">Jadi agen resmi umroh.</h1>
            <p className="mt-5 text-[17px] leading-[1.5] text-pkg-fg-2">Ajak keluarga dan teman berangkat, dapat komisi per jamaah.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/agent/register" className={`pkg-press pkg-glass-red pkg-label inline-flex h-14 items-center justify-center gap-2 rounded-full px-7 ${focus} focus-visible:ring-pkg-cream focus-visible:ring-offset-pkg-ink`}>
                <UserPlus className="h-5 w-5" aria-hidden /> Daftar jadi agen
              </Link>
              <a href={csUrl} target="_blank" rel="noopener noreferrer" className={`pkg-press pkg-glass pkg-label inline-flex h-14 items-center justify-center gap-2 rounded-full px-7 ${focus} focus-visible:ring-pkg-cream focus-visible:ring-offset-pkg-ink`}>
                <MessageCircle className="h-5 w-5" aria-hidden /> Tanya CS
              </a>
            </div>
            <p className="mt-5 text-[15px] text-pkg-fg-2">
              Sudah punya akun? <Link to="/agent/login" className="font-medium text-pkg-fg underline underline-offset-4">Masuk</Link>
            </p>
          </div>
        </PkgPanel>

        <PkgPanel tone="cream">
          <div className="mx-auto max-w-5xl">
            <h2 className="pkg-h2">Yang kamu dapat</h2>
            <ul className="mt-8 grid gap-8 md:grid-cols-3">
              {POINTS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pkg-cream-2 text-pkg-red-deep">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-[19px] font-normal leading-[1.2] tracking-[-0.02em] text-pkg-fg">{title}</h3>
                    <p className="mt-1 text-[16px] leading-[1.5] text-pkg-fg-2">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </PkgPanel>

        <PkgPanel tone="cream-2">
          <div className="mx-auto max-w-5xl">
            <h2 className="pkg-h2">Cara bergabung</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pkg-cream text-pkg-fg">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <p className="pkg-caption text-pkg-fg-3">Langkah {i + 1}</p>
                    <h3 className="mt-0.5 text-[19px] font-normal leading-[1.2] tracking-[-0.02em] text-pkg-fg">{title}</h3>
                    <p className="mt-1 text-[16px] leading-[1.5] text-pkg-fg-2">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </PkgPanel>

        <PkgPanel tone="cream">
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
            <p className="mt-6 text-[14px] leading-[1.5] text-pkg-fg-3">
              Selengkapnya di <Link to="/sop-agen" className="font-medium text-pkg-fg underline underline-offset-4">SOP Program Agen</Link>. Data diproses sesuai{" "}
              <Link to="/kebijakan-privasi" className="font-medium text-pkg-fg underline underline-offset-4">Kebijakan Privasi</Link>.
            </p>
          </div>
        </PkgPanel>
      </main>

      <PkgPanel tone="red" className="!pb-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="pkg-h2 text-pkg-on-red text-balance">Siap jadi agen?</h2>
          <Link to="/agent/register" className="pkg-press pkg-glass-deep pkg-label mt-6 inline-flex h-14 items-center justify-center gap-2 rounded-full px-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-on-red focus-visible:ring-offset-2">
            <UserPlus className="h-5 w-5" aria-hidden /> Daftar jadi agen
          </Link>
        </div>
      </PkgPanel>

      <Footer variant="pkg" />
    </div>
  );
}
