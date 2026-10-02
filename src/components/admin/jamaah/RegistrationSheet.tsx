import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Check, Circle, CreditCard, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PaymentTable } from "./PaymentTable";
import { DeleteRegistrationDialog } from "./DeleteRegistrationDialog";
import { buildHistoryEntry, type AuditRow } from "@/lib/jamaahHistory";
import type { AgentOption } from "@/hooks/useJamaah";
import {
  PAY_STATE_CLASS,
  PAY_STATE_LABEL,
  LUNAS_DAYS_BEFORE_DEPARTURE,
  ROOM_SHORT,
  balanceOf,
  daysUntil,
  documentChecklist,
  dueDateFor,
  payState,
  rupiah,
  type JamaahGroup,
  type Payment,
  type Registration,
} from "@/lib/jamaah";

interface Props {
  registration: Registration | null;
  payments: Payment[];
  agents: AgentOption[];
  groups: JamaahGroup[];
  departureDate?: string;
  isOwner: boolean;
  currentUserId?: string;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onPay: () => void;
  onChanged: () => void;
}

export function RegistrationSheet({ registration, payments, agents, groups, departureDate, isOwner, currentUserId, onOpenChange, onEdit, onPay, onChanged }: Props) {
  const regPayments = registration ? payments.filter((p) => p.registration_id === registration.id) : [];
  const balance = registration ? balanceOf(registration, regPayments) : null;
  const state = balance ? payState(balance) : null;
  const due = departureDate ? dueDateFor(departureDate) : null;

  const { data: history = [] } = useQuery({
    queryKey: ["jamaah-audit", registration?.id, regPayments.length],
    enabled: !!registration,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jamaah_audit_log")
        .select("id, table_name, row_id, action, changes, actor_name, actor_email, created_at")
        .eq("registration_id", registration!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as AuditRow[];
    },
  });

  return (
    <Sheet open={!!registration} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {registration && balance && state && (
          <>
            <SheetHeader className="mb-4 text-left">
              <SheetTitle className="flex flex-wrap items-center gap-2">
                {registration.full_name}
                {registration.status === "cancelled" ? (
                  <Badge variant="outline" className="bg-status-bad-bg text-status-bad-fg border-status-bad-border">Batal</Badge>
                ) : (
                  <Badge variant="outline" className={PAY_STATE_CLASS[state]}>{PAY_STATE_LABEL[state]}</Badge>
                )}
              </SheetTitle>
              <SheetDescription>
                {ROOM_SHORT[registration.room_type]} · {registration.phone || "tanpa no. WA"}
                {registration.domicile && ` · ${registration.domicile}`}
              </SheetDescription>
            </SheetHeader>

            <div className="mb-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" className="gap-1 [@media(pointer:coarse)]:h-11" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /> Ubah data</Button>
              {registration.status === "active" && (
                <Button type="button" size="sm" className="gap-1 [@media(pointer:coarse)]:h-11" onClick={onPay}><CreditCard className="h-3.5 w-3.5" /> Catat pembayaran</Button>
              )}
            </div>

            {/* Two columns: four didn't fit the panel and the amounts wrapped ("Rp / 33.400.000"). */}
            <dl className="mb-6 grid grid-cols-2 gap-3">
              {[
                ["Tagihan", rupiah(balance.agreed)],
                ["Sudah masuk", rupiah(balance.paidVerified)],
                ["Menunggu verifikasi", rupiah(balance.paidPending)],
                ["Sisa", rupiah(Math.max(0, balance.outstanding))],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border p-3">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 whitespace-nowrap font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            {due && balance.outstanding > 0 && registration.status === "active" && (
              <p className={`mb-6 rounded-md px-3 py-2 text-sm ${daysUntil(due) < 0 ? "bg-status-bad-bg text-status-bad-fg" : "bg-status-warn-bg text-status-warn-fg"}`}>
                Pelunasan paling lambat {format(new Date(`${due}T00:00:00`), "d MMMM yyyy", { locale: localeId })} (H-{LUNAS_DAYS_BEFORE_DEPARTURE})
                {daysUntil(due) < 0 ? `, sudah lewat ${-daysUntil(due)} hari.` : `, ${daysUntil(due)} hari lagi.`}
              </p>
            )}
            {registration.status === "cancelled" && (
              <p className="mb-6 rounded-md bg-status-bad-bg px-3 py-2 text-sm text-status-bad-fg">
                Batal: {registration.cancel_reason}
                {registration.refund_amount != null && ` · Refund ${rupiah(Number(registration.refund_amount))}`}
                {registration.refund_paid_at && ` (dibayar ${registration.refund_paid_at})`}
              </p>
            )}

            <h3 className="mb-2 text-sm font-semibold">Kelengkapan dokumen</h3>
            <ul className="mb-6 grid gap-1 sm:grid-cols-2">
              {documentChecklist(registration).map((d) => (
                <li key={d.key} className="flex items-center gap-2 text-sm">
                  {d.done ? <Check className="h-4 w-4 text-status-ok-text" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span className={d.done ? "" : "text-muted-foreground"}>{d.label}</span>
                </li>
              ))}
            </ul>

            <h3 className="mb-2 text-sm font-semibold">Pembayaran</h3>
            <div className="mb-6">
              <PaymentTable payments={regPayments} isOwner={isOwner} currentUserId={currentUserId} onChanged={onChanged} />
            </div>

            <h3 className="mb-2 text-sm font-semibold">Riwayat perubahan</h3>
            <ol className="space-y-2">
              {history.map((row) => {
                const e = buildHistoryEntry(row, { agents, groups, payments });
                return (
                  <li key={e.id} className="rounded-md border px-3 py-2 text-sm">
                    <p>
                      <span className="font-medium">{e.who}</span> <span className="text-muted-foreground">{e.what}</span>
                    </p>
                    <p className="text-[13px] text-muted-foreground">{e.when}</p>
                    {e.lines.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {e.lines.map((l) => (
                          <li key={l.label}>
                            <span className="text-muted-foreground">{l.label}:</span>{" "}
                            <span className="sr-only">dari </span>
                            <span className="text-muted-foreground line-through decoration-muted-foreground/60">{l.from}</span>
                            <span aria-hidden> → </span>
                            <span className="sr-only"> menjadi </span>
                            <span className="font-medium">{l.to}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
              {!history.length && <li className="text-sm text-muted-foreground">Belum ada riwayat.</li>}
            </ol>
            {isOwner && (
              <DeleteRegistrationDialog
                registration={registration}
                hasPayments={regPayments.length > 0}
                onDeleted={() => {
                  onOpenChange(false);
                  onChanged();
                }}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
