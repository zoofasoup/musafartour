import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Banknote, Check, Copy, Loader2, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { rupiah } from "@/lib/jamaah";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { isPaidStatus, type Agent, type Withdrawal } from "./agentData";

type Filter = "pending" | "paid" | "rejected" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending", label: "Menunggu" },
  { value: "paid", label: "Dibayar" },
  { value: "rejected", label: "Ditolak" },
  { value: "all", label: "Semua" },
];

const matches = (w: Withdrawal, f: Filter) =>
  f === "all" || (f === "paid" ? isPaidStatus(w.status) : w.status === f);

function WithdrawalStatus({ status }: { status: string }) {
  if (status === "pending") return <StatusBadge kind="warn">Menunggu</StatusBadge>;
  if (isPaidStatus(status)) return <StatusBadge kind="ok">Dibayar</StatusBadge>;
  if (status === "rejected") return <StatusBadge kind="bad">Ditolak</StatusBadge>;
  if (status === "processing") return <StatusBadge kind="info">Diproses</StatusBadge>;
  return <StatusBadge kind="mute">{status}</StatusBadge>;
}

function CopyAccount({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      aria-label="Salin nomor rekening"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success("Nomor rekening disalin");
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Tidak bisa menyalin. Salin nomornya secara manual.");
        }
      }}
    >
      {done ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
    </Button>
  );
}

function Account({ w }: { w: Withdrawal }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{w.bank_name}</p>
      <div className="flex items-center gap-1">
        <span className="font-mono text-sm font-semibold break-all">{w.bank_account}</span>
        <CopyAccount value={w.bank_account} />
      </div>
      <p className="text-sm">{w.account_name}</p>
    </div>
  );
}

type Pending = { w: Withdrawal; kind: "paid" | "rejected" } | null;

