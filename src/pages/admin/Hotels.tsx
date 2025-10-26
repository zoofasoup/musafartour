import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Hotel, MapPin, Star } from "lucide-react";
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

interface Hotel {
  id: string;
  name: string;
  star_rating: number;
  location: "makkah" | "madinah";
  distance: string;
  walking_duration: string;
  created_at: string;
}

const Hotels = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<Hotel[]>([]);
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
      setHotels((data as Hotel[]) || []);
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
            <Card key={hotel.id}>
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <Hotel className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <div className="font-bold">{hotel.name}</div>
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
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jarak:</span>
                    <span className="font-medium">{hotel.distance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Waktu Tempuh:</span>
                    <span className="font-medium">{hotel.walking_duration}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/admin/hotels/${hotel.id}`)}
                  >
                    <Pencil className="mr-2 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteId(hotel.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
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
            <Card key={hotel.id}>
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <Hotel className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <div className="font-bold">{hotel.name}</div>
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
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jarak:</span>
                    <span className="font-medium">{hotel.distance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Waktu Tempuh:</span>
                    <span className="font-medium">{hotel.walking_duration}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/admin/hotels/${hotel.id}`)}
                  >
                    <Pencil className="mr-2 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteId(hotel.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
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
