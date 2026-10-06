import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Check, CheckCircle2, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import { AGENT_CS_WHATSAPP, REGISTRATION_FEE_LABELS, type RegistrationFeeStatus } from "@/lib/agentSupport";
import { rupiah } from "@/lib/jamaah";
import {
  AGENT_FEE_ACCOUNTS,
  AGENT_FEE_ACCOUNT_HOLDER,
  AGENT_FEE_INCLUDES,
  AGENT_PIC_NAME,
  AGENT_PIC_ROLE,
  AGENT_REGISTRATION_FEE,
  SOP_VERSION,
} from "@/lib/sopAgen";

const FEE_KIND = { unpaid: "warn", paid: "ok", waived: "info" } as const;

/**
 * "Selesaikan pendaftaran": the two things a new agent still has to do besides KTP and address, as a 2-step checklist.
 * 1) registration fee (transfer to the PT accounts, proof to the PIC), 2) accept the agent SOP.
 * Used on the onboarding page and on the "Menunggu Persetujuan" screen. Approval stays with admin.
 */
export function AgentSetupChecklist() {
  const { agent, refreshAgent } = useAgentAuth();
  const [copied, setCopied] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  if (!agent) return null;

  const fee = (agent.registration_fee_status ?? "unpaid") as RegistrationFeeStatus;
  const feeDone = fee !== "unpaid";
  const sopDone = !!agent.sop_accepted_at;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(key);
        setTimeout(() => setCopied(null), 1500);
      },
      () => toast.error("Belum bisa menyalin. Coba lagi.")
    );
  };

  const waText = `Halo ${AGENT_PIC_NAME}, saya ${agent.name} (Agent ID ${agent.referral_code}). Saya sudah transfer biaya registrasi agen ${rupiah(AGENT_REGISTRATION_FEE)}. Berikut bukti transfernya.`;
  const waUrl = `https://wa.me/${AGENT_CS_WHATSAPP}?text=${encodeURIComponent(waText)}`;

  const acceptSop = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("accept_agent_sop", { _version: SOP_VERSION });
    setSaving(false);
    if (error) {
      toast.error("Persetujuan SOP belum tersimpan. Coba lagi sebentar lagi.");
      return;
    }
    toast.success("Terima kasih, persetujuan SOP tercatat.");
    refreshAgent();
  };

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-6" aria-labelledby="selesaikan-pendaftaran">
      <h2 id="selesaikan-pendaftaran" className="text-lg font-bold text-foreground">Selesaikan pendaftaran</h2>
      <p className="mt-1 text-sm text-muted-foreground">Dua hal ini dicek admin sebelum akun agenmu diaktifkan.</p>

      <ol className="mt-4 space-y-4">
        {/* 1. Registration fee */}
        <li className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground">1. Biaya registrasi {rupiah(AGENT_REGISTRATION_FEE)}</h3>
            <StatusBadge kind={FEE_KIND[fee]} icon={feeDone ? CheckCircle2 : undefined}>{REGISTRATION_FEE_LABELS[fee]}</StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Dibayar satu kali seumur hidup. Sudah termasuk:</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-foreground">
            {AGENT_FEE_INCLUDES.map((i) => <li key={i}>{i}</li>)}
          </ul>
          {fee === "unpaid" && (
            <>
              <p className="mt-4 text-sm font-medium text-foreground">Transfer ke rekening a.n. {AGENT_FEE_ACCOUNT_HOLDER}</p>
              <ul className="mt-2 space-y-2">
                {AGENT_FEE_ACCOUNTS.map((a) => (
                  <li key={a.code} className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2">
                    <span className="text-sm"><span className="font-semibold">{a.code}</span> <span className="font-mono">{a.number}</span></span>
                    <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5" onClick={() => copy(a.number, a.code)} aria-label={`Salin nomor rekening ${a.code}`}>
                      {copied === a.code ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                      {copied === a.code ? "Tersalin" : "Salin"}
                    </Button>
                  </li>
                ))}
              </ul>
              <Button asChild variant="brand" className="mt-4 h-11 w-full gap-2 sm:w-auto">
                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" aria-hidden /> Kirim bukti transfer ke PIC Agen via WhatsApp
                </a>
              </Button>
              <p className="mt-2 text-[13px] text-muted-foreground">PIC: {AGENT_PIC_NAME}, {AGENT_PIC_ROLE}. Status berubah menjadi "Sudah dibayar" setelah admin memeriksa buktimu.</p>
            </>
          )}
        </li>

        {/* 2. SOP */}
        <li className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground">2. Setujui SOP Program Agen</h3>
            <StatusBadge kind={sopDone ? "ok" : "warn"} icon={sopDone ? CheckCircle2 : undefined}>{sopDone ? "Sudah disetujui" : "Belum disetujui"}</StatusBadge>
          </div>
          {sopDone ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Disetujui {format(new Date(agent.sop_accepted_at as string), "d MMMM yyyy", { locale: localeId })} ({agent.sop_version}).{" "}
              <Link to="/sop-agen" target="_blank" className="font-semibold text-foreground underline underline-offset-4">Baca lagi</Link>
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">Baca SOP-nya dulu, lalu centang persetujuanmu.</p>
              <Link to="/sop-agen" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4">
                Baca SOP Program Agen <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <label className="mt-2 flex cursor-pointer items-start gap-3 text-sm text-foreground">
                <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
                <span>Saya sudah membaca, memahami, dan menyetujui SOP Program Agen Musafar</span>
              </label>
              <Button type="button" className="mt-3 h-11 w-full sm:w-auto" disabled={!agreed || saving} onClick={acceptSop}>
                {saving ? "Menyimpan..." : "Simpan persetujuan"}
              </Button>
            </>
          )}
        </li>
      </ol>
    </section>
  );
}
