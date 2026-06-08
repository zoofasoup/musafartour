import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCalculatorTiers } from "@/hooks/useCalculatorPackages";
import {
  buildTierResult,
  dailyReframe,
  formatIDR,
  pickRecommended,
  speedUpImpact,
  type CalcInput,
  type TierResult,
} from "@/lib/umrohCalc";
import musafarLogo from "@/assets/musafar-logo-dark.svg";

// Brand
const BRAND = {
  red: "#CC002D",
  gold: "#FFB100",
  ink: "#262626",
  bg: "#F2F3F3",
  muted: "#989999",
};

const SAVING_CHIPS = [500_000, 1_000_000, 2_000_000, 3_000_000];

type Step =
  | { kind: "intro" }
  | { kind: "q1" }
  | { kind: "q2" }
  | { kind: "q3" }
  | { kind: "computing" }
  | { kind: "wrapped"; index: number }
  | { kind: "submitting" }
  | { kind: "done"; leadId: string };

const leadSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  whatsapp: z
    .string()
    .trim()
    .min(10, "Nomor minimal 10 digit")
    .max(15)
    .regex(/^[0-9+]+$/, "Hanya angka & tanda +"),
});

const WRAPPED_COUNT = 5;

export default function UmrohCalculator() {
  const navigate = useNavigate();
  const { data: tiers, isLoading } = useCalculatorTiers();
  const [step, setStep] = useState<Step>({ kind: "intro" });

  // Inputs
  const [monthly, setMonthly] = useState<number>(1_000_000);
  const [customOn, setCustomOn] = useState(false);
  const [pilgrims, setPilgrims] = useState<number>(1);
  const [hasSavings, setHasSavings] = useState<boolean | null>(null);
  const [existing, setExisting] = useState<number>(0);

  // Lead capture
  const [leadName, setLeadName] = useState("");
  const [leadWa, setLeadWa] = useState("");
  const [errors, setErrors] = useState<{ name?: string; whatsapp?: string }>({});

  const input: CalcInput = {
    monthlySaving: monthly,
    pilgrimCount: pilgrims,
    existingSavings: hasSavings ? existing : 0,
  };

  const results = useMemo<TierResult[]>(() => {
    if (!tiers || tiers.length === 0) return [];
    return tiers.map((t) => buildTierResult(t, input));
  }, [tiers, input]);

  const recommended = useMemo(() => (results.length ? pickRecommended(results) : null), [results]);
  const perDay = monthly / 30;
  const perWeek = monthly / 4.345;

  // Inject Onest font once
  useEffect(() => {
    if (document.getElementById("onest-font")) return;
    const link = document.createElement("link");
    link.id = "onest-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Onest:wght@300;400;500;600;700;800;900&display=swap";
    document.head.appendChild(link);
  }, []);

  // Auto-advance "computing" to wrapped
  useEffect(() => {
    if (step.kind !== "computing") return;
    const t = setTimeout(() => setStep({ kind: "wrapped", index: 0 }), 1400);
    return () => clearTimeout(t);
  }, [step]);

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

    const { data, error } = await supabase
      .from("umroh_calculator_leads")
      .insert({
        name: parsed.data.name,
        whatsapp: parsed.data.whatsapp,
        monthly_saving: monthly,
        pilgrim_count: pilgrims,
        existing_savings: hasSavings ? existing : 0,
        recommended_package_id: recommended?.packageId ?? null,
        recommended_tier: recommended?.tier ?? null,
        daily_target: Math.round(perDay),
        months_to_departure: recommended?.monthsRequired ?? null,
        result_data: { results, recommendedTier: recommended?.tier },
        referrer: document.referrer || null,
        user_agent: navigator.userAgent.slice(0, 500),
      })
      .select("id")
      .single();

    if (error || !data) {
      setStep({ kind: "wrapped", index: WRAPPED_COUNT - 1 });
      setErrors({ name: "Gagal menyimpan. Coba lagi." });
      return;
    }
    navigate(`/kalkulator/hasil/${data.id}`);
  };

  // Helpers
  const goNext = () => {
    if (step.kind === "intro") setStep({ kind: "q1" });
    else if (step.kind === "q1") setStep({ kind: "q2" });
    else if (step.kind === "q2") setStep({ kind: "q3" });
    else if (step.kind === "q3") setStep({ kind: "computing" });
    else if (step.kind === "wrapped") {
      if (step.index < WRAPPED_COUNT - 1) setStep({ kind: "wrapped", index: step.index + 1 });
    }
  };
  const goBack = () => {
    if (step.kind === "q1") setStep({ kind: "intro" });
    else if (step.kind === "q2") setStep({ kind: "q1" });
    else if (step.kind === "q3") setStep({ kind: "q2" });
    else if (step.kind === "wrapped" && step.index > 0)
      setStep({ kind: "wrapped", index: step.index - 1 });
  };

  return (
    <div
      style={{
        background: BRAND.bg,
        color: BRAND.ink,
        fontFamily:
          "'Onest', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        minHeight: "100vh",
        letterSpacing: "-0.02em",
      }}
      className="flex flex-col"
    >
      {/* Header */}
      <header className="w-full px-6 py-5 flex items-center justify-between">
        <img src={musafarLogo} alt="Musafar" className="h-7" />
        <div
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: BRAND.muted }}
        >
          Kalkulator Kesiapan Umroh
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-2">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {step.kind === "intro" && (
              <Intro key="intro" onStart={goNext} />
            )}
            {step.kind === "q1" && (
              <Q1
                key="q1"
                value={monthly}
                customOn={customOn}
                onChange={(v, custom) => {
                  setMonthly(v);
                  setCustomOn(custom);
                }}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step.kind === "q2" && (
              <Q2
                key="q2"
                value={pilgrims}
                onChange={setPilgrims}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step.kind === "q3" && (
              <Q3
                key="q3"
                hasSavings={hasSavings}
                amount={existing}
                onChange={(has, amt) => {
                  setHasSavings(has);
                  setExisting(amt);
                }}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step.kind === "computing" && <Computing key="computing" />}
            {step.kind === "wrapped" && results.length > 0 && recommended && (
              <Wrapped
                key={`wrapped-${step.index}`}
                index={step.index}
                total={WRAPPED_COUNT}
                perDay={perDay}
                perWeek={perWeek}
                monthly={monthly}
                results={results}
                recommended={recommended}
                input={input}
                leadName={leadName}
                leadWa={leadWa}
                errors={errors}
                onNameChange={setLeadName}
                onWaChange={setLeadWa}
                onNext={goNext}
                onBack={goBack}
                onSubmit={submitLead}
              />
            )}
            {step.kind === "submitting" && <Computing key="submitting" label="Menyimpan rencana kamu…" />}
            {step.kind === "wrapped" && isLoading && (
              <div className="text-center text-sm" style={{ color: BRAND.muted }}>
                Memuat paket…
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer
        className="text-center py-4 text-[11px] tracking-wider uppercase"
        style={{ color: BRAND.muted }}
      >
        Musafar · musafartour.com
      </footer>
    </div>
  );
}

/* ---------------- Sub-components ---------------- */

const fade = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

function PrimaryBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
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
    <button
      onClick={onClick}
      className="text-sm font-medium underline-offset-4 hover:underline"
      style={{ color: BRAND.muted }}
    >
      {children}
    </button>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <motion.div {...fade} className="text-center space-y-8 py-8">
      <div
        className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest"
        style={{ background: BRAND.gold + "22", color: BRAND.red }}
      >
        Lead Magnet · 60 detik
      </div>
      <h1
        className="text-5xl md:text-7xl font-black leading-[0.95]"
        style={{ letterSpacing: "-0.045em", color: BRAND.ink }}
      >
        Kapan kamu <br />
        <span style={{ color: BRAND.red }}>siap umroh?</span>
      </h1>
      <p
        className="text-base md:text-lg max-w-md mx-auto"
        style={{ color: BRAND.muted, letterSpacing: "-0.015em" }}
      >
        Cukup 3 pertanyaan singkat. Kami hitungkan rencana keberangkatanmu —
        lengkap dengan paket & tanggalnya, insya Allah.
      </p>
      <div className="max-w-xs mx-auto pt-2">
        <PrimaryBtn onClick={onStart}>Mulai Hitung →</PrimaryBtn>
      </div>
    </motion.div>
  );
}

function StepFrame({
  step,
  total,
  title,
  subtitle,
  children,
  onNext,
  onBack,
  canNext = true,
  nextLabel = "Lanjut →",
}: {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack: () => void;
  canNext?: boolean;
  nextLabel?: string;
}) {
  return (
    <motion.div {...fade} className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <GhostBtn onClick={onBack}>← Kembali</GhostBtn>
        <div className="text-xs font-semibold" style={{ color: BRAND.muted }}>
          {step}/{total}
        </div>
      </div>
      <div className="space-y-2">
        <h2
          className="text-3xl md:text-4xl font-black"
          style={{ letterSpacing: "-0.045em" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ color: BRAND.muted, letterSpacing: "-0.015em" }}>{subtitle}</p>
        )}
      </div>
      <div>{children}</div>
      <PrimaryBtn onClick={onNext} disabled={!canNext}>
        {nextLabel}
      </PrimaryBtn>
    </motion.div>
  );
}

