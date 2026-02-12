import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

interface ParsedPackage {
  rowIndex: number;
  departure_date: string;
  duration_days: number;
  tier: string;
  slots_total: number;
  package_name: string;
  timeframe: string;
  start_airport: string;
  flight: string;
  flight_type: string;
  route: string;
  itinerary: string;
  nights_makkah: number;
  nights_madinah: number;
  hotel_makkah: string;
  hotel_madinah: string;
  hotel_extra: string;
  selling_points: string;
  price_quad: number;
  price_triple: number;
  price_double: number;
  max_discount: number;
  slug: string;
  errors: string[];
}

const TIER_MAP: Record<string, string> = {
  "hemat": "hemat",
  "nyaman": "nyaman",
  "five-star": "five-star",
  "fivestar": "five-star",
  "five star": "five-star",
  "pelataran hemat": "pelataran-hemat",
  "pelataran-hemat": "pelataran-hemat",
};

const TEMPLATE_COLUMNS = [
  "Tanggal Berangkat",
  "Durasi",
  "Klasifikasi Paket",
  "Seat",
  "Judul Paket",
  "Timeframe",
  "Start (Bandara)",
  "Maskapai",
  "Direct/Transit",
  "Rute",
  "Itinerary",
  "Malam Makkah",
  "Malam Madinah",
  "Hotel Makkah",
  "Hotel Madinah",
  "Hotel Kota +",
  "Selling Points",
  "Harga Quad",
  "Harga Triple",
  "Harga Double",
  "Maks Diskon",
];

function parsePrice(val: unknown): number {
  if (val === null || val === undefined || val === "-" || val === "") return 0;
  if (typeof val === "number") return Math.abs(val);
  const str = String(val).replace(/[^0-9]/g, "");
  return str ? parseInt(str, 10) : 0;
}

function parseDate(val: unknown): string {
  if (!val) return "";
  if (typeof val === "number") {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }
  const str = String(val).trim();
  // Try YYYY-MM-DD format first (avoid UTC timezone shift)
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, "0")}-${String(isoMatch[3]).padStart(2, "0")}`;
  }
  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${String(dmyMatch[2]).padStart(2, "0")}-${String(dmyMatch[1]).padStart(2, "0")}`;
  }
  // Fallback: use local date components to avoid UTC -1 day issue
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return "";
}

function slugify(text: string, date: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return date ? `${slug}-${date}` : slug;
}

function validateRow(row: ParsedPackage): string[] {
  const errors: string[] = [];
  if (!row.departure_date) errors.push("Tanggal kosong");
  if (!row.duration_days || row.duration_days < 1) errors.push("Durasi invalid");
  if (!row.tier) errors.push("Klasifikasi tidak dikenali");
  if (!row.package_name) errors.push("Judul kosong");
  if (!row.flight) errors.push("Maskapai kosong");
  if (!row.price_quad) errors.push("Harga Quad kosong");
  return errors;
}

