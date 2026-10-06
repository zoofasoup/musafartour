import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmDialog } from "@/components/admin/useConfirmDialog";

interface SellingPoint {
  id: string;
  title: string;
  description: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

const SellingPoints = () => {
  const { ask, dialog } = useConfirmDialog();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, isAdmin: isOwner, userRole } = useAuth();
  // The menu also shows this page to content_admin, so the page has to let that role in (it used to render blank).
  const isAdmin = isOwner || userRole === "content_admin";
  
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<SellingPoint[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<SellingPoint | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    icon: "check-circle",
    display_order: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchPoints();
    }
  }, [isAdmin]);

  const fetchPoints = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("selling_points")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPoints(data || []);
    } catch (error: any) {
      console.error("Error fetching selling points:", error);
      toast({
        title: "Gagal",
        description: "Poin keunggulan belum bisa dimuat.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingPoint) {
        const { error } = await (supabase as any)
          .from("selling_points")
          .update(formData)
          .eq("id", editingPoint.id);

        if (error) throw error;
        toast({ title: "Berhasil", description: "Poin keunggulan diperbarui." });
      } else {
        const { error } = await (supabase as any)
          .from("selling_points")
          .insert({ ...formData, is_active: true });

        if (error) throw error;
        toast({ title: "Berhasil", description: "Poin keunggulan ditambahkan." });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPoints();
    } catch (error: any) {
      toast({
        title: "Gagal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = (id: string) =>
    ask({ title: "Hapus poin keunggulan ini?", description: "Poin ini hilang dari website dan tidak bisa dikembalikan." }, () => performDelete(id));

  const performDelete = async (id: string) => {

    try {
      const { error } = await (supabase as any)
        .from("selling_points")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Berhasil", description: "Poin keunggulan dihapus." });
      fetchPoints();
    } catch (error: any) {
      toast({
        title: "Gagal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (point: SellingPoint) => {
    setEditingPoint(point);
    setFormData({
      title: point.title,
      description: point.description,
      icon: point.icon,
      display_order: point.display_order,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPoint(null);
    setFormData({
      title: "",
      description: "",
      icon: "check-circle",
      display_order: 0,
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Poin Keunggulan</h1>
          <p className="text-muted-foreground">Atur keunggulan utama yang tampil di beranda</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah poin keunggulan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPoint ? "Ubah" : "Tambah"} poin keunggulan</DialogTitle>
              <DialogDescription>
                {editingPoint ? "Perbarui" : "Buat"} poin keunggulan untuk beranda
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Judul</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon">Ikon (nama dari Lucide)</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="Contoh: check-circle"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_order">Urutan tampil</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order || ""}
                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value ? parseInt(e.target.value) : 0 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar poin keunggulan</CardTitle>
          <CardDescription>Semua poin keunggulan yang tampil di website</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Urutan</TableHead>
                <TableHead>Judul</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Ikon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map((point) => (
                <TableRow key={point.id}>
                  <TableCell>{point.display_order}</TableCell>
                  <TableCell className="font-medium">{point.title}</TableCell>
                  <TableCell className="max-w-md truncate">{point.description}</TableCell>
                  <TableCell>{point.icon}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${point.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {point.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" aria-label="Ubah" onClick={() => openEditDialog(point)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label="Hapus" onClick={() => handleDelete(point.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {dialog}
    </div>
  );
};

export default SellingPoints;
