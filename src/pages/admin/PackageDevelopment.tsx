import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Calculator, Save, Copy, Download, Plus, Trash2, 
  ChevronDown, ChevronUp, Info, Plane, Hotel, Users,
  Calendar, DollarSign, Target, TrendingUp, FileText,
  Percent, AlertCircle, CheckCircle2, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Types
interface PackageConfig {
  id: string;
  name: string;
  departureDate: Date | undefined;
  nightsMadinah: number;
  nightsMakkah: number;
  hotelMadinah: string;
  hotelMadinahStar: number;
  hotelMakkah: string;
  hotelMakkahStar: number;
  airline: string;
  groupSize: number;
  costs: CostInputs;
  competitorPrice: number;
  createdAt: Date;
}

interface CostInputs {
  hotelMadinahPerNight: number;
  hotelMakkahPerNight: number;
  flightTicket: number;
  busSaudi: number;
  visa: number;
  mutawif: number;
  snack: number;
  zamHandling: number;
  kbih: number;
  perlengkapan: number;
  manasik: number;
  tourLeaderTotal: number;
}

// Constants
const HOTELS_MADINAH = [
  { name: "Dar Al Taqwa", star: 5 },
  { name: "Shaza Al Madina", star: 5 },
  { name: "Pullman Zamzam", star: 5 },
  { name: "Frontel Al Harithia", star: 4 },
  { name: "Al Eiman Taibah", star: 4 },
  { name: "Dallah Taibah", star: 4 },
  { name: "Al Haram", star: 3 },
  { name: "Rawda Al Madinah", star: 3 },
];

const HOTELS_MAKKAH = [
  { name: "Swissotel Makkah", star: 5 },
  { name: "Hilton Suites Makkah", star: 5 },
  { name: "Pullman Zamzam Makkah", star: 5 },
  { name: "Elaf Ajyad", star: 4 },
  { name: "Millennium Makkah", star: 4 },
  { name: "Al Marwa Rayhaan", star: 4 },
  { name: "Dar Al Ghufran", star: 3 },
  { name: "Al Safwah Tower", star: 3 },
];

const AIRLINES = [
  "Garuda Indonesia",
  "Saudi Arabian Airlines",
  "Emirates",
  "Qatar Airways",
  "Etihad Airways",
  "Lion Air",
  "Batik Air",
  "Oman Air",
];

const COST_COMPONENTS: { key: keyof CostInputs; label: string; tooltip: string; isTotal?: boolean }[] = [
  { key: "hotelMadinahPerNight", label: "Hotel Madinah (per malam)", tooltip: "Biaya hotel di Madinah per orang per malam" },
  { key: "hotelMakkahPerNight", label: "Hotel Makkah (per malam)", tooltip: "Biaya hotel di Makkah per orang per malam" },
  { key: "flightTicket", label: "Tiket Pesawat", tooltip: "Biaya tiket pesawat PP per orang" },
  { key: "busSaudi", label: "Bus Saudi", tooltip: "Biaya transportasi bus di Saudi per orang" },
  { key: "visa", label: "Visa Processing", tooltip: "Biaya pembuatan visa umrah per orang" },
  { key: "mutawif", label: "Mutawif/Ziarah", tooltip: "Biaya pemandu ziarah dan mutawif per orang" },
  { key: "snack", label: "Snack Allowance", tooltip: "Uang snack/jajan per orang selama perjalanan" },
  { key: "zamHandling", label: "Zam Handling", tooltip: "Biaya handling zam-zam per orang" },
  { key: "kbih", label: "KBIH Fee", tooltip: "Biaya Kelompok Bimbingan Ibadah Haji per orang" },
  { key: "perlengkapan", label: "Perlengkapan/Kit", tooltip: "Biaya perlengkapan umrah (koper, buku panduan, dll) per orang" },
  { key: "manasik", label: "Manasik Training", tooltip: "Biaya pelatihan manasik umrah per orang" },
  { key: "tourLeaderTotal", label: "Tour Leader (Total)", tooltip: "Total biaya tour leader, akan dibagi jumlah peserta", isTotal: true },
];

