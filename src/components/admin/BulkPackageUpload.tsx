import { useState, useCallback, useEffect } from "react";
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
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, X, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatNumber } from "@/lib/utils";

export interface HotelRecord {
  name: string;
  star_rating: number;
  distance: string;
  walking_duration: string;
  location: string;
}

export interface ExistingPackage {
  id: string;
  slug: string;
  banner_image: string | null;
  catalog_link: string | null;
  itinerary_link: string | null;
}

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
  nights_extra: number;
  hotel_makkah: string;
  hotel_madinah: string;
  hotel_extra: string;
  facilities: string;
  selling_points: string;
  price_quad: number;
  price_triple: number;
  price_double: number;
  max_discount: number;
  slots_remaining: number;
  banner_image: string;
  catalog_link: string;
  itinerary_link: string;
  slug: string;
  errors: string[];
  matched_flight?: boolean;
  matched_airport?: boolean;
  matched_route?: boolean;
  hotel_makkah_record?: HotelRecord;
  hotel_madinah_record?: HotelRecord;
  hotel_extra_record?: HotelRecord;
  isUpdate?: boolean;
}

function fuzzyMatchTier(input: string): string {
  const n = normalizeStr(input);
  if (n.includes("five") || n.includes("bintang 5")) return "five-star";
  if (n.includes("pelataran")) return "pelataran-hemat";
  if (n.includes("nyaman")) return "nyaman";
  if (n.includes("hemat")) return "hemat";
  return "";
}

const TEMPLATE_COLUMNS = [
  "Judul Paket",
  "Klasifikasi Paket",
  "Timeframe",
  "Start",
  "Maskapai Berangkat",
  "Durasi",
  "Direct/Transit",
  "Rute",
  "Itinerary",
  "Malam Makkah",
  "Malam Madinah",
  "Malam Kota +",
  "Hotel Makkah",
  "Hotel Madinah",
  "Hotel Kota +",
  "Harga Quad",
  "Triple",
  "Double",
  "Maks Diskon",
  "Seat Sisa",
  "Seat",
  "Fasilitas (Include & Exclude)",
  "Selling Points",
  "File Flyer",
  "File Katalog",
  "File Itinerary",
];

// ─── Fuzzy matching utilities ───────────────────────────────────────────
function normalizeStr(s: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const nh = headers.map((h) => (h ? normalizeStr(String(h)) : ""));
  const nn = possibleNames.map(normalizeStr);

  // Aliases are ordered most-specific first. Resolve exact/prefix/substring
  // for each alias in turn before falling back to the next, less-specific
  // alias — otherwise a later alias's exact match (e.g. bare "quad") can beat
  // an earlier alias's substring match (e.g. "quad + 3.5" inside a header with
  // extra merged-cell text like "PAKAI HARGA INI Quad + 3.5").
  for (const name of nn) {
    if (!name) continue;
    let idx = nh.indexOf(name);
    if (idx !== -1) return idx;
    idx = nh.findIndex((h) => h.startsWith(name));
    if (idx !== -1) return idx;
    idx = nh.findIndex((h) => h.includes(name));
    if (idx !== -1) return idx;
  }
  return -1;
}

function findClosestString(input: string, references: string[]): string {
  if (!input) return "";
  const n = normalizeStr(input);
  if (!n) return input.trim();
  
  // Exact match
  for (const ref of references) {
    if (normalizeStr(ref) === n) return ref;
  }
  
  // Substring match
  for (const ref of references) {
    const nr = normalizeStr(ref);
    if (nr && (nr.includes(n) || n.includes(nr))) return ref;
  }
  
  // Word-level match
  const inputWords = n.split(" ");
  for (const ref of references) {
    const refWords = normalizeStr(ref).split(" ");
    if (inputWords.some((w) => w.length >= 3 && refWords.some((rw) => rw.includes(w) || w.includes(rw)))) {
      return ref;
    }
  }
  
  return input.trim();
}

function fuzzyMatchFlightType(input: string): string {
  const n = normalizeStr(input);
  if (n.includes("direct") || n === "d" || n.includes("langsung") || n.includes("tanpa transit")) return "direct";
  if (n.includes("transit") || n === "t") return "transit";
  return "direct";
}

