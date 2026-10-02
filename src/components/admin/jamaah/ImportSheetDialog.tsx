import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROOM_SHORT, rupiah, type Registration } from "@/lib/jamaah";
import { importRows, readyRows } from "@/lib/jamaahImport";
import { guessSheetName, listSheetNames, parseSheetFile, type ImportRow } from "@/lib/jamaahExcel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AgentOption, JamaahPackage } from "@/hooks/useJamaah";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: JamaahPackage | undefined;
  registrations: Registration[];
  agents: AgentOption[];
  isOwner: boolean;
  onImported: () => void;
}

/**
 * Move one package's jamaah from the old Google Sheet: download the tab as .xlsx
 * or .csv and upload it here. "Realisasi" becomes an opening-balance payment
 * (verified when the owner imports, otherwise waiting for the owner).
 */
export function ImportSheetDialog({ open, onOpenChange, pkg, registrations, agents, isOwner, onImported }: Props) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [sheet, setSheet] = useState("");

  useEffect(() => {
    if (open) {
      setRows([]);
      setFileName("");
      setBuffer(null);
      setSheets([]);
      setSheet("");
    }
  }, [open]);

  const readSheet = (buf: ArrayBuffer, name: string) => {
    try {
      setRows(parseSheetFile(buf, agents, registrations.map((r) => r.full_name), name));
    } catch (err) {
      toast.error((err as Error).message);
      setRows([]);
    }
  };

  const ready = readyRows(rows);

  const onFile = async (file: File) => {
    try {
      setFileName(file.name);
      const buf = await file.arrayBuffer();
      const names = listSheetNames(buf);
      // Several tabs: preselect the one named after this package's departure date; the user can change it.
      const first = (pkg && guessSheetName(names, pkg.departure_date, pkg.flight)) || (names.length > 1 ? "" : names[0]);
      setBuffer(buf);
      setSheets(names);
      setSheet(first ?? "");
      if (first) readSheet(buf, first);
      else setRows([]);
    } catch (err) {
      toast.error((err as Error).message);
      setRows([]);
    }
  };

  const run = async () => {
    if (!pkg || !ready.length) return;
    setImporting(true);
    try {
      const added = await importRows(pkg.id, rows);
      toast.success(`${added} jamaah diimport beserta saldo awalnya.`);
      onImported();
      onOpenChange(false);
    } catch (err) {
      toast.error(`Import gagal, tidak ada data yang tersimpan: ${(err as Error).message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import dari Google Sheet</DialogTitle>
          <DialogDescription>
            Untuk {pkg?.package_name}. Unggah file .xlsx dari Google Sheet (File → Download → Microsoft Excel). Kalau berisi banyak tab, pilih tab untuk paket ini.
            Kolom yang dibaca: Nama Jamaah, Size, Ambil Perlengkapan, Paket, Rencana, Realisasi, Domisili, Start, Keterangan, Agen.
          </DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center hover:border-primary/50">
          <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">{fileName || "Pilih file .xlsx / .csv"}</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onFile(f);
            }}
          />
        </label>

        {sheets.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Tab di file ini ({sheets.length} tab)</p>
            <Select
              value={sheet}
              onValueChange={(name) => {
                setSheet(name);
                if (buffer) readSheet(buffer, name);
              }}
            >
              <SelectTrigger aria-label="Pilih tab"><SelectValue placeholder="Pilih tab untuk paket ini" /></SelectTrigger>
              <SelectContent>
                {sheets.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Pastikan tab yang dipilih memang untuk paket {pkg?.package_name} tanggal {pkg?.departure_date.slice(0, 10)}.</p>
          </div>
        )}

        {rows.length > 0 && (
          <>
            <p className="text-sm">
              <strong>{ready.length}</strong> siap diimport ·{" "}
              {rows.filter((r) => r.duplicate).length} sudah ada · {rows.filter((r) => r.skipped).length} baris kosong atau total dilewati ·{" "}
              {rows.filter((r) => r.errors.length).length} perlu diperbaiki
            </p>
            <div className="max-h-[45vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Baris</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kamar</TableHead>
                    <TableHead className="text-right">Rencana</TableHead>
                    <TableHead className="text-right">Realisasi</TableHead>
                    <TableHead>Agen</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.line} className={r.errors.length || r.duplicate || r.skipped ? "bg-muted/50 text-muted-foreground" : ""}>
                      <TableCell>{r.line}</TableCell>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell>{r.room_type ? ROOM_SHORT[r.room_type] : "?"}</TableCell>
                      <TableCell className="text-right">{rupiah(r.list_price)}</TableCell>
                      <TableCell className="text-right">{rupiah(r.paid)}</TableCell>
                      <TableCell>
                        {r.agent_raw ? (r.agent_id ? r.agent_raw : <span title="Tidak ada di daftar agen, disimpan sebagai catatan referral">{r.agent_raw}*</span>) : "–"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.skipped ?? (r.duplicate ? "Sudah terdaftar" : r.errors.join("; ") || (r.overpaid ? "OK, Realisasi lebih besar dari harga (transfer keluarga?)" : "OK"))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              * Agen yang tidak cocok dengan daftar agen disimpan sebagai catatan referral (komisi tidak otomatis).
              {!isOwner && " Saldo awal dari kolom Realisasi menunggu verifikasi owner."}
            </p>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>Batal</Button>
          <Button type="button" onClick={run} disabled={importing || !ready.length} className="gap-1">
            <Upload className="h-4 w-4" />
            {importing ? "Mengimport..." : `Import ${ready.length} jamaah`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
