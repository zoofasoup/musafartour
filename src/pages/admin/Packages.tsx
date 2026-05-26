import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Edit, Trash2, FileSpreadsheet, RefreshCw, Presentation, Copy,
  Filter, Layers, ArrowUpDown, X,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BulkActions, useBulkSelection, commonBulkActions, type BulkAction } from "@/components/admin/BulkActions";
import { BulkPackageUpload } from "@/components/admin/BulkPackageUpload";
import { formatNumber, cn } from "@/lib/utils";

interface Package {
  id: string;
  slug: string;
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
  available_tiers: string[] | null;
}

// ── Tier registry ───────────────────────────────────────────────────────────
const TIERS = [
  { value: "hemat",          label: "Hemat",      tone: "bg-amber-100 text-amber-900 border-amber-200" },
  { value: "nyaman",         label: "Nyaman",     tone: "bg-sky-100 text-sky-900 border-sky-200" },
  { value: "five-star",      label: "Five Star",  tone: "bg-violet-100 text-violet-900 border-violet-200" },
  { value: "pelataran-hemat",label: "Pelataran",  tone: "bg-emerald-100 text-emerald-900 border-emerald-200" },
] as const;

const tierMeta = (t?: string | null) =>
  TIERS.find((x) => x.value === t) ?? { value: t ?? "—", label: t ?? "—", tone: "bg-muted text-muted-foreground border-border" };

const getTier = (pkg: Package): string => pkg.available_tiers?.[0] ?? "nyaman";

const getDisplayPrice = (pkg: Package): number => {
  const tier = getTier(pkg);
  const map: Record<string, any> = {
    "hemat": pkg.hemat_package_price,
    "nyaman": pkg.package_price,
    "five-star": pkg.five_star_package_price,
    "pelataran-hemat": pkg.pelataran_package_price,
  };
  const candidates = [map[tier], pkg.package_price, pkg.hemat_package_price, pkg.five_star_package_price, pkg.pelataran_package_price];
  for (const p of candidates) if (p && typeof p === "object" && p.quad > 0) return p.quad;
  return 0;
};

const autoRowName = (pkg: Package) => {
  const tier = tierMeta(getTier(pkg)).label;
  const month = format(parseISO(pkg.departure_date), "MMM yyyy", { locale: idLocale });
  return `Umroh ${tier} · ${month}`;
};

// ── Sort + Group keys ───────────────────────────────────────────────────────
type SortKey = "tipe" | "tanggal" | "harga" | "maskapai" | "nama";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "tipe", label: "Tipe" },
  { value: "tanggal", label: "Tanggal" },
  { value: "harga", label: "Harga" },
  { value: "maskapai", label: "Maskapai" },
  { value: "nama", label: "Nama" },
];

type GroupKey = "none" | "tipe" | "maskapai" | "bulan";

const getSortValue = (pkg: Package, key: SortKey): string | number => {
  switch (key) {
    case "tipe": return tierMeta(getTier(pkg)).label;
    case "tanggal": return new Date(pkg.departure_date).getTime();
    case "harga": return getDisplayPrice(pkg);
    case "maskapai": return (pkg.flight ?? "").toLowerCase();
    case "nama": return pkg.package_name.toLowerCase();
  }
};

const getGroupKey = (pkg: Package, group: GroupKey): string => {
  switch (group) {
    case "tipe": return tierMeta(getTier(pkg)).label;
    case "maskapai": return pkg.flight || "Tanpa Maskapai";
    case "bulan": return format(parseISO(pkg.departure_date), "MMMM yyyy", { locale: idLocale });
    default: return "";
  }
};

// ── Saved views ─────────────────────────────────────────────────────────────
type SavedView = {
  id: string;
  label: string;
  predicate: (pkg: Package) => boolean;
};
const SAVED_VIEWS: SavedView[] = [
  { id: "all",       label: "Semua",            predicate: () => true },
  { id: "published", label: "Published",        predicate: (p) => p.status === "published" },
  { id: "draft",     label: "Draft",            predicate: (p) => p.status !== "published" },
  { id: "garuda",    label: "Garuda",           predicate: (p) => /garuda/i.test(p.flight ?? "") },
  { id: "saudia",    label: "Saudia",           predicate: (p) => /saudi/i.test(p.flight ?? "") },
  { id: "budget30",  label: "Budget < 30jt",    predicate: (p) => { const v = getDisplayPrice(p); return v > 0 && v < 30_000_000; } },
  { id: "hemat",     label: "Tipe: Hemat",      predicate: (p) => getTier(p) === "hemat" },
  { id: "fivestar",  label: "Tipe: Five Star",  predicate: (p) => getTier(p) === "five-star" },
];

