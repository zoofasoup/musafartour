import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import FloatingWhatsApp from "./components/FloatingWhatsApp";
import { useMarketingPixels } from "./hooks/useMarketingPixels";
import { useRedirects } from "./hooks/useRedirects";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FavoritesProvider } from "./hooks/useFavorites";
// Declare TikTok Pixel type
declare global {
  interface Window {
    ttq: any;
  }
}

// Eager load homepage and admin layout (layout must not be lazy to persist across navigation)
import Index from "./pages/Index";
import AdminLayout from "./components/admin/AdminLayout";

// Lazy load all other routes
const PaketUmroh = lazy(() => import("./pages/PaketUmroh"));
const PackageDetail = lazy(() => import("./pages/PackageDetail"));
const TentangKami = lazy(() => import("./pages/TentangKami"));
const Galeri = lazy(() => import("./pages/Galeri"));
const Artikel = lazy(() => import("./pages/Artikel"));
const ArtikelDetail = lazy(() => import("./pages/ArtikelDetail"));
const Kontak = lazy(() => import("./pages/Kontak"));
const JadwalUmroh = lazy(() => import("./pages/JadwalUmroh"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const AdminSetup = lazy(() => import("./pages/AdminSetup"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const Packages = lazy(() => import("./pages/admin/Packages"));
const PackageForm = lazy(() => import("./pages/admin/PackageForm"));
const ArticlesPage = lazy(() => import("./pages/admin/Articles"));
const ArticleForm = lazy(() => import("./pages/admin/ArticleForm"));
const Hotels = lazy(() => import("./pages/admin/Hotels"));
const HotelForm = lazy(() => import("./pages/admin/HotelForm"));
const HeroSection = lazy(() => import("./pages/admin/HeroSection"));
const SellingPoints = lazy(() => import("./pages/admin/SellingPoints"));
const Testimonials = lazy(() => import("./pages/admin/Testimonials"));
const GalleryManagement = lazy(() => import("./pages/admin/GalleryManagement"));
const JadwalKeberangkatan = lazy(() => import("./pages/admin/JadwalKeberangkatan"));
const FAQAdmin = lazy(() => import("./pages/admin/FAQ"));
const WebsiteSettings = lazy(() => import("./pages/admin/WebsiteSettings"));
const Team = lazy(() => import("./pages/admin/Team"));
const MarketingSettings = lazy(() => import("./pages/admin/MarketingSettings"));
const SEO = lazy(() => import("./pages/admin/SEO"));
const Profile = lazy(() => import("./pages/admin/Profile"));
const Chat = lazy(() => import("./pages/Chat"));
const ChatRotation = lazy(() => import("./pages/admin/ChatRotation"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// TikTok Pixel Route Tracker
const TikTokPixelTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (window.ttq) {
      window.ttq.page();
    }
  }, [location]);

  return null;
};

// Marketing Pixels Loader
const MarketingPixelsLoader = () => {
  useMarketingPixels();
  return null;
};

// Redirects Handler
const RedirectsHandler = () => {
  useRedirects();
  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <FavoritesProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <FloatingWhatsApp />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <TikTokPixelTracker />
            <MarketingPixelsLoader />
            <RedirectsHandler />
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/paket-umroh" element={<PaketUmroh />} />
                <Route path="/paket-umroh/:id" element={<PackageDetail />} />
                <Route path="/tentang-kami" element={<TentangKami />} />
                <Route path="/galeri" element={<Galeri />} />
                <Route path="/artikel" element={<Artikel />} />
                <Route path="/artikel/:slug" element={<ArtikelDetail />} />
                <Route path="/kontak" element={<Kontak />} />
                <Route path="/jadwal-umroh" element={<JadwalUmroh />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin/setup" element={<AdminSetup />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />

                  {/* Content Management */}
                  <Route path="hero" element={<HeroSection />} />
                  <Route path="selling-points" element={<SellingPoints />} />
                  <Route path="testimonials" element={<Testimonials />} />
                  <Route path="gallery" element={<GalleryManagement />} />

                  {/* Products & Services */}
                  <Route path="packages" element={<Packages />} />
                  <Route path="packages/new" element={<PackageForm />} />
                  <Route path="packages/:id" element={<PackageForm />} />
                  <Route path="hotels" element={<Hotels />} />
                  <Route path="hotels/new" element={<HotelForm />} />
                  <Route path="hotels/:id" element={<HotelForm />} />
                  <Route path="jadwal" element={<JadwalKeberangkatan />} />

                  {/* Content & Blog */}
                  <Route path="articles" element={<ArticlesPage />} />
                  <Route path="articles/new" element={<ArticleForm />} />
                  <Route path="articles/:id" element={<ArticleForm />} />
                  <Route path="faq" element={<FAQAdmin />} />

                  {/* Settings */}
                  <Route path="settings" element={<WebsiteSettings />} />
                  <Route path="settings/marketing" element={<MarketingSettings />} />
                  <Route path="seo" element={<SEO />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="team" element={<Team />} />
                  <Route path="chat-rotation" element={<ChatRotation />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </FavoritesProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;