const DEFAULT_COSTS: CostInputs = {
  hotelMadinahPerNight: 500000,
  hotelMakkahPerNight: 750000,
  flightTicket: 15000000,
  busSaudi: 1500000,
  visa: 1200000,
  mutawif: 800000,
  snack: 500000,
  zamHandling: 200000,
  kbih: 500000,
  perlengkapan: 750000,
  manasik: 300000,
  tourLeaderTotal: 25000000,
};

const DEFAULT_CONFIG: Omit<PackageConfig, 'id' | 'createdAt'> = {
  name: "",
  departureDate: undefined,
  nightsMadinah: 4,
  nightsMakkah: 5,
  hotelMadinah: "",
  hotelMadinahStar: 4,
  hotelMakkah: "",
  hotelMakkahStar: 4,
  airline: "",
  groupSize: 45,
  costs: DEFAULT_COSTS,
  competitorPrice: 0,
};

// Utility Functions
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('id-ID').format(value);
};

const parseNumber = (value: string): number => {
  return parseInt(value.replace(/\D/g, '')) || 0;
};

const generatePackageName = (config: PackageConfig): string => {
  const date = config.departureDate ? format(config.departureDate, 'MMM yyyy', { locale: id }) : '';
  const duration = config.nightsMadinah + config.nightsMakkah;
  const hotelInfo = config.hotelMadinah && config.hotelMakkah 
    ? `${config.hotelMadinahStar}★ + ${config.hotelMakkahStar}★` 
    : '';
  return `Umrah ${duration} Hari ${hotelInfo} ${date}`.trim();
};

// Storage Functions
const STORAGE_KEY = 'umrah-package-drafts';

const loadDrafts = (): PackageConfig[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const drafts = JSON.parse(saved);
      return drafts.map((d: any) => ({
        ...d,
        departureDate: d.departureDate ? new Date(d.departureDate) : undefined,
        createdAt: new Date(d.createdAt)
      }));
    }
  } catch (e) {
    console.error('Failed to load drafts:', e);
  }
  return [];
};

const saveDrafts = (drafts: PackageConfig[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error('Failed to save drafts:', e);
  }
};

