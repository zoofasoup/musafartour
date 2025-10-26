import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  ArrowLeft
} from "lucide-react";
import { formatWhatsAppUrl } from "@/lib/utils";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface PackageDetail {
  id: string;
  package_name: string;
  banner_image?: string;
  gallery_images?: string[];
  departure_date: string;
  duration_days: number;
  flight: string;
  flight_type: string;
  package_price: {
    quad: number;
    triple: number;
    double: number;
  };
  makkah_hotel_name?: string;
  makkah_hotel_star?: number;
  makkah_distance?: string;
  makkah_duration_walk?: string;
  madinah_hotel_name?: string;
  madinah_hotel_star?: number;
  madinah_distance?: string;
  madinah_duration_walk?: string;
  included_items?: string;
  excluded_items?: string;
  equipment_list?: string;
  catalog_link?: string;
  itinerary_link?: string;
}

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

const PackageDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [packageData, setPackageData] = useState<PackageDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPackageDetail();
    }
  }, [id]);

  const fetchPackageDetail = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("packages")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      console.error("Error fetching package:", error);
    } else if (data) {
      // Type cast package_price to expected format
      setPackageData({
        ...data,
        package_price: data.package_price as any as {
          quad: number;
          triple: number;
          double: number;
        }
      });
    }
    setLoading(false);
  };

  const handleBooking = () => {
    if (!packageData) return;
    const message = `Halo Musafar Tour, saya tertarik dengan paket ${packageData.package_name}. Mohon info lebih lanjut untuk pendaftaran.`;
    const whatsappUrl = formatWhatsAppUrl("081917403797", message);
    window.open(whatsappUrl, "_blank");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const parseListItems = (items?: string) => {
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="py-8 border-b">
        <div className="container mx-auto px-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{packageData.package_name}</h1>
          <div className="flex flex-wrap gap-4 items-center text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>{format(new Date(packageData.departure_date), "dd MMMM yyyy", { locale: localeId })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span>{packageData.duration_days} Hari</span>
            </div>
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              <span>{packageData.flight}</span>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {packageData.flight_type}
            </Badge>
          </div>
        </div>
      </section>

      {/* Banner Image */}
      {packageData.banner_image && (
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="relative aspect-[1080/1350] md:aspect-[16/9] max-w-5xl mx-auto overflow-hidden rounded-lg">
              <img
                src={packageData.banner_image}
                alt={packageData.package_name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hotel Information */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Hotel className="h-6 w-6 text-primary" />
                    Informasi Hotel
                  </h2>
                  <div className="space-y-6">
                    {packageData.makkah_hotel_name && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-5 w-5 text-green-600" />
                          <h3 className="font-semibold text-lg">Makkah</h3>
                        </div>
                        <p className="text-lg font-medium mb-2">{packageData.makkah_hotel_name}</p>
                        {packageData.makkah_hotel_star && (
                          <StarRating rating={packageData.makkah_hotel_star} />
                        )}
                        {packageData.makkah_distance && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Jarak: {packageData.makkah_distance}
                            {packageData.makkah_duration_walk && ` • ${packageData.makkah_duration_walk} berjalan kaki`}
                          </p>
                        )}
                      </div>
                    )}
                    {packageData.madinah_hotel_name && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-5 w-5 text-green-600" />
                          <h3 className="font-semibold text-lg">Madinah</h3>
                        </div>
                        <p className="text-lg font-medium mb-2">{packageData.madinah_hotel_name}</p>
                        {packageData.madinah_hotel_star && (
                          <StarRating rating={packageData.madinah_hotel_star} />
                        )}
                        {packageData.madinah_distance && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Jarak: {packageData.madinah_distance}
                            {packageData.madinah_duration_walk && ` • ${packageData.madinah_duration_walk} berjalan kaki`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Included Items */}
              {packageData.included_items && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      Termasuk dalam Paket
                    </h2>
                    <ul className="space-y-3">
                      {parseListItems(packageData.included_items).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Excluded Items */}
              {packageData.excluded_items && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                      <XCircle className="h-6 w-6 text-red-600" />
                      Tidak Termasuk dalam Paket
                    </h2>
                    <ul className="space-y-3">
                      {parseListItems(packageData.excluded_items).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Equipment List */}
              {packageData.equipment_list && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                      <Package className="h-6 w-6 text-primary" />
                      Perlengkapan yang Perlu Dibawa
                    </h2>
                    <ul className="space-y-3">
                      {parseListItems(packageData.equipment_list).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Gallery Images */}
              {packageData.gallery_images && packageData.gallery_images.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-6">Galeri</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {packageData.gallery_images.map((image, idx) => (
                        <div key={idx} className="relative aspect-square overflow-hidden rounded-lg">
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

              {/* Links */}
              {(packageData.catalog_link || packageData.itinerary_link) && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-6">Dokumen Tambahan</h2>
                    <div className="flex flex-col gap-3">
                      {packageData.catalog_link && (
                        <a
                          href={packageData.catalog_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <ExternalLink className="h-5 w-5" />
                          <span>Lihat Katalog Lengkap</span>
                        </a>
                      )}
                      {packageData.itinerary_link && (
                        <a
                          href={packageData.itinerary_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <ExternalLink className="h-5 w-5" />
                          <span>Lihat Itinerary Detail</span>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Booking Card */}
            <div>
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-6">Harga Paket</h2>
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <div>
                        <p className="text-sm text-muted-foreground">Quad</p>
                        <p className="text-xs text-muted-foreground">(4 orang/kamar)</p>
                      </div>
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(packageData.package_price.quad)}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <div>
                        <p className="text-sm text-muted-foreground">Triple</p>
                        <p className="text-xs text-muted-foreground">(3 orang/kamar)</p>
                      </div>
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(packageData.package_price.triple)}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Double</p>
                        <p className="text-xs text-muted-foreground">(2 orang/kamar)</p>
                      </div>
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(packageData.package_price.double)}
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleBooking}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg"
                    size="lg"
                  >
                    Daftar Sekarang
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-4">
                    Hubungi kami melalui WhatsApp untuk informasi lebih lanjut dan pendaftaran
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PackageDetail;