// ── Component ───────────────────────────────────────────────────────────────
const Packages = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const lastSelectedIndex = useRef<number | null>(null);

  // View / filter / group / sort state
  const [view, setView] = useState<string>("all");
  const [fTipe, setFTipe] = useState<string>("all");
  const [fMaskapai, setFMaskapai] = useState<string>("all");
  const [fBulan, setFBulan] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<GroupKey>("tipe");
  const [sortPrimary, setSortPrimary] = useState<SortKey>("tipe");
  const [sortSecondary, setSortSecondary] = useState<SortKey>("tanggal");

  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected, allSelected, setSelectedIds } =
    useBulkSelection(packages);

  // Fetch ---------------------------------------------------------------------
  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase.from("packages").select("*");
      if (error) throw error;
      setPackages((data || []) as Package[]);
    } catch (e: any) {
      toast.error("Gagal memuat data: " + e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchPackages(); }, []);

  // Derived option lists ------------------------------------------------------
  const airlineOptions = useMemo(
    () => Array.from(new Set(packages.map((p) => p.flight).filter(Boolean))).sort(),
    [packages]
  );
  const monthOptions = useMemo(() => {
    const map = new Map<string, string>();
    packages.forEach((p) => {
      const key = format(parseISO(p.departure_date), "yyyy-MM");
      const label = format(parseISO(p.departure_date), "MMMM yyyy", { locale: idLocale });
      map.set(key, label);
    });
    return Array.from(map.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([k,l]) => ({ value: k, label: l }));
  }, [packages]);

  // Filtering -----------------------------------------------------------------
  const filtered = useMemo(() => {
    const viewPredicate = SAVED_VIEWS.find((v) => v.id === view)?.predicate ?? (() => true);
    return packages.filter((p) => {
      if (!viewPredicate(p)) return false;
      if (fTipe !== "all" && getTier(p) !== fTipe) return false;
      if (fMaskapai !== "all" && p.flight !== fMaskapai) return false;
      if (fBulan !== "all" && format(parseISO(p.departure_date), "yyyy-MM") !== fBulan) return false;
      return true;
    });
  }, [packages, view, fTipe, fMaskapai, fBulan]);

  // Multi-level sort ---------------------------------------------------------
  const sorted = useMemo(() => {
    const cmp = (a: Package, b: Package, key: SortKey) => {
      const av = getSortValue(a, key); const bv = getSortValue(b, key);
      if (av < bv) return -1; if (av > bv) return 1; return 0;
    };
    return [...filtered].sort((a, b) => cmp(a, b, sortPrimary) || cmp(a, b, sortSecondary));
  }, [filtered, sortPrimary, sortSecondary]);

  // Grouping ------------------------------------------------------------------
  const grouped = useMemo(() => {
    if (groupBy === "none") return [{ key: "", items: sorted }];
    const map = new Map<string, Package[]>();
    sorted.forEach((p) => {
      const k = getGroupKey(p, groupBy);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    });
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [sorted, groupBy]);

  // Flat list for shift-click range selection
  const flatList = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    clearSelection();
    lastSelectedIndex.current = null;
  };

  const handleRowClick = useCallback(
    (pkg: Package, index: number, e: React.MouseEvent) => {
      if (!selectionMode) return;
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest('[role="checkbox"]')) return;
      if (e.shiftKey && lastSelectedIndex.current !== null) {
        const s = Math.min(lastSelectedIndex.current, index);
        const eIdx = Math.max(lastSelectedIndex.current, index);
        const ids = flatList.slice(s, eIdx + 1).map((p) => p.id);
        setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
      } else {
        toggleSelect(pkg.id);
        lastSelectedIndex.current = index;
      }
    },
    [selectionMode, flatList, toggleSelect, setSelectedIds]
  );

  // CRUD ----------------------------------------------------------------------
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("packages").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Paket berhasil dihapus");
      setDeleteId(null);
      fetchPackages();
    } catch (e: any) { toast.error("Gagal menghapus paket: " + e.message); }
  };

  const duplicatePackages = async (ids: string[]) => {
    const toClone = packages.filter((p) => ids.includes(p.id));
    const rows = toClone.map(({ id, slug, ...rest }) => ({
      ...rest,
      package_name: `${rest.package_name} (Copy)`,
      slug: `${slug || "paket"}-copy-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      status: "draft",
    }));
    const { error } = await supabase.from("packages").insert(rows as any);
    if (error) throw error;
  };

  const handleBulkAction = async (actionId: string, ids: string[]) => {
    try {
      switch (actionId) {
        case "delete":
          { const { error } = await supabase.from("packages").delete().in("id", ids);
            if (error) throw error;
            toast.success(`${ids.length} paket berhasil dihapus`); break; }
        case "publish":
          { const { error } = await supabase.from("packages").update({ status: "published" }).in("id", ids);
            if (error) throw error;
            toast.success(`${ids.length} paket dipublish`); break; }
        case "unpublish":
          { const { error } = await supabase.from("packages").update({ status: "draft" }).in("id", ids);
            if (error) throw error;
            toast.success(`${ids.length} paket di-unpublish`); break; }
        case "markSoldOut":
          { const { error } = await supabase.from("packages").update({ is_sold_out: true, sold_out_date: new Date().toISOString() }).in("id", ids);
            if (error) throw error;
            toast.success(`${ids.length} paket ditandai sold out`); break; }
        case "markAvailable":
          { const { error } = await supabase.from("packages").update({ is_sold_out: false, sold_out_date: null }).in("id", ids);
            if (error) throw error;
            toast.success(`${ids.length} paket ditandai tersedia`); break; }
        case "duplicate":
          await duplicatePackages(ids);
          toast.success(`${ids.length} paket diduplikasi`); break;
        case "export":
          exportToCSV(ids); break;
      }
      clearSelection();
      fetchPackages();
    } catch (e: any) { toast.error("Gagal: " + e.message); }
  };

  const exportToCSV = (ids: string[]) => {
    const rows = packages.filter((p) => ids.includes(p.id));
    const headers = ["Identitas", "Tipe", "Tanggal", "Durasi", "Maskapai", "Harga Quad", "Status"];
    const data = rows.map((p) => [
      autoRowName(p), tierMeta(getTier(p)).label, p.departure_date, p.duration_days, p.flight, getDisplayPrice(p), p.status,
    ]);
    const csv = [headers, ...data].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `paket-umroh-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success(`${ids.length} paket di-export`);
  };

  const bulkActions: BulkAction[] = [
    commonBulkActions.publish,
    commonBulkActions.unpublish,
    { id: "duplicate", label: "Duplikasi", icon: <Copy className="h-4 w-4" />, confirmMessage: "Duplikasi {count} paket sebagai draft?" },
    commonBulkActions.markSoldOut,
    commonBulkActions.markAvailable,
    commonBulkActions.export,
    commonBulkActions.delete,
  ];

  const activeFilterCount = (fTipe !== "all" ? 1 : 0) + (fMaskapai !== "all" ? 1 : 0) + (fBulan !== "all" ? 1 : 0);
  const resetFilters = () => { setFTipe("all"); setFMaskapai("all"); setFBulan("all"); };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paket Umroh</h1>
          <p className="text-sm text-muted-foreground tracking-tight">
            {filtered.length} dari {packages.length} paket · dikelompokkan per {groupBy === "none" ? "—" : groupBy}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <Button variant="outline" onClick={handleExitSelectionMode}>Batal</Button>
          ) : (
            <Button variant="outline" onClick={() => setSelectionMode(true)}>Pilih</Button>
          )}
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel
          </Button>
          <Button
            variant="outline"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              try {
                const { data, error } = await supabase.functions.invoke("sync-google-sheets");
                if (error) throw error;
                toast.success(data?.message || "Sync selesai");
                fetchPackages();
              } catch (e: any) { toast.error("Sync gagal: " + e.message); }
              finally { setSyncing(false); }
            }}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync Sheets"}
          </Button>
          <Button onClick={() => navigate("/admin/packages/new")}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Paket
          </Button>
        </div>
      </div>

      {/* Saved Views (horizontal tabs) */}
      <div className="border-b">
        <div className="flex items-center gap-1 overflow-x-auto pb-px">
          {SAVED_VIEWS.map((v) => {
            const active = v.id === view;
            const count = packages.filter(v.predicate).length;
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={cn(
                  "relative px-3 py-2 text-sm tracking-tight whitespace-nowrap transition-colors",
                  active ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v.label}
                <span className={cn("ml-2 text-xs", active ? "text-muted-foreground" : "text-muted-foreground/60")}>{count}</span>
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={fTipe} onValueChange={setFTipe}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Tipe" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              {TIERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fMaskapai} onValueChange={setFMaskapai}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Maskapai" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Maskapai</SelectItem>
              {airlineOptions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fBulan} onValueChange={setFBulan}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Bulan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {monthOptions.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 px-2 text-muted-foreground">
              <X className="h-3 w-3 mr-1" /> Reset
            </Button>
          )}
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupKey)}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tanpa Grup</SelectItem>
              <SelectItem value="tipe">Grup: Tipe</SelectItem>
              <SelectItem value="maskapai">Grup: Maskapai</SelectItem>
              <SelectItem value="bulan">Grup: Bulan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sortPrimary} onValueChange={(v) => setSortPrimary(v as SortKey)}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>1. {o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortSecondary} onValueChange={(v) => setSortSecondary(v as SortKey)}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>2. {o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {selectionMode && (
            <div className="p-3 border-b">
              <BulkActions
                selectedIds={selectedIds}
                totalCount={flatList.length}
                onSelectAll={selectAll}
                allSelected={allSelected}
                actions={bulkActions}
                onAction={handleBulkAction}
              />
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {selectionMode && <TableHead className="w-10" />}
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Identitas Paket</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-[120px]">Tipe</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-[150px]">Tanggal</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-[100px]">Durasi</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-[160px]">Maskapai</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-[160px] text-right">Harga (Quad)</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-[140px]">Status</TableHead>
                <TableHead className="text-right w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {flatList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={selectionMode ? 9 : 8} className="text-center text-muted-foreground py-12">
                    Tidak ada paket yang cocok dengan filter
                  </TableCell>
                </TableRow>
              ) : (
                grouped.map((group) => {
                  let runningIndex = grouped
                    .slice(0, grouped.indexOf(group))
                    .reduce((acc, g) => acc + g.items.length, 0);
                  return (
                    <>
                      {groupBy !== "none" && (
                        <TableRow key={`grp-${group.key}`} className="bg-muted/60 hover:bg-muted/60 border-y">
                          <TableCell colSpan={selectionMode ? 9 : 8} className="py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">{group.key}</span>
                              <span className="text-xs text-muted-foreground">{group.items.length} paket</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {group.items.map((pkg) => {
                        const idx = runningIndex++;
                        const t = tierMeta(getTier(pkg));
                        const price = getDisplayPrice(pkg);
                        const selected = isSelected(pkg.id);
                        return (
                          <TableRow
                            key={pkg.id}
                            className={cn(
                              "border-b last:border-b-0 transition-colors",
                              idx % 2 === 1 && "bg-muted/20",
                              selected && "bg-primary/10 hover:bg-primary/10",
                              selectionMode && "cursor-pointer select-none"
                            )}
                            onClick={(e) => handleRowClick(pkg, idx, e)}
                          >
                            {selectionMode && (
                              <TableCell className="w-10">
                                <Checkbox
                                  checked={selected}
                                  onCheckedChange={() => { toggleSelect(pkg.id); lastSelectedIndex.current = idx; }}
                                  aria-label={`Select ${pkg.package_name}`}
                                />
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="font-semibold text-foreground tracking-tight">{autoRowName(pkg)}</div>
                              <div className="text-xs text-muted-foreground tracking-tight truncate max-w-[420px]">{pkg.package_name}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("font-medium border", t.tone)}>{t.label}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-foreground tabular-nums">
                              {format(parseISO(pkg.departure_date), "dd MMM yyyy", { locale: idLocale })}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground tabular-nums">{pkg.duration_days} hari</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{pkg.flight || "—"}</TableCell>
                            <TableCell className="text-right tabular-nums font-semibold text-foreground">
                              {price > 0 ? `Rp ${formatNumber(price)}` : <span className="text-muted-foreground font-normal">—</span>}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Badge variant={pkg.status === "published" ? "default" : "secondary"} className="text-xs">
                                  {pkg.status === "published" ? "Published" : "Draft"}
                                </Badge>
                                {pkg.is_sold_out && <Badge variant="destructive" className="text-xs">Sold Out</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/brochure/${pkg.slug}`)} title="Digital Brochure">
                                  <Presentation className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/packages/${pkg.id}`)} title="Edit">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteId(pkg.id)} title="Hapus">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </>
                  );
                })
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

      <BulkPackageUpload open={importOpen} onOpenChange={setImportOpen} onSuccess={fetchPackages} />
    </div>
  );
};

export default Packages;
