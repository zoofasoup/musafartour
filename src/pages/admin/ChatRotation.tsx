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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { 
  getCSStats, 
  getRedirectLogs, 
  resetRotation, 
  clearLogs,
  getCurrentRotationIndex,
  getCampaignStats,
  getSourceStats,
  getTotalWeight,
  buildWeightedPool,
  type CSNumber,
  type RedirectLog 
} from '@/lib/whatsappRotation';
import { supabase } from '@/integrations/supabase/client';
import SortableCSItem from '@/components/admin/SortableCSItem';
import { 
  RefreshCw, 
  Trash2, 
  MessageCircle, 
  Users, 
  Clock, 
  RotateCcw, 
  Plus, 
  Phone,
  TrendingUp,
  Globe,
  Scale
} from 'lucide-react';
import { format } from 'date-fns';
import URLTemplateManager from '@/components/admin/URLTemplateManager';
import CSAnalyticsDashboard from '@/components/admin/CSAnalyticsDashboard';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

const ChatRotation = () => {
  const [csNumbers, setCsNumbers] = useState<CSNumber[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [campaignStats, setCampaignStats] = useState<Record<string, number>>({});
  const [sourceStats, setSourceStats] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<RedirectLog[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCS, setEditingCS] = useState<CSNumber | null>(null);
  const [formData, setFormData] = useState({ name: '', phone_number: '', is_active: true, weight: 1 });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('whatsapp_cs')
      .select('*')
      .order('display_order', { ascending: true });
    
    const numbers = (data || []) as CSNumber[];
    setCsNumbers(numbers);
    setStats(getCSStats(numbers.filter(n => n.is_active)));
    setCampaignStats(getCampaignStats());
    setSourceStats(getSourceStats());
    setLogs(getRedirectLogs().slice(0, 10));
    setCurrentIndex(getCurrentRotationIndex());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = csNumbers.findIndex(cs => cs.id === active.id);
    const newIndex = csNumbers.findIndex(cs => cs.id === over.id);
    
    const newOrder = arrayMove(csNumbers, oldIndex, newIndex);
    setCsNumbers(newOrder);

    // Update display_order in database
    try {
      const updates = newOrder.map((cs, index) => 
        supabase
          .from('whatsapp_cs')
          .update({ display_order: index })
          .eq('id', cs.id)
      );
      
      await Promise.all(updates);
      toast.success('Urutan CS berhasil diperbarui');
    } catch (error) {
      toast.error('Gagal memperbarui urutan');
      fetchData(); // Revert on error
    }
  };

  const handleResetRotation = () => {
    resetRotation();
    setCurrentIndex(0);
    toast.success('Rotasi berhasil direset ke CS pertama');
  };

  const handleClearLogs = () => {
    clearLogs();
    setLogs([]);
    setStats({});
    setCampaignStats({});
    setSourceStats({});
    toast.success('Log redirect berhasil dihapus');
  };

  const openAddDialog = () => {
    setEditingCS(null);
    setFormData({ name: '', phone_number: '', is_active: true, weight: 1 });
    setIsDialogOpen(true);
  };

  const openEditDialog = (cs: CSNumber) => {
    setEditingCS(cs);
    setFormData({ name: cs.name, phone_number: cs.phone_number, is_active: cs.is_active, weight: cs.weight || 1 });
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
          is_active: formData.is_active,
          weight: formData.weight
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
          display_order: maxOrder + 1,
          weight: formData.weight
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
  const totalWeight = getTotalWeight(activeCSNumbers);
  const weightedPool = buildWeightedPool(activeCSNumbers);
  const nextCS = weightedPool.length > 0 ? weightedPool[currentIndex % weightedPool.length] : null;

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
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (Rasio Distribusi)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min={1}
                    max={10}
                    placeholder="1"
                    value={formData.weight || ""}
                    onChange={(e) => setFormData({ ...formData, weight: Math.max(1, parseInt(e.target.value) || 1) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Semakin tinggi weight, semakin banyak chat yang diterima. Contoh: weight 3 = dapat 3x lebih banyak dari weight 1
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
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Scale className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalWeight}</p>
                <p className="text-sm text-muted-foreground">Total Weight Pool</p>
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

      {/* Weight Distribution Preview */}
      {activeCSNumbers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Preview Distribusi Weight
            </CardTitle>
            <CardDescription>
              Persentase chat yang akan diterima berdasarkan weight masing-masing CS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeCSNumbers.map((cs) => {
                const weight = cs.weight || 1;
                const percentage = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
                
                return (
                  <div key={cs.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cs.name}</span>
                        <Badge variant="outline" className="text-xs">
                          Weight: {weight}
                        </Badge>
                        {nextCS?.id === cs.id && (
                          <Badge variant="default" className="text-xs">Next</Badge>
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {percentage.toFixed(1)}% ({weight} dari {totalWeight})
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
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

      {/* CS Numbers Management with Drag & Drop */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Daftar Customer Service
          </CardTitle>
          <CardDescription>
            Kelola nomor WhatsApp yang akan dirotasi. Drag untuk mengubah urutan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {csNumbers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Belum ada CS terdaftar. Klik "Tambah CS" untuk menambahkan.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={csNumbers.map(cs => cs.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {csNumbers.map((cs, index) => (
                    <SortableCSItem
                      key={cs.id}
                      cs={cs}
                      index={index}
                      isNext={cs.is_active && nextCS?.id === cs.id}
                      onToggleActive={handleToggleActive}
                      onEdit={openEditDialog}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Campaign Attribution Stats */}
      {Object.keys(campaignStats).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Kampanye
              </CardTitle>
              <CardDescription>Distribusi redirect per campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(campaignStats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([campaign, count]) => {
                    const percentage = totalRedirects > 0 ? (count / totalRedirects) * 100 : 0;
                    return (
                      <div key={campaign} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">
                            {campaign === 'direct' ? '🔗 Direct' : `📣 ${campaign}`}
                          </span>
                          <span className="text-sm text-muted-foreground">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Sumber Traffic
              </CardTitle>
              <CardDescription>Distribusi redirect per source</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(sourceStats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([source, count]) => {
                    const percentage = totalRedirects > 0 ? (count / totalRedirects) * 100 : 0;
                    return (
                      <div key={source} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">
                            {source === 'direct' ? '🔗 Direct' : source}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
            <CardDescription>10 redirect terakhir dengan informasi kampanye</CardDescription>
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
                  className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{log.csName}</Badge>
                      {log.utm?.utm_campaign && (
                        <Badge variant="secondary" className="text-xs">
                          📣 {log.utm.utm_campaign}
                        </Badge>
                      )}
                      {log.utm?.utm_source && (
                        <Badge variant="secondary" className="text-xs">
                          {log.utm.utm_source}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(log.timestamp), "dd MMM, HH:mm:ss", { locale: localeId })}
                    </span>
                  </div>
                  {log.message && (
                    <span className="text-sm text-muted-foreground truncate">
                      "{log.message}"
                    </span>
                  )}
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
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Dengan UTM Tracking:</p>
            <code className="text-sm text-primary break-all">
              musafartour.com/chat?utm_source=instagram&utm_medium=story&utm_campaign=promo_ramadhan
            </code>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Kombinasi Lengkap:</p>
            <code className="text-sm text-primary break-all">
              musafartour.com/chat?msg=Tanya promo&utm_source=facebook&utm_campaign=ads_mei
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Dashboard */}
      <CSAnalyticsDashboard />

      {/* URL Template Management */}
      <URLTemplateManager />
    </div>
  );
};

export default ChatRotation;
