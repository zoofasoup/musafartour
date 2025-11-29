import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight, Plane } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, addMonths, subMonths } from "date-fns";
import { id } from "date-fns/locale";

interface Package {
  id: string;
  package_name: string;
  departure_date: string;
  duration_days: number;
  flight: string;
  status: string;
  package_price: any;
  slug: string | null;
}

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const JadwalKeberangkatan = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, isAdmin } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchPackages();
  }, [isAdmin]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("packages")
        .select("id, package_name, departure_date, duration_days, flight, status, package_price, slug")
        .eq("status", "published")
        .order("departure_date", { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load packages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Add padding days for the start of the month
    const startPadding = getDay(monthStart);
    const paddedDays: (Date | null)[] = Array(startPadding).fill(null);
    
    return [...paddedDays, ...days];
  }, [currentDate]);

  const packagesByDate = useMemo(() => {
    const map: Record<string, Package[]> = {};
    packages.forEach(pkg => {
      const dateKey = pkg.departure_date;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(pkg);
    });
    return map;
  }, [packages]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleMonthChange = (month: string) => {
    const newDate = new Date(currentYear, parseInt(month), 1);
    setCurrentDate(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(parseInt(year), currentMonth, 1);
    setCurrentDate(newDate);
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear + i);
  }, []);

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Jadwal Keberangkatan</h1>
          <p className="text-muted-foreground">Kalender keberangkatan paket umroh</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-2">
                <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Hari ini: {format(new Date(), "dd MMMM yyyy", { locale: id })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="min-h-[100px] bg-muted/30 rounded-md" />;
              }

              const dateKey = format(day, "yyyy-MM-dd");
              const dayPackages = packagesByDate[dateKey] || [];
              const isCurrentDay = isToday(day);
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <div
                  key={dateKey}
                  className={`min-h-[100px] p-2 rounded-md border transition-colors ${
                    isCurrentDay
                      ? "bg-primary/10 border-primary"
                      : isCurrentMonth
                      ? "bg-background border-border hover:bg-muted/50"
                      : "bg-muted/30 border-transparent"
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentDay ? "text-primary" : "text-foreground"
                  }`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayPackages.slice(0, 2).map(pkg => (
                      <div
                        key={pkg.id}
                        onClick={() => navigate(`/admin/packages/${pkg.id}`)}
                        className="group cursor-pointer"
                      >
                        <div className="flex items-center gap-1 p-1 rounded bg-primary/10 hover:bg-primary/20 transition-colors">
                          <Plane className="h-3 w-3 text-primary shrink-0" />
                          <span className="text-xs truncate text-foreground group-hover:text-primary">
                            {pkg.package_name}
                          </span>
                        </div>
                      </div>
                    ))}
                    {dayPackages.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{dayPackages.length - 2} lainnya
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Package list for current month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Paket Bulan {months[currentMonth]} {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {packages.filter(pkg => {
            const pkgDate = new Date(pkg.departure_date);
            return pkgDate.getMonth() === currentMonth && pkgDate.getFullYear() === currentYear;
          }).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Tidak ada paket keberangkatan di bulan ini
            </p>
          ) : (
            <div className="space-y-3">
              {packages
                .filter(pkg => {
                  const pkgDate = new Date(pkg.departure_date);
                  return pkgDate.getMonth() === currentMonth && pkgDate.getFullYear() === currentYear;
                })
                .map(pkg => (
                  <div
                    key={pkg.id}
                    onClick={() => navigate(`/admin/packages/${pkg.id}`)}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Plane className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{pkg.package_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(pkg.departure_date), "dd MMMM yyyy", { locale: id })} • {pkg.duration_days} hari • {pkg.flight}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">
                        Rp {pkg.package_price?.quad?.toLocaleString("id-ID") || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">per orang (Quad)</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JadwalKeberangkatan;
