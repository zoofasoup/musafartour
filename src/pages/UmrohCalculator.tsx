import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { useCalculatorTiers } from "@/hooks/useCalculatorPackages";
import {
  buildTierResult,
  formatIDR,
  formatMonthYear,
  monthlyTargetForGoal,
  pickRecommended,
  speedUpImpact,
  type CalcInput,
  type TierOption,
  type TierResult,
} from "@/lib/umrohCalc";
import {
  DAILY_MOTIVATION,
  PRICING_FOOTNOTE,
  dailyEquivalent,
  parseTrackingParams,
} from "@/lib/calcConfig";
import musafarLogo from "@/assets/musafar-logo-dark.svg";

// Brand
const BRAND = {
  red: "#C8102E",
  gold: "#FFB100",
  ink: "#262626",
  bg: "#F2F3F3",
  muted: "#989999",
};

const SAVING_CHIPS = [500_000, 1_000_000, 2_000_000, 3_000_000];
const TIMEFRAME_CHIPS = [6, 12, 18, 24, 36];

type Mode = "A" | "B";

type Step =
  | { kind: "intro" }
  | { kind: "mode" }
  // Mode A
  | { kind: "a-q1" }
  | { kind: "a-q2" }
  | { kind: "a-q3" }
  // Mode B
  | { kind: "b-q1" } // target months
  | { kind: "b-q2" } // pick package
  | { kind: "b-q3" } // pilgrims
  | { kind: "b-q4" } // existing savings
  | { kind: "computing" }
  | { kind: "wrapped"; index: number }
  | { kind: "submitting" };

const leadSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  whatsapp: z
    .string()
    .trim()
    .min(10, "Nomor minimal 10 digit")
    .max(15)
    .regex(/^[0-9+]+$/, "Hanya angka & tanda +"),
});

const WRAPPED_COUNT = 10;

