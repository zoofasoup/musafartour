import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BulkActions, useBulkSelection, commonBulkActions } from "@/components/admin/BulkActions";
import { BulkPackageUpload } from "@/components/admin/BulkPackageUpload";
import { formatNumber } from "@/lib/utils";

interface Package {
  id: string;
  package_name: string;
  departure_date: string;
  duration_days: number;
  flight: string;
  package_price: any;
  hemat_package_price: any;
  five_star_package_price: any;
  pelataran_package_price: any;
  status: string;
  is_sold_out: boolean;
}

type SortField = 'package_name' | 'departure_date' | 'duration_days' | 'flight' | 'package_price' | 'status';
type SortDirection = 'asc' | 'desc';

/** Extract the best quad price from tier-specific or default price columns */
const getDisplayPrice = (pkg: Package): number => {
  // Check tier-specific prices first, then fallback to package_price
  const candidates = [
    pkg.package_price,
    pkg.hemat_package_price,
    pkg.five_star_package_price,
    pkg.pelataran_package_price,
  ];
  for (const price of candidates) {
    if (price && typeof price === 'object' && price.quad && price.quad > 0) {
      return price.quad;
    }
  }
  return 0;
};

const Packages = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('departure_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectionMode, setSelectionMode] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const lastSelectedIndex = useRef<number | null>(null);

  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected, allSelected, setSelectedIds } = useBulkSelection(packages);

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    clearSelection();
    lastSelectedIndex.current = null;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const sortedPackages = [...packages].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'package_price') {
      aValue = getDisplayPrice(a);
      bValue = getDisplayPrice(b);
    }

    if (sortField === 'departure_date') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleRowClick = useCallback((pkg: Package, index: number, event: React.MouseEvent) => {
    if (!selectionMode) return;
    // Don't trigger on button/checkbox clicks
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="checkbox"]')) return;

    if (event.shiftKey && lastSelectedIndex.current !== null) {
      const start = Math.min(lastSelectedIndex.current, index);
      const end = Math.max(lastSelectedIndex.current, index);
      const rangeIds = sortedPackages.slice(start, end + 1).map(p => p.id);
      setSelectedIds(prev => {
        const combined = new Set([...prev, ...rangeIds]);
        return Array.from(combined);
      });
    } else {
      toggleSelect(pkg.id);
      lastSelectedIndex.current = index;
    }
  }, [selectionMode, sortedPackages, toggleSelect, setSelectedIds]);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from("packages")
        .select("*");

      if (error) throw error;
      setPackages(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("packages")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Paket berhasil dihapus");
      setDeleteId(null);
      fetchPackages();
    } catch (error: any) {
      toast.error("Gagal menghapus paket: " + error.message);
    }
  };

  const handleBulkAction = async (actionId: string, ids: string[]) => {
    try {
      switch (actionId) {
        case "delete":
          const { error: deleteError } = await supabase
            .from("packages")
            .delete()
            .in("id", ids);
          if (deleteError) throw deleteError;
          toast.success(`${ids.length} paket berhasil dihapus`);
          break;
        case "publish":
          const { error: publishError } = await supabase
            .from("packages")
            .update({ status: "published" })
            .in("id", ids);
          if (publishError) throw publishError;
          toast.success(`${ids.length} paket berhasil dipublish`);
          break;
        case "unpublish":
          const { error: unpublishError } = await supabase
            .from("packages")
            .update({ status: "draft" })
            .in("id", ids);
          if (unpublishError) throw unpublishError;
          toast.success(`${ids.length} paket berhasil di-unpublish`);
          break;
        case "export":
          exportToCSV(ids);
          break;
        case "markSoldOut":
          const { error: soldOutError } = await supabase
            .from("packages")
            .update({ is_sold_out: true, sold_out_date: new Date().toISOString() })
            .in("id", ids);
          if (soldOutError) throw soldOutError;
          toast.success(`${ids.length} paket ditandai sold out`);
          break;
        case "markAvailable":
          const { error: availableError } = await supabase
            .from("packages")
            .update({ is_sold_out: false, sold_out_date: null })
            .in("id", ids);
          if (availableError) throw availableError;
          toast.success(`${ids.length} paket ditandai tersedia`);
          break;
      }
      clearSelection();
      fetchPackages();
    } catch (error: any) {
      toast.error("Gagal: " + error.message);
    }
  };

  const exportToCSV = (ids: string[]) => {
    const selectedPackages = packages.filter((pkg) => ids.includes(pkg.id));
    const headers = ["Nama Paket", "Tanggal Keberangkatan", "Durasi (Hari)", "Maskapai", "Harga Quad", "Status"];
    const rows = selectedPackages.map((pkg) => [
      pkg.package_name,
      pkg.departure_date,
      pkg.duration_days,
      pkg.flight,
      getDisplayPrice(pkg),
      pkg.status,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `paket-umroh-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success(`${ids.length} paket berhasil di-export`);
  };

  const bulkActions = [
    commonBulkActions.publish,
    commonBulkActions.unpublish,
    commonBulkActions.markSoldOut,
    commonBulkActions.markAvailable,
    commonBulkActions.export,
    commonBulkActions.delete,
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paket Umroh</h1>
          <p className="text-muted-foreground">Kelola paket umroh Anda</p>
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <Button variant="outline" onClick={handleExitSelectionMode}>
              Batal
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setSelectionMode(true)}>
              Pilih
            </Button>
          )}
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Import Excel
          </Button>
          <Button
            variant="outline"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              try {
                const { data, error } = await supabase.functions.invoke('sync-google-sheets');
                if (error) throw error;
                toast.success(data?.message || 'Sync selesai');
                if (data?.details?.length) {
                  console.log('Sync details:', data.details);
                }
                fetchPackages();
              } catch (e: any) {
                toast.error('Sync gagal: ' + e.message);
              } finally {
                setSyncing(false);
              }
            }}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Google Sheets'}
          </Button>
          <Button onClick={() => navigate("/admin/packages/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Paket
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Paket</CardTitle>
        </CardHeader>
        <CardContent>
          {selectionMode && (
            <BulkActions
              selectedIds={selectedIds}
              totalCount={packages.length}
              onSelectAll={selectAll}
              allSelected={allSelected}
              actions={bulkActions}
              onAction={handleBulkAction}
            />
          )}

          <Table>
            <TableHeader>
              <TableRow>
                {selectionMode && <TableHead className="w-12"></TableHead>}
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('package_name')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Nama Paket {getSortIcon('package_name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('departure_date')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Tanggal Keberangkatan {getSortIcon('departure_date')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('duration_days')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Durasi {getSortIcon('duration_days')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('flight')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Maskapai {getSortIcon('flight')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('package_price')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Harga (Quad) {getSortIcon('package_price')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('status')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Status {getSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPackages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={selectionMode ? 8 : 7} className="text-center text-muted-foreground">
                    Belum ada paket umroh
                  </TableCell>
                </TableRow>
              ) : (
                sortedPackages.map((pkg, index) => (
                  <TableRow
                    key={pkg.id}
                    className={`${isSelected(pkg.id) ? "bg-primary/10" : ""} ${selectionMode ? "cursor-pointer select-none" : ""}`}
                    onClick={(e) => handleRowClick(pkg, index, e)}
                  >
                    {selectionMode && (
                      <TableCell>
                        <Checkbox
                          checked={isSelected(pkg.id)}
                          onCheckedChange={() => {
                            toggleSelect(pkg.id);
                            lastSelectedIndex.current = index;
                          }}
                          aria-label={`Select ${pkg.package_name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{pkg.package_name}</TableCell>
                    <TableCell>{format(new Date(pkg.departure_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>{pkg.duration_days} hari</TableCell>
                    <TableCell>{pkg.flight}</TableCell>
                    <TableCell>Rp {formatNumber(getDisplayPrice(pkg))}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={pkg.status === "published" ? "default" : "secondary"}>
                          {pkg.status === "published" ? "Published" : "Draft"}
                        </Badge>
                        {pkg.is_sold_out && (
                          <Badge variant="destructive">Sold Out</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/packages/${pkg.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(pkg.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Paket?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Paket akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkPackageUpload
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={fetchPackages}
      />
    </div>
  );
};

export default Packages;
