import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Loader2, MessageCircle, UserPlus, Users } from "lucide-react";
import { AgentPageHeader } from "@/components/agent/AgentPageHeader";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { StatCard } from "@/components/admin/jamaah/StatCard";
import { TOUCH_H } from "@/components/admin/jamaah/touch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AGENT_STATE_CLASS,
  AGENT_STATE_LABEL,
  byUrgency,
  deadlineText,
  needsPayment,
  useAgentIntakes,
  useAgentJamaah,
  type AgentJamaah,
} from "@/hooks/useAgentJamaah";
import { STATUS_BADGE, juta, reminderWhatsAppUrl, rupiah } from "@/lib/jamaah";

type Tab = "semua" | "belum_dp" | "dp" | "lunas" | "antre";

const day = (d: string) => format(new Date(`${d.slice(0, 10)}T00:00:00`), "d MMM yyyy", { locale: localeId });

const COMMISSION_TEXT: Record<AgentJamaah["commission_status"], (j: AgentJamaah) => string | null> = {
  earned: (j) => `Komisi ${rupiah(j.commission_amount)} sudah masuk saldo`,
  waiting: (j) => `Komisi ${rupiah(j.commission_amount)} masuk saat jamaah lunas`,
  none: () => null,
};

function JamaahCard({ j }: { j: AgentJamaah }) {
  const progress = j.agreed_price > 0 ? Math.min(100, Math.round((j.paid_verified / j.agreed_price) * 100)) : 0;
  const commission = COMMISSION_TEXT[j.commission_status](j);
  const chase = needsPayment(j) && !!j.phone;
  return (
    <li className={`rounded-lg border bg-card p-4 ${j.pay_state === "batal" ? "text-muted-foreground" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold">{j.full_name}</p>
          <p className="text-[13px] text-muted-foreground">{j.package_name} · berangkat {day(j.departure_date)}</p>
        </div>
        <Badge variant="outline" className={`shrink-0 whitespace-nowrap ${AGENT_STATE_CLASS[j.pay_state]}`}>{AGENT_STATE_LABEL[j.pay_state]}</Badge>
      </div>

      {j.pay_state !== "batal" && (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Terbayar ${progress} persen`}>
            <div className="h-full rounded-full bg-status-ok-fg/70" style={{ width: `${progress}%` }} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[13px] text-muted-foreground">Sudah masuk</dt>
              <dd className="font-semibold">{rupiah(j.paid_verified)}</dd>
              {j.paid_pending > 0 && <dd className="text-[13px] text-status-warn-text">+{rupiah(j.paid_pending)} menunggu verifikasi</dd>}
            </div>
            <div>
              <dt className="text-[13px] text-muted-foreground">Sisa tagihan</dt>
              <dd className="font-semibold">{rupiah(Math.max(0, j.outstanding))}</dd>
              <dd className="text-[13px] text-muted-foreground">dari {rupiah(j.agreed_price)}{needsPayment(j) ? `, ${deadlineText(j.due_date)}` : ""}</dd>
            </div>
          </dl>
        </>
      )}
      {commission && <p className="mt-3 text-[13px] text-muted-foreground">{commission}</p>}
      {chase && (
        <Button type="button" variant="outline" className={`mt-3 gap-2 ${TOUCH_H}`} asChild>
          <a
            href={reminderWhatsAppUrl({ phone: j.phone, name: j.full_name, packageName: j.package_name, departureDate: j.departure_date, outstanding: j.outstanding, dueDate: j.due_date })}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="h-4 w-4" aria-hidden /> Ingatkan lewat WhatsApp
          </a>
        </Button>
      )}
    </li>
  );
}

