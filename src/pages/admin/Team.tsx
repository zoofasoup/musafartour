import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Mail, Shield, Clock, MoreHorizontal, Edit, UserMinus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const roleOptions = [
  { value: "superadmin", label: "Super Admin (akses penuh)" },
  { value: "product_admin", label: "Product PIC (ubah & finalkan paket)" },
  { value: "product_contributor", label: "Product Contributor (lihat & usul)" },
  { value: "cs_admin", label: "CS Administrasi (input jamaah & pembayaran)" },
  { value: "content_admin", label: "Admin Konten (marketing)" },
  { value: "agent_admin", label: "Admin Agen (dukungan mitra)" },
  { value: "sales", label: "Sales" },
  { value: "advertiser", label: "Advertiser (iklan berbayar)" },
];

const roleColors: Record<string, string> = {
  superadmin: "bg-red-100 text-red-800",
  product_admin: "bg-blue-100 text-blue-800",
  product_contributor: "bg-sky-50 text-sky-800",
  cs_admin: "bg-teal-100 text-teal-800",
  content_admin: "bg-green-100 text-green-800",
  agent_admin: "bg-purple-100 text-purple-800",
  sales: "bg-amber-100 text-amber-800",
  advertiser: "bg-pink-100 text-pink-800",
};

/** The edge function explains refusals in its JSON body; supabase-js hides that behind a generic message. */
async function functionError(err: unknown): Promise<string> {
  const e = err as { context?: { json?: () => Promise<{ error?: string }> }; message?: string } | null;
  try {
    const body = await e?.context?.json?.();
    if (body?.error) return String(body.error);
  } catch { /* fall through */ }
  return e?.message ?? "Terjadi kesalahan";
}

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
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Selected member for actions
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedNewRole, setSelectedNewRole] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    role: "product_admin",
  });

  const superadminCount = team.filter((m) => m.role === "superadmin").length;
  // Name to type before removing a Super Admin (falls back to the email when the account has no name).
  const confirmNameFor = (m: { full_name?: string; email?: string } | null) => (m?.full_name && m.full_name !== "Unknown" ? m.full_name : m?.email ?? "");

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

      toast.success("Undangan terkirim", { description: `${formData.email} diundang sebagai ${roleOptions.find((r) => r.value === formData.role)?.label ?? formData.role}` });
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

      toast.success("Peran berhasil diubah");
      setIsChangeRoleOpen(false);
      fetchTeam();
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mengubah peran", { description: await functionError(err) });
    } finally {
      setUpdating(false);
    }
  };

  const handleResendInvite = async (member: any) => {
    if (!session?.access_token) return;

    try {
      setResendingId(member.id);
      const { data, error } = await supabase.functions.invoke('manage-team', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        method: 'POST',
        body: { email: member.email, role: member.role, isResend: true }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Undangan dikirim ulang", { description: `Undangan baru telah dikirim ke ${member.email}` });
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mengirim ulang undangan", { description: err.message });
    } finally {
      setResendingId(null);
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

      toast.success("Akses admin dicabut", { description: `${selectedMember.full_name} tidak lagi bisa membuka panel admin. Akunnya tetap ada.` });
      setIsRemoveOpen(false);
      fetchTeam();
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mencabut akses", { description: await functionError(err) });
    } finally {
      setRemoving(false);
    }
  };

  if (userRole !== "superadmin" && userRole !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] mx-auto">
        <Shield className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-700">Akses ditolak</h2>
        <p className="text-slate-500">Hanya Super Admin yang bisa mengelola tim.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Tim</h1>
          <p className="text-muted-foreground">Kelola anggota tim dan hak akses panel admin</p>
        </div>
        
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Undang Anggota
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Undang anggota tim baru</DialogTitle>
              <DialogDescription>
                Mereka akan menerima email berisi link untuk membuat kata sandi dan masuk ke panel admin.
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
                <Label>Peran / hak akses</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih peran" />
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
          <CardDescription>Semua akun yang punya akses ke panel admin</CardDescription>
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
                    <TableHead>Peran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Terakhir masuk</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center p-8 text-muted-foreground">
                        Belum ada anggota tim selain kamu.
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
                        <TableCell>
                          {member.confirmed_at ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              Menunggu
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.last_sign_in_at ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {format(new Date(member.last_sign_in_at), 'dd MMM yyyy, HH:mm')}
                            </span>
                          ) : (
                            <span className="italic text-slate-400 text-sm">Belum pernah masuk</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" disabled={member.id === user?.id} aria-label={`Aksi untuk ${member.full_name}`} title={member.id === user?.id ? "Kamu tidak bisa mengubah akunmu sendiri" : undefined}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {!member.confirmed_at && (
                                <DropdownMenuItem 
                                  onClick={() => handleResendInvite(member)}
                                  className="cursor-pointer"
                                  disabled={resendingId === member.id}
                                >
                                  {resendingId === member.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Mail className="h-4 w-4 mr-2" />
                                  )}
                                  Kirim Ulang Undangan
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedMember(member);
                                  setSelectedNewRole(member.role);
                                  setIsChangeRoleOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Ubah Peran
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedMember(member);
                                  setIsRemoveOpen(true);
                                }}
                                disabled={member.role === "superadmin" && superadminCount <= 1}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                {member.role === "superadmin" && superadminCount <= 1 ? "Super Admin terakhir" : "Cabut akses"}
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
            <DialogTitle>Ubah hak akses</DialogTitle>
            <DialogDescription>
              Ubah peran dan hak akses untuk <strong>{selectedMember?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Peran / hak akses baru</Label>
              <Select value={selectedNewRole} onValueChange={setSelectedNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih peran" />
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

      {/* Remove access: takes the admin roles away; the login account is never deleted. */}
      <ConfirmDialog
        open={isRemoveOpen}
        onOpenChange={setIsRemoveOpen}
        title={`Cabut akses admin ${selectedMember?.full_name ?? ""}?`}
        description={
          <>
            Peran admin <strong>{selectedMember?.full_name}</strong> dicabut, jadi mereka tidak bisa lagi membuka panel admin.
            Akun login mereka <strong>tidak dihapus</strong>, dan data lain (misalnya sebagai agen) tidak berubah.
            Kamu bisa memberi peran lagi kapan saja lewat Undang Anggota.
            {selectedMember?.role === "superadmin" && " Ini akun Super Admin, jadi ketik namanya untuk melanjutkan."}
          </>
        }
        confirmLabel="Ya, cabut akses"
        destructive
        busy={removing}
        confirmText={selectedMember?.role === "superadmin" ? confirmNameFor(selectedMember) : undefined}
        onConfirm={handleRemoveAccess}
      />
    </div>
  );
}
