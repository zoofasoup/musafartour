import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const norm = (v: string) => v.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * The last step before something that cannot be undone. The main action is on the right and, when it destroys
 * something, solid dark red (the only place a solid red button is allowed). `confirmText` asks the person to type
 * a name first, so a stray tap cannot delete anything.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  busy,
  destructive,
  confirmText,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  busy?: boolean;
  destructive?: boolean;
  confirmText?: string;
}) {
  const [typed, setTyped] = useState("");
  // Clear what was typed whenever the dialog closes, also when the parent closes it after a successful action.
  useEffect(() => { if (!open) setTyped(""); }, [open]);
  const ready = !confirmText || norm(typed) === norm(confirmText);
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && (setTyped(""), onOpenChange(o))}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {confirmText && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-typed">Ketik: <span className="font-semibold">{confirmText}</span></Label>
            <Input id="confirm-typed" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Batal</Button>
          <Button type="button" variant={destructive ? "destructiveSolid" : "default"} onClick={onConfirm} disabled={!ready || busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
