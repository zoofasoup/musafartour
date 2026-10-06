import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bell, ChevronUp, ClipboardList } from "lucide-react";
import { formatCurrency, isPackageUnavailable, isPackageDeparted } from "@/lib/utils";
import { PackagePricingBody, type PackagePricingBodyProps } from "./PackagePricing";
import { PackageUrgencyBar } from "./PackageUrgencyBar";

/**
 * Mobile-only sticky bottom bar replacing the desktop sticky sidebar. Opens the
 * same calculator body in a bottom Sheet.
 *
 * Portaled to document.body: #root has `contain: layout style` (index.html,
 * a deliberate site-wide perf optimization) which creates a new containing
 * block for `position: fixed` descendants, so a fixed element nested under
 * #root scrolls away with the page instead of staying pinned. FloatingWhatsApp
 * and Navbar's mobile menu already work around this the same way.
 */
export function PackageStickyMobileBar(props: PackagePricingBodyProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { packageData, grandTotal, adults, children, infants, handleNotifyMe } = props;
  const unavailable = isPackageUnavailable(packageData);
  const paxCount = adults + children + infants;

  useEffect(() => setMounted(true), []);

  return (
    <>
      {mounted &&
        createPortal(
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30">
            {!unavailable && (
              <div className="flex justify-center">
                <div className="-mb-px rounded-t-2xl border border-b-0 border-border bg-card/95 backdrop-blur-sm px-4 py-1.5 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
                  <PackageUrgencyBar packageData={packageData} />
                </div>
              </div>
            )}
            <div className="border-t bg-card/95 backdrop-blur-sm shadow-[0_-4px_12px_rgba(0,0,0,0.06)] px-4 py-3">
              {isPackageDeparted(packageData) ? (
                <Button variant="brand" asChild className="w-full">
                  <Link to="/paket-umroh">Sudah berangkat · Lihat Paket Lainnya</Link>
                </Button>
              ) : unavailable ? (
                <Button onClick={handleNotifyMe} className="w-full gap-2" variant="outline">
                  <Bell className="h-4 w-4" /> Gabung Waitlist
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="min-w-0 flex-1 rounded-md py-1 text-left"
                    aria-label="Lihat rincian harga"
                  >
                    <span className="block text-xs uppercase text-muted-foreground">
                      {grandTotal > 0 ? `Total (${paxCount} orang)` : "Mulai dari"}
                    </span>
                    <span className="flex items-center gap-1 text-base font-bold text-primary">
                      <span className="truncate">
                        {grandTotal > 0 ? formatCurrency(grandTotal) : `${formatCurrency(props.price?.quad ?? 0)} / orang`}
                      </span>
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    </span>
                  </button>
                  {packageData.slug ? (
                    <Button variant="brand" asChild className="h-12 shrink-0 gap-2 px-6 text-base font-bold">
                      <Link to={`/daftar/${packageData.slug}`}>
                        <ClipboardList className="h-4 w-4" aria-hidden /> Daftar Sekarang
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="brand" onClick={() => setOpen(true)} className="h-12 shrink-0 gap-1.5 px-5">
                      Lihat Rincian Harga
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="p-0 max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="sr-only">
            <SheetTitle>Kalkulator Harga</SheetTitle>
          </SheetHeader>
          <PackagePricingBody {...props} />
        </SheetContent>
      </Sheet>
    </>
  );
}
