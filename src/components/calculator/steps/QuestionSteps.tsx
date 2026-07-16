import { BRAND, SAVING_CHIPS, TIMEFRAME_CHIPS } from "../shared";
import { StepFrame, Footnote } from "./CommonSteps";
import { formatIDR } from "@/lib/umrohCalc";
import type { TierOption } from "@/lib/umrohCalc";

export function Q_Monthly({ value, customOn, onChange, onNext, onBack, stepIdx, total }: any) {
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

export function Q_Pilgrims({ value, onChange, onNext, onBack, stepIdx, total }: any) {
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

export function Q_Savings({ hasSavings, amount, onChange, onNext, onBack, stepIdx, total }: any) {
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

export function Q_Timeframe({ value, customOn, onChange, onNext, onBack }: any) {
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

export function Q_PickPackage({ tiers, selected, onSelect, onNext, onBack, loading }: any) {
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
