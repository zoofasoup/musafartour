import { useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { compressAndConvertToWebP, generateContextualFileName } from "@/lib/imageUtils";
import { matchFlyer, parseFlyerName, type FlyerPackage } from "@/lib/flyerMatch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: FlyerPackage[];
  onSuccess: () => void;
}

interface Row {
  file: File;
  match: ReturnType<typeof matchFlyer>;
  apply: boolean;
}

export function BulkFlyerUpload({ open, onOpenChange, packages, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);

  const toApply = useMemo(() => rows.filter(r => r.apply && r.match.kind !== "none"), [rows]);

  const reset = () => {
    setRows([]);
    setDone(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onPick = (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files)
      .filter(f => f.type.startsWith("image/"))
      .map<Row>(file => {
        const match = matchFlyer(parseFlyerName(file.name), packages);
        return { file, match, apply: match.kind === "match" };
      })
      .sort((a, b) => a.file.name.localeCompare(b.file.name));
    // Two files resolving to the same package: only the first stays ticked.
    const seen = new Set<string>();
    for (const r of picked) {
      if (r.match.kind === "none") continue;
      if (seen.has(r.match.pkg.id)) r.apply = false;
      else seen.add(r.match.pkg.id);
    }
    setRows(picked);
  };

  const run = async () => {
    setRunning(true);
    setDone(0);
    let ok = 0;
    const failed: string[] = [];
    for (const r of toApply) {
      if (r.match.kind === "none") continue;
      const pkg = r.match.pkg;
      try {
        const webp = await compressAndConvertToWebP(r.file, 80, 0.85);
        const path = `banners/${generateContextualFileName("package", { name: pkg.package_name }, "banner")}`;
        const { error: upErr } = await supabase.storage.from("package-images").upload(path, webp, { upsert: true });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("package-images").getPublicUrl(path);
        const { error: dbErr } = await supabase.from("packages").update({ banner_image: data.publicUrl }).eq("id", pkg.id);
        if (dbErr) throw dbErr;
        ok++;
      } catch {
        failed.push(r.file.name);
      }
      setDone(d => d + 1);
    }
    setRunning(false);
    if (ok) onSuccess();
    if (failed.length) toast.error(`${failed.length} flyer gagal: ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}`);
    else toast.success(`${ok} flyer paket diperbarui`);
    if (!failed.length) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !running && onOpenChange(o)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Unggah flyer massal</DialogTitle>
          <DialogDescription>
            Pilih semua file PNG flyer. Setiap file dicocokkan ke paket lewat tanggal, durasi, tier, dan maskapai di nama file.
            Flyer lama pada paket yang dicentang akan diganti.
          </DialogDescription>
        </DialogHeader>

        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={e => onPick(e.target.files)} />
        <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={running} className="w-fit">
          <Upload className="mr-2 h-4 w-4" /> Pilih file flyer
        </Button>

        {rows.length > 0 && (
          <div className="max-h-[50vh] overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left">
                <tr>
                  <th className="w-10 p-2" />
                  <th className="p-2">File</th>
                  <th className="p-2">Paket</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.file.name + i} className="border-t align-top">
                    <td className="p-2">
                      <Checkbox
                        checked={r.apply}
                        disabled={r.match.kind === "none" || running}
                        onCheckedChange={v => setRows(rs => rs.map((x, j) => (j === i ? { ...x, apply: v === true } : x)))}
                      />
                    </td>
                    <td className="p-2 break-all">{r.file.name}</td>
                    <td className="p-2">
                      {r.match.kind === "none" ? (
                        <span className="text-destructive">{r.match.note}</span>
                      ) : (
                        <>
                          <span className="font-medium">{r.match.pkg.package_name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {r.match.pkg.departure_date.slice(0, 10)} · {r.match.pkg.duration_days}D · {r.match.pkg.flight || "-"}
                            {r.match.pkg.banner_image ? " · sudah punya flyer" : " · belum ada flyer"}
                          </span>
                          {r.match.kind === "check" && <span className="block text-xs text-amber-700">Periksa: {r.match.note}</span>}
                          {!r.apply && <span className="block text-xs text-muted-foreground">Tidak diterapkan</span>}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {running && <Progress value={(done / Math.max(1, toApply.length)) * 100} />}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>Batal</Button>
          <Button onClick={run} disabled={running || toApply.length === 0}>
            {running ? `Mengunggah ${done}/${toApply.length}…` : `Terapkan ${toApply.length} flyer`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
