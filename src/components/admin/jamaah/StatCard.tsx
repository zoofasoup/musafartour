/** One summary number (label, value, optional hint). A flat tinted tile, two per row on a phone. */
export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[18px] bg-pkg-cream-2 p-4">
      <p className="text-[13px] text-pkg-fg-3">{label}</p>
      <p className="mt-1 text-[24px] font-light leading-tight tracking-[-0.02em] text-pkg-fg">{value}</p>
      {hint && <p className="mt-1 text-[12px] text-pkg-fg-3">{hint}</p>}
    </div>
  );
}
