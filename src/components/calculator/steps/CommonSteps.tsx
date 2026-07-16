import { motion } from "framer-motion";
import { BRAND, fade } from "../shared";
import { PRICING_FOOTNOTE } from "@/lib/calcConfig";

export function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; }) {
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

export function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-sm font-medium underline-offset-4 hover:underline" style={{ color: BRAND.muted }}>
      {children}
    </button>
  );
}

export function Footnote() {
  return (
    <div className="text-[10px] leading-snug pt-3" style={{ color: BRAND.muted }}>
      * {PRICING_FOOTNOTE}
    </div>
  );
}

export function StepFrame({
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

export function Computing({ label = "Menghitung rencanamu…" }: { label?: string }) {
  return (
    <motion.div {...fade} className="text-center py-24 space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full border-4 animate-spin" style={{ borderColor: BRAND.bg, borderTopColor: BRAND.red }} />
      </div>
      <div className="text-lg font-semibold" style={{ letterSpacing: "-0.02em" }}>{label}</div>
    </motion.div>
  );
}
