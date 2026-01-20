import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Link2, 
  Plus, 
  Copy, 
  Trash2, 
  Edit, 
  MoreHorizontal,
  ExternalLink,
  BarChart2,
  MousePointerClick,
  Calendar,
  RefreshCw,
  QrCode,
  Download,
  Search,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { formatNumber } from '@/lib/utils';

interface ShortLink {
  id: string;
  short_code: string;
  original_url: string;
  title: string | null;
  description: string | null;
  click_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ClickAnalytics {
  id: string;
  clicked_at: string;
  user_agent: string | null;
  referer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

// Generate random short code
const generateShortCode = (length: number = 6): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Get base URL for short links
const getShortLinkBaseUrl = (): string => {
  return 'https://musafar.lovable.app/s/';
};

const URLShortener = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAnalyticsDialogOpen, setIsAnalyticsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<ShortLink | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  
  // Form state
  const [formData, setFormData] = useState({
    original_url: '',
    title: '',
    description: '',
    short_code: '',
    is_active: true,
    expires_at: '',
  });

  // Fetch short links
  const { data: links = [], isLoading } = useQuery({
    queryKey: ['admin-short-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('short_links')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ShortLink[];
    },
  });

  // Fetch click analytics for selected link
  const { data: clickAnalytics = [], isLoading: analyticsLoading } = useQuery({
    queryKey: ['short-link-analytics', selectedLink?.id],
    queryFn: async () => {
      if (!selectedLink) return [];
      const { data, error } = await supabase
        .from('short_link_clicks')
        .select('*')
        .eq('link_id', selectedLink.id)
        .order('clicked_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as ClickAnalytics[];
    },
    enabled: !!selectedLink && isAnalyticsDialogOpen,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      const shortCode = data.short_code || generateShortCode();
      
      const { error } = await supabase
        .from('short_links')
        .insert({
          short_code: shortCode,
          original_url: data.original_url,
          title: data.title || null,
          description: data.description || null,
          is_active: data.is_active,
          expires_at: data.expires_at || null,
          created_by: user.user?.id,
        });
      
      if (error) throw error;
      return shortCode;
    },
    onSuccess: (shortCode) => {
      queryClient.invalidateQueries({ queryKey: ['admin-short-links'] });
      toast.success('Link berhasil dibuat!');
      copyToClipboard(getShortLinkBaseUrl() + shortCode);
      resetForm();
      setIsCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Short code sudah digunakan');
      } else {
        toast.error('Gagal membuat link');
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from('short_links')
        .update({
          original_url: data.original_url,
          title: data.title || null,
          description: data.description || null,
          is_active: data.is_active,
          expires_at: data.expires_at || null,
        })
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-short-links'] });
      toast.success('Link berhasil diupdate');
      setIsEditDialogOpen(false);
      setSelectedLink(null);
    },
    onError: () => {
      toast.error('Gagal mengupdate link');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('short_links')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-short-links'] });
      toast.success('Link berhasil dihapus');
      setIsDeleteDialogOpen(false);
      setSelectedLink(null);
    },
    onError: () => {
      toast.error('Gagal menghapus link');
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('short_links')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-short-links'] });
    },
  });

  const resetForm = () => {
    setFormData({
      original_url: '',
      title: '',
      description: '',
      short_code: '',
      is_active: true,
      expires_at: '',
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link berhasil disalin!');
    } catch {
      toast.error('Gagal menyalin link');
    }
  };

  const openEditDialog = (link: ShortLink) => {
    setSelectedLink(link);
    setFormData({
      original_url: link.original_url,
      title: link.title || '',
      description: link.description || '',
      short_code: link.short_code,
      is_active: link.is_active,
      expires_at: link.expires_at ? link.expires_at.split('T')[0] : '',
    });
    setIsEditDialogOpen(true);
  };

  const openAnalyticsDialog = (link: ShortLink) => {
    setSelectedLink(link);
    setIsAnalyticsDialogOpen(true);
  };

  const openDeleteDialog = (link: ShortLink) => {
    setSelectedLink(link);
    setIsDeleteDialogOpen(true);
  };

  const generateQRCode = (shortCode: string) => {
    const fullUrl = getShortLinkBaseUrl() + shortCode;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fullUrl)}`;
    setQrCodeUrl(qrUrl);
  };

  const downloadQRCode = async (shortCode: string) => {
    const fullUrl = getShortLinkBaseUrl() + shortCode;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(fullUrl)}&format=png`;
    
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${shortCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('QR Code berhasil didownload');
    } catch {
      toast.error('Gagal mendownload QR Code');
    }
  };

  // Filter links by search query
  const filteredLinks = links.filter(link => {
    const query = searchQuery.toLowerCase();
    return (
      link.short_code.toLowerCase().includes(query) ||
      link.original_url.toLowerCase().includes(query) ||
      link.title?.toLowerCase().includes(query) ||
      link.description?.toLowerCase().includes(query)
    );
  });