export default function UmrohCalculator() {
  const navigate = useNavigate();
  const { data: tiers, isLoading } = useCalculatorTiers();
  const [step, setStep] = useState<Step>({ kind: "intro" });
  const [mode, setMode] = useState<Mode>("A");

  // Shared inputs
  const [pilgrims, setPilgrims] = useState<number>(1);
  const [hasSavings, setHasSavings] = useState<boolean | null>(null);
  const [existing, setExisting] = useState<number>(0);

  // Mode A
  const [monthly, setMonthly] = useState<number>(1_000_000);
  const [customOn, setCustomOn] = useState(false);

  // Mode B
  const [targetMonths, setTargetMonths] = useState<number>(12);
  const [customMonthsOn, setCustomMonthsOn] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierOption | null>(null);

  // Lead capture
  const [leadName, setLeadName] = useState("");
  const [leadWa, setLeadWa] = useState("");
  const [companion, setCompanion] = useState("");
  const [errors, setErrors] = useState<{ name?: string; whatsapp?: string }>({});

  // Tracking
  const [tracking] = useState(() =>
    typeof window !== "undefined" ? parseTrackingParams(window.location.search) : {} as any,
  );
  const [eventId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  );

  const existingSavings = hasSavings ? existing : 0;

  const inputA: CalcInput = { monthlySaving: monthly, pilgrimCount: pilgrims, existingSavings };

  const resultsA = useMemo<TierResult[]>(() => {
    if (!tiers || tiers.length === 0) return [];
    return tiers.map((t) => buildTierResult(t, inputA));
  }, [tiers, monthly, pilgrims, existingSavings]);

  const recommendedA = useMemo(
    () => (resultsA.length ? pickRecommended(resultsA) : null),
    [resultsA],
  );

  // Mode B computed
  const calcB = useMemo(() => {
    if (!selectedTier) return null;
    return monthlyTargetForGoal(selectedTier.pricePerPerson, pilgrims, targetMonths, existingSavings);
  }, [selectedTier, pilgrims, targetMonths, existingSavings]);

  // Unified display values (used by slides)
  const perDay = mode === "A" ? monthly / 30 : (calcB?.daily ?? 0);
  const perWeek = mode === "A" ? monthly / 4.345 : (calcB?.weekly ?? 0);
  const perMonth = mode === "A" ? monthly : (calcB?.monthly ?? 0);

  // Onest font
  useEffect(() => {
    if (document.getElementById("onest-font")) return;
    const link = document.createElement("link");
    link.id = "onest-font";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Onest:wght@300;400;500;600;700;800;900&display=swap";
    document.head.appendChild(link);
  }, []);

  // Auto-advance "computing"
  useEffect(() => {
    if (step.kind !== "computing") return;
    const t = setTimeout(() => setStep({ kind: "wrapped", index: 0 }), 1400);
    return () => clearTimeout(t);
  }, [step]);

  const resetAll = () => {
    setStep({ kind: "intro" });
    setMode("A");
    setPilgrims(1);
    setHasSavings(null);
    setExisting(0);
    setMonthly(1_000_000);
    setCustomOn(false);
    setTargetMonths(12);
    setCustomMonthsOn(false);
    setSelectedTier(null);
    setLeadName("");
    setLeadWa("");
    setCompanion("");
    setErrors({});
  };

  const submitLead = async () => {
    setErrors({});
    const parsed = leadSchema.safeParse({ name: leadName, whatsapp: leadWa });
    if (!parsed.success) {
      const fe: typeof errors = {};
      parsed.error.issues.forEach((i) => (fe[i.path[0] as keyof typeof errors] = i.message));
      setErrors(fe);
      return;
    }
    setStep({ kind: "submitting" });

    const recommended = mode === "A" ? recommendedA : null;
    const departureLabel =
      mode === "A"
        ? recommendedA?.feasibleLabel
        : (() => {
            const d = new Date();
            d.setMonth(d.getMonth() + targetMonths);
            return formatMonthYear(d.toISOString());
          })();

    const { data, error } = await supabase
      .from("umroh_calculator_leads")
      .insert({
        name: parsed.data.name,
        whatsapp: parsed.data.whatsapp,
        companion_name: companion.trim() || null,
        mode,
        monthly_saving: mode === "A" ? monthly : null,
        target_timeframe_months: mode === "B" ? targetMonths : null,
        selected_package: mode === "B" ? selectedTier?.label ?? null : recommended?.label ?? null,
        calculated_monthly_target: mode === "B" ? Math.round(calcB?.monthly ?? 0) : null,
        calculated_daily_target: Math.round(perDay),
        pilgrim_count: pilgrims,
        existing_savings: existingSavings,
        recommended_package_id: mode === "A" ? recommended?.packageId ?? null : selectedTier?.packageId ?? null,
        recommended_tier: mode === "A" ? recommended?.tier ?? null : selectedTier?.tier ?? null,
        daily_target: Math.round(perDay),
        months_to_departure: mode === "A" ? recommended?.monthsRequired ?? null : targetMonths,
        status: "NEW",
        utm_source: tracking.utm_source,
        utm_medium: tracking.utm_medium,
        utm_campaign: tracking.utm_campaign,
        fbclid: tracking.fbclid,
        ctwa_clid: tracking.ctwa_clid,
        event_id: eventId,
        result_data: JSON.parse(JSON.stringify({
          mode,
          resultsA,
          recommendedTier: recommended?.tier,
          selectedTier,
          targetMonths,
          calcB,
          departureLabel,
        })),
        referrer: document.referrer || null,
        user_agent: navigator.userAgent.slice(0, 500),
      })
      .select("id")
      .single();

    if (error || !data) {
      setStep({ kind: "wrapped", index: WRAPPED_COUNT - 2 });
      setErrors({ name: "Gagal menyimpan. Coba lagi." });
      return;
    }

    // Fire Meta Pixel Lead event (same event_id for CAPI dedup)
    try {
      const fbq = (window as any).fbq;
      if (typeof fbq === "function") {
        fbq("track", "Lead", { content_name: "Umroh Financial Planner" }, { eventID: eventId });
      }
    } catch {}

    navigate(`/kalkulator/hasil/${data.id}`);
  };

  // Navigation
  const goNext = () => {
    if (step.kind === "intro") return setStep({ kind: "mode" });
    if (step.kind === "mode") return setStep({ kind: mode === "A" ? "a-q1" : "b-q1" });
    if (step.kind === "a-q1") return setStep({ kind: "a-q2" });
    if (step.kind === "a-q2") return setStep({ kind: "a-q3" });
    if (step.kind === "a-q3") return setStep({ kind: "computing" });
    if (step.kind === "b-q1") return setStep({ kind: "b-q2" });
    if (step.kind === "b-q2") return setStep({ kind: "b-q3" });
    if (step.kind === "b-q3") return setStep({ kind: "b-q4" });
    if (step.kind === "b-q4") return setStep({ kind: "computing" });
    if (step.kind === "wrapped" && step.index < WRAPPED_COUNT - 1)
      return setStep({ kind: "wrapped", index: step.index + 1 });
  };

  const goBack = () => {
    if (step.kind === "mode") return setStep({ kind: "intro" });
    if (step.kind === "a-q1") return setStep({ kind: "mode" });
    if (step.kind === "a-q2") return setStep({ kind: "a-q1" });
    if (step.kind === "a-q3") return setStep({ kind: "a-q2" });
    if (step.kind === "b-q1") return setStep({ kind: "mode" });
    if (step.kind === "b-q2") return setStep({ kind: "b-q1" });
    if (step.kind === "b-q3") return setStep({ kind: "b-q2" });
    if (step.kind === "b-q4") return setStep({ kind: "b-q3" });
    if (step.kind === "wrapped" && step.index > 0)
      return setStep({ kind: "wrapped", index: step.index - 1 });
  };

  // For Mode B reveal, we need a synthetic recommended TierResult-like object
  const recommendedDisplay: TierResult | null = useMemo(() => {
    if (mode === "A") return recommendedA;
    if (!selectedTier || !calcB) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + targetMonths);
    return {
      ...selectedTier,
      totalNeeded: calcB.totalNeeded,
      netNeeded: calcB.netNeeded,
      monthsRequired: targetMonths,
      feasibleDate: d.toISOString().slice(0, 10),
      feasibleLabel: formatMonthYear(d.toISOString()),
      matchesRealDeparture: true,
    };
  }, [mode, recommendedA, selectedTier, calcB, targetMonths]);

  return (
    <div
      style={{
        background: BRAND.bg,
        color: BRAND.ink,
        fontFamily: "'Onest', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        minHeight: "100vh",
        letterSpacing: "-0.02em",
      }}
      className="flex flex-col"
    >
      <header className="w-full px-6 py-5 flex items-center justify-between gap-3">
        <img src={musafarLogo} alt="Musafar" className="h-7" />
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-xs font-semibold tracking-widest uppercase" style={{ color: BRAND.muted }}>
            Umroh Financial Planner
          </div>
          {step.kind !== "intro" && step.kind !== "submitting" && (
            <button
              onClick={() => {
                if (window.confirm("Mulai hitung untuk orang baru? Data yang belum dikirim akan hilang.")) resetAll();
              }}
              className="h-9 px-3 rounded-full text-[11px] font-bold uppercase tracking-widest active:scale-95 transition-transform"
              style={{ background: "white", color: BRAND.ink, border: `1.5px solid #e5e5e5` }}
              title="Hitung untuk orang lain"
            >
              ↻ Hitung Lagi
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-2">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {step.kind === "intro" && <Intro key="intro" onStart={goNext} />}

            {step.kind === "mode" && (
              <ModePicker
                key="mode"
                value={mode}
                onChange={setMode}
                onNext={goNext}
                onBack={goBack}
              />
            )}

            {step.kind === "a-q1" && (
              <Q_Monthly
                key="a-q1"
                value={monthly}
                customOn={customOn}
                onChange={(v, c) => { setMonthly(v); setCustomOn(c); }}
                onNext={goNext}
                onBack={goBack}
                stepIdx={1} total={3}
              />
            )}
            {step.kind === "a-q2" && (
              <Q_Pilgrims key="a-q2" value={pilgrims} onChange={setPilgrims} onNext={goNext} onBack={goBack} stepIdx={2} total={3} />
            )}
            {step.kind === "a-q3" && (
              <Q_Savings key="a-q3" hasSavings={hasSavings} amount={existing} onChange={(h, a) => { setHasSavings(h); setExisting(a); }} onNext={goNext} onBack={goBack} stepIdx={3} total={3} />
            )}

            {step.kind === "b-q1" && (
              <Q_Timeframe
                key="b-q1"
                value={targetMonths}
                customOn={customMonthsOn}
                onChange={(v, c) => { setTargetMonths(v); setCustomMonthsOn(c); }}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step.kind === "b-q2" && (
              <Q_PickPackage
                key="b-q2"
                tiers={tiers ?? []}
                selected={selectedTier}
                onSelect={setSelectedTier}
                onNext={goNext}
                onBack={goBack}
                loading={isLoading}
              />
            )}
            {step.kind === "b-q3" && (
              <Q_Pilgrims key="b-q3" value={pilgrims} onChange={setPilgrims} onNext={goNext} onBack={goBack} stepIdx={3} total={4} />
            )}
            {step.kind === "b-q4" && (
              <Q_Savings key="b-q4" hasSavings={hasSavings} amount={existing} onChange={(h, a) => { setHasSavings(h); setExisting(a); }} onNext={goNext} onBack={goBack} stepIdx={4} total={4} />
            )}

            {step.kind === "computing" && <Computing key="computing" />}

            {step.kind === "wrapped" && recommendedDisplay && (
              <Wrapped
                key={`wrapped-${step.index}`}
                index={step.index}
                total={WRAPPED_COUNT}
                mode={mode}
                perDay={perDay}
                perWeek={perWeek}
                perMonth={perMonth}
                results={resultsA}
                recommended={recommendedDisplay}
                input={{ monthlySaving: perMonth, pilgrimCount: pilgrims, existingSavings }}
                leadName={leadName}
                leadWa={leadWa}
                companion={companion}
                errors={errors}
                onNameChange={setLeadName}
                onWaChange={setLeadWa}
                onCompanionChange={setCompanion}
                onNext={goNext}
                onBack={goBack}
                onSubmit={submitLead}
                onReset={resetAll}
              />
            )}

            {step.kind === "submitting" && <Computing key="submitting" label="Menyimpan rencana kamu…" />}
          </AnimatePresence>
        </div>
      </main>

      <footer className="text-center py-4 text-[11px] tracking-wider uppercase" style={{ color: BRAND.muted }}>
        Musafar · musafartour.com
      </footer>
    </div>
  );
}

/* ---------------- Common ---------------- */

const fade = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.45, ease: "easeOut" as const },
};

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full h-14 rounded-2xl font-semibold text-base transition-transform active:scale-[0.98] disabled:opacity-50"
      style={{ background: BRAND.red, color: "white", letterSpacing: "-0.01em" }}
    >
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-sm font-medium underline-offset-4 hover:underline" style={{ color: BRAND.muted }}>
      {children}
    </button>
  );
}

