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
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    category: "umroh",
    display_order: 0,
  });

  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected, allSelected } = useBulkSelection(images);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchImages();
  }, [isAdmin]);

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

      <BulkActions
        selectedIds={selectedIds}
        totalCount={images.length}
        onSelectAll={selectAll}
        allSelected={allSelected}
        actions={bulkActions}
        onAction={handleBulkAction}
      />

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((item) => (
            <Card key={item.id} className={isSelected(item.id) ? "ring-2 ring-primary" : ""}>
              <CardHeader className="p-0 relative">
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={isSelected(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                    aria-label={`Select ${item.title}`}
                    className="bg-white"
                  />
                </div>
                <div className="aspect-video relative overflow-hidden rounded-t-lg">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="object-cover w-full h-full"
                  />
                  {!item.is_active && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">Inactive</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg mb-2">{item.title}</CardTitle>
                <CardDescription className="mb-4">{item.description}</CardDescription>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="p-4 w-12"></th>
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
                    <td className="p-4">
                      <Checkbox
                        checked={isSelected(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        aria-label={`Select ${item.title}`}
                      />
                    </td>
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
