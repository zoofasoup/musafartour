import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, MessageCircle, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Turnstile, turnstileSiteKey } from "@/components/daftar/Turnstile";
import type { PublishedPackage } from "@/hooks/usePackages";
import { DP_MIN_PER_PAX, LUNAS_DAYS_BEFORE_DEPARTURE, juta, rupiah, roomPriceOf } from "@/lib/jamaah";
import { CHILD_PRICE, INFANT_PRICE } from "@/lib/roomCombos";
import { getSlotsRemaining } from "@/lib/utils";
import {
  CATEGORY_LABEL,
  MAX_PEOPLE,
  RELATIONS,
  checkForm,
  hasErrors,
  type Category,
  type FormErrors,
  type PersonDraft,
  type Room,
} from "@/lib/intakeForm";

export interface SubmitPayload {
  slug: string;
  contact_name: string;
  contact_phone: string;
  contact_city: string;
  contact_attending: boolean;
  pay_together: boolean;
  ref: string | null;
  heard_from: string;
  notes: string;
  consent: true;
  website: string;
  turnstile_token: string | null;
  people: { full_name: string; gender: string; category: Category; room_type: Room | null; relation: string }[];
}

interface Props {
  pkg: PublishedPackage;
  refCode: string | null;
  /** Sends the form. Throws an Error whose message is shown as is (it is already plain language). */
  submit: (payload: SubmitPayload) => Promise<{ code: string }>;
  whatsappUrl: (message: string) => string;
  /** Set when an agent registers their own jamaah from the agent portal: no Turnstile, and the success view points back to the portal. */
  agent?: { name: string; onAnother: () => void };
  onSubmitted?: (info: { code: string; people: number; value: number }) => void;
}

const ROOMS: { value: Room; label: string; hint: string }[] = [
  { value: "quad", label: "Quad", hint: "Ber-4" },
  { value: "triple", label: "Triple", hint: "Ber-3" },
  { value: "double", label: "Double", hint: "Ber-2" },
];

const blankPerson = (room: Room, relation = ""): PersonDraft => ({
  key: crypto.randomUUID(),
  name: "",
  nameTouched: false,
  gender: "",
  category: "adult",
  room,
  relation,
});

const fmtDate = (d: string) =>
  new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" data-error className="mt-1.5 flex items-center gap-1.5 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> {message}
    </p>
  );
}

