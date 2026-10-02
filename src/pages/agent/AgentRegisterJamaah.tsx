import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { Link2, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { usePublishedPackages } from "@/hooks/usePackages";
import { AgentPageHeader } from "@/components/agent/AgentPageHeader";
import { RegistrationForm, type SubmitPayload } from "@/components/daftar/RegistrationForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_BADGE } from "@/lib/jamaah";

const day = (d: string) => format(new Date(`${d.slice(0, 10)}T00:00:00`), "d MMM yyyy", { locale: localeId });

const STATUS: Record<string, { label: string; className: string }> = {
  new: { label: "Menunggu CS", className: STATUS_BADGE.warn },
  accepted: { label: "Diterima", className: STATUS_BADGE.ok },
  rejected: { label: "Ditolak", className: STATUS_BADGE.bad },
};

/** Where an agent registers their own jamaah: same form as the public one, signed in as the agent instead of Turnstile. */
export default function AgentRegisterJamaah() {
  const { agent } = useAgentAuth();
  const qc = useQueryClient();
  const { data: packages = [], isPending: loadingPackages } = usePublishedPackages();
  const [packageId, setPackageId] = useState("");
  const [formKey, setFormKey] = useState(0);
  const pkg = useMemo(() => packages.find((p) => p.id === packageId), [packages, packageId]);

  const { data: mine = [], isPending: loadingMine, error: mineError, refetch } = useQuery({
    queryKey: ["agent-intakes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_my_agent_intakes");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (agent && agent.status !== "active") {
    return (
      <div>
        <AgentPageHeader title="Daftarkan Jamaah" icon={UserPlus} />
        <Alert><AlertDescription>Akun agen kamu belum aktif, jadi belum bisa mendaftarkan jamaah. Hubungi tim Musafar bila ini keliru.</AlertDescription></Alert>
      </div>
    );
  }

  const submit = async (payload: SubmitPayload) => {
    const { data: auth } = await supabase.auth.getSession();
    const token = auth.session?.access_token;
    if (!token) throw new Error("Sesi kamu sudah berakhir. Silakan masuk lagi ke portal agen.");
    let res: Response;
    try {
      res = await fetch("/api/daftar", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ ...payload, turnstile_token: null }) });
    } catch {
      throw new Error("Tidak bisa terhubung ke server. Periksa internet kamu, lalu coba lagi.");
    }
    const data = (await res.json().catch(() => null)) as { ok?: boolean; code?: string; error?: string } | null;
    if (!res.ok || !data?.ok || !data.code) throw new Error(data?.error || "Pendaftaran belum bisa dikirim. Coba lagi sebentar lagi.");
    qc.invalidateQueries({ queryKey: ["agent-intakes"] });
    return { code: data.code };
  };

  const copyLink = async () => {
    if (!pkg || !agent) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/daftar/${pkg.slug}?ref=${agent.referral_code}`);
      toast.success("Link pendaftaran disalin. Kirim ke calon jamaah, pendaftarannya tercatat atas namamu.");
    } catch {
      toast.error("Link belum bisa disalin. Coba lagi.");
    }
  };

  return (
    <div className="space-y-8">
      <AgentPageHeader title="Daftarkan Jamaah" description="Isi data jamaah sendiri, atau kirim link supaya jamaah mengisi sendiri. Keduanya tercatat atas namamu." icon={UserPlus} />

      <section aria-labelledby="pilih-paket" className="space-y-3">
        <h2 id="pilih-paket" className="text-lg font-bold">1. Pilih paket</h2>
        {loadingPackages ? (
          <Skeleton className="h-11 w-full max-w-xl" />
        ) : (
          <div className="flex max-w-xl flex-col gap-3 sm:flex-row">
            <Select value={packageId} onValueChange={(v) => { setPackageId(v); setFormKey((k) => k + 1); }}>
              <SelectTrigger aria-label="Pilih paket" className="h-11"><SelectValue placeholder={packages.length ? "Pilih paket keberangkatan" : "Belum ada paket yang dibuka"} /></SelectTrigger>
              <SelectContent>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{day(p.departure_date)} · {p.package_name} · {p.duration_days} hari</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" className="h-11 gap-2" disabled={!pkg} onClick={copyLink}>
              <Link2 className="h-4 w-4" aria-hidden /> Salin link untuk jamaah
            </Button>
          </div>
        )}
      </section>

      {pkg && agent && (
        <section aria-labelledby="isi-data" className="space-y-3">
          <h2 id="isi-data" className="text-lg font-bold">2. Isi data jamaah</h2>
          <div className="max-w-2xl">
            <RegistrationForm
              key={`${pkg.id}-${formKey}`}
              pkg={pkg}
              refCode={agent.referral_code}
              submit={submit}
              whatsappUrl={() => "#"}
              agent={{ name: agent.name, onAnother: () => setFormKey((k) => k + 1) }}
            />
          </div>
        </section>
      )}

      <section aria-labelledby="saya" className="space-y-3">
        <h2 id="saya" className="text-lg font-bold">Pendaftaran saya</h2>
        {loadingMine ? (
          <div className="flex justify-center rounded-lg border py-8" role="status" aria-label="Memuat"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : mineError ? (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              Daftar pendaftaran belum bisa dimuat.
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>Coba lagi</Button>
            </AlertDescription>
          </Alert>
        ) : mine.length === 0 ? (
          <p className="rounded-lg border py-8 text-center text-sm text-muted-foreground">Belum ada pendaftaran. Yang kamu kirim akan muncul di sini beserta statusnya.</p>
        ) : (
          <ul className="space-y-3">
            {mine.map((i) => {
              const st = STATUS[i.status] ?? { label: i.status, className: STATUS_BADGE.info };
              return (
                <li key={i.code} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{i.contact_name} <span className="font-normal text-muted-foreground">· {i.code}</span></p>
                    <p className="text-[13px] text-muted-foreground">{i.package_name} · berangkat {day(i.departure_date)}</p>
                    <p className="text-[13px] text-muted-foreground">{i.people_count} orang · dikirim {format(new Date(i.created_at), "d MMM yyyy, HH:mm", { locale: localeId })}</p>
                  </div>
                  <Badge variant="outline" className={st.className}>{st.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
