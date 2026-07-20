import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Backpack, ImageOff } from "lucide-react";
import { FileUpload } from "@/components/admin/FileUpload";
import { compressAndConvertToWebP } from "@/lib/imageUtils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface EquipmentItem {
  id: string;
  name: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

const SortableCard = ({
  item,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: EquipmentItem;
  onEdit: (item: EquipmentItem) => void;
  onDelete: (item: EquipmentItem) => void;
  onToggle: (item: EquipmentItem) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 border rounded-lg p-3 bg-card ${!item.is_active ? "opacity-50" : ""}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="h-14 w-14 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <span className="font-medium flex-1 truncate">{item.name}</span>

      <Switch checked={item.is_active} onCheckedChange={() => onToggle(item)} />

      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(item)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

const Equipment = () => {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<EquipmentItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("equipment_items")
      .select("*")
      .order("display_order");
    if (error) { toast.error("Gagal memuat data"); setLoading(false); return; }
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setFormName("");
    setFormImageUrl(null);
    setDialogOpen(true);
  };

  const openEdit = (item: EquipmentItem) => {
    setEditItem(item);
    setFormName(item.name);
    setFormImageUrl(item.image_url);
    setDialogOpen(true);
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const compressed = await compressAndConvertToWebP(file);
      const filePath = `equipment/equipment-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("package-images")
        .upload(filePath, compressed, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("package-images").getPublicUrl(filePath);
      setFormImageUrl(publicUrl);
    } catch (error: any) {
      toast.error(error.message || "Gagal upload gambar");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Nama wajib diisi"); return; }
    setSaving(true);
    const payload = { name: formName.trim(), image_url: formImageUrl };

    if (editItem) {
      const { error } = await supabase.from("equipment_items").update(payload).eq("id", editItem.id);
      if (error) { toast.error("Gagal menyimpan"); setSaving(false); return; }
      toast.success("Item berhasil diupdate");
    } else {
      const maxOrder = items.reduce((m, i) => Math.max(m, i.display_order), 0);
      const { error } = await supabase.from("equipment_items").insert({ ...payload, display_order: maxOrder + 1 });
      if (error) { toast.error("Gagal menambah"); setSaving(false); return; }
      toast.success("Item berhasil ditambah");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchItems();
  };

  const handleDelete = async (item: EquipmentItem) => {
    if (!confirm(`Hapus "${item.name}"?`)) return;
    const { error } = await supabase.from("equipment_items").delete().eq("id", item.id);
    if (error) { toast.error("Gagal menghapus"); return; }
    toast.success("Item dihapus");
    fetchItems();
  };

  const toggleActive = async (item: EquipmentItem) => {
    const { error } = await supabase.from("equipment_items").update({ is_active: !item.is_active }).eq("id", item.id);
    if (error) { toast.error("Gagal update"); return; }
    fetchItems();
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered.map((item, idx) => ({ ...item, display_order: idx + 1 })));

    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("equipment_items").update({ display_order: i + 1 }).eq("id", reordered[i].id);
    }
  }, [items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Perlengkapan Jamaah</h1>
        <p className="text-muted-foreground">Kelola daftar perlengkapan yang diterima jamaah, lengkap dengan foto. Drag untuk mengurutkan.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Backpack className="h-5 w-5 text-primary" /> Item Perlengkapan</CardTitle>
            <CardDescription>{items.length} item terdaftar</CardDescription>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Item
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Belum ada item perlengkapan</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map((item) => (
                    <SortableCard key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item" : "Tambah Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Item</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Contoh: Koper" />
            </div>
            <FileUpload
              label="Foto"
              currentImage={formImageUrl}
              onFileSelect={handleUpload}
              onRemove={() => setFormImageUrl(null)}
              loading={uploading}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Equipment;
