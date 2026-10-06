import { useState } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TOUCH_H } from "./touch";
import { BANK_LABELS, PAYMENT_STATUS_CLASS, PAYMENT_STATUS_LABEL, docUrl, rupiah, type Payment } from "@/lib/jamaah";

const fmtDate = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

interface Props {
  payments: Payment[];
  isOwner: boolean;
  currentUserId?: string;
  /** Extra label per payment (jamaah name + package), shown on the verification page. */
  describe?: (p: Payment) => React.ReactNode;
  /** Name the person must type before a payment is deleted (the jamaah name). Without it a plain confirmation is shown. */
  confirmName?: (p: Payment) => string | undefined;
  onChanged: () => void;
  empty?: string;
}

export function PaymentTable({ payments, isOwner, currentUserId, describe, confirmName, onChanged, empty = "Belum ada pembayaran." }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Payment | null>(null);
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState<Payment | null>(null);

  const act = async (id: string, run: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    setBusy(id);
    const { error } = await run();
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success(ok);
      onChanged();
    }
  };

  const verify = (p: Payment) =>
    act(p.id, () => supabase.from("jamaah_payments").update({ status: "verified" }).eq("id", p.id), "Pembayaran terverifikasi");

  const reject = async () => {
    if (!rejecting) return;
    if (!reason.trim()) {
      toast.error("Tulis alasan penolakan.");
      return;
    }
    const p = rejecting;
    await act(p.id, () => supabase.from("jamaah_payments").update({ status: "rejected", reject_reason: reason.trim() }).eq("id", p.id), "Pembayaran ditolak");
    setRejecting(null);
    setReason("");
  };

  const remove = async () => {
    if (!deleting) return;
    const p = deleting;
    await act(p.id, () => supabase.from("jamaah_payments").delete().eq("id", p.id), "Catatan pembayaran dihapus");
    setDeleting(null);
  };

  const openProof = async (path: string) => {
    const url = await docUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("Bukti transfer tidak bisa dibuka.");
  };

  if (!payments.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;

  const canDelete = (p: Payment) => (isOwner && p.status !== "verified") || (p.status === "pending" && p.recorded_by === currentUserId);

  /** Verify / reject / delete for one payment. Same buttons in the table and on a phone card. */
  const actions = (p: Payment) => (
    <>
      {isOwner && p.status === "pending" && (
        <Button type="button" size="sm" className={`h-8 gap-1 ${TOUCH_H}`} disabled={busy === p.id} onClick={() => verify(p)}>
          <Check className="h-3.5 w-3.5" /> Verifikasi
        </Button>
      )}
      {isOwner && p.status !== "rejected" && (
        <Button type="button" size="sm" variant="outline" className={`h-8 gap-1 ${TOUCH_H}`} disabled={busy === p.id} onClick={() => setRejecting(p)}>
          <X className="h-3.5 w-3.5" /> Tolak
        </Button>
      )}
      {canDelete(p) && (
        <Button type="button" size="icon" variant="ghost" className={`h-8 w-8 ${TOUCH_H} [@media(pointer:coarse)]:w-11`} aria-label="Hapus catatan" disabled={busy === p.id} onClick={() => setDeleting(p)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </>
  );

  return (
    <>
      <div className="hidden overflow-x-auto rounded-md border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              {describe && <TableHead>Jamaah</TableHead>}
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead>Rekening</TableHead>
              <TableHead>Bukti</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => {
              return (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap">
                    {fmtDate(p.paid_on)}
                    {p.payer_name && <span className="block text-xs text-muted-foreground">dari {p.payer_name}</span>}
                  </TableCell>
                  {describe && <TableCell>{describe(p)}</TableCell>}
                  <TableCell className="whitespace-nowrap text-right font-medium">
                    {rupiah(Number(p.amount))}
                    {p.transfer_id && <span className="block text-xs font-normal text-muted-foreground">bagian transfer rombongan</span>}
                  </TableCell>
                  <TableCell>{BANK_LABELS[p.bank_account] ?? p.bank_account}</TableCell>
                  <TableCell>
                    {p.proof_path ? (
                      <Button type="button" variant="ghost" size="sm" className={`h-8 gap-1 px-2 ${TOUCH_H}`} onClick={() => openProof(p.proof_path!)}>
                        <ExternalLink className="h-3.5 w-3.5" /> Lihat
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">–</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={PAYMENT_STATUS_CLASS[p.status]}>{PAYMENT_STATUS_LABEL[p.status]}</Badge>
                    {p.status === "rejected" && p.reject_reason && (
                      <span className="mt-1 block max-w-[220px] text-xs text-muted-foreground">{p.reject_reason}</span>
                    )}
                    {p.notes && <span className="mt-1 block max-w-[220px] text-xs text-muted-foreground">{p.notes}</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">{actions(p)}</div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-2 sm:hidden" aria-label="Daftar pembayaran">
        {payments.map((p) => (
          <li key={p.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold">{rupiah(Number(p.amount))}</p>
                <p className="text-[13px] text-muted-foreground">
                  {[fmtDate(p.paid_on), BANK_LABELS[p.bank_account] ?? p.bank_account, p.payer_name ? `dari ${p.payer_name}` : null].filter(Boolean).join(" · ")}
                </p>
                {describe && <div className="mt-1 text-sm">{describe(p)}</div>}
                {p.transfer_id && <p className="text-[13px] text-muted-foreground">bagian transfer rombongan</p>}
              </div>
              <Badge variant="outline" className={PAYMENT_STATUS_CLASS[p.status]}>{PAYMENT_STATUS_LABEL[p.status]}</Badge>
            </div>
            {(p.reject_reason && p.status === "rejected") || p.notes ? (
              <p className="mt-2 text-[13px] text-muted-foreground">{[p.status === "rejected" ? p.reject_reason : null, p.notes].filter(Boolean).join(" · ")}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {p.proof_path && (
                <Button type="button" variant="outline" size="sm" className={`h-8 gap-1 ${TOUCH_H}`} onClick={() => openProof(p.proof_path!)}>
                  <ExternalLink className="h-3.5 w-3.5" /> Lihat bukti
                </Button>
              )}
              {actions(p)}
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={!!rejecting} onOpenChange={(o) => { if (!o) { setRejecting(null); setReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak pembayaran {rejecting && rupiah(Number(rejecting.amount))}?</DialogTitle>
            <DialogDescription>
              {rejecting?.status === "verified"
                ? "Pembayaran ini sudah terverifikasi. Menolaknya mengurangi uang masuk jamaah dan membatalkan komisi agen yang belum cair."
                : "Pembayaran tidak dihitung. CS bisa mencatat ulang kalau ada kesalahan."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">Alasan</Label>
            <Textarea id="reject-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: tidak ada di mutasi BCA tanggal tersebut" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setRejecting(null)}>Batal</Button>
            <Button type="button" variant="destructive" onClick={reject}>Tolak pembayaran</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting ? `Hapus catatan pembayaran ${rupiah(Number(deleting.amount))}?` : "Hapus catatan pembayaran?"}
        description="Catatan ini dihapus permanen dan tidak bisa dikembalikan. Kalau pembayarannya salah dicatat, lebih baik tolak lewat tombol Tolak supaya jejaknya tetap ada."
        confirmLabel="Hapus catatan"
        destructive
        busy={!!deleting && busy === deleting.id}
        confirmText={deleting ? confirmName?.(deleting) : undefined}
        onConfirm={remove}
      />
    </>
  );
}
