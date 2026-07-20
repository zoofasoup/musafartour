// Cache bust commit 2026-07-19: force rebuild, CSS asset was missing from production
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import FloatingWhatsApp from "./components/FloatingWhatsApp";
import { useMarketingPixels } from "./hooks/useMarketingPixels";
import { useRedirects } from "./hooks/useRedirects";
import { ErrorBoundary, CHUNK_RELOAD_FLAG } from "./components/ErrorBoundary";
import { FavoritesProvider } from "./hooks/useFavorites";
import { AgentAuthProvider } from "./hooks/useAgentAuth";
import ScrollToTop from "./components/ScrollToTop";

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
const SetPassword = lazy(() => import("./pages/SetPassword"));
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
const AdSpend = lazy(() => import("./pages/admin/AdSpend"));
const SEO = lazy(() => import("./pages/admin/SEO"));
const Profile = lazy(() => import("./pages/admin/Profile"));
const Chat = lazy(() => import("./pages/Chat"));
const ChatRotation = lazy(() => import("./pages/admin/ChatRotation"));
const URLShortener = lazy(() => import("./pages/admin/URLShortener"));
const ShortLinkRedirect = lazy(() => import("./pages/ShortLinkRedirect"));
const AgentShortLinkRedirect = lazy(() => import("./pages/AgentShortLinkRedirect"));
const BoothLead = lazy(() => import("./pages/BoothLead"));
const UmrohCalculator = lazy(() => import("./pages/UmrohCalculator"));
const UmrohCalculatorResult = lazy(() => import("./pages/UmrohCalculatorResult"));
const PublicMarketingKit = lazy(() => import("./pages/PublicMarketingKit"));

// Agent Portal
const AgentLogin = lazy(() => import("./pages/agent/AgentLogin"));
const AgentRegister = lazy(() => import("./pages/agent/AgentRegister"));
const AgentOnboarding = lazy(() => import("./pages/agent/AgentOnboarding"));
const AgentDashboard = lazy(() => import("./pages/agent/AgentDashboard"));
const AgentPackages = lazy(() => import("./pages/agent/AgentPackages"));
const AgentPackageDetail = lazy(() => import("./pages/agent/AgentPackageDetail"));
const AgentCommission = lazy(() => import("./pages/agent/AgentCommission"));
const AgentSchedule = lazy(() => import("./pages/agent/AgentSchedule"));
const AgentMarketingKit = lazy(() => import("./pages/agent/AgentMarketingKit"));
const AgentProfile = lazy(() => import("./pages/agent/AgentProfile"));
const AgentLeaderboard = lazy(() => import("./pages/agent/AgentLeaderboard"));
const AgentSalesGuide = lazy(() => import("./pages/agent/AgentSalesGuide"));
const SalesCalculator = lazy(() => import("./pages/admin/SalesCalculator"));
const PackageBrochure = lazy(() => import("./pages/admin/PackageBrochure"));
const AgentProtectedRoute = lazy(() => import("./components/agent/AgentProtectedRoute"));
const AgentManagement = lazy(() => import("./pages/admin/AgentManagement"));
const Gamification = lazy(() => import("./pages/admin/Gamification"));
const PackageItems = lazy(() => import("./pages/admin/PackageItems"));
const Equipment = lazy(() => import("./pages/admin/Equipment"));
const CalculatorLeads = lazy(() => import("./pages/admin/CalculatorLeads"));
const WhatsAppInbox = lazy(() => import("./pages/admin/WhatsAppInbox"));

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

// Radix Dialog/Sheet/Select sometimes fail to release the `pointer-events:
// none` they lock onto <body> while open - most reliably reproduced by
// picking an option from a <Select> nested inside a <Sheet> - leaving the
// entire page (including things like the floating WhatsApp button)
// unclickable after closing. A MutationObserver reacting to the exact
// moment the lock is cleared isn't reliable here (the bug is Radix's
// nested-portal lock bookkeeping getting out of sync, not a timing issue
// we can catch by watching for one specific mutation), so this polls
// instead: if the lock is present but nothing is actually open anymore,
// clear it.
const BodyPointerEventsGuard = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.body.style.pointerEvents !== "none") return;
      const anythingOpen = document.querySelector(
        '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"], [data-state="open"][role="listbox"], [data-state="open"][role="menu"]'
      );
      if (!anythingOpen) {
        document.body.style.pointerEvents = "";
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return null;
};

// Clears the chunk-reload guard once the app has actually rendered
// successfully, so a future deploy's stale-chunk error can still trigger
// the one-time auto-reload in ErrorBoundary instead of being permanently
// blocked for the rest of this tab's session.
const ChunkReloadFlagCleaner = () => {
  useEffect(() => {
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
  }, []);
  return null;
};

