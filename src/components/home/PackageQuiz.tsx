import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageCircle, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { PackageData } from "@/hooks/useHomepageData";
import type { PublishedPackage } from "@/hooks/usePackages";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { PkgListCard } from "@/components/package-list/PkgListCard";
import { PkgCardSkeleton } from "@/components/package-list/PkgSkeletons";
import { getTierPrice, isPackageUnavailable, getSlotsTaken } from "@/lib/utils";
import { resolveTierHotels } from "@/lib/roomCombos";
import { redirectToWhatsApp } from "@/lib/chatRedirect";

type Who = "solo" | "parents" | "kids" | "group";
type Focus = "price" | "hotel" | "direct" | "balanced";
type When = "soon" | "mid" | "late" | "any";

const QUESTIONS = [
  {
    key: "who",
    title: "Berangkat dengan siapa?",
    options: [
      { v: "solo", label: "Sendiri atau berdua" },
      { v: "parents", label: "Bersama orang tua" },
      { v: "kids", label: "Bersama anak" },
      { v: "group", label: "Rombongan keluarga" },
    ],
  },
  {
    key: "focus",
    title: "Apa yang paling penting?",
    options: [
      { v: "price", label: "Harga paling hemat" },
      { v: "hotel", label: "Hotel dekat Masjidil Haram" },
      { v: "direct", label: "Penerbangan langsung" },
      { v: "balanced", label: "Seimbang semuanya" },
    ],
  },
  {
    key: "when",
    title: "Kapan mau berangkat?",
    options: [
      { v: "soon", label: "Secepatnya" },
      { v: "mid", label: "3 sampai 4 bulan lagi" },
      { v: "late", label: "Lebih dari 4 bulan lagi" },
      { v: "any", label: "Fleksibel" },
    ],
  },
] as const;

type Answers = { who?: Who; focus?: Focus; when?: When };

/** "120 m" -> 120, "1,2 km" -> 1200; unknown -> null. */
const meters = (s?: string) => {
  const m = (s || "").toLowerCase().match(/([\d.,]+)\s*(km|m)\b/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return Number.isFinite(n) ? (m[2] === "km" ? n * 1000 : n) : null;
};

const monthsAhead = (d: string) => (new Date(d).getTime() - Date.now()) / (30 * 24 * 3600 * 1000);

const toJt = (n: number) => `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")} jt`;

interface Scored {
  pkg: PackageData;
  score: number;
  reasons: string[];
  price: number;
}

function rank(packages: PackageData[], a: Answers): Scored[] {
  const live = packages.filter((p) => !isPackageUnavailable(p));
  if (live.length === 0) return [];
  const prices = live.map((p) => getTierPrice(p).quad).filter((n) => n > 0);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const info = live.map((pkg) => {
    const tier = pkg.available_tiers?.[0] || "nyaman";
    const h = resolveTierHotels(pkg as unknown as PublishedPackage, tier);
    return { pkg, price: getTierPrice(pkg).quad, direct: pkg.flight_type?.toLowerCase() === "direct", dist: meters(h.makkah.distance), star: h.makkah.star || 0, h };
  });
  const dists = info.map((i) => i.dist).filter((d): d is number => d !== null);
  const minD = dists.length ? Math.min(...dists) : 0;
  const maxD = dists.length ? Math.max(...dists) : 1;
  const norm = (v: number, lo: number, hi: number) => (hi === lo ? 1 : (v - lo) / (hi - lo));

  return info
    .map(({ pkg, price, direct, dist, star, h }) => {
      const cheap = 1 - norm(price, minP, maxP);
      const near = dist === null ? star / 5 : 1 - norm(dist, minD, maxD);
      const m = monthsAhead(pkg.departure_date);
      const fits = a.when === "soon" ? m <= 2 : a.when === "mid" ? m > 2 && m <= 4 : a.when === "late" ? m > 4 : true;
      const timeScore = a.when === "any" ? 0.5 : fits ? 1 : Math.max(0, 1 - Math.abs(m - (a.when === "soon" ? 1 : a.when === "mid" ? 3 : 6)) / 6);

      let wPrice = 1, wHotel = 1, wDirect = 1;
      if (a.focus === "price") wPrice = 3;
      if (a.focus === "hotel") wHotel = 3;
      if (a.focus === "direct") wDirect = 3;
      if (a.who === "parents") { wDirect += 1.5; wHotel += 1.5; }
      if (a.who === "kids") { wDirect += 1.5; wHotel += 0.5; }
      if (a.who === "group") wPrice += 1;
      const score = cheap * wPrice + near * wHotel + (direct ? 1 : 0) * wDirect + timeScore * 2;

      const reasons: string[] = [];
      if (direct) reasons.push("Penerbangan langsung");
      if (dist !== null && dist <= minD + (maxD - minD) * 0.34) reasons.push(`Hotel ${h.makkah.distance} ke Masjidil Haram`);
      else if (star >= 5) reasons.push("Hotel bintang 5");
      if (cheap >= 0.66) reasons.push(`Mulai ${toJt(price)}`);
      if (fits && a.when !== "any") reasons.push(`Berangkat ${format(new Date(pkg.departure_date), "d MMM", { locale: localeId })}`);
      return { pkg, score, reasons: reasons.slice(0, 3), price };
    })
    .sort((x, y) => y.score - x.score);
}

const LABEL: Record<string, string> = {
  solo: "sendiri atau berdua", parents: "bersama orang tua", kids: "bersama anak", group: "rombongan keluarga",
  price: "harga paling hemat", hotel: "hotel dekat Masjidil Haram", direct: "penerbangan langsung", balanced: "seimbang",
  soon: "secepatnya", mid: "3 sampai 4 bulan lagi", late: "lebih dari 4 bulan lagi", any: "fleksibel",
};

function cardOf(s: Scored, index: number) {
  const pkg = s.pkg;
  const tier = pkg.available_tiers?.[0] || "nyaman";
  const h = resolveTierHotels(pkg as unknown as PublishedPackage, tier);
  return (
    <PkgListCard
      key={pkg.id}
      id={pkg.id}
      slug={pkg.slug || undefined}
      image={pkg.banner_image || "/placeholder.svg"}
      title={pkg.package_name}
      price={toJt(s.price)}
      priceValue={s.price}
      date={format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: localeId })}
      dateShort={format(new Date(pkg.departure_date), "d MMM yyyy", { locale: localeId })}
      duration={`${pkg.duration_days} Hari`}
      airline={pkg.flight}
      hotelMakkah={h.makkah.name || undefined}
      hotelMakkahRating={h.makkah.star || undefined}
      hotelMadinah={h.madinah.name || undefined}
      hotelMadinahRating={h.madinah.star || undefined}
      index={index}
      slotsTotal={pkg.slots_total}
      slotsFilled={getSlotsTaken(pkg)}
    />
  );
}

