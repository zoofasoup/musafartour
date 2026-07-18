import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
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
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface MarketingMaterial {
  id: string;
  title: string;
  category: string;
  package_id: string | null;
  file_url: string;
  is_active: boolean;
  created_at: string;
  packages?: {
    package_name: string;
  };
}

const MarketingMaterials = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<MarketingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from("marketing_materials")
        .select(`
          id,
          title,
          category,
          package_id,
          file_url,
          is_active,
          created_at,
          packages (
            package_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMaterials(data as any);
    } catch (error: any) {
      toast.error("Gagal memuat data materi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("marketing_materials")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Materi berhasil dihapus");
      setDeleteId(null);
      fetchMaterials();
    } catch (error: any) {
      toast.error("Gagal menghapus materi: " + error.message);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'visual':
        return <Badge variant="default" className="bg-purple-600">Visual</Badge>;
      case 'copy':
        return <Badge variant="default" className="bg-blue-600">Copywriting</Badge>;
      case 'video':
        return <Badge variant="default" className="bg-pink-600">Video</Badge>;
      default:
        return <Badge variant="secondary">{category}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Materials</h1>
          <p className="text-muted-foreground">Kelola materi promosi untuk agen dan publik</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/admin/marketing-materials/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Materi
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Materi Promosi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Target Paket</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tgl Dibuat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Belum ada materi promosi
                    </TableCell>
                  </TableRow>
                ) : (
                  materials.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {m.title}
                          {m.file_url && m.category !== 'copy' && (
                            <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(m.category)}</TableCell>
                      <TableCell>
                        {m.package_id ? (
                          <span className="text-sm font-medium">{m.packages?.package_name}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">General (Semua Paket)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.is_active ? "default" : "secondary"}>
                          {m.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(m.created_at), "d MMM yyyy", { locale: idLocale })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/marketing-materials/${m.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(m.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Materi?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Materi promosi akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MarketingMaterials;
