import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Inbox, Loader2, UserPlus, Users, Wallet } from "lucide-react";
import { AgentEmpty, AgentPage, AgentPanel, Chips, Figures, agentGlass, agentPrimary } from "@/components/agent/AgentPage";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import {
  AGENT_STATE_LABEL,
  byUrgency,
  deadlineText,
  needsPayment,
  useAgentIntakes,
  useAgentJamaah,
  type AgentJamaah,
} from "@/hooks/useAgentJamaah";
import { juta, reminderWhatsAppUrl, rupiah } from "@/lib/jamaah";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

type Tab = "semua" | "belum_dp" | "dp" | "lunas" | "antre";

const day = (d: string) => format(new Date(`${d.slice(0, 10)}T00:00:00`), "d MMM yyyy", { locale: localeId });

const COMMISSION_TEXT: Record<AgentJamaah["commission_status"], (j: AgentJamaah) => string | null> = {
  earned: (j) => `Komisi ${rupiah(j.commission_amount)} masuk saldo`,
  waiting: (j) => `Komisi ${rupiah(j.commission_amount)} menunggu`,
  none: () => null,
};

function JamaahRow({ j }: { j: AgentJamaah }) {
  const progress = j.agreed_price > 0 ? Math.min(100, Math.round((j.paid_verified / j.agreed_price) * 100)) : 0;
  const commission = COMMISSION_TEXT[j.commission_status](j);
  const chase = needsPayment(j) && !!j.phone;
  return (
    <li className={`py-6 ${j.pay_state === "batal" ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[19px] leading-tight text-pkg-fg">{j.full_name}</p>
          <p className="mt-1 text-[14px] text-pkg-fg-3">{j.package_name} · berangkat {day(j.departure_date)}</p>
        </div>
        <span className="pkg-label shrink-0 rounded-full bg-pkg-cream-2 px-3 py-1 text-[13px] text-pkg-fg">{AGENT_STATE_LABEL[j.pay_state]}</span>
      </div>

      {j.pay_state !== "batal" && (
        <>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-pkg-hair" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Terbayar ${progress} persen`}>
            <div className="h-full rounded-full bg-pkg-red" style={{ width: `${progress}%` }} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-[13px] text-pkg-fg-3">Sudah masuk</dt>
              <dd className="mt-0.5 text-[17px] text-pkg-fg">{rupiah(j.paid_verified)}</dd>
              {j.paid_pending > 0 && <dd className="text-[13px] text-pkg-fg-3">+{rupiah(j.paid_pending)} menunggu verifikasi</dd>}
            </div>
            <div>
              <dt className="text-[13px] text-pkg-fg-3">Sisa tagihan</dt>
              <dd className="mt-0.5 text-[17px] text-pkg-fg">{rupiah(Math.max(0, j.outstanding))}</dd>
              <dd className="text-[13px] text-pkg-fg-3">{needsPayment(j) ? deadlineText(j.due_date) : `dari ${rupiah(j.agreed_price)}`}</dd>
            </div>
          </dl>
        </>
      )}
      {commission && <p className="mt-4 flex items-center gap-2 text-[14px] text-pkg-fg-3"><Wallet className="h-4 w-4 shrink-0" aria-hidden />{commission}</p>}
      {chase && (
        <a
          className={`${agentGlass} mt-4`}
          href={reminderWhatsAppUrl({ phone: j.phone, name: j.full_name, packageName: j.package_name, departureDate: j.departure_date, outstanding: j.outstanding, dueDate: j.due_date })}
          target="_blank"
          rel="noopener noreferrer"
        >
          <WhatsAppIcon className="h-5 w-5" /> Ingatkan
        </a>
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
    <AgentPage
      title="Jamaah saya."
      hero={
        <>
          {!jamaah.error && (
            <Figures
              items={[
                { value: String(active.length), label: "Aktif", note: `${count("lunas")} lunas` },
                { value: String(owing.length), label: "Belum lunas", note: `Sisa ${juta(totals.outstanding)}` },
                { value: juta(totals.held), label: "Komisi menunggu", note: "Perkiraan" },
              ]}
            />
          )}
          <Link to="/agent/daftar-jamaah" className={`${agentPrimary} mt-8`}>
            <UserPlus className="h-5 w-5" aria-hidden /> Daftarkan jamaah
          </Link>
        </>
      }
    >
      <AgentPanel last>
        {jamaah.error && <LoadError what="Daftar jamaah" error={jamaah.error} onRetry={() => jamaah.refetch()} retrying={jamaah.isFetching} />}

        <Chips<Tab>
          label="Filter jamaah"
          value={tab}
          onChange={setTab}
          options={[
            { value: "semua", label: `Semua ${list.length}` },
            { value: "belum_dp", label: `Belum DP ${count("belum_dp")}` },
            { value: "dp", label: `Sudah DP ${count("dp")}` },
            { value: "lunas", label: `Lunas ${count("lunas")}` },
            { value: "antre", label: `Menunggu UC ${waiting.length}` },
          ]}
        />

        {tab === "antre" ? (
          intakes.isPending ? (
            <div className="flex justify-center py-12" role="status" aria-label="Memuat"><Loader2 className="h-5 w-5 animate-spin text-pkg-fg-3" /></div>
          ) : intakes.error ? (
            <LoadError what="Daftar pendaftaran" error={intakes.error} onRetry={() => intakes.refetch()} retrying={intakes.isFetching} />
          ) : (intakes.data ?? []).length === 0 ? (
            <AgentEmpty icon={Inbox} text="Belum ada pendaftaran" />
          ) : (
            <ul className="mt-2 divide-y divide-pkg-hair">
              {(intakes.data ?? []).map((i) => (
                <li key={i.code} className="flex items-start justify-between gap-3 py-6">
                  <div className="min-w-0">
                    <p className="text-[19px] leading-tight text-pkg-fg">{i.contact_name}</p>
                    <p className="mt-1 text-[14px] text-pkg-fg-3">{i.code} · {i.package_name}</p>
                    <p className="text-[14px] text-pkg-fg-3">Berangkat {day(i.departure_date)} · {i.people_count} orang</p>
                    <p className="text-[13px] text-pkg-fg-3">Dikirim {format(new Date(i.created_at), "d MMM yyyy, HH:mm", { locale: localeId })}</p>
                  </div>
                  <span className={`pkg-label shrink-0 rounded-full bg-pkg-cream-2 px-3 py-1 text-[13px] ${i.status === "rejected" ? "text-pkg-red-deep" : "text-pkg-fg"}`}>
                    {i.status === "accepted" ? "Diterima" : i.status === "rejected" ? "Ditolak" : "Menunggu UC"}
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : jamaah.isPending ? (
          <div className="flex justify-center py-12" role="status" aria-label="Memuat"><Loader2 className="h-5 w-5 animate-spin text-pkg-fg-3" /></div>
        ) : shown.length === 0 && !jamaah.error ? (
          <AgentEmpty icon={Users} text={list.length === 0 ? "Belum ada jamaah" : "Tidak ada di sini"} />
        ) : (
          <ul className="mt-2 divide-y divide-pkg-hair" aria-label="Daftar jamaah">
            {shown.map((j) => <JamaahRow key={j.registration_id} j={j} />)}
          </ul>
        )}
      </AgentPanel>
    </AgentPage>
  );
}
