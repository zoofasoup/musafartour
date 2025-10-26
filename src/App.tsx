import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import JadwalUmroh from "./pages/JadwalUmroh";
import PaketUmroh from "./pages/PaketUmroh";
import HajiKhusus from "./pages/HajiKhusus";
import WisataHalal from "./pages/WisataHalal";
import TentangKami from "./pages/TentangKami";
import Galeri from "./pages/Galeri";
import Artikel from "./pages/Artikel";
import Kontak from "./pages/Kontak";
import NotFound from "./pages/NotFound";

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
          <Route path="/haji-khusus" element={<HajiKhusus />} />
          <Route path="/wisata-halal" element={<WisataHalal />} />
          <Route path="/tentang-kami" element={<TentangKami />} />
          <Route path="/galeri" element={<Galeri />} />
          <Route path="/artikel" element={<Artikel />} />
          <Route path="/kontak" element={<Kontak />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
