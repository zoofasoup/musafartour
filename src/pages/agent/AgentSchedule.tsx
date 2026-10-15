import { useState, useMemo } from "react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  List,
  Loader2,
  Share2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plane,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn, formatCurrency, getTierPrice, getSlotsTaken, todayJakarta } from "@/lib/utils";
import { AGENT_PACKAGE_COLUMNS } from "@/hooks/usePackages";
import PackageShareModal from "@/components/package-detail/PackageShareModal";
import { AgentEmpty, AgentPage, AgentPanel, Chips } from "@/components/agent/AgentPage";
import { MyCommission } from "@/components/agent/MyCommission";
import { LoadError } from "@/components/admin/jamaah/LoadError";

interface Package {
  id: string;
  slug?: string | null;
  package_name: string;
  departure_date: string;
  duration_days: number;
  package_price: { quad?: number; triple?: number; double?: number };
  hemat_package_price?: { quad?: number; triple?: number; double?: number } | null;
  five_star_package_price?: { quad?: number; triple?: number; double?: number } | null;
  pelataran_package_price?: { quad?: number; triple?: number; double?: number } | null;
  available_tiers?: string[] | null;
  slots_total: number;
  slots_filled: number;
  slots_booked_online: number | null;
  status: string;
  flight: string;
  makkah_hotel_star: number | null;
  madinah_hotel_star: number | null;
  flight_type?: string | null;
  makkah_hotel_name?: string | null;
  madinah_hotel_name?: string | null;
}

// formatCurrency imported from utils

const getPackageCategory = (pkg: Package): string => {
  const avgStar = ((pkg.makkah_hotel_star || 0) + (pkg.madinah_hotel_star || 0)) / 2;
  if (avgStar >= 4.5) return 'premium';
  if (avgStar >= 3.5) return 'standard';
  return 'ekonomis';
};

