import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ChangeReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the trimmed reason once the user confirms. */
  onConfirm: (reason: string) => void;
  statusLabel?: string;
  loading?: boolean;
}

/**
 * Asks why a Final or live package is being changed. The reason is saved with the
 * change in the package change log, so everyone can see why data moved after it was fixed.
 */
export function ChangeReasonDialog({ open, onOpenChange, onConfirm, statusLabel, loading }: ChangeReasonDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const trimmed = reason.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kenapa paket ini diubah?</DialogTitle>
          <DialogDescription>
            Paket ini sudah berstatus <strong>{statusLabel ?? "Final"}</strong>. Tulis alasan perubahannya supaya tim dan agen
            tahu kenapa datanya berubah.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="change-reason">Alasan perubahan</Label>
          <Textarea
            id="change-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Maskapai ganti jadwal, harga hotel Makkah naik"
            rows={3}
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button type="button" onClick={() => onConfirm(trimmed)} disabled={trimmed.length < 5 || loading}>
            {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