export default function PackageDevelopment() {
  const [drafts, setDrafts] = useState<PackageConfig[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [config, setConfig] = useState<Omit<PackageConfig, 'id' | 'createdAt'>>(DEFAULT_CONFIG);
  const [markupDouble, setMarkupDouble] = useState(25);
  const [markupTriple, setMarkupTriple] = useState(20);
  const [markupQuad, setMarkupQuad] = useState(15);
  const [showAllCosts, setShowAllCosts] = useState(true);

  // Load drafts on mount
  useEffect(() => {
    setDrafts(loadDrafts());
  }, []);

  // Calculate COGS
  const calculations = useMemo(() => {
    const { costs, nightsMadinah, nightsMakkah, groupSize } = config;
    
    const hotelMadinahTotal = costs.hotelMadinahPerNight * nightsMadinah;
    const hotelMakkahTotal = costs.hotelMakkahPerNight * nightsMakkah;
    const tourLeaderPerPerson = groupSize > 0 ? costs.tourLeaderTotal / groupSize : 0;
    
    const cogs = 
      hotelMadinahTotal +
      hotelMakkahTotal +
      costs.flightTicket +
      costs.busSaudi +
      costs.visa +
      costs.mutawif +
      costs.snack +
      costs.zamHandling +
      costs.kbih +
      costs.perlengkapan +
      costs.manasik +
      tourLeaderPerPerson;

    const priceDouble = cogs * (1 + markupDouble / 100);
    const priceTriple = cogs * (1 + markupTriple / 100);
    const priceQuad = cogs * (1 + markupQuad / 100);

    const marginDouble = priceDouble - cogs;
    const marginTriple = priceTriple - cogs;
    const marginQuad = priceQuad - cogs;

    // Breakeven calculation (simplified: fixed costs / margin per person)
    const fixedCosts = costs.tourLeaderTotal;
    const breakeven = marginDouble > 0 ? Math.ceil(fixedCosts / marginDouble) : 0;

    // Cost breakdown
    const breakdown = [
      { label: "Hotel Madinah", amount: hotelMadinahTotal, key: "hotelMadinah" },
      { label: "Hotel Makkah", amount: hotelMakkahTotal, key: "hotelMakkah" },
      { label: "Tiket Pesawat", amount: costs.flightTicket, key: "flight" },
      { label: "Bus Saudi", amount: costs.busSaudi, key: "bus" },
      { label: "Visa", amount: costs.visa, key: "visa" },
      { label: "Mutawif/Ziarah", amount: costs.mutawif, key: "mutawif" },
      { label: "Snack", amount: costs.snack, key: "snack" },
      { label: "Zam Handling", amount: costs.zamHandling, key: "zam" },
      { label: "KBIH", amount: costs.kbih, key: "kbih" },
      { label: "Perlengkapan", amount: costs.perlengkapan, key: "perlengkapan" },
      { label: "Manasik", amount: costs.manasik, key: "manasik" },
      { label: "Tour Leader", amount: tourLeaderPerPerson, key: "tourLeader" },
    ].map(item => ({
      ...item,
      percentage: cogs > 0 ? (item.amount / cogs) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    return {
      cogs,
      priceDouble,
      priceTriple,
      priceQuad,
      marginDouble,
      marginTriple,
      marginQuad,
      breakeven,
      breakdown,
      hotelMadinahTotal,
      hotelMakkahTotal,
      tourLeaderPerPerson
    };
  }, [config, markupDouble, markupTriple, markupQuad]);

  // Competitor comparison
  const competitorDiff = config.competitorPrice > 0 
    ? calculations.priceDouble - config.competitorPrice 
    : 0;

  // Handlers
  const updateCost = (key: keyof CostInputs, value: number) => {
    setConfig(prev => ({
      ...prev,
      costs: { ...prev.costs, [key]: value }
    }));
  };

  const saveDraft = () => {
    const newDraft: PackageConfig = {
      ...config,
      id: currentDraftId || crypto.randomUUID(),
      name: config.name || generatePackageName(config as PackageConfig),
      createdAt: new Date()
    };

    setDrafts(prev => {
      const filtered = prev.filter(d => d.id !== newDraft.id);
      const updated = [newDraft, ...filtered];
      saveDrafts(updated);
      return updated;
    });
    setCurrentDraftId(newDraft.id);
    toast({ title: "Draft tersimpan", description: "Package draft berhasil disimpan" });
  };

  const loadDraft = (draft: PackageConfig) => {
    setConfig({
      name: draft.name,
      departureDate: draft.departureDate,
      nightsMadinah: draft.nightsMadinah,
      nightsMakkah: draft.nightsMakkah,
      hotelMadinah: draft.hotelMadinah,
      hotelMadinahStar: draft.hotelMadinahStar,
      hotelMakkah: draft.hotelMakkah,
      hotelMakkahStar: draft.hotelMakkahStar,
      airline: draft.airline,
      groupSize: draft.groupSize,
      costs: draft.costs,
      competitorPrice: draft.competitorPrice
    });
    setCurrentDraftId(draft.id);
    toast({ title: "Draft dimuat", description: draft.name });
  };

  const deleteDraft = (id: string) => {
    setDrafts(prev => {
      const updated = prev.filter(d => d.id !== id);
      saveDrafts(updated);
      return updated;
    });
    if (currentDraftId === id) {
      setCurrentDraftId(null);
      setConfig(DEFAULT_CONFIG);
    }
    toast({ title: "Draft dihapus" });
  };

  const duplicateDraft = (draft: PackageConfig) => {
    const newDraft: PackageConfig = {
      ...draft,
      id: crypto.randomUUID(),
      name: `${draft.name} (Copy)`,
      createdAt: new Date()
    };
    setDrafts(prev => {
      const updated = [newDraft, ...prev];
      saveDrafts(updated);
      return updated;
    });
    toast({ title: "Draft diduplikasi" });
  };

  const resetForm = () => {
    setConfig(DEFAULT_CONFIG);
    setCurrentDraftId(null);
    setMarkupDouble(25);
    setMarkupTriple(20);
    setMarkupQuad(15);
  };

  const copyAsText = () => {
    const packageName = config.name || generatePackageName(config as PackageConfig);
    const duration = config.nightsMadinah + config.nightsMakkah;
    
    const text = `
═══════════════════════════════════════
${packageName.toUpperCase()}
═══════════════════════════════════════

📅 JADWAL & DURASI
• Keberangkatan: ${config.departureDate ? format(config.departureDate, 'dd MMMM yyyy', { locale: id }) : 'TBD'}
• Durasi: ${duration} Hari (${config.nightsMadinah} malam Madinah, ${config.nightsMakkah} malam Makkah)

🏨 HOTEL
• Madinah: ${config.hotelMadinah || 'TBD'} (${'★'.repeat(config.hotelMadinahStar)})
• Makkah: ${config.hotelMakkah || 'TBD'} (${'★'.repeat(config.hotelMakkahStar)})

✈️ PENERBANGAN
• ${config.airline || 'TBD'}

💰 HARGA PAKET
• Double (2 orang/kamar): ${formatCurrency(calculations.priceDouble)}
• Triple (3 orang/kamar): ${formatCurrency(calculations.priceTriple)}
• Quad (4 orang/kamar): ${formatCurrency(calculations.priceQuad)}

📋 SUDAH TERMASUK
✓ Tiket pesawat PP
✓ Hotel sesuai paket
✓ Visa Umrah
✓ Transportasi bus ber-AC
✓ Muthawif & Ziarah
✓ Air Zam-zam 5L
✓ Perlengkapan Umrah
✓ Manasik
✓ KBIH

📊 INTERNAL DATA
• COGS/pax: ${formatCurrency(calculations.cogs)}
• Margin Double: ${formatCurrency(calculations.marginDouble)} (${markupDouble}%)
• Margin Triple: ${formatCurrency(calculations.marginTriple)} (${markupTriple}%)
• Margin Quad: ${formatCurrency(calculations.marginQuad)} (${markupQuad}%)
• Breakeven: ${calculations.breakeven} pax

═══════════════════════════════════════
    `.trim();

    navigator.clipboard.writeText(text);
    toast({ title: "Disalin!", description: "Package spec berhasil disalin ke clipboard" });
  };

  const downloadPDF = () => {
    // For now, we'll use print to PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const packageName = config.name || generatePackageName(config as PackageConfig);
    const duration = config.nightsMadinah + config.nightsMakkah;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${packageName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #166534; border-bottom: 2px solid #166534; padding-bottom: 10px; }
          h2 { color: #15803d; margin-top: 24px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .card { background: #f0fdf4; padding: 16px; border-radius: 8px; }
          .price-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .price-table th, .price-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .price-table th { background: #166534; color: white; }
          .internal { background: #fef9c3; padding: 16px; border-radius: 8px; margin-top: 20px; }
          .internal h3 { color: #854d0e; margin: 0 0 12px 0; }
          ul { list-style-type: none; padding: 0; }
          li { padding: 4px 0; }
          li:before { content: "✓ "; color: #166534; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>🕋 ${packageName}</h1>
        
        <div class="grid">
          <div class="card">
            <h2>📅 Jadwal & Durasi</h2>
            <p><strong>Keberangkatan:</strong> ${config.departureDate ? format(config.departureDate, 'dd MMMM yyyy', { locale: id }) : 'TBD'}</p>
            <p><strong>Durasi:</strong> ${duration} Hari</p>
            <p>• ${config.nightsMadinah} malam di Madinah</p>
            <p>• ${config.nightsMakkah} malam di Makkah</p>
          </div>
          
          <div class="card">
            <h2>🏨 Hotel</h2>
            <p><strong>Madinah:</strong> ${config.hotelMadinah || 'TBD'} ${'★'.repeat(config.hotelMadinahStar)}</p>
            <p><strong>Makkah:</strong> ${config.hotelMakkah || 'TBD'} ${'★'.repeat(config.hotelMakkahStar)}</p>
            <h2>✈️ Penerbangan</h2>
            <p>${config.airline || 'TBD'}</p>
          </div>
        </div>

        <h2>💰 Harga Paket</h2>
        <table class="price-table">
          <tr><th>Tipe Kamar</th><th>Harga/Orang</th><th>Margin</th></tr>
          <tr><td>Double (2 org/kamar)</td><td>${formatCurrency(calculations.priceDouble)}</td><td>${formatCurrency(calculations.marginDouble)}</td></tr>
          <tr><td>Triple (3 org/kamar)</td><td>${formatCurrency(calculations.priceTriple)}</td><td>${formatCurrency(calculations.marginTriple)}</td></tr>
          <tr><td>Quad (4 org/kamar)</td><td>${formatCurrency(calculations.priceQuad)}</td><td>${formatCurrency(calculations.marginQuad)}</td></tr>
        </table>

        <h2>📋 Sudah Termasuk</h2>
        <ul>
          <li>Tiket pesawat PP</li>
          <li>Hotel sesuai paket</li>
          <li>Visa Umrah</li>
          <li>Transportasi bus ber-AC di Saudi</li>
          <li>Muthawif & Ziarah</li>
          <li>Air Zam-zam 5L</li>
          <li>Perlengkapan Umrah</li>
          <li>Manasik Umrah</li>
          <li>KBIH</li>
        </ul>

        <div class="internal">
          <h3>📊 Data Internal (Confidential)</h3>
          <p><strong>COGS per pax:</strong> ${formatCurrency(calculations.cogs)}</p>
          <p><strong>Target Group Size:</strong> ${config.groupSize} orang</p>
          <p><strong>Breakeven Point:</strong> ${calculations.breakeven} pax</p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-green-800 dark:text-green-400 flex items-center gap-2">
                <Calculator className="h-8 w-8" />
                Umrah Package Calculator
              </h1>
              <p className="text-muted-foreground mt-1">Internal tool for package development & pricing</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={resetForm}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button variant="outline" size="sm" onClick={saveDraft}>
                <Save className="h-4 w-4 mr-1" />
                Save Draft
              </Button>
              <Button variant="outline" size="sm" onClick={copyAsText}>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button size="sm" onClick={downloadPDF} className="bg-green-600 hover:bg-green-700">
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>

          {/* Saved Drafts */}
          {drafts.length > 0 && (
            <Card className="mb-6 border-green-200 dark:border-green-800">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Saved Drafts ({drafts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-2">
                    {drafts.map(draft => (
                      <div 
                        key={draft.id}
                        className={cn(
                          "flex-shrink-0 p-2 rounded-lg border cursor-pointer transition-all hover:border-green-500",
                          currentDraftId === draft.id ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-gray-200"
                        )}
                        onClick={() => loadDraft(draft)}
                      >
                        <div className="text-sm font-medium truncate max-w-[200px]">{draft.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {draft.departureDate ? format(draft.departureDate, 'dd MMM yyyy') : 'No date'}
                        </div>
                        <div className="flex gap-1 mt-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            onClick={(e) => { e.stopPropagation(); duplicateDraft(draft); }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-red-500 hover:text-red-700"
                            onClick={(e) => { e.stopPropagation(); deleteDraft(draft.id); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Configuration & Costs */}
            <div className="lg:col-span-2 space-y-6">
              {/* Package Configuration */}
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    Package Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Package Name */}
                  <div>
                    <Label>Package Name (optional)</Label>
                    <Input 
                      placeholder={generatePackageName(config as PackageConfig)}
                      value={config.name}
                      onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Departure Date */}
                    <div>
                      <Label>Departure Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <Calendar className="h-4 w-4 mr-2" />
                            {config.departureDate ? format(config.departureDate, 'dd MMMM yyyy', { locale: id }) : 'Pilih tanggal'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={config.departureDate}
                            onSelect={(date) => setConfig(prev => ({ ...prev, departureDate: date }))}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Airline */}
                    <div>
                      <Label className="flex items-center gap-1">
                        <Plane className="h-3 w-3" />
                        Airline
                      </Label>
                      <Select 
                        value={config.airline} 
                        onValueChange={(v) => setConfig(prev => ({ ...prev, airline: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih maskapai" />
                        </SelectTrigger>
                        <SelectContent>
                          {AIRLINES.map(a => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Malam di Madinah</Label>
                      <Select 
                        value={config.nightsMadinah.toString()} 
                        onValueChange={(v) => setConfig(prev => ({ ...prev, nightsMadinah: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6].map(n => (
                            <SelectItem key={n} value={n.toString()}>{n} malam</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Malam di Makkah</Label>
                      <Select 
                        value={config.nightsMakkah.toString()} 
                        onValueChange={(v) => setConfig(prev => ({ ...prev, nightsMakkah: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[3, 4, 5, 6, 7].map(n => (
                            <SelectItem key={n} value={n.toString()}>{n} malam</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Group Size
                      </Label>
                      <Input 
                        type="number"
                        value={config.groupSize}
                        onChange={(e) => setConfig(prev => ({ ...prev, groupSize: parseInt(e.target.value) || 1 }))}
                        min={1}
                      />
                    </div>
                  </div>

                  {/* Hotels */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Hotel className="h-3 w-3" />
                        Hotel Madinah
                      </Label>
                      <Select 
                        value={config.hotelMadinah} 
                        onValueChange={(v) => {
                          const hotel = HOTELS_MADINAH.find(h => h.name === v);
                          setConfig(prev => ({ 
                            ...prev, 
                            hotelMadinah: v,
                            hotelMadinahStar: hotel?.star || 4
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih hotel" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOTELS_MADINAH.map(h => (
                            <SelectItem key={h.name} value={h.name}>
                              {h.name} {'★'.repeat(h.star)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Hotel className="h-3 w-3" />
                        Hotel Makkah
                      </Label>
                      <Select 
                        value={config.hotelMakkah} 
                        onValueChange={(v) => {
                          const hotel = HOTELS_MAKKAH.find(h => h.name === v);
                          setConfig(prev => ({ 
                            ...prev, 
                            hotelMakkah: v,
                            hotelMakkahStar: hotel?.star || 4
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih hotel" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOTELS_MAKKAH.map(h => (
                            <SelectItem key={h.name} value={h.name}>
                              {h.name} {'★'.repeat(h.star)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Inputs */}
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Cost Components
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowAllCosts(!showAllCosts)}
                    >
                      {showAllCosts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {showAllCosts ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>
                  <CardDescription>Masukkan biaya per orang (kecuali Tour Leader = total)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
                    !showAllCosts && "max-h-[200px] overflow-hidden relative"
                  )}>
                    {COST_COMPONENTS.map(({ key, label, tooltip, isTotal }) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-sm flex items-center gap-1">
                          {label}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                          {isTotal && <Badge variant="secondary" className="text-xs ml-1">Total</Badge>}
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                          <Input
                            className="pl-10"
                            value={formatNumber(config.costs[key])}
                            onChange={(e) => updateCost(key, parseNumber(e.target.value))}
                          />
                        </div>
                      </div>
                    ))}
                    {!showAllCosts && (
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Cost Breakdown Table */}
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Cost Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {calculations.breakdown.map(item => (
                      <div 
                        key={item.key}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            item.percentage > 15 ? "bg-red-500" :
                            item.percentage > 5 ? "bg-yellow-500" : "bg-green-500"
                          )} />
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                          <Badge 
                            variant="outline"
                            className={cn(
                              "w-16 justify-center",
                              item.percentage > 15 ? "border-red-300 text-red-700 dark:text-red-400" :
                              item.percentage > 5 ? "border-yellow-300 text-yellow-700 dark:text-yellow-400" : 
                              "border-green-300 text-green-700 dark:text-green-400"
                            )}
                          >
                            {item.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <span className="font-semibold">Total COGS per Pax</span>
                      <span className="font-bold text-lg">{formatCurrency(calculations.cogs)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Calculations */}
            <div className="space-y-6">
              {/* COGS Summary */}
              <Card className="border-green-500 bg-green-50 dark:bg-green-900/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-green-700 dark:text-green-400">Total COGS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-800 dark:text-green-300">
                    {formatCurrency(calculations.cogs)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">per person</p>
                </CardContent>
              </Card>

              {/* Markup Sliders */}
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5 text-green-600" />
                    Markup Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Double Occupancy</span>
                      <span className="font-medium">{markupDouble}%</span>
                    </div>
                    <Slider
                      value={[markupDouble]}
                      onValueChange={([v]) => setMarkupDouble(v)}
                      min={10}
                      max={50}
                      step={1}
                      className="[&_[role=slider]]:bg-green-600"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Triple Occupancy</span>
                      <span className="font-medium">{markupTriple}%</span>
                    </div>
                    <Slider
                      value={[markupTriple]}
                      onValueChange={([v]) => setMarkupTriple(v)}
                      min={5}
                      max={40}
                      step={1}
                      className="[&_[role=slider]]:bg-green-600"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Quad Occupancy</span>
                      <span className="font-medium">{markupQuad}%</span>
                    </div>
                    <Slider
                      value={[markupQuad]}
                      onValueChange={([v]) => setMarkupQuad(v)}
                      min={5}
                      max={35}
                      step={1}
                      className="[&_[role=slider]]:bg-green-600"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Tiers */}
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Pricing Tiers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Double */}
                  <div className="p-3 rounded-lg bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-900/10">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">Double (2/kamar)</p>
                        <p className="text-xl font-bold">{formatCurrency(calculations.priceDouble)}</p>
                      </div>
                      <Badge className="bg-green-600">{markupDouble}%</Badge>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                      Margin: {formatCurrency(calculations.marginDouble)}
                    </p>
                  </div>

                  {/* Triple */}
                  <div className="p-3 rounded-lg bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">Triple (3/kamar)</p>
                        <p className="text-xl font-bold">{formatCurrency(calculations.priceTriple)}</p>
                      </div>
                      <Badge className="bg-blue-600">{markupTriple}%</Badge>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      Margin: {formatCurrency(calculations.marginTriple)}
                    </p>
                  </div>

                  {/* Quad */}
                  <div className="p-3 rounded-lg bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">Quad (4/kamar)</p>
                        <p className="text-xl font-bold">{formatCurrency(calculations.priceQuad)}</p>
                      </div>
                      <Badge className="bg-purple-600">{markupQuad}%</Badge>
                    </div>
                    <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                      Margin: {formatCurrency(calculations.marginQuad)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Breakeven */}
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Breakeven Point
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{calculations.breakeven} pax</div>
                  <p className="text-sm text-muted-foreground">
                    Minimum peserta untuk BEP
                  </p>
                </CardContent>
              </Card>

              {/* Competitor Comparison */}
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Competitor Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm">Harga Kompetitor</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                      <Input
                        className="pl-10"
                        value={formatNumber(config.competitorPrice)}
                        onChange={(e) => setConfig(prev => ({ ...prev, competitorPrice: parseNumber(e.target.value) }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  {config.competitorPrice > 0 && (
                    <div className={cn(
                      "p-3 rounded-lg text-center",
                      competitorDiff > 0 
                        ? "bg-red-100 dark:bg-red-900/30" 
                        : competitorDiff < 0 
                          ? "bg-green-100 dark:bg-green-900/30"
                          : "bg-gray-100 dark:bg-gray-800"
                    )}>
                      {competitorDiff > 0 ? (
                        <>
                          <p className="text-sm text-red-700 dark:text-red-400">Harga Anda lebih tinggi</p>
                          <p className="font-bold text-red-800 dark:text-red-300">+{formatCurrency(competitorDiff)}</p>
                        </>
                      ) : competitorDiff < 0 ? (
                        <>
                          <p className="text-sm text-green-700 dark:text-green-400 flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Harga Anda lebih rendah
                          </p>
                          <p className="font-bold text-green-800 dark:text-green-300">{formatCurrency(competitorDiff)}</p>
                        </>
                      ) : (
                        <p className="text-sm">Harga sama dengan kompetitor</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
