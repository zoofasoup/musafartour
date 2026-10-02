import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CalendarDays, Check, FileUp, Loader2, MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useHomepageData } from "@/hooks/useHomepageData";
import { ManifestError, loadManifest, saveFields, uploadDoc } from "@/lib/manifestApi";
import {
  BLOOD,
  EDUCATION,
  KIND_LABEL,
  LABEL,
  changes,
  docsMissing,
  draftOf,
  fieldProblem,
  isComplete,
  missing,
  passportWarning,
  requiredFields,
  type Draft,
  type FieldKey,
  type Manifest,
  type ManifestPerson,
} from "@/lib/manifestForm";
import { formatWhatsAppUrl } from "@/lib/utils";

const FALLBACK_WHATSAPP = "6281917403797";
const fmtDate = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

function Field({ k, draft, set, p, hint, children }: { k: FieldKey; draft: Draft; set: (k: FieldKey, v: string) => void; p: ManifestPerson; hint?: string; children?: React.ReactNode }) {
  const id = `${p.id}-${k}`;
  const problem = fieldProblem(k, draft[k]);
  const required = requiredFields(p).includes(k);
  return (
    <div>
      <Label htmlFor={id}>
        {LABEL[k]} {!required && <span className="font-normal text-muted-foreground">(opsional)</span>}
      </Label>
      {children ?? <Input id={id} value={draft[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={!!problem} aria-describedby={problem ? `${id}-err` : undefined} className="mt-1.5" />}
      {hint && !problem && <p className="mt-1 text-[13px] text-muted-foreground">{hint}</p>}
      {problem && (
        <p id={`${id}-err`} role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> {problem}
        </p>
      )}
    </div>
  );
}

function DocRow({ kind, has, label, token, personId, onDone }: { kind: "ktp" | "passport" | "photo"; has: boolean; label: string; token: string; personId: string; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className={`text-[13px] ${has ? "text-status-ok-text" : "text-muted-foreground"}`}>
            {has ? <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" aria-hidden /> Sudah diunggah</span> : "Belum ada"}
          </p>
        </div>
        <Button type="button" variant="outline" className="h-11 shrink-0 gap-2" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileUp className="h-4 w-4" aria-hidden />}
          {has ? "Ganti" : "Unggah"}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="hidden"
          aria-label={`Unggah ${label}`}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError(null);
            if (file.size > 10 * 1024 * 1024) return setError("File maksimal 10 MB.");
            setBusy(true);
            try {
              await uploadDoc(token, personId, kind, file);
              onDone();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
      {error && <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> {error}</p>}
    </div>
  );
}

function PersonCard({ p, token, departure, onSaved }: { p: ManifestPerson; token: string; departure: string; onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(p));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const set = (k: FieldKey, v: string) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setSavedAt(null);
  };
  const left = missing(p, draft);
  const dirty = Object.keys(changes(p, draft)).length > 0;
  const warn = passportWarning(draft.passport_expiry, departure);
  const hasProblem = (Object.keys(draft) as FieldKey[]).some((k) => fieldProblem(k, draft[k]));
  const complete = isComplete(p, draft);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveFields(token, p.id, changes(p, draft) as Record<string, string>);
      setSavedAt(Date.now());
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6" aria-labelledby={`h-${p.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id={`h-${p.id}`} className="text-lg font-bold">{p.full_name}</h2>
        {complete && !dirty ? (
          <Badge variant="outline" className="border-status-ok-border bg-status-ok-bg text-status-ok-fg">Lengkap</Badge>
        ) : (
          <Badge variant="outline" className="border-status-warn-border bg-status-warn-bg text-status-warn-fg">
            Kurang {left.length + docsMissing(p)} hal
          </Badge>
        )}
      </div>

      <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-muted-foreground">Data diri</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field k="nik" draft={draft} set={set} p={p}><Input id={`${p.id}-nik`} inputMode="numeric" maxLength={16} value={draft.nik} onChange={(e) => set("nik", e.target.value.replace(/\D/g, ""))} className="mt-1.5" aria-invalid={!!fieldProblem("nik", draft.nik)} /></Field>
        <Field k="father_name" draft={draft} set={set} p={p} />
        <Field k="birth_place" draft={draft} set={set} p={p} />
        <Field k="date_of_birth" draft={draft} set={set} p={p}><Input id={`${p.id}-date_of_birth`} type="date" value={draft.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} className="mt-1.5" /></Field>
        <div className="sm:col-span-2">
          <Field k="address" draft={draft} set={set} p={p}><Textarea id={`${p.id}-address`} rows={2} maxLength={300} value={draft.address} onChange={(e) => set("address", e.target.value)} className="mt-1.5" /></Field>
        </div>
        {!p.is_child && (
          <>
            <Field k="marital_status" draft={draft} set={set} p={p}>
              <RadioGroup className="mt-2 flex gap-5" value={draft.marital_status} onValueChange={(v) => set("marital_status", v)} aria-label="Status kawin">
                {[["married", "Menikah"], ["single", "Tidak menikah"]].map(([v, l]) => (
                  <label key={v} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><RadioGroupItem value={v} /> {l}</label>
                ))}
              </RadioGroup>
            </Field>
            <Field k="email" draft={draft} set={set} p={p}><Input id={`${p.id}-email`} type="email" inputMode="email" autoComplete="email" value={draft.email} onChange={(e) => set("email", e.target.value)} className="mt-1.5" aria-invalid={!!fieldProblem("email", draft.email)} /></Field>
            <Field k="occupation" draft={draft} set={set} p={p} />
            <Field k="education" draft={draft} set={set} p={p}>
              <Select value={draft.education} onValueChange={(v) => set("education", v)}>
                <SelectTrigger id={`${p.id}-education`} className="mt-1.5"><SelectValue placeholder="Pilih pendidikan" /></SelectTrigger>
                <SelectContent>{EDUCATION.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </>
        )}
        <Field k="blood_type" draft={draft} set={set} p={p}>
          <Select value={draft.blood_type} onValueChange={(v) => set("blood_type", v)}>
            <SelectTrigger id={`${p.id}-blood_type`} className="mt-1.5"><SelectValue placeholder="Pilih golongan darah" /></SelectTrigger>
            <SelectContent>{BLOOD.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>

      <h3 className="mt-7 text-sm font-bold uppercase tracking-wide text-muted-foreground">Paspor</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field k="passport_number" draft={draft} set={set} p={p}><Input id={`${p.id}-passport_number`} autoCapitalize="characters" value={draft.passport_number} onChange={(e) => set("passport_number", e.target.value.toUpperCase().replace(/\s/g, ""))} className="mt-1.5" aria-invalid={!!fieldProblem("passport_number", draft.passport_number)} /></Field>
        <Field k="passport_issue_office" draft={draft} set={set} p={p} />
        <Field k="passport_issued_at" draft={draft} set={set} p={p}><Input id={`${p.id}-passport_issued_at`} type="date" value={draft.passport_issued_at} onChange={(e) => set("passport_issued_at", e.target.value)} className="mt-1.5" /></Field>
        <Field k="passport_expiry" draft={draft} set={set} p={p}><Input id={`${p.id}-passport_expiry`} type="date" value={draft.passport_expiry} onChange={(e) => set("passport_expiry", e.target.value)} className="mt-1.5" /></Field>
      </div>
      {warn && (
        <Alert className="mt-3 border-status-warn-border bg-status-warn-bg text-status-warn-text">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{warn}</AlertDescription>
        </Alert>
      )}

      <h3 className="mt-7 text-sm font-bold uppercase tracking-wide text-muted-foreground">Keluarga yang dapat dihubungi saat darurat</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field k="emergency_name" draft={draft} set={set} p={p} />
        <Field k="emergency_relation" draft={draft} set={set} p={p} />
        <Field k="emergency_phone" draft={draft} set={set} p={p}><Input id={`${p.id}-emergency_phone`} type="tel" inputMode="tel" value={draft.emergency_phone} onChange={(e) => set("emergency_phone", e.target.value)} className="mt-1.5" aria-invalid={!!fieldProblem("emergency_phone", draft.emergency_phone)} /></Field>
      </div>

      <h3 className="mt-7 text-sm font-bold uppercase tracking-wide text-muted-foreground">Kesehatan dan perjalanan</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field k="medical_notes" draft={draft} set={set} p={p} hint="Kosongkan bila tidak ada."><Textarea id={`${p.id}-medical_notes`} rows={2} maxLength={500} value={draft.medical_notes} onChange={(e) => set("medical_notes", e.target.value)} className="mt-1.5" /></Field>
        </div>
        <Field k="meningitis_vaccinated_at" draft={draft} set={set} p={p} hint="Paling cepat 14 hari sebelum berangkat (buku kuning atau e-ICV)."><Input id={`${p.id}-meningitis_vaccinated_at`} type="date" value={draft.meningitis_vaccinated_at} onChange={(e) => set("meningitis_vaccinated_at", e.target.value)} className="mt-1.5" /></Field>
        <Field k="polio_vaccinated_at" draft={draft} set={set} p={p}><Input id={`${p.id}-polio_vaccinated_at`} type="date" value={draft.polio_vaccinated_at} onChange={(e) => set("polio_vaccinated_at", e.target.value)} className="mt-1.5" /></Field>
        {p.gender === "P" && !p.is_child && (
          <>
            <Field k="mahram_name" draft={draft} set={set} p={p} hint="Isi bila berangkat bersama mahram." />
            <Field k="mahram_relation" draft={draft} set={set} p={p} />
          </>
        )}
        <Field k="equipment_size" draft={draft} set={set} p={p} hint="Contoh: M, L, XL." />
        <Field k="roommate_note" draft={draft} set={set} p={p} />
      </div>

      {error && (
        <Alert variant="destructive" role="alert" className="mt-5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="brand" type="button" className="h-12 px-8 font-bold" onClick={save} disabled={saving || !dirty || hasProblem}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}Simpan data {p.full_name.split(" ")[0]}
        </Button>
        {savedAt && !dirty && <span role="status" className="inline-flex items-center gap-1 text-sm text-status-ok-text"><Check className="h-4 w-4" aria-hidden /> Tersimpan</span>}
        {left.length > 0 && <span className="text-[13px] text-muted-foreground">Belum diisi: {left.map((k) => LABEL[k]).join(", ")}</span>}
      </div>

      <h3 className="mt-8 text-sm font-bold uppercase tracking-wide text-muted-foreground">Dokumen</h3>
      <p className="mt-1 text-[13px] text-muted-foreground">JPG, PNG, atau PDF, maksimal 10 MB. Pasfoto: latar putih, wajah 80% dari foto.</p>
      <div className="mt-3 space-y-3">
        <DocRow kind="ktp" has={p.has_ktp} label={p.is_child ? "KK atau KIA" : KIND_LABEL.ktp} token={token} personId={p.id} onDone={onSaved} />
        <DocRow kind="passport" has={p.has_passport} label={KIND_LABEL.passport} token={token} personId={p.id} onDone={onSaved} />
        <DocRow kind="photo" has={p.has_photo} label={KIND_LABEL.photo} token={token} personId={p.id} onDone={onSaved} />
      </div>
    </section>
  );
}

/** Stage 2 of the registration: /lengkapi/<token>, the private link CS sends once the registration is accepted. */
export default function Lengkapi() {
  const { token = "" } = useParams();
  const qc = useQueryClient();
  const { websiteSettings } = useHomepageData();
  const whatsapp = websiteSettings?.whatsapp_number || FALLBACK_WHATSAPP;
  const { data, isPending, error } = useQuery<Manifest, ManifestError>({
    queryKey: ["manifest", token],
    queryFn: () => loadManifest(token),
    retry: (count, err) => err.status === 0 && count < 2,
    refetchOnWindowFocus: false,
  });
  // Cards keep their own typing; saving refreshes only the stored values (documents, completeness).
  const refresh = () => qc.invalidateQueries({ queryKey: ["manifest", token] });

  const complete = data ? data.people.filter((p) => isComplete(p, draftOf(p))).length : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-28 sm:px-6">
        {isPending ? (
          <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border bg-white p-8 text-center">
            <h1 className="text-2xl font-bold">{error.status === 404 ? "Link tidak berlaku" : "Data belum bisa dibuka"}</h1>
            <p className="mt-2 text-muted-foreground">{error.message}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {error.status !== 404 && <Button variant="brand"  onClick={() => window.location.reload()}>Coba lagi</Button>}
              <Button asChild variant="outline" >
                <a href={formatWhatsAppUrl(whatsapp, "Assalamu'alaikum, saya butuh bantuan mengisi data jamaah.")} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" aria-hidden />Hubungi CS</a>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <header className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">Lengkapi data jamaah</h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" aria-hidden /> {data.package_name}, berangkat {fmtDate(data.departure_date)}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Halo {data.contact_name.split(" ")[0]}. Isi data tiap peserta di bawah. Boleh disimpan sebagian dan dilanjutkan nanti lewat link yang sama. Nama dan data harus sama dengan paspor.
              </p>
              <p className="mt-3 text-sm font-semibold" role="status">{complete} dari {data.people.length} peserta sudah lengkap</p>
            </header>
            <div className="space-y-6">
              {data.people.map((p) => (
                <PersonCard key={p.id} p={p} token={token} departure={data.departure_date} onSaved={refresh} />
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Butuh bantuan? <a className="font-semibold underline underline-offset-2" href={formatWhatsAppUrl(whatsapp, `Assalamu'alaikum, saya butuh bantuan mengisi data jamaah (kode ${data.code}).`)} target="_blank" rel="noopener noreferrer">Chat CS</a>
              {" · "}<Link className="underline underline-offset-2" to="/syarat-umroh">Persyaratan umroh</Link>
            </p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
