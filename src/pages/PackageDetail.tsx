import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  Plane, 
  Hotel, 
  Star, 
  Clock, 
  Users, 
  MapPin,
  CheckCircle2,
  XCircle,
  Package,
  ExternalLink,
  ArrowLeft,
  Bus,
  Bell,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatPriceJuta } from "@/lib/utils";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { usePackageBySlug, usePublishedPackages } from "@/hooks/usePackages";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";

/* ─── Star Rating ─── */
const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? "fill-accent text-accent" : "fill-muted text-muted"}`}
      />
    ))}
  </div>
);

/* ─── Package Sidebar ─── */
const PackageSidebar = ({ 
  currentSlug, 
  collapsed, 
  onToggle 
}: { 
  currentSlug?: string; 
  collapsed: boolean; 
  onToggle: () => void;
}) => {
  const { data: packages, isLoading } = usePublishedPackages();

  const grouped = useMemo(() => {
    if (!packages) return {};
    const groups: Record<string, typeof packages> = {};
    for (const pkg of packages) {
      const key = format(new Date(pkg.departure_date), "MMMM yyyy", { locale: localeId });
      if (!groups[key]) groups[key] = [];
      groups[key].push(pkg);
    }
    return groups;
  }, [packages]);

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r bg-card transition-all duration-300 shrink-0 sticky top-0 h-screen overflow-y-auto z-10",
        collapsed ? "w-12" : "w-72"
      )}
    >
      {/* Toggle button */}
      <div className={cn("flex items-center border-b p-2", collapsed ? "justify-center" : "justify-between px-4")}>
        {!collapsed && <span className="text-sm font-bold tracking-tight text-foreground">Paket Lainnya</span>}
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {collapsed ? null : (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            Object.entries(grouped).map(([month, pkgs]) => (
              <div key={month}>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{month}</p>
                <div className="space-y-1">
                  {pkgs.map(pkg => {
                    const isActive = pkg.slug === currentSlug;
                    return (
                      <Link
                        key={pkg.id}
                        to={`/paket-umroh/${pkg.slug}`}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <span className="truncate flex-1 tracking-tight">{pkg.package_name}</span>
                        {isActive && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
};

/* ─── Main Page ─── */
const PackageDetailPage = () => {
  const { id: slug } = useParams();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: packageData, isLoading: loading } = usePackageBySlug(slug);

  const handleBooking = () => {
    if (!packageData) return;
    const message = `Halo Musafar Tour, saya tertarik dengan paket ${packageData.package_name}. Mohon info lebih lanjut untuk pendaftaran.`;
    redirectToWhatsApp(message);
  };

  const formatPriceShort = (price: number) => {
    const millions = price / 1000000;
    return millions.toFixed(1).replace(".", ",");
  };

  const parseListItems = (items?: string | null) => {
    if (!items) return [];
    return items.split("\n").filter(item => item.trim());
  };

  const handleNotifyMe = () => {
    toast({
      title: "Notifikasi Aktif",
      description: `Kami akan memberitahu Anda jika ada seat tersedia untuk ${packageData?.package_name}`,
    });
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex">
          <PackageSidebar currentSlug={slug} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <div className="flex-1 container mx-auto px-4 py-8">
            <Skeleton className="h-12 w-48 mb-8" />
            <Skeleton className="h-[500px] w-full mb-8" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  /* ─── Not Found ─── */
  if (!packageData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <Package className="h-24 w-24 mx-auto mb-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold mb-4 text-foreground">Paket tidak ditemukan</h1>
          <p className="text-muted-foreground mb-8">
            Paket yang Anda cari tidak tersedia atau sudah tidak aktif.
          </p>
          <Button onClick={() => navigate("/paket-umroh")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Paket Umroh
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const includedItems = parseListItems(packageData.included_items);
  const excludedItems = parseListItems(packageData.excluded_items);
  const equipmentItems = parseListItems(packageData.equipment_list);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Sold Out Banner */}
      {packageData.is_sold_out && (
        <div className="bg-destructive text-destructive-foreground">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-center gap-3 text-center">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p className="font-semibold">
                Paket ini sudah penuh untuk keberangkatan {format(new Date(packageData.departure_date), "d MMMM yyyy", { locale: localeId })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout: Sidebar + Content */}
      <div className="flex min-h-[calc(100vh-4rem)]">
        <PackageSidebar 
          currentSlug={slug} 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Back Button */}
          <section className="py-3 border-b bg-background">
            <div className="container mx-auto px-4">
              <Button variant="ghost" onClick={() => navigate(-1)} className="text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali
              </Button>
            </div>
          </section>

          {/* Hero: Flyer + Price Panel */}
          {packageData.banner_image && (
            <section className="py-6 md:py-8 bg-muted/30">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  {/* Flyer Image */}
                  <div>
                    <div className="relative bg-card rounded-xl shadow-lg overflow-hidden">
                      <div className="aspect-[1080/1350] relative">
                        <img
                          src={packageData.banner_image}
                          alt={packageData.package_name}
                          className="w-full h-full object-contain"
                          loading="eager"
                          fetchPriority="high"
                          width="1080"
                          height="1350"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Price & CTA Panel */}
                  <div>
                    <Card className="lg:sticky lg:top-24 shadow-xl border-2">
                      <CardContent className="p-6">
                        {/* Package Info */}
                        <div className="mb-6 pb-6 border-b">
                          <h1 className="text-2xl md:text-4xl font-bold mb-4 text-foreground leading-tight tracking-tight">{packageData.package_name}</h1>
                          
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex items-start gap-2">
                                <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-muted-foreground font-medium">Keberangkatan</p>
                                  <p className="text-sm font-bold text-foreground">
                                    {format(new Date(packageData.departure_date), "dd MMM yyyy", { locale: localeId })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-muted-foreground font-medium">Durasi</p>
                                  <p className="text-sm font-bold text-foreground">{packageData.duration_days} Hari</p>
                                </div>
                              </div>
                            </div>

                            {/* Flight & Transport Info */}
                            <div className="flex gap-2 flex-wrap items-center">
                              <Badge variant="outline" className="rounded-full text-foreground">
                                <Plane className="w-3 h-3 mr-1" />
                                {packageData.flight}
                              </Badge>
                              <Badge variant="outline" className="rounded-full text-foreground">
                                {packageData.flight_type}
                              </Badge>
                              <Badge variant="outline" className="rounded-full text-foreground">
                                <Bus className="w-3 h-3 mr-1" />
                                {packageData.best_seller_transport || "Bus Eksklusif"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <h2 className="text-xl font-bold mb-4 text-foreground tracking-tight">Harga Paket</h2>

                        {/* Hotel Information */}
                        <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
                          <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-foreground">
                            <Hotel className="h-4 w-4 text-primary" />
                            Informasi Hotel
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {packageData.makkah_hotel_name && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                                  <span className="font-semibold text-sm text-foreground">Makkah</span>
                                </div>
                                <p className="text-sm pl-6 text-foreground">{packageData.makkah_hotel_name}</p>
                                {packageData.makkah_hotel_star && (
                                  <div className="pl-6"><StarRating rating={packageData.makkah_hotel_star} /></div>
                                )}
                                {packageData.makkah_distance && (
                                  <p className="text-xs text-muted-foreground pl-6">
                                    📍 {packageData.makkah_distance}
                                    {packageData.makkah_duration_walk && ` • 🚶 ${packageData.makkah_duration_walk}`}
                                  </p>
                                )}
                              </div>
                            )}
                            {packageData.madinah_hotel_name && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                                  <span className="font-semibold text-sm text-foreground">Madinah</span>
                                </div>
                                <p className="text-sm pl-6 text-foreground">{packageData.madinah_hotel_name}</p>
                                {packageData.madinah_hotel_star && (
                                  <div className="pl-6"><StarRating rating={packageData.madinah_hotel_star} /></div>
                                )}
                                {packageData.madinah_distance && (
                                  <p className="text-xs text-muted-foreground pl-6">
                                    📍 {packageData.madinah_distance}
                                    {packageData.madinah_duration_walk && ` • 🚶 ${packageData.madinah_duration_walk}`}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Price Cards */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                          {/* Quad */}
                          <div className="col-span-3 sm:col-span-1 relative">
                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10">
                              <Badge className="bg-primary text-primary-foreground border-0 rounded-sm px-1.5 py-0 text-[10px] font-bold shadow-lg whitespace-nowrap">
                                PALING POPULER
                              </Badge>
                            </div>
                            <Card className="border-2 border-primary bg-primary/5 shadow-lg">
                              <CardContent className="p-4 text-center">
                                <div className="mb-2">
                                  <p className="text-sm font-bold text-primary uppercase tracking-tight">Quad</p>
                                  <p className="text-xs text-muted-foreground">(4 orang/kamar)</p>
                                </div>
                                <div className="mb-1">
                                  <p className="text-4xl font-bold text-primary tracking-tight">
                                    {formatPriceShort(packageData.package_price.quad)}
                                  </p>
                                  <p className="text-xs text-muted-foreground font-medium">juta</p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Triple */}
                          <div className="col-span-3 sm:col-span-1">
                            <Card className="border bg-accent/5 mt-6 sm:mt-0">
                              <CardContent className="p-4 text-center">
                                <div className="mb-2">
                                  <p className="text-sm font-bold text-accent-foreground uppercase tracking-tight">Triple</p>
                                  <p className="text-xs text-muted-foreground">(3 orang/kamar)</p>
                                </div>
                                <div className="mb-1">
                                  <p className="text-3xl font-bold text-accent-foreground tracking-tight">
                                    {formatPriceShort(packageData.package_price.triple)}
                                  </p>
                                  <p className="text-xs text-muted-foreground font-medium">juta</p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Double */}
                          <div className="col-span-3 sm:col-span-1">
                            <Card className="border bg-muted/30 mt-6 sm:mt-0">
                              <CardContent className="p-4 text-center">
                                <div className="mb-2">
                                  <p className="text-sm font-bold text-foreground uppercase tracking-tight">Double</p>
                                  <p className="text-xs text-muted-foreground">(2 orang/kamar)</p>
                                </div>
                                <div className="mb-1">
                                  <p className="text-3xl font-bold text-foreground tracking-tight">
                                    {formatPriceShort(packageData.package_price.double)}
                                  </p>
                                  <p className="text-xs text-muted-foreground font-medium">juta</p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                        
                        {packageData.is_sold_out ? (
                          <div className="space-y-3 mb-4">
                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
                              <p className="text-destructive font-semibold mb-1">Paket Sudah Penuh</p>
                              {packageData.waitlist_count && packageData.waitlist_count > 0 && (
                                <p className="text-sm text-destructive/80">{packageData.waitlist_count} jamaah sudah terdaftar</p>
                              )}
                            </div>
                            <Button 
                              onClick={handleNotifyMe}
                              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-lg"
                              size="lg"
                            >
                              <Bell className="mr-2 h-5 w-5" />
                              Notify Me - Keberangkatan Berikutnya
                            </Button>
                            <Button 
                              onClick={() => navigate("/paket-umroh")}
                              variant="outline"
                              className="w-full font-semibold py-5"
                              size="lg"
                            >
                              Lihat Paket Serupa
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            onClick={handleBooking}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg mb-4"
                            size="lg"
                          >
                            <Users className="mr-2 h-5 w-5" />
                            Daftar Sekarang
                          </Button>
                        )}

                        {/* Secondary Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                          {packageData.catalog_link && (
                            <a href={packageData.catalog_link} target="_blank" rel="noopener noreferrer" className="w-full">
                              <Button variant="outline" className="w-full text-xs md:text-sm">
                                <ExternalLink className="mr-1 h-4 w-4" />
                                Katalog
                              </Button>
                            </a>
                          )}
                          {packageData.itinerary_link && (
                            <a href={packageData.itinerary_link} target="_blank" rel="noopener noreferrer" className="w-full">
                              <Button variant="outline" className="w-full text-xs md:text-sm">
                                <ExternalLink className="mr-1 h-4 w-4" />
                                Itinerary
                              </Button>
                            </a>
                          )}
                        </div>
                        
                        <p className="text-xs text-center text-muted-foreground mt-4">
                          Hubungi kami melalui WhatsApp untuk informasi lebih lanjut dan pendaftaran
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Include / Exclude / Equipment / Gallery */}
          <section className="py-8">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto space-y-6">

                {/* Included Items */}
                {includedItems.length > 0 && (
                  <Card className="shadow-md border-l-4 border-l-green-600">
                    <CardContent className="p-6">
                      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-green-600 tracking-tight">
                        <CheckCircle2 className="h-6 w-6" />
                        Termasuk dalam Paket
                      </h2>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {includedItems.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-foreground">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Excluded Items */}
                {excludedItems.length > 0 && (
                  <Card className="shadow-md border-l-4 border-l-destructive">
                    <CardContent className="p-6">
                      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-destructive tracking-tight">
                        <XCircle className="h-6 w-6" />
                        Tidak Termasuk dalam Paket
                      </h2>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {excludedItems.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-foreground">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Equipment List */}
                {equipmentItems.length > 0 && (
                  <Card className="shadow-md border-l-4 border-l-primary">
                    <CardContent className="p-6">
                      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-primary tracking-tight">
                        <Package className="h-6 w-6" />
                        Perlengkapan yang Disediakan
                      </h2>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {equipmentItems.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-foreground">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Gallery Images */}
                {packageData.gallery_images && packageData.gallery_images.length > 0 && (
                  <Card className="shadow-md">
                    <CardContent className="p-6">
                      <h2 className="text-2xl font-bold mb-6 text-foreground tracking-tight">Galeri Foto</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {packageData.gallery_images.map((image, idx) => (
                          <div key={idx} className="relative aspect-square overflow-hidden rounded-lg shadow-sm">
                            <img
                              src={image}
                              alt={`Gallery ${idx + 1}`}
                              className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </section>

          {/* Sticky Mobile CTA */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 p-4">
            <Button 
              onClick={handleBooking}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg"
              size="lg"
            >
              <Users className="mr-2 h-5 w-5" />
              Daftar Sekarang
            </Button>
          </div>

          <Footer />
        </div>
      </div>
    </div>
  );
};

export default PackageDetailPage;