// Auth Hash Redirect Handler (for invites/recoveries)
const AuthHashRedirectHandler = () => {
  const location = useLocation();
  
  useEffect(() => {
    // If there's an invite or recovery token and we're at the root, redirect to /auth
    if (location.pathname === '/' && window.location.hash.includes('access_token=')) {
      if (window.location.hash.includes('type=invite') || window.location.hash.includes('type=recovery')) {
        window.location.href = '/auth' + window.location.hash;
      }
    }
  }, [location]);

  return null;
};

// Conditional FloatingWhatsApp (hide on admin/agent pages)
const ConditionalFloatingWhatsApp = () => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  const isAgentPage = location.pathname.startsWith('/agent');
  const isBoothPage = location.pathname === '/booth';
  const isCalcPage = location.pathname.startsWith('/kalkulator');
  const isPackageDetailPage = location.pathname.startsWith('/paket-umroh/');

  if (isAdminPage || isAgentPage || isBoothPage || isCalcPage || isPackageDetailPage) {
    return null;
  }
  
  return <FloatingWhatsApp />;
};

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <FavoritesProvider>
          <AgentAuthProvider>
            <TooltipProvider>
              <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <ScrollToTop />
              <BodyPointerEventsGuard />
              <ConditionalFloatingWhatsApp />
              <TikTokPixelTracker />
              <MarketingPixelsLoader />
              <RedirectsHandler />
              <AuthHashRedirectHandler />
              <ChunkReloadFlagCleaner />
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
                  <Route path="/s/:code" element={<ShortLinkRedirect />} />
                  <Route path="/l/:code" element={<AgentShortLinkRedirect />} />
                  <Route path="/booth" element={<BoothLead />} />
                  <Route path="/kalkulator" element={<UmrohCalculator />} />
                  <Route path="/kalkulator/hasil/:id" element={<UmrohCalculatorResult />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/admin/setup" element={<AdminSetup />} />
                  <Route path="/set-password" element={<SetPassword />} />
                  <Route path="/packages" element={<PublicMarketingKit />} />
                  
                  {/* Agent Portal Routes */}
                  <Route path="/agent" element={
                    <AgentProtectedRoute>
                      <Navigate to="/agent/dashboard" replace />
                    </AgentProtectedRoute>
                  } />
                  <Route path="/agent/login" element={<AgentLogin />} />
                  <Route path="/agent/register" element={<AgentRegister />} />
                  <Route
                    path="/agent/onboarding"
                    element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                        <AgentProtectedRoute>
                          <AgentOnboarding />
                        </AgentProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/agent/dashboard"
                    element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                        <AgentProtectedRoute>
                          <AgentDashboard />
                        </AgentProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/agent/packages"
                    element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                        <AgentProtectedRoute>
                          <AgentPackages />
                        </AgentProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/agent/packages/:id"
                    element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                        <AgentProtectedRoute>
                          <AgentPackageDetail />
                        </AgentProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/agent/commission"
                    element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                        <AgentProtectedRoute>
                          <AgentCommission />
                        </AgentProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/agent/schedule"
                    element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                        <AgentProtectedRoute>
                          <AgentSchedule />
                        </AgentProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/agent/marketing-kit"
                    element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                        <AgentProtectedRoute>
                          <AgentMarketingKit />
                        </AgentProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/agent/leaderboard"
                    element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                        <AgentProtectedRoute>
                          <AgentLeaderboard />
                        </AgentProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/agent/guide"
                    element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                        <AgentProtectedRoute>
                          <AgentSalesGuide />
                        </AgentProtectedRoute>
                      </Suspense>
                    }
                  />

                  <Route
                    path="/agent/profile"
                    element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                        <AgentProtectedRoute>
                          <AgentProfile />
                        </AgentProtectedRoute>
                      </Suspense>
                    }
                  />
                  
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
                    <Route path="package-items" element={<PackageItems />} />
                    <Route path="equipment" element={<Equipment />} />

                    {/* Content & Blog */}
                    <Route path="articles" element={<ArticlesPage />} />
                    <Route path="articles/new" element={<ArticleForm />} />
                    <Route path="articles/:id" element={<ArticleForm />} />
                    <Route path="faq" element={<FAQAdmin />} />

                    {/* Settings */}
                    <Route path="settings" element={<WebsiteSettings />} />
                    <Route path="settings/marketing" element={<MarketingSettings />} />
                    <Route path="ad-spend" element={<AdSpend />} />

                    <Route path="seo" element={<SEO />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="team" element={<Team />} />
                    <Route path="chat-rotation" element={<ChatRotation />} />
                    <Route path="url-shortener" element={<URLShortener />} />
                    <Route path="agents" element={<AgentManagement />} />
                    <Route path="gamification" element={<Gamification />} />
                    <Route path="calculator" element={<SalesCalculator />} />
                    <Route path="calculator-leads" element={<CalculatorLeads />} />
                    <Route path="whatsapp-inbox" element={<WhatsAppInbox />} />
                    <Route path="brochure/:slug" element={<PackageBrochure />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AgentAuthProvider>
      </FavoritesProvider>
    </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;