const getPackageStatus = (pkg: Package): 'open' | 'almost-full' | 'full' => {
  // Seats taken: sheet number or registered jamaah, depending on the package (see getSlotsTaken).
  const remaining = (pkg.slots_total || 40) - getSlotsTaken(pkg);
  if (remaining <= 0) return 'full';
  if (remaining <= 5) return 'almost-full';
  return 'open';
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const AgentSchedule = () => {
  const { agent } = useAgentAuth();
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Share modal
  const [sharePackage, setSharePackage] = useState<Package | null>(null);
  
  // Filters
  const [categoryFilters, setCategoryFilters] = useState<string[]>(['all']);
  const [statusFilters, setStatusFilters] = useState<string[]>(['open', 'almost-full']);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | null>(null);
  const [durationFilters, setDurationFilters] = useState<string[]>([]);
  const [budgetFilters, setBudgetFilters] = useState<string[]>([]);

  // Fetch packages
  const { data: packages = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['agent-schedule-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(AGENT_PACKAGE_COLUMNS)
        .eq('status', 'published')
        .gte('departure_date', todayJakarta())
        .order('departure_date', { ascending: true });

      if (error) throw error;
      return data as unknown as Package[];
    },
  });

  // Apply filters
  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      // Category filter
      if (!categoryFilters.includes('all')) {
        const category = getPackageCategory(pkg);
        if (!categoryFilters.includes(category)) return false;
      }
      
      // Status filter
      const status = getPackageStatus(pkg);
      if (!statusFilters.includes(status)) return false;
      
      // Month filter
      if (selectedMonthFilter !== null) {
        const pkgMonth = new Date(pkg.departure_date).getMonth();
        if (pkgMonth !== selectedMonthFilter) return false;
      }
      
      // Duration filter
      if (durationFilters.length > 0) {
        const days = pkg.duration_days;
        const matchesDuration = durationFilters.some(filter => {
          if (filter === '9-10') return days >= 9 && days <= 10;
          if (filter === '11-12') return days >= 11 && days <= 12;
          if (filter === '13+') return days >= 13;
          return false;
        });
        if (!matchesDuration) return false;
      }
      
      // Budget filter
      if (budgetFilters.length > 0) {
        const price = getTierPrice(pkg).quad;
        const matchesBudget = budgetFilters.some(filter => {
          if (filter === '<25') return price < 25000000;
          if (filter === '25-35') return price >= 25000000 && price <= 35000000;
          if (filter === '35-45') return price >= 35000000 && price <= 45000000;
          if (filter === '>45') return price > 45000000;
          return false;
        });
        if (!matchesBudget) return false;
      }
      
      return true;
    });
  }, [packages, categoryFilters, statusFilters, selectedMonthFilter, durationFilters, budgetFilters]);

  // Group packages by month for list view
  const packagesByMonth = useMemo(() => {
    const grouped: Record<string, Package[]> = {};
    filteredPackages.forEach(pkg => {
      const monthKey = format(new Date(pkg.departure_date), 'yyyy-MM');
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(pkg);
    });
    return grouped;
  }, [filteredPackages]);

  // Get packages for a specific date (calendar view)
  const getPackagesForDate = (date: Date) => {
    return filteredPackages.filter(pkg => 
      isSameDay(new Date(pkg.departure_date), date)
    );
  };

  // Calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding for first week
    const startDay = getDay(start);
    const paddingDays = Array(startDay).fill(null);
    
    return [...paddingDays, ...days];
  }, [currentMonth]);

  const toggleCategoryFilter = (category: string) => {
    if (category === 'all') {
      setCategoryFilters(['all']);
    } else {
      let newFilters = categoryFilters.filter(c => c !== 'all');
      if (newFilters.includes(category)) {
        newFilters = newFilters.filter(c => c !== category);
      } else {
        newFilters.push(category);
      }
      if (newFilters.length === 0) {
        setCategoryFilters(['all']);
      } else {
        setCategoryFilters(newFilters);
      }
    }
  };

  const toggleStatusFilter = (status: string) => {
    if (statusFilters.includes(status)) {
      const newFilters = statusFilters.filter(s => s !== status);
      if (newFilters.length > 0) {
        setStatusFilters(newFilters);
      }
    } else {
      setStatusFilters([...statusFilters, status]);
    }
  };

  const toggleDurationFilter = (duration: string) => {
    if (durationFilters.includes(duration)) {
      setDurationFilters(durationFilters.filter(d => d !== duration));
    } else {
      setDurationFilters([...durationFilters, duration]);
    }
  };

  const toggleBudgetFilter = (budget: string) => {
    if (budgetFilters.includes(budget)) {
      setBudgetFilters(budgetFilters.filter(b => b !== budget));
    } else {
      setBudgetFilters([...budgetFilters, budget]);
    }
  };

  const clearFilters = () => {
    setCategoryFilters(['all']);
    setStatusFilters(['open', 'almost-full']);
    setSelectedMonthFilter(null);
    setDurationFilters([]);
    setBudgetFilters([]);
  };

  const statusText = (pkg: Package) => {
    const status = getPackageStatus(pkg);
    const remaining = (pkg.slots_total || 40) - getSlotsTaken(pkg);
    return status === 'open' ? `Tersedia, ${remaining} kursi` : status === 'almost-full' ? `Hampir penuh, ${remaining} kursi` : 'Penuh';
  };

  /** One departure: the date, the package, price and commission, and a share button. */
  const PackageCard = ({ pkg }: { pkg: Package; compact?: boolean }) => {
    const price = getTierPrice(pkg).quad;
    const status = getPackageStatus(pkg);
    return (
      <div className="flex items-start gap-4 py-5">
        <div className="w-14 shrink-0 text-center">
          <p className="text-[28px] font-light leading-none tracking-[-0.03em] text-pkg-fg">{format(new Date(pkg.departure_date), 'd', { locale: localeId })}</p>
          <p className="pkg-caption mt-1 text-pkg-fg-3">{format(new Date(pkg.departure_date), 'MMM', { locale: localeId })}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[19px] leading-tight text-pkg-fg">{pkg.package_name}</p>
          <p className={`mt-1 text-[14px] ${status === 'full' ? 'text-pkg-red-deep' : 'text-pkg-fg-3'}`}>{pkg.duration_days} hari · {statusText(pkg)}</p>
          <p className="mt-2 text-[17px] text-pkg-fg">{formatCurrency(price)}<span className="text-[13px] text-pkg-fg-3"> /pax</span></p>
          <div className="mt-2"><MyCommission packageId={pkg.id} variant="compact" /></div>
        </div>
        <button
          type="button"
          onClick={() => setSharePackage(pkg)}
          aria-label={`Bagikan ${pkg.package_name}`}
          className="pkg-press pkg-glass grid h-12 w-12 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
        >
          <Share2 className="h-5 w-5" aria-hidden />
        </button>
      </div>
    );
  };

  if (error) {
    return (
      <AgentPage title="Jadwal.">
        <AgentPanel last><LoadError what="Jadwal keberangkatan" error={error} onRetry={() => refetch()} retrying={isFetching} /></AgentPanel>
      </AgentPage>
    );
  }

  if (isLoading) {
    return (
      <AgentPage title="Jadwal.">
        <AgentPanel last><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-pkg-fg-3" aria-label="Memuat" /></div></AgentPanel>
      </AgentPage>
    );
  }

  return (
    <>
    <AgentPage
      title="Jadwal."
      hero={
        <div className="mt-7 flex flex-wrap items-center gap-2">
          {([['list', 'Daftar', List], ['calendar', 'Kalender', CalendarIcon]] as const).map(([mode, label, Icon]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              onClick={() => setViewMode(mode)}
              className={`pkg-press pkg-label inline-flex h-11 items-center gap-2 rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream ${viewMode === mode ? 'pkg-glass-red' : 'pkg-glass'}`}
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </button>
          ))}
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <button type="button" className="pkg-press pkg-glass pkg-label inline-flex h-11 items-center gap-2 rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream">
                <Filter className="h-4 w-4" aria-hidden /> Filter
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Filter jadwal</SheetTitle>
              </SheetHeader>
              <ScrollArea className="mt-4 h-[calc(100vh-100px)]">
                <FilterPanel />
              </ScrollArea>
              <Button variant="ghost" className="mt-2" onClick={clearFilters}>Reset</Button>
            </SheetContent>
          </Sheet>
        </div>
      }
    >
      <AgentPanel last>
        <Chips
          label="Bulan"
          value={selectedMonthFilter === null ? 'all' : String(selectedMonthFilter)}
          onChange={(v) => setSelectedMonthFilter(v === 'all' ? null : Number(v))}
          options={[{ value: 'all', label: 'Semua' }, ...MONTHS.map((m, i) => ({ value: String(i), label: m }))]}
        />
        <div className="mt-4">{viewMode === 'list' ? <ListView /> : <CalendarView />}</div>
      </AgentPanel>
    </AgentPage>

    {/* Share Modal */}
    {sharePackage && (
      <PackageShareModal
        open={!!sharePackage}
        onOpenChange={(open) => !open && setSharePackage(null)}
        package={{
          id: sharePackage.id,
          slug: sharePackage.slug,
          package_name: sharePackage.package_name,
          departure_date: sharePackage.departure_date,
          duration_days: sharePackage.duration_days,
          flight: sharePackage.flight,
          flight_type: sharePackage.flight_type || 'Direct',
          madinah_hotel_name: sharePackage.madinah_hotel_name ?? null,
          madinah_hotel_star: sharePackage.madinah_hotel_star,
          makkah_hotel_name: sharePackage.makkah_hotel_name ?? null,
          makkah_hotel_star: sharePackage.makkah_hotel_star,
          package_price: sharePackage.package_price as { quad: number; double: number; triple: number },
          hemat_package_price: sharePackage.hemat_package_price,
          five_star_package_price: sharePackage.five_star_package_price,
          pelataran_package_price: sharePackage.pelataran_package_price,
          available_tiers: sharePackage.available_tiers,
        }}
        agentCode={agent?.referral_code || ''}
      />
    )}

    {/* Date Modal */}
    <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Keberangkatan {selectedDate && format(selectedDate, 'd MMMM yyyy', { locale: localeId })}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] divide-y divide-pkg-hair overflow-y-auto">
          {selectedDate && getPackagesForDate(selectedDate).map(pkg => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
          {selectedDate && getPackagesForDate(selectedDate).length === 0 && (
            <p className="py-4 text-center text-muted-foreground">Tidak ada keberangkatan</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );

  function FilterPanel() {
    return (
      <div className="space-y-6">
        {/* Category Filters */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Kategori Paket</Label>
          <div className="space-y-2">
            {[
              { value: 'all', label: 'Semua Paket' },
              { value: 'ekonomis', label: 'Ekonomis' },
              { value: 'standard', label: 'Standar' },
              { value: 'premium', label: 'Premium' },
            ].map(item => (
              <div key={item.value} className="flex items-center gap-2">
                <Checkbox
                  id={`cat-${item.value}`}
                  checked={categoryFilters.includes(item.value)}
                  onCheckedChange={() => toggleCategoryFilter(item.value)}
                />
                <Label htmlFor={`cat-${item.value}`} className="text-sm cursor-pointer">
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Status Filters */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Status</Label>
          <div className="space-y-2">
            {[
              { value: 'open', label: 'Tersedia' },
              { value: 'almost-full', label: 'Hampir penuh' },
              { value: 'full', label: 'Penuh' },
            ].map(item => (
              <div key={item.value} className="flex items-center gap-2">
                <Checkbox
                  id={`status-${item.value}`}
                  checked={statusFilters.includes(item.value)}
                  onCheckedChange={() => toggleStatusFilter(item.value)}
                />
                <Label htmlFor={`status-${item.value}`} className="text-sm cursor-pointer">
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Duration Filters */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Durasi</Label>
          <div className="space-y-2">
            {[
              { value: '9-10', label: '9-10 hari' },
              { value: '11-12', label: '11-12 hari' },
              { value: '13+', label: '13+ hari' },
            ].map(item => (
              <div key={item.value} className="flex items-center gap-2">
                <Checkbox
                  id={`dur-${item.value}`}
                  checked={durationFilters.includes(item.value)}
                  onCheckedChange={() => toggleDurationFilter(item.value)}
                />
                <Label htmlFor={`dur-${item.value}`} className="text-sm cursor-pointer">
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Budget Filters */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Budget</Label>
          <div className="space-y-2">
            {[
              { value: '<25', label: '< Rp 25 juta' },
              { value: '25-35', label: 'Rp 25-35 juta' },
              { value: '35-45', label: 'Rp 35-45 juta' },
              { value: '>45', label: '> Rp 45 juta' },
            ].map(item => (
              <div key={item.value} className="flex items-center gap-2">
                <Checkbox
                  id={`budget-${item.value}`}
                  checked={budgetFilters.includes(item.value)}
                  onCheckedChange={() => toggleBudgetFilter(item.value)}
                />
                <Label htmlFor={`budget-${item.value}`} className="text-sm cursor-pointer">
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function ListView() {
    const sortedMonths = Object.keys(packagesByMonth).sort();

    if (sortedMonths.length === 0) {
      return <AgentEmpty icon={CalendarIcon} text="Tidak ada jadwal" />;
    }

    return (
      <div>
        {sortedMonths.map(monthKey => (
          <section key={monthKey} className="mt-4">
            <p className="pkg-caption sticky top-14 z-10 bg-pkg-cream py-3 text-pkg-fg-3 md:top-0">{format(new Date(monthKey + '-01'), 'MMMM yyyy', { locale: localeId })}</p>
            <div className="divide-y divide-pkg-hair">
              {packagesByMonth[monthKey].map(pkg => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  function CalendarView() {
    return (
      <div>
        <div className="pb-4">
          <div className="flex items-center justify-between">
            <button type="button" className="pkg-press pkg-glass grid h-12 w-12 place-items-center rounded-full" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} aria-label="Bulan sebelumnya">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-[20px] font-light tracking-[-0.02em] text-pkg-fg">
              {format(currentMonth, 'MMMM yyyy', { locale: localeId })}
            </h2>
            <button type="button" className="pkg-press pkg-glass grid h-12 w-12 place-items-center rounded-full" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} aria-label="Bulan berikutnya">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div>
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }
              
              const dayPackages = getPackagesForDate(day);
              const hasPackages = dayPackages.length > 0;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => hasPackages && setSelectedDate(day)}
                  disabled={!hasPackages}
                  aria-label={`${format(day, 'd MMMM yyyy', { locale: localeId })}${hasPackages ? `, ${dayPackages.length} paket` : ', tidak ada paket'}`}
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors relative",
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground/50",
                    hasPackages && "cursor-pointer",
                    !hasPackages && "cursor-default"
                  )}
                >
                  <span className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-full",
                    hasPackages && "bg-pkg-red text-pkg-on-red font-medium"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  {hasPackages && (
                    <div className="flex gap-0.5 mt-1">
                      {dayPackages.slice(0, 3).map((pkg, i) => {
                        const status = getPackageStatus(pkg);
                        return (
                          <div
                            key={i}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              status === 'open' && "bg-status-ok-fg",
                              status === 'almost-full' && "bg-pkg-fg-3",
                              status === 'full' && "bg-destructive"
                            )}
                          />
                        );
                      })}
                      {dayPackages.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{dayPackages.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Tersedia</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber" />
              <span className="text-xs text-muted-foreground">Hampir penuh</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-xs text-muted-foreground">Penuh</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default AgentSchedule;