import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { AlertCircle, Loader2, MessageCircle, MoreHorizontal, NotebookPen, Target, UserPlus } from "lucide-react";
import { AgentPageHeader } from "@/components/agent/AgentPageHeader";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { TOUCH_H } from "@/components/admin/jamaah/touch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { usePublishedPackages } from "@/hooks/usePackages";
import {
  FOLLOWUP_LABEL,
  LEAD_STATUS_KIND,
  LEAD_STATUS_LABEL,
  followupText,
  leadErrorMessage,
  useAddFollowup,
  useAgentLeads,
  useCreateLead,
  useLeadFollowups,
  useSetLeadHelper,
  useSetLeadStatus,
  waLeadUrl,
  type AgentLead,
  type FollowupKind,
} from "@/hooks/useAgentLeads";
import { normalizePhone, validName } from "@/lib/intakeForm";

type Filter = "semua" | "active" | "inactive" | "registered";

const day = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale: localeId });
const PROTECTION_DAYS = 30;
const NONE = "none";

const matchFilter = (l: AgentLead, f: Filter) =>
  f === "semua" ? true : f === "inactive" ? l.status === "inactive" || l.status === "lost" : l.status === f;

/** 6281234567890 -> 0812 3456 7890 (the way people write it). */
const localPhone = (wa: string) => `0${wa.slice(2)}`.replace(/^(\d{4})(\d{4})(\d+)$/, "$1 $2 $3");

