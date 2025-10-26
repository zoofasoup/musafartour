import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import JadwalUmroh from "./pages/JadwalUmroh";
import PaketUmroh from "./pages/PaketUmroh";
import PackageDetail from "./pages/PackageDetail";
import HajiKhusus from "./pages/HajiKhusus";
import WisataHalal from "./pages/WisataHalal";
import TentangKami from "./pages/TentangKami";
import Galeri from "./pages/Galeri";
import Artikel from "./pages/Artikel";
import Kontak from "./pages/Kontak";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import AdminSetup from "./pages/AdminSetup";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import Packages from "./pages/admin/Packages";
import PackageForm from "./pages/admin/PackageForm";
import WisataHalalPage from "./pages/admin/WisataHalal";
import WisataHalalForm from "./pages/admin/WisataHalalForm";
import ArticlesPage from "./pages/admin/Articles";
import ArticleForm from "./pages/admin/ArticleForm";
import Hotels from "./pages/admin/Hotels";
import HotelForm from "./pages/admin/HotelForm";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/jadwal-umroh" element={<JadwalUmroh />} />
          <Route path="/paket-umroh" element={<PaketUmroh />} />
          <Route path="/paket-umroh/:id" element={<PackageDetail />} />
          <Route path="/haji-khusus" element={<HajiKhusus />} />
          <Route path="/wisata-halal" element={<WisataHalal />} />
          <Route path="/tentang-kami" element={<TentangKami />} />
          <Route path="/galeri" element={<Galeri />} />
          <Route path="/artikel" element={<Artikel />} />
          <Route path="/kontak" element={<Kontak />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin/setup" element={<AdminSetup />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="packages" element={<Packages />} />
            <Route path="packages/new" element={<PackageForm />} />
            <Route path="packages/:id" element={<PackageForm />} />
            <Route path="hotels" element={<Hotels />} />
            <Route path="hotels/new" element={<HotelForm />} />
            <Route path="hotels/:id" element={<HotelForm />} />
            <Route path="wisata-halal" element={<WisataHalalPage />} />
            <Route path="wisata-halal/new" element={<WisataHalalForm />} />
            <Route path="wisata-halal/:id" element={<WisataHalalForm />} />
            <Route path="articles" element={<ArticlesPage />} />
            <Route path="articles/new" element={<ArticleForm />} />
            <Route path="articles/:id" element={<ArticleForm />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
