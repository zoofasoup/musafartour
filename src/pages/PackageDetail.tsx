import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Train,
  Bus,
  Bell,
  AlertTriangle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatPriceJuta } from "@/lib/utils";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { usePackageBySlug } from "@/hooks/usePackages";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  );
};

const PackageDetailPage = () => {
  const { id: slug } = useParams();
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState<"best-seller" | "five-star">("best-seller");

  const { data: packageData, isLoading: loading } = usePackageBySlug(slug);

  const handleBooking = () => {
    if (!packageData) return;
    const message = `Halo Musafar Tour, saya tertarik dengan paket ${packageData.package_name}. Mohon info lebih lanjut untuk pendaftaran.`;
    redirectToWhatsApp(message);
  };

  const formatPrice = (price: number) => formatCurrency(price);

  const formatPriceShort = (price: number) => {
    const millions = price / 1000000;
    return millions.toFixed(1).replace(".", ",");
  };

  const parseListItems = (items?: string | null) => {
    if (!items) return [];
    return items.split("\n").filter(item => item.trim());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-48 mb-8" />
          <Skeleton className="h-[500px] w-full mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div>
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <Package className="h-24 w-24 mx-auto mb-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold mb-4">Paket tidak ditemukan</h1>
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

  const handleNotifyMe = () => {
    toast({
      title: "Notifikasi Aktif",
      description: `Kami akan memberitahu Anda jika ada seat tersedia untuk ${packageData?.package_name}`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Sold Out Banner */}
      {packageData.is_sold_out && (
        <div className="bg-red-600 text-white">
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

      {/* Back Button */}
      <section className="py-4 border-b">
        <div className="container mx-auto px-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </div>
      </section>

      {/* Hero Section */}
      {packageData.banner_image && (
        <section className="py-6 md:py-8 bg-gradient-to-b from-muted/30 to-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Flyer Image - 50% on desktop */}
              <div>
                <div className="relative bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="aspect-[1080/1350] relative">
                    <img
                      src={packageData.banner_image}
                      alt={packageData.package_name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Price & CTA Panel - 50% on desktop */}
              <div>
                <Card className="lg:sticky lg:top-24 shadow-xl border-2">
                  <CardContent className="p-6">
                    {/* Package Info */}
                    <div className="mb-6 pb-6 border-b">
                      <h1 className="text-2xl md:text-4xl font-bold mb-4 text-foreground leading-tight">{packageData.package_name}</h1>
                      
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

                        {/* Flight & Transport Info - Horizontal */}
                        <div className="flex gap-2 flex-wrap items-center">
                          <Badge variant="outline" className="bg-cyan-50 text-cyan-600 border-cyan-200 rounded-full">
                            <Plane className="w-3 h-3 mr-1" />
                            {packageData.flight}
                          </Badge>
                          <Badge variant="outline" className="bg-pink-50 text-pink-600 border-pink-200 rounded-full">
                            {packageData.flight_type}
                          </Badge>
                          <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 rounded-full">
                            {selectedTier === "five-star" ? <Train className="w-3 h-3 mr-1" /> : <Bus className="w-3 h-3 mr-1" />}
                            {selectedTier === "five-star" 
                              ? (packageData.five_star_transport || "Kereta Cepat")
                              : (packageData.best_seller_transport || "Bus Eksklusif")
                            }
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <h2 className="text-xl font-bold mb-4 text-foreground">Harga Paket</h2>
                    
                    {/* Tier Selector */}
                    {packageData.five_star_package_price && 
                     (packageData.five_star_package_price.quad > 0 || 
                      packageData.five_star_package_price.triple > 0 || 
                      packageData.five_star_package_price.double > 0) && (
                      <div className="mb-6">
                        <label className="text-sm font-medium mb-2 block">Pilih Tier</label>
                        <Select value={selectedTier} onValueChange={(value: "best-seller" | "five-star") => setSelectedTier(value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="best-seller">
                              <div className="flex items-center gap-2">
                                <Bus className="w-4 h-4" />
                                <span>Best Seller - {packageData.best_seller_transport || "Bus Eksklusif"}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="five-star">
                              <div className="flex items-center gap-2">
                                <Train className="w-4 h-4" />
                                <span>Five Star - {packageData.five_star_transport || "Kereta Cepat"}</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Hotel Information */}
                    <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
                      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                        <Hotel className="h-4 w-4 text-primary" />
                        Informasi Hotel
                      </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {(selectedTier === "best-seller" ? packageData.makkah_hotel_name : packageData.five_star_makkah_hotel_name || packageData.makkah_hotel_name) && (
                           <div className="space-y-1">
                             <div className="flex items-center gap-2">
                               <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                               <span className="font-semibold text-sm">Makkah</span>
                             </div>
                             <p className="text-sm pl-6">
                               {selectedTier === "best-seller" 
                                 ? packageData.makkah_hotel_name 
                                 : packageData.five_star_makkah_hotel_name || packageData.makkah_hotel_name}
                             </p>
                             {((selectedTier === "best-seller" ? packageData.makkah_hotel_star : packageData.five_star_makkah_hotel_star) || packageData.makkah_hotel_star) && (
                               <div className="pl-6">
                                 <StarRating rating={
                                   selectedTier === "best-seller" 
                                     ? packageData.makkah_hotel_star || 0
                                     : packageData.five_star_makkah_hotel_star || packageData.makkah_hotel_star || 0
                                 } />
                               </div>
                             )}
                             {((selectedTier === "best-seller" ? packageData.makkah_distance : packageData.five_star_makkah_distance) || packageData.makkah_distance) && (
                               <p className="text-xs text-muted-foreground pl-6">
                                 📍 {selectedTier === "best-seller" 
                                   ? packageData.makkah_distance 
                                   : packageData.five_star_makkah_distance || packageData.makkah_distance}
                                 {((selectedTier === "best-seller" ? packageData.makkah_duration_walk : packageData.five_star_makkah_duration_walk) || packageData.makkah_duration_walk) && 
                                   ` • 🚶 ${selectedTier === "best-seller" 
                                     ? packageData.makkah_duration_walk 
                                     : packageData.five_star_makkah_duration_walk || packageData.makkah_duration_walk}`
                                 }
                               </p>
                             )}
                           </div>
                         )}
                         {(selectedTier === "best-seller" ? packageData.madinah_hotel_name : packageData.five_star_madinah_hotel_name || packageData.madinah_hotel_name) && (
                           <div className="space-y-1">
                             <div className="flex items-center gap-2">
                               <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                               <span className="font-semibold text-sm">Madinah</span>
                             </div>
                             <p className="text-sm pl-6">
                               {selectedTier === "best-seller" 
                                 ? packageData.madinah_hotel_name 
                                 : packageData.five_star_madinah_hotel_name || packageData.madinah_hotel_name}
                             </p>
                             {((selectedTier === "best-seller" ? packageData.madinah_hotel_star : packageData.five_star_madinah_hotel_star) || packageData.madinah_hotel_star) && (
                               <div className="pl-6">
                                 <StarRating rating={
                                   selectedTier === "best-seller" 
                                     ? packageData.madinah_hotel_star || 0
                                     : packageData.five_star_madinah_hotel_star || packageData.madinah_hotel_star || 0
                                 } />
                               </div>
                             )}
                             {((selectedTier === "best-seller" ? packageData.madinah_distance : packageData.five_star_madinah_distance) || packageData.madinah_distance) && (
                               <p className="text-xs text-muted-foreground pl-6">
                                 📍 {selectedTier === "best-seller" 
                                   ? packageData.madinah_distance 
                                   : packageData.five_star_madinah_distance || packageData.madinah_distance}
                                 {((selectedTier === "best-seller" ? packageData.madinah_duration_walk : packageData.five_star_madinah_duration_walk) || packageData.madinah_duration_walk) && 
                                   ` • 🚶 ${selectedTier === "best-seller" 
                                     ? packageData.madinah_duration_walk 
                                     : packageData.five_star_madinah_duration_walk || packageData.madinah_duration_walk}`
                                 }
                               </p>
                             )}
                           </div>
                         )}
                      </div>
                    </div>

                    {/* Price Cards - Tier Style */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {/* Quad - Emphasized */}
                      <div className="col-span-3 sm:col-span-1 relative">
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10">
                          <Badge className="bg-orange-500 text-white border-0 rounded-sm px-1.5 py-0 text-[10px] font-bold shadow-lg whitespace-nowrap">
                            PALING POPULER
                          </Badge>
                        </div>
                        <Card className="border-2 border-orange-500 bg-orange-50 shadow-lg">
                          <CardContent className="p-4 text-center">
                            <div className="mb-2">
                              <p className="text-sm font-bold text-orange-700 uppercase">Quad</p>
                              <p className="text-xs text-orange-600">(4 orang/kamar)</p>
                            </div>
                            <div className="mb-1">
                              <p className="text-4xl font-bold text-orange-600">
                                {formatPriceShort(
                                  selectedTier === "five-star" && packageData.five_star_package_price
                                    ? packageData.five_star_package_price.quad
                                    : packageData.package_price.quad
                                )}
                              </p>
                              <p className="text-xs text-orange-600 font-medium">juta</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Triple */}
                      <div className="col-span-3 sm:col-span-1">
                        <Card className="border bg-yellow-50 mt-6 sm:mt-0">
                          <CardContent className="p-4 text-center">
                            <div className="mb-2">
                              <p className="text-sm font-bold text-yellow-700 uppercase">Triple</p>
                              <p className="text-xs text-yellow-600">(3 orang/kamar)</p>
                            </div>
                            <div className="mb-1">
                              <p className="text-3xl font-bold text-yellow-600">
                                {formatPriceShort(
                                  selectedTier === "five-star" && packageData.five_star_package_price
                                    ? packageData.five_star_package_price.triple
                                    : packageData.package_price.triple
                                )}
                              </p>
                              <p className="text-xs text-yellow-600 font-medium">juta</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Double */}
                      <div className="col-span-3 sm:col-span-1">
                        <Card className="border bg-gray-50 mt-6 sm:mt-0">
                          <CardContent className="p-4 text-center">
                            <div className="mb-2">
                              <p className="text-sm font-bold text-gray-700 uppercase">Double</p>
                              <p className="text-xs text-gray-600">(2 orang/kamar)</p>
                            </div>
                            <div className="mb-1">
                              <p className="text-3xl font-bold text-gray-600">
                                {formatPriceShort(
                                  selectedTier === "five-star" && packageData.five_star_package_price
                                    ? packageData.five_star_package_price.double
                                    : packageData.package_price.double
                                )}
                              </p>
                              <p className="text-xs text-gray-600 font-medium">juta</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    
                    {packageData.is_sold_out ? (
                      <div className="space-y-3 mb-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                          <p className="text-red-600 font-semibold mb-1">Paket Sudah Penuh</p>
                          {packageData.waitlist_count && packageData.waitlist_count > 0 && (
                            <p className="text-sm text-red-500">{packageData.waitlist_count} jamaah sudah terdaftar</p>
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
                        <a
                          href={packageData.catalog_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full"
                        >
                          <Button variant="outline" className="w-full text-xs md:text-sm">
                            <ExternalLink className="mr-1 h-4 w-4" />
                            Katalog
                          </Button>
                        </a>
                      )}
                      {packageData.itinerary_link && (
                        <a
                          href={packageData.itinerary_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full"
                        >
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

      {/* Main Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Included Items */}
            {packageData.included_items && (
              <Card className="shadow-md border-l-4 border-l-green-600">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-6 w-6" />
                    Termasuk dalam Paket
                  </h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {parseListItems(packageData.included_items).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Excluded Items */}
            {packageData.excluded_items && (
              <Card className="shadow-md border-l-4 border-l-destructive">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-destructive">
                    <XCircle className="h-6 w-6" />
                    Tidak Termasuk dalam Paket
                  </h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {parseListItems(packageData.excluded_items).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Equipment List */}
            {packageData.equipment_list && (
              <Card className="shadow-md border-l-4 border-l-primary">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-primary">
                    <Package className="h-6 w-6" />
                    Perlengkapan yang Disediakan
                  </h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {parseListItems(packageData.equipment_list).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
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
                  <h2 className="text-2xl font-bold mb-6">Galeri Foto</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {packageData.gallery_images.map((image, idx) => (
                      <div key={idx} className="relative aspect-square overflow-hidden rounded-lg shadow-sm">
                        <img
                          src={image}
                          alt={`Gallery ${idx + 1}`}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
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
  );
};

export default PackageDetailPage;