/** The jamaah this agent brought in: who has paid, who still owes, and what commission is coming. */
export default function AgentMyJamaah() {
  const jamaah = useAgentJamaah();
  const intakes = useAgentIntakes();
  const [tab, setTab] = useState<Tab>("semua");

  const list = useMemo(() => [...(jamaah.data ?? [])].sort((a, b) => (needsPayment(a) === needsPayment(b) ? 0 : needsPayment(a) ? -1 : 1) || byUrgency(a, b)), [jamaah.data]);
  const active = list.filter((j) => j.pay_state !== "batal");
  const owing = list.filter(needsPayment);
  const waiting = (intakes.data ?? []).filter((i) => i.status === "new");
  const shown = tab === "semua" ? list : list.filter((j) => j.pay_state === tab);
  const totals = useMemo(
    () => ({
      outstanding: owing.reduce((s, j) => s + Math.max(0, j.outstanding), 0),
      held: list.filter((j) => j.commission_status === "waiting").reduce((s, j) => s + j.commission_amount, 0),
    }),
    [list, owing]
  );
  const count = (s: string) => list.filter((j) => j.pay_state === s).length;

  return (
    <div className="space-y-6">
      <AgentPageHeader
        title="Jamaah Saya"
        description="Jamaah yang kamu daftarkan: siapa yang sudah bayar, siapa yang masih kurang, dan komisi yang akan masuk."
        icon={Users}
        action={<Button asChild className="h-11 gap-2"><Link to="/agent/daftar-jamaah"><UserPlus className="h-4 w-4" aria-hidden /> Daftarkan jamaah</Link></Button>}
      />

      {jamaah.error && <LoadError what="Daftar jamaah" error={jamaah.error} onRetry={() => jamaah.refetch()} retrying={jamaah.isFetching} />}

      {!jamaah.error && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Jamaah aktif" value={String(active.length)} hint={`${count("lunas")} sudah lunas`} />
          <StatCard label="Belum lunas" value={String(owing.length)} hint={`Sisa ${juta(totals.outstanding)}`} />
          <StatCard label="Komisi menunggu" value={juta(totals.held)} hint="Masuk saat jamaah lunas" />
          <StatCard label="Menunggu CS" value={String(waiting.length)} hint="Pendaftaran belum dicek" />
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList aria-label="Filter jamaah" className="h-auto flex-wrap justify-start">
          <TabsTrigger value="semua" className={TOUCH_H}>Semua ({list.length})</TabsTrigger>
          <TabsTrigger value="belum_dp" className={TOUCH_H}>Belum DP ({count("belum_dp")})</TabsTrigger>
          <TabsTrigger value="dp" className={TOUCH_H}>Sudah DP ({count("dp")})</TabsTrigger>
          <TabsTrigger value="lunas" className={TOUCH_H}>Lunas ({count("lunas")})</TabsTrigger>
          <TabsTrigger value="antre" className={TOUCH_H}>Menunggu CS ({waiting.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "antre" ? (
        intakes.isPending ? (
          <div className="flex justify-center rounded-lg border py-10" role="status" aria-label="Memuat"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : intakes.error ? (
          <LoadError what="Daftar pendaftaran" error={intakes.error} onRetry={() => intakes.refetch()} retrying={intakes.isFetching} />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Pendaftaran yang kamu kirim dan belum selesai dicek CS. Setelah diterima, orangnya muncul di tab lain.</p>
            {(intakes.data ?? []).length === 0 ? (
              <p className="rounded-lg border py-10 text-center text-sm text-muted-foreground">Belum ada pendaftaran yang kamu kirim.</p>
            ) : (
              <ul className="space-y-3">
                {(intakes.data ?? []).map((i) => (
                  <li key={i.code} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4">
                    <div className="min-w-0">
                      <p className="font-semibold">{i.contact_name} <span className="font-normal text-muted-foreground">· {i.code}</span></p>
                      <p className="text-[13px] text-muted-foreground">{i.package_name} · berangkat {day(i.departure_date)}</p>
                      <p className="text-[13px] text-muted-foreground">{i.people_count} orang · dikirim {format(new Date(i.created_at), "d MMM yyyy, HH:mm", { locale: localeId })}</p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 whitespace-nowrap ${i.status === "accepted" ? STATUS_BADGE.ok : i.status === "rejected" ? STATUS_BADGE.bad : STATUS_BADGE.warn}`}>
                      {i.status === "accepted" ? "Diterima" : i.status === "rejected" ? "Ditolak" : "Menunggu CS"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </>
        )
      ) : jamaah.isPending ? (
        <div className="flex justify-center rounded-lg border py-10" role="status" aria-label="Memuat"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : shown.length === 0 && !jamaah.error ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border py-10 text-center">
          <Users className="h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="max-w-sm text-sm text-muted-foreground">
            {list.length === 0 ? "Belum ada jamaah atas namamu. Daftarkan jamaah pertamamu, atau kirim link pendaftaran supaya jamaah mengisi sendiri." : "Tidak ada jamaah di kategori ini."}
          </p>
          {list.length === 0 && <Button asChild className="h-11"><Link to="/agent/daftar-jamaah">Daftarkan jamaah</Link></Button>}
        </div>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2" aria-label="Daftar jamaah">
          {shown.map((j) => <JamaahCard key={j.registration_id} j={j} />)}
        </ul>
      )}
    </div>
  );
}
