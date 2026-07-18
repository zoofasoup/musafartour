import React, { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, RefreshCw, Presentation } from "lucide-react";
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
import { ExpandedPackageDetails } from "@/components/admin/ExpandedPackageDetails";

interface Package {
  id: string;
  slug: string;
  package_name: string;
  departure_date: string;
  duration_days: number;
  flight: string;
  package_price: any;
  status: string;
  is_sold_out: boolean;
  tiers_data?: any;
  slots_total: number | null;
  slots_filled: number | null;
  available_tiers: string[] | null;
}

type SortField = 'package_name' | 'departure_date' | 'slots_filled' | 'package_price' | 'status';
type SortDirection = 'asc' | 'desc';

/** Extract the best quad price from tier-specific or default price columns */
const getDisplayPrice = (pkg: Package): number => {
  // Check tier-specific prices from JSONB first, then fallback to package_price
  const tiers = pkg.tiers_data || {};
  const candidates = [
    pkg.package_price,
    tiers.hemat?.price,
    tiers.best_seller?.price,
    tiers.five_star?.price,
    tiers.pelataran?.price,
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

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected, allSelected, setSelectedIds } = useBulkSelection(packages);

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    clearSelection();
    lastSelectedIndex.current = null;
    setExpandedId(null);
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
    
    if (sortField === 'slots_filled') {
      aValue = Math.max(0, (a.slots_total || 45) - (a.slots_filled || 0));
      bValue = Math.max(0, (b.slots_total || 45) - (b.slots_filled || 0));
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
    // Don't trigger on button/checkbox clicks
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="checkbox"]') || target.closest('a')) return;

    if (!selectionMode) {
      setExpandedId(prev => prev === pkg.id ? null : pkg.id);
      return;
    }

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
      toast.error("Gagal memuat daftar paket");
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
      const { error } = await supabase.from("packages").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Paket berhasil dihapus");
      fetchPackages();
    } catch (error: any) {
      toast.error("Gagal menghapus paket");
    } finally {
      setDeleteId(null);
    }
  };

  const getTierColor = (tier: string) => {
    const t = tier.toLowerCase();
    if (t.includes('nyaman')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (t.includes('hemat')) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (t.includes('star')) return 'bg-purple-100 text-purple-700 border-purple-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const formatTierName = (tier: string) => {
    if (tier === 'five-star') return 'Bintang 5';
    if (tier === 'pelataran-hemat') return 'Pelataran';
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const bulkActions = [
    { ...commonBulkActions.delete, handler: async (ids: string[]) => {
      const { error } = await supabase.from("packages").delete().in("id", ids);
      if (error) throw error;
      fetchPackages();
      handleExitSelectionMode();
    }},
    { ...commonBulkActions.publish, handler: async (ids: string[]) => {
      const { error } = await supabase.from("packages").update({ status: 'published' }).in("id", ids);
      if (error) throw error;
      fetchPackages();
      handleExitSelectionMode();
    }},
    { ...commonBulkActions.draft, handler: async (ids: string[]) => {
      const { error } = await supabase.from("packages").update({ status: 'draft' }).in("id", ids);
      if (error) throw error;
      fetchPackages();
      handleExitSelectionMode();
    }}
  ];

  const handleBulkAction = async (actionId: string, selectedIds: string[]) => {
    const action = bulkActions.find(a => a.id === actionId);
    if (!action || !action.handler) return;

    try {
      await action.handler(selectedIds);
      toast.success(`Aksi ${action.label} berhasil dijalankan`);
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const getAirlineLogo = (flight: string) => {
    if (!flight) return null;
    const f = flight.toLowerCase();
    if (f.includes("garuda")) return "https://logo.clearbit.com/garuda-indonesia.com";
    if (f.includes("saudia")) return "https://logo.clearbit.com/saudia.com";
    if (f.includes("qatar")) return "https://logo.clearbit.com/qatarairways.com";
    if (f.includes("oman")) return "https://logo.clearbit.com/omanair.com";
    if (f.includes("emirates")) return "https://logo.clearbit.com/emirates.com";
    if (f.includes("etihad")) return "https://logo.clearbit.com/etihad.com";
    if (f.includes("turkish")) return "https://logo.clearbit.com/turkishairlines.com";
    if (f.includes("lion")) return "https://logo.clearbit.com/lionair.co.id";
    if (f.includes("batik")) return "https://logo.clearbit.com/batikair.com";
    if (f.includes("citilink")) return "https://logo.clearbit.com/citilink.co.id";
    if (f.includes("airasia")) return "https://logo.clearbit.com/airasia.com";
    if (f.includes("scoot")) return "https://logo.clearbit.com/flyscoot.com";
    if (f.includes("malaysia")) return "https://logo.clearbit.com/malaysiaairlines.com";
    if (f.includes("singapore")) return "https://logo.clearbit.com/singaporeair.com";
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paket Umroh</h1>
          <p className="text-muted-foreground">Kelola paket umroh Anda</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant={selectionMode ? "secondary" : "outline"} 
            onClick={() => selectionMode ? handleExitSelectionMode() : setSelectionMode(true)}
            size="sm"
          >
            {selectionMode ? "Batal Pilih" : "Pilih"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Upload / Sync Google Sheets
          </Button>
          <Button onClick={() => navigate("/admin/packages/add")} size="sm">
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

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {selectionMode && <TableHead className="w-12"></TableHead>}
                  <TableHead className="w-[140px]">
                    <Button variant="ghost" onClick={() => handleSort('slots_filled')} className={`h-auto p-0 font-semibold hover:bg-transparent transition-colors ${sortField === 'slots_filled' ? 'text-primary' : ''}`}>
                      Sisa Seat {getSortIcon('slots_filled')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[60px] text-center">
                    Maskapai
                  </TableHead>
                  <TableHead className="min-w-[200px]">
                    <Button variant="ghost" onClick={() => handleSort('package_name')} className={`h-auto p-0 font-semibold hover:bg-transparent transition-colors ${sortField === 'package_name' ? 'text-primary' : ''}`}>
                      Nama Paket {getSortIcon('package_name')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[180px]">
                    <Button variant="ghost" onClick={() => handleSort('departure_date')} className={`h-auto p-0 font-semibold hover:bg-transparent transition-colors ${sortField === 'departure_date' ? 'text-primary' : ''}`}>
                      Jadwal Keberangkatan {getSortIcon('departure_date')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('package_price')} className={`h-auto p-0 font-semibold hover:bg-transparent transition-colors ${sortField === 'package_price' ? 'text-primary' : ''}`}>
                      Harga Mulai {getSortIcon('package_price')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('status')} className={`h-auto p-0 font-semibold hover:bg-transparent transition-colors ${sortField === 'status' ? 'text-primary' : ''}`}>
                      Status {getSortIcon('status')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPackages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={selectionMode ? 8 : 7} className="text-center py-10 text-muted-foreground">
                      Belum ada paket umroh
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedPackages.map((pkg, index) => {
                    const total = pkg.slots_total || 45;
                    const filled = pkg.slots_filled || 0;
                    const sisa = Math.max(0, total - filled);
                    const availabilityPercent = Math.min(100, (filled / total) * 100);
                    
                    return (
                      <Fragment key={pkg.id}>
                        <TableRow
                          className={`${isSelected(pkg.id) ? "bg-primary/5" : ""} ${selectionMode ? "cursor-pointer select-none" : ""}`}
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
                          <TableCell>
                            <div className="flex flex-col gap-1 w-[120px]">
                              <div className="flex justify-between text-xs items-center">
                                <span className={`font-semibold ${sisa <= 5 ? "text-destructive" : "text-emerald-600"}`}>
                                  Sisa {sisa}
                                </span>
                                <span className="text-muted-foreground">{filled}/{total}</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${sisa <= 5 ? 'bg-destructive' : 'bg-emerald-500'}`}
                                  style={{ width: `${availabilityPercent}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {getAirlineLogo(pkg.flight) ? (
                              <div className="mx-auto h-8 w-8 rounded-md bg-white border shadow-sm p-1 flex items-center justify-center overflow-hidden" title={pkg.flight}>
                                <img src={getAirlineLogo(pkg.flight)!} alt={pkg.flight} className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <div className="mx-auto h-8 w-8 rounded-md bg-slate-100 border flex items-center justify-center text-[10px] font-bold text-slate-500 text-center leading-none" title={pkg.flight}>
                                {(pkg.flight || "AIR").substring(0, 3).toUpperCase()}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5">
                              <span className="font-semibold">{pkg.package_name}</span>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                {pkg.available_tiers && pkg.available_tiers.map(tier => (
                                  <span key={tier} className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${getTierColor(tier)}`}>
                                    {formatTierName(tier)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium whitespace-nowrap">{format(new Date(pkg.departure_date), "dd MMM yyyy")}</span>
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border text-xs font-semibold whitespace-nowrap">
                                {pkg.duration_days}D
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            Rp {formatNumber(getDisplayPrice(pkg))}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              <Badge 
                                variant={pkg.status === "published" ? "default" : "secondary"}
                                className={pkg.status === "published" ? "bg-emerald-500 hover:bg-emerald-600 border-transparent" : ""}
                              >
                                {pkg.status === "published" ? "Published" : "Draft"}
                              </Badge>
                              {pkg.is_sold_out && (
                                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Sold Out</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/10"
                                onClick={(e) => { e.stopPropagation(); navigate(`/admin/brochure/${pkg.slug}`); }}
                                title="Digital Brochure"
                              >
                                <Presentation className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                onClick={(e) => { e.stopPropagation(); navigate(`/admin/packages/${pkg.id}`); }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => { e.stopPropagation(); setDeleteId(pkg.id); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedId === pkg.id && (
                          <TableRow className="hover:bg-transparent bg-slate-50/50">
                            <TableCell colSpan={selectionMode ? 8 : 7} className="p-0 border-b">
                              <div className="p-6 shadow-inner border-y animate-in fade-in slide-in-from-top-2 duration-200">
                                <ExpandedPackageDetails pkg={pkg} />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
          </Table>
          </div>
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