function parseExcelData(worksheet: XLSX.WorkSheet): ParsedPackage[] {
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
  
  return jsonData.map((row, idx) => {
    const tierRaw = String(row["Klasifikasi Paket"] || "").toLowerCase().trim();
    const tier = TIER_MAP[tierRaw] || "";
    const departureDateStr = parseDate(row["Tanggal Berangkat"] || row["Berangkat"]);
    const packageName = String(row["Judul Paket"] || "").trim();
    const flightTypeRaw = String(row["Direct/Transit"] || row["Direct/Tran"] || "").toLowerCase().trim();

    const parsed: ParsedPackage = {
      rowIndex: idx + 1,
      departure_date: departureDateStr,
      duration_days: parseInt(String(row["Durasi"] || "0"), 10) || 0,
      tier,
      slots_total: parseInt(String(row["Seat"] || "0"), 10) || 0,
      package_name: packageName,
      timeframe: String(row["Timeframe"] || "").trim(),
      start_airport: String(row["Start (Bandara)"] || row["Start"] || "").trim(),
      flight: String(row["Maskapai"] || "").trim(),
      flight_type: flightTypeRaw.includes("direct") ? "direct" : "transit",
      route: String(row["Rute"] || "").trim(),
      itinerary: String(row["Itinerary"] || "").trim(),
      nights_makkah: parseInt(String(row["Malam Makkah"] || row["Makkah"] || "0"), 10) || 0,
      nights_madinah: parseInt(String(row["Malam Madinah"] || row["Madinah"] || "0"), 10) || 0,
      hotel_makkah: String(row["Hotel Makkah"] || row["Hotel"] || "").trim(),
      hotel_madinah: String(row["Hotel Madinah"] || "").trim(),
      hotel_extra: String(row["Hotel Kota +"] || "").trim(),
      selling_points: String(row["Selling Points"] || "").trim(),
      price_quad: parsePrice(row["Harga Quad"] || row["Quad"]),
      price_triple: parsePrice(row["Harga Triple"] || row["Triple"]),
      price_double: parsePrice(row["Harga Double"] || row["Double"]),
      max_discount: parsePrice(row["Maks Diskon"]),
      slug: slugify(packageName, departureDateStr),
      errors: [],
    };

    parsed.errors = validateRow(parsed);
    return parsed;
  });
}

interface HotelRecord {
  name: string;
  star_rating: number;
  distance: string;
  walking_duration: string;
  location: string;
}

function findHotel(hotels: HotelRecord[], name: string, location: string): HotelRecord | undefined {
  if (!name) return undefined;
  const normalized = name.toLowerCase().trim();
  return hotels.find(
    (h) => h.name.toLowerCase().trim() === normalized && h.location === location
  ) || hotels.find(
    (h) => h.name.toLowerCase().trim().includes(normalized) || normalized.includes(h.name.toLowerCase().trim())
  );
}