function Protection({ lead }: { lead: AgentLead }) {
  if (lead.status === "registered") return <span className="text-[13px] text-muted-foreground">Jamaah sudah daftar</span>;
  if (lead.status !== "active") return <span className="text-[13px] text-muted-foreground">Perlindungan tidak berlaku</span>;
  const pct = Math.max(0, Math.min(100, Math.round((lead.days_left / PROTECTION_DAYS) * 100)));
  return (
    <div className="min-w-[8.5rem]">
      <p className="text-[13px] font-semibold">Sisa {lead.days_left} hari</p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={lead.days_left} aria-valuemin={0} aria-valuemax={PROTECTION_DAYS} aria-label={`Sisa perlindungan ${lead.days_left} hari`}>
        <div className={`h-full rounded-full ${lead.days_left <= 7 ? "bg-status-warn-fg/70" : "bg-status-ok-fg/70"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: AgentLead["status"] }) {
  return <StatusBadge kind={LEAD_STATUS_KIND[status]}>{LEAD_STATUS_LABEL[status]}</StatusBadge>;
}

// ---------------------------------------------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------------------------------------------

function AddLeadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: packages = [] } = usePublishedPackages();
  const create = useCreateLead();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pkg, setPkg] = useState(NONE);
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = {
    name: validName(name) ? undefined : "Tulis nama calon jamaah dengan huruf (tanpa angka).",
    phone: normalizePhone(phone) ? undefined : "Nomor WhatsApp belum benar. Contoh: 0812 3456 7890.",
    note: note.length > 300 ? "Catatan maksimal 300 karakter." : undefined,
  };
  const reset = () => { setName(""); setPhone(""); setPkg(NONE); setNote(""); setTouched(false); setServerError(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    if (errors.name || errors.phone || errors.note) return;
    try {
      await create.mutateAsync({ name: name.replace(/\s+/g, " ").trim(), whatsapp: phone, packageId: pkg === NONE ? null : pkg, note });
      toast.success("Lead tercatat. Masa perlindungan 30 hari dimulai hari ini.");
      reset();
      onOpenChange(false);
    } catch (err) {
      setServerError(leadErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Tambah lead</DialogTitle>
          <DialogDescription>Catat calon jamaah dulu. Setelah tercatat, nomornya terlindungi atas namamu selama 30 hari.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">Nama calon jamaah</Label>
            <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={100} aria-invalid={touched && !!errors.name} aria-describedby={touched && errors.name ? "lead-name-err" : undefined} />
            {touched && errors.name && <p id="lead-name-err" role="alert" className="flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden />{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-wa">Nomor WhatsApp</Label>
            <Input id="lead-wa" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812 3456 7890" autoComplete="off" aria-invalid={touched && !!errors.phone} aria-describedby={touched && errors.phone ? "lead-wa-err" : undefined} />
            {touched && errors.phone && <p id="lead-wa-err" role="alert" className="flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden />{errors.phone}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-pkg">Paket yang diminati <span className="font-normal text-muted-foreground">(opsional)</span></Label>
            <Select value={pkg} onValueChange={setPkg}>
              <SelectTrigger id="lead-pkg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Belum tahu</SelectItem>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{format(new Date(`${p.departure_date.slice(0, 10)}T00:00:00`), "d MMM yyyy", { locale: localeId })} · {p.package_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-note">Catatan <span className="font-normal text-muted-foreground">(opsional)</span></Label>
            <Textarea id="lead-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300} placeholder="Mis. tahu dari status WhatsApp, mau berangkat bareng ibu." />
            {touched && errors.note && <p role="alert" className="text-sm text-destructive">{errors.note}</p>}
          </div>
          {serverError && (
            <Alert variant="destructive"><AlertCircle className="h-4 w-4" aria-hidden /><AlertDescription>{serverError}</AlertDescription></Alert>
          )}
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={create.isPending} className="gap-2">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Simpan lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FollowupDialog({ lead, onClose }: { lead: AgentLead | null; onClose: () => void }) {
  const add = useAddFollowup();
  const [kind, setKind] = useState<FollowupKind>("chat");
  const [note, setNote] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const close = () => { setKind("chat"); setNote(""); setServerError(null); onClose(); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    setServerError(null);
    try {
      await add.mutateAsync({ leadId: lead.id, kind, note });
      toast.success("Follow-up tercatat.");
      close();
    } catch (err) {
      setServerError(leadErrorMessage(err));
    }
  };

  return (
    <Dialog open={!!lead} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Catat follow-up</DialogTitle>
          <DialogDescription>{lead ? `Untuk ${lead.name}. Catatan ini jadi bukti komunikasimu bila ada sengketa lead.` : ""}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fu-kind">Jenis</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as FollowupKind)}>
              <SelectTrigger id="fu-kind"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(FOLLOWUP_LABEL) as FollowupKind[]).map((k) => <SelectItem key={k} value={k}>{FOLLOWUP_LABEL[k]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fu-note">Catatan <span className="font-normal text-muted-foreground">(opsional)</span></Label>
            <Textarea id="fu-note" value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={500} placeholder="Mis. sudah kirim brosur paket Maret, menunggu jawaban suami." />
          </div>
          {serverError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" aria-hidden /><AlertDescription>{serverError}</AlertDescription></Alert>}
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={close}>Batal</Button>
            <Button type="submit" disabled={add.isPending} className="gap-2">{add.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatusDialog({ target, onClose }: { target: { lead: AgentLead; status: "inactive" | "lost" } | null; onClose: () => void }) {
  const set = useSetLeadStatus();
  const [reason, setReason] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const close = () => { setReason(""); setServerError(null); onClose(); };
  const lost = target?.status === "lost";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setServerError(null);
    try {
      await set.mutateAsync({ leadId: target.lead.id, status: target.status, reason });
      toast.success(lost ? "Lead ditandai gugur." : "Lead ditandai tidak aktif.");
      close();
    } catch (err) {
      setServerError(leadErrorMessage(err));
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{lost ? "Tandai gugur" : "Tandai tidak aktif"}</DialogTitle>
          <DialogDescription>
            {lost
              ? "Gugur dipakai bila calon jamaah tidak jadi berangkat. Status ini tidak bisa dibatalkan."
              : "Tidak aktif dipakai bila belum ada kabar atau nomor sulit dihubungi. Selama masa perlindungan masih ada, kamu bisa mengaktifkannya lagi."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="st-reason">Alasan <span className="font-normal text-muted-foreground">(opsional)</span></Label>
            <Textarea id="st-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={200} placeholder="Mis. belum bisa dihubungi, bilang tidak tertarik." />
          </div>
          {serverError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" aria-hidden /><AlertDescription>{serverError}</AlertDescription></Alert>}
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={close}>Batal</Button>
            <Button type="submit" disabled={set.isPending} variant={lost ? "destructive" : "default"} className="gap-2">{set.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {lost ? "Tandai gugur" : "Tandai tidak aktif"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Detail drawer
// ---------------------------------------------------------------------------------------------------------------

function LeadDetail({ lead, onClose, onFollowup }: { lead: AgentLead | null; onClose: () => void; onFollowup: (l: AgentLead) => void }) {
  const followups = useLeadFollowups(lead?.id ?? null);
  const helper = useSetLeadHelper();
  const [code, setCode] = useState("");
  const canFollow = lead && (lead.status === "active" || lead.status === "registered");

  const saveHelper = async () => {
    if (!lead) return;
    try {
      await helper.mutateAsync({ leadId: lead.id, code });
      setCode("");
      toast.success("Tersimpan. Pembagian komisi ditetapkan manajemen.");
    } catch (err) {
      toast.error(leadErrorMessage(err));
    }
  };

  return (
    <Sheet open={!!lead} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {lead && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle>{lead.name}</SheetTitle>
              <SheetDescription>{`+${lead.whatsapp}`} · tercatat {day(lead.registered_at)}</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-5 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <StatusChip status={lead.status} />
                <Protection lead={lead} />
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <div><dt className="text-[13px] text-muted-foreground">Paket diminati</dt><dd className="font-semibold">{lead.package_name ?? "Belum dipilih"}</dd></div>
                <div><dt className="text-[13px] text-muted-foreground">Perlindungan sampai</dt><dd className="font-semibold">{day(lead.protected_until)}</dd></div>
              </dl>
              {lead.interest_note && <p className="rounded-lg bg-muted p-3">{lead.interest_note}</p>}
              {lead.inactive_reason && <p className="text-muted-foreground">Alasan: {lead.inactive_reason}</p>}
              {lead.intake_code && <p className="text-muted-foreground">Pendaftaran jamaah: <span className="font-semibold text-foreground">{lead.intake_code}</span></p>}

              <div className="space-y-1.5 rounded-lg border p-3">
                <Label htmlFor="helper-code">Dibantu agen lain? <span className="font-normal text-muted-foreground">(opsional)</span></Label>
                <p className="text-[13px] text-muted-foreground">
                  {lead.helper_code ? `Tercatat dibantu Agent ID ${lead.helper_code}. ` : "Isi Agent ID agen yang membantu closing. "}
                  Pembagian komisi dua agen (30/70 atau 60/40) ditetapkan manajemen.
                </p>
                <div className="flex gap-2">
                  <Input id="helper-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Agent ID" autoComplete="off" />
                  <Button type="button" variant="outline" onClick={saveHelper} disabled={helper.isPending || (!code.trim() && !lead.helper_code)}>{code.trim() || !lead.helper_code ? "Simpan" : "Hapus"}</Button>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">Riwayat follow-up</h3>
                  {canFollow && <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => onFollowup(lead)}><NotebookPen className="h-4 w-4" aria-hidden /> Catat</Button>}
                </div>
                {followups.isPending ? (
                  <div className="flex justify-center py-6" role="status" aria-label="Memuat"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : followups.error ? (
                  <LoadError what="Riwayat follow-up" error={followups.error} onRetry={() => followups.refetch()} retrying={followups.isFetching} />
                ) : (followups.data ?? []).length === 0 ? (
                  <p className="rounded-lg border border-dashed py-6 text-center text-muted-foreground">Belum ada follow-up. Catat setiap kali kamu menghubungi calon jamaah.</p>
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

// ---------------------------------------------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------------------------------------------

interface Handlers {
  onOpen: (l: AgentLead) => void;
  onFollowup: (l: AgentLead) => void;
  onStatus: (l: AgentLead, status: "inactive" | "lost") => void;
  onReactivate: (l: AgentLead) => void;
}

function RowActions({ lead, h }: { lead: AgentLead; h: Handlers }) {
  const canFollow = lead.status === "active" || lead.status === "registered";
  const canRegister = lead.status === "active";
  const canReactivate = lead.status === "inactive" && lead.days_left > 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canFollow && (
        <Button type="button" size="sm" variant="outline" className={`gap-1.5 ${TOUCH_H}`} onClick={() => h.onFollowup(lead)}>
          <NotebookPen className="h-4 w-4" aria-hidden /> Catat follow-up
        </Button>
      )}
      <Button type="button" size="sm" variant="outline" className={`gap-1.5 ${TOUCH_H}`} asChild>
        <a href={waLeadUrl(lead.whatsapp, lead.name)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" aria-hidden /> Buka WhatsApp</a>
      </Button>
      {canRegister && (
        <Button type="button" size="sm" className={`gap-1.5 ${TOUCH_H}`} asChild>
          <Link to={lead.package_id ? `/agent/daftar-jamaah?paket=${lead.package_id}` : "/agent/daftar-jamaah"} state={{ lead: { name: lead.name, phone: localPhone(lead.whatsapp).replace(/\s/g, "") } }}>
            <UserPlus className="h-4 w-4" aria-hidden /> Daftarkan jamaah
          </Link>
        </Button>
      )}
      {(lead.status === "active" || canReactivate) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="icon" variant="ghost" className={TOUCH_H} aria-label={`Ubah status ${lead.name}`}><MoreHorizontal className="h-4 w-4" aria-hidden /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {lead.status === "active" && <DropdownMenuItem onSelect={() => h.onStatus(lead, "inactive")}>Tandai tidak aktif</DropdownMenuItem>}
            {lead.status === "active" && <DropdownMenuItem onSelect={() => h.onStatus(lead, "lost")}>Tandai gugur</DropdownMenuItem>}
            {canReactivate && <DropdownMenuItem onSelect={() => h.onReactivate(lead)}>Aktifkan lagi</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function LeadCard({ lead, h }: { lead: AgentLead; h: Handlers }) {
  return (
    <li className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <button type="button" className="min-w-0 text-left" onClick={() => h.onOpen(lead)}>
          <p className="text-base font-semibold">{lead.name}</p>
          <p className="text-[13px] text-muted-foreground">+{lead.whatsapp} · {lead.package_name ?? "Paket belum dipilih"}</p>
        </button>
        <StatusChip status={lead.status} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <Protection lead={lead} />
        <p className="text-right text-[13px] text-muted-foreground">Follow-up terakhir<br /><span className="font-semibold text-foreground">{followupText(lead.last_followup_at)}</span></p>
      </div>
      <div className="mt-3"><RowActions lead={lead} h={h} /></div>
    </li>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------------------------------------------

/** Every prospective jamaah is registered here first (SOP). 30 days of protection, a follow-up record per lead. */
export default function AgentLeads() {
  const leads = useAgentLeads();
  const setStatus = useSetLeadStatus();
  const [filter, setFilter] = useState<Filter>("semua");
  const [adding, setAdding] = useState(false);
  const [followupFor, setFollowupFor] = useState<AgentLead | null>(null);
  const [statusFor, setStatusFor] = useState<{ lead: AgentLead; status: "inactive" | "lost" } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(() => leads.data ?? [], [leads.data]);
  const shown = useMemo(() => list.filter((l) => matchFilter(l, filter)), [list, filter]);
  const count = (f: Filter) => list.filter((l) => matchFilter(l, f)).length;
  const opened = list.find((l) => l.id === openId) ?? null;

  const handlers: Handlers = {
    onOpen: (l) => setOpenId(l.id),
    onFollowup: setFollowupFor,
    onStatus: (l, status) => setStatusFor({ lead: l, status }),
    onReactivate: async (l) => {
      try {
        await setStatus.mutateAsync({ leadId: l.id, status: "active" });
        toast.success("Lead aktif lagi.");
      } catch (err) {
        toast.error(leadErrorMessage(err));
      }
    },
  };

  return (
    <div className="space-y-6">
      <AgentPageHeader
        title="Lead Saya"
        description="Catat calon jamaah dulu sebelum mendaftarkannya. Nomor yang kamu catat terlindungi atas namamu selama 30 hari sejak tanggal pendaftaran lead, selama kamu aktif follow-up."
        icon={Target}
        action={<Button type="button" className="h-11 gap-2" onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" aria-hidden /> Tambah lead</Button>}
      />

      {leads.error && <LoadError what="Daftar lead" error={leads.error} onRetry={() => leads.refetch()} retrying={leads.isFetching} />}

      {!leads.error && (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList aria-label="Filter lead" className="h-auto max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="semua" className={`shrink-0 ${TOUCH_H}`}>Semua ({list.length})</TabsTrigger>
            <TabsTrigger value="active" className={`shrink-0 ${TOUCH_H}`}>Aktif ({count("active")})</TabsTrigger>
            <TabsTrigger value="inactive" className={`shrink-0 ${TOUCH_H}`}>Tidak aktif ({count("inactive")})</TabsTrigger>
            <TabsTrigger value="registered" className={`shrink-0 ${TOUCH_H}`}>Sudah daftar ({count("registered")})</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {leads.isPending ? (
        <div className="flex justify-center rounded-lg border py-10" role="status" aria-label="Memuat"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : leads.error ? null : shown.length === 0 ? (
        <EmptyState
          icon={Target}
          title={list.length === 0 ? "Belum ada lead" : "Tidak ada lead di kategori ini"}
          action={list.length === 0 ? <Button type="button" className="h-11" onClick={() => setAdding(true)}>Tambah lead pertamamu</Button> : undefined}
        >
          {list.length === 0 ? "Setiap calon jamaah dicatat dulu di sini supaya nomornya terlindungi atas namamu." : undefined}
        </EmptyState>
      ) : (
        <>
          <ul className="space-y-3 lg:hidden" aria-label="Daftar lead">
            {shown.map((l) => <LeadCard key={l.id} lead={l} h={handlers} />)}
          </ul>
          <div className="hidden overflow-hidden rounded-lg border bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Calon jamaah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Perlindungan</TableHead>
                  <TableHead>Follow-up terakhir</TableHead>
                  <TableHead><span className="sr-only">Aksi</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <button type="button" className="text-left" onClick={() => handlers.onOpen(l)}>
                        <span className="block font-semibold hover:underline">{l.name}</span>
                        <span className="block text-[13px] text-muted-foreground">+{l.whatsapp}</span>
                        <span className="block text-[13px] text-muted-foreground">{l.package_name ?? "Paket belum dipilih"}</span>
                      </button>
                    </TableCell>
                    <TableCell><StatusChip status={l.status} /></TableCell>
                    <TableCell><Protection lead={l} /></TableCell>
                    <TableCell className="text-sm">{followupText(l.last_followup_at)}</TableCell>
                    <TableCell><RowActions lead={l} h={handlers} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <AddLeadDialog open={adding} onOpenChange={setAdding} />
      <FollowupDialog lead={followupFor} onClose={() => setFollowupFor(null)} />
      <StatusDialog target={statusFor} onClose={() => setStatusFor(null)} />
      <LeadDetail lead={opened} onClose={() => setOpenId(null)} onFollowup={setFollowupFor} />
    </div>
  );
}
