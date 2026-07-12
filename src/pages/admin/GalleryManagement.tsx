import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { Loader2, Plus, Edit, Trash2, Save, Grid, List } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { FileUpload } from "@/components/admin/FileUpload";
import { compressAndConvertToWebP } from "@/lib/imageUtils";
import { BulkActions, useBulkSelection, commonBulkActions } from "@/components/admin/BulkActions";

interface GalleryImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string;
  display_order: number;
  is_active: boolean;
}

const GalleryManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, isAdmin } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryImage | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectionMode, setSelectionMode] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    category: "umroh",
    display_order: 0,
  });

  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected, allSelected } = useBulkSelection(images);

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    clearSelection();
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchImages();
  }, [isAdmin]);

  // Auto-seed jamaah photos if gallery is empty
  useEffect(() => {
    const seedGallery = async () => {
      try {
        // Only seed if we actually have 0 images after loading
        if (images.length === 0 && !loading) {
          // Check database to be absolutely sure it's empty
          const { count } = await (supabase as any)
            .from("gallery_images")
            .select("*", { count: "exact", head: true });
            
          if (count === 0) {
            const defaultImages = [
              { title: "Keluarga Jamaah", description: "Kebersamaan jamaah Musafar Tour", image_url: "/gallery/jamaah-1.jpg", category: "umroh", display_order: 1, is_active: true },
              { title: "Fasilitas Hotel", description: "Kenyamanan fasilitas penginapan", image_url: "/gallery/jamaah-2.jpg", category: "umroh", display_order: 2, is_active: true },
              { title: "Ziarah Madinah", description: "Kunjungan sejarah di Madinah", image_url: "/gallery/jamaah-3.jpg", category: "umroh", display_order: 3, is_active: true },
              { title: "Ibadah Umroh", description: "Khusyuk dalam ibadah di Tanah Suci", image_url: "/gallery/jamaah-4.jpg", category: "umroh", display_order: 4, is_active: true }
            ];
            await (supabase as any).from("gallery_images").insert(defaultImages);
            fetchImages();
            toast({ title: "Success", description: "Default jamaah photos added to gallery!" });
          }
        }
      } catch (error) {
        console.error("Failed to seed gallery", error);
      }
    };

    if (isAdmin && images.length === 0 && !loading) {
      seedGallery();
    }
  }, [isAdmin, images.length, loading]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("gallery_images")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setImages(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load gallery images",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      
      const compressedFile = await compressAndConvertToWebP(file);
      const timestamp = Date.now();
      const fileName = `gallery-${formData.category}-${timestamp}.webp`;
      const filePath = `gallery/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('package-images')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('package-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: "" });
  };

  const handleSave = async () => {
    try {
      if (editingItem) {
        const { error } = await (supabase as any)
          .from("gallery_images")
          .update(formData)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast({ title: "Success", description: "Image updated" });
      } else {
        const { error } = await (supabase as any)
          .from("gallery_images")
          .insert({ ...formData, is_active: true });
        if (error) throw error;
        toast({ title: "Success", description: "Image added" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchImages();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this image?")) return;
    try {
      const { error } = await (supabase as any).from("gallery_images").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Image deleted" });
      fetchImages();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleBulkAction = async (actionId: string, ids: string[]) => {
    try {
      switch (actionId) {
        case "delete":
          const { error: deleteError } = await (supabase as any)
            .from("gallery_images")
            .delete()
            .in("id", ids);
          if (deleteError) throw deleteError;
          sonnerToast.success(`${ids.length} gambar berhasil dihapus`);
          break;
        case "activate":
          const { error: activateError } = await (supabase as any)
            .from("gallery_images")
            .update({ is_active: true })
            .in("id", ids);
          if (activateError) throw activateError;
          sonnerToast.success(`${ids.length} gambar berhasil diaktifkan`);
          break;
        case "deactivate":
          const { error: deactivateError } = await (supabase as any)
            .from("gallery_images")
            .update({ is_active: false })
            .in("id", ids);
          if (deactivateError) throw deactivateError;
          sonnerToast.success(`${ids.length} gambar berhasil dinonaktifkan`);
          break;
        case "export":
          exportToCSV(ids);
          break;
      }
      clearSelection();
      fetchImages();
    } catch (error: any) {
      sonnerToast.error("Gagal: " + error.message);
    }
  };

  const exportToCSV = (ids: string[]) => {
    const selectedImages = images.filter((img) => ids.includes(img.id));
    const headers = ["Title", "Description", "Category", "Image URL", "Status", "Display Order"];
    const rows = selectedImages.map((img) => [
      `"${img.title}"`,
      `"${img.description || ""}"`,
      img.category,
      img.image_url,
      img.is_active ? "Active" : "Inactive",
      img.display_order,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `gallery-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    sonnerToast.success(`${ids.length} gambar berhasil di-export`);
  };

  const openEditDialog = (item: GalleryImage) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || "",
      image_url: item.image_url,
      category: item.category,
      display_order: item.display_order,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      description: "",
      image_url: "",
      category: "umroh",
      display_order: 0,
    });
  };

  const bulkActions = [
    commonBulkActions.activate,
    commonBulkActions.deactivate,
    commonBulkActions.export,
    commonBulkActions.delete,
  ];

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
          <h1 className="text-3xl font-bold">Gallery Management</h1>
          <p className="text-muted-foreground">Manage photo galleries</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          {selectionMode ? (
            <Button variant="outline" onClick={handleExitSelectionMode}>
              Batal
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setSelectionMode(true)}>
              Pilih
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Image
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit" : "Add"} Gallery Image</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Update" : "Add"} an image to the gallery
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Image</Label>
                  <FileUpload
                    onFileSelect={handleImageUpload}
                    onRemove={handleRemoveImage}
                    currentImage={formData.image_url}
                    loading={uploading}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(val) => setFormData({ ...formData, category: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="umroh">Umroh</SelectItem>
                        <SelectItem value="haji">Haji</SelectItem>
                        <SelectItem value="wisata">Wisata Halal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display_order">Display Order</Label>
                    <Input
                      id="display_order"
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {selectionMode && (
        <BulkActions
          selectedIds={selectedIds}
          totalCount={images.length}
          onSelectAll={selectAll}
          allSelected={allSelected}
          actions={bulkActions}
          onAction={handleBulkAction}
        />
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {images.map((item) => (
            <div 
              key={item.id} 
              className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${isSelected(item.id) ? "ring-4 ring-primary scale-[0.95]" : "hover:shadow-md"}`}
              onClick={() => {
                if (selectionMode) {
                  toggleSelect(item.id);
                } else {
                  openEditDialog(item);
                }
              }}
            >
              <img
                src={item.image_url}
                alt={item.title}
                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
              />
              
              {/* Overlay gradient on hover or selection */}
              <div className={`absolute inset-0 transition-opacity duration-200 ${isSelected(item.id) || selectionMode ? "bg-black/20 opacity-100" : "bg-gradient-to-t from-black/60 via-black/0 to-black/20 opacity-0 group-hover:opacity-100"}`}>
                
                {/* Checkbox (Top Left) */}
                <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected(item.id)}
                    onCheckedChange={(checked) => {
                      toggleSelect(item.id);
                      if (checked && !selectionMode) setSelectionMode(true);
                    }}
                    className={`h-5 w-5 rounded-full border-2 border-white/80 bg-black/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground ${isSelected(item.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity shadow-sm`}
                  />
                </div>

                {/* Actions (Top Right) - Only show if not in selection mode */}
                {!selectionMode && (
                  <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-sm" onClick={() => openEditDialog(item)}>
                      <Edit className="h-4 w-4 text-slate-700" />
                    </Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full bg-red-500/90 hover:bg-red-500 shadow-sm" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                )}
                
                {/* Info (Bottom Left) */}
                <div className="absolute bottom-3 left-3 right-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-sm font-medium truncate drop-shadow-md">{item.title}</p>
                  {item.category && <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80 drop-shadow-md">{item.category}</p>}
                </div>
              </div>
              
              {!item.is_active && (
                <div className="absolute bottom-3 right-3 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white font-medium backdrop-blur-sm">
                  Inactive
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  {selectionMode && <th className="p-4 w-12"></th>}
                  <th className="p-4 text-left">Image</th>
                  <th className="p-4 text-left">Title</th>
                  <th className="p-4 text-left">Category</th>
                  <th className="p-4 text-left">Order</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {images.map((item) => (
                  <tr key={item.id} className={`border-b ${isSelected(item.id) ? "bg-muted/50" : ""}`}>
                    {selectionMode && (
                      <td className="p-4">
                        <Checkbox
                          checked={isSelected(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          aria-label={`Select ${item.title}`}
                        />
                      </td>
                    )}
                    <td className="p-4">
                      <img src={item.image_url} alt={item.title} className="w-16 h-12 object-cover rounded" />
                    </td>
                    <td className="p-4 font-medium">{item.title}</td>
                    <td className="p-4 capitalize">{item.category}</td>
                    <td className="p-4">{item.display_order}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GalleryManagement;
