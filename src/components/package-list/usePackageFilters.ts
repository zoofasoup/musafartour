import { useMemo, useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { isPackageUnavailable } from "@/lib/utils";
import type { PublishedPackage } from "@/hooks/usePackages";

/**
 * The package list's filters and order, shared by the public list and the agent portal so both behave the same:
 * five filters built from what the packages really have, available packages first, sold out ones last.
 */
export function usePackageFilters(packages: PublishedPackage[]) {
  const [category, setCategory] = useState<string>("all");
  const [airline, setAirline] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [flightType, setFlightType] = useState<string>("all");
  const [duration, setDuration] = useState<string>("all");

  // Dynamic filter options derived from actual data
  const filterOptions = useMemo(() => {
    const airlines = [...new Set(packages.map(p => p.flight).filter(Boolean))].sort();
    const durations = [...new Set(packages.map(p => p.duration_days))].sort((a, b) => a - b);
    const months = [...new Set(packages.map(p => {
      const d = new Date(p.departure_date);
      return format(d, "yyyy-MM");
    }))].sort().map(ym => {
      const d = new Date(ym + "-01");
      return { value: format(d, "MMMM", { locale: localeId }).toLowerCase(), label: format(d, "MMMM yyyy", { locale: localeId }) };
    });
    const uniqueMonths = months.filter((m, i, arr) => arr.findIndex(x => x.value === m.value) === i);

    const tiers = [...new Set(packages.flatMap(p => (p as any).available_tiers || []))].filter(Boolean);
    const tierMap: Record<string, string> = { hemat: "Hemat", nyaman: "Nyaman", best_seller: "Nyaman", "five-star": "Five Star", five_star: "Five Star", pelataran: "Pelataran Hemat", "pelataran-hemat": "Pelataran Hemat" };
    const categories = [...new Set(tiers.map(t => ({ value: t, label: tierMap[t] || t })).map(c => JSON.stringify(c)))].map(s => JSON.parse(s));

    return { airlines, durations, months: uniqueMonths, categories };
  }, [packages]);

  const getMonthFromDate = (date: string) => {
    return format(new Date(date), "MMMM yyyy", { locale: localeId }).toLowerCase();
  };

  const filteredPackages = packages.filter((pkg) => {
    const pkgMonth = getMonthFromDate(pkg.departure_date);
    const pkgTiers = (pkg as any).available_tiers || [];

    const categoryMatch = category === "all" || pkgTiers.includes(category);
    const airlineMatch = airline === "all" || pkg.flight === airline;
    const monthMatch = month === "all" || pkgMonth.includes(month.toLowerCase());
    const flightTypeMatch = flightType === "all" || pkg.flight_type.toLowerCase() === flightType;
    const durationMatch = duration === "all" || pkg.duration_days === parseInt(duration);

    return categoryMatch && airlineMatch && monthMatch && flightTypeMatch && durationMatch;
  });

  // Available packages first (soonest departure first, already the base query order),
  // sold-out packages pushed to the end. Stable sort preserves date order within each group.
  const sortedPackages = [...filteredPackages].sort(
    (a, b) => Number(isPackageUnavailable(a)) - Number(isPackageUnavailable(b))
  );

  const isFiltered = category !== "all" || airline !== "all" || month !== "all" || flightType !== "all" || duration !== "all";
  const activeFilterCount = [category, airline, month, flightType, duration].filter((v) => v !== "all").length;

  const filterConfigs = [
    { key: "category", value: category, onChange: setCategory, placeholder: "Kategori", allLabel: "Semua Kategori", options: filterOptions.categories.map((c: any) => ({ value: c.value, label: c.label })), width: "w-[160px]" },
    { key: "month", value: month, onChange: setMonth, placeholder: "Bulan", allLabel: "Semua Bulan", options: filterOptions.months.map((m) => ({ value: m.value, label: m.label })), width: "w-[170px]" },
    { key: "airline", value: airline, onChange: setAirline, placeholder: "Maskapai", allLabel: "Semua Maskapai", options: filterOptions.airlines.map((a) => ({ value: a, label: a })), width: "w-[170px]" },
    { key: "flightType", value: flightType, onChange: setFlightType, placeholder: "Penerbangan", allLabel: "Semua Tipe", options: [{ value: "direct", label: "Direct" }, { value: "transit", label: "Transit" }], width: "w-[150px]" },
    { key: "duration", value: duration, onChange: setDuration, placeholder: "Durasi", allLabel: "Semua Durasi", options: filterOptions.durations.map((d) => ({ value: String(d), label: `${d} Hari` })), width: "w-[140px]" },
  ];

  const resetFilters = () => {
    setCategory("all");
    setAirline("all");
    setMonth("all");
    setFlightType("all");
    setDuration("all");
  };

  const categoryChips = [{ value: "all", label: "Semua" }, ...filterOptions.categories.map((c: { value: string; label: string }) => ({ value: c.value, label: c.label }))];

  return { category, setCategory, filterOptions, filterConfigs, categoryChips, sortedPackages, isFiltered, activeFilterCount, resetFilters };
}
