import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bell, ChevronUp } from "lucide-react";
import { formatCurrency, isPackageUnavailable } from "@/lib/utils";
import { PackagePricingBody, type PackagePricingBodyProps } from "./PackagePricing";

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
  const { packageData, grandTotal, handleNotifyMe } = props;
  const unavailable = isPackageUnavailable(packageData);

  useEffect(() => setMounted(true), []);

  return (
    <>
      {mounted &&
        createPortal(
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t bg-card/95 backdrop-blur-sm shadow-[0_-4px_12px_rgba(0,0,0,0.06)] px-4 py-3">
            {unavailable ? (
              <Button onClick={handleNotifyMe} className="w-full gap-2" variant="outline">
                <Bell className="h-4 w-4" /> Notify Me
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                  <p className="text-base font-bold text-primary truncate">{formatCurrency(grandTotal)}</p>
                </div>
                <Button onClick={() => setOpen(true)} className="gap-1.5 shrink-0">
                  Lihat Rincian Harga <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
            )}
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
