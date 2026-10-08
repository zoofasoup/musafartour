import { Link } from "react-router-dom";
import { MessageCircle, UserPlus } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { AGENT_CS_WHATSAPP } from "@/lib/agentSupport";
import { formatWhatsAppUrl } from "@/lib/utils";
import { SOP_DOCUMENT, SOP_SECTIONS } from "@/lib/sopAgen";


/** SOP Program Agen Musafar (SOP/AGEN/001) as a readable public page. The text lives in src/lib/sopAgen.ts. */
export default function SopAgen() {
  const csUrl = formatWhatsAppUrl(AGENT_CS_WHATSAPP, "Halo Musafar Tour, saya mau tanya soal SOP Program Agen.");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <header className="rounded-3xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 sm:py-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/70">
            {SOP_DOCUMENT.number} versi {SOP_DOCUMENT.version}
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight [text-wrap:balance] sm:text-5xl">SOP Program Agen Musafar</h1>
          <p className="mt-4 max-w-2xl text-lg text-primary-foreground/85">
            Aturan resmi PT Musa Amanah Wisata untuk agen: syarat, hak dan kewajiban, komisi, larangan, dan sanksi. Berlaku {SOP_DOCUMENT.effective}.
          </p>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Daftar isi" className="hidden lg:block">
            <ul className="sticky top-24 space-y-1 text-sm">
              {SOP_SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">{s.title}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 space-y-6">
            {SOP_SECTIONS.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                <h2 id={`${s.id}-h`} className="text-xl font-bold text-foreground sm:text-2xl">
                  <span className="text-muted-foreground">{i + 1}. </span>{s.title}
                </h2>
                {s.intro && <p className="mt-3 text-foreground/85">{s.intro}</p>}
                {s.items && (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-foreground/90">
                    {s.items.map((it) => <li key={it}>{it}</li>)}
                  </ul>
                )}
                {s.groups?.map((g) => (
                  <div key={g.title} className="mt-4">
                    <h3 className="font-semibold text-foreground">{g.title}</h3>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground/90">
                      {g.items.map((it) => <li key={it}>{it}</li>)}
                    </ul>
                  </div>
                ))}
                {s.note && <p className="mt-4 rounded-lg bg-muted p-3 text-sm font-medium text-foreground">{s.note}</p>}
              </section>
            ))}
          </div>
        </div>

        <section className="mt-12 rounded-3xl bg-primary px-6 py-10 text-center text-primary-foreground sm:px-10" aria-labelledby="ajakan-sop">
          <h2 id="ajakan-sop" className="text-2xl font-bold sm:text-3xl [text-wrap:balance]">Sudah paham aturannya? Daftar jadi agen</h2>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="brand" className="h-12 gap-2 px-6 text-base font-bold">
              <Link to="/agent/register"><UserPlus className="h-5 w-5" aria-hidden /> Daftar jadi agen</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 gap-2 border-primary-foreground/30 bg-transparent px-6 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <a href={csUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-5 w-5" aria-hidden /> Tanya PIC Agen lewat WhatsApp</a>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
