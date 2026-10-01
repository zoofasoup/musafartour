import { useRef, useState } from "react";
import { FileUp, Loader2, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { docUrl, uploadJamaahDoc } from "@/lib/jamaah";

/**
 * Upload one private document (KTP, passport, photo, transfer proof) to the
 * jamaah-docs bucket. Shows a link to view what is already stored.
 */
export function DocUpload({
  label,
  path,
  folder,
  onUploaded,
  disabled,
}: {
  label: string;
  path: string | null | undefined;
  folder: string;
  onUploaded: (path: string) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (!path) return;
    const url = await docUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("Dokumen tidak bisa dibuka. Coba muat ulang halaman.");
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {path ? (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <Check className="h-3 w-3" /> Sudah diunggah
            </span>
          ) : (
            "Belum ada"
          )}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {path && (
          <Button type="button" variant="ghost" size="sm" onClick={open} className="gap-1">
            <ExternalLink className="h-3.5 w-3.5" /> Lihat
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" disabled={disabled || busy} onClick={() => input.current?.click()} className="gap-1">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
          {path ? "Ganti" : "Unggah"}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) {
              toast.error("File maksimal 10 MB.");
              return;
            }
            setBusy(true);
            try {
              onUploaded(await uploadJamaahDoc(file, folder));
            } catch (err) {
              toast.error(`Gagal mengunggah: ${(err as Error).message}`);
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </div>
  );
}
