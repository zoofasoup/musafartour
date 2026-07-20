import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, FileText, Plane, BarChart, RefreshCw, AlertTriangle, Users, Calendar, ArrowRight, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [migrating, setMigrating] = useState(false);

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
        .select('id, package_name, departure_date, slots_total, slots_filled, status')
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

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Anda tidak memiliki akses admin</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
      description: "Artikel published",
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
      const slotsFilled = nextPkg.slots_filled || 0;
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

  const handleMigrateSlugs = async () => {
    setMigrating(true);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-package-slugs');
      if (error) throw error;
      toast.success(`Berhasil! ${data.updated} paket diupdate`, {
        description: `Total: ${data.total}, Gagal: ${data.failed}`
      });
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error('Gagal migrasi slug: ' + (error.message || 'Unknown error'));
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Pusat komando Admin Musafar Tour.</p>
        </div>
      </div>

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
                <CardDescription>Pantau sisa kuota (seat) secara real-time</CardDescription>
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
                  const slotsFilled = pkg.slots_filled || 0;
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
                        <div className="absolute -top-2 -right-2 text-xl filter drop-shadow-sm">👑</div>
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>Akses cepat ke fitur & utilitas utama</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors group">
                <h3 className="text-sm font-semibold text-slate-800">Update Slug Paket</h3>
                <p className="text-xs text-slate-500 mb-4 mt-1 line-clamp-2">
                  Migrasi semua slug paket ke format baru secara massal.
                </p>
                <Button 
                  onClick={handleMigrateSlugs} 
                  disabled={migrating}
                  variant="outline"
                  className="w-full bg-white group-hover:bg-slate-800 group-hover:text-white transition-colors"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${migrating ? 'animate-spin' : ''}`} />
                  {migrating ? 'Memproses...' : 'Jalankan Migrasi'}
                </Button>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors group">
                <h3 className="text-sm font-semibold text-slate-800">Sinkronisasi GA4</h3>
                <p className="text-xs text-slate-500 mb-4 mt-1 line-clamp-2">
                  Tarik data analitik terbaru dari Google Analytics.
                </p>
                <Button variant="outline" className="w-full bg-white group-hover:bg-primary group-hover:text-white transition-colors" disabled>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Segera Hadir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">Sistem & Notifikasi</CardTitle>
            <CardDescription>Status layanan pihak ketiga</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-medium text-slate-700">Database Supabase</span>
                </div>
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md font-medium">Connected</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-medium text-slate-700">Google Sheets API</span>
                </div>
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md font-medium">Connected</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  <span className="text-sm font-medium text-slate-700">Meta Ads Integration</span>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md font-medium">Inactive</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
