import { motion } from "framer-motion";
import { BRAND, fade, type Mode } from "../shared";
import { PrimaryBtn, GhostBtn } from "./CommonSteps";

export function IntroStep({ onStart }: { onStart: () => void }) {
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

export function ModePicker({
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
