import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { BedDouble, Users, PersonStanding, Baby, Sparkles, Crown, MessageCircle, Bell, Minus, Plus } from "lucide-react";
import { cn, isPackageUnavailable, formatCurrency } from "@/lib/utils";
import type { PublishedPackage } from "@/hooks/usePackages";
import type { PackagePrice } from "@/lib/packageSchema";
import type { RoomCombo } from "@/lib/roomCombos";

function CounterInput({ value, onChange, min = 0, max = 99 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0 rounded-full" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        <Minus className="h-3 w-3" />
      </Button>
      <span className="text-lg font-bold min-w-[2rem] text-center">{value}</span>
      <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0 rounded-full" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}

export interface PackagePricingBodyProps {
  packageData: PublishedPackage;
  price: PackagePrice | null;
  adults: number;
  setAdults: (val: number) => void;
  children: number;
  setChildren: (val: number) => void;
  infants: number;
  setInfants: (val: number) => void;
  discount: number;
  setDiscount: (val: number) => void;
  combos: RoomCombo[];
  safeComboIdx: number;
  setSelectedComboIdx: (val: number) => void;
  childTotal: number;
  infantTotal: number;
  selectedCombo: RoomCombo | null;
  grandTotal: number;
  totalSavings: number;
  customerName: string;
  setCustomerName: (val: string) => void;
  handleWhatsApp: () => void;
  handleNotifyMe: () => void;
  handleBooking: () => void;
}

/** The calculator's actual content, shared between the desktop sticky sidebar and the mobile Sheet. */
export function PackagePricingBody({
  packageData,
  price,
  adults,
  setAdults,
  children,
  setChildren,
  infants,
  setInfants,
  discount,
  setDiscount,
  combos,
  safeComboIdx,
  setSelectedComboIdx,
  childTotal,
  infantTotal,
  selectedCombo,
  grandTotal,
  totalSavings,
  customerName,
  setCustomerName,
  handleWhatsApp,
  handleNotifyMe,
  handleBooking,
}: PackagePricingBodyProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <BedDouble className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">Kalkulator Harga</h3>
      </div>

      {/* Rate preview */}
      {price && (
        <div className="grid grid-cols-3 gap-1.5">
          {(["quad", "triple", "double"] as const).map((rt) => (
            <div key={rt} className="p-2 rounded-lg text-center border bg-muted/30">
              <span className="block text-[10px] text-muted-foreground capitalize">{rt}</span>
              <span className="block text-xs font-bold mt-0.5">
                {price[rt] > 0 ? formatCurrency(price[rt]) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Participants */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-semibold">Dewasa</span>
          </div>
          <CounterInput value={adults} onChange={(v) => { setAdults(v); setSelectedComboIdx(0); }} min={1} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PersonStanding className="h-3.5 w-3.5 text-emerald-500" />
            <div>
              <span className="text-xs font-semibold">Anak</span>
              <span className="text-[10px] text-muted-foreground ml-1">25jt · Sharing bed</span>
            </div>
          </div>
          <CounterInput value={children} onChange={setChildren} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Baby className="h-3.5 w-3.5 text-pink-500" />
            <div>
              <span className="text-xs font-semibold">Infant</span>
              <span className="text-[10px] text-muted-foreground ml-1">15jt · Tanpa bed & perlengkapan</span>
            </div>
          </div>
          <CounterInput value={infants} onChange={setInfants} />
        </div>
      </div>

      <Separator />

      {/* Room combos */}
      {combos.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Opsi Kamar</p>
          {combos.map((combo, i) => {
            const gt = combo.totalRoomCost + childTotal + infantTotal;
            const isSelected = safeComboIdx === i;
            return (
              <button
                key={combo.label}
                onClick={() => setSelectedComboIdx(i)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all text-xs",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{combo.label}</span>
                  {i === 0 && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                      <Crown className="h-2 w-2 mr-0.5" /> Hemat
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{formatCurrency(combo.perAdult)}/pax</span>
                  <span className="font-bold text-foreground">{formatCurrency(gt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {selectedCombo && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{adults}x Dewasa</span>
              <span className="font-semibold">{formatCurrency(selectedCombo.totalRoomCost)}</span>
            </div>
            {children > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{children}x Anak</span>
                <span className="font-semibold">{formatCurrency(childTotal)}</span>
              </div>
            )}
            {infants > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{infants}x Infant</span>
                <span className="font-semibold">{formatCurrency(infantTotal)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold">TOTAL</span>
              <span className="text-base font-bold text-primary">{formatCurrency(grandTotal)}</span>
            </div>
            {totalSavings > 0 && (
              <Badge variant="secondary" className="w-full justify-center py-1 text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                <Sparkles className="h-2.5 w-2.5 mr-1" /> Hemat {formatCurrency(totalSavings)}
              </Badge>
            )}
          </div>

          <Separator />

          {/* WhatsApp */}
          <div className="space-y-2">
            <Input
              placeholder="Nama jamaah..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="text-xs h-8"
            />
            <Button onClick={handleWhatsApp} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs" size="sm">
              <MessageCircle className="h-3.5 w-3.5" /> Kirim via WhatsApp
            </Button>
          </div>
        </>
      )}

      <Separator />
      {isPackageUnavailable(packageData) ? (
        <Button onClick={handleNotifyMe} className="w-full gap-2 text-xs" variant="outline" size="sm">
          <Bell className="h-3.5 w-3.5" /> Notify Me
        </Button>
      ) : (
        <Button onClick={handleBooking} className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white text-xs" size="sm">
          <Users className="h-3.5 w-3.5" /> Daftar Sekarang
        </Button>
      )}
    </div>
  );
}

/** Desktop sticky sidebar shell around PackagePricingBody. Hidden on mobile - see PackageStickyMobileBar. */
export function PackagePricing(props: PackagePricingBodyProps) {
  return (
    <aside
      id="kalkulator-harga"
      className="hidden lg:block w-[360px] shrink-0 border rounded-2xl bg-card/80 backdrop-blur-sm overflow-y-auto shadow-sm h-fit sticky top-24"
    >
      <PackagePricingBody {...props} />
    </aside>
  );
}
