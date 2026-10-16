import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackageFilterSheet, type FilterConfig } from "@/components/package-list/PackageFilterSheet";

/**
 * Search plus filters for an admin list. On a desktop: the search field and one select per filter, in a row. On a phone:
 * the search field and a Filter button (with the number of active filters) that opens one sheet with a group of pills per
 * filter and a button that closes it with the result count.
 */
export function FilterBar({
  search,
  onSearch,
  searchPlaceholder = "Cari",
  filters = [],
  onReset,
  count,
  title = "Filter",
  unit = "hasil",
}: {
  search?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  onReset?: () => void;
  /** Number of rows that match, shown on the sheet's button. */
  count: number;
  title?: string;
  /** What the rows are called, for the sheet button ("Lihat 12 jamaah"). */
  unit?: string;
}) {
  const phone = useIsMobile();
  const [open, setOpen] = useState(false);
  const active = filters.filter((f) => f.value !== "all").length;

  const field = onSearch && (
    <div className="relative min-w-0 flex-1 md:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pkg-fg-3" aria-hidden />
      <Input value={search ?? ""} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="pl-10" />
    </div>
  );

  if (phone) {
    return (
      <>
        <div className="mb-4 flex items-center gap-2">
          {field}
          {filters.length > 0 && (
            <button
              type="button"
              data-plain
              onClick={() => setOpen(true)}
              className="pkg-press pkg-glass pkg-label inline-flex h-14 shrink-0 items-center gap-2 rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filter
              {active > 0 && <span className="pkg-glass-red inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs">{active}</span>}
            </button>
          )}
        </div>
        {filters.length > 0 && (
          <PackageFilterSheet open={open} onOpenChange={setOpen} filterConfigs={filters} isFiltered={active > 0} onReset={onReset ?? (() => undefined)} count={count} title={title} unit={unit} />
        )}
      </>
    );
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      {field}
      {filters.map((f) => (
        <Select key={f.key} value={f.value} onValueChange={f.onChange}>
          <SelectTrigger className="w-auto min-w-40" aria-label={f.placeholder}>
            <SelectValue placeholder={f.placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{f.allLabel}</SelectItem>
            {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      ))}
      {active > 0 && onReset && (
        <button type="button" onClick={onReset} className="pkg-label inline-flex min-h-11 items-center gap-1.5 text-pkg-red-deep underline underline-offset-4">
          <X className="h-4 w-4" aria-hidden /> Reset
        </button>
      )}
    </div>
  );
}
