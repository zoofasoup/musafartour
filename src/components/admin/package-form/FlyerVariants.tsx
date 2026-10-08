import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Upload, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type FlyerVariant = { id: string; label: string; price_delta: number; extra: string; file_url: string };

export const PRESET_VARIANTS = ["Agen", "Lampung", "Depok"];

/**
 * Flyer versions of one package. Variants differ only in price and extra features (for example
 * transport from a region to Jakarta), so they live on the package instead of being separate files in Drive.
 */
export function FlyerVariants({ value, onChange, packageCode, disabled }: {
  value: FlyerVariant[]; onChange: (v: FlyerVariant[]) => void; packageCode?: string | null; disabled?: boolean;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const pickFor = useRef<string | null>(null);

  const update = (id: string, patch: Partial<FlyerVariant>) => onChange(value.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const add = (label: string) => onChange([...value, { id: `fv_${Date.now()}`, label, price_delta: 0, extra: "", file_url: "" }]);

  const upload = async (file: File) => {
    const id = pickFor.current;
    const variant = value.find((v) => v.id === id);
    if (!id || !variant) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Maksimal 5 MB."); return; }
    setBusyId(id);
    try {
      const safe = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `flyers/${safe(packageCode || "paket")}-${safe(variant.label) || "varian"}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("package-images").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("package-images").getPublicUrl(path);
      update(id, { file_url: data.publicUrl });
      toast.success("Flyer varian terunggah. Simpan paket untuk menyimpan.");
    } catch (e: any) {
      toast.error("Gagal mengunggah: " + (e?.message ?? "coba lagi"));
    } finally {
      setBusyId(null);
    }
  };

  const unused = PRESET_VARIANTS.filter((p) => !value.some((v) => v.label.toLowerCase() === p.toLowerCase()));

  return (
    <Card className="shadow-md border-slate-200 overflow-hidden mb-6">
      <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
        <CardTitle>Varian flyer</CardTitle>
        <CardDescription>Versi lain dari flyer yang sama: beda harga atau fitur tambahan (mis. transport dari daerah ke Jakarta).</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <input ref={picker} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
        {value.length === 0 && <p className="text-sm text-muted-foreground">Belum ada varian. Flyer utama di atas dipakai untuk semua.</p>}
        {value.map((v) => (
          <div key={v.id} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-[1fr_1fr_2fr_auto]">
            <label className="text-sm font-medium space-y-1">Nama varian
              <Input value={v.label} disabled={disabled} onChange={(e) => update(v.id, { label: e.target.value })} />
            </label>
            <label className="text-sm font-medium space-y-1">Selisih harga (Rp)
              <Input type="number" value={v.price_delta} disabled={disabled} onChange={(e) => update(v.id, { price_delta: Number(e.target.value) || 0 })} />
            </label>
            <label className="text-sm font-medium space-y-1">Fitur tambahan
              <Input value={v.extra} placeholder="Contoh: Transport Lampung - Jakarta PP" disabled={disabled} onChange={(e) => update(v.id, { extra: e.target.value })} />
            </label>
            <div className="flex items-end gap-2">
              <Button type="button" variant="outline" size="sm" disabled={disabled || busyId === v.id} onClick={() => { pickFor.current = v.id; picker.current?.click(); }}>
                <Upload className="mr-1 h-4 w-4" />{busyId === v.id ? "Mengunggah..." : v.file_url ? "Ganti" : "Unggah"}
              </Button>
              {v.file_url && (
                <Button type="button" variant="ghost" size="icon" asChild aria-label="Buka flyer"><a href={v.file_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
              )}
              <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label="Hapus varian" onClick={() => onChange(value.filter((x) => x.id !== v.id))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {unused.map((p) => (
            <Button key={p} type="button" variant="outline" size="sm" disabled={disabled} onClick={() => add(p)}><Plus className="mr-1 h-4 w-4" />{p}</Button>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => add("")}><Plus className="mr-1 h-4 w-4" />Varian lain</Button>
        </div>
      </CardContent>
    </Card>
  );
}
