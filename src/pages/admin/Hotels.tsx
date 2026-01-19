import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Hotel, MapPin, Star, ExternalLink, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface HotelData {
  id: string;
  name: string;
  star_rating: number;
  location: "makkah" | "madinah";
  distance: string;
  walking_duration: string;
  created_at: string;
  exterior_photo: string | null;
  lobby_photo: string | null;
  room_photo: string | null;
  google_maps_url: string | null;
}

const ImageCarousel = ({ images }: { images: (string | null)[] }) => {
  const validImages = images.filter((img): img is string => !!img);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (validImages.length === 0) {
    return (
      <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  return (
    <div className="relative w-full h-32 rounded-lg overflow-hidden group">
      <img
        src={validImages[currentIndex]}
        alt="Hotel"
        className="w-full h-full object-cover"
      />
      {validImages.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {validImages.map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full ${idx === currentIndex ? "bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const HotelCard = ({
  hotel,
  onEdit,
  onDelete,
}: {
  hotel: HotelData;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <ImageCarousel
          images={[hotel.exterior_photo, hotel.lobby_photo, hotel.room_photo]}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2">
          <Hotel className="h-5 w-5 mt-0.5 text-primary shrink-0" />
          <div>
            <div className="font-bold leading-tight">{hotel.name}</div>
            <div className="flex gap-0.5 mt-1">
              {[...Array(hotel.star_rating)].map((_, i) => (
                <Star
                  key={i}
                  className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Jarak:</span>
            <span className="font-medium">{hotel.distance}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Waktu Tempuh:</span>
            <span className="font-medium">{hotel.walking_duration}</span>
          </div>
        </div>

        {hotel.google_maps_url && (
          <a
            href={hotel.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <MapPin className="h-3.5 w-3.5" />
            Lihat di Google Maps
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onEdit}
          >
            <Pencil className="mr-2 h-3 w-3" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Hotels = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<HotelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("hotels")
        .select("*")
        .order("location", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setHotels((data as HotelData[]) || []);
    } catch (error) {
      console.error("Error fetching hotels:", error);
      toast.error("Gagal memuat data hotel");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("hotels")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Hotel berhasil dihapus");
      fetchHotels();
    } catch (error) {
      console.error("Error deleting hotel:", error);
      toast.error("Gagal menghapus hotel");
    } finally {
      setDeleteId(null);
    }
  };

  const makkahHotels = hotels.filter((h) => h.location === "makkah");
  const madinahHotels = hotels.filter((h) => h.location === "madinah");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Hotel</h1>
          <p className="text-muted-foreground">
            Kelola data hotel Makkah dan Madinah
          </p>
        </div>
        <Button onClick={() => navigate("/admin/hotels/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Hotel
        </Button>
      </div>

      {/* Makkah Hotels */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Hotel Makkah ({makkahHotels.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {makkahHotels.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              onEdit={() => navigate(`/admin/hotels/${hotel.id}`)}
              onDelete={() => setDeleteId(hotel.id)}
            />
          ))}
        </div>
      </div>

      {/* Madinah Hotels */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Hotel Madinah ({madinahHotels.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {madinahHotels.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              onEdit={() => navigate(`/admin/hotels/${hotel.id}`)}
              onDelete={() => setDeleteId(hotel.id)}
            />
          ))}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Hotel</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus hotel ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Hotels;
