import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Package, Plane, FileText, Home } from "lucide-react";
import { useEffect } from "react";
import musafarLogo from "@/assets/musafar-logo.svg";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, isAdmin, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

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
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Anda tidak memiliki akses admin</p>
          <Button onClick={() => navigate("/")}>Kembali ke Home</Button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Package, label: "Paket Umroh", path: "/admin/packages" },
    { icon: Plane, label: "Wisata Halal", path: "/admin/wisata" },
    { icon: FileText, label: "Artikel", path: "/admin/articles" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-6">
            <img src={musafarLogo} alt="Musafar Tour" className="h-8" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            <Link to="/">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 mb-4"
              >
                <Home className="h-5 w-5" />
                Back to Website
              </Button>
            </Link>

            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="border-t p-4">
            <div className="mb-2 px-2">
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64">
        <div className="container mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
