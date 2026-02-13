import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CheckCircle, Circle, X, GripVertical, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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

interface PackageItem {
  id: string;
  name: string;
  type: "include" | "exclude";
  is_essential: boolean;
  display_order: number;
  is_active: boolean;
}

type SortField = "display_order" | "name" | "is_essential" | "is_active";
type SortDir = "asc" | "desc";

// Sortable row component
const SortableRow = ({
  item,
  type,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: PackageItem;
  type: "include" | "exclude";
  onEdit: (item: PackageItem) => void;
  onDelete: (item: PackageItem) => void;
  onToggle: (item: PackageItem) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={!item.is_active ? "opacity-50" : ""}
    >
      <TableCell className="w-10">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs w-10">{item.display_order}</TableCell>
      <TableCell className="font-medium">{item.name}</TableCell>
      {type === "include" && (
        <TableCell>
          <Badge variant={item.is_essential ? "default" : "secondary"} className="text-xs">
            {item.is_essential ? (
              <><CheckCircle className="h-3 w-3 mr-1" />Standard</>
            ) : (
              <><Circle className="h-3 w-3 mr-1" />Opsional</>
            )}
          </Badge>
        </TableCell>
      )}
      <TableCell>
        <Switch checked={item.is_active} onCheckedChange={() => onToggle(item)} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(item)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const PackageItems = () => {
  const [items, setItems] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<PackageItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"include" | "exclude">("include");
  const [formEssential, setFormEssential] = useState(false);
  const [formOrder, setFormOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [sortField, setSortField] = useState<SortField>("display_order");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("package_items")
      .select("*")
      .order("type")
      .order("display_order");
    if (error) { toast.error("Gagal memuat data"); return; }
    setItems((data as PackageItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const openAdd = (type: "include" | "exclude") => {
    setEditItem(null);
    setFormName("");
    setFormType(type);
    setFormEssential(type === "include");
    const maxOrder = items.filter(i => i.type === type).reduce((m, i) => Math.max(m, i.display_order), 0);
    setFormOrder(maxOrder + 1);
    setDialogOpen(true);
  };

  const openEdit = (item: PackageItem) => {
    setEditItem(item);
    setFormName(item.name);
    setFormType(item.type);
    setFormEssential(item.is_essential);
    setFormOrder(item.display_order);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Nama wajib diisi"); return; }
    setSaving(true);
    const payload = {
      name: formName.trim(),
      type: formType,
      is_essential: formType === "exclude" ? false : formEssential,
      display_order: formOrder,
    };

    if (editItem) {
      const { error } = await supabase.from("package_items").update(payload as any).eq("id", editItem.id);
      if (error) { toast.error("Gagal menyimpan"); setSaving(false); return; }
      toast.success("Item berhasil diupdate");
    } else {
      const { error } = await supabase.from("package_items").insert(payload as any);
      if (error) { toast.error("Gagal menambah"); setSaving(false); return; }
      toast.success("Item berhasil ditambah");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchItems();
  };

  const handleDelete = async (item: PackageItem) => {
    if (!confirm(`Hapus "${item.name}"?`)) return;
    const { error } = await supabase.from("package_items").delete().eq("id", item.id);
    if (error) { toast.error("Gagal menghapus"); return; }
    toast.success("Item dihapus");
    fetchItems();
  };

  const toggleActive = async (item: PackageItem) => {
    const { error } = await supabase
      .from("package_items")
      .update({ is_active: !item.is_active } as any)
      .eq("id", item.id);
    if (error) { toast.error("Gagal update"); return; }
    fetchItems();
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent, type: "include" | "exclude") => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const filtered = items.filter(i => i.type === type);
    const oldIndex = filtered.findIndex((i) => i.id === active.id);
    const newIndex = filtered.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(filtered, oldIndex, newIndex);

    // Optimistic update
    const updatedItems = items.map((item) => {
      if (item.type !== type) return item;
      const idx = reordered.findIndex((r) => r.id === item.id);
      return idx >= 0 ? { ...item, display_order: idx + 1 } : item;
    });
    setItems(updatedItems);

    // Persist to DB
    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from("package_items")
        .update({ display_order: i + 1 } as any)
        .eq("id", reordered[i].id);
    }
  }, [items]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortItems = (data: PackageItem[]): PackageItem[] => {
    return [...data].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "display_order": cmp = a.display_order - b.display_order; break;
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "is_essential": cmp = (a.is_essential === b.is_essential) ? 0 : a.is_essential ? -1 : 1; break;
        case "is_active": cmp = (a.is_active === b.is_active) ? 0 : a.is_active ? -1 : 1; break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const includeItems = items.filter(i => i.type === "include");
  const excludeItems = items.filter(i => i.type === "exclude");

  const renderTable = (data: PackageItem[], type: "include" | "exclude") => {
    const sorted = sortItems(data);
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {data.length} item {type === "include" ? "termasuk" : "tidak termasuk"}
          </p>
          <Button size="sm" onClick={() => openAdd(type)}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Item
          </Button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, type)}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-10 cursor-pointer select-none" onClick={() => toggleSort("display_order")}>
                    <div className="flex items-center">#<SortIcon field="display_order" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <div className="flex items-center">Nama<SortIcon field="name" /></div>
                  </TableHead>
                  {type === "include" && (
                    <TableHead className="w-32 cursor-pointer select-none" onClick={() => toggleSort("is_essential")}>
                      <div className="flex items-center">Kategori<SortIcon field="is_essential" /></div>
                    </TableHead>
                  )}
                  <TableHead className="w-20 cursor-pointer select-none" onClick={() => toggleSort("is_active")}>
                    <div className="flex items-center">Aktif<SortIcon field="is_active" /></div>
                  </TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <SortableContext items={sorted.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <TableBody>
                  {sorted.length === 0 ? (
                    <TableRow><TableCell colSpan={type === "include" ? 6 : 5} className="text-center text-muted-foreground py-8">Belum ada item</TableCell></TableRow>
                  ) : sorted.map((item) => (
                    <SortableRow
                      key={item.id}
                      item={item}
                      type={type}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onToggle={toggleActive}
                    />
                  ))}
                </TableBody>
              </SortableContext>
            </Table>
          </DndContext>
        </div>
      </div>
    );
  };

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
        <h1 className="text-3xl font-bold">Fasilitas Paket</h1>
        <p className="text-muted-foreground">Kelola item yang termasuk dan tidak termasuk dalam paket umroh. Drag untuk mengurutkan.</p>
      </div>

      <Tabs defaultValue="include">
        <TabsList>
          <TabsTrigger value="include">Termasuk ({includeItems.length})</TabsTrigger>
          <TabsTrigger value="exclude">Tidak Termasuk ({excludeItems.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="include" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Item Termasuk</CardTitle>
              <CardDescription>Item standard selalu termasuk di setiap paket. Item opsional bisa dipilih per paket.</CardDescription>
            </CardHeader>
            <CardContent>{renderTable(includeItems, "include")}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="exclude" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Item Tidak Termasuk</CardTitle>
              <CardDescription>Daftar item yang tidak termasuk di paket umroh</CardDescription>
            </CardHeader>
            <CardContent>{renderTable(excludeItems, "exclude")}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item" : "Tambah Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Item</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nama item..." />
            </div>
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as "include" | "exclude")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="include">Termasuk</SelectItem>
                  <SelectItem value="exclude">Tidak Termasuk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formType === "include" && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="font-medium">Standard (Wajib)</Label>
                  <p className="text-xs text-muted-foreground">Selalu termasuk di setiap paket</p>
                </div>
                <Switch checked={formEssential} onCheckedChange={setFormEssential} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Urutan</Label>
              <Input type="number" value={formOrder} onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackageItems;