/** Three quick questions, then the best-fitting open packages from the real list. */
export const PackageQuiz = ({ packages, loading }: { packages: PackageData[] | null; loading: boolean }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const done = step >= QUESTIONS.length;
  const results = useMemo(() => (done && packages ? rank(packages, answers) : []), [done, packages, answers]);

  const pick = (key: string, v: string) => {
    setAnswers((a) => ({ ...a, [key]: v }));
    setStep((s) => s + 1);
  };
  const reset = () => {
    setAnswers({});
    setStep(0);
  };
  const ask = () =>
    redirectToWhatsApp(
      `Assalamu'alaikum Musafar Tour, saya ikut kuis paket. Berangkat ${LABEL[answers.who || "solo"]}, prioritas ${LABEL[answers.focus || "balanced"]}, waktu ${LABEL[answers.when || "any"]}. Boleh dibantu pilihkan paket?`,
      "home_quiz",
    );

  const q = QUESTIONS[step];
  const btn = "pkg-press pkg-label inline-flex h-12 items-center gap-2 rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2";

  return (
    <PkgPanel tone="cream" id="packages-carousel">
      <div className="mx-auto max-w-3xl">
        <p className="pkg-glass pkg-label inline-flex h-8 items-center rounded-full px-3 text-[13px]">
          {done ? "Hasil kuis" : `Kuis singkat · ${step + 1} dari ${QUESTIONS.length}`}
        </p>

        {!done && q && (
          <div key={step} className="pkg-quiz-in">
            <h2 className="pkg-h2 mt-5 text-balance">{q.title}</h2>
            <div className="mt-8 flex flex-col gap-3">
              {q.options.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => pick(q.key, o.v)}
                  className="pkg-press pkg-glass pkg-label flex h-14 w-full items-center rounded-full px-6 text-left text-[17px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
                >
                  {o.label}
                </button>
              ))}
            </div>
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="pkg-label mt-4 inline-flex min-h-11 items-center gap-1.5 text-pkg-fg-2 underline underline-offset-4">
                <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali
              </button>
            )}
          </div>
        )}

        {done && (
          <div className="pkg-quiz-in">
            {loading || !packages ? (
              <div className="mt-6"><PkgCardSkeleton /></div>
            ) : results.length === 0 ? (
              <>
                <h2 className="pkg-h2 mt-5">Belum ada paket yang cocok.</h2>
                <button type="button" onClick={ask} className={`${btn} pkg-glass-red mt-6 h-14 px-7`}>
                  <MessageCircle className="h-5 w-5" aria-hidden /> Tanya CS
                </button>
              </>
            ) : (
              <>
                <h2 className="pkg-h2 mt-5 text-balance">Paket ini paling cocok.</h2>
                {results[0].reasons.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {results[0].reasons.map((r) => (
                      <li key={r} className="pkg-glass pkg-label inline-flex h-8 items-center rounded-full px-3 text-[13px]">{r}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-6">{cardOf(results[0], 0)}</div>
                {results[1] && (
                  <>
                    <p className="pkg-label mt-8 text-pkg-fg-2">Alternatif</p>
                    <div className="mt-3">{cardOf(results[1], 1)}</div>
                  </>
                )}
                <div className="mt-8 flex flex-wrap gap-3">
                  <button type="button" onClick={ask} className={`${btn} pkg-glass-red h-14 px-7`}>
                    <MessageCircle className="h-5 w-5" aria-hidden /> Tanya CS soal ini
                  </button>
                  <button type="button" onClick={reset} className={`${btn} pkg-glass h-14 px-6`}>
                    <RotateCcw className="h-4 w-4" aria-hidden /> Ulangi
                  </button>
                </div>
                <Link to="/paket-umroh" className="pkg-label mt-5 inline-flex min-h-11 items-center text-pkg-red-deep underline underline-offset-4">
                  Lihat semua paket
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </PkgPanel>
  );
};
