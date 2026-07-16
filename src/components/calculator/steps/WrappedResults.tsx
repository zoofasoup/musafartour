import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { BRAND, fade, type Mode } from "../shared";
import { GhostBtn, Footnote } from "./CommonSteps";
import { formatIDR, formatMonthYear, earliestMonthsToDepart } from "@/lib/umrohCalc";
import type { TierResult, CalcInput } from "@/lib/umrohCalc";
import { DAILY_MOTIVATION } from "@/lib/calcConfig";

export function Wrapped(props: {
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

const dailyEquivalent = (daily: number) => {
  if (daily <= 15000) return "Cukup puasa jajan boba.";
  if (daily <= 30000) return "Sama kaya harga 1 cup kopi susu.";
  if (daily <= 50000) return "Mungkin cukup skip makan siang di luar.";
  return "Mungkin butuh potong budget gaya hidup dikit.";
};

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

const HABITS = [
  { key: "kopi", label: "Kopi kekinian", emoji: "☕", perMonth: 25_000 * 12 },
  { key: "rokok", label: "Rokok harian", emoji: "🚬", perMonth: 25_000 * 30 },
  { key: "ojol", label: "Ojol harian", emoji: "🛵", perMonth: 30_000 * 22 },
  { key: "stream", label: "Streaming", emoji: "📺", perMonth: 50_000 },
];

function CardHabitSim({ input, recommended }: { input: CalcInput; recommended: TierResult }) {
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const bonus = HABITS.reduce((s, h) => s + (picked[h.key] ? h.perMonth : 0), 0);

  const totalNeeded = recommended.pricePerPerson * input.pilgrimCount;
  const baseline = recommended.monthsRequired;
  const boosted = bonus > 0
    ? earliestMonthsToDepart(totalNeeded, input.monthlySaving + bonus, input.existingSavings, input.pilgrimCount)
    : baseline;
  const saved = Math.max(0, baseline - boosted);
  const newDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + boosted);
    return formatMonthYear(d.toISOString());
  })();

  return (
    <div className="space-y-5">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>
        Geser kebiasaanmu, lihat keajaibannya
      </div>
      <div className="text-2xl md:text-3xl font-black leading-tight" style={{ letterSpacing: "-0.04em" }}>
        Skip 1 kebiasaan, berangkat lebih cepat.
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {HABITS.map((h) => {
          const on = !!picked[h.key];
          return (
            <button
              key={h.key}
              onClick={() => setPicked((p) => ({ ...p, [h.key]: !p[h.key] }))}
              className="rounded-2xl p-3 text-left transition-all active:scale-[0.98]"
              style={{
                background: on ? BRAND.ink : "white",
                color: on ? "white" : BRAND.ink,
                border: `2px solid ${on ? BRAND.ink : "#e5e5e5"}`,
              }}
            >
              <div className="text-xl">{h.emoji}</div>
              <div className="text-xs font-bold mt-1" style={{ letterSpacing: "-0.01em" }}>{h.label}</div>
              <div className="text-[10px] opacity-70 mt-0.5">+{formatIDR(h.perMonth)}/bln</div>
            </button>
          );
        })}
      </div>
      <div className="rounded-2xl p-4" style={{ background: bonus > 0 ? BRAND.gold + "33" : BRAND.bg }}>
        {bonus > 0 ? (
          <>
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: BRAND.red }}>
              Berangkat {saved} bulan lebih cepat ✨
            </div>
            <div className="text-2xl font-black mt-1" style={{ letterSpacing: "-0.03em", color: BRAND.ink }}>
              {newDate}
            </div>
            <div className="text-xs mt-1" style={{ color: BRAND.muted }}>
              Niat baik berbuah jalan ke Baitullah.
            </div>
          </>
        ) : (
          <div className="text-sm" style={{ color: BRAND.muted }}>
            Pilih satu kebiasaan untuk lihat dampaknya ke tanggal berangkatmu.
          </div>
        )}
      </div>
    </div>
  );
}

function CardCountdown({ recommended }: { recommended: TierResult }) {
  const target = useMemo(() => new Date(recommended.feasibleDate).getTime(), [recommended.feasibleDate]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="space-y-5 text-center relative" style={{
      background: `radial-gradient(circle at 50% 30%, ${BRAND.gold}22 0%, transparent 60%)`,
      margin: -32, padding: 32, borderRadius: 24,
    }}>
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>
        Hitung mundur ke Baitullah
      </div>
      <div className="text-5xl md:text-7xl font-black" style={{ color: BRAND.red, letterSpacing: "-0.05em", lineHeight: 0.95 }}>
        {days.toLocaleString("id-ID")}
      </div>
      <div className="text-sm font-bold uppercase tracking-widest" style={{ color: BRAND.ink }}>
        hari lagi
      </div>
      <div className="flex justify-center gap-2 pt-2">
        {[
          { v: hours, l: "Jam" }, { v: mins, l: "Menit" }, { v: secs, l: "Detik" },
        ].map((u) => (
          <div key={u.l} className="rounded-xl px-3 py-2" style={{ background: BRAND.ink, color: "white", minWidth: 64 }}>
            <div className="text-2xl font-black tabular-nums" style={{ letterSpacing: "-0.03em" }}>{pad(u.v)}</div>
            <div className="text-[9px] uppercase tracking-widest opacity-70 mt-0.5">{u.l}</div>
          </div>
        ))}
      </div>
      <div className="text-sm pt-3" style={{ color: BRAND.muted, letterSpacing: "-0.015em" }}>
        Tiap detik yang lewat = satu langkah lebih dekat. InsyaAllah {recommended.feasibleLabel}.
      </div>
    </div>
  );
}

