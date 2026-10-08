import { Fragment, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, Info, ListTree, MessageCircle, Square, SquareCheck, UserPlus } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { AGENT_CS_WHATSAPP } from "@/lib/agentSupport";
import { formatWhatsAppUrl } from "@/lib/utils";
import { SOP_DOCUMENT, SOP_PAGE_UPDATED, SOP_SECTIONS } from "@/lib/sopAgen";
import type { SopBlock } from "@/lib/sopAgen";


/** **bold** markers in the data become <strong>. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

function Block({ b }: { b: SopBlock }) {
  switch (b.t) {
    case "p":
      return <p className="mt-3 text-foreground/90"><Rich text={b.text} /></p>;
    case "h":
      return <h3 id={b.id} className="mt-6 scroll-mt-24 text-lg font-bold text-foreground">{b.text}</h3>;
    case "ul":
      return <ul className="mt-3 list-disc space-y-1.5 pl-5 text-foreground/90">{b.items.map((it) => <li key={it}><Rich text={it} /></li>)}</ul>;
    case "ol":
      return <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-foreground/90">{b.items.map((it) => <li key={it}><Rich text={it} /></li>)}</ol>;
    case "check":
      return (
        <ul className="mt-3 space-y-1.5 text-foreground/90">
          {b.items.map((it) => (
            <li key={it} className="flex items-start gap-2">
              {b.done ? <SquareCheck className="mt-0.5 h-5 w-5 shrink-0 text-status-ok-text" aria-hidden /> : <Square className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />}
              <span>{it}</span>
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="mt-3 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[420px] text-left text-sm sm:text-base">
            <thead className="bg-muted text-foreground">
              <tr>{b.head.map((h) => <th key={h} scope="col" className="px-3 py-2 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {b.rows.map((r) => (
                <tr key={r[0]} className="border-t">{r.map((c, i) => <td key={i} className={i === 0 ? "px-3 py-2 font-medium text-foreground" : "px-3 py-2 text-foreground/90"}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "flow":
      return (
        <ol className="mt-3 flex flex-col items-start gap-1 font-semibold text-foreground">
          {b.steps.map((st, i) => (
            <li key={st} className="flex flex-col items-start gap-1">
              <span className="rounded-lg bg-muted px-3 py-1.5 text-sm">{st}</span>
              {i < b.steps.length - 1 && <ArrowDown className="ml-4 h-4 w-4 text-muted-foreground" aria-hidden />}
            </li>
          ))}
        </ol>
      );
    case "notice":
      return (
        <div role="note" className="mt-4 flex gap-3 rounded-xl border border-status-warn-border bg-status-warn-bg p-4 text-sm font-medium text-status-warn-fg sm:text-base">
          <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>{b.text}</p>
        </div>
      );
    case "fields":
      return (
        <dl className="mt-4 space-y-3">
          {b.labels.map((l) => (
            <div key={l} className="flex items-end gap-2">
              <dt className="shrink-0 font-semibold text-foreground">{l}:</dt>
              <dd className="h-5 min-w-0 flex-1 border-b border-foreground/40" aria-hidden />
            </div>
          ))}
        </dl>
      );
    case "signatures":
      return (
        <div className="mt-6">
          <p className="text-foreground/90">{SOP_DOCUMENT.signedPlace}, {SOP_DOCUMENT.signedDate}</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {SOP_DOCUMENT.signers.map((sg) => (
              <div key={sg.name} className="border-t-2 border-foreground/70 pt-2">
                <p className="font-semibold text-foreground">{sg.name}</p>
                <p className="text-foreground/80">{sg.role}</p>
              </div>
            ))}
          </div>
        </div>
      );
  }
}

/** Table of contents entries: the 25 sections plus the titled sub-sections of sections 4 and 6. */
const TOC = SOP_SECTIONS.map((s) => ({
  id: s.id,
  label: `${s.num}. ${s.title}`,
  subs: s.num === 4 || s.num === 6 ? s.blocks.flatMap((b) => (b.t === "h" && b.id ? [{ id: b.id, label: b.text }] : [])) : [],
}));

function TocList({ onPick }: { onPick?: () => void }) {
  return (
    <ul className="space-y-0.5 text-sm">
      {TOC.map((e) => (
        <li key={e.id}>
          <a href={`#${e.id}`} onClick={onPick} className="block rounded-md px-2 py-1.5 font-medium text-foreground/80 hover:bg-muted hover:text-foreground">{e.label}</a>
          {e.subs.length > 0 && (
            <ul className="ml-3 border-l pl-2">
              {e.subs.map((sub) => (
                <li key={sub.id}><a href={`#${sub.id}`} onClick={onPick} className="block rounded-md px-2 py-1 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground">{sub.label}</a></li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

/** SOP Program Agen Musafar (SOP/AGEN/001): the full signed text as a readable public page. The text lives in src/lib/sopAgenText*.ts. */
export default function SopAgen() {
  const csUrl = formatWhatsAppUrl(AGENT_CS_WHATSAPP, "Halo Musafar Tour, saya mau tanya soal SOP Program Agen.");
  const tocRef = useRef<HTMLDetailsElement>(null);

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
            Pedoman pendaftaran, penjualan, dan komisi agen PT Musa Amanah Wisata. Teks lengkap dokumen yang ditandatangani, 25 bagian.
          </p>
          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm text-primary-foreground/85">
            <div><dt className="inline font-semibold">Nomor: </dt><dd className="inline">{SOP_DOCUMENT.number}</dd></div>
            <div><dt className="inline font-semibold">Versi: </dt><dd className="inline">{SOP_DOCUMENT.version}</dd></div>
            <div><dt className="inline font-semibold">Berlaku: </dt><dd className="inline">{SOP_DOCUMENT.effective}</dd></div>
            <div><dt className="inline font-semibold">Terakhir diperbarui: </dt><dd className="inline">{SOP_PAGE_UPDATED}</dd></div>
          </dl>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
          <details ref={tocRef} className="rounded-2xl border bg-card p-3 shadow-sm lg:hidden">
            <summary className="flex cursor-pointer items-center gap-2 text-base font-semibold text-foreground"><ListTree className="h-5 w-5" aria-hidden /> Daftar isi</summary>
            <nav aria-label="Daftar isi" className="mt-3 max-h-[60vh] overflow-y-auto">
              <TocList onPick={() => tocRef.current?.removeAttribute("open")} />
            </nav>
          </details>
          <nav aria-label="Daftar isi" className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daftar isi</p>
              <TocList />
            </div>
          </nav>

          <div className="min-w-0 space-y-6">
            {SOP_SECTIONS.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                <h2 id={`${s.id}-h`} className="text-xl font-bold text-foreground [text-wrap:balance] sm:text-2xl">
                  <span className="text-muted-foreground">{s.num}. </span>{s.title}
                </h2>
                {s.blocks.map((b, i) => <Block key={i} b={b} />)}
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
