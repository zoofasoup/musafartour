import { useState } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, Inbox, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge, type StatusKind } from "@/components/ui/status-badge";
import { DataView } from "@/components/admin/DataView";
import { BANK_LABELS, PAYMENT_STATUS_LABEL, docUrl, rupiah, type Payment } from "@/lib/jamaah";

const fmtDate = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const STATUS_KIND: Record<string, StatusKind> = { pending: "warn", verified: "ok", rejected: "bad" };
const StatusPill = ({ p }: { p: Payment }) => <StatusBadge kind={STATUS_KIND[p.status] ?? "mute"}>{p.status === "pending" ? "Menunggu" : PAYMENT_STATUS_LABEL[p.status]}</StatusBadge>;

interface Props {
  payments: Payment[];
  isOwner: boolean;
  currentUserId?: string;
  /** Extra label per payment (jamaah name + package), shown on the verification page. */
  describe?: (p: Payment) => React.ReactNode;
  /** The same label as plain text, for a phone's list row. */
  describeText?: (p: Payment) => string;
  /** Name the person must type before a payment is deleted (the jamaah name). Without it a plain confirmation is shown. */
  confirmName?: (p: Payment) => string | undefined;
  onChanged: () => void;
  empty?: string;
}

export function PaymentTable({ payments, isOwner, currentUserId, describe, describeText, confirmName, onChanged, empty = "Belum ada pembayaran." }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<Payment | null>(null);
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

  const verify = async (p: Payment) => {
    await act(p.id, () => supabase.from("jamaah_payments").update({ status: "verified" }).eq("id", p.id), "Pembayaran terverifikasi");
    setOpen(null);
  };

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

  const canDelete = (p: Payment) => (isOwner && p.status !== "verified") || (p.status === "pending" && p.recorded_by === currentUserId);

  /** Verify / reject / delete for one payment: the buttons of a desktop row and of the detail sheet. */
  const buttons = (p: Payment, big = false) => (
    <>
      {isOwner && p.status === "pending" && (
        <Button type="button" size={big ? "lg" : "sm"} className="gap-1.5" disabled={busy === p.id} onClick={() => verify(p)}>
          <Check className="h-4 w-4" aria-hidden /> Verifikasi
        </Button>
      )}
      {p.proof_path && (
        <Button type="button" size={big ? "lg" : "sm"} variant="outline" className="gap-1.5" onClick={() => openProof(p.proof_path!)}>
          <ExternalLink className="h-4 w-4" aria-hidden /> {big ? "Lihat bukti transfer" : "Bukti"}
        </Button>
      )}
      {isOwner && p.status !== "rejected" && (
        <Button type="button" size={big ? "lg" : "sm"} variant="outline" className="gap-1.5" disabled={busy === p.id} onClick={() => { setOpen(null); setRejecting(p); }}>
          <X className="h-4 w-4" aria-hidden /> Tolak
        </Button>
      )}
      {canDelete(p) && (
        <Button type="button" size={big ? "lg" : "icon"} variant="ghost" className="gap-1.5" aria-label="Hapus catatan" disabled={busy === p.id} onClick={() => { setOpen(null); setDeleting(p); }}>
          <Trash2 className="h-4 w-4" aria-hidden /> {big && "Hapus catatan"}
        </Button>
      )}
    </>
  );

  const line = (label: string, value: React.ReactNode) =>
    value ? (
      <div className="flex items-baseline justify-between gap-4 border-b border-pkg-hair py-3 last:border-0">
        <dt className="text-[14px] text-pkg-fg-3">{label}</dt>
        <dd className="min-w-0 text-right text-[16px] text-pkg-fg">{value}</dd>
      </div>
    ) : null;

  return (
    <>
      <DataView
        rows={payments}
        rowKey={(p) => p.id}
        what="Daftar pembayaran"
        empty={{ icon: Inbox, text: empty }}
        onOpen={(p) => setOpen(p)}
        columns={[
          { key: "date", header: "Tanggal", cell: (p) => <span className="whitespace-nowrap">{fmtDate(p.paid_on)}{p.payer_name && <span className="block text-xs text-pkg-fg-3">dari {p.payer_name}</span>}</span> },
          ...(describe ? [{ key: "jamaah", header: "Jamaah", cell: (p: Payment) => describe(p) }] : []),
          { key: "amount", header: "Nominal", align: "right" as const, cell: (p) => <span className="whitespace-nowrap font-medium">{rupiah(Number(p.amount))}{p.transfer_id && <span className="block text-xs font-normal text-pkg-fg-3">bagian transfer rombongan</span>}</span> },
          { key: "bank", header: "Rekening", cell: (p) => BANK_LABELS[p.bank_account] ?? p.bank_account },
          { key: "status", header: "Status", cell: (p) => (
            <span className="block">
              <StatusPill p={p} />
              {p.status === "rejected" && p.reject_reason && <span className="mt-1 block max-w-[220px] text-xs text-pkg-fg-3">{p.reject_reason}</span>}
              {p.notes && <span className="mt-1 block max-w-[220px] text-xs text-pkg-fg-3">{p.notes}</span>}
            </span>
          ) },
        ]}
        card={{
          title: (p) => rupiah(Number(p.amount)),
          subtitle: (p) => describeText?.(p) ?? BANK_LABELS[p.bank_account] ?? p.bank_account,
          meta: (p) => [fmtDate(p.paid_on), BANK_LABELS[p.bank_account] ?? p.bank_account].join(" · "),
          status: (p) => <StatusPill p={p} />,
        }}
        inlineActions={(p) => buttons(p)}
      />

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-md">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{rupiah(Number(open.amount))}</DialogTitle>
                <DialogDescription className="sr-only">Detail pembayaran</DialogDescription>
              </DialogHeader>
              <div className="pkg-v2 min-w-0 !bg-transparent">
                <div className="mb-2"><StatusPill p={open} /></div>
                <dl>
                  {line("Jamaah", describeText?.(open))}
                  {line("Tanggal", fmtDate(open.paid_on))}
                  {line("Rekening", BANK_LABELS[open.bank_account] ?? open.bank_account)}
                  {line("Dari", open.payer_name)}
                  {line("Catatan", open.notes)}
                  {line("Alasan ditolak", open.status === "rejected" ? open.reject_reason : null)}
                  {line("Transfer", open.transfer_id ? "Bagian transfer rombongan" : null)}
                </dl>
                <div className="mt-6 flex flex-col gap-2">{buttons(open, true)}</div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