function CardLead({ recommended, leadName, leadWa, errors, onNameChange, onWaChange, onSubmit, onReset }: any) {
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
        <button
          onClick={() => {
            if (window.confirm("Hitung untuk orang baru? Data yang belum dikirim akan hilang.")) onReset();
          }}
          className="w-full h-12 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-transform"
          style={{ background: "white", color: BRAND.ink, border: `1.5px solid #e5e5e5` }}
        >
          ↻ Hitung untuk orang lain
        </button>
        <div className="text-[11px] text-center pt-1" style={{ color: BRAND.muted }}>
          Data kamu aman. Kami tidak spam.
        </div>
      </div>
    </div>
  );
}

function CardShare({ recommended, perDay, leadName, companion, onCompanionChange }: {
  recommended: TierResult; perDay: number; leadName: string; companion: string; onCompanionChange: (s: string) => void;
}) {
  const dedicatedTo = companion.trim() || "Diri sendiri & keluarga";

  return (
    <div className="space-y-5">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.muted }}>
        Niatkan perjalananmu
      </div>
      <div className="text-2xl md:text-3xl font-black leading-tight" style={{ letterSpacing: "-0.04em" }}>
        Untuk siapa kamu niatkan umroh ini?
      </div>
      <input
        value={companion}
        onChange={(e) => onCompanionChange(e.target.value.slice(0, 60))}
        placeholder="cth. Ayah, Ibu, atau diri sendiri"
        className="w-full h-12 rounded-2xl px-4 text-sm font-semibold bg-neutral-50 outline-none border-2 border-transparent focus:border-neutral-900 transition"
      />

      <div className="flex justify-center pt-2">
        <div
          style={{
            width: 290, height: 510,
            background: `
              radial-gradient(circle at 20% 0%, ${BRAND.red}55 0%, transparent 45%),
              radial-gradient(circle at 90% 100%, ${BRAND.gold}40 0%, transparent 50%),
              linear-gradient(160deg, #1a1a1a 0%, ${BRAND.ink} 60%, #0a0a0a 100%)
            `,
            color: "white",
            fontFamily: "'Onest', system-ui, sans-serif",
            padding: 24,
            borderRadius: 28,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
            boxShadow: "0 30px 80px -20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative ring */}
          <div style={{
            position: "absolute", top: -60, right: -60,
            width: 180, height: 180, borderRadius: "50%",
            border: `1px solid ${BRAND.gold}33`,
          }} />
          <div style={{
            position: "absolute", top: -90, right: -90,
            width: 240, height: 240, borderRadius: "50%",
            border: `1px solid ${BRAND.gold}1a`,
          }} />

          <div style={{ position: "relative" }}>
            <div style={{
              display: "inline-block",
              fontSize: 9, fontWeight: 900, letterSpacing: 2.5,
              color: BRAND.gold, textTransform: "uppercase",
              padding: "5px 10px", borderRadius: 999,
              background: `${BRAND.gold}1a`,
              border: `1px solid ${BRAND.gold}33`,
            }}>
              ✦ Niat Perjalanan
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 18, opacity: 0.55, letterSpacing: 1.2, textTransform: "uppercase" }}>
              Atas nama
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2, letterSpacing: "-0.02em" }}>
              {leadName || "Calon Tamu Allah"}
            </div>
          </div>

          <div style={{ position: "relative", textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.55, marginBottom: 8 }}>
              Diniatkan untuk
            </div>
            <div style={{
              fontSize: 32, fontWeight: 900, lineHeight: 1.05,
              letterSpacing: "-0.035em", color: BRAND.gold,
              padding: "0 4px",
              textShadow: `0 2px 20px ${BRAND.gold}33`,
            }}>
              {dedicatedTo}
            </div>
            <div style={{
              width: 40, height: 2, background: BRAND.gold,
              margin: "14px auto 0", borderRadius: 2, opacity: 0.6,
            }} />
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.55 }}>
              Insya Allah berangkat
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "white", lineHeight: 0.95, letterSpacing: "-0.04em", marginTop: 4 }}>
              {recommended.feasibleLabel}
            </div>
            <div style={{
              marginTop: 10, paddingTop: 12,
              borderTop: `1px solid rgba(255,255,255,0.1)`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ fontSize: 10, opacity: 0.6 }}>
                Paket {recommended.label}
              </div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, opacity: 0.5, textTransform: "uppercase" }}>
                musafartour.com
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-center pt-1" style={{ color: BRAND.muted, letterSpacing: "-0.01em" }}>
        Niatkan dengan tulus — Allah Maha Mendengar setiap doa. 🤍
      </p>
    </div>
  );
}
