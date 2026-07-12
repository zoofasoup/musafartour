import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Campaign } from '../marketing-types';
import { MaterialsList } from '../components/MaterialsList';
import { Search, Loader2, Menu, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const PublicMarketingKit = () => {
  const [data, setData] = useState<Campaign[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch published packages
        const { data: packages, error: packagesError } = await supabase
          .from('packages')
          .select('id, package_name, departure_date, banner_image, catalog_link, itinerary_link')
          .eq('status', 'published')
          .order('departure_date', { ascending: true });
          
        if (packagesError) throw packagesError;

        // Fetch active marketing materials
        const { data: materials, error: materialsError } = await supabase
          .from('marketing_materials')
          .select('*')
          .eq('is_active', true);

        if (materialsError) throw materialsError;

        let finalData: Campaign[] = [];

        // Helper function to format date (e.g., "15 Agu 2025")
        const formatDate = (dateStr: string) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
          return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
        };

        // Group materials by package
        packages?.forEach((pkg) => {
          const dateStr = pkg.departure_date ? formatDate(pkg.departure_date) : undefined;
          const campaign: Campaign = {
            id: pkg.id,
            name: pkg.package_name,
            date: dateStr,
            items: [],
            itineraryDays: []
          };

          const pkgMaterials = materials?.filter(m => m.package_id === pkg.id) || [];
          
          // Add native package materials
          if (pkg.banner_image) {
            campaign.items.push({ id: `${pkg.id}-banner`, name: 'Flyer Paket', url: pkg.banner_image, content: '', folder: 'type:flyer' });
          }
          if (pkg.catalog_link) {
            campaign.items.push({ id: `${pkg.id}-catalog`, name: 'Katalog Paket', url: pkg.catalog_link, content: '', folder: 'type:katalog' });
          }
          if (pkg.itinerary_link) {
            campaign.items.push({ id: `${pkg.id}-itinerary`, name: 'Itinerary Perjalanan', url: pkg.itinerary_link, content: '', folder: 'type:katalog' });
          }

          pkgMaterials.forEach((material, index) => {
            // Map Supabase 'category' to 'type' used in MaterialsList
            let mappedType: 'flyer' | 'katalog' | 'copy' | 'foto' | 'pricelist' | 'unknown' = 'unknown';
            const cat = material.category.toLowerCase();
            if (cat.includes('visual') || cat.includes('flyer')) mappedType = 'flyer';
            else if (cat.includes('katalog') || cat.includes('document')) mappedType = 'katalog';
            else if (cat.includes('copy')) mappedType = 'copy';
            else if (cat.includes('video')) mappedType = 'foto'; // Using foto for generic media
            
            campaign.items.push({
              id: material.id,
              name: material.title,
              url: mappedType !== 'copy' ? material.file_url : '#',
              content: mappedType === 'copy' ? (material.description || '') : '',
              folder: `type:${mappedType}`,
            });
          });

          // Only add packages that have at least one material
          if (campaign.items.length > 0) {
            finalData.push(campaign);
          }
        });

        // Handle generic/global materials (package_id is null)
        const globalMaterials = materials?.filter(m => !m.package_id) || [];
        if (globalMaterials.length > 0) {
          const globalCampaign: Campaign = {
            id: 'general',
            name: 'Materi General',
            items: [],
          };
          
          globalMaterials.forEach((material) => {
            let mappedType: 'flyer' | 'katalog' | 'copy' | 'foto' | 'pricelist' | 'unknown' = 'unknown';
            const cat = material.category.toLowerCase();
            if (cat.includes('visual') || cat.includes('flyer')) mappedType = 'flyer';
            else if (cat.includes('katalog') || cat.includes('document')) mappedType = 'katalog';
            else if (cat.includes('copy')) mappedType = 'copy';
            else if (cat.includes('video')) mappedType = 'foto';
            
            globalCampaign.items.push({
              id: material.id,
              name: material.title,
              url: mappedType !== 'copy' ? material.file_url : '#',
              content: mappedType === 'copy' ? (material.description || '') : '',
              folder: `type:${mappedType}`,
            });
          });
          
          finalData.unshift(globalCampaign); // Add to beginning
        }

        setData(finalData);

        // Only set active campaign if it hasn't been set yet
        setActiveCampaignId(prev => prev || (finalData.length > 0 ? finalData[0].id : ''));
      } catch (err: any) {
        setError(err.message || 'Failed to load marketing materials');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Scroll to top when switching packages
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeCampaignId]);

  const activeCampaign = data.find(c => c.id === activeCampaignId) || data[0];

  const sidebarContent = (
    <>
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Kategori & Paket</h2>
      
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-red-500" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
          {error}
        </div>
      ) : data.length === 0 ? (
        <div className="p-4 text-gray-500 text-sm text-center">
          Belum ada materi promosi yang tersedia.
        </div>
      ) : (
        <nav className="space-y-1.5">
          {data.map((campaign) => (
            <button
              key={campaign.id}
              onClick={() => {
                setActiveCampaignId(campaign.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 text-sm flex items-start gap-3 ${
                activeCampaignId === campaign.id
                  ? 'bg-red-50 text-red-700 shadow-sm border border-red-100/50'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
              }`}
            >
              <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${activeCampaignId === campaign.id ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-gray-300'}`}></span>
              <div className="flex flex-col">
                <span className="font-semibold">{campaign.name}</span>
                {campaign.date && (
                  <span className={`text-xs mt-0.5 ${activeCampaignId === campaign.id ? 'text-red-600/80 font-medium' : 'text-gray-400'}`}>
                    {campaign.date}
                  </span>
                )}
              </div>
            </button>
          ))}
        </nav>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-red-600 via-red-500 to-yellow-500 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1 font-sans">Musafar Tour Marketing Hub</h1>
                <p className="text-red-50 text-sm font-medium">Pusat Materi Promosi & Brosur</p>
              </div>
              <div className="md:hidden ml-4">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <button className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition focus:outline-none">
                      <Menu size={24} />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[300px] sm:w-[350px] p-4 bg-gray-50 border-l-0">
                    <SheetHeader className="mb-4 text-left">
                      <SheetTitle>Pilih Paket</SheetTitle>
                    </SheetHeader>
                    {sidebarContent}
                  </SheetContent>
                </Sheet>
              </div>
            </div>
            
            <div className="hidden md:block w-full md:w-80 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Cari file, paket, atau materi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white focus:text-gray-900 focus:placeholder:text-gray-400 transition-all rounded-full h-10 shadow-inner"
              />
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-grow max-w-7xl mx-auto px-6 md:px-8 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">
        
        {/* SIDEBAR NAVIGATION - DESKTOP ONLY */}
        <aside className="hidden md:block w-72 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sticky top-32 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
            {sidebarContent}
          </div>
        </aside>

        {/* CONTENT AREA */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
              <div className="space-y-12 animate-pulse">
                {/* Header Skeleton */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0"></div>
                  <div className="h-8 bg-gray-200 rounded-md w-1/3"></div>
                </div>
                
                {/* Side-by-side Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  <div className="space-y-6">
                    <div className="h-[400px] bg-gray-200 rounded-xl w-full"></div>
                  </div>
                  <div className="space-y-6 flex flex-col justify-center">
                    <div className="h-[180px] bg-gray-200 rounded-xl w-full"></div>
                    <div className="h-[180px] bg-gray-200 rounded-xl w-full"></div>
                  </div>
                </div>
                
                {/* Gallery Skeleton */}
                <div className="pt-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0"></div>
                    <div className="h-8 bg-gray-200 rounded-md w-1/4"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="h-48 bg-gray-200 rounded-xl w-full"></div>
                    <div className="h-48 bg-gray-200 rounded-xl w-full hidden sm:block"></div>
                    <div className="h-48 bg-gray-200 rounded-xl w-full hidden lg:block"></div>
                  </div>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-8 rounded-xl border border-red-100 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold mb-2">Terjadi Kesalahan</h2>
              <p>{error}</p>
            </div>
          ) : activeCampaign ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 overflow-hidden min-h-[500px]">
              <MaterialsList campaign={activeCampaign} searchQuery={searchQuery} />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center text-gray-500">
              <p>Pilih paket di sebelah kiri untuk melihat materi promosi.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PublicMarketingKit;
