import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { FileSpreadsheet, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rupiah } from "@/lib/jamaah";
import { guessSheetName, listSheetNames, parseSheetFile, type ImportRow } from "@/lib/jamaahExcel";
import { importRows, readyRows } from "@/lib/jamaahImport";
import type { AgentOption, JamaahPackage } from "@/hooks/useJamaah";

const SKIP = "skip";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: JamaahPackage[];
  agents: AgentOption[];
  isOwner: boolean;
  onImported: () => void;
}

interface TabState {
  sheet: string;
  /** package id, or SKIP */
  pkgId: string;
  /** several packages share this tab's date: the person must choose */
  ambiguous: boolean;
  /** this tab is not a jamaah list (e.g. the seat summary) */
  notList: boolean;
}

const packageLabel = (p: JamaahPackage) =>
  `${format(new Date(p.departure_date), "d MMM yyyy")} · ${p.package_name} · ${p.duration_days}H${p.flight ? ` · ${p.flight}` : ""}`;

/**
 * Move the whole old Google Sheet at once: every tab is matched to the package that departs on the
 * date in its name, checked, and imported in one go. Each tab is saved all-or-nothing; running it
 * again only adds what is missing.
 */
export function ImportWorkbookDialog({ open, onOpenChange, packages, agents, isOwner, onImported }: Props) {
  const [fileName, setFileName] = useState("");
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [existing, setExisting] = useState<Record<string, string[]>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFileName("");
    setBuffer(null);
    setTabs([]);
    setDetail(null);
    setProgress("");
  }, [open]);

  /** Names already on each package, so a second run never doubles anyone. */
  const loadExisting = async () => {
    const byPackage: Record<string, string[]> = {};
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("jamaah_registrations").select("package_id, full_name").order("id").range(from, from + 999);
      if (error) throw error;
      for (const r of data ?? []) (byPackage[r.package_id] ??= []).push(r.full_name);
      if ((data?.length ?? 0) < 1000) break;
    }
    return byPackage;
  };

  const onFile = async (file: File) => {
    try {
      setFileName(file.name);
      const buf = await file.arrayBuffer();
      const names = listSheetNames(buf);
      const known = await loadExisting();

      // Which package does each tab belong to? A tab claimed by two packages is left for the person to pick.
      const claims: Record<string, string[]> = {};
      for (const p of packages) {
        const sheet = guessSheetName(names, p.departure_date, p.flight);
        if (sheet) (claims[sheet] ??= []).push(p.id);
      }
      const next: TabState[] = names.map((sheet) => {
        const c = claims[sheet] ?? [];
        let notList = false;
        try {
          parseSheetFile(buf, agents, [], sheet);
        } catch {
          notList = true;
        }
        return { sheet, pkgId: notList || c.length !== 1 ? SKIP : c[0], ambiguous: c.length > 1, notList };
      });
      setBuffer(buf);
      setExisting(known);
      setTabs(next);
    } catch (err) {
      toast.error((err as Error).message);
      setBuffer(null);
      setTabs([]);
    }
  };

  const parsed = useMemo(() => {
    const out: Record<string, ImportRow[]> = {};
    if (!buffer) return out;
    for (const t of tabs) {
      if (t.notList || t.pkgId === SKIP) continue;
      try {
        out[t.sheet] = parseSheetFile(buffer, agents, existing[t.pkgId] ?? [], t.sheet);
      } catch {
        out[t.sheet] = [];
      }
    }
    return out;
  }, [buffer, tabs, agents, existing]);

  const totalReady = Object.values(parsed).reduce((n, rows) => n + readyRows(rows).length, 0);
  const tabsToImport = tabs.filter((t) => readyRows(parsed[t.sheet] ?? []).length > 0).length;

  const run = async () => {
    setImporting(true);
    let added = 0;
    try {
      for (const t of tabs) {
        const rows = parsed[t.sheet];
        if (!rows || !readyRows(rows).length) continue;
        setProgress(`Mengimport tab ${t.sheet}...`);
        try {
          added += await importRows(t.pkgId, rows);
        } catch (err) {
          toast.error(`Tab ${t.sheet} gagal dan tidak tersimpan: ${(err as Error).message}. Tab sebelumnya sudah masuk; jalankan lagi setelah diperbaiki.`);
          onImported();
          return;
        }
      }
      toast.success(`${added} jamaah diimport dari ${tabsToImport} tab.`);
      onImported();
      onOpenChange(false);
    } finally {
      setImporting(false);
      setProgress("");
    }
  };

  const problems = detail ? (parsed[detail] ?? []).filter((r) => r.errors.length) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import semua tab dari Google Sheet</DialogTitle>
          <DialogDescription>
            Unggah satu file .xlsx yang berisi banyak tab. Tiap tab dicocokkan dengan paket yang berangkat di tanggal pada nama tab; cek dan ubah
            pilihannya sebelum Import. Baris kosong dan baris total dilewati otomatis.
          </DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center hover:border-primary/50">
          <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">{fileName || "Pilih file .xlsx"}</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onFile(f);
            }}
          />
        </label>

        {tabs.length > 0 && (
          <>
            <p className="text-sm">
              <strong>{totalReady}</strong> jamaah siap diimport dari {tabsToImport} tab
              {!isOwner && ". Saldo awal dari kolom Realisasi menunggu verifikasi owner."}
            </p>
            <div className="max-h-[48vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tab</TableHead>
                    <TableHead className="min-w-[280px]">Masuk ke paket</TableHead>
                    <TableHead className="text-right">Siap</TableHead>
                    <TableHead className="text-right">Sudah ada</TableHead>
                    <TableHead className="text-right">Dilewati</TableHead>
                    <TableHead className="text-right">Perlu diperbaiki</TableHead>
                    <TableHead className="text-right">Realisasi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabs.map((t) => {
                    const rows = parsed[t.sheet] ?? [];
                    const ready = readyRows(rows);
                    const bad = rows.filter((r) => r.errors.length).length;
                    return (
                      <TableRow key={t.sheet} className={t.pkgId === SKIP ? "text-muted-foreground" : ""}>
                        <TableCell className="font-medium">{t.sheet}</TableCell>
                        <TableCell>
                          {t.notList ? (
                            <span className="text-xs">Bukan daftar jamaah, dilewati</span>
                          ) : (
                            <>
                              <Select value={t.pkgId} onValueChange={(v) => setTabs((all) => all.map((x) => (x.sheet === t.sheet ? { ...x, pkgId: v } : x)))}>
                                <SelectTrigger className="h-8" aria-label={`Paket untuk tab ${t.sheet}`}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={SKIP}>Lewati tab ini</SelectItem>
                                  {packages.map((p) => <SelectItem key={p.id} value={p.id}>{packageLabel(p)}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              {t.ambiguous && t.pkgId === SKIP && <p className="mt-1 text-xs text-amber-700">Ada lebih dari satu paket di tanggal ini, pilih yang benar.</p>}
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{ready.length || "–"}</TableCell>
                        <TableCell className="text-right">{rows.filter((r) => r.duplicate && !r.skipped).length || "–"}</TableCell>
                        <TableCell className="text-right">{rows.filter((r) => r.skipped).length || "–"}</TableCell>
                        <TableCell className="text-right">
                          {bad ? (
                            <button type="button" className="text-amber-700 underline" onClick={() => setDetail(detail === t.sheet ? null : t.sheet)}>
                              {bad}
                            </button>
                          ) : (
                            "–"
                          )}
                        </TableCell>
                        <TableCell className="text-right">{ready.length ? rupiah(ready.reduce((s, r) => s + r.paid, 0)) : "–"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {detail && (
              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">Baris bermasalah di tab {detail} (nomor baris di Excel)</p>
                <ul className="max-h-40 space-y-1 overflow-auto text-xs">
                  {problems.map((r) => (
                    <li key={r.line}>
                      Baris {r.line}: <span className="font-medium">{r.full_name}</span> – {r.errors.join("; ")}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">Perbaiki di Excel lalu unggah ulang, atau tambahkan jamaahnya lewat Tambah Jamaah. Baris yang sudah masuk tidak akan terhitung dua kali.</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Realisasi yang lebih besar dari harga (transfer satu keluarga di satu baris) diimport apa adanya dan tampil sebagai Lebih bayar; rapikan lewat Catat Pembayaran rombongan.
              Jamaah yang sudah lunas saat import tidak mengkredit komisi agen lagi.
            </p>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {progress && <span className="mr-auto self-center text-sm text-muted-foreground">{progress}</span>}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>Batal</Button>
          <Button type="button" onClick={run} disabled={importing || !totalReady} className="gap-1">
            <Upload className="h-4 w-4" />
            {importing ? "Mengimport..." : `Import ${totalReady} jamaah`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
