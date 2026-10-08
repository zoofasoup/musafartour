import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePayAgentCommissions } from "@/hooks/useCommissionPayouts";
import { commissionErrorMessage, type AgentGroup } from "@/lib/commissionPayout";
import { formatCurrency, todayJakarta } from "@/lib/utils";

interface PerAgent {
  reference: string;
  proof: File | null;
  state: "idle" | "busy" | "done" | "error";
  error?: string;
}

/**
 * "Tandai dibayar": one transfer per agent (the rows are already grouped). Transfer date once, then a reference and a
 * proof (bukti transfer) per agent. The proof is required whenever money is actually transferred. NIK is checked by the
 * database too; an agent without a valid NIK is blocked here with the same words.
 */
export function PayoutDialog({
  open,
  onOpenChange,
  groups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: AgentGroup[];
}) {
  const pay = usePayAgentCommissions();
  const [date, setDate] = useState(todayJakarta());
  const [per, setPer] = useState<Record<string, PerAgent>>({});
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const batchId = useRef(crypto.randomUUID());

  useEffect(() => {
    if (open) {
      setDate(todayJakarta());
      setPer(Object.fromEntries(groups.map((g) => [g.agent_id, { reference: "", proof: null, state: "idle" as const }])));
      batchId.current = crypto.randomUUID();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const todo = useMemo(() => groups.filter((g) => per[g.agent_id]?.state !== "done"), [groups, per]);
  const set = (id: string, patch: Partial<PerAgent>) => setPer((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const problem = (g: AgentGroup): string | null => {
    const p = per[g.agent_id];
    if (!p) return null;
    if (!g.nik_ok) return "NIK agen belum lengkap. Lengkapi NIK 16 digit di Kelola Agen dulu.";
    if (g.agent_status !== "active") return "Agen tidak aktif, komisi belum bisa dibayar.";
    if (!p.reference.trim()) return "Nomor referensi transfer wajib diisi.";
    if (g.transfer > 0 && !p.proof) return "Bukti transfer wajib diunggah.";
    return null;
  };
  const dateOk = !!date && date <= todayJakarta();
  const blocked = todo.some((g) => problem(g) !== null) || !dateOk || todo.length === 0;

  const run = async () => {
    setConfirming(false);
    setRunning(true);
    let ok = 0;
    for (const g of todo) {
      const p = per[g.agent_id];
      set(g.agent_id, { state: "busy", error: undefined });
      try {
        await pay.mutateAsync({
          agentId: g.agent_id,
          saleIds: g.rows.map((r) => r.sale_id),
          transferDate: date,
          reference: p.reference.trim(),
          proof: p.proof,
          batchId: batchId.current,
        });
        set(g.agent_id, { state: "done" });
        ok += 1;
      } catch (e) {
        set(g.agent_id, { state: "error", error: commissionErrorMessage(e) });
      }
    }
    setRunning(false);
    if (ok === todo.length) {
      toast.success(ok === 1 ? "Komisi ditandai dibayar." : `${ok} agen ditandai dibayar.`);
      onOpenChange(false);
    } else if (ok > 0) {
      toast.warning(`${ok} agen berhasil, sisanya belum. Periksa pesan di tiap agen.`);
    }
  };

  const totalTransfer = todo.reduce((t, g) => t + g.transfer, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !running && onOpenChange(o)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tandai dibayar</DialogTitle>
            <DialogDescription>
              Satu transfer per agen. PPh 5% sudah dipotong dari komisi; biaya transfer ditanggung Musafar. Setelah ditandai, komisi tidak bisa dibuka lagi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="payout-date">Tanggal transfer</Label>
            <Input id="payout-date" type="date" value={date} max={todayJakarta()} onChange={(e) => setDate(e.target.value)} className="max-w-[200px]" />
            {!dateOk && <p className="text-[13px] text-status-bad-fg">Pilih tanggal hari ini atau sebelumnya.</p>}
          </div>

          <div className="space-y-3">
            {groups.map((g) => {
              const p = per[g.agent_id];
              const msg = p?.state === "done" ? null : problem(g);
              return (
                <section key={g.agent_id} className="space-y-3 rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{g.agent_name} <span className="font-normal text-muted-foreground">· {g.agent_code}</span></p>
                      <p className="text-[13px] text-muted-foreground">
                        {g.bank_name ?? "Bank belum diisi"} {g.bank_account ?? ""} {g.account_name ? `a.n. ${g.account_name}` : ""}
                      </p>
                    </div>
                    {p?.state === "done" ? (
                      <StatusBadge kind="ok">Sudah dibayar</StatusBadge>
                    ) : g.nik_ok ? (
                      <StatusBadge kind="ok" icon={CheckCircle2}>NIK lengkap</StatusBadge>
                    ) : (
                      <StatusBadge kind="bad" icon={AlertTriangle}>NIK belum lengkap</StatusBadge>
                    )}
                  </div>

                  <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div><dt className="text-[12.5px] text-muted-foreground">{g.rows.length} jamaah, bruto</dt><dd className="font-medium">{formatCurrency(g.gross)}</dd></div>
                    <div><dt className="text-[12.5px] text-muted-foreground">PPh 5%</dt><dd>{formatCurrency(g.tax)}</dd></div>
                    <div><dt className="text-[12.5px] text-muted-foreground">Potongan komisi lama</dt><dd>{g.clawback > 0 ? formatCurrency(g.clawback) : "-"}</dd></div>
                    <div><dt className="text-[12.5px] text-muted-foreground">Ditransfer</dt><dd className="font-semibold">{formatCurrency(g.transfer)}</dd></div>
                  </dl>

                  {p?.state !== "done" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`ref-${g.agent_id}`}>Nomor referensi transfer</Label>
                        <Input id={`ref-${g.agent_id}`} value={p?.reference ?? ""} onChange={(e) => set(g.agent_id, { reference: e.target.value })} maxLength={80} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`proof-${g.agent_id}`}>Bukti transfer{g.transfer > 0 ? "" : " (opsional, tidak ada uang yang ditransfer)"}</Label>
                        <label
                          htmlFor={`proof-${g.agent_id}`}
                          className="flex h-10 cursor-pointer items-center gap-2 rounded-md bg-field px-3 text-sm text-muted-foreground hover:bg-field-hover"
                        >
                          <FileUp className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="truncate">{p?.proof ? p.proof.name : "Pilih gambar atau PDF"}</span>
                        </label>
                        <input
                          id={`proof-${g.agent_id}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            if (f && f.size > 10 * 1024 * 1024) {
                              toast.error("Berkas terlalu besar. Maksimal 10 MB.");
                              return;
                            }
                            set(g.agent_id, { proof: f });
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {p?.state === "busy" && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Memproses...</p>
                  )}
                  {p?.state === "error" && (
                    <p role="alert" className="flex items-start gap-2 text-sm text-status-bad-fg"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{p.error}</p>
                  )}
                  {msg && p?.state !== "error" && <p className="text-[13px] text-muted-foreground">{msg}</p>}
                </section>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>Batal</Button>
            <Button onClick={() => setConfirming(true)} disabled={blocked || running}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Tandai dibayar ({todo.length} agen)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Tandai ${todo.length} agen dibayar?`}
        description={`Total ditransfer ${formatCurrency(totalTransfer)} pada ${date}. Pembayaran yang sudah ditandai tidak bisa dibatalkan.`}
        confirmLabel="Ya, tandai dibayar"
        onConfirm={run}
      />
    </>
  );
}