// ─── Column mapping with fuzzy header detection ─────────────────────────
const COLUMN_ALIASES: Record<string, string[]> = {
  departure_date: ["tanggal berangkat", "berangkat", "departure", "tgl berangkat", "tanggal"],
  duration_days: ["durasi", "duration", "hari"],
  tier: ["klasifikasi paket", "klasifikasi", "tier", "paket"],
  slots_total: ["seat", "kuota", "slots"],
  slots_remaining: ["seat sisa", "sisa seat", "sisa"],
  package_name: ["judul paket", "judul", "nama paket", "package name"],
  timeframe: ["timeframe", "time frame", "waktu"],
  start_airport: ["start bandara", "start", "bandara", "airport"],
  flight: ["maskapai berangkat", "maskapai", "airline", "penerbangan"],
  flight_type: ["direct transit", "direct/transit", "tipe penerbangan", "flight type"],
  route: ["rute", "route"],
  itinerary: ["itinerary", "jadwal"],
  nights_makkah: ["malam makkah", "makkah"],
  nights_madinah: ["malam madinah", "madinah"],
  nights_extra: ["malam kota +", "malam kota", "malam extra", "malam plus"],
  hotel_makkah: ["hotel makkah"],
  hotel_madinah: ["hotel madinah"],
  hotel_extra: ["hotel kota +", "hotel kota", "hotel extra", "hotel plus"],
  facilities: ["fasilitas (include & exclude)", "fasilitas", "include exclude", "include"],
  selling_points: ["selling points", "selling point", "keunggulan"],
  // Prefer the marked-up selling-price columns ("Quad + 3.5" etc); fall back to
  // the base columns only when the +3.5 columns are absent.
  price_quad: ["harga quad + 3.5", "quad + 3.5", "harga quad", "quad"],
  price_triple: ["harga triple + 3.5", "triple + 3.5", "harga triple", "triple"],
  price_double: ["harga double + 3.5", "double + 3.5", "harga double", "double"],
  max_discount: ["maks diskon", "max diskon", "diskon"],
  banner_image: ["file flyer", "flyer", "banner"],
  catalog_link: ["file katalog", "katalog", "catalog"],
  itinerary_link: ["file itinerary", "file jadwal", "link itinerary"],
};

function buildColumnMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    map[field] = findColumnIndex(headers, aliases);
  }
  return map;
}

function getVal(row: unknown[], idx: number): unknown {
  return idx >= 0 ? row[idx] : undefined;
}

// ─── Parsing helpers ────────────────────────────────────────────────────
function parsePrice(val: unknown): number {
  if (val === null || val === undefined || val === "-" || val === "") return 0;
  if (typeof val === "number") return Math.abs(val);
  const str = String(val).replace(/[^0-9]/g, "");
  return str ? parseInt(str, 10) : 0;
}

