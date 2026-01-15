import { useState } from "react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Globe, 
  Link2,
  BarChart3,
  Loader2,
  ExternalLink,
  Trash2,
  Eye,
  MessageSquare,
  Palette,
  Package
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface MarketingMaterial {
  id: string;
  package_id: string | null;
  category: string;
  type: string;
  title: string;
  description: string | null;
  file_url: string;
  file_size: string | null;
  format: string | null;
  created_at: string;
}

interface ShortLink {
  id: string;
  short_code: string;
  original_url: string;
  title: string | null;
  click_count: number;
  created_at: string;
}

interface PackageOption {
  id: string;
  package_name: string;
}

// Sales scripts data (placeholder until database has content)
const SALES_SCRIPTS = {
  opening: [
    { id: 1, title: "Opening WA - Prospek Baru", content: "Assalamu'alaikum Bapak/Ibu [Nama] 🙏\n\nPerkenalkan saya [Nama Agent] dari Musafar Tour.\n\nKami sedang ada promo spesial untuk paket umroh keberangkatan [Bulan]. Apakah Bapak/Ibu berencana umroh dalam waktu dekat?\n\nJika berkenan, saya bisa kirimkan informasi lengkapnya 😊" },
    { id: 2, title: "Opening WA - Follow Up", content: "Assalamu'alaikum Bapak/Ibu [Nama] 🙏\n\nSemoga dalam keadaan sehat. Ini [Nama] dari Musafar Tour.\n\nMelanjutkan percakapan kita kemarin mengenai umroh, apakah ada pertanyaan yang ingin ditanyakan?\n\nSaya siap membantu 😊" },
    { id: 3, title: "Opening WA - Referensi", content: "Assalamu'alaikum Bapak/Ibu [Nama] 🙏\n\nSaya [Nama Agent] dari Musafar Tour.\n\nSaya mendapat kontak Bapak/Ibu dari [Nama Referensi] yang baru saja pulang umroh dengan kami.\n\nBeliau merekomendasikan Bapak/Ibu karena sedang berencana umroh. Apakah benar? 😊" },
    { id: 4, title: "Opening WA - Ramadhan", content: "Assalamu'alaikum Bapak/Ibu [Nama] 🙏\n\nMenyambut bulan suci Ramadhan, kami dari Musafar Tour ingin menawarkan paket umroh spesial Ramadhan!\n\nBeribadah di tanah suci saat Ramadhan, insya Allah amalnya berlipat ganda. Tertarik untuk info lengkapnya? 😊" },
    { id: 5, title: "Opening WA - Re-engagement", content: "Assalamu'alaikum Bapak/Ibu [Nama] 🙏\n\nSemoga sehat selalu. Ini [Nama] dari Musafar Tour.\n\nSudah beberapa waktu kita tidak berkomunikasi. Saya ingin mengabarkan ada paket baru dengan harga spesial.\n\nApakah masih berencana umroh? 😊" },
  ],
  followup: [
    { id: 1, title: "Follow Up - Belum Respon", content: "Assalamu'alaikum Bapak/Ibu 🙏\n\nMaaf mengganggu, saya [Nama] dari Musafar Tour.\n\nSaya ingin follow up mengenai info paket umroh yang sudah saya kirimkan kemarin.\n\nApakah ada pertanyaan atau ada yang bisa saya bantu jelaskan? 😊" },
    { id: 2, title: "Follow Up - After Katalog", content: "Assalamu'alaikum Bapak/Ibu 🙏\n\nSemoga katalog umrohnya sudah sempat dibaca ya.\n\nBagaimana, ada paket yang menarik perhatian? Kalau ada pertanyaan soal hotel, penerbangan, atau harga, silakan tanyakan ya 😊" },
    { id: 3, title: "Follow Up - Closing", content: "Assalamu'alaikum Bapak/Ibu 🙏\n\nKabar baik! Untuk paket [Nama Paket] keberangkatan [Tanggal], slot-nya tinggal [X] lagi.\n\nJika Bapak/Ibu sudah siap, bisa langsung booking dengan DP Rp 5 juta ya.\n\nMau saya bantu prosesnya sekarang? 😊" },
  ],
  objection: [
    { id: 1, title: "Objection - Harga Mahal", content: "Saya paham Bapak/Ibu 🙏\n\nMemang harga kami sedikit lebih tinggi, tapi sudah termasuk:\n✅ Hotel bintang 5 dekat Masjidil Haram (150m)\n✅ Pesawat langsung tanpa transit\n✅ Makan 3x sehari menu Indonesia\n✅ Visa, handling, tips\n\nKalau dihitung-hitung, sebenarnya lebih hemat karena tidak perlu keluar biaya lagi. Mau saya jelaskan lebih detail?" },
    { id: 2, title: "Objection - Belum Ada Uang", content: "Baik Bapak/Ibu, saya mengerti 🙏\n\nKami punya program cicilan 0% hingga 12 bulan lho!\n\nJadi bisa mulai booking sekarang, berangkat nanti setelah lunas.\n\nMau saya jelaskan skema cicilannya?" },
    { id: 3, title: "Objection - Pikir-pikir Dulu", content: "Silakan Bapak/Ibu, memang keputusan umroh perlu dipikirkan matang 🙏\n\nSebagai informasi, harga paket ini berlaku sampai [Tanggal] dan slot juga terbatas.\n\nKalau ada pertanyaan lain, jangan ragu hubungi saya ya. Saya doakan dimudahkan rezekinya untuk berangkat umroh 😊" },
  ],
};

