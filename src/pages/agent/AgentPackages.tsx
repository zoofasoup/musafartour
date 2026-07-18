import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Link, useNavigate } from "react-router-dom";
import { 
  Star, 
  Plane, 
  Users, 
  Calendar, 
  MapPin,
  Share2,
  FileText,
  Eye,
  Search,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
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
  makkah_hotel_name: string | null;
  makkah_hotel_star: number | null;
  makkah_distance: string | null;
  package_price: PackagePrice;
  hemat_package_price?: PackagePrice | null;
  five_star_package_price?: PackagePrice | null;
  pelataran_package_price?: PackagePrice | null;
  banner_image: string | null;
  status: string;
  slots_total: number | null;
  slots_filled: number | null;
  commission_rate: number | null;
  catalog_link: string | null;
  available_tiers?: string[] | null;
}

/** Lowest quad price across whichever tier(s) this package actually has set. */
const getLowestQuad = (pkg: Package): number => {
  const prices = [
    pkg.package_price,
    pkg.hemat_package_price,
    pkg.five_star_package_price,
    pkg.pelataran_package_price,
  ]
    .map((p) => p?.quad)
    .filter((q): q is number => typeof q === "number" && q > 0);
  return prices.length ? Math.min(...prices) : 0;
};

const AgentPackages = () => {
  const { agent } = useAgentAuth();
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("departure_asc");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const { data: packages, isLoading } = useQuery({
    queryKey: ["agent-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("status", "published")
        .order("departure_date", { ascending: true });

      if (error) throw error;
      return data as unknown as Package[];
    },
  });

  const formatPrice = (price: number) => formatCurrency(price);

  const calculateCommission = (price: number, rate: number | null) => {
    const commissionRate = rate || 4.5;
    return (price * commissionRate) / 100;
  };

  const getAvgHotelStars = (pkg: Package) => {
    const stars = [
      pkg.makkah_hotel_star,
      pkg.madinah_hotel_star
    ].filter(Boolean) as number[];
    if (stars.length === 0) return 0;
    return Math.round(stars.reduce((a, b) => a + b, 0) / stars.length);
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

  const getCategory = (pkg: Package) => {
    const avgStars = getAvgHotelStars(pkg);
    if (avgStars >= 5) return "premium";
    if (avgStars >= 4) return "standard";
    return "ekonomis";
  };

  const filteredPackages = packages?.filter((pkg) => {
    // Category filter
    if (categoryFilter !== "all") {
      const category = getCategory(pkg);
      if (category !== categoryFilter) return false;
    }

    // Status filter
    if (statusFilter !== "all") {
      const slotStatus = getSlotStatus(pkg);
      if (statusFilter === "open" && slotStatus.status !== "open") return false;
      if (statusFilter === "almost" && slotStatus.status !== "almost") return false;
      if (statusFilter === "full" && slotStatus.status !== "full") return false;
    }

    return true;
  });

  const sortedPackages = filteredPackages?.sort((a, b) => {
    switch (sortBy) {
      case "departure_asc":
        return new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime();
      case "price_asc":
        return getLowestQuad(a) - getLowestQuad(b);
      case "price_desc":
        return getLowestQuad(b) - getLowestQuad(a);
      default:
        return 0;
    }
  });

  const handleShare = (pkg: Package) => {
    setSelectedPackage(pkg);
    setShareModalOpen(true);
  };

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < count ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto w-full pb-20 md:pb-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-20 md:pb-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Paket Umroh</h1>
        <p className="text-muted-foreground">Browse dan share paket ke prospek kamu</p>
      </div>

      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Filter & Sort</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  <SelectItem value="ekonomis">Ekonomis</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="almost">Almost Full</SelectItem>
                  <SelectItem value="full">Full Booked</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="departure_asc">Keberangkatan Terdekat</SelectItem>
                  <SelectItem value="price_asc">Harga Terendah</SelectItem>
                  <SelectItem value="price_desc">Harga Tertinggi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Menampilkan {sortedPackages?.length || 0} paket
        </div>

        {/* Package Cards */}
        <div className="space-y-4">
          {sortedPackages?.map((pkg) => {
            const slotStatus = getSlotStatus(pkg);
            const avgStars = getAvgHotelStars(pkg);
            const lowestPrice = getLowestQuad(pkg);
            const commission = calculateCommission(lowestPrice, pkg.commission_rate);

            return (
              <Card key={pkg.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row">
                  {/* Left Side - Info */}
                  <div className="flex-1 p-4 md:p-6 space-y-4">
                    {/* Header */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg md:text-xl font-bold">{pkg.package_name}</h3>
                        <Badge 
                          variant={slotStatus.color === "success" ? "default" : slotStatus.color === "warning" ? "secondary" : "destructive"}
                          className={slotStatus.color === "success" ? "bg-emerald-500" : slotStatus.color === "warning" ? "bg-yellow-500 text-black" : ""}
                        >
                          {slotStatus.status === "open" && "🟢 "}
                          {slotStatus.status === "almost" && "🟡 "}
                          {slotStatus.status === "full" && "🔴 "}
                          {slotStatus.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {renderStars(avgStars)}
                        <span className="text-sm text-muted-foreground ml-1">Hotel {avgStars} Bintang</span>
                      </div>
                    </div>

                    {/* Date & Duration */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: id })}
                        </span>
                      </div>
                      <div>{pkg.duration_days} Hari</div>
                    </div>

                    {/* Price & Commission */}
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-primary">
                        {formatPrice(lowestPrice)}
                        <span className="text-sm font-normal text-muted-foreground">/pax</span>
                      </div>
                      <div className="text-emerald-600 font-semibold">
                        💰 Komisi: {formatPrice(commission)}
                      </div>
                    </div>

                    {/* Hotel Info */}
                    <div className="grid gap-2 text-sm">
                      {pkg.makkah_hotel_name && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium">Makkah:</span> {pkg.makkah_hotel_name}
                            {pkg.makkah_hotel_star && (
                              <span className="text-yellow-600"> ({pkg.makkah_hotel_star}⭐)</span>
                            )}
                            {pkg.makkah_distance && (
                              <span className="text-muted-foreground"> - {pkg.makkah_distance}</span>
                            )}
                          </div>
                        </div>
                      )}
                      {pkg.madinah_hotel_name && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium">Madinah:</span> {pkg.madinah_hotel_name}
                            {pkg.madinah_hotel_star && (
                              <span className="text-yellow-600"> ({pkg.madinah_hotel_star}⭐)</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Airline */}
                    <div className="flex items-center gap-2 text-sm">
                      <Plane className="h-4 w-4 text-muted-foreground" />
                      <span>{pkg.flight}</span>
                      <Badge variant="outline" className="text-xs">
                        {pkg.flight_type}
                      </Badge>
                    </div>
                  </div>

                  {/* Right Side - Image & Actions */}
                  <div className="md:w-[280px] bg-muted/30 p-4 flex flex-col gap-3">
                    {/* Thumbnail */}
                    <div className="aspect-video rounded-lg bg-muted overflow-hidden">
                      {pkg.banner_image ? (
                        <img
                          src={pkg.banner_image}
                          alt={pkg.package_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <span className="text-4xl">🕌</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button
                        className="w-full"
                        onClick={() => navigate(`/agent/packages/${pkg.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Lihat Detail
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                        onClick={() => handleShare(pkg)}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Paket
                      </Button>
                      {pkg.catalog_link && (
                        <Button
                          variant="outline"
                          className="w-full"
                          asChild
                        >
                          <a href={pkg.catalog_link} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-4 w-4 mr-2" />
                            Katalog PDF
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {sortedPackages?.length === 0 && (
            <Card className="p-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Tidak ada paket ditemukan</h3>
              <p className="text-muted-foreground">
                Coba ubah filter untuk melihat paket lainnya
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {selectedPackage && (
        <PackageShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          package={selectedPackage}
          agentCode={agent?.referral_code || ""}
        />
      )}
    </div>
  );
};

export default AgentPackages;
