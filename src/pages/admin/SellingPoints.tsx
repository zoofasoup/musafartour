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

interface SellingPoint {
  id: string;
  title: string;
  description: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

const SellingPoints = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, isAdmin } = useAuth();
  
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
        title: "Error",
        description: "Failed to load selling points",
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
        toast({ title: "Success", description: "Selling point updated" });
      } else {
        const { error } = await (supabase as any)
          .from("selling_points")
          .insert({ ...formData, is_active: true });

        if (error) throw error;
        toast({ title: "Success", description: "Selling point created" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPoints();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this selling point?")) return;

    try {
      const { error } = await (supabase as any)
        .from("selling_points")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Selling point deleted" });
      fetchPoints();
    } catch (error: any) {
      toast({
        title: "Error",
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
          <h1 className="text-3xl font-bold">Selling Points</h1>
          <p className="text-muted-foreground">Manage key features and benefits</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Selling Point
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPoint ? "Edit" : "Add"} Selling Point</DialogTitle>
              <DialogDescription>
                {editingPoint ? "Update" : "Create"} a selling point for your homepage
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
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon (Lucide name)</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="e.g., check-circle"
                  />
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

      <Card>
        <CardHeader>
          <CardTitle>Selling Points List</CardTitle>
          <CardDescription>Manage all selling points displayed on your website</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                      {point.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(point)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(point.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellingPoints;
