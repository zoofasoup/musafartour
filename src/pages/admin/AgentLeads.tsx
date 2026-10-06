import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { AlertTriangle, Loader2, Search, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FOLLOWUP_LABEL, LEAD_STATUS_KIND, LEAD_STATUS_LABEL, followupText, useLeadFollowups, type LeadStatus } from "@/hooks/useAgentLeads";

const PAGE = 50;
const ALL = "all";

type Row = {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_code: string;
  name: string;
  whatsapp: string;
  package_name: string | null;
  interest_note: string | null;
  status: LeadStatus;
  registered_at: string;
  protected_until: string;
  last_followup_at: string | null;
  followup_count: number;
  helper_name: string | null;
  helper_code: string | null;
  inactive_reason: string | null;
  intake_code: string | null;
  conflict_intake_agent_name: string | null;
};

const day = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale: localeId });

function useAdminLeads() {
  return useQuery({
    queryKey: ["admin-agent-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_agent_leads");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });
}

function LeadSheet({ lead, onClose }: { lead: Row | null; onClose: () => void }) {
  const followups = useLeadFollowups(lead?.id ?? null);
  return (
    <Sheet open={!!lead} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {lead && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle>{lead.name}</SheetTitle>
              <SheetDescription>{`+${lead.whatsapp}`} · agen {lead.agent_name} ({lead.agent_code})</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-5 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge kind={LEAD_STATUS_KIND[lead.status]}>{LEAD_STATUS_LABEL[lead.status]}</StatusBadge>
                <span className="text-muted-foreground">Dicatat {day(lead.registered_at)}, perlindungan sampai {day(lead.protected_until)}</span>
              </div>
              {lead.conflict_intake_agent_name && (
                <Alert variant="destructive"><AlertTriangle className="h-4 w-4" aria-hidden /><AlertDescription>Jamaah ini mendaftar lewat agen {lead.conflict_intake_agent_name}. Manajemen memutuskan dari riwayat komunikasi dan bukti follow-up.</AlertDescription></Alert>
              )}
              <dl className="grid grid-cols-2 gap-3">
                <div><dt className="text-[13px] text-muted-foreground">Paket diminati</dt><dd className="font-semibold">{lead.package_name ?? "Belum dipilih"}</dd></div>
                <div><dt className="text-[13px] text-muted-foreground">Pendaftaran</dt><dd className="font-semibold">{lead.intake_code ?? "Belum ada"}</dd></div>
                <div><dt className="text-[13px] text-muted-foreground">Dibantu agen</dt><dd className="font-semibold">{lead.helper_name ? `${lead.helper_name} (${lead.helper_code})` : "-"}</dd></div>
                <div><dt className="text-[13px] text-muted-foreground">Follow-up terakhir</dt><dd className="font-semibold">{followupText(lead.last_followup_at)}</dd></div>
              </dl>
              {lead.interest_note && <p className="rounded-lg bg-muted p-3">{lead.interest_note}</p>}
              {lead.inactive_reason && <p className="text-muted-foreground">Alasan: {lead.inactive_reason}</p>}
              <div>
                <h3 className="mb-2 font-semibold">Riwayat follow-up ({lead.followup_count})</h3>
                {followups.isPending ? (
                  <div className="flex justify-center py-6" role="status" aria-label="Memuat"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : followups.error ? (
                  <LoadError what="Riwayat follow-up" error={followups.error} onRetry={() => followups.refetch()} retrying={followups.isFetching} />
                ) : (followups.data ?? []).length === 0 ? (
                  <p className="rounded-lg border border-dashed py-6 text-center text-muted-foreground">Agen belum mencatat follow-up.</p>
                ) : (
                  <ol className="space-y-3 border-l pl-4">
                    {(followups.data ?? []).map((f) => (
                      <li key={f.id} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-foreground" aria-hidden />
                        <p className="font-semibold">{FOLLOWUP_LABEL[f.kind]} <span className="font-normal text-muted-foreground">· {format(new Date(f.created_at), "d MMM yyyy, HH:mm", { locale: localeId })}</span></p>
                        {f.note && <p className="text-muted-foreground">{f.note}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Read-only overview of every agent's leads. Disputes are decided by management; nothing is written from here. */
export default function AgentLeads() {
  const leads = useAdminLeads();
  const [status, setStatus] = useState<string>(ALL);
  const [agent, setAgent] = useState<string>(ALL);
  const [conflictOnly, setConflictOnly] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => leads.data ?? [], [leads.data]);
  const agents = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.agent_id, `${r.agent_name} (${r.agent_code})`));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    return rows.filter((r) =>
      (status === ALL || r.status === status) &&
      (agent === ALL || r.agent_id === agent) &&
      (!conflictOnly || !!r.conflict_intake_agent_name) &&
      (!term || r.name.toLowerCase().includes(term) || (digits.length >= 3 && r.whatsapp.includes(digits.replace(/^0/, "62"))))
    );
  }, [rows, status, agent, conflictOnly, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  useEffect(() => { setPage(0); }, [status, agent, conflictOnly, q]);
  const current = Math.min(page, pages - 1);
  const shown = filtered.slice(current * PAGE, current * PAGE + PAGE);
  const conflicts = rows.filter((r) => !!r.conflict_intake_agent_name).length;
  const opened = rows.find((r) => r.id === openId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Target className="h-6 w-6" aria-hidden /> Lead Agen</h1>
        <p className="mt-1 text-sm text-muted-foreground">Calon jamaah yang dicatat agen. Perlindungan 30 hari sejak tanggal pendaftaran lead. Halaman ini hanya untuk dibaca.</p>
      </div>

      <Alert><AlertDescription>Pembagian komisi dua agen (30/70 atau 60/40) ditetapkan manajemen. Sistem hanya mencatat agen yang membantu.</AlertDescription></Alert>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau nomor WhatsApp" className="pl-9" aria-label="Cari lead" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filter status" className="w-full lg:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua status</SelectItem>
            {(Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]).map((s) => <SelectItem key={s} value={s}>{LEAD_STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={agent} onValueChange={setAgent}>
          <SelectTrigger aria-label="Filter agen" className="w-full lg:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua agen</SelectItem>
            {agents.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" variant={conflictOnly ? "default" : "outline"} className="gap-2" aria-pressed={conflictOnly} onClick={() => setConflictOnly((v) => !v)}>
          <AlertTriangle className="h-4 w-4" aria-hidden /> Sengketa ({conflicts})
        </Button>
      </div>

      {leads.error && <LoadError what="Daftar lead" error={leads.error} onRetry={() => leads.refetch()} retrying={leads.isFetching} />}

      {leads.isPending ? (
        <div className="flex justify-center rounded-lg border py-10" role="status" aria-label="Memuat"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : leads.error ? null : filtered.length === 0 ? (
        <EmptyState icon={Target} title={rows.length === 0 ? "Belum ada lead" : "Tidak ada lead yang cocok"}>
          {rows.length === 0 ? "Lead muncul di sini setelah agen mencatatnya di portal agen." : "Ubah pencarian atau filter."}
        </EmptyState>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agen</TableHead>
                  <TableHead>Calon jamaah</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dicatat</TableHead>
                  <TableHead>Perlindungan sampai</TableHead>
                  <TableHead>Follow-up terakhir</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                    <TableCell><span className="block font-semibold">{r.agent_name}</span><span className="block text-[13px] text-muted-foreground">{r.agent_code}</span></TableCell>
                    <TableCell>
                      <button type="button" className="text-left" onClick={(e) => { e.stopPropagation(); setOpenId(r.id); }}>
                        <span className="block font-semibold hover:underline">{r.name}</span>
                        <span className="block text-[13px] text-muted-foreground">+{r.whatsapp}</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{r.package_name ?? <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge kind={LEAD_STATUS_KIND[r.status]}>{LEAD_STATUS_LABEL[r.status]}</StatusBadge>
                        {r.conflict_intake_agent_name && <StatusBadge kind="warn">Sengketa: {r.conflict_intake_agent_name}</StatusBadge>}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{day(r.registered_at)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{day(r.protected_until)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{followupText(r.last_followup_at)}</TableCell>
                    <TableCell className="text-right text-sm">{r.followup_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filtered.length} lead · halaman {current + 1} dari {pages}</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>Sebelumnya</Button>
              <Button type="button" variant="outline" size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Berikutnya</Button>
            </div>
          </div>
        </>
      )}

      <LeadSheet lead={opened} onClose={() => setOpenId(null)} />
    </div>
  );
}
