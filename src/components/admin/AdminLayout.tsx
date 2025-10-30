import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  LogOut, LayoutDashboard, Home, Image, Target, MessageSquare, 
  Images, Package, Plane, Hotel, Calendar, FileText, HelpCircle,
  Settings, Users
} from "lucide-react";
import { useEffect } from "react";
import musafarLogo from "@/assets/musafar-logo-dark.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

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

  const menuSections = [
    {
      items: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
      ]
    },
    {
      label: "CONTENT MANAGEMENT",
      items: [
        { icon: Image, label: "Hero Section", path: "/admin/hero" },
        { icon: Target, label: "Selling Points", path: "/admin/selling-points" },
        { icon: MessageSquare, label: "Testimonials", path: "/admin/testimonials" },
        { icon: Images, label: "Gallery", path: "/admin/gallery" },
      ]
    },
    {
      label: "PRODUCTS & SERVICES",
      items: [
        { icon: Package, label: "Paket Umroh", path: "/admin/packages" },
        { icon: Plane, label: "Paket Haji", path: "/admin/haji" },
        { icon: Hotel, label: "Hotel", path: "/admin/hotels" },
        { icon: Plane, label: "Wisata Halal", path: "/admin/wisata-halal" },
        { icon: Calendar, label: "Jadwal Keberangkatan", path: "/admin/jadwal" },
      ]
    },
    {
      label: "CONTENT & BLOG",
      items: [
        { icon: FileText, label: "Artikel", path: "/admin/articles" },
        { icon: HelpCircle, label: "FAQ", path: "/admin/faq" },
      ]
    },
    {
      label: "SETTINGS",
      items: [
        { icon: Settings, label: "Website Settings", path: "/admin/settings" },
        { icon: Users, label: "Team", path: "/admin/team" },
      ]
    }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <SidebarProvider>
      <SidebarLayout menuSections={menuSections} isActive={isActive} user={user} navigate={navigate} handleSignOut={handleSignOut} />
    </SidebarProvider>
  );
};

const SidebarLayout = ({ menuSections, isActive, user, navigate, handleSignOut }: any) => {
  const { open } = useSidebar();

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="border-b">
          {open && (
            <div className="flex items-center gap-2 px-2 py-4">
              <img src={musafarLogo} alt="Musafar Tour" className="h-8" />
            </div>
          )}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate("/")}
                tooltip="Back to Website"
                className="hover:bg-accent"
              >
                <Home className="h-4 w-4" />
                <span>Back to Website</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

          <SidebarContent>
            {menuSections.map((section, idx) => (
              <SidebarGroup key={idx}>
                {section.label && (
                  <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                    {section.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            asChild
                            onClick={() => navigate(item.path)}
                            className={`transition-colors ${
                              active
                                ? "bg-red-600 text-white hover:bg-red-700 hover:text-white"
                                : "hover:bg-accent"
                            }`}
                            tooltip={item.label}
                          >
                            <button className="w-full">
                              <Icon className={`h-4 w-4 ${active ? "text-white" : ""}`} />
                              <span className={active ? "font-semibold text-white" : ""}>
                                {item.label}
                              </span>
                            </button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t">
            {open && (
              <div className="px-2 py-2">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
            )}
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleSignOut}
                  tooltip="Sign Out"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <div className="border-b bg-background sticky top-0 z-10">
            <div className="container mx-auto px-8 py-4 flex items-center">
              <SidebarTrigger />
            </div>
          </div>
          <div className="container mx-auto p-8">
            <Outlet />
          </div>
        </main>
      </div>
    );
  };

export default AdminLayout;
