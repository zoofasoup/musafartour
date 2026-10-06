import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CheckCircle2, ExternalLink, ImageOff, Key, Loader2, Mail, MessageCircle, Phone, RefreshCw, UserCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { rupiah } from "@/lib/jamaah";
import { REGISTRATION_FEE_LABELS } from "@/lib/agentSupport";
import { AGENT_REGISTRATION_FEE } from "@/lib/sopAgen";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  LEVEL_LABEL,
  MISSING_LABEL,
  agentWaNumber,
  helperMessage,
  ktpStoragePath,
  missingFields,
  waLink,
  type Agent,
  type MissingKey,
} from "./agentData";

const STATUS_BADGE = {
  pending: { kind: "warn", label: "Calon Agen" },
  active: { kind: "ok", label: "Agen Aktif" },
  suspended: { kind: "bad", label: "Ditangguhkan" },
} as const;

const SECTION = "text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground";

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-semibold">{children}</span>
    </div>
  );
}

/** KTP photo from the private bucket: a 5 minute signed link, fetched only while the dialog is open. Never logged. */
function KtpPhoto({ agent, open }: { agent: Agent; open: boolean }) {
  const path = ktpStoragePath(agent.ktp_image_url);
  const [imgFailed, setImgFailed] = useState(false);
  const q = useQuery({
    queryKey: ["agent-ktp-signed", path],
    enabled: open && !!path,
    retry: false,
    staleTime: 4 * 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("agent-documents").createSignedUrl(path!, 300);
      if (error || !data?.signedUrl) throw error ?? new Error("no url");
      return data.signedUrl;
    },
  });

  if (!path) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-input p-4 text-sm text-muted-foreground">
        <ImageOff className="h-4 w-4 shrink-0" aria-hidden /> Agen belum mengunggah foto KTP.
      </div>
    );
  }
  if (q.isLoading || q.isFetching) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md bg-muted" role="status" aria-label="Memuat foto KTP">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }
  if (q.isError || !q.data || imgFailed) {
    return (
      <div className="space-y-3 rounded-md bg-status-bad-bg p-4 text-sm text-status-bad-fg" role="alert">
        <p className="flex items-start gap-2">
          <ImageOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Foto KTP tidak bisa dimuat. File mungkin belum ada di penyimpanan, atau akunmu belum punya izin membukanya.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setImgFailed(false);
            q.refetch();
          }}
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> Coba lagi
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <img
        src={q.data}
        alt={`Foto KTP ${agent.name}`}
        className="max-h-72 w-full rounded-md border bg-muted object-contain"
        onError={() => setImgFailed(true)}
      />
      <a
        href={q.data}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
      >
        <ExternalLink className="h-4 w-4" aria-hidden /> Buka ukuran penuh (aktif 5 menit)
      </a>
    </div>
  );
}

