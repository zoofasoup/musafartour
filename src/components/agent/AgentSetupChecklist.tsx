import { useState, type ReactNode } from "react";
import { copyText } from "@/lib/copy";
import "@/styles/pkg-v2.css";
import { Link, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Check, CheckCircle2, Clock, Copy, ExternalLink, Loader2, Upload, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { AGENT_CS_WHATSAPP, REGISTRATION_FEE_LABELS, type RegistrationFeeStatus } from "@/lib/agentSupport";
import { rupiah } from "@/lib/jamaah";
import { compressImage } from "@/utils/imageCompression";
import {
  AGENT_FEE_ACCOUNTS,
  AGENT_FEE_ACCOUNT_HOLDER,
  AGENT_FEE_INCLUDES,
  AGENT_PIC_NAME,
  AGENT_REGISTRATION_FEE,
  SOP_VERSION,
} from "@/lib/sopAgen";

const FEE_KIND = { unpaid: "warn", paid: "ok", waived: "ok" } as const;

/** Status pill in the pkg-v2 look: tinted, an icon and the word. */
function Pill({ kind, icon: Icon = Clock, children }: { kind: "ok" | "warn"; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ${kind === "ok" ? "bg-pkg-ok/10 text-pkg-ok" : "bg-pkg-warn/10 text-pkg-warn"}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden /> {children}
    </span>
  );
}
const stepBox = "rounded-[24px] bg-pkg-white p-5";
const linkCls = "pkg-label inline-flex min-h-11 items-center gap-1.5 text-pkg-red-deep underline underline-offset-4";

/**
 * Onboarding order (owner decision, Virna): data + SOP first, admin approves, THEN the registration fee.
 * - status 'pending': "Selesaikan pendaftaran" with 2 steps, 1) data diri (KTP, NIK, alamat) and 2) accept the agent SOP.
 * - status 'active' and fee 'unpaid': "Bayar biaya registrasi" (transfer to the PT accounts, proof to the PIC). Until staff
 *   mark it paid or waived the agent can open the portal read-only but cannot sell (enforced in the database).
 * - anything else: nothing to show.
 */
/** `bare`: no outer card, for use inside a panel that is already cream. */
export function AgentSetupChecklist({ bare }: { bare?: boolean } = {}) {
  const { agent, user, refreshAgent } = useAgentAuth();
  const onOnboarding = useLocation().pathname === "/agent/onboarding";
  const [copied, setCopied] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  if (!agent) return null;

  const fee = (agent.registration_fee_status ?? "unpaid") as RegistrationFeeStatus;
  const feeDone = fee !== "unpaid";
  const sopDone = !!agent.sop_accepted_at;
  const dataDone = !!(agent.ktp_number && agent.ktp_image_url && agent.address);
  if (agent.status === "active" && feeDone) return null;
  if (agent.status !== "pending" && agent.status !== "active") return null;
  const payStage = agent.status === "active";

  const copy = (text: string, key: string) => {
    void copyText(text, `Rekening ${key} disalin.`).then((ok) => {
      if (!ok) return;
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const proofSent = !!(agent as { fee_proof_sent_at?: string | null }).fee_proof_sent_at;
  const sendProof = async (file: File | undefined) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pilih foto bukti transfer.");
      return;
    }
    setUploading(true);
    try {
      const small = await compressImage(file, 1400, 0.8);
      const path = `${user.id}/fee-proof-${Date.now()}.jpg`;
      const up = await supabase.storage.from("agent-documents").upload(path, small, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const { error } = await supabase
        .from("agents")
        .update({ fee_proof_path: path, fee_proof_sent_at: new Date().toISOString() } as never)
        .eq("id", agent.id);
      if (error) throw error;
      toast.success("Bukti terkirim.");
      refreshAgent();
    } catch (e) {
      console.error("fee proof upload failed", e);
      const reason = (e as { message?: string })?.message ?? "";
      toast.error("Bukti belum terkirim.", { description: reason ? reason.slice(0, 140) : "Coba lagi." });
    } finally {
      setUploading(false);
    }
  };

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
    <section className={`pkg-v2 pkg-form ${bare ? "" : "rounded-[28px] bg-pkg-cream p-6"}`} aria-labelledby="selesaikan-pendaftaran">
      <h2 id="selesaikan-pendaftaran" className="pkg-h3 !text-[26px]">{payStage ? "Bayar biaya registrasi" : "Selesaikan pendaftaran"}</h2>
      <p className="mt-2 text-[16px] leading-[1.5] text-pkg-fg-2">
        {payStage
          ? "Sudah disetujui. Bayar dulu supaya bisa mulai jualan. Sebelum itu, portal hanya bisa dilihat."
          : "Tiga langkah ini dicek admin. Akunmu aktif setelah ketiganya selesai."}
      </p>

      <ol className="mt-6 space-y-3">
        {!payStage && (
          <>
            <li className={stepBox}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[19px] font-medium text-pkg-fg">1. Data diri</h3>
                <Pill kind={dataDone ? "ok" : "warn"} icon={dataDone ? CheckCircle2 : Clock}>{dataDone ? "Terkirim" : "Belum lengkap"}</Pill>
              </div>
              {!dataDone && (
                <p className="mt-2 text-[15px] text-pkg-fg-2">
                  KTP, NIK, alamat, dan nomor WhatsApp.
                  {!onOnboarding && <> <Link to="/agent/onboarding" className="font-medium text-pkg-red-deep underline underline-offset-4">Lengkapi</Link></>}
                </p>
              )}
            </li>

            <li className={stepBox}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[19px] font-medium text-pkg-fg">2. SOP agen</h3>
                <Pill kind={sopDone ? "ok" : "warn"} icon={sopDone ? CheckCircle2 : Clock}>{sopDone ? "Disetujui" : "Belum"}</Pill>
              </div>
              {sopDone ? (
                <p className="mt-2 text-[15px] text-pkg-fg-2">
                  {format(new Date(agent.sop_accepted_at as string), "d MMMM yyyy", { locale: localeId })}.{" "}
                  <Link to="/sop-agen" target="_blank" className="font-medium text-pkg-red-deep underline underline-offset-4">Baca lagi</Link>
                </p>
              ) : (
                <>
                  <Link to="/sop-agen" target="_blank" rel="noopener noreferrer" className={`${linkCls} mt-1`}>
                    Baca SOP <ExternalLink className="h-4 w-4" aria-hidden />
                  </Link>
                  <label className="mt-2 flex cursor-pointer items-start gap-3 text-[16px] leading-[1.45] text-pkg-fg">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-6 w-6 shrink-0 accent-[#c4141b]" />
                    <span>Saya sudah membaca dan menyetujui SOP.</span>
                  </label>
                  <button type="button" disabled={!agreed || saving} onClick={acceptSop} className="pkg-press mt-4 w-full disabled:opacity-50">
                    {saving ? "Menyimpan..." : "Simpan persetujuan"}
                  </button>
                </>
              )}
            </li>
          </>
        )}
          <li className={stepBox}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[19px] font-medium text-pkg-fg">{payStage ? "" : "3. "}Biaya {rupiah(AGENT_REGISTRATION_FEE)}</h3>
              <Pill kind={FEE_KIND[fee]} icon={feeDone ? CheckCircle2 : Clock}>{REGISTRATION_FEE_LABELS[fee]}</Pill>
            </div>
            <p className="mt-2 text-[15px] text-pkg-fg-2">Sekali seumur hidup. Termasuk:</p>
            <ul className="mt-2 space-y-1 text-[15px] text-pkg-fg">
              {AGENT_FEE_INCLUDES.map((i) => (
                <li key={i} className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-pkg-ok" aria-hidden />{i}</li>
              ))}
            </ul>
            {fee === "unpaid" && (
              <>
                <p className="pkg-label mt-6 text-pkg-fg-2">Transfer a.n. {AGENT_FEE_ACCOUNT_HOLDER}</p>
                <ul className="mt-3 space-y-2">
                  {AGENT_FEE_ACCOUNTS.map((a) => (
                    <li key={a.code} className="flex items-center justify-between gap-3 rounded-full bg-pkg-cream-2 py-1.5 pl-3 pr-1.5">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="grid h-11 w-[72px] shrink-0 place-items-center rounded-full bg-white px-2">
                          <img src={`/bank/${a.code.toLowerCase()}.${a.code === "BSI" ? "png" : "svg"}`} alt={a.code} className={a.code === "BSI" ? "h-7 w-auto object-contain" : "max-h-6 w-full object-contain"} />
                        </span>
                        <span className="min-w-0 truncate text-[16px] tabular-nums">{a.number}</span>
                      </span>
                      <button
                        type="button"
                        data-plain
                        className="pkg-press pkg-label inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-pkg-ink px-4 text-pkg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
                        onClick={() => copy(a.number, a.code)}
                        aria-label={`Salin nomor rekening ${a.code}`}
                      >
                        {copied === a.code ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                        {copied === a.code ? "Tersalin" : "Salin"}
                      </button>
                    </li>
                  ))}
                </ul>
                <label className={`pkg-press mt-5 inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-6 text-[16px] font-medium focus-within:ring-2 focus-within:ring-pkg-ink focus-within:ring-offset-2 ${proofSent ? "bg-pkg-cream-2 !text-pkg-fg" : "bg-pkg-red !text-pkg-on-red"}`}>
                  <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => { void sendProof(e.target.files?.[0]); e.target.value = ""; }} />
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : proofSent ? <CheckCircle2 className="h-5 w-5 text-pkg-ok" aria-hidden /> : <Upload className="h-5 w-5" aria-hidden />}
                  {uploading ? "Mengirim..." : proofSent ? "Bukti terkirim. Kirim ulang" : "Unggah bukti transfer"}
                </label>
              </>
            )}
          </li>
      </ol>
    </section>
  );
}
