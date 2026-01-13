import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  fetchCSNumbers,
  getCSStats, 
  getRedirectLogs, 
  resetRotation, 
  clearLogs,
  getCurrentRotationIndex,
  type CSNumber 
} from '@/lib/whatsappRotation';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Trash2, MessageCircle, Users, Clock, RotateCcw, Plus, Pencil, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

const ChatRotation = () => {
  const [csNumbers, setCsNumbers] = useState<CSNumber[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCS, setEditingCS] = useState<CSNumber | null>(null);
  const [formData, setFormData] = useState({ name: '', phone_number: '', is_active: true });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('whatsapp_cs')
      .select('*')
      .order('display_order', { ascending: true });
    
    const numbers = (data || []) as CSNumber[];
    setCsNumbers(numbers);
    setStats(getCSStats(numbers.filter(n => n.is_active)));
    setLogs(getRedirectLogs().slice(0, 10));
    setCurrentIndex(getCurrentRotationIndex());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResetRotation = () => {
    resetRotation();
    setCurrentIndex(0);
    toast.success('Rotasi berhasil direset ke CS pertama');
  };

  const handleClearLogs = () => {
    clearLogs();
    setLogs([]);
    setStats({});
    toast.success('Log redirect berhasil dihapus');
  };

  const openAddDialog = () => {
    setEditingCS(null);
    setFormData({ name: '', phone_number: '', is_active: true });
    setIsDialogOpen(true);
  };

  const openEditDialog = (cs: CSNumber) => {
    setEditingCS(cs);
    setFormData({ name: cs.name, phone_number: cs.phone_number, is_active: cs.is_active });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone_number) {
      toast.error('Nama dan nomor telepon wajib diisi');
      return;
    }

    // Clean phone number - remove non-digits
    const cleanPhone = formData.phone_number.replace(/\D/g, '');

    if (editingCS) {
      // Update existing
      const { error } = await supabase
        .from('whatsapp_cs')
        .update({ 
          name: formData.name, 
          phone_number: cleanPhone,
          is_active: formData.is_active 
        })
        .eq('id', editingCS.id);

      if (error) {
        toast.error('Gagal mengupdate CS');
        return;
      }
      toast.success('CS berhasil diupdate');
    } else {
      // Get max display order
      const maxOrder = Math.max(0, ...csNumbers.map(c => c.display_order));
      
      // Insert new
      const { error } = await supabase
        .from('whatsapp_cs')
        .insert({ 
          name: formData.name, 
          phone_number: cleanPhone,
          is_active: formData.is_active,
          display_order: maxOrder + 1
        });

      if (error) {
        toast.error('Gagal menambah CS');
        return;
      }
      toast.success('CS berhasil ditambahkan');
    }

    setIsDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (cs: CSNumber) => {
    if (!confirm(`Hapus ${cs.name}?`)) return;

    const { error } = await supabase
      .from('whatsapp_cs')
      .delete()
      .eq('id', cs.id);

    if (error) {
      toast.error('Gagal menghapus CS');
      return;
    }

    toast.success('CS berhasil dihapus');
    fetchData();
  };

  const handleToggleActive = async (cs: CSNumber) => {
    const { error } = await supabase
      .from('whatsapp_cs')
      .update({ is_active: !cs.is_active })
      .eq('id', cs.id);

    if (error) {
      toast.error('Gagal mengubah status');
      return;
    }

    fetchData();
  };

  const activeCSNumbers = csNumbers.filter(c => c.is_active);
  const totalRedirects = Object.values(stats).reduce((a, b) => a + b, 0);
  const nextCS = activeCSNumbers[currentIndex % activeCSNumbers.length];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Rotation</h1>
          <p className="text-muted-foreground">
            Kelola distribusi chat WhatsApp ke customer service
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah CS
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCS ? 'Edit CS' : 'Tambah CS Baru'}</DialogTitle>
                <DialogDescription>
                  Masukkan data customer service untuk rotasi WhatsApp
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama CS</Label>
                  <Input
                    id="name"
                    placeholder="CS #1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Nomor WhatsApp</Label>
                  <Input
                    id="phone"
                    placeholder="6281234567890"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: kode negara + nomor (contoh: 6281234567890)
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="active">Aktif</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handleSave}>
                  {editingCS ? 'Simpan' : 'Tambah'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRedirects}</p>
                <p className="text-sm text-muted-foreground">Total Redirect</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCSNumbers.length}</p>
                <p className="text-sm text-muted-foreground">CS Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <RotateCcw className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{nextCS?.name || '-'}</p>
                <p className="text-sm text-muted-foreground">Next in Queue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {logs[0] ? format(new Date(logs[0].timestamp), 'HH:mm') : '-'}
                </p>
                <p className="text-sm text-muted-foreground">Last Redirect</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CS Numbers Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Daftar Customer Service
          </CardTitle>
          <CardDescription>Kelola nomor WhatsApp yang akan dirotasi</CardDescription>
        </CardHeader>
        <CardContent>
          {csNumbers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Belum ada CS terdaftar. Klik "Tambah CS" untuk menambahkan.
            </p>
          ) : (
            <div className="space-y-3">
              {csNumbers.map((cs, index) => (
                <div 
                  key={cs.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    cs.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cs.name}</span>
                        {!cs.is_active && (
                          <Badge variant="secondary" className="text-xs">Nonaktif</Badge>
                        )}
                        {cs.is_active && nextCS?.id === cs.id && (
                          <Badge variant="default" className="text-xs">Next</Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">+{cs.phone_number}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cs.is_active}
                      onCheckedChange={() => handleToggleActive(cs)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(cs)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cs)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CS Distribution */}
      {activeCSNumbers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribusi per CS</CardTitle>
            <CardDescription>Jumlah redirect ke masing-masing customer service</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeCSNumbers.map((cs) => {
                const count = stats[cs.id] || 0;
                const percentage = totalRedirects > 0 ? (count / totalRedirects) * 100 : 0;
                
                return (
                  <div key={cs.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cs.name}</span>
                        <span className="text-sm text-muted-foreground">
                          +{cs.phone_number}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Redirects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Redirect Terakhir</CardTitle>
            <CardDescription>10 redirect terakhir</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleResetRotation}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Rotasi
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearLogs}>
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus Log
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Belum ada redirect tercatat
            </p>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{log.csName}</Badge>
                    {log.message && (
                      <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                        "{log.message}"
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(log.timestamp), "dd MMM, HH:mm:ss", { locale: localeId })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Cara Penggunaan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">URL Dasar:</p>
            <code className="text-sm text-primary">musafartour.com/chat</code>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Dengan Custom Message:</p>
            <code className="text-sm text-primary">musafartour.com/chat?msg=Saya mau tanya paket Ramadhan</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatRotation;
