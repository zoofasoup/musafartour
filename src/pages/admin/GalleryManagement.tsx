import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, Save, Image } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryImage | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    category: "umroh",
    display_order: 0,
  });

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
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="Upload to storage first"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((item) => (
          <Card key={item.id}>
            <CardHeader className="p-0">
              <div className="aspect-video relative overflow-hidden rounded-t-lg">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="object-cover w-full h-full"
                />
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
    </div>
  );
};

export default GalleryManagement;