  // Stats
  const totalLinks = links.length;
  const activeLinks = links.filter(l => l.is_active).length;
  const totalClicks = links.reduce((sum, l) => sum + l.click_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">URL Shortener</h1>
          <p className="text-muted-foreground">
            Buat link pendek untuk broadcast follow-up
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Buat Link Baru
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(totalLinks)}</p>
                <p className="text-sm text-muted-foreground">Total Link</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(activeLinks)}</p>
                <p className="text-sm text-muted-foreground">Link Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <MousePointerClick className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(totalClicks)}</p>
                <p className="text-sm text-muted-foreground">Total Klik</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari link..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Links Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Daftar Link
          </CardTitle>
          <CardDescription>
            Kelola semua link pendek untuk campaign broadcast
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada link yang dibuat</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Buat Link Pertama
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Link</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead className="text-center">Klik</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                            /s/{link.short_code}
                          </code>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            → {link.original_url}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[150px]">
                          <p className="font-medium truncate">
                            {link.title || '-'}
                          </p>
                          {link.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {link.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {formatNumber(link.click_count)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={link.is_active}
                          onCheckedChange={(checked) => 
                            toggleActiveMutation.mutate({ id: link.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(link.created_at), { 
                            addSuffix: true, 
                            locale: localeId 
                          })}
                        </p>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => copyToClipboard(getShortLinkBaseUrl() + link.short_code)}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Salin Link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => window.open(getShortLinkBaseUrl() + link.short_code, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Buka Link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                generateQRCode(link.short_code);
                                downloadQRCode(link.short_code);
                              }}
                            >
                              <QrCode className="w-4 h-4 mr-2" />
                              Download QR
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAnalyticsDialog(link)}>
                              <BarChart2 className="w-4 h-4 mr-2" />
                              Lihat Analitik
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(link)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(link)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Link Baru</DialogTitle>
            <DialogDescription>
              Buat link pendek untuk broadcast follow-up
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="original_url">URL Tujuan *</Label>
              <Input
                id="original_url"
                placeholder="https://musafar.lovable.app/paket-umroh/..."
                value={formData.original_url}
                onChange={(e) => setFormData({ ...formData, original_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Judul</Label>
              <Input
                id="title"
                placeholder="Promo Ramadhan 2026"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Broadcast follow-up untuk jamaah Ramadhan..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="short_code">Short Code (opsional)</Label>
              <div className="flex gap-2">
                <Input
                  id="short_code"
                  placeholder="auto-generate"
                  value={formData.short_code}
                  onChange={(e) => setFormData({ ...formData, short_code: e.target.value.replace(/[^a-zA-Z0-9-]/g, '') })}
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setFormData({ ...formData, short_code: generateShortCode() })}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Kosongkan untuk auto-generate
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires_at">Kadaluarsa (opsional)</Label>
              <Input
                id="expires_at"
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.original_url || createMutation.isPending}
            >
              {createMutation.isPending ? 'Membuat...' : 'Buat Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Link</DialogTitle>
            <DialogDescription>
              Edit detail link pendek
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Short Code</Label>
              <code className="block text-sm bg-muted px-3 py-2 rounded font-mono">
                /s/{selectedLink?.short_code}
              </code>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_original_url">URL Tujuan *</Label>
              <Input
                id="edit_original_url"
                value={formData.original_url}
                onChange={(e) => setFormData({ ...formData, original_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_title">Judul</Label>
              <Input
                id="edit_title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Deskripsi</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_expires_at">Kadaluarsa</Label>
              <Input
                id="edit_expires_at"
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit_is_active">Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={() => selectedLink && updateMutation.mutate({ ...formData, id: selectedLink.id })}
              disabled={!formData.original_url || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={isAnalyticsDialogOpen} onOpenChange={setIsAnalyticsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5" />
              Analitik: {selectedLink?.title || selectedLink?.short_code}
            </DialogTitle>
            <DialogDescription>
              Detail klik dan performa link
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{formatNumber(selectedLink?.click_count || 0)}</p>
                    <p className="text-sm text-muted-foreground">Total Klik</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold">
                      {selectedLink?.created_at 
                        ? format(new Date(selectedLink.created_at), 'dd MMM yyyy', { locale: localeId })
                        : '-'
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">Dibuat</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Click History */}
            <div className="space-y-2">
              <h4 className="font-medium">Riwayat Klik Terakhir</h4>
              {analyticsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : clickAnalytics.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Belum ada data klik
                </p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Referer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clickAnalytics.map((click) => (
                        <TableRow key={click.id}>
                          <TableCell className="text-sm">
                            {format(new Date(click.clicked_at), 'dd MMM HH:mm', { locale: localeId })}
                          </TableCell>
                          <TableCell>
                            {click.utm_source ? (
                              <Badge variant="outline" className="text-xs">
                                {click.utm_source}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Direct</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {click.referer || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Link?</AlertDialogTitle>
            <AlertDialogDescription>
              Link <strong>/s/{selectedLink?.short_code}</strong> akan dihapus permanen. 
              Semua data analitik juga akan hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedLink && deleteMutation.mutate(selectedLink.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default URLShortener;
