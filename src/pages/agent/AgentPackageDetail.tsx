import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import {
  Star,
  Plane,
  Calendar,
  MapPin,
  Share2,
  FileText,
  Copy,
  Palette,
  Check,
  X,
  Clock,
  Hotel,
  Route,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import PackageShareModal from "@/components/agent/PackageShareModal";

interface PackagePrice {
  quad: number;
  double: number;
  triple: number;
}

interface Package {
  id: string;
  package_name: string;
  departure_date: string;
  duration_days: number;
  flight: string;
  flight_type: string;
  madinah_hotel_name: string | null;
  madinah_hotel_star: number | null;
  madinah_distance: string | null;
  madinah_duration_walk: string | null;
  makkah_hotel_name: string | null;
  makkah_hotel_star: number | null;
  makkah_distance: string | null;
  makkah_duration_walk: string | null;
  package_price: PackagePrice;
  banner_image: string | null;
  gallery_images: string[] | null;
  status: string;
  slots_total: number | null;
  slots_filled: number | null;
  commission_rate: number | null;
  catalog_link: string | null;
  itinerary_link: string | null;
  included_items: string | null;
  excluded_items: string | null;
  equipment_list: string | null;
}

const AgentPackageDetail = () => {
  const { id: packageId } = useParams();
  const navigate = useNavigate();
  const { agent } = useAgentAuth();
  const { toast } = useToast();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const { data: pkg, isLoading } = useQuery({
    queryKey: ["agent-package", packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("id", packageId)
        .single();

      if (error) throw error;
      return data as unknown as Package;
    },
    enabled: !!packageId,
  });

  const formatPrice = (price: number) => formatCurrency(price);

  const calculateCommission = (price: number, rate: number | null) => {
    const commissionRate = rate || 4.5;
    return (price * commissionRate) / 100;
  };

  const getSlotStatus = (pkg: Package) => {
    const total = pkg.slots_total || 40;
    const filled = pkg.slots_filled || 0;
    const remaining = total - filled;

    if (remaining <= 0) {
      return { status: "full", label: "Full Booked", color: "destructive" };
    }
    if (remaining <= 5) {
      return { status: "almost", label: `Almost Full (${remaining} slot)`, color: "warning" };
    }
    return { status: "open", label: `Tersedia (${remaining} slot)`, color: "success" };
  };

  const renderStars = (count: number | null) => {
    if (!count) return null;
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < count ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
        }`}
      />
    ));
  };

  const generateSalesScript = () => {
    if (!pkg) return "";
    const lowestPrice = pkg.package_price.quad;
    
    return `🕌 *${pkg.package_name}*

📅 Keberangkatan: ${format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: id })}
⏱️ Durasi: ${pkg.duration_days} Hari

🏨 *Hotel:*
• Makkah: ${pkg.makkah_hotel_name || "-"} ${pkg.makkah_hotel_star ? `(${pkg.makkah_hotel_star}⭐)` : ""}
• Madinah: ${pkg.madinah_hotel_name || "-"} ${pkg.madinah_hotel_star ? `(${pkg.madinah_hotel_star}⭐)` : ""}

✈️ Penerbangan: ${pkg.flight} (${pkg.flight_type})

💰 *Harga mulai dari:* ${formatPrice(lowestPrice)}/pax

📞 Hubungi saya untuk info lebih lanjut dan booking!