function Footnote() {
  return (
    <div className="text-[10px] leading-snug pt-3" style={{ color: BRAND.muted }}>
      * {PRICING_FOOTNOTE}
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <motion.div {...fade} className="text-center space-y-8 py-8">
      <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest" style={{ background: BRAND.gold + "22", color: BRAND.red }}>
        Umroh Financial Planner · 60 detik
      </div>
      <h1 className="text-5xl md:text-7xl font-black leading-[0.95]" style={{ letterSpacing: "-0.045em", color: BRAND.ink }}>
        Kapan kamu <br /><span style={{ color: BRAND.red }}>siap umroh?</span>
      </h1>
      <p className="text-base md:text-lg max-w-md mx-auto" style={{ color: BRAND.muted, letterSpacing: "-0.015em" }}>
        Perencana finansial umroh — hitung kapan kamu bisa berangkat, atau berapa harus nabung tiap bulan untuk target tanggalmu.
      </p>
      <div className="max-w-xs mx-auto pt-2">
        <PrimaryBtn onClick={onStart}>Mulai Hitung →</PrimaryBtn>
      </div>
    </motion.div>
  );
}

function ModePicker({
  value, onChange, onNext, onBack,
}: { value: Mode; onChange: (m: Mode) => void; onNext: () => void; onBack: () => void; }) {
  return (
    <motion.div {...fade} className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <GhostBtn onClick={onBack}>← Kembali</GhostBtn>
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl md:text-4xl font-black" style={{ letterSpacing: "-0.045em" }}>
          Pilih cara hitungmu
        </h2>
        <p style={{ color: BRAND.muted, letterSpacing: "-0.015em" }}>
          Dua arah berbeda, hasil sama akuratnya.
        </p>
      </div>
      <div className="grid gap-3">
        {[
          { key: "A" as const, title: "Hitung dari Tabungan", desc: "Aku tahu berapa bisa nabung tiap bulan. Kasih tahu kapan bisa berangkat." },
          { key: "B" as const, title: "Hitung dari Target Tanggal", desc: "Aku mau berangkat dalam waktu tertentu. Hitung berapa harus nabung." },
        ].map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className="text-left rounded-2xl p-5 transition-all active:scale-[0.99]"
              style={{
                background: active ? BRAND.ink : "white",
                color: active ? "white" : BRAND.ink,
                border: `2px solid ${active ? BRAND.ink : "#e5e5e5"}`,
              }}
            >
              <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Mode {opt.key}</div>
              <div className="text-xl font-black" style={{ letterSpacing: "-0.03em" }}>{opt.title}</div>
              <div className="text-sm mt-1 opacity-80">{opt.desc}</div>
            </button>
          );
        })}
      </div>
      <PrimaryBtn onClick={onNext}>Lanjut →</PrimaryBtn>
    </motion.div>
  );
}

