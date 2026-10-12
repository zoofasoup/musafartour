import { Link } from "react-router-dom";
import { ArrowRight, Banknote, CalendarCheck, FileText, Landmark, Repeat } from "lucide-react";
import { DP_MIN_PER_PAX, LUNAS_DAYS_BEFORE_DEPARTURE, PT_ACCOUNT_HOLDER, rupiah } from "@/lib/jamaah";

/**
 * The rules the registration form states, shown before anyone commits (audit PUB-012).
 * Order matters: what makes it easy to say yes comes first and is the visual weight; the conditions follow as plain
 * small text with the same wording, so nothing is hidden and nothing shouts.
 */
const HIGHLIGHTS = [
  { icon: Banknote, title: `Amankan seat dengan DP ${rupiah(DP_MIN_PER_PAX)}`, text: "per orang" },
  { icon: Repeat, title: "Cicilan bebas", text: "kapan saja, berapa saja" },
  { icon: CalendarCheck, title: `Lunas paling lambat H-${LUNAS_DAYS_BEFORE_DEPARTURE}`, text: "sebelum tanggal berangkat" },
] as const;

export function PackagePaymentTerms({ flat = false }: { flat?: boolean }) {
  if (flat) {
    // Short lines on purpose; the full wording lives on /cara-bayar.
    const rows: { icon: typeof Banknote; text: string; tag?: string }[] = [
      { icon: Banknote, text: `DP minimal Rp ${DP_MIN_PER_PAX / 1_000_000} Juta` },
      { icon: Repeat, text: "Cicilan bebas" },
      { icon: CalendarCheck, text: `Lunas H-${LUNAS_DAYS_BEFORE_DEPARTURE}` },
      { icon: Landmark, text: `Rekening resmi ${PT_ACCOUNT_HOLDER}` },
      { icon: FileText, text: "Paspor min. 12 bulan sebelum berangkat" },
    ];
    return (
      <section aria-labelledby="cara-bayar-heading">
        <h2 id="cara-bayar-heading" className="pkg-h2">Pembayaran</h2>
        <ul className="mt-6 divide-y divide-pkg-hair">
          {rows.map(({ icon: Icon, text, tag }) => (
            <li key={text} className="flex min-h-14 items-center gap-3 py-3">
              <Icon className="h-6 w-6 shrink-0 text-pkg-red" aria-hidden />
              <p className="min-w-0 flex-1 text-[17px] font-normal leading-snug text-pkg-fg">{text}</p>
              {tag && <span className="pkg-caption shrink-0 rounded-full bg-pkg-cream-2 px-3 py-1 text-pkg-fg-2">{tag}</span>}
            </li>
          ))}
        </ul>
        <Link to="/cara-bayar" className="pkg-label mt-2 inline-flex min-h-11 items-center gap-1 text-pkg-red-deep underline underline-offset-4">
          Cara bayar lengkap <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </section>
    );
  }
  return (
    <section aria-labelledby="cara-bayar-heading" className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm">
      <h2 id="cara-bayar-heading" className="text-lg font-bold text-foreground">
        Pembayaran fleksibel
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5">
            <Icon className="h-5 w-5 shrink-0 text-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-bold leading-snug text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">
        DP tidak dapat dikembalikan. Pembayaran hanya ke rekening atas nama {PT_ACCOUNT_HOLDER}. Paspor berlaku minimal 12 bulan
        setelah tanggal berangkat.{" "}
        <Link to="/cara-bayar" className="inline-flex items-center gap-1 font-semibold text-brand hover:text-brand-press">
          Cara bayar lengkap <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </p>
    </section>
  );
}