export function RegistrationForm({ pkg, refCode, submit, whatsappUrl, agent, onSubmitted }: Props) {
  const defaultRoom: Room = "quad";
  const [contact, setContact] = useState({ name: "", phone: "", city: "" });
  const [attending, setAttending] = useState(true);
  const [people, setPeople] = useState<PersonDraft[]>([blankPerson(defaultRoom, "Diri sendiri")]);
  const [payTogether, setPayTogether] = useState(true);
  const [heardFrom, setHeardFrom] = useState("");
  const [notes, setNotes] = useState("");
  const [consentData, setConsentData] = useState(false);
  const [consentPay, setConsentPay] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({ people: {} });
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ code: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const needTurnstile = !agent;
  const siteKeyMissing = needTurnstile && !turnstileSiteKey();

  // The first person is the contact until the contact says someone else is travelling.
  useEffect(() => {
    if (!attending) return;
    setPeople((all) => all.map((p, i) => (i === 0 && !p.nameTouched ? { ...p, name: contact.name } : p)));
  }, [contact.name, attending]);

  const setPerson = (key: string, patch: Partial<PersonDraft>) => setPeople((all) => all.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const toggleAttending = (on: boolean) => {
    setAttending(on);
    setPeople((all) =>
      all.map((p, i) => (i === 0 ? { ...p, name: on ? contact.name : "", nameTouched: false, relation: on ? "Diri sendiri" : "" } : p))
    );
  };

  const addPerson = () =>
    setPeople((all) => (all.length >= MAX_PEOPLE ? all : [...all, blankPerson(all[all.length - 1]?.room ?? defaultRoom)]));
  const removePerson = (key: string) => setPeople((all) => (all.length > 1 ? all.filter((p) => p.key !== key) : all));

  const seatsLeft = pkg.slots_total ? getSlotsRemaining(pkg) : null;
  const money = useMemo(() => {
    let total = 0;
    let adults = 0;
    let setByCs = 0;
    for (const p of people) {
      if (p.category === "adult") {
        adults++;
        total += roomPriceOf(pkg, p.room);
      } else {
        setByCs++;
        total += p.category === "child_nobed" ? CHILD_PRICE : INFANT_PRICE;
      }
    }
    return { total, adults, setByCs, dp: adults * DP_MIN_PER_PAX };
  }, [people, pkg]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const found = checkForm(contact, people, consentData, consentPay, needTurnstile, !!token);
    setErrors(found);
    if (hasErrors(found)) {
      requestAnimationFrame(() => {
        // Move focus to the first field that is wrong so a keyboard or screen reader lands there too.
        const field = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        (field ?? formRef.current?.querySelector<HTMLElement>("[data-error]"))?.scrollIntoView({ block: "center", behavior: "smooth" });
        field?.focus({ preventScroll: true });
      });
      return;
    }
    setSending(true);
    try {
      const result = await submit({
        slug: pkg.slug ?? "",
        contact_name: contact.name.trim(),
        contact_phone: contact.phone.trim(),
        contact_city: contact.city.trim(),
        contact_attending: attending,
        pay_together: payTogether && people.length > 1,
        ref: refCode,
        heard_from: refCode ? "" : heardFrom.trim(),
        notes: notes.trim(),
        consent: true,
        website: honeypot,
        turnstile_token: token,
        people: people.map((p) => ({
          full_name: p.name.trim(),
          gender: p.gender,
          category: p.category,
          room_type: p.category === "adult" ? p.room : null,
          relation: p.relation,
        })),
      });
      setDone(result);
      onSubmitted?.({ code: result.code, people: people.length, value: money.total });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setServerError((err as Error).message || "Pendaftaran belum bisa dikirim. Coba lagi.");
      setToken(null);
      setResetKey((k) => k + 1); // a used Turnstile token cannot be sent twice
    } finally {
      setSending(false);
    }
  };

  if (done && agent) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-center shadow-sm sm:p-8" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-status-ok-text" aria-hidden />
        <h2 className="mt-4 text-2xl font-bold">Pendaftaran terkirim</h2>
        <p className="mt-2 text-muted-foreground">{people.length} orang atas nama {contact.name.trim()} sudah masuk antrean CS.</p>
        <div className="mx-auto mt-6 max-w-xs rounded-xl bg-muted px-4 py-3">
          <p className="text-sm text-muted-foreground">Kode pendaftaran</p>
          <p className="text-2xl font-bold tracking-wider">{done.code}</p>
        </div>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          CS akan mengecek seat dan menghubungi jamaah lewat WhatsApp. Pantau statusnya di daftar "Pendaftaran saya". Komisi dihitung setelah jamaah lunas.
        </p>
        <Button variant="brand" type="button" className="mt-6 h-12 px-6 text-base font-bold" onClick={agent.onAnother}>Daftarkan jamaah lain</Button>
      </div>
    );
  }

  if (done) {
    const first = people[0]?.name || contact.name;
    const message = `Halo Musafar Tour, saya sudah mengisi form pendaftaran umroh.\nKode: ${done.code}\nNama: ${contact.name}\nPaket: ${pkg.package_name}, berangkat ${fmtDate(pkg.departure_date)}\nJumlah peserta: ${people.length} orang`;
    return (
      <div className="rounded-2xl border bg-white p-6 text-center shadow-sm sm:p-8" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-status-ok-text" aria-hidden />
        <h2 className="mt-4 text-2xl font-bold">Pendaftaran terkirim</h2>
        <p className="mt-2 text-muted-foreground">Terima kasih, {contact.name.split(" ")[0]}. Tim kami akan menghubungi lewat WhatsApp di nomor yang kamu isi.</p>
        <div className="mx-auto mt-6 max-w-xs rounded-xl bg-muted px-4 py-3">
          <p className="text-sm text-muted-foreground">Kode pendaftaran</p>
          <p className="text-2xl font-bold tracking-wider">{done.code}</p>
        </div>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">Simpan kode ini. Sebut kode saat menghubungi CS supaya data {first} mudah ditemukan.</p>
        <ol className="mx-auto mt-6 max-w-md space-y-2 text-left text-sm">
          <li><span className="font-semibold">1.</span> CS mengecek data dan seat, lalu menghubungi kamu lewat WhatsApp.</li>
          <li><span className="font-semibold">2.</span> Kamu transfer DP {juta(DP_MIN_PER_PAX)} per orang ke rekening PT Musa Amanah Wisata.</li>
          <li><span className="font-semibold">3.</span> Setelah DP, kamu mendapat link untuk melengkapi data paspor dan dokumen.</li>
        </ol>
        <Button variant="brand" asChild className="mt-6 h-12 gap-2 px-6 text-base font-bold">
          <a href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-5 w-5" aria-hidden /> Chat CS sekarang
          </a>
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-6">
      {seatsLeft !== null && seatsLeft <= people.length && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {seatsLeft === 0
              ? "Paket ini sudah penuh. Pendaftaranmu tetap kami terima dan masuk daftar tunggu."
              : `Sisa seat tinggal ${seatsLeft}. Pendaftaranmu tetap kami terima, dan CS akan menghubungi bila seat belum cukup.`}
          </AlertDescription>
        </Alert>
      )}

      {/* 1. Contact */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="sec-kontak">
        <h2 id="sec-kontak" className="text-lg font-bold">{agent ? "1. Kontak jamaah" : "1. Siapa yang bisa kami hubungi?"}</h2>
        {agent && <p className="mt-1 text-sm text-muted-foreground">Isi data jamaah yang kamu daftarkan, bukan datamu sebagai agen. CS akan menghubungi nomor ini.</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="contact-name">{agent ? "Nama jamaah (atau kepala keluarga)" : "Nama kamu"}</Label>
            <Input id="contact-name" autoComplete={agent ? "off" : "name"} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} aria-invalid={!!errors.contactName} aria-describedby={errors.contactName ? "contact-name-err" : undefined} className="mt-1.5" />
            <FieldError id="contact-name-err" message={errors.contactName} />
          </div>
          <div>
            <Label htmlFor="contact-phone">{agent ? "Nomor WhatsApp jamaah" : "Nomor WhatsApp"}</Label>
            <Input id="contact-phone" type="tel" inputMode="tel" autoComplete={agent ? "off" : "tel"} placeholder="0812 3456 7890" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} aria-invalid={!!errors.contactPhone} aria-describedby={errors.contactPhone ? "contact-phone-err" : undefined} className="mt-1.5" />
            <FieldError id="contact-phone-err" message={errors.contactPhone} />
          </div>
          <div>
            <Label htmlFor="contact-city">{agent ? "Kota tempat tinggal jamaah" : "Kota tempat tinggal"} <span className="font-normal text-muted-foreground">(opsional)</span></Label>
            <Input id="contact-city" autoComplete={agent ? "off" : "address-level2"} value={contact.city} onChange={(e) => setContact({ ...contact, city: e.target.value })} className="mt-1.5" />
          </div>
        </div>
        <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <Checkbox checked={attending} onCheckedChange={(c) => toggleAttending(!!c)} />
          {agent ? "Orang ini ikut berangkat" : "Saya sendiri ikut berangkat"}
        </label>
        {agent ? (
          <p className="mt-3 text-sm text-muted-foreground">Pendaftaran ini dicatat atas nama kamu sebagai agen (kode <span className="font-medium text-foreground">{refCode}</span>). Isi data jamaah yang mau kamu daftarkan.</p>
        ) : (
          refCode && <p className="mt-3 text-sm text-muted-foreground">Kamu mendaftar lewat agen resmi Musafar (kode <span className="font-medium text-foreground">{refCode}</span>).</p>
        )}
      </section>

      {/* 2. People */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="sec-peserta">
        <h2 id="sec-peserta" className="text-lg font-bold">2. Siapa saja yang berangkat?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tulis nama persis seperti di paspor. Kalau paspor belum ada, tulis nama di KTP.</p>

        <ul className="mt-4 space-y-4">
          {people.map((p, i) => {
            const err = errors.people[p.key];
            const nameId = `p-${p.key}-name`;
            return (
              <li key={p.key} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Peserta {i + 1}{i === 0 && attending ? (agent ? " (kontak di atas)" : " (kamu)") : ""}</p>
                  {(i > 0 || (!attending && people.length > 1)) && (
                    <Button type="button" variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={() => removePerson(p.key)}>
                      <Trash2 className="h-4 w-4" aria-hidden /> Hapus
                    </Button>
                  )}
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor={nameId}>Nama sesuai paspor</Label>
                    <Input id={nameId} value={p.name} onChange={(e) => setPerson(p.key, { name: e.target.value, nameTouched: true })} aria-invalid={!!err?.name} aria-describedby={err?.name ? `${nameId}-err` : undefined} className="mt-1.5" />
                    <FieldError id={`${nameId}-err`} message={err?.name} />
                  </div>
                  <div>
                    <Label id={`${nameId}-g`}>Jenis kelamin</Label>
                    <RadioGroup value={p.gender} onValueChange={(v) => setPerson(p.key, { gender: v as "L" | "P" })} className="mt-2 flex gap-3" aria-labelledby={`${nameId}-g`}>
                      {[["L", "Laki-laki"], ["P", "Perempuan"]].map(([v, label]) => (
                        <Label key={v} htmlFor={`${nameId}-g-${v}`} className="flex min-h-11 flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted">
                          <RadioGroupItem id={`${nameId}-g-${v}`} value={v} /> {label}
                        </Label>
                      ))}
                    </RadioGroup>
                    <FieldError id={`${nameId}-g-err`} message={err?.gender} />
                  </div>
                  <div>
                    <Label htmlFor={`${nameId}-rel`}>{agent ? "Hubungan dengan kontak" : "Hubungan dengan kamu"} <span className="font-normal text-muted-foreground">(opsional)</span></Label>
                    <Select value={p.relation || "none"} onValueChange={(v) => setPerson(p.key, { relation: v === "none" ? "" : v })}>
                      <SelectTrigger id={`${nameId}-rel`} className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Tidak diisi</SelectItem>
                        {RELATIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor={`${nameId}-cat`}>Jenis peserta</Label>
                    <Select value={p.category} onValueChange={(v) => setPerson(p.key, { category: v as Category })}>
                      <SelectTrigger id={`${nameId}-cat`} className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {p.category === "adult" ? (
                    <div className="sm:col-span-2">
                      <Label id={`${nameId}-r`}>Tipe kamar</Label>
                      <RadioGroup value={p.room} onValueChange={(v) => setPerson(p.key, { room: v as Room })} className="mt-2 grid grid-cols-3 gap-2" aria-labelledby={`${nameId}-r`}>
                        {ROOMS.map((r) => (
                          <Label key={r.value} htmlFor={`${nameId}-r-${r.value}`} className="flex min-h-[4.5rem] cursor-pointer flex-col items-start justify-center gap-0.5 rounded-lg border px-3 py-2 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted">
                            <span className="flex items-center gap-2 font-semibold"><RadioGroupItem id={`${nameId}-r-${r.value}`} value={r.value} /> {r.label}</span>
                            <span className="text-[13px] text-muted-foreground">{r.hint} · {juta(roomPriceOf(pkg, r.value))}</span>
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground sm:col-span-2">
                      Harga {p.category === "child_nobed" ? "anak (Non bed)" : "bayi"} sekitar {juta(p.category === "child_nobed" ? CHILD_PRICE : INFANT_PRICE)}. CS akan mengonfirmasi harga pastinya.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {people.length < MAX_PEOPLE ? (
          <Button type="button" variant="outline" className="mt-4 h-11 gap-2" onClick={addPerson}>
            <Plus className="h-4 w-4" aria-hidden /> Tambah anggota
          </Button>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Maksimal {MAX_PEOPLE} orang per pendaftaran. Untuk rombongan lebih besar, hubungi CS.</p>
        )}

        {people.length > 1 && (
          <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 text-sm">
            <Checkbox className="mt-0.5" checked={payTogether} onCheckedChange={(c) => setPayTogether(!!c)} />
            <span>{agent ? "Jamaah membayar bersama" : "Kami membayar bersama"} (satu transfer untuk semua). Pembayaran akan dibagi rata ke tiap peserta.</span>
          </label>
        )}
      </section>

      {/* 3. Money */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="sec-biaya">
        <h2 id="sec-biaya" className="text-lg font-bold">3. Perkiraan biaya</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{pkg.package_name} · {people.length} orang</dt><dd className="text-base font-bold">{rupiah(money.total)}</dd></div>
          {money.adults > 0 && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">DP minimal ({money.adults} dewasa × {juta(DP_MIN_PER_PAX)})</dt><dd className="font-semibold">{rupiah(money.dp)}</dd></div>}
        </dl>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Pelunasan paling lambat H-{LUNAS_DAYS_BEFORE_DEPARTURE} sebelum berangkat. Cicilan boleh kapan saja.</li>
          <li>Semua pembayaran hanya ke rekening PT Musa Amanah Wisata (BCA, BSI, BNI).</li>
          <li>Harga dapat menyesuaikan kenaikan kurs dollar dan maskapai.</li>
          {money.setByCs > 0 && <li>DP dan harga anak atau bayi dikonfirmasi CS.</li>}
        </ul>
      </section>

      {/* 4. Notes + consent */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="sec-catatan">
        <h2 id="sec-catatan" className="text-lg font-bold">4. Catatan dan persetujuan</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="notes">Catatan <span className="font-normal text-muted-foreground">(opsional: ingin sekamar dengan siapa, kebutuhan khusus)</span></Label>
            <Textarea id="notes" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" />
          </div>
          {!refCode && (
            <div>
              <Label htmlFor="heard">Tahu Musafar dari mana? <span className="font-normal text-muted-foreground">(opsional)</span></Label>
              <Input id="heard" maxLength={100} value={heardFrom} onChange={(e) => setHeardFrom(e.target.value)} className="mt-1.5" />
            </div>
          )}
          <div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
              <Checkbox className="mt-0.5" checked={consentData} onCheckedChange={(c) => setConsentData(!!c)} aria-invalid={!!errors.consentData} />
              <span>{agent ? "Jamaah sudah menyetujui data mereka dipakai Musafar Tour untuk memproses pendaftaran umroh ini." : "Saya setuju data saya dan peserta lain dipakai Musafar Tour untuk memproses pendaftaran umroh ini."}</span>
            </label>
            <FieldError id="consent-data-err" message={errors.consentData} />
          </div>
          <div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
              <Checkbox className="mt-0.5" checked={consentPay} onCheckedChange={(c) => setConsentPay(!!c)} aria-invalid={!!errors.consentPay} />
              <span>
                {agent ? "Jamaah sudah membaca dan menyetujui" : "Saya sudah membaca dan menyetujui"}{" "}
                <a href="/syarat-umroh" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">Term of Service</a>
                , termasuk DP Rp 5 jt yang tidak dapat dikembalikan, pelunasan paling lambat H-{LUNAS_DAYS_BEFORE_DEPARTURE}, dan pembayaran hanya ke rekening PT.
              </span>
            </label>
            <FieldError id="consent-pay-err" message={errors.consentPay} />
          </div>
        </div>

        {/* Honeypot: invisible to people, tempting to scripts. */}
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
          <label>Situs web<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label>
        </div>
      </section>

      <div className="space-y-3">
        {needTurnstile && (
          <>
            <Turnstile onToken={setToken} resetKey={resetKey} />
            <FieldError id="turnstile-err" message={errors.turnstile} />
          </>
        )}
        {serverError && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <Button variant="brand" type="submit" disabled={sending || siteKeyMissing} className="h-12 w-full text-base font-bold">
          {sending ? "Mengirim..." : "Kirim pendaftaran"}
        </Button>
        <p className="text-center text-[13px] text-muted-foreground">Mengirim form belum berarti seat terkunci. Seat dikonfirmasi CS setelah pendaftaranmu dicek.</p>
      </div>
    </form>
  );
}