function StepFrame({
  step, total, title, subtitle, children, onNext, onBack, canNext = true, nextLabel = "Lanjut →",
}: any) {
  return (
    <motion.div {...fade} className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <GhostBtn onClick={onBack}>← Kembali</GhostBtn>
        <div className="text-xs font-semibold" style={{ color: BRAND.muted }}>{step}/{total}</div>
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl md:text-4xl font-black" style={{ letterSpacing: "-0.045em" }}>{title}</h2>
        {subtitle && <p style={{ color: BRAND.muted, letterSpacing: "-0.015em" }}>{subtitle}</p>}
      </div>
      <div>{children}</div>
      <PrimaryBtn onClick={onNext} disabled={!canNext}>{nextLabel}</PrimaryBtn>
    </motion.div>
  );
}

function Q_Monthly({ value, customOn, onChange, onNext, onBack, stepIdx, total }: any) {
  return (
    <StepFrame step={stepIdx} total={total} title="Berapa yang bisa kamu sisihkan tiap bulan?" subtitle="Pilih cepat, atau geser slider untuk angka custom." onNext={onNext} onBack={onBack}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {SAVING_CHIPS.map((v) => {
          const active = !customOn && value === v;
          return (
            <button key={v} onClick={() => onChange(v, false)} className="h-16 rounded-2xl font-bold text-lg transition-all active:scale-[0.98]"
              style={{ background: active ? BRAND.ink : "white", color: active ? "white" : BRAND.ink, border: `2px solid ${active ? BRAND.ink : "#e5e5e5"}`, letterSpacing: "-0.02em" }}>
              {formatIDR(v)}
            </button>
          );
        })}
      </div>
      <button onClick={() => onChange(value, true)} className="w-full h-12 rounded-xl text-sm font-semibold mb-3"
        style={{ background: customOn ? BRAND.gold + "33" : "transparent", color: BRAND.ink, border: `1.5px dashed ${BRAND.muted}` }}>
        {customOn ? `Custom: ${formatIDR(value)}` : "Pakai angka custom"}
      </button>
      {customOn && (
        <div className="px-1 pt-2">
          <input type="range" min={100_000} max={10_000_000} step={100_000} value={value} onChange={(e) => onChange(Number(e.target.value), true)} className="w-full accent-[#C8102E]" />
          <div className="flex justify-between text-xs mt-2" style={{ color: BRAND.muted }}>
            <span>Rp 100rb</span><span>Rp 10jt</span>
          </div>
        </div>
      )}
    </StepFrame>
  );
}

