import React, { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Eye, Trash2, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, Images, RefreshCw, Route, History, BadgeCheck } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { PACKAGE_HAS_JAMAAH_MESSAGE, canEditPackages, daysUntilDeparture, departureCountdownLabel, packageStatusBadgeClass, packageStatusLabel } from "@/lib/packageStatus";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackageChangeLog } from "@/components/admin/PackageChangeLog";
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
import { BulkFlyerUpload } from "@/components/admin/BulkFlyerUpload";
import { formatNumber, getSlotsTaken, isPackageDeparted } from "@/lib/utils";
import { ExpandedPackageDetails } from "@/components/admin/ExpandedPackageDetails";

interface Package {
  id: string;
  slug: string;
  package_name: string;
  departure_date: string;
  duration_days: number;
  flight: string;
  package_price: any;
  hemat_package_price?: any;
  five_star_package_price?: any;
  pelataran_package_price?: any;
  status: string;
  banner_image?: string | null;
  is_sold_out: boolean;
  slots_total: number | null;
  slots_filled: number | null;
  slots_booked_online: number | null;
  available_tiers: string[] | null;
}

type SortField = 'package_name' | 'departure_date' | 'slots_filled' | 'package_price' | 'status';
type SortDirection = 'asc' | 'desc';
type TripTab = 'upcoming' | 'departed' | 'all';

/** Soonest departure first for what's ahead; most recent first for what already left. */
const defaultDirection = (tab: TripTab): SortDirection => (tab === 'upcoming' ? 'asc' : 'desc');

const isForeignKeyError = (error: any) => error?.code === '23503';

/** Price column for a given tier slug */
const priceForTier = (pkg: Package, tier: string) => {
  switch (tier) {
    case 'hemat': return pkg.hemat_package_price;
    case 'five-star':
    case 'five_star': return pkg.five_star_package_price;
    case 'pelataran':
    case 'pelataran-hemat': return pkg.pelataran_package_price;
    default: return pkg.package_price; // nyaman / best_seller
  }
};

/** Extract the price object, preferring the package's primary tier and falling
 *  back to any tier that actually has a price set. */
const getPrices = (pkg: Package): { quad?: number; triple?: number; double?: number } | null => {
  const candidates = [
    ...(pkg.available_tiers || []).map(t => priceForTier(pkg, t)),
    pkg.package_price,
    pkg.hemat_package_price,
    pkg.five_star_package_price,
    pkg.pelataran_package_price,
  ];
  for (const price of candidates) {
    if (price && typeof price === 'object' && price.quad && price.quad > 0) {
      return price;
    }
  }
  return null;
};

/** Used for sorting */
const getDisplayPrice = (pkg: Package): number => {
  const prices = getPrices(pkg);
  return prices?.quad || 0;
};

const formatJt = (amount: number | undefined) => {
  if (!amount) return "-";
  return `${(amount / 1000000).toFixed(1).replace(/\.0$/, '')} Jt`;
};

