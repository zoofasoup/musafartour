import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROOM_SHORT, rupiah, todayIso, type Registration } from "@/lib/jamaah";
import { parseSheetFile, type ImportRow } from "@/lib/jamaahExcel";
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

  useEffect(() => {
    if (open) {
      setRows([]);
      setFileName("");
    }
  }, [open]);

  const ready = rows.filter((r) => !r.errors.length && !r.duplicate);

  const onFile = async (file: File) => {
    try {
      setFileName(file.name);
      setRows(parseSheetFile(await file.arrayBuffer(), agents, registrations.map((r) => r.full_name)));
    } catch (err) {
      toast.error((err as Error).message);
      setRows([]);
    }
  };

  const run = async () => {
    if (!pkg || !ready.length) return;
    setImporting(true);
    try {
      const { data, error } = await supabase
        .from("jamaah_registrations")
        .insert(
          ready.map((r) => ({
            package_id: pkg.id,
            full_name: r.full_name,
            phone: r.phone,
            room_type: r.room_type!,
            list_price: r.list_price,
            discount: 0,
            price_note: r.price_note,
            agent_id: r.agent_id,
            referral_note: r.agent_id ? null : r.agent_raw,
            equipment_size: r.equipment_size,
            equipment_taken_at: r.equipment_taken ? new Date().toISOString() : null,
            domicile: r.domicile,
            start_city: r.start_city,
            notes: "Import dari Google Sheet",
          }))
        )
        .select("id, full_name");
      if (error) throw error;

      // Rows come back in insert order; match by position (two jamaah can share a name).
      const inserted = data ?? [];
      const opening = ready
        .map((r, i) => ({ r, id: inserted[i]?.full_name === r.full_name ? inserted[i].id : null }))
        .filter(({ r, id }) => r.paid > 0 && id)
        .map(({ r, id }) => ({
          registration_id: id!,
          amount: r.paid,
          paid_on: todayIso(),
          bank_account: "SALDO_AWAL",
          notes: "Realisasi dari Google Sheet (saldo awal)",
          status: isOwner ? "verified" : "pending",
        }));
      if (opening.length) {
        const { error: payError } = await supabase.from("jamaah_payments").insert(opening);
        if (payError) throw payError;
      }
      toast.success(`${ready.length} jamaah diimport${opening.length ? `, ${opening.length} saldo awal dicatat` : ""}.`);
      onImported();
      onOpenChange(false);
    } catch (err) {
      toast.error(`Import gagal: ${(err as Error).message}`);
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
            Untuk {pkg?.package_name}. Di Google Sheet: File → Download → Microsoft Excel (.xlsx), lalu unggah di sini.
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

        {rows.length > 0 && (
          <>
            <p className="text-sm">
              <strong>{ready.length}</strong> siap diimport ·{" "}
              {rows.filter((r) => r.duplicate).length} sudah ada (dilewati) · {rows.filter((r) => r.errors.length).length} perlu diperbaiki
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
                    <TableRow key={r.line} className={r.errors.length || r.duplicate ? "bg-muted/50 text-muted-foreground" : ""}>
                      <TableCell>{r.line}</TableCell>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell>{r.room_type ? ROOM_SHORT[r.room_type] : "?"}</TableCell>
                      <TableCell className="text-right tabular-nums">{rupiah(r.list_price)}</TableCell>
                      <TableCell className="text-right tabular-nums">{rupiah(r.paid)}</TableCell>
                      <TableCell>
                        {r.agent_raw ? (r.agent_id ? r.agent_raw : <span title="Tidak ada di daftar agen, disimpan sebagai catatan referral">{r.agent_raw}*</span>) : "–"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.duplicate ? "Sudah terdaftar" : r.errors.join("; ") || "OK"}
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
