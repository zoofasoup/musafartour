import { Minus, Plus, Sparkles } from "lucide-react";
import { cn, formatCurrency, isPackageDeparted, isPackageUnavailable } from "@/lib/utils";
import type { PackagePricingBodyProps } from "./PackagePricing";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

const jt = (n: number) => (n > 0 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")} jt` : "-");

function Counter({ value, onChange, min = 0, max = 99, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  const btn = "pkg-press pkg-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2 disabled:opacity-45";
  return (
    <div className="flex items-center gap-3">
      <button type="button" aria-label={`Kurangi ${label}`} className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <span className="pkg-stat !text-[26px] min-w-8 text-center" aria-live="polite">{value}</span>
      <button type="button" aria-label={`Tambah ${label}`} className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/** The calculator in the pkg-v2 look (phone sheet): glass counters and room options, a calm summary, one red action. */
export function PkgPricingBody({
  packageData, price, adults, setAdults, children, setChildren, infants, setInfants, combos, safeComboIdx, setSelectedComboIdx,
  childTotal, infantTotal, selectedCombo, grandTotal, totalSavings, customerName, setCustomerName, handleWhatsApp, handleNotifyMe, maxPax,
}: PackagePricingBodyProps) {
  const seatCap = maxPax ?? 99;
  const rows = [
    { key: "adults", label: "Dewasa", sub: undefined, value: adults, set: (v: number) => { setAdults(v); setSelectedComboIdx(0); }, min: 1, max: Math.max(1, seatCap - children) },
    { key: "children", label: "Anak", sub: "25 jt, sharing bed", value: children, set: setChildren, min: 0, max: Math.max(0, seatCap - adults) },
    { key: "infants", label: "Infant", sub: "15 jt, tanpa bed dan perlengkapan", value: infants, set: setInfants, min: 0, max: 99 },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="pkg-sub">Kalkulator jamaah</h2>
        <p className="pkg-label mt-2 text-pkg-fg-2">Hitung biaya ramai-ramai.</p>
      </header>

      {price && (
        <div className="grid grid-cols-3 gap-2">
          {(["quad", "triple", "double"] as const).map((rt) => (
            <div key={rt} className="pkg-glass rounded-[20px] p-3 text-center">
              <span className="pkg-caption block capitalize text-pkg-fg-3">{rt}</span>
              <span className="pkg-label mt-1 block">{jt(price[rt])}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <ul className="divide-y divide-pkg-hair">
          {rows.map((r) => (
            <li key={r.key} className="flex min-h-[68px] items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="pkg-label">{r.label}</p>
                {r.sub && <p className="mt-0.5 text-[13px] font-normal leading-tight text-pkg-fg-3">{r.sub}</p>}
              </div>
              <Counter value={r.value} onChange={r.set} min={r.min} max={r.max} label={r.label.toLowerCase()} />
            </li>
          ))}
        </ul>
        {maxPax !== undefined && maxPax <= 5 && <p className="pkg-label mt-3 text-pkg-warn">Tersisa {maxPax} seat untuk paket ini.</p>}
      </div>

      {combos.length > 0 && (
        <section aria-labelledby="opsi-kamar">
          <h3 id="opsi-kamar" className="pkg-label text-pkg-fg-3">Opsi kamar</h3>
          <div className="mt-3 space-y-2">
            {combos.map((combo, i) => {
              const total = combo.totalRoomCost + childTotal + infantTotal;
              const selected = safeComboIdx === i;
              return (
                <button
                  key={combo.label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedComboIdx(i)}
                  className={cn(
                    "pkg-press w-full rounded-[24px] p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2",
                    selected ? "pkg-glass-deep" : "pkg-glass"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="pkg-label">{combo.label}</span>
                    {i === 0 && <span className="pkg-caption rounded-full bg-pkg-hair px-2.5 py-1">Hemat</span>}
                  </span>
                  <span className="mt-2 flex items-baseline justify-between gap-3">
                    <span className="text-sm font-normal opacity-80">{formatCurrency(combo.perAdult)} / orang</span>
                    <span className="text-[20px] font-normal tracking-[-0.02em]">{formatCurrency(total)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {selectedCombo && (
        <>
          <section aria-label="Ringkasan">
            <dl className="space-y-2 text-[15px]">
              <div className="flex justify-between gap-3"><dt className="text-pkg-fg-2">{adults}x Dewasa</dt><dd className="pkg-label">{formatCurrency(selectedCombo.totalRoomCost)}</dd></div>
              {children > 0 && <div className="flex justify-between gap-3"><dt className="text-pkg-fg-2">{children}x Anak</dt><dd className="pkg-label">{formatCurrency(childTotal)}</dd></div>}
              {infants > 0 && <div className="flex justify-between gap-3"><dt className="text-pkg-fg-2">{infants}x Infant</dt><dd className="pkg-label">{formatCurrency(infantTotal)}</dd></div>}
            </dl>
            <div className="mt-5 border-t border-pkg-hair pt-5">
              <p className="pkg-label text-pkg-fg-3">Total, {adults + children + infants} orang</p>
              <p className="pkg-sub mt-1 whitespace-nowrap">{formatCurrency(grandTotal)}</p>
              {totalSavings > 0 && (
                <p className="pkg-glass-lit pkg-label mt-3 inline-flex h-9 items-center gap-1.5 rounded-full px-3">
                  <Sparkles className="h-4 w-4 text-pkg-ok" aria-hidden /> Hemat {formatCurrency(totalSavings)}
                </p>
              )}
            </div>
          </section>

          <div className="space-y-3">
            <label className="sr-only" htmlFor="pkg-calc-name">Nama jamaah</label>
            <input
              id="pkg-calc-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nama jamaah"
              autoComplete="name"
              className="pkg-glass h-14 w-full rounded-full px-6 text-base font-normal placeholder:text-pkg-fg-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink"
            />
            <button
              type="button"
              onClick={handleWhatsApp}
              className="pkg-press pkg-glass-red inline-flex h-14 w-full items-center justify-center gap-2 rounded-full text-[17px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
            >
              <WhatsAppIcon className="h-5 w-5" /> Kirim via WhatsApp
            </button>
          </div>
        </>
      )}

      {isPackageUnavailable(packageData) && !isPackageDeparted(packageData) && (
        <button
          type="button"
          onClick={handleNotifyMe}
          className="pkg-press pkg-glass-deep inline-flex h-14 w-full items-center justify-center gap-2 rounded-full text-[17px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
        >
          <WhatsAppIcon className="h-5 w-5" /> Gabung waitlist
        </button>
      )}
    </div>
  );
}
