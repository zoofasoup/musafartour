import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Link,
  Plus,
  Copy,
  Eye,
  Pencil,
  Trash2,
  Search,
  Download,
  Upload,
  CheckSquare,
  Square,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  type URLTemplate,
  getTemplates,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  deleteTemplates,
  recordTemplateUse,
  buildTemplateUrl,
  searchTemplates,
  exportTemplates,
  importTemplates,
  getTemplateStats,
} from '@/lib/urlTemplateManager';
import URLTemplateModal from './URLTemplateModal';
import URLTemplatePreview from './URLTemplatePreview';

type SortOption = 'name' | 'created_at' | 'use_count';

const URLTemplateManager = () => {
  const [templates, setTemplates] = useState<URLTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<URLTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<URLTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<URLTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<URLTemplate | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTemplates = () => {
    const loaded = getTemplates();
    setTemplates(loaded);
    applyFilters(loaded, searchQuery, sortBy);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const applyFilters = (data: URLTemplate[], query: string, sort: SortOption) => {
    let result = query ? searchTemplates(data, query) : [...data];

    // Sort
    result.sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'use_count':
          return b.use_count - a.use_count;
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredTemplates(result);
  };

  useEffect(() => {
    applyFilters(templates, searchQuery, sortBy);
  }, [searchQuery, sortBy, templates]);

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleEditTemplate = (template: URLTemplate) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleSaveTemplate = (data: {
    name: string;
    base_url: string;
    custom_message?: string;
    utm_params: URLTemplate['utm_params'];
  }) => {
    if (editingTemplate) {
      updateTemplate(editingTemplate.id, data);
      toast.success('Template berhasil diperbarui');
    } else {
      addTemplate(data);
      toast.success('Template berhasil ditambahkan');
    }
    loadTemplates();
  };

  const handleDeleteTemplate = (template: URLTemplate) => {
    setDeleteConfirm(template);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteTemplate(deleteConfirm.id);
      toast.success(`Template "${deleteConfirm.name}" berhasil dihapus`);
      loadTemplates();
      setDeleteConfirm(null);
    }
  };

  const handleCopyUrl = (template: URLTemplate) => {
    const url = `https://${buildTemplateUrl(template)}`;
    navigator.clipboard.writeText(url);
    recordTemplateUse(template.id);
    loadTemplates();
    toast.success('✓ URL copied to clipboard!');
  };

  const handlePreview = (template: URLTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  // Bulk selection
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTemplates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTemplates.map(t => t.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size > 0) {
      setBulkDeleteConfirm(true);
    }
  };

  const confirmBulkDelete = () => {
    const count = deleteTemplates(Array.from(selectedIds));
    toast.success(`${count} template berhasil dihapus`);
    setSelectedIds(new Set());
    loadTemplates();
    setBulkDeleteConfirm(false);
  };

  // Export/Import
  const handleExport = () => {
    const toExport = selectedIds.size > 0 
      ? templates.filter(t => selectedIds.has(t.id))
      : templates;
    
    const json = exportTemplates(toExport);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `url-templates-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${toExport.length} template berhasil diexport`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const imported = importTemplates(content);
      
      if (!imported) {
        toast.error('Format file tidak valid');
        return;
      }

      // Add imported templates
      const existingTemplates = getTemplates();
      const merged = [...existingTemplates, ...imported];
      localStorage.setItem('musafar_url_templates', JSON.stringify(merged));
      
      toast.success(`${imported.length} template berhasil diimport`);
      loadTemplates();
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const stats = getTemplateStats(templates);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              🔗 URL Template Management
            </CardTitle>
            <CardDescription>
              Kelola template URL untuk berbagai campaign dan platform
            </CardDescription>
          </div>
          <Button onClick={handleAddTemplate}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{stats.totalTemplates}</p>
            <p className="text-xs text-muted-foreground">Total Template</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{stats.totalUses}</p>
            <p className="text-xs text-muted-foreground">Total Penggunaan</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-sm truncate">{stats.mostUsed?.name || '-'}</p>
            <p className="text-xs text-muted-foreground">Paling Sering</p>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Terbaru</SelectItem>
              <SelectItem value="name">Nama</SelectItem>
              <SelectItem value="use_count">Paling Sering</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
          >
            {selectedIds.size === filteredTemplates.length ? (
              <CheckSquare className="w-4 h-4 mr-2" />
            ) : (
              <Square className="w-4 h-4 mr-2" />
            )}
            {selectedIds.size === filteredTemplates.length ? 'Unselect All' : 'Select All'}
          </Button>
          {selectedIds.size > 0 && (
            <>
              <Badge variant="secondary">{selectedIds.size} selected</Badge>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus Terpilih
              </Button>
            </>
          )}
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export {selectedIds.size > 0 ? 'Terpilih' : 'Semua'}
          </Button>
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            ref={fileInputRef}
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>

        {/* Template List */}
        <div className="space-y-3">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'Tidak ada template yang cocok' : 'Belum ada template'}
            </div>
          ) : (
            filteredTemplates.map((template) => {
              const url = buildTemplateUrl(template);
              const hasUtm = template.utm_params.utm_source || template.utm_params.utm_campaign;

              return (
                <div
                  key={template.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    selectedIds.has(template.id) ? 'bg-primary/5 border-primary' : 'bg-card'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(template.id)}
                      onCheckedChange={() => toggleSelect(template.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-medium">{template.name}</h4>
                        {hasUtm && (
                          <Badge variant="outline" className="text-xs">
                            UTM
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-primary truncate mb-1">{url.split('?')[0]}</p>
                      {hasUtm && (
                        <p className="text-xs text-muted-foreground truncate">
                          + utm_source={template.utm_params.utm_source}
                          {template.utm_params.utm_campaign && `&utm_campaign=${template.utm_params.utm_campaign}`}
                        </p>
                      )}
                      {template.custom_message && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          📝 "{template.custom_message}"
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Used: {template.use_count}x</span>
                        <span>•</span>
                        <span>
                          Last: {template.last_used 
                            ? format(new Date(template.last_used), 'dd MMM, HH:mm', { locale: localeId })
                            : 'Never'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopyUrl(template)}
                        title="Copy URL"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {hasUtm && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handlePreview(template)}
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditTemplate(template)}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteTemplate(template)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>

      {/* Modals */}
      <URLTemplateModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        template={editingTemplate}
        onSave={handleSaveTemplate}
      />

      <URLTemplatePreview
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        template={previewTemplate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus template "{deleteConfirm?.name}"? Aksi ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selectedIds.size} Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua template yang dipilih akan dihapus. Aksi ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive text-destructive-foreground">
              Hapus Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default URLTemplateManager;
