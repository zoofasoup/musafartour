import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, FileText, Plane, BarChart } from "lucide-react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();

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
      title: "Total Views",
      value: "0",
      icon: BarChart,
      description: "Bulan ini",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Selamat datang di Admin Portal Musafar Tour</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Akses cepat ke fitur utama</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Gunakan menu sidebar untuk mengelola paket umroh, wisata halal, dan artikel.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Aktivitas terbaru</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Belum ada aktivitas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