function Q1({
  value,
  customOn,
  onChange,
  onNext,
  onBack,
}: {
  value: number;
  customOn: boolean;
  onChange: (v: number, custom: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <StepFrame
      step={1}
      total={3}
      title="Berapa yang bisa kamu sisihkan tiap bulan?"
      subtitle="Pilih cepat, atau geser slider untuk angka custom."
      onNext={onNext}
      onBack={onBack}
    >
      <div className="grid grid-cols-2 gap-3 mb-4">
        {SAVING_CHIPS.map((v) => {
          const active = !customOn && value === v;
          return (
            <button
              key={v}
              onClick={() => onChange(v, false)}
              className="h-16 rounded-2xl font-bold text-lg transition-all active:scale-[0.98]"
              style={{
                background: active ? BRAND.ink : "white",
                color: active ? "white" : BRAND.ink,
                border: `2px solid ${active ? BRAND.ink : "#e5e5e5"}`,
                letterSpacing: "-0.02em",
              }}
            >
              {formatIDR(v)}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onChange(value, true)}
        className="w-full h-12 rounded-xl text-sm font-semibold mb-3"
        style={{
          background: customOn ? BRAND.gold + "33" : "transparent",
          color: BRAND.ink,
          border: `1.5px dashed ${BRAND.muted}`,
        }}
      >
        {customOn ? `Custom: ${formatIDR(value)}` : "Pakai angka custom"}
      </button>
      {customOn && (
        <div className="px-1 pt-2">
          <input
            type="range"
            min={100_000}
            max={10_000_000}
            step={100_000}
            value={value}
            onChange={(e) => onChange(Number(e.target.value), true)}
            className="w-full accent-[#CC002D]"
          />
          <div className="flex justify-between text-xs mt-2" style={{ color: BRAND.muted }}>
            <span>Rp 100rb</span>
            <span>Rp 10jt</span>
          </div>
        </div>
      )}
    </StepFrame>
  );
}

function Q2({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: number;
  onChange: (v: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const opts = [
    { v: 1, label: "Saya sendiri" },
    { v: 2, label: "Saya + 1 orang" },
    { v: -1, label: "Keluarga" },
  ];
  const isFamily = value >= 3 || (value !== 1 && value !== 2);
  return (
    <StepFrame
      step={2}
      total={3}
      title="Siapa yang berangkat bareng kamu?"
      subtitle="Total biaya disesuaikan dengan jumlah jamaah."
      onNext={onNext}
      onBack={onBack}
    >
      <div className="grid grid-cols-1 gap-3 mb-4">
        {opts.map((o) => {
          const active =
            (o.v === 1 && value === 1) ||
            (o.v === 2 && value === 2) ||
            (o.v === -1 && isFamily);
          return (
            <button
              key={o.label}
              onClick={() => onChange(o.v === -1 ? Math.max(3, value) : o.v)}
              className="h-16 rounded-2xl font-semibold text-base text-left px-5 transition-all active:scale-[0.98]"
              style={{
                background: active ? BRAND.ink : "white",
                color: active ? "white" : BRAND.ink,
                border: `2px solid ${active ? BRAND.ink : "#e5e5e5"}`,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {isFamily && (
        <div className="rounded-2xl p-4 bg-white border" style={{ borderColor: "#e5e5e5" }}>
          <div className="text-sm font-semibold mb-3">Total jamaah keluarga</div>
          <div className="flex items-center gap-4 justify-center">
            <button
              onClick={() => onChange(Math.max(3, value - 1))}
              className="w-12 h-12 rounded-full text-2xl font-black"
              style={{ background: BRAND.bg, color: BRAND.ink }}
            >
              −
            </button>
            <div className="text-4xl font-black w-16 text-center" style={{ letterSpacing: "-0.05em" }}>
              {value}
            </div>
            <button
              onClick={() => onChange(Math.min(20, value + 1))}
              className="w-12 h-12 rounded-full text-2xl font-black"
              style={{ background: BRAND.red, color: "white" }}
            >
              +
            </button>
          </div>
        </div>
      )}
    </StepFrame>
  );
}

function Q3({
  hasSavings,
  amount,
  onChange,
  onNext,
  onBack,
}: {
  hasSavings: boolean | null;
  amount: number;
  onChange: (has: boolean, amt: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <StepFrame
      step={3}
      total={3}
      title="Sudah ada tabungan tersisih?"
      subtitle="Tabungan awal mempercepat tanggal keberangkatanmu."
      onNext={onNext}
      onBack={onBack}
      canNext={hasSavings !== null}
      nextLabel="Lihat Hasilku ✨"
    >
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { val: false, label: "Belum ada" },
          { val: true, label: "Sudah ada" },
        ].map((o) => {
          const active = hasSavings === o.val;
          return (
            <button
              key={o.label}
              onClick={() => onChange(o.val, o.val ? amount : 0)}
              className="h-16 rounded-2xl font-bold text-base transition-all active:scale-[0.98]"
              style={{
                background: active ? BRAND.ink : "white",
                color: active ? "white" : BRAND.ink,
                border: `2px solid ${active ? BRAND.ink : "#e5e5e5"}`,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {hasSavings && (
        <div className="rounded-2xl p-4 bg-white border" style={{ borderColor: "#e5e5e5" }}>
          <label className="text-sm font-semibold block mb-2">
            Berapa total tabunganmu saat ini?
          </label>
          <div className="flex items-center gap-2">
            <span className="font-bold" style={{ color: BRAND.muted }}>Rp</span>
            <input
              type="number"
              inputMode="numeric"
              value={amount || ""}
              onChange={(e) => onChange(true, Number(e.target.value) || 0)}
              placeholder="5.000.000"
              className="w-full h-12 text-2xl font-bold bg-transparent outline-none"
              style={{ letterSpacing: "-0.02em" }}
            />
          </div>
        </div>
      )}
    </StepFrame>
  );
}

function Computing({ label = "Menghitung rencanamu…" }: { label?: string }) {
  return (
    <motion.div {...fade} className="text-center py-24 space-y-6">
      <div className="flex justify-center">
        <div
          className="w-16 h-16 rounded-full border-4 animate-spin"
          style={{ borderColor: BRAND.bg, borderTopColor: BRAND.red }}
        />
      </div>
      <div className="text-lg font-semibold" style={{ letterSpacing: "-0.02em" }}>
        {label}
      </div>
    </motion.div>
  );
}

function Wrapped(props: {
  index: number;
  total: number;
  perDay: number;
  perWeek: number;
  monthly: number;
  results: TierResult[];
  recommended: TierResult;
  input: CalcInput;
  leadName: string;
  leadWa: string;
  errors: { name?: string; whatsapp?: string };
  onNameChange: (s: string) => void;
  onWaChange: (s: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const {
    index, total, perDay, perWeek, monthly,
    results, recommended, input,
    leadName, leadWa, errors,
    onNameChange, onWaChange, onNext, onBack, onSubmit,
  } = props;

  return (
    <motion.div
      key={index}
      {...fade}
      className="relative"
    >
      {/* Progress bars */}
      <div className="flex gap-1.5 mb-6">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full"
            style={{ background: i <= index ? BRAND.red : "#e5e5e5" }}
          />
        ))}
      </div>

      <div
        className="rounded-3xl p-8 md:p-10 min-h-[440px] flex flex-col justify-center relative overflow-hidden"
        style={{
          background: "white",
          boxShadow: "0 20px 60px -20px rgba(0,0,0,0.15)",
        }}
      >
        {index === 0 && <CardHero perDay={perDay} perWeek={perWeek} monthly={monthly} />}
        {index === 1 && <CardReframe perDay={perDay} />}
        {index === 2 && <CardLadder results={results} recommended={recommended} />}
        {index === 3 && <CardSpeedUp recommended={recommended} monthly={monthly} input={input} />}
        {index === 4 && (
          <CardLead
            recommended={recommended}
            leadName={leadName}
            leadWa={leadWa}
            errors={errors}
            onNameChange={onNameChange}
            onWaChange={onWaChange}
            onSubmit={onSubmit}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-6 px-1">
        <GhostBtn onClick={onBack}>← Kembali</GhostBtn>
        {index < total - 1 ? (
          <button
            onClick={onNext}
            className="h-12 px-6 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform"
            style={{ background: BRAND.ink, color: "white" }}
          >
            Lanjut →
          </button>
        ) : (
          <span className="text-xs" style={{ color: BRAND.muted }}>
            Geser ke atas & isi data
          </span>
        )}
      </div>
    </motion.div>
  );
}

function CardHero({ perDay, perWeek, monthly }: { perDay: number; perWeek: number; monthly: number }) {
  return (
    <div className="space-y-6 text-center">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>
        Targetmu, dibagi per hari
      </div>
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="text-6xl md:text-8xl font-black" style={{ color: BRAND.red, letterSpacing: "-0.055em", lineHeight: 0.9 }}>
          {formatIDR(perDay)}
        </div>
        <div className="text-sm font-semibold mt-1" style={{ color: BRAND.muted }}>per hari</div>
      </motion.div>
      <div className="flex justify-center gap-6 pt-4">
        <Stat label="Per minggu" value={formatIDR(perWeek)} />
        <div className="w-px bg-neutral-200" />
        <Stat label="Per bulan" value={formatIDR(monthly)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider" style={{ color: BRAND.muted }}>
        {label}
      </div>
      <div className="text-lg font-bold" style={{ letterSpacing: "-0.02em" }}>
        {value}
      </div>
    </div>
  );
}

function CardReframe({ perDay }: { perDay: number }) {
  return (
    <div className="space-y-6 text-center">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>
        Konteksnya begini…
      </div>
      <div className="text-3xl md:text-5xl font-black leading-tight" style={{ letterSpacing: "-0.04em" }}>
        {dailyReframe(perDay)}
      </div>
      <div className="text-base mt-4" style={{ color: BRAND.muted, letterSpacing: "-0.015em" }}>
        Disiplin sehari = satu langkah lebih dekat ke Baitullah.
      </div>
    </div>
  );
}

function CardLadder({ results, recommended }: { results: TierResult[]; recommended: TierResult }) {
  return (
    <div className="space-y-5">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>
        Tangga keberangkatanmu
      </div>
      <div className="text-2xl md:text-3xl font-black" style={{ letterSpacing: "-0.04em" }}>
        Insya Allah, kamu bisa berangkat di tanggal ini:
      </div>
      <div className="space-y-2.5 pt-2">
        {results.map((r) => {
          const isRec = r.tier === recommended.tier;
          return (
            <motion.div
              key={r.tier}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * results.indexOf(r) }}
              className="rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3"
              style={{
                background: isRec ? BRAND.red : "white",
                color: isRec ? "white" : BRAND.ink,
                border: `2px solid ${isRec ? BRAND.red : "#eee"}`,
              }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold uppercase tracking-wide">{r.label}</span>
                  {isRec && (
                    <span
                      className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                      style={{ background: BRAND.gold, color: BRAND.ink }}
                    >
                      Cocok
                    </span>
                  )}
                </div>
                <div className="text-xs opacity-80 mt-0.5 truncate">
                  {r.monthsRequired >= 999 ? "Perlu tambahan tabungan" : `${r.monthsRequired} bulan menabung`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-base md:text-lg font-black" style={{ letterSpacing: "-0.03em" }}>
                  {r.monthsRequired >= 999 ? "—" : r.feasibleLabel}
                </div>
                <div className="text-[10px] uppercase tracking-widest opacity-75">
                  {formatIDR(r.pricePerPerson)}/jamaah
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function CardSpeedUp({
  recommended,
  monthly,
  input,
}: {
  recommended: TierResult;
  monthly: number;
  input: CalcInput;
}) {
  const impact = speedUpImpact(
    recommended.totalNeeded,
    monthly,
    input.existingSavings,
    input.pilgrimCount,
    500_000,
  );
  return (
    <div className="space-y-6 text-center">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>
        Mau lebih cepat?
      </div>
      <div className="text-3xl md:text-5xl font-black leading-tight" style={{ letterSpacing: "-0.045em" }}>
        Tambah <span style={{ color: BRAND.red }}>Rp 500.000</span>/bulan…
      </div>
      <div
        className="rounded-2xl p-6 mt-2"
        style={{ background: BRAND.gold + "22" }}
      >
        <div className="text-sm font-semibold" style={{ color: BRAND.muted }}>Berangkat lebih cepat</div>
        <div className="text-5xl md:text-6xl font-black mt-2" style={{ color: BRAND.red, letterSpacing: "-0.05em" }}>
          {impact.monthsSaved} bulan
        </div>
        <div className="text-sm mt-2" style={{ color: BRAND.ink }}>
          dari {recommended.monthsRequired} bulan menjadi <b>{impact.newMonths} bulan</b>
        </div>
      </div>
    </div>
  );
}

function CardLead({
  recommended,
  leadName,
  leadWa,
  errors,
  onNameChange,
  onWaChange,
  onSubmit,
}: {
  recommended: TierResult;
  leadName: string;
  leadWa: string;
  errors: { name?: string; whatsapp?: string };
  onNameChange: (s: string) => void;
  onWaChange: (s: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>
        Simpan & terima detail paket
      </div>
      <div className="text-2xl md:text-3xl font-black leading-tight" style={{ letterSpacing: "-0.04em" }}>
        Mau kami kirim rencana ini ke WhatsApp kamu?
      </div>
      <p className="text-sm" style={{ color: BRAND.muted, letterSpacing: "-0.015em" }}>
        Plus detail paket <b>{recommended.label}</b> & link hasilmu yang bisa dibuka kapan saja.
      </p>

      <div className="space-y-3 pt-2">
        <div>
          <input
            value={leadName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Nama lengkap"
            className="w-full h-14 rounded-2xl px-4 text-base font-semibold bg-neutral-50 outline-none border-2 border-transparent focus:border-neutral-900 transition"
          />
          {errors.name && (
            <div className="text-xs mt-1 px-1" style={{ color: BRAND.red }}>{errors.name}</div>
          )}
        </div>
        <div>
          <input
            value={leadWa}
            onChange={(e) => onWaChange(e.target.value)}
            placeholder="Nomor WhatsApp (08…)"
            inputMode="tel"
            className="w-full h-14 rounded-2xl px-4 text-base font-semibold bg-neutral-50 outline-none border-2 border-transparent focus:border-neutral-900 transition"
          />
          {errors.whatsapp && (
            <div className="text-xs mt-1 px-1" style={{ color: BRAND.red }}>{errors.whatsapp}</div>
          )}
        </div>
        <button
          onClick={onSubmit}
          className="w-full h-14 rounded-2xl font-bold text-base active:scale-[0.98] transition-transform"
          style={{ background: BRAND.red, color: "white" }}
        >
          Simpan Rencanaku →
        </button>
        <div className="text-[11px] text-center pt-1" style={{ color: BRAND.muted }}>
          Data kamu aman. Kami tidak spam.
        </div>
      </div>
    </div>
  );
}
