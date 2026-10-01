import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MoneyInput } from "./MoneyInput";
import { DocUpload } from "./DocUpload";
import {
  BANK_LABELS,
  DP_MIN_PER_PAX,
  PT_ACCOUNTS,
  balanceOf,
  rupiah,
  splitEvenly,
  todayIso,
  type JamaahGroup,
  type Payment,
  type Registration,
} from "@/lib/jamaah";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrations: Registration[];
  payments: Payment[];
  groups: JamaahGroup[];
  /** Pre-select this jamaah (from a table row). */
  registrationId?: string | null;
  /** Owner may record an already-checked transfer as verified directly. */
  isOwner: boolean;
  onSaved: () => void;
}

/**
 * Record one bank transfer into a PT account. For a family paying together, the
 * transfer is split across members; every row shares a transfer_id.
 */
export function PaymentDialog({ open, onOpenChange, registrations, payments, groups, registrationId, isOwner, onSaved }: Props) {
  const active = useMemo(() => registrations.filter((r) => r.status === "active"), [registrations]);
  const [mode, setMode] = useState<"single" | "group">("single");
  const [regId, setRegId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [total, setTotal] = useState(0);
  const [split, setSplit] = useState<Record<string, number>>({});
  const [paidOn, setPaidOn] = useState(todayIso());
  const [bank, setBank] = useState<string>("BCA");
  const [payer, setPayer] = useState("");
  const [proof, setProof] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [verifyNow, setVerifyNow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const reg = registrations.find((r) => r.id === registrationId);
    setMode("single");
    setRegId(reg?.id ?? "");
    setGroupId(reg?.group_id ?? "");
    setTotal(0);
    setSplit({});
    setPaidOn(todayIso());
    setBank("BCA");
    setPayer("");
    setProof(null);
    setNotes("");
    setVerifyNow(false);
    setManualSplit(false);
  }, [open, registrationId, registrations]);

  const balanceFor = (id: string) => {
    const reg = registrations.find((r) => r.id === id);
    return reg ? balanceOf(reg, payments.filter((p) => p.registration_id === id)) : null;
  };
  const outstandingOf = (id: string) => balanceFor(id)?.outstanding ?? 0;
  const members = active.filter((r) => r.group_id === groupId);
  const splitSum = Object.values(split).reduce((s, v) => s + (v || 0), 0);

  // The family sees one bill: total, already paid, remaining.
  const groupTotals = members.reduce(
    (t, m) => {
      const b = balanceFor(m.id);
      return b ? { agreed: t.agreed + b.agreed, paid: t.paid + b.paidVerified, outstanding: t.outstanding + Math.max(0, b.outstanding) } : t;
    },
    { agreed: 0, paid: 0, outstanding: 0 }
  );

  // Split evenly as soon as the amount is known, until CS edits a member by hand.
  const [manualSplit, setManualSplit] = useState(false);
  const evenSplit = () => setSplit(splitEvenly(total, members.map((m) => ({ id: m.id, outstanding: Math.max(0, outstandingOf(m.id)) }))));
  useEffect(() => {
    if (mode === "group" && !manualSplit) evenSplit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, groupId, total, manualSplit]);

  const rows = mode === "single" ? (regId ? [{ id: regId, amount: total }] : []) : members.map((m) => ({ id: m.id, amount: split[m.id] || 0 })).filter((r) => r.amount > 0);

  const save = async () => {
    if (!rows.length || total <= 0) {
      toast.error(mode === "single" ? "Pilih jamaah dan isi nominal." : "Isi nominal dan bagi ke anggota rombongan.");
      return;
    }
    if (mode === "group" && splitSum !== total) {
      toast.error(`Pembagian (${rupiah(splitSum)}) belum sama dengan total transfer (${rupiah(total)}).`);
      return;
    }
    if (!proof && !isOwner) {
      toast.error("Unggah bukti transfer dulu.");
      return;
    }
    setSaving(true);
    try {
      const transferId = rows.length > 1 ? crypto.randomUUID() : null;
      const { error } = await supabase.from("jamaah_payments").insert(
        rows.map((r) => ({
          registration_id: r.id,
          transfer_id: transferId,
          amount: r.amount,
          paid_on: paidOn,
          bank_account: bank,
          payer_name: payer.trim() || null,
          proof_path: proof,
          notes: notes.trim() || null,
          status: isOwner && verifyNow ? "verified" : "pending",
        }))
      );
      if (error) throw error;
      toast.success(isOwner && verifyNow ? "Pembayaran dicatat dan terverifikasi" : "Pembayaran dicatat, menunggu verifikasi owner");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message || "Gagal mencatat pembayaran");
    } finally {
      setSaving(false);
    }
  };

  const selectedOutstanding = mode === "single" && regId ? outstandingOf(regId) : 0;
  const firstPayment = mode === "single" && regId && !payments.some((p) => p.registration_id === regId && p.status !== "rejected");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Catat Pembayaran</DialogTitle>
          <DialogDescription>Hanya transfer ke rekening PT Musa Amanah Wisata.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {groups.length > 0 && (
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Jenis pembayaran">
              {(["single", "group"] as const).map((m) => (
                <Button key={m} type="button" variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)}>
                  {m === "single" ? "Satu jamaah" : "Satu rombongan (dibagi)"}
                </Button>
              ))}
            </div>
          )}

          {mode === "single" ? (
            <div className="space-y-1.5">
              <Label>Jamaah</Label>
              <Select value={regId} onValueChange={setRegId}>
                <SelectTrigger><SelectValue placeholder="Pilih jamaah" /></SelectTrigger>
                <SelectContent>
                  {active.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {regId && <p className="text-xs text-muted-foreground">Sisa tagihan: {rupiah(selectedOutstanding)}</p>}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Rombongan</Label>
              <Select value={groupId} onValueChange={(v) => { setGroupId(v); setManualSplit(false); }}>
                <SelectTrigger><SelectValue placeholder="Pilih rombongan" /></SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pay-total">Nominal transfer</Label>
              <MoneyInput id="pay-total" value={total} onChange={setTotal} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">Tanggal transfer</Label>
              <Input id="pay-date" type="date" value={paidOn} max={todayIso()} onChange={(e) => setPaidOn(e.target.value)} />
            </div>
          </div>

          {firstPayment && total > 0 && total < DP_MIN_PER_PAX && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              DP minimal {rupiah(DP_MIN_PER_PAX)} per jamaah. Nominal ini belum memenuhi DP.
            </p>
          )}

          {mode === "group" && groupId && (
            <dl className="grid grid-cols-3 gap-2 rounded-md bg-muted px-3 py-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Tagihan rombongan</dt>
                <dd className="font-semibold tabular-nums">{rupiah(groupTotals.agreed)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Sudah masuk</dt>
                <dd className="font-semibold tabular-nums">{rupiah(groupTotals.paid)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Sisa</dt>
                <dd className="font-semibold tabular-nums">{rupiah(groupTotals.outstanding)}</dd>
              </div>
            </dl>
          )}

          {mode === "group" && groupId && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Dibagi ke {members.length} anggota{manualSplit ? " (diatur manual)" : " secara rata"}
                </p>
                {manualSplit && (
                  <Button type="button" size="sm" variant="outline" onClick={() => setManualSplit(false)}>Bagi rata lagi</Button>
                )}
              </div>
              {members.map((m) => (
                <div key={m.id} className="grid grid-cols-[1fr_160px] items-center gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground">Sisa {rupiah(Math.max(0, outstandingOf(m.id)))}</p>
                  </div>
                  <MoneyInput
                    value={split[m.id] || 0}
                    onChange={(v) => {
                      setManualSplit(true);
                      setSplit((s) => ({ ...s, [m.id]: v }));
                    }}
                  />
                </div>
              ))}
              {!members.length && <p className="text-sm text-muted-foreground">Rombongan ini belum punya anggota aktif.</p>}
              <p className={`text-right text-sm ${splitSum === total ? "text-emerald-700" : "text-amber-700"}`}>
                Terbagi {rupiah(splitSum)} dari {rupiah(total)}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Rekening tujuan (PT)</Label>
              <Select value={bank} onValueChange={setBank}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PT_ACCOUNTS.map((a) => (
                    <SelectItem key={a.code} value={a.code}>{a.code} · {a.number}</SelectItem>
                  ))}
                  {isOwner && <SelectItem value="SALDO_AWAL">{BANK_LABELS.SALDO_AWAL}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-payer">Nama pengirim (di rekening)</Label>
              <Input id="pay-payer" value={payer} onChange={(e) => setPayer(e.target.value)} />
            </div>
          </div>

          <DocUpload label={`Bukti transfer${isOwner ? "" : " *"}`} path={proof} folder="payments" onUploaded={setProof} />

          <div className="space-y-1.5">
            <Label htmlFor="pay-notes">Catatan</Label>
            <Textarea id="pay-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {isOwner ? (
            <label className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
              <Checkbox className="mt-0.5" checked={verifyNow} onCheckedChange={(c) => setVerifyNow(!!c)} />
              <span>Sudah saya cek di mutasi rekening, langsung tandai <strong>terverifikasi</strong>.</span>
            </label>
          ) : (
            <p className="text-xs text-muted-foreground">Pembayaran dihitung masuk setelah owner memverifikasi di mutasi rekening.</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
          <Button type="button" onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Pembayaran"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
