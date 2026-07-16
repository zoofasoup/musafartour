import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/Badge";
import { Loader2, Plus, Mail, Shield, Clock, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const roleOptions = [
  { value: "superadmin", label: "Super Admin (Full Access)" },
  { value: "product_admin", label: "Product Admin (Musafar Team)" },
  { value: "content_admin", label: "Content Admin (Marketing)" },
  { value: "agent_admin", label: "Agent Admin (Partner Support)" },
];

const roleColors: Record<string, string> = {
  superadmin: "bg-red-100 text-red-800",
  product_admin: "bg-blue-100 text-blue-800",
  content_admin: "bg-green-100 text-green-800",
  agent_admin: "bg-purple-100 text-purple-800",
};

export default function Team() {
  const { session, userRole, user } = useAuth();
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  
  // Loading states
  const [inviting, setInviting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Selected member for actions
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedNewRole, setSelectedNewRole] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    role: "product_admin",
  });

  const fetchTeam = async () => {
    if (!session?.access_token) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-team', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        method: 'GET'
      });

      if (error) throw error;
      setTeam(data.team || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mengambil data tim", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === "superadmin" || userRole === "admin") {
      fetchTeam();
    } else {
      setLoading(false);
    }
  }, [userRole, session]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    try {
      setInviting(true);
      const { data, error } = await supabase.functions.invoke('manage-team', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        method: 'POST',
        body: formData
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Undangan terkirim!", { description: `${formData.email} berhasil diundang sebagai ${formData.role}` });
      setIsInviteOpen(false);
      setFormData({ email: "", fullName: "", role: "product_admin" });
      fetchTeam();
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mengundang anggota", { description: err.message });
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async () => {
    if (!session?.access_token || !selectedMember) return;
    
    try {
      setUpdating(true);
      const { data, error } = await supabase.functions.invoke('manage-team', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        method: 'PUT',
        body: { userId: selectedMember.id, role: selectedNewRole }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Berhasil mengubah jabatan!");
      setIsChangeRoleOpen(false);
      fetchTeam();
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mengubah jabatan", { description: err.message });
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveAccess = async () => {
    if (!session?.access_token || !selectedMember) return;

    try {
      setRemoving(true);
      const { data, error } = await supabase.functions.invoke('manage-team', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        method: 'DELETE',
        body: { userId: selectedMember.id }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Akses berhasil dicabut", { description: `${selectedMember.full_name} tidak lagi memiliki akses admin.` });
      setIsRemoveOpen(false);
      fetchTeam();
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mencabut akses", { description: err.message });
    } finally {
      setRemoving(false);
    }
  };

  if (userRole !== "superadmin" && userRole !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] mx-auto">
        <Shield className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-700">Access Denied</h2>
        <p className="text-slate-500">Only Super Admins can manage the team.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Kelola anggota tim dan hak akses admin</p>
        </div>
        
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Undang Anggota Tim Baru</DialogTitle>
              <DialogDescription>
                Mereka akan menerima email berisi link untuk membuat password dan masuk ke dashboard.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input 
                  placeholder="Contoh: Budi Santoso" 
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Alamat Email</Label>
                <Input 
                  type="email" 
                  placeholder="budi@musafartour.com" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Role / Hak Akses</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>Batal</Button>
                <Button type="submit" disabled={inviting}>
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Kirim Undangan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Anggota</CardTitle>
          <CardDescription>Semua akun yang memiliki akses ke Admin Dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Terakhir Login</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center p-8 text-muted-foreground">
                        Belum ada anggota tim selain Anda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    team.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.full_name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={roleColors[member.role] || "bg-slate-100"}>
                            {roleOptions.find(r => r.value === member.role)?.label || member.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.last_sign_in_at ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {format(new Date(member.last_sign_in_at), 'dd MMM yyyy, HH:mm')}
                            </span>
                          ) : (
                            <span className="italic text-slate-400 text-sm">Belum pernah login</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" disabled={member.id === user?.id}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedMember(member);
                                  setSelectedNewRole(member.role);
                                  setIsChangeRoleOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Ubah Role
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedMember(member);
                                  setIsRemoveOpen(true);
                                }}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus Akses
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Role Modal */}
      <Dialog open={isChangeRoleOpen} onOpenChange={setIsChangeRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Hak Akses</DialogTitle>
            <DialogDescription>
              Ubah jabatan dan hak akses untuk <strong>{selectedMember?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Role / Hak Akses Baru</Label>
              <Select value={selectedNewRole} onValueChange={setSelectedNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsChangeRoleOpen(false)}>Batal</Button>
            <Button onClick={handleChangeRole} disabled={updating || selectedNewRole === selectedMember?.role}>
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Access Alert */}
      <AlertDialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cabut Akses Admin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus <strong>{selectedMember?.full_name}</strong> dari daftar admin. 
              Mereka tidak akan bisa lagi mengakses Admin Dashboard ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button variant="destructive" onClick={handleRemoveAccess} disabled={removing}>
              {removing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Ya, Cabut Akses
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
