import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { MoneyInput } from "./MoneyInput";
import { DocUpload } from "./DocUpload";
import { ROOM_LABELS, rupiah, type JamaahGroup, type Registration } from "@/lib/jamaah";
import { packageRoomPrice, useAgentOptions, type JamaahPackage } from "@/hooks/useJamaah";

const SIZES = ["S", "M", "L", "XL", "XXL", "3XL", "4XL"];
const NEW_GROUP = "__new__";
const NO_GROUP = "__none__";
const NO_AGENT = "__none__";

type Draft = Partial<Registration> & { full_name: string; room_type: string; list_price: number; discount: number };

const emptyDraft = (pkg?: JamaahPackage): Draft => ({
  full_name: "",
  room_type: "quad",
  list_price: packageRoomPrice(pkg, "quad"),
  discount: 0,
  status: "active",
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: JamaahPackage | undefined;
  groups: JamaahGroup[];
  registration?: Registration | null;
  onSaved: () => void;
}

/** Add or edit one jamaah: the old sheet columns, manifest data, documents and cancellation. */
export function RegistrationDialog({ open, onOpenChange, pkg, groups, registration, onSaved }: Props) {
  const isEdit = !!registration;
  const { data: agents = [] } = useAgentOptions();
  const [draft, setDraft] = useState<Draft>(emptyDraft(pkg));
  const [groupChoice, setGroupChoice] = useState<string>(NO_GROUP);
  const [newGroupName, setNewGroupName] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("utama");

  useEffect(() => {
    if (!open) return;
    setTab("utama");
    setNewGroupName("");
    if (registration) {
      setDraft({ ...registration, list_price: Number(registration.list_price), discount: Number(registration.discount) });
      setGroupChoice(registration.group_id ?? NO_GROUP);
    } else {
      setDraft(emptyDraft(pkg));
      setGroupChoice(NO_GROUP);
    }
  }, [open, registration, pkg]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const folder = `registrations/${registration?.id ?? "baru"}`;
  const tierPrice = packageRoomPrice(pkg, draft.room_type);

  const save = async () => {
    if (!pkg) return;
    if (!draft.full_name.trim()) {
      setTab("utama");
      toast.error("Nama jamaah wajib diisi.");
      return;
    }
    if (!draft.list_price || draft.list_price <= 0) {
      setTab("utama");
      toast.error("Harga paket wajib diisi.");
      return;
    }
    if (draft.discount > draft.list_price) {
      setTab("utama");
      toast.error("Diskon tidak boleh lebih besar dari harga paket.");
      return;
    }
    if (draft.status === "cancelled" && !draft.cancel_reason?.trim()) {
      setTab("batal");
      toast.error("Tulis alasan pembatalan.");
      return;
    }
    setSaving(true);
    try {
      let groupId: string | null = groupChoice === NO_GROUP ? null : groupChoice;
      if (groupChoice === NEW_GROUP) {
        if (!newGroupName.trim()) throw new Error("Nama rombongan baru wajib diisi.");
        const { data, error } = await supabase
          .from("jamaah_groups")
          .insert({ package_id: pkg.id, name: newGroupName.trim() })
          .select("id")
          .single();
        if (error) throw error;
        groupId = data.id;
      }
      const clean = (v: unknown) => (typeof v === "string" ? v.trim() || null : v ?? null);
      const payload = {
        package_id: pkg.id,
        group_id: groupId,
        full_name: draft.full_name.trim(),
        phone: clean(draft.phone),
        domicile: clean(draft.domicile),
        start_city: clean(draft.start_city),
        room_type: draft.room_type,
        list_price: draft.list_price,
        discount: draft.discount || 0,
        price_note: clean(draft.price_note),
        agent_id: draft.agent_id ?? null,
        referral_note: clean(draft.referral_note),
        equipment_size: clean(draft.equipment_size),
        equipment_taken_at: draft.equipment_taken_at ?? null,
        status: draft.status ?? "active",
        cancel_reason: draft.status === "cancelled" ? clean(draft.cancel_reason) : null,
        refund_amount: draft.status === "cancelled" ? draft.refund_amount ?? null : null,
        refund_paid_at: draft.status === "cancelled" ? clean(draft.refund_paid_at) : null,
        gender: clean(draft.gender),
        nik: clean(draft.nik),
        birth_place: clean(draft.birth_place),
        date_of_birth: clean(draft.date_of_birth),
        passport_number: clean(draft.passport_number),
        passport_issued_at: clean(draft.passport_issued_at),
        passport_expiry: clean(draft.passport_expiry),
        passport_issue_office: clean(draft.passport_issue_office),
        mahram_name: clean(draft.mahram_name),
        mahram_relation: clean(draft.mahram_relation),
        meningitis_vaccinated_at: clean(draft.meningitis_vaccinated_at),
        polio_vaccinated_at: clean(draft.polio_vaccinated_at),
        roommate_note: clean(draft.roommate_note),
        father_name: clean(draft.father_name),
        marital_status: clean(draft.marital_status),
        address: clean(draft.address),
        email: clean(draft.email),
        occupation: clean(draft.occupation),
        education: clean(draft.education),
        blood_type: clean(draft.blood_type),
        emergency_name: clean(draft.emergency_name),
        emergency_relation: clean(draft.emergency_relation),
        emergency_phone: clean(draft.emergency_phone),
        medical_notes: clean(draft.medical_notes),
        ktp_path: draft.ktp_path ?? null,
        passport_path: draft.passport_path ?? null,
        photo_path: draft.photo_path ?? null,
        notes: clean(draft.notes),
      } as const;

      const { error } = isEdit
        ? await supabase.from("jamaah_registrations").update(payload as never).eq("id", registration!.id)
        : await supabase.from("jamaah_registrations").insert(payload as never);
      if (error) throw error;
      toast.success(isEdit ? "Data jamaah disimpan" : `${payload.full_name} ditambahkan`);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message || "Gagal menyimpan data jamaah");
    } finally {
      setSaving(false);
    }
  };

  /** A choice limited by the database (blood type, marital status, education). Empty keeps it unset. */
  const pick = (key: keyof Draft, label: string, options: [string, string][]) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={(draft[key] as string) ?? ""} onValueChange={(v) => set(key, v as never)}>
        <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  const text = (key: keyof Draft, label: string, props: Record<string, unknown> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`reg-${String(key)}`}>{label}</Label>
      <Input
        id={`reg-${String(key)}`}
        value={(draft[key] as string) ?? ""}
        onChange={(e) => set(key, e.target.value as never)}
        {...props}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Data ${registration!.full_name}` : "Tambah Jamaah"}</DialogTitle>
          <DialogDescription>
            {pkg?.package_name} ·{" "}
            {pkg && new Date(`${pkg.departure_date.slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="utama" className="[@media(pointer:coarse)]:h-11">Pendaftaran</TabsTrigger>
            <TabsTrigger value="manifest" className="[@media(pointer:coarse)]:h-11">Manifest</TabsTrigger>
            <TabsTrigger value="dokumen" className="[@media(pointer:coarse)]:h-11">Dokumen</TabsTrigger>
            <TabsTrigger value="batal" disabled={!isEdit} className="[@media(pointer:coarse)]:h-11">Pembatalan</TabsTrigger>
          </TabsList>

          <TabsContent value="utama" className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              {text("full_name", "Nama lengkap (sesuai paspor) *", { autoFocus: !isEdit })}
              {text("phone", "No. WhatsApp", { inputMode: "tel", placeholder: "08xx" })}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Rombongan / keluarga</Label>
                <Select value={groupChoice} onValueChange={setGroupChoice}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_GROUP}>Tanpa rombongan</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                    <SelectItem value={NEW_GROUP}>+ Rombongan baru</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {groupChoice === NEW_GROUP && (
                <div className="space-y-1.5">
                  <Label htmlFor="reg-new-group">Nama rombongan baru</Label>
                  <Input id="reg-new-group" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Keluarga Bpk. Ahmad" />
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Kamar *</Label>
                <Select
                  value={draft.room_type}
                  onValueChange={(room) =>
                    setDraft((d) => ({
                      ...d,
                      room_type: room,
                      // Follow the package price for the new room unless it was set by hand.
                      list_price: !d.list_price || d.list_price === packageRoomPrice(pkg, d.room_type) ? packageRoomPrice(pkg, room) : d.list_price,
                    }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROOM_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-price">Harga paket (Rencana) *</Label>
                <MoneyInput id="reg-price" value={draft.list_price} onChange={(v) => set("list_price", v)} />
                {tierPrice > 0 && draft.list_price !== tierPrice && (
                  <p className="text-xs text-muted-foreground">Harga paket: {rupiah(tierPrice)}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-discount">Diskon</Label>
                <MoneyInput id="reg-discount" value={draft.discount} onChange={(v) => set("discount", v)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-price-note">Keterangan harga (diskon, promo, dll)</Label>
              <Input id="reg-price-note" value={draft.price_note ?? ""} onChange={(e) => set("price_note", e.target.value)} />
            </div>
            <p className="rounded-md bg-muted px-3 py-2 text-sm">
              Total tagihan: <strong>{rupiah(draft.list_price - (draft.discount || 0))}</strong>
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Agen (referral)</Label>
                <Select value={draft.agent_id ?? NO_AGENT} onValueChange={(v) => set("agent_id", v === NO_AGENT ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_AGENT}>Tanpa agen</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} · {a.referral_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {text("referral_note", "Referral lain (kalau bukan agen terdaftar)")}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {text("domicile", "Domisili")}
              {text("start_city", "Start (kota berangkat)", { placeholder: "Jakarta" })}
            </div>

            <div className="grid items-end gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="reg-size">Size perlengkapan</Label>
                <Input id="reg-size" list="jamaah-sizes" value={draft.equipment_size ?? ""} onChange={(e) => set("equipment_size", e.target.value)} />
                <datalist id="jamaah-sizes">
                  {SIZES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <label className="flex h-10 items-center gap-2 text-sm">
                <Checkbox
                  checked={!!draft.equipment_taken_at}
                  onCheckedChange={(c) => set("equipment_taken_at", c ? new Date().toISOString() : null)}
                />
                Perlengkapan sudah diambil
              </label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-notes">Catatan</Label>
              <Textarea id="reg-notes" rows={2} value={draft.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="manifest" className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Jenis kelamin</Label>
                <Select value={draft.gender ?? ""} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {text("nik", "NIK", { inputMode: "numeric", maxLength: 16 })}
              {text("birth_place", "Tempat lahir")}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {text("date_of_birth", "Tanggal lahir", { type: "date" })}
              {text("passport_number", "No. paspor")}
              {text("passport_issue_office", "Kantor imigrasi")}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {text("passport_issued_at", "Tanggal terbit paspor", { type: "date" })}
              {text("passport_expiry", "Paspor berlaku sampai", { type: "date" })}
            </div>
            {draft.gender === "P" && (
              <div className="grid gap-4 sm:grid-cols-2">
                {text("mahram_name", "Nama mahram")}
                {text("mahram_relation", "Hubungan mahram", { placeholder: "Suami / ayah / kakak" })}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {text("meningitis_vaccinated_at", "Tanggal vaksin meningitis", { type: "date" })}
              {text("polio_vaccinated_at", "Tanggal vaksin polio", { type: "date" })}
            </div>
            {text("roommate_note", "Teman sekamar", { placeholder: "Sekamar dengan ..." })}
            <p className="pt-2 text-sm font-semibold">Dari formulir pendaftaran</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {text("father_name", "Nama ayah kandung")}
              {text("email", "Email", { type: "email" })}
              {text("occupation", "Pekerjaan")}
              {pick("blood_type", "Golongan darah", [["A", "A"], ["B", "B"], ["AB", "AB"], ["O", "O"]])}
              {pick("marital_status", "Status kawin", [["married", "Menikah"], ["single", "Tidak menikah"]])}
              {pick("education", "Pendidikan", [["sd", "SD"], ["smp", "SMP"], ["sma", "SMA / SMK"], ["s1", "S1 / D4 atau lebih"], ["other", "Lainnya"]])}
            </div>
            {text("address", "Alamat rumah")}
            <div className="grid gap-4 sm:grid-cols-3">
              {text("emergency_name", "Kontak darurat")}
              {text("emergency_relation", "Hubungan")}
              {text("emergency_phone", "No HP darurat", { inputMode: "tel" })}
            </div>
            {text("medical_notes", "Riwayat penyakit kronis")}
          </TabsContent>

          <TabsContent value="dokumen" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Dokumen disimpan privat, hanya bisa dibuka CS dan owner.</p>
            <DocUpload label="KTP" path={draft.ktp_path} folder={folder} onUploaded={(p) => set("ktp_path", p)} />
            <DocUpload label="Paspor (halaman data)" path={draft.passport_path} folder={folder} onUploaded={(p) => set("passport_path", p)} />
            <DocUpload label="Pas foto" path={draft.photo_path} folder={folder} onUploaded={(p) => set("photo_path", p)} />
          </TabsContent>

          <TabsContent value="batal" className="space-y-4 pt-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={draft.status === "cancelled"}
                onCheckedChange={(c) => set("status", c ? "cancelled" : "active")}
              />
              Jamaah ini batal berangkat
            </label>
            {draft.status === "cancelled" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-cancel-reason">Alasan pembatalan *</Label>
                  <Textarea id="reg-cancel-reason" rows={2} value={draft.cancel_reason ?? ""} onChange={(e) => set("cancel_reason", e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-refund">Dana dikembalikan</Label>
                    <MoneyInput id="reg-refund" value={Number(draft.refund_amount ?? 0)} onChange={(v) => set("refund_amount", v)} />
                  </div>
                  {text("refund_paid_at", "Tanggal refund dibayar", { type: "date" })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Seat otomatis dilepas. Komisi agen yang belum dicairkan otomatis dibatalkan.
                </p>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className="[@media(pointer:coarse)]:h-11" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
          <Button type="button" onClick={save} disabled={saving || !pkg} className="[@media(pointer:coarse)]:h-11">{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