export function WithdrawalsPanel({
  withdrawals,
  agents,
  loading,
  error,
  onRetry,
}: {
  withdrawals: Withdrawal[];
  agents: Agent[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");
  const [dialog, setDialog] = useState<Pending>(null);
  const [notes, setNotes] = useState("");

  const agentById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const rows = useMemo(() => withdrawals.filter((w) => matches(w, filter)), [withdrawals, filter]);
  const counts = useMemo(
    () => ({
      pending: withdrawals.filter((w) => w.status === "pending").length,
      paid: withdrawals.filter((w) => isPaidStatus(w.status)).length,
      rejected: withdrawals.filter((w) => w.status === "rejected").length,
      all: withdrawals.length,
    }),
    [withdrawals],
  );

  const close = () => {
    setDialog(null);
    setNotes("");
  };

  const processMutation = useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: "paid" | "rejected"; note: string }) => {
      const { error } = await supabase.rpc("process_agent_withdrawal", {
        _id: id,
        _action: action,
        _notes: note.trim() || undefined,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
      queryClient.invalidateQueries({ queryKey: ["admin-agent-withdrawals"] });
      toast.success(vars.action === "paid" ? "Penarikan ditandai dibayar. Saldo agen sudah dikurangi." : "Permintaan penarikan ditolak.");
      close();
    },
    onError: (e: { message?: string }) => {
      // The function raises readable Indonesian messages; anything else gets a generic line.
      toast.error(e?.message && !/^(FetchError|TypeError)/.test(e.message) ? e.message : "Gagal memproses penarikan. Coba lagi.");
      queryClient.invalidateQueries({ queryKey: ["admin-agent-withdrawals"] });
    },
  });

  const target = dialog?.w ?? null;
  const targetAgent = target ? agentById.get(target.agent_id) : undefined;
  const balanceAfter = target && targetAgent ? Number(targetAgent.available_balance) - Number(target.amount) : null;
  const notEnough = dialog?.kind === "paid" && balanceAfter !== null && balanceAfter < 0;

  const actions = (w: Withdrawal) =>
    w.status === "pending" ? (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setDialog({ w, kind: "rejected" })}>
          <X className="h-4 w-4" aria-hidden /> Tolak
        </Button>
        <Button type="button" size="sm" onClick={() => setDialog({ w, kind: "paid" })}>
          <Check className="h-4 w-4" aria-hidden /> Tandai dibayar
        </Button>
      </div>
    ) : (
      <div className="text-right text-sm text-muted-foreground">
        {w.processed_at && <p>{format(new Date(w.processed_at), "d MMM yyyy", { locale: idLocale })}</p>}
        {w.admin_notes && <p className="break-words">{w.admin_notes}</p>}
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter status penarikan">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors [@media(pointer:coarse)]:h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              filter === f.value ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-foreground hover:bg-field",
            )}
          >
            {f.label}
            <span className={cn("text-xs", filter === f.value ? "text-primary-foreground/80" : "text-muted-foreground")}>{counts[f.value]}</span>
          </button>
        ))}
      </div>

      {error ? (
        <LoadError what="Daftar penarikan" error={error} onRetry={onRetry} />
      ) : loading ? (
        <div className="flex items-center justify-center py-8" role="status" aria-label="Memuat">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Banknote} title={filter === "pending" ? "Tidak ada penarikan yang menunggu" : "Belum ada penarikan di sini"}>
          {filter === "pending" ? "Permintaan baru dari agen akan muncul di sini." : "Coba filter lain untuk melihat riwayat."}
        </EmptyState>
      ) : (
        <>
          {/* Desktop and tablet: table */}
          <Card className="hidden overflow-hidden sm:block">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="w-[130px]">Tanggal</TableHead>
                  <TableHead>Agen</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Rekening tujuan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((w) => {
                  const a = agentById.get(w.agent_id);
                  return (
                    <TableRow key={w.id} className="align-top">
                      <TableCell className="whitespace-nowrap p-4">{format(new Date(w.requested_at), "d MMM yyyy", { locale: idLocale })}</TableCell>
                      <TableCell className="p-4">
                        <p className="font-semibold">{a?.name ?? "Agen dihapus"}</p>
                        {a && <p className="text-sm text-muted-foreground">{a.email}</p>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap p-4 text-right font-semibold">{rupiah(Number(w.amount))}</TableCell>
                      <TableCell className="p-4"><Account w={w} /></TableCell>
                      <TableCell className="p-4"><WithdrawalStatus status={w.status} /></TableCell>
                      <TableCell className="p-4">{actions(w)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Phones: one card per request */}
          <div className="space-y-3 sm:hidden">
            {rows.map((w) => {
              const a = agentById.get(w.agent_id);
              return (
                <Card key={w.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{a?.name ?? "Agen dihapus"}</p>
                        <p className="text-sm text-muted-foreground">{format(new Date(w.requested_at), "d MMM yyyy", { locale: idLocale })}</p>
                      </div>
                      <WithdrawalStatus status={w.status} />
                    </div>
                    <p className="text-right text-xl font-bold">{rupiah(Number(w.amount))}</p>
                    <div className="rounded-md bg-muted p-3"><Account w={w} /></div>
                    {actions(w)}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && !processMutation.isPending && close()}>
        <DialogContent className="max-w-md">
          {target && dialog && (
            <>
              <DialogHeader>
                <DialogTitle>{dialog.kind === "paid" ? "Tandai dibayar" : "Tolak penarikan"}</DialogTitle>
                <DialogDescription>
                  {dialog.kind === "paid"
                    ? "Pastikan uangnya sudah kamu transfer. Saldo agen langsung dikurangi dan ini tidak bisa dibatalkan."
                    : "Agen akan melihat alasan penolakan. Saldo agen tidak berubah."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 rounded-md bg-muted p-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">{targetAgent?.name ?? "Agen"}</span>
                  <span className="text-lg font-bold">{rupiah(Number(target.amount))}</span>
                </div>
                <Account w={target} />
                {dialog.kind === "paid" && balanceAfter !== null && (
                  <div className="flex items-baseline justify-between gap-3 border-t pt-3">
                    <span className="text-muted-foreground">Saldo agen setelah dibayar</span>
                    <span className={cn("font-semibold", notEnough && "text-destructive")}>{rupiah(balanceAfter)}</span>
                  </div>
                )}
              </div>

              {notEnough && (
                <p className="flex items-start gap-2 text-sm text-destructive" role="alert">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Saldo agen saat ini lebih kecil dari jumlah penarikan, jadi tidak bisa ditandai dibayar.
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="withdrawal-notes">
                  {dialog.kind === "paid" ? "Catatan (opsional)" : "Alasan penolakan"}
                </Label>
                <Textarea
                  id="withdrawal-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder={dialog.kind === "paid" ? "Contoh: transfer BCA, ref 12345" : "Contoh: nama rekening tidak sesuai"}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="ghost" onClick={close} disabled={processMutation.isPending}>Batal</Button>
                <Button
                  type="button"
                  variant={dialog.kind === "rejected" ? "destructiveSolid" : "default"}
                  disabled={processMutation.isPending || notEnough || (dialog.kind === "rejected" && !notes.trim())}
                  onClick={() => processMutation.mutate({ id: target.id, action: dialog.kind, note: notes })}
                >
                  {processMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {dialog.kind === "paid" ? "Tandai dibayar" : "Tolak permintaan"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
