import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCalculatorTiers } from "@/hooks/useCalculatorPackages";
import {
  buildTierResult,
  formatMonthYear,
  monthlyTargetForGoal,
  pickRecommended,
  type CalcInput,
  type TierOption,
  type TierResult,
} from "@/lib/umrohCalc";
import { parseTrackingParams } from "@/lib/calcConfig";
import musafarLogo from "@/assets/musafar-logo-dark.svg";

import { BRAND, WRAPPED_COUNT, type Mode, type Step } from "@/components/calculator/shared";
import { Computing } from "@/components/calculator/steps/CommonSteps";
import { IntroStep, ModePicker } from "@/components/calculator/steps/IntroStep";
import { Q_Monthly, Q_Pilgrims, Q_Savings, Q_Timeframe, Q_PickPackage } from "@/components/calculator/steps/QuestionSteps";
import { Wrapped } from "@/components/calculator/steps/WrappedResults";

const leadSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  whatsapp: z
    .string()
    .trim()
    .min(10, "Nomor minimal 10 digit")
    .max(15)
    .regex(/^[0-9+]+$/, "Hanya angka & tanda +"),
});

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

    const recommended = mode === "A" ? recommendedA : recommendedDisplay;
    const departureLabel =
      mode === "A"
        ? recommendedA?.feasibleLabel
        : (() => {
            const d = new Date();
            d.setMonth(d.getMonth() + targetMonths);
            return formatMonthYear(d.toISOString());
          })();

    const unifiedResults: TierResult[] = mode === "A" ? resultsA : recommendedDisplay ? [recommendedDisplay] : [];
    const monthlySavingValue = mode === "A" ? monthly : Math.round(calcB?.monthly ?? 0);

    const { data, error } = await supabase
      .from("umroh_calculator_leads")
      .insert({
        name: parsed.data.name,
        whatsapp: parsed.data.whatsapp,
        companion_name: companion.trim() || null,
        mode,
        monthly_saving: monthlySavingValue,
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
          results: unifiedResults,
          resultsA,
          recommendedTier: recommended?.tier,
          selectedTier,
          targetMonths,
          calcB,
          departureLabel,
          companion: companion.trim() || null,
        })),
        referrer: document.referrer || null,
        user_agent: navigator.userAgent.slice(0, 500),
      })
      .select("id, share_token")
      .single();

    if (error || !data) {
      console.error("Submit lead failed:", error);
      setStep({ kind: "wrapped", index: WRAPPED_COUNT - 1 });
      setErrors({ name: error?.message ? `Gagal menyimpan: ${error.message}` : "Gagal menyimpan. Coba lagi." });
      return;
    }

    try {
      const fbq = (window as any).fbq;
      if (typeof fbq === "function") {
        fbq("track", "Lead", { content_name: "Umroh Financial Planner" }, { eventID: eventId });
      }
    } catch {}

    navigate(`/kalkulator/hasil/${(data as any).share_token ?? data.id}`);
  };

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
            {step.kind === "intro" && <IntroStep key="intro" onStart={goNext} />}

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
                onChange={(v: number, c: boolean) => { setMonthly(v); setCustomOn(c); }}
                onNext={goNext}
                onBack={goBack}
                stepIdx={1} total={3}
              />
            )}
            {step.kind === "a-q2" && (
              <Q_Pilgrims key="a-q2" value={pilgrims} onChange={setPilgrims} onNext={goNext} onBack={goBack} stepIdx={2} total={3} />
            )}
            {step.kind === "a-q3" && (
              <Q_Savings key="a-q3" hasSavings={hasSavings} amount={existing} onChange={(h: boolean, a: number) => { setHasSavings(h); setExisting(a); }} onNext={goNext} onBack={goBack} stepIdx={3} total={3} />
            )}

            {step.kind === "b-q1" && (
              <Q_Timeframe
                key="b-q1"
                value={targetMonths}
                customOn={customMonthsOn}
                onChange={(v: number, c: boolean) => { setTargetMonths(v); setCustomMonthsOn(c); }}
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
              <Q_Savings key="b-q4" hasSavings={hasSavings} amount={existing} onChange={(h: boolean, a: number) => { setHasSavings(h); setExisting(a); }} onNext={goNext} onBack={goBack} stepIdx={4} total={4} />
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