function Checklist({ missing }: { missing: MissingKey[] }) {
  const items = Object.keys(MISSING_LABEL) as MissingKey[];
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((k) => {
        const ok = !missing.includes(k);
        const Icon = ok ? CheckCircle2 : XCircle;
        return (
          <li key={k} className="flex items-center gap-2 text-sm">
            <Icon className={ok ? "h-4 w-4 shrink-0 text-status-ok-fg" : "h-4 w-4 shrink-0 text-status-bad-fg"} aria-hidden />
            <span className={ok ? "" : "font-semibold text-status-bad-fg"}>
              {MISSING_LABEL[k]}
              <span className="sr-only">{ok ? " lengkap" : " belum ada"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function AgentDetailDialog({
  agent,
  open,
  onOpenChange,
  onLevelChange,
  onFeeChange,
  onApprove,
  approving,
}: {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLevelChange: (agent: Agent, level: Agent["level"]) => void;
  onFeeChange: (agent: Agent, status: "paid" | "waived") => void;
  onApprove: (agent: Agent) => void;
  approving: boolean;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [changing, setChanging] = useState(false);

  const handleChangePassword = async () => {
    if (!agent) return;
    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setChanging(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-password", {
        body: { userId: agent.user_id, newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Password agen berhasil diubah");
      setNewPassword("");
    } catch (error) {
      toast.error("Gagal mengubah password. Pastikan fungsi admin-update-password sudah aktif (" + (error as Error).message + ")");
    } finally {
      setChanging(false);
    }
  };

  const missing = agent ? missingFields(agent) : [];
  const fee = (agent?.registration_fee_status ?? "unpaid") as keyof typeof REGISTRATION_FEE_LABELS;
  const wa = agent ? agentWaNumber(agent) : null;
  const status = agent ? STATUS_BADGE[agent.status] : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setNewPassword("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        {agent && status && (
          <>
            <DialogHeader className="space-y-2 border-b bg-card p-6 pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-xl font-bold leading-tight">{agent.name}</DialogTitle>
                <StatusBadge kind={status.kind}>{status.label}</StatusBadge>
                {missing.length > 0 && <StatusBadge kind="warn">Data belum lengkap</StatusBadge>}
              </div>
              <DialogDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" aria-hidden /> {agent.email}</span>
                <span>Agent ID <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">{agent.referral_code}</code></span>
                <span>Terdaftar {format(new Date(agent.created_at), "d MMM yyyy", { locale: idLocale })}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[60vh] space-y-6 overflow-y-auto bg-background p-6">
              {/* Money */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">Total penjualan</p>
                  <p className="mt-1 text-xl font-bold">{agent.total_sales} <span className="text-sm font-normal text-muted-foreground">paket</span></p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">Total komisi</p>
                  <p className="mt-1 text-xl font-bold">{rupiah(Number(agent.total_commission))}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">Saldo tersedia</p>
                  <p className="mt-1 text-xl font-bold">{rupiah(Number(agent.available_balance))}</p>
                </div>
              </div>

              {/* Completeness */}
              <section className="space-y-3">
                <h3 className={SECTION}>Kelengkapan data</h3>
                <div className="rounded-lg border bg-card p-4">
                  <Checklist missing={missing} />
                  {missing.length > 0 && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Data yang kosong perlu dilengkapi agen sebelum disetujui. Kamu bisa menagihnya lewat WhatsApp.
                    </p>
                  )}
                </div>
              </section>

              {/* Registration fee and SOP */}
              <section className="space-y-3">
                <h3 className={SECTION}>Biaya registrasi dan SOP</h3>
                <div className="divide-y rounded-lg border bg-card">
                  <Row label={`Biaya registrasi ${rupiah(AGENT_REGISTRATION_FEE)}`}>
                    <StatusBadge kind={fee === "unpaid" ? "warn" : fee === "paid" ? "ok" : "info"}>{REGISTRATION_FEE_LABELS[fee]}</StatusBadge>
                  </Row>
                  {agent.registration_fee_paid_at && (
                    <Row label="Diterima pada">{format(new Date(agent.registration_fee_paid_at), "d MMM yyyy, HH:mm", { locale: idLocale })}</Row>
                  )}
                  <Row label="Persetujuan SOP">
                    {agent.sop_accepted_at
                      ? `${format(new Date(agent.sop_accepted_at), "d MMM yyyy, HH:mm", { locale: idLocale })} (${agent.sop_version ?? "-"})`
                      : <span className="font-normal text-muted-foreground">Belum disetujui</span>}
                  </Row>
                </div>
                {fee === "unpaid" && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" className="gap-2" onClick={() => onFeeChange(agent, "paid")}>
                      <CheckCircle2 className="h-4 w-4" aria-hidden /> Tandai biaya diterima
                    </Button>
                    <Button type="button" variant="outline" onClick={() => onFeeChange(agent, "waived")}>Bebaskan biaya</Button>
                  </div>
                )}
              </section>

              {/* Identity */}
              <section className="space-y-3">
                <h3 className={SECTION}>Identitas</h3>
                <div className="divide-y rounded-lg border bg-card">
                  <Row label="Nomor KTP">{agent.ktp_number || <span className="font-normal text-muted-foreground">Belum diisi</span>}</Row>
                  <Row label="Alamat">{agent.address || <span className="font-normal text-muted-foreground">Belum diisi</span>}</Row>
                  <Row label="Kota">{agent.city || <span className="font-normal text-muted-foreground">-</span>}</Row>
                  <Row label="Provinsi">{agent.province || <span className="font-normal text-muted-foreground">-</span>}</Row>
                </div>
                <KtpPhoto key={agent.id + (agent.ktp_image_url ?? "")} agent={agent} open={open} />
              </section>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Contact */}
                <section className="space-y-3">
                  <h3 className={SECTION}>Kontak dan level</h3>
                  <div className="divide-y rounded-lg border bg-card">
                    <Row label={<><Phone className="h-4 w-4" aria-hidden /> Telepon</>}>{agent.phone}</Row>
                    <Row label={<><MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp</>}>{agent.wa_number || agent.phone}</Row>
                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                      <Label className="text-sm font-normal text-muted-foreground">Ubah level</Label>
                      <Select value={agent.level} onValueChange={(v) => onLevelChange(agent, v as Agent["level"])}>
                        <SelectTrigger className="w-[130px]" aria-label="Ubah level agen"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(LEVEL_LABEL) as Agent["level"][]).map((l) => (
                            <SelectItem key={l} value={l}>{LEVEL_LABEL[l]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {wa ? (
                    <Button asChild variant="outline" className="w-full gap-2">
                      <a href={waLink(wa, helperMessage(agent, missing.map((k) => MISSING_LABEL[k])))} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4" aria-hidden />
                        {missing.length > 0 ? "Minta lengkapi via WhatsApp" : "Hubungi via WhatsApp"}
                      </a>
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nomor WhatsApp asli belum ada, jadi pesan belum bisa dikirim dari sini.</p>
                  )}
                </section>

                {/* Bank */}
                <section className="space-y-3">
                  <h3 className={SECTION}>Informasi bank</h3>
                  {agent.bank_name ? (
                    <div className="divide-y rounded-lg border bg-card">
                      <Row label="Bank">{agent.bank_name}</Row>
                      <Row label="No. rekening"><span className="font-mono">{agent.bank_account}</span></Row>
                      <Row label="Atas nama">{agent.account_name}</Row>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-input p-4 text-center text-sm text-muted-foreground">
                      Agen belum melengkapi data bank.
                    </div>
                  )}
                </section>
              </div>

              {/* Security */}
              <section className="space-y-3">
                <h3 className={SECTION}>Keamanan dan akses</h3>
                <div className="space-y-5 rounded-lg border bg-card p-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-agent-password">Setel ulang password (admin)</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                        <Input
                          id="new-agent-password"
                          type="password"
                          name="new-agent-password"
                          placeholder="Ketik password baru"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pl-9"
                          autoComplete="new-password"
                        />
                      </div>
                      <Button type="button" onClick={handleChangePassword} disabled={changing || !newPassword}>
                        {changing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Simpan"}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Mengganti password agen secara paksa. Butuh fungsi <code>admin-update-password</code> yang aktif.
                    </p>
                  </div>

                  <div className="space-y-2 border-t pt-5">
                    <Label>Kirim link reset</Label>
                    <p className="text-sm text-muted-foreground">Agen menerima email berisi tautan untuk mengatur ulang password sendiri.</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={async () => {
                        try {
                          const { error } = await supabase.auth.resetPasswordForEmail(agent.email, {
                            redirectTo: `${window.location.origin}/agent/login?reset=true`,
                          });
                          if (error) throw error;
                          toast.success("Link reset password sudah dikirim ke email agen");
                        } catch (error) {
                          toast.error("Gagal mengirim email reset: " + (error as Error).message);
                        }
                      }}
                    >
                      <Mail className="h-4 w-4" aria-hidden /> Kirim email reset password
                    </Button>
                  </div>
                </div>
              </section>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t bg-muted p-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Tutup</Button>
              {agent.status === "pending" && (
                <Button type="button" className="gap-2" onClick={() => onApprove(agent)} disabled={approving}>
                  {approving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserCheck className="h-4 w-4" aria-hidden />}
                  Setujui
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
