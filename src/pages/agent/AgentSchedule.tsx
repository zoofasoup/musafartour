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
import { cn, formatCurrency, getTierPrice } from "@/lib/utils";
import PackageShareModal from "@/components/agent/PackageShareModal";
import { AgentPageHeader } from "@/components/agent/AgentPageHeader";

interface Package {
  id: string;
  package_name: string;
  departure_date: string;
  duration_days: number;
  package_price: { quad?: number; triple?: number; double?: number };
  hemat_package_price?: { quad?: number; triple?: number; double?: number } | null;
  five_star_package_price?: { quad?: number; triple?: number; double?: number } | null;
  pelataran_package_price?: { quad?: number; triple?: number; double?: number } | null;
  available_tiers?: string[] | null;
  commission_rate: number;
  slots_total: number;
  slots_filled: number;
  status: string;
  flight: string;
  makkah_hotel_star: number | null;
  madinah_hotel_star: number | null;
}

// formatCurrency imported from utils

const getPackageCategory = (pkg: Package): string => {
  const avgStar = ((pkg.makkah_hotel_star || 0) + (pkg.madinah_hotel_star || 0)) / 2;
  if (avgStar >= 4.5) return 'premium';
  if (avgStar >= 3.5) return 'standard';
  return 'ekonomis';
};

const getPackageStatus = (pkg: Package): 'open' | 'almost-full' | 'full' => {
  const remaining = (pkg.slots_total || 40) - (pkg.slots_filled || 0);
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
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['agent-schedule-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('status', 'published')
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date', { ascending: true });
      
      if (error) throw error;
      return data as Package[];
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

  const getStatusBadge = (pkg: Package) => {
    const status = getPackageStatus(pkg);
    const remaining = (pkg.slots_total || 40) - (pkg.slots_filled || 0);

    switch (status) {
      case 'open':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Open ({remaining} seats)
          </Badge>
        );
      case 'almost-full':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Almost Full ({remaining} seats)
          </Badge>
        );
      case 'full':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Full Booked
          </Badge>
        );
    }
  };

  const PackageCard = ({ pkg, compact = false }: { pkg: Package; compact?: boolean }) => {
    const price = getTierPrice(pkg).quad;
    const commission = price * ((pkg.commission_rate || 4.5) / 100);
    
    if (compact) {
      return (
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {format(new Date(pkg.departure_date), 'd MMM', { locale: localeId })}
              </span>
              <span className="text-sm text-muted-foreground">-</span>
              <span className="text-sm font-medium truncate">{pkg.package_name}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {getStatusBadge(pkg)}
              <span className="text-sm text-muted-foreground">
                Harga: {formatCurrency(price)}
              </span>
              <span className="text-sm text-emerald-600 font-medium">
                Komisi: {formatCurrency(commission)}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSharePackage(pkg)}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(new Date(pkg.departure_date), 'd MMMM yyyy', { locale: localeId })}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">{pkg.duration_days} hari</span>
              </div>
              
              <h3 className="font-semibold text-lg mb-2">{pkg.package_name}</h3>
              
              <div className="flex items-center gap-2 mb-2">
                {getStatusBadge(pkg)}
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  <span>{pkg.flight}</span>
                </div>
              </div>
              
              <div className="mt-3 flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Harga</p>
                  <p className="font-bold text-lg">{formatCurrency(price)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Komisi</p>
                  <p className="font-bold text-lg text-emerald-600">
                    {formatCurrency(commission)}
                  </p>
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setSharePackage(pkg)}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-6">
      <AgentPageHeader
        title="Jadwal Keberangkatan"
        description={`${filteredPackages.length} paket tersedia`}
        icon={CalendarIcon}
        action={
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8"
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="h-8"
              >
                <CalendarIcon className="h-4 w-4 mr-1" />
                Calendar
              </Button>
            </div>

            {/* Filter Button (Mobile) */}
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filter Jadwal</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                  <FilterPanel />
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        }
      />

      {/* Quick Month Selector */}
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={selectedMonthFilter === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedMonthFilter(null)}
          className="shrink-0"
        >
          Semua
        </Button>
        {MONTHS.map((month, index) => (
          <Button
            key={month}
            variant={selectedMonthFilter === index ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMonthFilter(index)}
            className="shrink-0"
          >
            {month}
          </Button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters (Desktop) */}
        <div className="hidden lg:block w-64 shrink-0">
          <Card className="sticky top-24">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Filter</CardTitle>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <FilterPanel />
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {viewMode === 'list' ? (
            <ListView />
          ) : (
            <CalendarView />
          )}
        </div>
      </div>

      {/* Share Modal */}
      {sharePackage && (
        <PackageShareModal
          open={!!sharePackage}
          onOpenChange={(open) => !open && setSharePackage(null)}
          package={{
            id: sharePackage.id,
            package_name: sharePackage.package_name,
            departure_date: sharePackage.departure_date,
            duration_days: sharePackage.duration_days,
            flight: sharePackage.flight,
            flight_type: 'Direct',
            madinah_hotel_name: null,
            madinah_hotel_star: sharePackage.madinah_hotel_star,
            makkah_hotel_name: null,
            makkah_hotel_star: sharePackage.makkah_hotel_star,
            package_price: sharePackage.package_price as { quad: number; double: number; triple: number },
            hemat_package_price: sharePackage.hemat_package_price,
            five_star_package_price: sharePackage.five_star_package_price,
            pelataran_package_price: sharePackage.pelataran_package_price,
            available_tiers: sharePackage.available_tiers,
            commission_rate: sharePackage.commission_rate,
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
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {selectedDate && getPackagesForDate(selectedDate).map(pkg => (
              <PackageCard key={pkg.id} pkg={pkg} compact />
            ))}
            {selectedDate && getPackagesForDate(selectedDate).length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Tidak ada keberangkatan di tanggal ini
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
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
              { value: 'standard', label: 'Standard' },
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
              { value: 'open', label: 'Open' },
              { value: 'almost-full', label: 'Almost Full' },
              { value: 'full', label: 'Full Booked' },
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
      return (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Tidak ada jadwal yang sesuai dengan filter</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {sortedMonths.map(monthKey => {
          const monthDate = new Date(monthKey + '-01');
          const monthPackages = packagesByMonth[monthKey];
          
          return (
            <div key={monthKey}>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1 bg-border" />
                <h2 className="text-sm font-bold uppercase text-muted-foreground">
                  {format(monthDate, 'MMMM yyyy', { locale: localeId })}
                </h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              
              <div className="space-y-3">
                {monthPackages.map(pkg => (
                  <PackageCard key={pkg.id} pkg={pkg} compact />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function CalendarView() {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-bold text-lg">
              {format(currentMonth, 'MMMM yyyy', { locale: localeId })}
            </h2>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors relative",
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground/50",
                    hasPackages && "cursor-pointer hover:bg-primary/10",
                    !hasPackages && "cursor-default"
                  )}
                >
                  <span className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-full",
                    hasPackages && "bg-primary text-primary-foreground font-medium"
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
                              status === 'open' && "bg-emerald-500",
                              status === 'almost-full' && "bg-amber-500",
                              status === 'full' && "bg-red-500"
                            )}
                          />
                        );
                      })}
                      {dayPackages.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{dayPackages.length - 3}</span>
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
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">Open</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs text-muted-foreground">Almost Full</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">Full</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
};

export default AgentSchedule;