function parseDate(val: unknown): string {
  if (!val) return "";
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }
  const str = String(val).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, "0")}-${String(isoMatch[3]).padStart(2, "0")}`;
  }
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${String(dmyMatch[2]).padStart(2, "0")}-${String(dmyMatch[1]).padStart(2, "0")}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

function parseExcelData(
  worksheet: XLSX.WorkSheet,
  referenceData?: { flights: string[]; airports: string[]; routes: string[] },
  hotels?: HotelRecord[],
  existingPackages?: Record<string, ExistingPackage>
): ParsedPackage[] {
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "" });
  if (rawData.length < 2) return [];

  // Find header row by scanning first 10 rows
  let headerRowIdx = -1;
  let colMap: Record<string, number> = {};
  
  for (let r = 0; r < Math.min(rawData.length, 10); r++) {
    const row = rawData[r] as string[];
    const headers = row.map((h) => String(h || ""));
    const map = buildColumnMap(headers);
    
    // Count how many recognized columns we found
    const matchCount = Object.values(map).filter(idx => idx !== -1).length;
    
    // If we matched at least 3 known columns, assume this is the header row
    if (matchCount >= 3) {
      headerRowIdx = r;
      colMap = map;
      break;
    }
  }

  // If no header row found, fallback to row 0
  if (headerRowIdx === -1) {
    const headers = (rawData[0] as string[]).map((h) => String(h || ""));
    colMap = buildColumnMap(headers);
    headerRowIdx = 0;
  }

  const dataRows = rawData.slice(headerRowIdx + 1);

  return dataRows
    .filter((row) => {
      // Skip completely empty rows
      const arr = row as unknown[];
      return arr.some((cell) => cell !== "" && cell !== null && cell !== undefined);
    })
    .map((rawRow, idx) => {
      const row = rawRow as unknown[];
      const tierRaw = String(getVal(row, colMap.tier) || "").toLowerCase().trim();
      const tier = fuzzyMatchTier(tierRaw);
      const departureDateStr = parseDate(getVal(row, colMap.departure_date));
      const packageName = String(getVal(row, colMap.package_name) || "").trim();
      const slug = slugify(packageName, departureDateStr);
      const isUpdate = existingPackages ? !!existingPackages[departureDateStr] : false;
      
      const rawFlight = String(getVal(row, colMap.flight) || "").trim();
      const flight = referenceData ? findClosestString(rawFlight, referenceData.flights) : rawFlight;
      const matched_flight = referenceData ? referenceData.flights.includes(flight) && flight !== "" : false;
      
      const rawFlightType = String(getVal(row, colMap.flight_type) || "").trim();
      
      const rawStartAirport = String(getVal(row, colMap.start_airport) || "").trim();
      const start_airport = referenceData ? findClosestString(rawStartAirport, referenceData.airports) : rawStartAirport;
      const matched_airport = referenceData ? referenceData.airports.includes(start_airport) && start_airport !== "" : false;
      
      const rawRoute = String(getVal(row, colMap.route) || "").trim();
      const route = referenceData ? findClosestString(rawRoute, referenceData.routes) : rawRoute;
      const matched_route = referenceData ? referenceData.routes.includes(route) && route !== "" : false;

      const rawHotelMakkah = String(getVal(row, colMap.hotel_makkah) || "").trim();
      const rawHotelMadinah = String(getVal(row, colMap.hotel_madinah) || "").trim();
      const rawHotelExtra = String(getVal(row, colMap.hotel_extra) || "").trim();

      const hotel_makkah_record = hotels ? findHotel(hotels, rawHotelMakkah, "makkah") : undefined;
      const hotel_madinah_record = hotels ? findHotel(hotels, rawHotelMadinah, "madinah") : undefined;
      const hotel_extra_record = hotels ? findHotel(hotels, rawHotelExtra, "") : undefined;

      const parsed: ParsedPackage = {
        rowIndex: idx + 1,
        departure_date: departureDateStr,
        duration_days: parseInt(String(getVal(row, colMap.duration_days) || "0"), 10) || 0,
        tier,
        slots_total: parseInt(String(getVal(row, colMap.slots_total) || "0"), 10) || 0,
        slots_remaining: parseInt(String(getVal(row, colMap.slots_remaining) || "0"), 10) || 0,
        package_name: packageName,
        timeframe: String(getVal(row, colMap.timeframe) || "").trim(),
        start_airport,
        flight,
        flight_type: fuzzyMatchFlightType(rawFlightType),
        route,
        itinerary: String(getVal(row, colMap.itinerary) || "").trim(),
        nights_makkah: parseInt(String(getVal(row, colMap.nights_makkah) || "0"), 10) || 0,
        nights_madinah: parseInt(String(getVal(row, colMap.nights_madinah) || "0"), 10) || 0,
        nights_extra: parseInt(String(getVal(row, colMap.nights_extra) || "0"), 10) || 0,
        hotel_makkah: rawHotelMakkah,
        hotel_madinah: rawHotelMadinah,
        hotel_extra: rawHotelExtra,
        facilities: String(getVal(row, colMap.facilities) || "").trim(),
        selling_points: String(getVal(row, colMap.selling_points) || "").trim(),
        price_quad: parseInt(String(getVal(row, colMap.price_quad) || "0").replace(/\D/g, ""), 10) || 0,
        price_triple: parseInt(String(getVal(row, colMap.price_triple) || "0").replace(/\D/g, ""), 10) || 0,
        price_double: parseInt(String(getVal(row, colMap.price_double) || "0").replace(/\D/g, ""), 10) || 0,
        max_discount: parseInt(String(getVal(row, colMap.max_discount) || "0").replace(/\D/g, ""), 10) || 0,
        banner_image: String(getVal(row, colMap.banner_image) || "").trim(),
        catalog_link: String(getVal(row, colMap.catalog_link) || "").trim(),
        itinerary_link: String(getVal(row, colMap.itinerary_link) || "").trim(),
        slug,
        errors: [],
        matched_flight,
        matched_airport,
        matched_route,
        hotel_makkah_record,
        hotel_madinah_record,
        hotel_extra_record,
        isUpdate,
      };

      parsed.errors = validateRow(parsed);
      return parsed;
    });
}

function findHotel(hotels: HotelRecord[], name: string, location: string): HotelRecord | undefined {
  if (!name) return undefined;
  const n = normalizeStr(name);
  if (location) {
    const fuzzyLoc = hotels.find(
      (h) => h.location === location && (normalizeStr(h.name).includes(n) || n.includes(normalizeStr(h.name)))
    );
    if (fuzzyLoc) return fuzzyLoc;
  }
  return hotels.find(
    (h) => normalizeStr(h.name).includes(n) || n.includes(normalizeStr(h.name))
  );
}

function buildUpsertPayload(row: ParsedPackage, hotels: HotelRecord[], existingPackages: Record<string, ExistingPackage>, defaultIncludes: string, defaultExcludes: string) {
  const makkahHotel = row.hotel_makkah_record;
  const madinahHotel = row.hotel_madinah_record;
  const existingPkg = existingPackages[row.departure_date];

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

  const defaultTransport = (tier: string) => {
    return tier === "five-star" ? "Kereta Cepat" : "Bus Eksklusif";
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

  const slots_total = row.slots_total || 0;
  let slots_filled = 0;
  if (row.slots_remaining > 0 && slots_total > 0) {
    slots_filled = Math.max(0, slots_total - row.slots_remaining);
  }

  const payload: Record<string, unknown> = {
    package_name: row.package_name,
    slug: row.slug,
    departure_date: row.departure_date || new Date().toISOString().split('T')[0],
    duration_days: row.duration_days,
    flight: row.flight,
    flight_type: row.flight_type,
    available_tiers: [row.tier],
    slots_total: slots_total > 0 ? slots_total : 40,
    status: "draft",
    timeframe: row.timeframe || null,
    start_airport: row.start_airport || null,
    route: row.route || null,
    itinerary: row.itinerary || null,
    nights_makkah: row.nights_makkah || 0,
    nights_madinah: row.nights_madinah || 0,
    nights_extra: row.nights_extra || 0,
    hotel_extra: row.hotel_extra || null,
    included_items: row.facilities || defaultIncludes,
    selling_points: row.selling_points || "",
    max_discount: row.max_discount || 0,
    banner_image: existingPkg ? existingPkg.banner_image : (row.banner_image || null),
    catalog_link: existingPkg ? existingPkg.catalog_link : (row.catalog_link || null),
    itinerary_link: existingPkg ? existingPkg.itinerary_link : (row.itinerary_link || null),
    
    is_sold_out: false,
    waitlist_count: 0,
    gallery_images: [],
    excluded_items: defaultExcludes,
    equipment_list: "Perlengkapan Lengkap",

    // Default transports for all tiers (matches PackageForm defaults)
    hemat_transport: "Bus Eksklusif",
    best_seller_transport: "Bus Eksklusif",
    five_star_transport: "Kereta Cepat",
    pelataran_transport: "Bus Eksklusif",

    // Prices
    package_price: row.tier === "nyaman" ? priceJson : { quad: 0, triple: 0, double: 0 },
    hemat_package_price: row.tier === "hemat" ? priceJson : { quad: 0, triple: 0, double: 0 },
    five_star_package_price: row.tier === "five-star" ? priceJson : { quad: 0, triple: 0, double: 0 },
    pelataran_package_price: row.tier === "pelataran-hemat" ? priceJson : { quad: 0, triple: 0, double: 0 },

    // Hotels
    makkah_hotel_name: row.tier === "nyaman" ? (makkahHotel?.name || row.hotel_makkah || null) : null,
    makkah_hotel_star: row.tier === "nyaman" ? (makkahHotel?.star_rating || null) : null,
    makkah_distance: row.tier === "nyaman" ? (makkahHotel?.distance || null) : null,
    makkah_duration_walk: row.tier === "nyaman" ? (makkahHotel?.walking_duration || null) : null,
    
    madinah_hotel_name: row.tier === "nyaman" ? (madinahHotel?.name || row.hotel_madinah || null) : null,
    madinah_hotel_star: row.tier === "nyaman" ? (madinahHotel?.star_rating || null) : null,
    madinah_distance: row.tier === "nyaman" ? (madinahHotel?.distance || null) : null,
    madinah_duration_walk: row.tier === "nyaman" ? (madinahHotel?.walking_duration || null) : null,

    hemat_makkah_hotel_name: row.tier === "hemat" ? (makkahHotel?.name || row.hotel_makkah || null) : null,
    hemat_makkah_hotel_star: row.tier === "hemat" ? (makkahHotel?.star_rating || null) : null,
    hemat_makkah_distance: row.tier === "hemat" ? (makkahHotel?.distance || null) : null,
    hemat_makkah_duration_walk: row.tier === "hemat" ? (makkahHotel?.walking_duration || null) : null,

    hemat_madinah_hotel_name: row.tier === "hemat" ? (madinahHotel?.name || row.hotel_madinah || null) : null,
    hemat_madinah_hotel_star: row.tier === "hemat" ? (madinahHotel?.star_rating || null) : null,
    hemat_madinah_distance: row.tier === "hemat" ? (madinahHotel?.distance || null) : null,
    hemat_madinah_duration_walk: row.tier === "hemat" ? (madinahHotel?.walking_duration || null) : null,

    five_star_makkah_hotel_name: row.tier === "five-star" ? (makkahHotel?.name || row.hotel_makkah || null) : null,
    five_star_makkah_hotel_star: row.tier === "five-star" ? (makkahHotel?.star_rating || null) : null,
    five_star_makkah_distance: row.tier === "five-star" ? (makkahHotel?.distance || null) : null,
    five_star_makkah_duration_walk: row.tier === "five-star" ? (makkahHotel?.walking_duration || null) : null,

    five_star_madinah_hotel_name: row.tier === "five-star" ? (madinahHotel?.name || row.hotel_madinah || null) : null,
    five_star_madinah_hotel_star: row.tier === "five-star" ? (madinahHotel?.star_rating || null) : null,
    five_star_madinah_distance: row.tier === "five-star" ? (madinahHotel?.distance || null) : null,
    five_star_madinah_duration_walk: row.tier === "five-star" ? (madinahHotel?.walking_duration || null) : null,

    pelataran_makkah_hotel_name: row.tier === "pelataran-hemat" ? (makkahHotel?.name || row.hotel_makkah || null) : null,
    pelataran_makkah_hotel_star: row.tier === "pelataran-hemat" ? (makkahHotel?.star_rating || null) : null,
    pelataran_makkah_distance: row.tier === "pelataran-hemat" ? (makkahHotel?.distance || null) : null,
    pelataran_makkah_duration_walk: row.tier === "pelataran-hemat" ? (makkahHotel?.walking_duration || null) : null,

    pelataran_madinah_hotel_name: row.tier === "pelataran-hemat" ? (madinahHotel?.name || row.hotel_madinah || null) : null,
        pelataran_madinah_hotel_star: row.tier === "pelataran-hemat" ? (madinahHotel?.star_rating || null) : null,
    pelataran_madinah_distance: row.tier === "pelataran-hemat" ? (madinahHotel?.distance || null) : null,
    pelataran_madinah_duration_walk: row.tier === "pelataran-hemat" ? (madinahHotel?.walking_duration || null) : null,
  };

  // Hapus semua field yang bernilai null agar database menggunakan nilai bawaan (default)
  // Ini sama persis dengan kelakuan PackageForm yang tidak mengirimkan field kosong
  const cleanedPayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== null) {
      cleanedPayload[key] = value;
    }
  }

  return cleanedPayload;
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const sampleData = [
    {
      "Judul Paket": "Umroh Hemat",
      "Klasifikasi Paket": "Hemat",
      "Timeframe": "Bulan Juli",
      "Start": "CGK",
      "Maskapai Berangkat": "Garuda",
      "Durasi": 12,
      "Direct/Transit": "Direct",
      "Rute": "JED-MED",
      "Itinerary": "Makkah - Madinah",
      "Malam Makkah": 7,
      "Malam Madinah": 3,
      "Malam Kota +": 0,
      "Hotel Makkah": "Nada Ajyad",
      "Hotel Madinah": "Manazeel Safia",
      "Hotel Kota +": "-",
      "Harga Quad": 30900000,
      "Triple": 32900000,
      "Double": 34900000,
      "Maks Diskon": 1000000,
      "Seat Sisa": 10,
      "Seat": 40,
      "Fasilitas (Include & Exclude)": "Visa, Tiket, Hotel",
      "Selling Points": "Thaif + Romansiah, Fotografer",
      "File Flyer": "https://link-ke-flyer.com/image.jpg",
      "File Katalog": "https://link-ke-katalog.com/katalog.pdf",
      "File Itinerary": "https://link-ke-itinerary.com/itinerary.pdf",
    }
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData, { header: TEMPLATE_COLUMNS });
  ws["!cols"] = TEMPLATE_COLUMNS.map((col) => ({ wch: Math.max(col.length + 2, 16) }));
  XLSX.utils.book_append_sheet(wb, ws, "Paket Umroh");
  XLSX.writeFile(wb, "template-paket-umroh.xlsx");
  toast.success("Template berhasil didownload");
}

export interface BulkPackageUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const GOOGLE_SHEET_ID = "11R3Dv7YNJEYj0NLCY-xm4OH2PuZ_T85jsbizPJNQsn0";
const SHEET_NAME = "ALL PACKAGES_FIX";

export const BulkPackageUpload = ({ open, onOpenChange, onSuccess }: BulkPackageUploadProps) => {
  const [parsedData, setParsedData] = useState<ParsedPackage[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "importing">("upload");
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [fileName, setFileName] = useState("");
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [existingPackages, setExistingPackages] = useState<Record<string, ExistingPackage>>({});
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [referenceData, setReferenceData] = useState<{ flights: string[]; airports: string[]; routes: string[] }>({
    flights: [],
    airports: [],
    routes: [],
  });
  const [defaultIncludes, setDefaultIncludes] = useState<string>("");
  const [defaultExcludes, setDefaultExcludes] = useState<string>("");

  useEffect(() => {
    if (open) {
      const fetchRef = async () => {
        const { data } = await supabase.from("packages").select("id, flight, start_airport, route, slug, departure_date, banner_image, catalog_link, itinerary_link");
        if (data) {
          const flights = new Set<string>();
          const airports = new Set<string>();
          const routes = new Set<string>();
          const exMap: Record<string, ExistingPackage> = {};
          data.forEach((p) => {
            if (p.departure_date) {
              exMap[p.departure_date] = {
                id: p.id,
                slug: p.slug,
                banner_image: p.banner_image,
                catalog_link: p.catalog_link,
                itinerary_link: p.itinerary_link,
              };
            }
            if (p.flight) flights.add(p.flight.trim());
            if (p.start_airport) airports.add(p.start_airport.trim());
            if (p.route) routes.add(p.route.trim());
          });
          setExistingPackages(exMap);
          setReferenceData({
            flights: Array.from(flights).filter(Boolean),
            airports: Array.from(airports).filter(Boolean),
            routes: Array.from(routes).filter(Boolean),
          });
        }
        const { data: hotelsData } = await supabase.from("hotels").select("name, star_rating, distance, walking_duration, location");
        if (hotelsData) setHotels(hotelsData as HotelRecord[]);

        // Fetch default includes/excludes from package_items
        const { data: itemsData } = await supabase
          .from("package_items")
          .select("name, type, is_essential")
          .eq("is_active", true)
          .order("display_order", { ascending: true });
        if (itemsData) {
          // Default to STANDARD includes only (is_essential). Optional items are
          // opt-in per package, so a package with no facilities in the sheet gets
          // the standard set, never the optional extras.
          const includes = itemsData
            .filter((i: any) => i.type === "include" && i.is_essential)
            .map((i: any) => i.name);
          const excludes = itemsData.filter((i: any) => i.type === "exclude").map((i: any) => i.name);
          setDefaultIncludes(includes.join(", "));
          setDefaultExcludes(excludes.join(", "));
        }
      };
      fetchRef();
    }
  }, [open]);

  const resetState = useCallback(() => {
    setParsedData([]);
    setSelectedRowIndices(new Set());
    setStep("upload");
    setImportProgress({ done: 0, total: 0, errors: 0 });
    setFileName("");
    setIsFetchingSheet(false);
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
        const parsed = parseExcelData(ws, referenceData, hotels, existingPackages);
        
        if (parsed.length === 0) {
          toast.error("File kosong atau format tidak sesuai");
          return;
        }

        setParsedData(parsed);
        setSelectedRowIndices(new Set(parsed.filter(r => r.errors.length === 0).map(r => r.rowIndex)));
        setStep("preview");
        toast.success(`${parsed.length} baris berhasil diparsing`);
      } catch (err) {
        toast.error("Gagal membaca file: " + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleGoogleSheetsSync = async () => {
    setIsFetchingSheet(true);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Gagal mengunduh Google Sheet");
      
      const csvText = await response.text();
      const wb = XLSX.read(csvText, { type: "string", cellDates: true });
      
      const ws = wb.Sheets[wb.SheetNames[0]];
      const parsed = parseExcelData(ws, referenceData, hotels, existingPackages);
      
      if (parsed.length === 0) {
        toast.error("File kosong atau format tidak sesuai");
        setIsFetchingSheet(false);
        return;
      }

      setFileName("Google Sheets (Sync)");
      setParsedData(parsed);
      setSelectedRowIndices(new Set(parsed.filter(r => r.errors.length === 0).map(r => r.rowIndex)));
      setStep("preview");
      toast.success(`${parsed.length} baris berhasil diparsing dari Google Sheets`);
    } catch (err) {
      toast.error("Gagal sinkronisasi: " + (err as Error).message);
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const [lastErrorMsg, setLastErrorMsg] = useState<string>("");
  const [lastErrorPayload, setLastErrorPayload] = useState<any>(null);

  const handleImport = async () => {
    const validRows = parsedData.filter((row) => row.errors.length === 0 && selectedRowIndices.has(row.rowIndex));
    if (validRows.length === 0) {
      toast.error("Tidak ada data valid yang dipilih untuk diimport");
      return;
    }

    setStep("importing");
    setImportProgress({ done: 0, total: validRows.length, errors: 0 });
    setLastErrorMsg("");
    setLastErrorPayload(null);

    let successCount = 0;
    let errorCount = 0;
    let lastErr = "";
    let lastPayload = null;

    for (const row of validRows) {
      try {
        const payload = buildUpsertPayload(row, hotels, existingPackages, defaultIncludes, defaultExcludes);
        const existingPkg = existingPackages[row.departure_date];
        let error;

        if (existingPkg) {
          const { error: updateErr } = await supabase
            .from("packages")
            .update(payload as any)
            .eq("id", existingPkg.id);
          error = updateErr;
        } else {
          const { error: insertErr } = await supabase
            .from("packages")
            .insert(payload as any);
          error = insertErr;
        }

        if (error) {
          lastPayload = payload;
          throw error;
        }
        successCount++;
      } catch (err) {
        console.error(`Row ${row.rowIndex} error:`, err);
        errorCount++;
        lastErr = (err as Error).message || JSON.stringify(err);
        setLastErrorMsg(lastErr);
        if (lastPayload) setLastErrorPayload(lastPayload);
      }
      setImportProgress({ done: successCount + errorCount, total: validRows.length, errors: errorCount });
    }

    if (errorCount === 0) {
      toast.success(`${successCount} paket berhasil disimpan!`);
      onSuccess();
      setTimeout(handleClose, 1500);
    } else {
      toast.error(`${successCount} berhasil, ${errorCount} gagal. Pesan error: ${lastErr}`);
      // Do not auto-close so user can read the error!
    }
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
            Upload file Excel (.xlsx) untuk menambahkan atau memperbarui paket secara massal. Sistem akan mencocokkan nama maskapai dan hotel secara otomatis.
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

            <div className="flex gap-4 w-full max-w-md">
              <Button variant="outline" onClick={downloadTemplate} className="flex-1 text-muted-foreground">
                <Download className="mr-2 h-4 w-4" />
                Template Excel
              </Button>
              <Button 
                variant="default" 
                onClick={handleGoogleSheetsSync} 
                disabled={isFetchingSheet}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isFetchingSheet ? (
                  "Menarik Data..."
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Tarik Langsung Google Sheets
                  </>
                )}
              </Button>
            </div>
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

            <div className="flex-1 overflow-auto max-h-[50vh] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">
                      <Checkbox 
                        checked={selectedRowIndices.size === parsedData.filter(r => r.errors.length === 0).length && parsedData.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRowIndices(new Set(parsedData.filter(r => r.errors.length === 0).map(r => r.rowIndex)));
                          } else {
                            setSelectedRowIndices(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Judul Paket</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Timeframe</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Maskapai</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Direct/Transit</TableHead>
                    <TableHead>Rute</TableHead>
                    <TableHead>Itinerary</TableHead>
                    <TableHead>Malam Makkah</TableHead>
                    <TableHead>Malam Madinah</TableHead>
                    <TableHead>Malam Kota +</TableHead>
                    <TableHead>Hotel Makkah</TableHead>
                    <TableHead>Hotel Madinah</TableHead>
                    <TableHead>Hotel Kota +</TableHead>
                    <TableHead className="text-right">Quad</TableHead>
                    <TableHead className="text-right">Triple</TableHead>
                    <TableHead className="text-right">Double</TableHead>
                    <TableHead className="text-right">Maks Diskon</TableHead>
                    <TableHead className="text-right">Sisa / Total Seat</TableHead>
                    <TableHead>Fasilitas</TableHead>
                    <TableHead>Selling Points</TableHead>
                    <TableHead>Flyer</TableHead>
                    <TableHead>Katalog</TableHead>
                    <TableHead>Itinerary PDF</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row) => {
                    const hasError = row.errors.length > 0;
                    return (
                      <TableRow key={row.rowIndex} className={hasError ? "bg-destructive/5" : ""}>
                        <TableCell className="text-center">
                          <Checkbox 
                            disabled={hasError}
                            checked={selectedRowIndices.has(row.rowIndex)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedRowIndices);
                              if (checked) newSet.add(row.rowIndex);
                              else newSet.delete(row.rowIndex);
                              setSelectedRowIndices(newSet);
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.rowIndex}</TableCell>
                        <TableCell className={cn("font-medium", !row.package_name && "text-destructive")}>
                          <div className="min-w-[150px]">{row.package_name || "—"}</div>
                        </TableCell>
                        <TableCell className={cn(!row.departure_date && "text-destructive", "whitespace-nowrap")}>
                          {row.departure_date || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{row.timeframe || "—"}</TableCell>
                        <TableCell>
                          {row.start_airport || "—"} {row.matched_airport && <CheckCircle2 className="inline h-3 w-3 text-green-500 ml-1" />}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.flight || "—"} {row.matched_flight && <CheckCircle2 className="inline h-3 w-3 text-green-500 ml-1" />}
                        </TableCell>
                        <TableCell>{row.duration_days || "—"}</TableCell>
                        <TableCell>
                          {row.tier ? (
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", tierBadgeColor(row.tier))}>
                              {row.tier}
                            </span>
                          ) : (
                            <span className="text-destructive text-xs">invalid</span>
                          )}
                        </TableCell>
                        <TableCell>{row.flight_type || "—"}</TableCell>
                        <TableCell>
                          {row.route || "—"} {row.matched_route && <CheckCircle2 className="inline h-3 w-3 text-green-500 ml-1" />}
                        </TableCell>
                        <TableCell><div className="max-w-[150px] truncate" title={row.itinerary}>{row.itinerary || "—"}</div></TableCell>
                        <TableCell className="text-center">{row.nights_makkah || "—"}</TableCell>
                        <TableCell className="text-center">{row.nights_madinah || "—"}</TableCell>
                        <TableCell className="text-center">{row.nights_extra || "—"}</TableCell>
                        <TableCell>
                          <div className="min-w-[120px]">
                            {row.hotel_makkah_record ? `${row.hotel_makkah_record.name} ⭐${row.hotel_makkah_record.star_rating}` : row.hotel_makkah || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[120px]">
                            {row.hotel_madinah_record ? `${row.hotel_madinah_record.name} ⭐${row.hotel_madinah_record.star_rating}` : row.hotel_madinah || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[120px]">
                            {row.hotel_extra_record ? `${row.hotel_extra_record.name} ⭐${row.hotel_extra_record.star_rating}` : row.hotel_extra || "—"}
                          </div>
                        </TableCell>
                        <TableCell className={cn("text-right tabular-nums whitespace-nowrap", !row.price_quad && "text-destructive")}>
                          {row.price_quad ? `Rp ${formatNumber(row.price_quad)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          {row.price_triple ? `Rp ${formatNumber(row.price_triple)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          {row.price_double ? `Rp ${formatNumber(row.price_double)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          {row.max_discount ? `Rp ${formatNumber(row.max_discount)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          {row.slots_remaining} / {row.slots_total || "—"}
                        </TableCell>
                        <TableCell><div className="max-w-[150px] truncate" title={row.facilities}>{row.facilities || "—"}</div></TableCell>
                        <TableCell><div className="max-w-[150px] truncate" title={row.selling_points}>{row.selling_points || "—"}</div></TableCell>
                        <TableCell>
                          {row.banner_image ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : "—"}
                        </TableCell>
                        <TableCell>
                          {row.catalog_link ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : "—"}
                        </TableCell>
                        <TableCell>
                          {row.itinerary_link ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : "—"}
                        </TableCell>
                        <TableCell>
                          {hasError ? (
                            <div className="text-destructive text-xs font-medium flex flex-col gap-0.5 whitespace-nowrap">
                              {row.errors.map((err, i) => (
                                <span key={i}>• {err}</span>
                              ))}
                            </div>
                          ) : (
                            row.isUpdate ? (
                              <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">Update</span>
                            ) : (
                              <span className="text-green-600 dark:text-green-400 text-xs font-medium">Baru</span>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>Batal</Button>
              <Button onClick={handleImport} disabled={selectedRowIndices.size === 0}>
                <Upload className="mr-2 h-4 w-4" />
                Simpan {selectedRowIndices.size} Paket
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
              <div className="flex flex-col items-center justify-center space-y-2 w-full max-w-2xl text-center">
                <p className="text-sm font-bold text-destructive">{importProgress.errors} gagal</p>
                {lastErrorMsg && (
                  <div className="flex flex-col w-full text-left gap-2">
                    <p className="text-xs text-destructive/90 font-mono bg-destructive/10 p-2 rounded-md break-words">
                      {lastErrorMsg}
                    </p>
                    {lastErrorPayload && (
                      <div className="mt-2 text-[10px] bg-slate-900 text-slate-300 p-3 rounded-md overflow-auto max-h-64 font-mono w-full">
                        <p className="text-muted-foreground mb-2 border-b border-slate-700 pb-1">Debug Payload (Screenshot & Kirimkan Ini):</p>
                        <pre>{JSON.stringify(lastErrorPayload, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
              />
            </div>
            {importProgress.done === importProgress.total && importProgress.errors > 0 && (
              <Button variant="outline" className="mt-4" onClick={() => setStep("preview")}>
                Kembali ke Tabel
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