function Q_Pilgrims({ value, onChange, onNext, onBack, stepIdx, total }: any) {
  const opts = [{ v: 1, label: "Saya sendiri" }, { v: 2, label: "Saya + 1 orang" }, { v: -1, label: "Keluarga" }];
  const isFamily = value >= 3 || (value !== 1 && value !== 2);
  return (
    <StepFrame step={stepIdx} total={total} title="Siapa yang berangkat bareng kamu?" subtitle="Total biaya disesuaikan dengan jumlah jamaah." onNext={onNext} onBack={onBack}>
      <div className="grid grid-cols-1 gap-3 mb-4">
        {opts.map((o) => {
          const active = (o.v === 1 && value === 1) || (o.v === 2 && value === 2) || (o.v === -1 && isFamily);
          return (
            <button key={o.label} onClick={() => onChange(o.v === -1 ? Math.max(3, value) : o.v)}
              className="h-16 rounded-2xl font-semibold text-base text-left px-5 transition-all active:scale-[0.98]"
              style={{ background: active ? BRAND.ink : "white", color: active ? "white" : BRAND.ink, border: `2px solid ${active ? BRAND.ink : "#e5e5e5"}` }}>
              {o.label}
            </button>
          );
        })}
      </div>
      {isFamily && (
        <div className="rounded-2xl p-4 bg-white border" style={{ borderColor: "#e5e5e5" }}>
          <div className="text-sm font-semibold mb-3">Total jamaah keluarga</div>
          <div className="flex items-center gap-4 justify-center">
            <button onClick={() => onChange(Math.max(3, value - 1))} className="w-12 h-12 rounded-full text-2xl font-black" style={{ background: BRAND.bg, color: BRAND.ink }}>−</button>
            <div className="text-4xl font-black w-16 text-center" style={{ letterSpacing: "-0.05em" }}>{value}</div>
            <button onClick={() => onChange(Math.min(20, value + 1))} className="w-12 h-12 rounded-full text-2xl font-black" style={{ background: BRAND.red, color: "white" }}>+</button>
          </div>
        </div>
      )}
    </StepFrame>
  );
}

function Q_Savings({ hasSavings, amount, onChange, onNext, onBack, stepIdx, total }: any) {
  return (
    <StepFrame step={stepIdx} total={total} title="Sudah ada tabungan tersisih?" subtitle="Tabungan awal mempercepat keberangkatanmu." onNext={onNext} onBack={onBack}
      canNext={hasSavings !== null} nextLabel="Lihat Hasilku ✨">
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[{ val: false, label: "Belum ada" }, { val: true, label: "Sudah ada" }].map((o) => {
          const active = hasSavings === o.val;
          return (
            <button key={o.label} onClick={() => onChange(o.val, o.val ? amount : 0)} className="h-16 rounded-2xl font-bold text-base transition-all active:scale-[0.98]"
              style={{ background: active ? BRAND.ink : "white", color: active ? "white" : BRAND.ink, border: `2px solid ${active ? BRAND.ink : "#e5e5e5"}` }}>
              {o.label}
            </button>
          );
        })}
      </div>
      {hasSavings && (
        <div className="rounded-2xl p-4 bg-white border" style={{ borderColor: "#e5e5e5" }}>
          <label className="text-sm font-semibold block mb-2">Berapa total tabunganmu saat ini?</label>
          <div className="flex items-center gap-2">
            <span className="font-bold" style={{ color: BRAND.muted }}>Rp</span>
            <input type="number" inputMode="numeric" value={amount || ""} onChange={(e) => onChange(true, Number(e.target.value) || 0)} placeholder="5.000.000"
              className="w-full h-12 text-2xl font-bold bg-transparent outline-none" style={{ letterSpacing: "-0.02em" }} />
          </div>
        </div>
      )}
    </StepFrame>
  );
}

function Q_Timeframe({ value, customOn, onChange, onNext, onBack }: any) {
  return (
    <StepFrame step={1} total={4} title="Mau berangkat dalam berapa lama?" subtitle="Pilih cepat, atau geser slider untuk custom." onNext={onNext} onBack={onBack}>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {TIMEFRAME_CHIPS.map((m) => {
          const active = !customOn && value === m;
          return (
            <button key={m} onClick={() => onChange(m, false)} className="h-16 rounded-2xl font-bold transition-all active:scale-[0.98]"
              style={{ background: active ? BRAND.ink : "white", color: active ? "white" : BRAND.ink, border: `2px solid ${active ? BRAND.ink : "#e5e5e5"}`, letterSpacing: "-0.02em" }}>
              <div className="text-2xl font-black leading-none">{m}</div>
              <div className="text-[10px] uppercase tracking-widest mt-1 opacity-80">bulan</div>
            </button>
          );
        })}
      </div>
      <button onClick={() => onChange(value, true)} className="w-full h-12 rounded-xl text-sm font-semibold mb-3"
        style={{ background: customOn ? BRAND.gold + "33" : "transparent", color: BRAND.ink, border: `1.5px dashed ${BRAND.muted}` }}>
        {customOn ? `Custom: ${value} bulan` : "Pakai durasi custom"}
      </button>
      {customOn && (
        <div className="px-1 pt-2">
          <input type="range" min={3} max={60} step={1} value={value} onChange={(e) => onChange(Number(e.target.value), true)} className="w-full accent-[#C8102E]" />
          <div className="flex justify-between text-xs mt-2" style={{ color: BRAND.muted }}>
            <span>3 bln</span><span>60 bln</span>
          </div>
        </div>
      )}
    </StepFrame>
  );
}

