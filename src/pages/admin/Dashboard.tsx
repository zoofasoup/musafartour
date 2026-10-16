import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminPage, AdminPanel } from "@/components/admin/AdminPage";
import { StatCard } from "@/components/admin/jamaah/StatCard";
import { AgentEmpty } from "@/components/agent/AgentPage";
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

  return (
    <AdminPage title="Dasbor" intro="Yang perlu ditangani hari ini dan ringkasan situs">
      {/* Work queues: what needs a person today, each card opens the page where it is done */}
      <AdminPanel title="Perlu ditangani">
        <WorkQueueCards />
      </AdminPanel>

      {/* Insights derived from real upcoming-departure data - only renders when there's something real to flag */}
      {insights.length > 0 && (
        <AdminPanel title="Perhatian">
          <ul className="divide-y divide-pkg-hair">
            {insights.map((insight) => {
              const Icon = insight.icon;
              return (
                <li key={insight.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pkg-cream-2 text-pkg-red-deep"><Icon className="h-5 w-5" aria-hidden /></span>
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-medium text-pkg-fg">{insight.title}</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-pkg-fg-3">{insight.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </AdminPanel>
      )}

      <AdminPanel title="Ringkasan">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} label={stat.title} value={String(stat.value)} hint={stat.description} />
          ))}
        </div>
      </AdminPanel>

      <AdminPanel
        title="Keberangkatan terdekat"
        description="Sisa seat langsung"
        action={<Button variant="ghost" size="sm" onClick={() => navigate("/admin/jadwal")} className="shrink-0 gap-1">Semua <ArrowRight className="h-4 w-4" aria-hidden /></Button>}
      >
        {upcomingPackages?.length === 0 ? (
          <AgentEmpty icon={Calendar} text="Belum ada jadwal aktif" />
        ) : (
          <ul className="divide-y divide-pkg-hair">
            {upcomingPackages?.map((pkg) => {
              const slotsTotal = pkg.slots_total || 45;
              // Offline (sheet) + online bookings both consume seats.
              const slotsFilled = getSlotsTaken(pkg);
              const pct = Math.round((slotsFilled / slotsTotal) * 100);
              const sisaSeat = Math.max(0, slotsTotal - slotsFilled);
              return (
                <li key={pkg.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="min-w-0 truncate text-[17px] text-pkg-fg">{pkg.package_name}</h4>
                    <span className="shrink-0 text-[15px] font-medium text-pkg-fg">{pct}%</span>
                  </div>
                  <p className="mt-0.5 text-[14px] text-pkg-fg-3">{format(new Date(pkg.departure_date), "d MMM yyyy", { locale: idLocale })} · sisa {sisaSeat} dari {slotsTotal} seat</p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-pkg-cream-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Terisi ${pct}%`}>
                    <div className="h-full rounded-full bg-pkg-ink" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminPanel>

      <AdminPanel
        last
        title="Leaderboard agen"
        description="Top 3 berdasarkan total penjualan"
        action={<Button variant="ghost" size="sm" onClick={() => navigate("/admin/gamification")} className="shrink-0 gap-1">Semua <ArrowRight className="h-4 w-4" aria-hidden /></Button>}
      >
        {!topAgents || topAgents.length === 0 ? (
          <AgentEmpty icon={Users} text="Belum ada agen aktif" />
        ) : (
          <ul className="divide-y divide-pkg-hair">
            {topAgents.map((agent, i) => (
              <li key={agent.id} className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pkg-cream-2 text-[14px] font-medium text-pkg-fg">{i + 1}</span>
                  <div className="min-w-0">
                    <h4 className="truncate text-[16px] text-pkg-fg">{agent.name}</h4>
                    <p className="text-[13px] text-pkg-fg-3">{agent.total_sales} closing</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[16px] font-medium text-pkg-fg">Rp {(agent.total_commission || 0).toLocaleString("id-ID")}</div>
                  <div className="text-[12px] text-pkg-fg-3">Komisi</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </AdminPage>
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
