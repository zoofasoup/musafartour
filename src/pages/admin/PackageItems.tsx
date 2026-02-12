import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2, CheckCircle, Circle, X } from "lucide-react";

interface PackageItem {
  id: string;
  name: string;
  type: "include" | "exclude";
  is_essential: boolean;
  display_order: number;
  is_active: boolean;
}

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

  const includeItems = items.filter(i => i.type === "include");
  const excludeItems = items.filter(i => i.type === "exclude");

  const renderTable = (data: PackageItem[], type: "include" | "exclude") => (
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Nama</TableHead>
              {type === "include" && <TableHead className="w-32">Kategori</TableHead>}
              <TableHead className="w-20">Aktif</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={type === "include" ? 5 : 4} className="text-center text-muted-foreground py-8">Belum ada item</TableCell></TableRow>
            ) : data.map((item) => (
              <TableRow key={item.id} className={!item.is_active ? "opacity-50" : ""}>
                <TableCell className="text-muted-foreground text-xs">{item.display_order}</TableCell>
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
                  <Switch checked={item.is_active} onCheckedChange={() => toggleActive(item)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

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
        <p className="text-muted-foreground">Kelola item yang termasuk dan tidak termasuk dalam paket umroh</p>
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