${agent?.referral_code ? `Kode Referral: ${agent.referral_code}` : ""}`;
  };

  const copySalesScript = async () => {
    const script = generateSalesScript();
    await navigator.clipboard.writeText(script);
    setCopiedScript(true);
    toast({
      title: "Sales script disalin!",
      description: "Paste ke WhatsApp atau platform lainnya",
    });
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const shareToWhatsApp = () => {
    const script = generateSalesScript();
    const encoded = encodeURIComponent(script);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Paket tidak ditemukan</h2>
          <p className="text-muted-foreground mb-4">
            Paket yang Anda cari tidak tersedia
          </p>
          <Button onClick={() => navigate("/agent/packages")}>
            Kembali ke Katalog
          </Button>
        </Card>
      </div>
    );
  }

  const slotStatus = getSlotStatus(pkg);
  const lowestPrice = pkg.package_price.quad;
  const commission = calculateCommission(lowestPrice, pkg.commission_rate);

  const includedItems = pkg.included_items?.split("\n").filter(Boolean) || [];
  const excludedItems = pkg.excluded_items?.split("\n").filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            className="text-white/80 hover:text-white mb-4 -ml-2"
            onClick={() => navigate("/agent/packages")}
          >
            ← Kembali ke Katalog
          </Button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{pkg.package_name}</h1>
              <div className="flex items-center gap-4 mt-2 text-emerald-100">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: id })}
                  </span>
                </div>
                <span>•</span>
                <span>{pkg.duration_days} Hari</span>
              </div>
            </div>
            <Badge 
              className={
                slotStatus.color === "success" 
                  ? "bg-emerald-500" 
                  : slotStatus.color === "warning" 
                  ? "bg-yellow-500 text-black" 
                  : "bg-red-500"
              }
            >
              {slotStatus.label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Quick Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={shareToWhatsApp}
              >
                <Share2 className="h-4 w-4 mr-2" />
                📱 Share WA
              </Button>
              {pkg.catalog_link && (
                <Button variant="outline" asChild>
                  <a href={pkg.catalog_link} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    📄 Katalog
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={copySalesScript}>
                {copiedScript ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    📋 Copy Script
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShareModalOpen(true)}>
                <Palette className="h-4 w-4 mr-2" />
                🎨 Share Lainnya
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Price & Commission Card */}
        <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Harga Mulai Dari</p>
                <p className="text-3xl font-bold text-primary">{formatPrice(lowestPrice)}</p>
                <p className="text-sm text-muted-foreground">/pax (Quad)</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Komisi Anda</p>
                <p className="text-3xl font-bold text-emerald-600">{formatPrice(commission)}</p>
                <p className="text-sm text-muted-foreground">per pax ({pkg.commission_rate || 4.5}%)</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Potensi 10 Pax</p>
                <p className="text-3xl font-bold text-emerald-600">{formatPrice(commission * 10)}</p>
                <p className="text-sm text-muted-foreground">total komisi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Content */}
        <Tabs defaultValue="detail" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="detail">Detail Paket</TabsTrigger>
            <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
            <TabsTrigger value="hotel">Hotel</TabsTrigger>
            <TabsTrigger value="materials">Sales Materials</TabsTrigger>
          </TabsList>

          <TabsContent value="detail" className="space-y-4">
            {/* Price Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Breakdown Harga</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>Paket Quad (4 orang/kamar)</span>
                    <span className="font-bold">{formatPrice(pkg.package_price.quad)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>Paket Triple (3 orang/kamar)</span>
                    <span className="font-bold">{formatPrice(pkg.package_price.triple)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>Paket Double (2 orang/kamar)</span>
                    <span className="font-bold">{formatPrice(pkg.package_price.double)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Flight Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  Penerbangan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold">{pkg.flight}</p>
                    <Badge variant="outline">{pkg.flight_type}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Include/Exclude */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-emerald-600">
                    <Check className="h-5 w-5" />
                    Termasuk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {includedItems.length > 0 ? (
                    <ul className="space-y-2">
                      {includedItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum ada data</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                    <X className="h-5 w-5" />
                    Tidak Termasuk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {excludedItems.length > 0 ? (
                    <ul className="space-y-2">
                      {excludedItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <X className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum ada data</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="itinerary">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Jadwal Perjalanan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pkg.itinerary_link ? (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Download itinerary lengkap untuk melihat jadwal perjalanan hari per hari.
                    </p>
                    <Button asChild>
                      <a href={pkg.itinerary_link} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 mr-2" />
                        Download Itinerary PDF
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Itinerary belum tersedia</p>
                    <p className="text-sm">Hubungi admin untuk informasi lebih lanjut</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hotel" className="space-y-4">
            {/* Makkah Hotel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Hotel className="h-5 w-5" />
                  Hotel Makkah
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pkg.makkah_hotel_name ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg">{pkg.makkah_hotel_name}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        {renderStars(pkg.makkah_hotel_star)}
                      </div>
                    </div>
                    <div className="grid gap-3">
                      {pkg.makkah_distance && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>Jarak ke Masjidil Haram: {pkg.makkah_distance}</span>
                        </div>
                      )}
                      {pkg.makkah_duration_walk && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Waktu jalan kaki: {pkg.makkah_duration_walk}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Belum ada data hotel</p>
                )}
              </CardContent>
            </Card>

            {/* Madinah Hotel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Hotel className="h-5 w-5" />
                  Hotel Madinah
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pkg.madinah_hotel_name ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg">{pkg.madinah_hotel_name}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        {renderStars(pkg.madinah_hotel_star)}
                      </div>
                    </div>
                    <div className="grid gap-3">
                      {pkg.madinah_distance && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>Jarak ke Masjid Nabawi: {pkg.madinah_distance}</span>
                        </div>
                      )}
                      {pkg.madinah_duration_walk && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Waktu jalan kaki: {pkg.madinah_duration_walk}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Belum ada data hotel</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Download Materi Promosi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {pkg.catalog_link && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Katalog PDF</p>
                          <p className="text-sm text-muted-foreground">Brosur lengkap paket</p>
                        </div>
                      </div>
                      <Button size="sm" asChild>
                        <a href={pkg.catalog_link} target="_blank" rel="noopener noreferrer">
                          Download
                        </a>
                      </Button>
                    </div>
                  )}

                  {pkg.itinerary_link && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Route className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Itinerary PDF</p>
                          <p className="text-sm text-muted-foreground">Jadwal perjalanan</p>
                        </div>
                      </div>
                      <Button size="sm" asChild>
                        <a href={pkg.itinerary_link} target="_blank" rel="noopener noreferrer">
                          Download
                        </a>
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Sales Script</h4>
                  <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono">
                    {generateSalesScript()}
                  </div>
                  <Button className="mt-3" onClick={copySalesScript}>
                    {copiedScript ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Sales Script
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Share Modal */}
      <PackageShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        package={pkg}
        agentCode={agent?.referral_code || ""}
      />
    </div>
  );
};

export default AgentPackageDetail;
