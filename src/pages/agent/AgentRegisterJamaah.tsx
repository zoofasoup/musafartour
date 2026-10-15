import { useMemo, useState } from "react";
import { copyText } from "@/lib/copy";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { Link2, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { usePublishedPackages } from "@/hooks/usePackages";
import { AgentPage, AgentPanel, agentGlass } from "@/components/agent/AgentPage";
import { RegistrationForm, type SubmitPayload } from "@/components/daftar/RegistrationForm";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const day = (d: string) => format(new Date(`${d.slice(0, 10)}T00:00:00`), "d MMM yyyy", { locale: localeId });

/** Where an agent registers their own jamaah: same form as the public one, signed in as the agent instead of Turnstile. */
export default function AgentRegisterJamaah() {
  const { agent } = useAgentAuth();
  const qc = useQueryClient();
  const { data: packages = [], isPending: loadingPackages } = usePublishedPackages();
  const [params] = useSearchParams();
  // "Daftarkan jamaah" on Lead Saya passes the lead's name and number in the navigation state (not in the URL).
  const lead = (useLocation().state as { lead?: { name?: string; phone?: string } } | null)?.lead;
  const initialContact = lead?.name && lead?.phone ? { name: lead.name, phone: lead.phone } : undefined;
  // /agent/daftar-jamaah?paket=<id> opens with that package chosen (the package pages link here).
  const [packageId, setPackageId] = useState(params.get("paket") ?? "");
  const [formKey, setFormKey] = useState(0);
  const pkg = useMemo(() => packages.find((p) => p.id === packageId), [packages, packageId]);
  // One group per departure month ("Oktober 2026"), in date order.
  const byMonth = useMemo(() => {
    const groups = new Map<string, typeof packages>();
    for (const p of [...packages].sort((a, b) => a.departure_date.localeCompare(b.departure_date))) {
      const key = format(new Date(`${p.departure_date.slice(0, 10)}T00:00:00`), "MMMM yyyy", { locale: localeId });
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    return [...groups.entries()];
  }, [packages]);

  if (agent && agent.status !== "active") {
    return (
      <AgentPage title="Daftarkan jamaah">
        <AgentPanel last>
          <p className="text-[17px] leading-[1.5] text-pkg-fg-2">Akun agenmu belum aktif, jadi belum bisa mendaftarkan jamaah. Hubungi tim Musafar kalau ini keliru.</p>
        </AgentPanel>
      </AgentPage>
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
    qc.invalidateQueries({ queryKey: ["agent-jamaah"] });
    return { code: data.code };
  };

  const copyLink = async () => {
    if (!pkg || !agent) return;
    await copyText(`${window.location.origin}/daftar/${pkg.slug}?ref=${agent.referral_code}`, "Link pendaftaran disalin.");
  };

  return (
    <AgentPage title="Daftarkan jamaah">
      <AgentPanel last={!(pkg && agent)}>
        <section aria-labelledby="pilih-paket" className="pkg-form">
          <h2 id="pilih-paket" className="pkg-h3">Pilih paket</h2>
          {loadingPackages ? (
            <Skeleton className="mt-6 h-14 w-full rounded-full" />
          ) : (
            <div className="mt-6 space-y-4">
              <Select value={packageId} onValueChange={(v) => { setPackageId(v); setFormKey((k) => k + 1); }}>
                <SelectTrigger aria-label="Pilih paket"><SelectValue placeholder={packages.length ? "Pilih paket keberangkatan" : "Belum ada paket yang dibuka"} /></SelectTrigger>
                <SelectContent>
                  {byMonth.map(([month, items]) => (
                    <SelectGroup key={month}>
                      <SelectLabel className="pkg-caption px-3 pb-1 pt-3 text-pkg-fg-3">{month}</SelectLabel>
                      {items.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{format(new Date(`${p.departure_date.slice(0, 10)}T00:00:00`), "d MMM", { locale: localeId })} · {p.package_name} · {p.duration_days} hari</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <button type="button" className={agentGlass} disabled={!pkg} onClick={copyLink}>
                <Link2 className="h-5 w-5" aria-hidden /> Salin link untuk jamaah
              </button>
            </div>
          )}
        </section>
      </AgentPanel>

      {pkg && agent && (
        <AgentPanel tone="cream-2" last>
          <section aria-labelledby="isi-data" className="pkg-form">
            <h2 id="isi-data" className="pkg-h3 mb-8">Data jamaah</h2>
            <RegistrationForm
              key={`${pkg.id}-${formKey}`}
              pkg={pkg}
              refCode={agent.referral_code}
              submit={submit}
              whatsappUrl={() => "#"}
              agent={{ name: agent.name, onAnother: () => setFormKey((k) => k + 1) }}
              initialContact={initialContact}
            />
          </section>
          <Link to="/agent/jamaah" className="pkg-label mt-10 inline-flex min-h-11 items-center text-pkg-red-deep underline underline-offset-4">Pantau di Jamaah saya</Link>
        </AgentPanel>
      )}
    </AgentPage>
  );
}