const IG_CAPTIONS = [
  "🕌 Rindu dengan panggilan-Nya? Yuk wujudkan mimpi umrohmu bersama Musafar Tour! ✨\n\nDapatkan:\n✅ Hotel bintang 5 dekat Masjidil Haram\n✅ Pesawat langsung\n✅ Bimbingan ustadz berpengalaman\n\nInfo & booking:\n📱 [NOMOR WA]\n\n#umroh2025 #paketumroh #musafartour",
  "Ya Allah, satukanlah kami dengan Baitullah-Mu 🤲🏻\n\nMusafar Tour siap menemani perjalanan sucimu!\n\n📅 Keberangkatan: [BULAN 2025]\n💰 Mulai Rp [HARGA] juta\n\nBooking sekarang, seat terbatas!\n📱 [NOMOR WA]\n\n#umroh #baitullah #makkah #madinah",
  "🌙 Umroh di bulan Ramadhan = pahala berlipat ganda!\n\nAyo booking sekarang untuk keberangkatan Ramadhan 2025 🕋\n\n✨ Fasilitas terbaik\n✨ Harga terjangkau\n✨ Pelayanan prima\n\nInfo lengkap:\n📱 [NOMOR WA]\n\n#umrohramadhan #ramadhan2025 #musafartour",
];

const generateShortCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const AgentMarketingKit = () => {
  const { agent } = useAgentAuth();
  const queryClient = useQueryClient();
  
  const [selectedPackage, setSelectedPackage] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [selectedScripts, setSelectedScripts] = useState<typeof SALES_SCRIPTS.opening>([]);
  const [scriptCategory, setScriptCategory] = useState('');
  
  // Link shortener
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');

  // Fetch marketing materials
  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ['marketing-materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_materials')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MarketingMaterial[];
    },
  });

  // Fetch packages for dropdown
  const { data: packages = [] } = useQuery({
    queryKey: ['packages-for-marketing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('id, package_name')
        .eq('status', 'published')
        .order('departure_date', { ascending: true });
      
      if (error) throw error;
      return data as PackageOption[];
    },
  });

  // Fetch agent's short links
  const { data: shortLinks = [], isLoading: linksLoading } = useQuery({
    queryKey: ['agent-short-links', agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data, error } = await supabase
        .from('agent_short_links')
        .select('*')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ShortLink[];
    },
    enabled: !!agent?.id,
  });

  // Create short link mutation
  const createLinkMutation = useMutation({
    mutationFn: async ({ url, title }: { url: string; title: string }) => {
      if (!agent?.id) throw new Error('Agent not found');
      
      const shortCode = generateShortCode();
      const { error } = await supabase
        .from('agent_short_links')
        .insert({
          agent_id: agent.id,
          short_code: shortCode,
          original_url: url,
          title: title || null,
        });
      
      if (error) throw error;
      return shortCode;
    },
    onSuccess: (shortCode) => {
      toast.success(`Link berhasil dibuat: ${shortCode}`);
      setNewLinkUrl('');
      setNewLinkTitle('');
      queryClient.invalidateQueries({ queryKey: ['agent-short-links'] });
    },
    onError: (error) => {
      toast.error('Gagal membuat link: ' + (error as Error).message);
    },
  });

  // Delete short link mutation
  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('agent_short_links')
        .delete()
        .eq('id', linkId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Link berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['agent-short-links'] });
    },
    onError: (error) => {
      toast.error('Gagal menghapus link: ' + (error as Error).message);
    },
  });

  // Filter materials by category and package
  const filterMaterials = (category: string) => {
    return materials.filter(m => {
      const categoryMatch = m.category === category;
      const packageMatch = selectedPackage === 'all' 
        ? m.package_id === null 
        : m.package_id === selectedPackage;
      return categoryMatch && packageMatch;
    });
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Berhasil disalin!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download dimulai...');
  };

  const handleCreateLink = () => {
    if (!newLinkUrl.trim()) {
      toast.error('URL tidak boleh kosong');
      return;
    }
    try {
      new URL(newLinkUrl);
    } catch {
      toast.error('URL tidak valid');
      return;
    }
    createLinkMutation.mutate({ url: newLinkUrl, title: newLinkTitle });
  };

  const openScriptModal = (category: string, scripts: typeof SALES_SCRIPTS.opening) => {
    setScriptCategory(category);
    setSelectedScripts(scripts);
    setShowScriptModal(true);
  };

  const agentPageUrl = `${window.location.origin}/r/${agent?.referral_code || ''}`;

  if (materialsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Kit</h1>
          <p className="text-muted-foreground">Download materi promosi dan tools untuk meningkatkan penjualan</p>
        </div>

        {/* General Marketing Kit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Marketing Kit - Semua Paket
            </CardTitle>
            <CardDescription>Materi promosi yang bisa digunakan untuk semua paket</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="visual" className="space-y-4">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="visual" className="flex items-center gap-1">
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline">Visual</span>
                </TabsTrigger>
                <TabsTrigger value="copy" className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Copywriting</span>
                </TabsTrigger>
                <TabsTrigger value="video" className="flex items-center gap-1">
                  <Video className="h-4 w-4" />
                  <span className="hidden sm:inline">Videos</span>
                </TabsTrigger>
                <TabsTrigger value="page" className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">Landing</span>
                </TabsTrigger>
              </TabsList>

              {/* Visual Assets Tab */}
              <TabsContent value="visual" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Katalog Digital */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold">Katalog Digital 2025</h3>
                          <p className="text-sm text-muted-foreground">PDF • 15 MB • Updated Jan 2025</p>
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Flyer Templates */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center shrink-0">
                          <ImageIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold">Flyer Templates</h3>
                          <p className="text-sm text-muted-foreground mb-2">5 template siap pakai</p>
                          <div className="flex flex-wrap gap-1 mb-3">
                            <Badge variant="secondary" className="text-xs">A4 Print</Badge>
                            <Badge variant="secondary" className="text-xs">IG Post</Badge>
                            <Badge variant="secondary" className="text-xs">IG Story</Badge>
                            <Badge variant="secondary" className="text-xs">FB Post</Badge>
                            <Badge variant="secondary" className="text-xs">WA Status</Badge>
                          </div>
                          <Button size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Download Pack (ZIP)
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Dynamic materials from database */}
                {filterMaterials('visual').length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Materi Lainnya</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      {filterMaterials('visual').map((material) => (
                        <div key={material.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{material.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {material.format} • {material.file_size}
                              </p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleDownload(material.file_url, material.title)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Copywriting Tab */}
              <TabsContent value="copy" className="space-y-4">
                {/* Sales Scripts */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
                        <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">Sales Script WhatsApp</h3>
                        <p className="text-sm text-muted-foreground mb-3">Template pesan untuk berbagai situasi</p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => openScriptModal('Opening WA', SALES_SCRIPTS.opening)}>
                            Opening (5)
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openScriptModal('Follow Up', SALES_SCRIPTS.followup)}>
                            Follow Up (3)
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openScriptModal('Objection Handling', SALES_SCRIPTS.objection)}>
                            Objection (3)
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* IG/FB Captions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      💬 Caption IG/FB
                      <Badge variant="secondary">{IG_CAPTIONS.length} caption</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {IG_CAPTIONS.map((caption, index) => (
                      <div key={index} className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm whitespace-pre-line line-clamp-3">{caption}</p>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="mt-2"
                          onClick={() => handleCopy(caption, `caption-${index}`)}
                        >
                          {copiedId === `caption-${index}` ? (
                            <><Check className="h-4 w-4 mr-1" /> Disalin</>
                          ) : (
                            <><Copy className="h-4 w-4 mr-1" /> Copy</>
                          )}
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Videos Tab */}
              <TabsContent value="video" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center shrink-0">
                          <Video className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">Video Testimonial</h3>
                          <p className="text-sm text-muted-foreground">30 detik • MP4</p>
                          <Button size="sm" className="mt-3">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center shrink-0">
                          <Video className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">Hotel Tour</h3>
                          <p className="text-sm text-muted-foreground">60 detik • MP4</p>
                          <Button size="sm" className="mt-3">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {filterMaterials('video').length === 0 && materials.filter(m => m.category === 'video').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Video akan segera tersedia</p>
                  </div>
                )}
              </TabsContent>

              {/* Landing Page Tab */}
              <TabsContent value="page" className="space-y-4">
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                        <Globe className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">Your Personal Landing Page</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Halaman khusus dengan kode referral kamu
                        </p>
                        <div className="flex items-center gap-2 p-2 bg-background rounded border mb-3">
                          <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <code className="text-sm flex-1 truncate">{agentPageUrl}</code>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleCopy(agentPageUrl, 'agent-page')}
                          >
                            {copiedId === 'agent-page' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <a href={agentPageUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View Page
                            </a>
                          </Button>
                          <Button size="sm" variant="outline">
                            Edit Bio
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Per-Package Marketing Kit */}
        <Card>
          <CardHeader>
            <CardTitle>Marketing Kit per Paket</CardTitle>
            <CardDescription>Materi khusus untuk paket tertentu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-xs">
              <Label>Pilih Paket</Label>
              <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih paket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Paket (General)</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.package_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPackage !== 'all' ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {/* Package-specific materials */}
                {materials.filter(m => m.package_id === selectedPackage).length > 0 ? (
                  materials.filter(m => m.package_id === selectedPackage).map((material) => (
                    <div key={material.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{material.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {material.format} • {material.file_size}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleDownload(material.file_url, material.title)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Belum ada materi khusus untuk paket ini</p>
                    <p className="text-sm">Gunakan materi general di atas</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Pilih paket untuk melihat materi spesifik</p>
            )}
          </CardContent>
        </Card>

        {/* Tools Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Link Shortener */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Link Shortener
              </CardTitle>
              <CardDescription>Buat link pendek dengan tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  placeholder="https://musafar.lovable.app/paket-umroh/..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Judul (opsional)</Label>
                <Input
                  id="title"
                  placeholder="Promo Ramadhan"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleCreateLink} 
                disabled={createLinkMutation.isPending}
                className="w-full"
              >
                {createLinkMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Membuat...</>
                ) : (
                  <><Link2 className="h-4 w-4 mr-2" /> Generate Short Link</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Link Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Link Analytics
              </CardTitle>
              <CardDescription>Statistik link yang sudah dibuat</CardDescription>
            </CardHeader>
            <CardContent>
              {linksLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : shortLinks.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Link2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Belum ada link yang dibuat</p>
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Link</TableHead>
                        <TableHead className="text-center">Clicks</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shortLinks.map((link) => (
                        <TableRow key={link.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{link.title || link.short_code}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {link.original_url}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{link.click_count}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8"
                                onClick={() => handleCopy(`${window.location.origin}/l/${link.short_code}`, link.id)}
                              >
                                {copiedId === link.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-destructive"
                                onClick={() => deleteLinkMutation.mutate(link.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sales Script Modal */}
      <Dialog open={showScriptModal} onOpenChange={setShowScriptModal}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>📝 {scriptCategory}</DialogTitle>
            <DialogDescription>Pilih dan copy template yang sesuai</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {selectedScripts.map((script) => (
                <div key={script.id} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{script.title}</h4>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCopy(script.content, `script-${script.id}`)}
                    >
                      {copiedId === `script-${script.id}` ? (
                        <><Check className="h-4 w-4 mr-1" /> Disalin</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-1" /> Copy</>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-line text-muted-foreground">{script.content}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScriptModal(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentMarketingKit;