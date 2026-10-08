import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, FileText, Plane, BarChart, AlertTriangle, Users, Calendar, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSlotsTaken } from "@/lib/utils";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { getAdminHomePath } from "@/components/admin/adminMenu";
import { WorkQueueCards } from "@/components/admin/WorkQueueCards";

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();

  const { data: packagesCount } = useQuery({
    queryKey: ['packages-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('packages')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: wisataCount } = useQuery({
    queryKey: ['wisata-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('wisata_halal')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: articlesCount } = useQuery({
    queryKey: ['articles-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');
      return count || 0;
    },
  });

  const { data: upcomingPackages } = useQuery({
    queryKey: ['upcoming-packages'],
    queryFn: async () => {
      const { data } = await supabase
        .from('packages')
        .select('id, package_name, departure_date, slots_total, slots_filled, slots_booked_online, seat_source, slots_registered, status')
        .eq('status', 'published')
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date', { ascending: true })
        .limit(3);
      return data || [];
    },
  });

  const { data: whatsappClicksThisMonth } = useQuery({
    queryKey: ['whatsapp-clicks-this-month'],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('whatsapp_clicks')
        .select('*', { count: 'exact', head: true })
        .gte('clicked_at', startOfMonth.toISOString());
      return count || 0;
    },
  });

  const { data: topAgents } = useQuery({
    queryKey: ['dashboard-top-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, name, total_sales, total_commission, level')
        .eq('status', 'active')
        .order('total_sales', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Defensive: AdminDashboard only renders this for owners; never show a dead end.
  if (!isAdmin) return <Navigate to="/admin/profile" replace />;

  const stats = [
    {
      title: "Total Paket Umroh",
      value: packagesCount?.toString() || "0",
      icon: Package,
      description: "Paket aktif",
    },
    {
      title: "Wisata Halal",
      value: wisataCount?.toString() || "0",
      icon: Plane,
      description: "Destinasi tersedia",
    },
    {
      title: "Artikel",
      value: articlesCount?.toString() || "0",
      icon: FileText,
      description: "Artikel terbit",
    },
    {
      title: "Klik WhatsApp",
      value: whatsappClicksThisMonth?.toString() || "0",
      icon: BarChart,
      description: "Bulan ini",
    },
  ];

  const getInsights = () => {
    const insights = [];
    if (upcomingPackages && upcomingPackages.length > 0) {
      const nextPkg = upcomingPackages[0];
      const daysUntil = Math.floor((new Date(nextPkg.departure_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      const slotsTotal = nextPkg.slots_total || 45;
      // Offline (sheet) + online bookings both consume seats.
      const slotsFilled = getSlotsTaken(nextPkg);
      const sisaSeat = Math.max(0, slotsTotal - slotsFilled);

      if (daysUntil < 45 && sisaSeat > 0) {
        insights.push({
          id: 1,
          type: 'warning',
          icon: AlertTriangle,
          title: "Perhatian: Keberangkatan Dekat",
          text: `Keberangkatan "${nextPkg.package_name}" tersisa ${daysUntil} hari dengan ${sisaSeat} seat tersisa. Pertimbangkan untuk broadcast WhatsApp ke database leads untuk menghabiskan kuota.`,
          color: 'text-amber-700',
          bg: 'bg-amber-50',
          border: 'border-amber-200'
        });
      }
    }
    return insights;
  };

  const insights = getInsights();

  const agentInitials = (name: string) =>
    name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const agentColors = ["bg-blue-100 text-blue-700", "bg-pink-100 text-pink-700", "bg-purple-100 text-purple-700"];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dasbor</h1>
          <p className="text-muted-foreground mt-1">Yang perlu ditangani hari ini dan ringkasan situs.</p>
        </div>
      </div>

      {/* Work queues: what needs a person today, each card opens the page where it is done */}
      <WorkQueueCards />

      {/* Insights derived from real upcoming-departure data - only renders when there's something real to flag */}
      {insights.length > 0 && (
      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <div key={insight.id} className={`${insight.bg} ${insight.border} border rounded-2xl p-5 shadow-sm transition-transform hover:-translate-y-1 duration-300`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm`}>
                  <Icon className={`w-5 h-5 ${insight.color}`} />
                </div>
                <div>
                  <h3 className={`font-semibold text-sm ${insight.color} mb-1`}>{insight.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{insight.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* KPI Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-all duration-300 border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{stat.title}</CardTitle>
                <div className="p-2 bg-primary/5 rounded-xl">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800">{stat.value}</div>
                <div className="mt-2 text-xs text-slate-400">{stat.description}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Real-time Occupancy Gauge / Upcoming */}
        <Card className="md:col-span-2 border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Keberangkatan Terdekat
                </CardTitle>
                <CardDescription>Pantau sisa seat secara langsung</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/jadwal')} className="text-primary hover:text-primary/80">
                Lihat Semua <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="divide-y divide-slate-100">
              {upcomingPackages?.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Belum ada jadwal keberangkatan aktif.</div>
              ) : (
                upcomingPackages?.map((pkg) => {
                  const slotsTotal = pkg.slots_total || 45;
                  // Offline (sheet) + online bookings both consume seats.
                  const slotsFilled = getSlotsTaken(pkg);
                  const occupancyPercentage = Math.round((slotsFilled / slotsTotal) * 100);
                  const isHighOccupancy = occupancyPercentage > 80;
                  const sisaSeat = Math.max(0, slotsTotal - slotsFilled);
                  
                  return (
                    <div key={pkg.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 text-base">{pkg.package_name}</h4>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(pkg.departure_date), "dd MMMM yyyy", { locale: idLocale })}
                        </p>
                      </div>
                      <div className="w-full sm:w-64 flex flex-col gap-2">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-slate-600">Occupancy</span>
                          <span className={isHighOccupancy ? "text-emerald-600" : "text-primary"}>{occupancyPercentage}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${isHighOccupancy ? 'bg-emerald-500' : 'bg-primary'}`} 
                            style={{ width: `${occupancyPercentage}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-500 text-right">
                          Estimasi sisa {sisaSeat} dari {slotsTotal} seat
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Agent Leaderboard */}
        <Card className="border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Leaderboard Agen
            </CardTitle>
            <CardDescription>Top 3 agen berdasarkan total penjualan</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="divide-y divide-slate-100">
              {!topAgents || topAgents.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Belum ada agen aktif.</div>
              ) : topAgents.map((agent, i) => (
                <div key={agent.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${agentColors[i] || agentColors[agentColors.length - 1]}`}>
                        {agentInitials(agent.name)}
                      </div>
                      {i === 0 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl filter drop-shadow-sm">👑</div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{agent.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{agent.total_sales} Closing</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-indigo-600">Rp {(agent.total_commission || 0).toLocaleString('id-ID')}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Komisi</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
            <Button variant="outline" className="w-full text-slate-600 bg-white" onClick={() => navigate('/admin/gamification')}>
              Lihat Gamifikasi <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

/**
 * /admin index. Owners (admin, superadmin) get the dashboard; every other staff role is
 * sent to its first allowed page (see getAdminHomePath), so nobody lands on a dead end.
 */
const AdminDashboard = () => {
  const { loading, userRole } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (userRole && userRole !== "admin" && userRole !== "superadmin") {
    return <Navigate to={getAdminHomePath(userRole) ?? "/admin/profile"} replace />;
  }
  return <OwnerDashboard />;
};

export default AdminDashboard;