function Q_PickPackage({ tiers, selected, onSelect, onNext, onBack, loading }: any) {
  return (
    <StepFrame step={2} total={4} title="Mau paket yang mana?" subtitle="Pilih tier yang sesuai impianmu." onNext={onNext} onBack={onBack} canNext={!!selected}>
      <div className="grid gap-3">
        {loading && <div className="text-sm" style={{ color: BRAND.muted }}>Memuat paket…</div>}
        {!loading && tiers.length === 0 && <div className="text-sm" style={{ color: BRAND.muted }}>Belum ada paket tersedia.</div>}
        {tiers.map((t: TierOption) => {
          const active = selected?.tier === t.tier;
          return (
            <button key={t.tier} onClick={() => onSelect(t)}
              className="text-left rounded-2xl p-4 transition-all active:scale-[0.99] flex items-center justify-between gap-3"
              style={{ background: active ? BRAND.red : "white", color: active ? "white" : BRAND.ink, border: `2px solid ${active ? BRAND.red : "#e5e5e5"}` }}>
              <div>
                <div className="text-base font-black uppercase tracking-wide" style={{ letterSpacing: "-0.02em" }}>{t.label}</div>
                <div className="text-xs opacity-80 mt-0.5">{formatIDR(t.pricePerPerson)}/jamaah</div>
              </div>
              <div className="text-[10px] uppercase tracking-widest opacity-70">{active ? "Dipilih" : "Pilih"}</div>
            </button>
          );
        })}
      </div>
      <Footnote />
    </StepFrame>
  );
}

function Computing({ label = "Menghitung rencanamu…" }: { label?: string }) {
  return (
    <motion.div {...fade} className="text-center py-24 space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full border-4 animate-spin" style={{ borderColor: BRAND.bg, borderTopColor: BRAND.red }} />
      </div>
      <div className="text-lg font-semibold" style={{ letterSpacing: "-0.02em" }}>{label}</div>
    </motion.div>
  );
}

/* ---------------- Wrapped slides ---------------- */

function Wrapped(props: {
  index: number; total: number; mode: Mode;
  perDay: number; perWeek: number; perMonth: number;
  results: TierResult[]; recommended: TierResult;
  input: CalcInput;
  leadName: string; leadWa: string; companion: string;
  errors: { name?: string; whatsapp?: string };
  onNameChange: (s: string) => void; onWaChange: (s: string) => void; onCompanionChange: (s: string) => void;
  onNext: () => void; onBack: () => void; onSubmit: () => void; onReset: () => void;
}) {
  const { index, total, mode, perDay, perWeek, perMonth, results, recommended, input,
    leadName, leadWa, companion, errors, onNameChange, onWaChange, onCompanionChange,
    onNext, onBack, onSubmit, onReset } = props;

  return (
    <motion.div key={index} {...fade} className="relative">
      <div className="flex gap-1.5 mb-6">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i <= index ? BRAND.red : "#e5e5e5" }} />
        ))}
      </div>

      <div className="rounded-3xl p-8 md:p-10 min-h-[440px] flex flex-col justify-center relative overflow-hidden"
        style={{ background: "white", boxShadow: "0 20px 60px -20px rgba(0,0,0,0.15)" }}>
        {index === 0 && <CardHero perDay={perDay} perWeek={perWeek} perMonth={perMonth} mode={mode} />}
        {index === 1 && <CardReframe perDay={perDay} />}
        {index === 2 && <CardHabitSim input={input} recommended={recommended} />}
        {index === 3 && (mode === "A"
          ? <CardLadder results={results} recommended={recommended} />
          : <CardTargetDate recommended={recommended} perMonth={perMonth} />)}
        {index === 4 && <CardTimeline recommended={recommended} />}
        {index === 5 && <CardLockPrice />}
        {index === 6 && <CardVsMusafar perMonth={perMonth} />}
        {index === 7 && <CardCountdown recommended={recommended} />}
        {index === 8 && <CardShare recommended={recommended} perDay={perDay} leadName={leadName} companion={companion} onCompanionChange={onCompanionChange} />}
        {index === 9 && (
          <CardLead recommended={recommended} leadName={leadName} leadWa={leadWa} errors={errors}
            onNameChange={onNameChange} onWaChange={onWaChange} onSubmit={onSubmit} onReset={onReset} />
        )}
      </div>

      <div className="flex items-center justify-between mt-6 px-1">
        <GhostBtn onClick={onBack}>← Kembali</GhostBtn>
        {index < total - 1 ? (
          <button onClick={onNext} className="h-12 px-6 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform"
            style={{ background: BRAND.ink, color: "white" }}>
            Lanjut →
          </button>
        ) : (
          <span className="text-xs" style={{ color: BRAND.muted }}>Isi data untuk simpan</span>
        )}
      </div>
    </motion.div>
  );
}

function CardHero({ perDay, perWeek, perMonth, mode }: { perDay: number; perWeek: number; perMonth: number; mode: Mode }) {
  return (
    <div className="space-y-6 text-center">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>
        {mode === "A" ? "Targetmu, dibagi per hari" : "Kamu harus nabung"}
      </div>
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.7, ease: "easeOut" as const }}>
        <div className="text-6xl md:text-8xl font-black" style={{ color: BRAND.red, letterSpacing: "-0.055em", lineHeight: 0.9 }}>
          {formatIDR(perDay)}
        </div>
        <div className="text-sm font-semibold mt-1" style={{ color: BRAND.muted }}>per hari</div>
      </motion.div>
      <div className="flex justify-center gap-6 pt-4">
        <Stat label="Per minggu" value={formatIDR(perWeek)} />
        <div className="w-px bg-neutral-200" />
        <Stat label="Per bulan" value={formatIDR(perMonth)} />
      </div>
      <Footnote />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider" style={{ color: BRAND.muted }}>{label}</div>
      <div className="text-lg font-bold" style={{ letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

function CardReframe({ perDay }: { perDay: number }) {
  return (
    <div className="space-y-6 text-center">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>Konteksnya begini…</div>
      <div className="text-3xl md:text-5xl font-black leading-tight" style={{ letterSpacing: "-0.04em" }}>
        {dailyEquivalent(perDay)}
      </div>
      <div className="text-base mt-4" style={{ color: BRAND.muted, letterSpacing: "-0.015em" }}>{DAILY_MOTIVATION}</div>
    </div>
  );
}

function CardLadder({ results, recommended }: { results: TierResult[]; recommended: TierResult }) {
  return (
    <div className="space-y-5">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>Tangga keberangkatanmu</div>
      <div className="text-2xl md:text-3xl font-black" style={{ letterSpacing: "-0.04em" }}>
        Insya Allah, kamu bisa berangkat di tanggal ini:
      </div>
      <div className="space-y-2.5 pt-2">
        {results.map((r) => {
          const isRec = r.tier === recommended.tier;
          return (
            <div key={r.tier} className="rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3"
              style={{ background: isRec ? BRAND.red : "white", color: isRec ? "white" : BRAND.ink, border: `2px solid ${isRec ? BRAND.red : "#eee"}` }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold uppercase tracking-wide">{r.label}</span>
                  {isRec && <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ background: BRAND.gold, color: BRAND.ink }}>Cocok</span>}
                </div>
                <div className="text-xs opacity-80 mt-0.5 truncate">
                  {r.monthsRequired >= 999 ? "Perlu tambahan tabungan" : `${r.monthsRequired} bulan menabung`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-base md:text-lg font-black" style={{ letterSpacing: "-0.03em" }}>
                  {r.monthsRequired >= 999 ? "—" : r.feasibleLabel}
                </div>
                <div className="text-[10px] uppercase tracking-widest opacity-75">{formatIDR(r.pricePerPerson)}/jamaah</div>
              </div>
            </div>
          );
        })}
      </div>
      <Footnote />
    </div>
  );
}

function CardTargetDate({ recommended, perMonth }: { recommended: TierResult; perMonth: number }) {
  return (
    <div className="space-y-5 text-center">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>Target keberangkatanmu</div>
      <div className="text-4xl md:text-6xl font-black" style={{ color: BRAND.red, letterSpacing: "-0.05em", lineHeight: 0.95 }}>
        {recommended.feasibleLabel}
      </div>
      <div className="inline-block px-4 py-1.5 rounded-full text-sm font-bold" style={{ background: BRAND.gold + "33", color: BRAND.ink }}>
        Paket {recommended.label} · {formatIDR(recommended.pricePerPerson)}/jamaah
      </div>
      <div className="text-base pt-2" style={{ color: BRAND.ink }}>
        Dengan menabung <b>{formatIDR(perMonth)}</b>/bulan, kamu akan siap berangkat tepat waktu insya Allah.
      </div>
      <Footnote />
    </div>
  );
}

function CardTimeline({ recommended }: { recommended: TierResult }) {
  const months = recommended.monthsRequired >= 999 ? 24 : recommended.monthsRequired;
  const milestones = [
    { pct: 25, label: `Bulan ke-${Math.max(1, Math.round(months * 0.25))}`, note: "Mulai konsisten 💪" },
    { pct: 50, label: `Bulan ke-${Math.round(months * 0.5)}`, note: "Setengah jalan ✨" },
    { pct: 75, label: `Bulan ke-${Math.round(months * 0.75)}`, note: "Pelunasan dimulai 📦" },
    { pct: 100, label: recommended.feasibleLabel, note: "Berangkat insya Allah 🕋" },
  ];
  return (
    <div className="space-y-5">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>Timeline tabunganmu</div>
      <div className="text-2xl md:text-3xl font-black" style={{ letterSpacing: "-0.04em" }}>
        Dari hari ini sampai berangkat
      </div>
      <div className="relative h-2 rounded-full bg-neutral-200 my-4">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: "100%", background: `linear-gradient(90deg, ${BRAND.gold}, ${BRAND.red})` }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {milestones.map((m) => (
          <div key={m.pct} className="rounded-2xl p-3" style={{ background: BRAND.bg }}>
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: BRAND.red }}>{m.pct}%</div>
            <div className="text-sm font-bold mt-1" style={{ letterSpacing: "-0.02em" }}>{m.label}</div>
            <div className="text-xs mt-0.5" style={{ color: BRAND.muted }}>{m.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardLockPrice() {
  return (
    <div className="space-y-5 text-center">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>Kenapa mulai sekarang?</div>
      <div className="text-3xl md:text-4xl font-black leading-tight" style={{ letterSpacing: "-0.04em" }}>
        Harga umroh cenderung <span style={{ color: BRAND.red }}>naik tiap tahun</span>.
      </div>
      <div className="text-base max-w-md mx-auto" style={{ color: BRAND.muted, letterSpacing: "-0.015em" }}>
        Mulai sedini mungkin = harga lebih terkunci, dan kamu lebih terlindungi dari kenaikan biaya tiket, hotel, dan kurs USD.
      </div>
      <Footnote />
    </div>
  );
}

function CardVsMusafar({ perMonth }: { perMonth: number }) {
  return (
    <div className="space-y-5">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>Nabung sendiri vs Program Musafar</div>
      <div className="text-2xl md:text-3xl font-black" style={{ letterSpacing: "-0.04em" }}>
        Lebih ringan kalau terstruktur.
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="rounded-2xl p-4" style={{ background: BRAND.bg }}>
          <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: BRAND.muted }}>Sendiri</div>
          <div className="text-base font-bold mt-2">Nabung manual, harga ikut pasar saat lunas.</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: BRAND.red, color: "white" }}>
          <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Program Musafar</div>
          <div className="text-base font-bold mt-2">Setoran terjadwal, harga lebih terjaga, dibimbing tim CS.</div>
        </div>
      </div>
      <div className="text-sm pt-2" style={{ color: BRAND.muted }}>
        Target nabungmu {formatIDR(perMonth)}/bulan bisa diatur otomatis lewat program kami.
      </div>
    </div>
  );
}

function CardShare({ recommended, perDay, leadName }: { recommended: TierResult; perDay: number; leadName: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `umroh-plan-${Date.now()}.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>Kartu untuk dibagikan</div>
      <div className="text-2xl md:text-3xl font-black" style={{ letterSpacing: "-0.04em" }}>
        Bawa pulang rencanamu — share ke Story.
      </div>

      <div className="flex justify-center pt-2">
        <div
          ref={cardRef}
          style={{
            width: 270, height: 480, // 9:16 thumbnail (final scales 2x = 540x960)
            background: `linear-gradient(160deg, ${BRAND.ink} 0%, #1a1a1a 100%)`,
            color: "white",
            fontFamily: "'Onest', system-ui, sans-serif",
            padding: 24,
            borderRadius: 24,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
            boxShadow: "0 20px 60px -20px rgba(0,0,0,0.4)",
          }}
        >
          <div>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 2, color: BRAND.gold, textTransform: "uppercase" }}>
              Umroh Financial Planner
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8, opacity: 0.8 }}>
              {leadName || "Calon Tamu Allah"},
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1, marginTop: 4, letterSpacing: "-0.03em" }}>
              insya Allah berangkat
            </div>
            <div style={{ fontSize: 38, fontWeight: 900, color: BRAND.red, lineHeight: 0.95, letterSpacing: "-0.04em", marginTop: 6 }}>
              {recommended.feasibleLabel}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.6 }}>
              Target harian
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: BRAND.gold, letterSpacing: "-0.03em" }}>
              {formatIDR(perDay)}
            </div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
              Paket {recommended.label}
            </div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, opacity: 0.6, textTransform: "uppercase" }}>
            MUSAFAR · musafartour.com
          </div>
        </div>
      </div>

      <button onClick={handleDownload} disabled={downloading}
        className="w-full h-12 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform"
        style={{ background: BRAND.gold, color: BRAND.ink }}>
        {downloading ? "Menyiapkan…" : "📥 Download Kartu"}
      </button>
    </div>
  );
}

