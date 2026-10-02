import { useMemo, useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Inbox, Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { JamaahViewSwitch } from "@/components/admin/jamaah/JamaahViewSwitch";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { TOUCH_H } from "@/components/admin/jamaah/touch";
import { DP_MIN_PER_PAX, PT_ACCOUNTS, PT_ACCOUNT_HOLDER, ROOM_SHORT, STATUS_BADGE, rupiah } from "@/lib/jamaah";
import { packageRoomPrice, useAgentOptions, useInvalidateJamaah, useJamaahPackages, type JamaahPackage } from "@/hooks/useJamaah";
import { useIntakes, useKnownJamaah, type Intake, type IntakePerson, type IntakeStatus, type KnownJamaah } from "@/hooks/useJamaahIntake";

/** Prices used when the package has none for a child without a bed or an infant. Laily can change them per person. */
const FALLBACK_PRICE: Record<string, number> = { non_bed: 25_000_000, infant: 15_000_000 };
const ROOMS = ["quad", "triple", "double", "non_bed", "infant"] as const;

const priceFor = (pkg: JamaahPackage | undefined, room: string) => packageRoomPrice(pkg, room) || FALLBACK_PRICE[room] || 0;
const stamp = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm", { locale: localeId });
const normName = (v: string) => v.toLowerCase().replace(/\s+/g, " ").trim();

interface Flags {
  duplicate: string[];
  seat: "ok" | "short" | "full";
  left: number | null;
}

/** What Laily should look at before pressing Terima. */
function flagsFor(intake: Intake, pkg: JamaahPackage | undefined, known: KnownJamaah[]): Flags {
  const here = known.filter((k) => k.package_id === intake.package_id);
  const duplicate = intake.jamaah_intake_people.filter((p) => here.some((k) => normName(k.full_name) === normName(p.full_name))).map((p) => p.full_name);
  let left: number | null = null;
  if (pkg?.slots_total != null) left = pkg.slots_total - (pkg.seat_source === "website" ? pkg.slots_registered : pkg.slots_filled ?? 0);
  const n = intake.jamaah_intake_people.length;
  const seat = left == null ? "ok" : left <= 0 ? "full" : left < n ? "short" : "ok";
  return { duplicate, seat, left };
}

/** The private stage-2 link of an accepted registration. Anyone holding it can fill in that registration's data. */
const manifestLink = (intake: Intake) => `${window.location.origin}/lengkapi/${intake.manifest_token}`;

function whatsappUrl(intake: Intake, pkg: JamaahPackage | undefined, accepted: boolean) {
  const accounts = PT_ACCOUNTS.map((a) => `${a.code} ${a.number}`).join(" / ");
  const text = accepted
    ? `Assalamu'alaikum ${intake.contact_name},\n\nPendaftaran ${intake.code} untuk paket *${pkg?.package_name ?? ""}* sudah kami terima. ` +
      `Untuk mengamankan seat, mohon transfer DP minimal *${rupiah(DP_MIN_PER_PAX)} per orang* ke rekening ${PT_ACCOUNT_HOLDER}: ${accounts}.\n` +
      `Setelah transfer, kirim bukti transfer ke nomor ini.\n\n` +
      `Mohon lengkapi data paspor dan dokumen tiap peserta lewat link pribadi ini: ${manifestLink(intake)}\n` +
      `Jazakumullah khairan.`
    : `Assalamu'alaikum ${intake.contact_name},\n\nKami dari Musafar Tour, terkait pendaftaran ${intake.code}. `;
  return `https://wa.me/${intake.contact_phone}?text=${encodeURIComponent(text)}`;
}

interface DraftPerson extends IntakePerson {
  include: boolean;
  list_price: number;
}

function AcceptDialog({ intake, pkg, onClose, onDone }: { intake: Intake | null; pkg?: JamaahPackage; onClose: () => void; onDone: () => void }) {
  const [people, setPeople] = useState<DraftPerson[]>([]);
  const [force, setForce] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seatError, setSeatError] = useState(false);
  const [openFor, setOpenFor] = useState<string | null>(null);

  // Start from what the person typed whenever a different registration is opened.
  if (intake && openFor !== intake.id) {
    setOpenFor(intake.id);
    setPeople(intake.jamaah_intake_people.map((p) => ({ ...p, include: true, list_price: priceFor(pkg, p.room_type) })));
    setForce(false);
    setSeatError(false);
  }
  if (!intake && openFor) setOpenFor(null);

  const patch = (id: string, change: Partial<DraftPerson>) => setPeople((all) => all.map((p) => (p.id === id ? { ...p, ...change } : p)));
  const included = people.filter((p) => p.include);
  const total = included.reduce((s, p) => s + p.list_price, 0);
  const nameOk = included.every((p) => p.full_name.trim().length >= 2);

  const accept = async () => {
    if (!intake) return;
    setSaving(true);
    const { error } = await supabase.rpc("accept_jamaah_intake", {
      _intake_id: intake.id,
      _people: people.map((p) => ({ id: p.id, full_name: p.full_name.trim(), room_type: p.room_type, list_price: p.list_price, include: p.include })),
      _force: force,
    });
    setSaving(false);
    if (error) {
      if (/Seat tidak cukup/.test(error.message)) setSeatError(true);
      // The function's own messages are written for people; anything else is a technical error.
      toast.error(/^(Seat|Pendaftaran|Pilih)/.test(error.message) ? error.message : "Pendaftaran belum bisa diterima. Coba lagi.");
      return;
    }
    toast.success(`${included.length} jamaah masuk ke Data Jamaah.`);
    onDone();
  };

  return (
    <Dialog open={!!intake} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Terima pendaftaran {intake?.code}</DialogTitle>
          <DialogDescription>
            Periksa nama dan kamar. Jamaah dibuat dengan harga paket{intake?.pay_together && included.length > 1 ? ", dan menjadi satu keluarga." : "."}
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {people.map((p) => (
            <li key={p.id} className={`rounded-lg border p-3 ${p.include ? "" : "opacity-60"}`}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <Checkbox checked={p.include} onCheckedChange={(c) => patch(p.id, { include: !!c })} aria-label={`Terima ${p.full_name}`} />
                Terima orang ini
              </label>
              <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_9rem_9rem]">
                <Input value={p.full_name} onChange={(e) => patch(p.id, { full_name: e.target.value })} aria-label="Nama sesuai paspor" className={TOUCH_H} disabled={!p.include} />
                <Select value={p.room_type} onValueChange={(v) => patch(p.id, { room_type: v, list_price: priceFor(pkg, v) })} disabled={!p.include}>
                  <SelectTrigger aria-label="Tipe kamar" className={TOUCH_H}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOMS.map((r) => (
                      <SelectItem key={r} value={r}>{ROOM_SHORT[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  inputMode="numeric"
                  value={p.list_price ? String(p.list_price) : ""}
                  onChange={(e) => patch(p.id, { list_price: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                  aria-label="Harga"
                  className={TOUCH_H}
                  disabled={!p.include}
                />
              </div>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          {included.length} orang, total tagihan <span className="font-semibold text-foreground">{rupiah(total)}</span>
        </p>
        {seatError && (
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-status-warn-border bg-status-warn-bg p-3 text-sm text-status-warn-text">
            <Checkbox checked={force} onCheckedChange={(c) => setForce(!!c)} className="mt-0.5" />
            Seat paket ini tidak cukup. Centang untuk tetap menerima (seat jadi melebihi kuota).
          </label>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className={TOUCH_H} onClick={onClose} disabled={saving}>Batal</Button>
          <Button type="button" className={TOUCH_H} onClick={accept} disabled={saving || !included.length || !nameOk || (seatError && !force)}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Terima {included.length} orang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ intake, onClose, onDone }: { intake: Intake | null; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const reject = async () => {
    if (!intake) return;
    setSaving(true);
    const { error } = await supabase.rpc("reject_jamaah_intake", { _intake_id: intake.id, _reason: reason });
    setSaving(false);
    if (error) return toast.error("Pendaftaran belum bisa ditolak. Coba lagi.");
    setReason("");
    toast.success("Pendaftaran ditolak.");
    onDone();
  };
  return (
    <Dialog open={!!intake} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tolak pendaftaran {intake?.code}</DialogTitle>
          <DialogDescription>Alasan disimpan untuk catatan tim. Jamaah tidak dikabari otomatis.</DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: data dobel, salah paket, seat penuh" rows={3} aria-label="Alasan penolakan" />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className={TOUCH_H} onClick={onClose} disabled={saving}>Batal</Button>
          <Button type="button" variant="destructiveSolid" className={TOUCH_H} onClick={reject} disabled={saving || !reason.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Tolak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Registrations that jamaah and agents sent themselves. Laily checks and accepts each with one click. */
export default function JamaahIntake() {
  const qc = useQueryClient();
  const invalidateJamaah = useInvalidateJamaah();
  const [status, setStatus] = useState<IntakeStatus>("new");
  const { data: intakes = [], isPending, error, refetch, isFetching } = useIntakes(status);
  const { data: packages = [] } = useJamaahPackages();
  const { data: agents = [] } = useAgentOptions();
  const packageIds = useMemo(() => [...new Set(intakes.map((i) => i.package_id))], [intakes]);
  const { data: known = [] } = useKnownJamaah(packageIds);
  const [accepting, setAccepting] = useState<Intake | null>(null);
  const [rejecting, setRejecting] = useState<Intake | null>(null);

  const pkgOf = (id: string) => packages.find((p) => p.id === id);
  const agentName = (id: string | null) => agents.find((a) => a.id === id)?.name;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["jamaah-intakes"] });
    invalidateJamaah();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Jamaah</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pendaftaran yang dikirim jamaah atau agen lewat form. Periksa, lalu terima.</p>
      </div>
      <JamaahViewSwitch active="masuk" />

      <Tabs value={status} onValueChange={(v) => setStatus(v as IntakeStatus)}>
        <TabsList aria-label="Status pendaftaran">
          <TabsTrigger value="new">Menunggu</TabsTrigger>
          <TabsTrigger value="accepted">Diterima</TabsTrigger>
          <TabsTrigger value="rejected">Ditolak</TabsTrigger>
        </TabsList>
      </Tabs>

      {error && <LoadError what="Pendaftaran masuk" error={error} onRetry={() => refetch()} retrying={isFetching} />}

      {isPending && !error && (
        <div className="flex justify-center rounded-lg border py-10" role="status" aria-label="Memuat">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isPending && !error && !intakes.length && (
        <div className="flex flex-col items-center gap-2 rounded-lg border py-10 text-center text-sm text-muted-foreground">
          <Inbox className="h-6 w-6" aria-hidden />
          {status === "new" ? "Belum ada pendaftaran yang menunggu." : status === "accepted" ? "Belum ada yang diterima." : "Belum ada yang ditolak."}
        </div>
      )}

      <ul className="space-y-4">
        {intakes.map((intake) => {
          const pkg = pkgOf(intake.package_id);
          const flags = flagsFor(intake, pkg, known);
          const by = agentName(intake.agent_id);
          return (
            <li key={intake.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold">
                    {intake.contact_name} <span className="font-normal text-muted-foreground">· {intake.code}</span>
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {[`+${intake.contact_phone}`, intake.contact_city, stamp(intake.created_at)].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {pkg ? `${format(new Date(`${pkg.departure_date.slice(0, 10)}T00:00:00`), "d MMM yyyy", { locale: localeId })} · ${pkg.package_name}` : "Paket tidak ditemukan"}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {by ? `Agen ${by}` : intake.heard_from ? `Tahu dari: ${intake.heard_from}` : intake.ref_code ? `Kode referral ${intake.ref_code}` : "Tanpa agen"}
                    {intake.source === "agent" ? " · lewat portal agen" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {flags.duplicate.length > 0 && <Badge variant="outline" className={STATUS_BADGE.warn}>Mungkin sudah terdaftar</Badge>}
                  {flags.seat === "full" && <Badge variant="outline" className={STATUS_BADGE.bad}>Daftar tunggu</Badge>}
                  {flags.seat === "short" && <Badge variant="outline" className={STATUS_BADGE.warn}>Seat kurang (sisa {flags.left})</Badge>}
                  {intake.pay_together && intake.jamaah_intake_people.length > 1 && <Badge variant="outline" className={STATUS_BADGE.info}>Bayar bersama</Badge>}
                </div>
              </div>

              <ul className="mt-3 divide-y rounded-md border">
                {intake.jamaah_intake_people.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm">
                    <span className="font-medium">
                      {p.full_name}
                      {flags.duplicate.includes(p.full_name) && <span className="ml-2 text-[13px] font-normal text-status-warn-text">sudah ada di paket ini</span>}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {[p.gender === "L" ? "Laki-laki" : "Perempuan", ROOM_SHORT[p.room_type] ?? p.room_type, p.relation].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
              {!intake.contact_attending && <p className="mt-2 text-[13px] text-muted-foreground">Pendaftar sendiri tidak ikut berangkat.</p>}
              {intake.notes && <p className="mt-2 text-sm">Catatan: {intake.notes}</p>}
              {intake.reject_reason && <p className="mt-2 text-sm text-status-bad-text">Ditolak: {intake.reject_reason}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                {status === "accepted" && (
                  <Button
                    type="button"
                    variant="outline"
                    className={TOUCH_H}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(manifestLink(intake));
                        toast.success("Link lengkapi data disalin.");
                      } catch {
                        toast.error("Link belum bisa disalin. Coba lagi.");
                      }
                    }}
                  >
                    Salin link lengkapi data
                  </Button>
                )}
                {status === "new" && (
                  <>
                    <Button type="button" className={`${TOUCH_H} min-w-28`} onClick={() => setAccepting(intake)}>Terima</Button>
                    <Button type="button" variant="outline" className={TOUCH_H} onClick={() => setRejecting(intake)}>Tolak</Button>
                  </>
                )}
                <Button type="button" variant="outline" className={`${TOUCH_H} gap-2`} asChild>
                  <a href={whatsappUrl(intake, pkg, status === "accepted")} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    {status === "accepted" ? "Kirim info DP" : "WhatsApp"}
                  </a>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <AcceptDialog
        intake={accepting}
        pkg={accepting ? pkgOf(accepting.package_id) : undefined}
        onClose={() => setAccepting(null)}
        onDone={() => {
          setAccepting(null);
          refresh();
        }}
      />
      <RejectDialog
        intake={rejecting}
        onClose={() => setRejecting(null)}
        onDone={() => {
          setRejecting(null);
          refresh();
        }}
      />
    </div>
  );
}
