import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TOUCH_H } from "./touch";

const normalize = (v: string) => v.replace(/\s+/g, " ").trim().toLowerCase();

/** Messages the database writes for people; anything else is a technical error we do not show. */
const friendly = (message: string) =>
  /^(Jamaah|Hanya owner)/.test(message) ? message : "Jamaah belum bisa dihapus. Coba lagi, atau gunakan status Batal.";

/**
 * Owner-only permanent delete, for test data and mistakes. The person has to type the name to confirm, the
 * database refuses when there are payment records, and uploaded files are removed along with the row.
 * Everyone else should use the Batal status, which keeps the record.
 */
export function DeleteRegistrationDialog({
  registration,
  hasPayments,
  onDeleted,
}: {
  registration: { id: string; full_name: string };
  hasPayments: boolean;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const matches = normalize(typed) === normalize(registration.full_name);

  const close = (o: boolean) => {
    if (busy) return;
    setOpen(o);
    if (!o) setTyped("");
  };

  const remove = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("delete_jamaah_registration", { _registration_id: registration.id });
    if (error) {
      setBusy(false);
      toast.error(friendly(error.message));
      return;
    }
    // The row is gone; clearing its files is best effort so a storage hiccup never undoes or blocks the delete.
    try {
      const folder = `manifest/${registration.id}`;
      const listed = await supabase.storage.from("jamaah-docs").list(folder);
      const paths = new Set<string>(((data as { paths?: string[] } | null)?.paths ?? []));
      for (const f of listed.data ?? []) paths.add(`${folder}/${f.name}`);
      if (paths.size) await supabase.storage.from("jamaah-docs").remove([...paths]);
    } catch {
      /* leftover files can be removed from Storage by hand */
    }
    setBusy(false);
    setOpen(false);
    setTyped("");
    qc.invalidateQueries({ queryKey: ["jamaah-intakes"] });
    toast.success(`${registration.full_name} dihapus.`);
    onDeleted();
  };

  return (
    <>
      <div className="mt-8 rounded-lg border border-status-bad-border p-4">
        <h3 className="text-sm font-semibold text-status-bad-text">Hapus permanen</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Untuk data tes atau salah input. Datanya hilang dan tidak bisa dikembalikan. Untuk jamaah yang benar-benar batal, gunakan status Batal.
        </p>
        {hasPayments && <p className="mt-2 text-sm text-status-warn-text">Jamaah ini punya catatan pembayaran. Hapus catatan pembayarannya dulu sebelum menghapus jamaah.</p>}
        <Button type="button" variant="outline" className={`mt-3 gap-2 border-status-bad-border text-status-bad-text hover:bg-status-bad-bg ${TOUCH_H}`} disabled={hasPayments} onClick={() => setOpen(true)}>
          <Trash2 className="h-4 w-4" aria-hidden /> Hapus jamaah ini
        </Button>
      </div>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus {registration.full_name}?</DialogTitle>
            <DialogDescription>
              Data jamaah dan dokumen yang diunggah akan dihapus permanen. Riwayat perubahan tetap tersimpan. Ketik nama jamaah untuk melanjutkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-delete">Ketik: <span className="font-semibold">{registration.full_name}</span></Label>
            <Input id="confirm-delete" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={TOUCH_H} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className={TOUCH_H} onClick={() => close(false)} disabled={busy}>Batal</Button>
            <Button type="button" variant="destructiveSolid" className={TOUCH_H} onClick={remove} disabled={!matches || busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}Hapus permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