function CardLead({ recommended, leadName, leadWa, errors, onNameChange, onWaChange, onSubmit }: any) {
  return (
    <div className="space-y-5">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>Simpan & terima detail paket</div>
      <div className="text-2xl md:text-3xl font-black leading-tight" style={{ letterSpacing: "-0.04em" }}>
        Mau kami kirim rencana ini ke WhatsApp kamu?
      </div>
      <p className="text-sm" style={{ color: BRAND.muted, letterSpacing: "-0.015em" }}>
        Plus detail paket <b>{recommended.label}</b> & link hasilmu yang bisa dibuka kapan saja.
      </p>
      <div className="space-y-3 pt-2">
        <div>
          <input value={leadName} onChange={(e) => onNameChange(e.target.value)} placeholder="Nama lengkap"
            className="w-full h-14 rounded-2xl px-4 text-base font-semibold bg-neutral-50 outline-none border-2 border-transparent focus:border-neutral-900 transition" />
          {errors.name && <div className="text-xs mt-1 px-1" style={{ color: BRAND.red }}>{errors.name}</div>}
        </div>
        <div>
          <input value={leadWa} onChange={(e) => onWaChange(e.target.value)} placeholder="Nomor WhatsApp (08…)" inputMode="tel"
            className="w-full h-14 rounded-2xl px-4 text-base font-semibold bg-neutral-50 outline-none border-2 border-transparent focus:border-neutral-900 transition" />
          {errors.whatsapp && <div className="text-xs mt-1 px-1" style={{ color: BRAND.red }}>{errors.whatsapp}</div>}
        </div>
        <button onClick={onSubmit} className="w-full h-14 rounded-2xl font-bold text-base active:scale-[0.98] transition-transform"
          style={{ background: BRAND.red, color: "white" }}>
          Simpan Rencanaku →
        </button>
        <div className="text-[11px] text-center pt-1" style={{ color: BRAND.muted }}>
          Data kamu aman. Kami tidak spam.
        </div>
      </div>
    </div>
  );
}
