import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, Save, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface Package {
  id: string;
  package_name: string;
}

interface Schedule {
  id: string;
  package_id: string | null;
  departure_date: string;
  return_date: string;
  available_seats: number;
  status: string;
  notes: string | null;
  packages?: Package;
}

const JadwalKeberangkatan = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, isAdmin } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    package_id: "",
    departure_date: "",
    return_date: "",
    available_seats: 0,
    status: "open",
    notes: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchSchedules();
      fetchPackages();
    }
  }, [isAdmin]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("departure_schedules")
        .select("*, packages(id, package_name)")
        .order("departure_date", { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load schedules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("packages")
        .select("id, package_name")
        .eq("status", "published")
        .order("package_name");

      if (error) throw error;
      setPackages(data || []);
    } catch (error: any) {
      console.error("Error fetching packages:", error);
    }
  };

  const handleSave = async () => {
    try {
      const dataToSave = {
        ...formData,
        package_id: formData.package_id || null,
        available_seats: parseInt(formData.available_seats as any),
      };

      if (editingItem) {
        const { error } = await (supabase as any)
          .from("departure_schedules")
          .update(dataToSave)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast({ title: "Success", description: "Schedule updated" });
      } else {
        const { error } = await (supabase as any)
          .from("departure_schedules")
          .insert(dataToSave);
        if (error) throw error;
        toast({ title: "Success", description: "Schedule created" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchSchedules();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this schedule?")) return;
    try {
      const { error } = await (supabase as any).from("departure_schedules").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Schedule deleted" });
      fetchSchedules();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openEditDialog = (item: Schedule) => {
    setEditingItem(item);
    setFormData({
      package_id: item.package_id || "",
      departure_date: item.departure_date,
      return_date: item.return_date,
      available_seats: item.available_seats,
      status: item.status,
      notes: item.notes || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      package_id: "",
      departure_date: "",
      return_date: "",
      available_seats: 0,
      status: "open",
      notes: "",
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
          <h1 className="text-3xl font-bold">Jadwal Keberangkatan</h1>
          <p className="text-muted-foreground">Manage departure schedules</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit" : "Add"} Schedule</DialogTitle>
              <DialogDescription>
                {editingItem ? "Update" : "Create"} a departure schedule
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="package_id">Package (Optional)</Label>
                <Select
                  value={formData.package_id}
                  onValueChange={(val) => setFormData({ ...formData, package_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.package_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="departure_date">Departure Date</Label>
                  <Input
                    id="departure_date"
                    type="date"
                    value={formData.departure_date}
                    onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="return_date">Return Date</Label>
                  <Input
                    id="return_date"
                    type="date"
                    value={formData.return_date}
                    onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="available_seats">Available Seats</Label>
                  <Input
                    id="available_seats"
                    type="number"
                    value={formData.available_seats}
                    onChange={(e) => setFormData({ ...formData, available_seats: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="full">Full</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes"
                />
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
          <CardTitle>Departure Schedules</CardTitle>
          <CardDescription>All scheduled departures</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Return</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.packages?.package_name || "General"}
                  </TableCell>
                  <TableCell>{format(new Date(item.departure_date), "dd MMM yyyy")}</TableCell>
                  <TableCell>{format(new Date(item.return_date), "dd MMM yyyy")}</TableCell>
                  <TableCell>{item.available_seats}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.status === 'open' ? 'bg-green-100 text-green-800' : 
                      item.status === 'full' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{item.notes}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
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

export default JadwalKeberangkatan;