const Packages = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  // Contributors can browse every package but only the PIC/superadmin may change them.
  const canEdit = canEditPackages(userRole);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('departure_date');
  const [tab, setTab] = useState<TripTab>('upcoming');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection('upcoming'));
  const [selectionMode, setSelectionMode] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [flyerOpen, setFlyerOpen] = useState(false);
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

  const departedCount = packages.filter(isPackageDeparted).length;
  const upcomingCount = packages.length - departedCount;
  const unpublishedUpcoming = packages.filter((p) => !isPackageDeparted(p) && p.status !== 'published').length;

  const handleTabChange = (value: string) => {
    setTab(value as TripTab);
    setSortField('departure_date');
    setSortDirection(defaultDirection(value as TripTab));
    setExpandedId(null);
    clearSelection();
  };

  const visiblePackages = packages.filter((p) => {
    if (tab === 'upcoming' && isPackageDeparted(p)) return false;
    if (tab === 'departed' && !isPackageDeparted(p)) return false;
    return statusFilter === 'all' || p.status === statusFilter;
  });

  const sortedPackages = [...visiblePackages].sort((a, b) => {
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
      // Offline (sheet) + online bookings both consume seats.
      aValue = Math.max(0, (a.slots_total || 45) - getSlotsTaken(a));
      bValue = Math.max(0, (b.slots_total || 45) - getSlotsTaken(b));
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

  const [syncingSeats, setSyncingSeats] = useState(false);

  const handleSyncSeats = async () => {
    setSyncingSeats(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-seats");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Sinkronisasi gagal");
      const updatedCount = data.updated?.length || 0;
      toast.success(
        updatedCount > 0
          ? `${updatedCount} paket diperbarui dari Sisa Seat`
          : "Semua paket sudah sesuai dengan Sisa Seat di sheet"
      );
      
      // Beri jeda 1.5 detik agar toast bisa terbaca, lalu hard refresh halamannya
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      toast.error(`Gagal menyinkronkan sisa seat: ${err.message}`);
    } finally {
      setSyncingSeats(false);
    }
  };

  const [syncingItinerary, setSyncingItinerary] = useState(false);

  const handleSyncItinerary = async () => {
    setSyncingItinerary(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-itinerary");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.message || "Sinkronisasi itinerary selesai");
      if (data?.details?.length) {
        console.log("Sync itinerary details:", data.details);
      }
      fetchPackages();
    } catch (err: any) {
      toast.error(`Gagal menyinkronkan itinerary: ${err.message}`);
    } finally {
      setSyncingItinerary(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("packages").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Paket berhasil dihapus");
      fetchPackages();
    } catch (error: any) {
      toast.error(isForeignKeyError(error) ? PACKAGE_HAS_JAMAAH_MESSAGE : "Gagal menghapus paket");
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
      if (error) throw new Error(isForeignKeyError(error) ? PACKAGE_HAS_JAMAAH_MESSAGE : error.message);
      fetchPackages();
      handleExitSelectionMode();
    }},
    {
      id: "final",
      label: "Tandai Final",
      icon: <BadgeCheck className="h-4 w-4" />,
      confirmMessage: "Tandai {count} paket sebagai Final? Setelah Final, setiap perubahan wajib diberi alasan.",
      handler: async (ids: string[]) => {
        const { error } = await supabase.from("packages").update({ status: 'final' }).in("id", ids);
        if (error) throw error;
        fetchPackages();
        handleExitSelectionMode();
      },
    },
    { ...commonBulkActions.publish, label: "Tayangkan", confirmMessage: "Tayangkan {count} paket di website?", handler: async (ids: string[]) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paket Umroh</h1>
          <p className="text-muted-foreground">
            {canEdit ? "Kelola paket umrohmu" : "Mode lihat saja: perubahan paket dilakukan oleh PIC produk"}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)} className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Riwayat Perubahan
          </Button>
          {canEdit && (
          <>
          <Button
            variant={selectionMode ? "secondary" : "outline"}
            onClick={() => selectionMode ? handleExitSelectionMode() : setSelectionMode(true)}
            size="sm"
          >
            {selectionMode ? "Batal Pilih" : "Pilih"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Unggah Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFlyerOpen(true)} className="flex items-center gap-2">
            <Images className="h-4 w-4" />
            Unggah flyer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncSeats}
            disabled={syncingSeats}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncingSeats ? "animate-spin" : ""}`} />
            {syncingSeats ? "Syncing..." : "Sync Sisa Seat"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncItinerary}
            disabled={syncingItinerary}
            className="flex items-center gap-2"
          >
            <Route className={`h-4 w-4 ${syncingItinerary ? "animate-spin" : ""}`} />
            {syncingItinerary ? "Syncing..." : "Sync Itinerary"}
          </Button>
          <Button onClick={() => navigate("/admin/packages/add")} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Paket
          </Button>
          </>
          )}
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

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Tabs value={tab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="upcoming">Akan berangkat ({upcomingCount})</TabsTrigger>
                <TabsTrigger value="departed">Sudah berangkat ({departedCount})</TabsTrigger>
                <TabsTrigger value="all">Semua ({packages.length})</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[170px]" aria-label="Filter status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="draft">Draf</SelectItem>
                <SelectItem value="final">Final</SelectItem>
                <SelectItem value="published">Tayang</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {unpublishedUpcoming > 0 && statusFilter === 'all' && tab !== 'departed' && (
            <p className="mb-3 text-sm text-muted-foreground">
              {unpublishedUpcoming} paket yang akan berangkat belum Tayang, jadi belum muncul di website.
            </p>
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
                  <TableHead className="w-[120px]">
                    Kategori
                  </TableHead>
                  <TableHead className="min-w-[200px]">
                    <Button variant="ghost" onClick={() => handleSort('package_name')} className={`h-auto p-0 font-semibold hover:bg-transparent transition-colors ${sortField === 'package_name' ? 'text-primary' : ''}`}>
                      Nama Paket {getSortIcon('package_name')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    Maskapai
                  </TableHead>
                  <TableHead className="min-w-[180px]">
                    <Button variant="ghost" onClick={() => handleSort('departure_date')} className={`h-auto p-0 font-semibold hover:bg-transparent transition-colors ${sortField === 'departure_date' ? 'text-primary' : ''}`}>
                      Jadwal Keberangkatan {getSortIcon('departure_date')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[100px]">
                    <Button variant="ghost" onClick={() => handleSort('package_price')} className={`h-auto p-0 font-semibold hover:bg-transparent transition-colors ${sortField === 'package_price' ? 'text-primary' : ''}`}>
                      Quad {getSortIcon('package_price')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[100px]">
                    <span className="font-semibold text-muted-foreground">Triple</span>
                  </TableHead>
                  <TableHead className="min-w-[100px]">
                    <span className="font-semibold text-muted-foreground">Double</span>
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
                    <TableCell colSpan={selectionMode ? 11 : 10} className="text-center py-10 text-muted-foreground">
                      {packages.length === 0 ? "Belum ada paket umroh" : "Tidak ada paket di tampilan ini"}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedPackages.map((pkg, index) => {
                    const total = pkg.slots_total || 45;
                    // Offline (sheet) + online bookings both consume seats.
                    const filled = getSlotsTaken(pkg);
                    const sisa = Math.max(0, total - filled);
                    const availabilityPercent = Math.min(100, (filled / total) * 100);
                    const departed = isPackageDeparted(pkg);
                    const daysLeft = daysUntilDeparture(pkg.departure_date.slice(0, 10));
                    const full = !departed && sisa === 0;
                    
                    return (
                      <Fragment key={pkg.id}>
                        <TableRow
                          className={`${isSelected(pkg.id) ? "bg-primary/5" : ""} ${selectionMode ? "cursor-pointer select-none" : ""} ${departed ? "opacity-60" : ""}`}
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
                                aria-label={`Pilih ${pkg.package_name}`}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex flex-col gap-1 w-[120px]">
                              {departed ? (
                                <span className="text-xs text-muted-foreground">Berangkat · {filled}/{total}</span>
                              ) : (
                                <>
                                  <div className="flex justify-between text-xs items-center">
                                    {full ? (
                                      <Badge variant="destructive" className="h-4 px-1.5 py-0 text-[10px]">Penuh</Badge>
                                    ) : (
                                      <span className={`font-semibold ${sisa <= 5 ? "text-destructive" : "text-emerald-600"}`}>
                                        Sisa {sisa}
                                      </span>
                                    )}
                                    <span className="text-muted-foreground">{filled}/{total}</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${sisa <= 5 ? 'bg-destructive' : 'bg-emerald-500'}`}
                                      style={{ width: `${availabilityPercent}%` }}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              {pkg.available_tiers && pkg.available_tiers.map(tier => (
                                <span key={tier} className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${getTierColor(tier)}`}>
                                  {formatTierName(tier)}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{pkg.package_name}</span>
                              {!departed && pkg.status === 'published' && !pkg.banner_image && (
                                <Badge variant="outline" className="h-4 border-amber-300 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-800" title="Paket Tayang tapi belum punya gambar flyer di website">
                                  Flyer kosong
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-sm text-slate-700">{pkg.flight || "-"}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col">
                                <span className="font-medium whitespace-nowrap">{format(new Date(pkg.departure_date), "dd MMM yyyy")}</span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {departureCountdownLabel(daysLeft)}
                                </span>
                              </div>
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border text-xs font-semibold whitespace-nowrap">
                                {pkg.duration_days}D
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {(() => {
                              const prices = getPrices(pkg);
                              return prices ? formatJt(prices.quad) : <span className="text-muted-foreground">-</span>;
                            })()}
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {(() => {
                              const prices = getPrices(pkg);
                              return prices ? formatJt(prices.triple) : <span className="text-muted-foreground">-</span>;
                            })()}
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {(() => {
                              const prices = getPrices(pkg);
                              return prices ? formatJt(prices.double) : <span className="text-muted-foreground">-</span>;
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              {departed && pkg.status === 'published' ? (
                                <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-100" title="Tidak tampil di website">
                                  Sudah berangkat
                                </Badge>
                              ) : (
                                <Badge variant="outline" className={packageStatusBadgeClass(pkg.status)}>
                                  {packageStatusLabel(pkg.status)}
                                </Badge>
                              )}
                              {!departed && pkg.is_sold_out && (
                                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Sold Out</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                aria-label={canEdit ? "Ubah paket" : "Lihat paket"}
                                onClick={(e) => { e.stopPropagation(); navigate(`/admin/packages/${pkg.id}`); }}
                              >
                                {canEdit ? <Edit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-destructive/10"
                                  aria-label="Hapus paket"
                                  onClick={(e) => { e.stopPropagation(); setDeleteId(pkg.id); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedId === pkg.id && (
                          <TableRow className="hover:bg-transparent bg-slate-50/50">
                            <TableCell colSpan={selectionMode ? 11 : 10} className="p-0 border-b">
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

      <BulkFlyerUpload
        open={flyerOpen}
        onOpenChange={setFlyerOpen}
        packages={packages}
        onSuccess={fetchPackages}
      />

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Riwayat Perubahan Paket</SheetTitle>
            <SheetDescription>Siapa mengubah apa, kapan, dan alasannya. 100 perubahan terakhir.</SheetDescription>
          </SheetHeader>
          {historyOpen && <PackageChangeLog />}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Packages;