function buildUpsertPayload(row: ParsedPackage, hotels: HotelRecord[]) {
  const makkahHotel = findHotel(hotels, row.hotel_makkah, "makkah");
  const madinahHotel = findHotel(hotels, row.hotel_madinah, "madinah");

  const priceJson = { quad: row.price_quad, triple: row.price_triple, double: row.price_double };

  const hotelFields = (prefix: string, makkah: HotelRecord | undefined, madinah: HotelRecord | undefined) => {
    const makkahPrefix = prefix ? `${prefix}_makkah` : "makkah";
    const madinahPrefix = prefix ? `${prefix}_madinah` : "madinah";
    return {
      [`${makkahPrefix}_hotel_name`]: row.hotel_makkah || null,
      [`${makkahPrefix}_hotel_star`]: makkah?.star_rating || null,
      [`${makkahPrefix}_distance`]: makkah?.distance || null,
      [`${makkahPrefix}_duration_walk`]: makkah?.walking_duration || null,
      [`${madinahPrefix}_hotel_name`]: row.hotel_madinah || null,
      [`${madinahPrefix}_hotel_star`]: madinah?.star_rating || null,
      [`${madinahPrefix}_distance`]: madinah?.distance || null,
      [`${madinahPrefix}_duration_walk`]: madinah?.walking_duration || null,
    };
  };

  const transportField = (tier: string) => {
    switch (tier) {
      case "hemat": return "hemat_transport";
      case "five-star": return "five_star_transport";
      case "pelataran-hemat": return "pelataran_transport";
      default: return "best_seller_transport";
    }
  };

  const priceField = (tier: string) => {
    switch (tier) {
      case "hemat": return "hemat_package_price";
      case "five-star": return "five_star_package_price";
      case "pelataran-hemat": return "pelataran_package_price";
      default: return "package_price";
    }
  };

  const hotelPrefix = (tier: string) => {
    switch (tier) {
      case "hemat": return "hemat";
      case "five-star": return "five_star";
      case "pelataran-hemat": return "pelataran";
      default: return "";
    }
  };

  const payload: Record<string, unknown> = {
    package_name: row.package_name,
    slug: row.slug,
    departure_date: row.departure_date,
    duration_days: row.duration_days,
    flight: row.flight,
    flight_type: row.flight_type,
    available_tiers: [row.tier],
    slots_total: row.slots_total || null,
    status: "draft",
    // Always set package_price - use actual prices for nyaman, default for others
    package_price: row.tier === "nyaman" ? priceJson : { quad: 0, triple: 0, double: 0 },
    [priceField(row.tier)]: priceJson,
    [transportField(row.tier)]: row.start_airport || null,
    ...hotelFields(hotelPrefix(row.tier), makkahHotel, madinahHotel),
  };

  return payload;
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const sampleData = [
    {
      "Tanggal Berangkat": "2026-07-03",
      "Durasi": 12,
      "Klasifikasi Paket": "Hemat",
      "Seat": 40,
      "Judul Paket": "Umroh Hemat",
      "Timeframe": "Bulan Juli",
      "Start (Bandara)": "CGK",
      "Maskapai": "Garuda",
      "Direct/Transit": "Direct",
      "Rute": "JED-MED",
      "Itinerary": "Makkah - Madinah",
      "Malam Makkah": 7,
      "Malam Madinah": 3,
      "Hotel Makkah": "Nada Ajyad",
      "Hotel Madinah": "Manazeel Safia",
      "Hotel Kota +": "-",
      "Selling Points": "Thaif + Romansiah, Fotografer",
      "Harga Quad": 30900000,
      "Harga Triple": 32900000,
      "Harga Double": 34900000,
      "Maks Diskon": 1000000,
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData, { header: TEMPLATE_COLUMNS });
  
  // Set column widths
  ws["!cols"] = TEMPLATE_COLUMNS.map((col) => ({ wch: Math.max(col.length + 2, 16) }));
  
  XLSX.utils.book_append_sheet(wb, ws, "Paket Umroh");
  XLSX.writeFile(wb, "template-paket-umroh.xlsx");
  toast.success("Template berhasil didownload");
}

interface BulkPackageUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const BulkPackageUpload = ({ open, onOpenChange, onSuccess }: BulkPackageUploadProps) => {
  const [parsedData, setParsedData] = useState<ParsedPackage[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "importing">("upload");
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [fileName, setFileName] = useState("");

  const resetState = useCallback(() => {
    setParsedData([]);
    setStep("upload");
    setImportProgress({ done: 0, total: 0, errors: 0 });
    setFileName("");
  }, []);

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsed = parseExcelData(ws);
        
        if (parsed.length === 0) {
          toast.error("File kosong atau format tidak sesuai");
          return;
        }

        setParsedData(parsed);
        setStep("preview");
        toast.success(`${parsed.length} baris berhasil diparsing`);
      } catch (err) {
        toast.error("Gagal membaca file: " + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    const validRows = parsedData.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) {
      toast.error("Tidak ada data valid untuk diimport");
      return;
    }

    setStep("importing");
    setImportProgress({ done: 0, total: validRows.length, errors: 0 });

    // Fetch hotels from DB for auto-fill
    const { data: hotelsData } = await supabase.from("hotels").select("name, star_rating, distance, walking_duration, location");
    const hotels: HotelRecord[] = hotelsData || [];

    let successCount = 0;
    let errorCount = 0;

    for (const row of validRows) {
      try {
        const payload = buildUpsertPayload(row, hotels);
        const { error } = await supabase
          .from("packages")
          .upsert(payload as any, { onConflict: "slug" });

        if (error) throw error;
        successCount++;
      } catch (err) {
        console.error(`Row ${row.rowIndex} error:`, err);
        errorCount++;
      }
      setImportProgress({ done: successCount + errorCount, total: validRows.length, errors: errorCount });
    }

    if (errorCount === 0) {
      toast.success(`${successCount} paket berhasil diimport!`);
    } else {
      toast.warning(`${successCount} berhasil, ${errorCount} gagal`);
    }

    onSuccess();
    setTimeout(handleClose, 1500);
  };

  const validCount = parsedData.filter((r) => r.errors.length === 0).length;
  const errorCount = parsedData.filter((r) => r.errors.length > 0).length;

  const tierBadgeColor = (tier: string) => {
    switch (tier) {
      case "hemat": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "nyaman": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "five-star": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      case "pelataran-hemat": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Paket dari Excel
          </DialogTitle>
          <DialogDescription>
            Upload file Excel (.xlsx) untuk menambahkan atau memperbarui paket secara massal.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-12 text-center w-full hover:border-primary/50 transition-colors">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">Drop file Excel di sini</p>
              <p className="text-sm text-muted-foreground mb-4">
                Format: .xlsx, .xls, atau .csv
              </p>
              <label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button variant="outline" asChild>
                  <span>Pilih File</span>
                </Button>
              </label>
            </div>

            <Button variant="ghost" onClick={downloadTemplate} className="text-muted-foreground">
              <Download className="mr-2 h-4 w-4" />
              Download Template Excel
            </Button>
          </div>
        )}

        {step === "preview" && (
          <>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="gap-1">
                  <FileSpreadsheet className="h-3 w-3" />
                  {fileName}
                </Badge>
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" /> {validCount} valid
                  </span>
                  {errorCount > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-4 w-4" /> {errorCount} error
                    </span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={resetState}>
                <X className="h-4 w-4 mr-1" /> Ganti File
              </Button>
            </div>

            <ScrollArea className="flex-1 max-h-[50vh] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Judul Paket</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Maskapai</TableHead>
                    <TableHead>Hotel Makkah</TableHead>
                    <TableHead>Hotel Madinah</TableHead>
                    <TableHead className="text-right">Quad</TableHead>
                    <TableHead className="text-right">Triple</TableHead>
                    <TableHead className="text-right">Double</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row) => {
                    const hasError = row.errors.length > 0;
                    return (
                      <TableRow key={row.rowIndex} className={hasError ? "bg-destructive/5" : ""}>
                        <TableCell className="text-muted-foreground">{row.rowIndex}</TableCell>
                        <TableCell className={cn("font-medium", !row.package_name && "text-destructive")}>
                          {row.package_name || "—"}
                        </TableCell>
                        <TableCell className={cn(!row.departure_date && "text-destructive")}>
                          {row.departure_date || "—"}
                        </TableCell>
                        <TableCell>{row.duration_days || "—"}</TableCell>
                        <TableCell>
                          {row.tier ? (
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", tierBadgeColor(row.tier))}>
                              {row.tier}
                            </span>
                          ) : (
                            <span className="text-destructive text-xs">invalid</span>
                          )}
                        </TableCell>
                        <TableCell>{row.flight || "—"}</TableCell>
                        <TableCell>{row.hotel_makkah || "—"}</TableCell>
                        <TableCell>{row.hotel_madinah || "—"}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", !row.price_quad && "text-destructive")}>
                          {row.price_quad ? `Rp ${formatNumber(row.price_quad)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.price_triple ? `Rp ${formatNumber(row.price_triple)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.price_double ? `Rp ${formatNumber(row.price_double)}` : "—"}
                        </TableCell>
                        <TableCell>
                          {hasError ? (
                            <span className="text-xs text-destructive" title={row.errors.join(", ")}>
                              <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                              {row.errors[0]}
                            </span>
                          ) : (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />OK
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>Batal</Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                <Upload className="mr-2 h-4 w-4" />
                Import {validCount} Paket
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <p className="text-lg font-medium">
              Mengimport {importProgress.done} / {importProgress.total} paket...
            </p>
            {importProgress.errors > 0 && (
              <p className="text-sm text-destructive">{importProgress.errors} gagal</p>
            )}
            <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
