import { useState } from "react";
import { X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSwipeDownClose } from "@/hooks/useSwipeDownClose";
import { cn } from "@/lib/utils";

export interface FilterConfig {
  key: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  allLabel: string;
  options: { value: string; label: string }[];
}

/** The filter bottom sheet: one group of pills per filter, Reset, and a button that closes it with the result count. */
export function PackageFilterSheet({
  open,
  onOpenChange,
  filterConfigs,
  isFiltered,
  onReset,
  count,
  title = "Filter paket",
  unit = "paket",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  filterConfigs: FilterConfig[];
  isFiltered: boolean;
  onReset: () => void;
  count: number;
  title?: string;
  unit?: string;
}) {
  const [filterPanel, setFilterPanel] = useState<HTMLDivElement | null>(null);
  useSwipeDownClose(filterPanel, () => onOpenChange(false));
  return (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" overlayClassName="pkg-overlay" className="pkg-v2 pkg-float border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
            <SheetHeader className="sr-only">
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
            <div ref={setFilterPanel} data-pkg-tone="cream" className="pkg-panel pkg-panel-sheet max-h-[88svh] overflow-y-auto">
              <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-pkg-hair" aria-hidden />
              <SheetClose asChild>
                <button type="button" aria-label="Tutup" className="pkg-press pkg-glass absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink">
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </SheetClose>
              <h2 className="pkg-h2 pr-14">Filter</h2>
              <div className="mt-6 space-y-6">
                {filterConfigs.map((f) => (
                  <fieldset key={f.key}>
                    <legend className="pkg-label mb-3 text-pkg-fg-2">{f.placeholder}</legend>
                    <div className="flex flex-wrap gap-2">
                      {[{ value: "all", label: "Semua" }, ...f.options].map((o) => {
                        const on = f.value === o.value;
                        return (
                          <button
                            key={o.value}
                            type="button"
                            aria-pressed={on}
                            onClick={() => f.onChange(o.value)}
                            className={cn(
                              "pkg-press pkg-label h-11 rounded-full px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2",
                              on ? "bg-pkg-ink text-pkg-cream" : "bg-pkg-cream-2 text-pkg-fg-2"
                            )}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
              <div className="sticky -bottom-px -mx-6 mt-6 flex gap-3 bg-pkg-cream px-6 pb-2 pt-4">
                {isFiltered && (
                  <button type="button" onClick={onReset} className="pkg-press pkg-glass pkg-label inline-flex h-14 items-center justify-center rounded-full px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2">
                    Reset
                  </button>
                )}
                <button type="button" onClick={() => onOpenChange(false)} className="pkg-press pkg-glass-red pkg-label inline-flex h-14 min-w-0 flex-1 items-center justify-center rounded-full px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2">
                  Lihat {count} {unit}
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
  );
}
