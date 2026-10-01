import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { CreditCard, Download, FileSpreadsheet, Loader2, Plus, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RegistrationDialog } from "@/components/admin/jamaah/RegistrationDialog";
import { PaymentDialog } from "@/components/admin/jamaah/PaymentDialog";
import { RegistrationSheet } from "@/components/admin/jamaah/RegistrationSheet";
import { ImportSheetDialog } from "@/components/admin/jamaah/ImportSheetDialog";
import {
  PAY_STATE_CLASS,
  PAY_STATE_LABEL,
  ROOM_SHORT,
  balanceOf,
  daysUntil,
  documentChecklist,
  dueDateFor,
  juta,
  payState,
  rupiah,
  todayIso,
  type PayState,
  type Registration,
} from "@/lib/jamaah";
import { exportJamaahWorkbook } from "@/lib/jamaahExcel";
import { useAgentOptions, useInvalidateJamaah, useJamaahForPackage, useJamaahPackages } from "@/hooks/useJamaah";

type Filter = "all" | PayState | "cancelled";

const fmtDay = (d: string) => format(new Date(`${d.slice(0, 10)}T00:00:00`), "d MMM yyyy", { locale: localeId });

export default function Jamaah() {
  const { user, userRole } = useAuth();
  const isOwner = userRole === "admin" || userRole === "superadmin";
  const [params, setParams] = useSearchParams();
  const { data: packages = [], isLoading: loadingPackages } = useJamaahPackages();
  const { data: agents = [] } = useAgentOptions();
  const invalidate = useInvalidateJamaah();

  // Default to the next departure; ?paket=<id> deep-links from the finance report.
  const packageId = params.get("paket") || packages.find((p) => p.departure_date >= todayIso())?.id || packages[0]?.id;
  const pkg = packages.find((p) => p.id === packageId);
  const { data, isLoading } = useJamaahForPackage(packageId);
  const registrations = useMemo(() => data?.registrations ?? [], [data]);
  const payments = useMemo(() => data?.payments ?? [], [data]);
  const groups = useMemo(() => data?.groups ?? [], [data]);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Registration | null>(null);
  const [regOpen, setRegOpen] = useState(false);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [detail, setDetail] = useState<Registration | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [switchTo, setSwitchTo] = useState<"sheet" | "website" | null>(null);

  // Keep the open detail panel in sync after edits.
  useEffect(() => {
    if (detail) setDetail(registrations.find((r) => r.id === detail.id) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrations]);

  const rows = useMemo(
    () =>
      registrations.map((r) => {
        const b = balanceOf(r, payments.filter((p) => p.registration_id === r.id));
        return { r, b, state: payState(b), docs: documentChecklist(r) };
      }),
    [registrations, payments]
  );

  const visible = rows.filter(({ r, state }) => {
    if (query && !`${r.full_name} ${r.phone ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "cancelled") return r.status === "cancelled";
    if (r.status === "cancelled") return false;
    return filter === "all" || state === filter;
  });

  const active = rows.filter(({ r }) => r.status === "active");
  const totals = active.reduce(
    (t, { b, state }) => ({
      agreed: t.agreed + b.agreed,
      paid: t.paid + b.paidVerified,
      pending: t.pending + b.paidPending,
      outstanding: t.outstanding + Math.max(0, b.outstanding),
      belum_dp: t.belum_dp + (state === "belum_dp" ? 1 : 0),
      lunas: t.lunas + (state === "lunas" || state === "lebih" ? 1 : 0),
    }),
    { agreed: 0, paid: 0, pending: 0, outstanding: 0, belum_dp: 0, lunas: 0 }
  );
  const due = pkg ? dueDateFor(pkg.departure_date) : null;
  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name;
  const agentName = (r: Registration) => agents.find((a) => a.id === r.agent_id)?.name ?? r.referral_note;

  const toggleEquipment = async (r: Registration, taken: boolean) => {
    const { error } = await supabase
      .from("jamaah_registrations")
      .update({ equipment_taken_at: taken ? new Date().toISOString() : null })
      .eq("id", r.id);
    if (error) toast.error(error.message);
    else invalidate();
  };

  const switchSeatSource = async () => {
    if (!pkg || !switchTo) return;
    const { data: updated, error } = await supabase.from("packages").update({ seat_source: switchTo }).eq("id", pkg.id).select("id");
    setSwitchTo(null);
    if (error || !updated?.length) toast.error(error?.message ?? "Akun kamu tidak bisa mengubah paket ini.");
    else {
      toast.success(switchTo === "website" ? "Seat paket ini sekarang dihitung dari data jamaah di website" : "Seat kembali mengikuti Google Sheet");
      invalidate();
    }
  };

  const openNew = () => {
    setEditing(null);
    setRegOpen(true);
  };
  const openPay = (registrationId: string | null) => {
    setPayFor(registrationId);
    setPayOpen(true);
  };

  const sheetSeats = pkg?.slots_filled ?? 0;
  const websiteSeats = pkg?.slots_registered ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Data Jamaah</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pendaftaran, pembayaran, dan kelengkapan dokumen per paket.</p>
        </div>
        <div className="w-full lg:w-[420px]">
          <Select
            value={packageId ?? ""}
            onValueChange={(v) => {
              setParams({ paket: v });
              setQuery("");
              setFilter("all");
            }}
          >
            <SelectTrigger aria-label="Pilih paket">
              <SelectValue placeholder={loadingPackages ? "Memuat paket..." : "Pilih paket"} />
            </SelectTrigger>
            <SelectContent>
              {packages.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {fmtDay(p.departure_date)} · {p.package_name} · {p.duration_days}H
                  {p.departure_date < todayIso() ? " (sudah berangkat)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!pkg && !loadingPackages && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Belum ada paket berstatus Final atau Tayang.</CardContent></Card>
      )}

      {pkg && (
        <>
          <section aria-label="Ringkasan" className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {[
              ["Jamaah aktif", `${active.length}`, pkg.slots_total ? `dari ${pkg.slots_total} seat` : undefined],
              ["Belum DP", `${totals.belum_dp}`, "DP min. Rp 5 jt / pax"],
              ["Lunas", `${totals.lunas}`, due ? `batas ${fmtDay(due)}` : undefined],
              ["Total tagihan", juta(totals.agreed)],
              ["Sudah masuk", juta(totals.paid), totals.pending ? `+${juta(totals.pending)} menunggu verifikasi` : undefined],
              ["Sisa tagihan", juta(totals.outstanding), due ? (daysUntil(due) < 0 ? `lewat ${-daysUntil(due)} hari dari H-30` : `${daysUntil(due)} hari ke H-30`) : undefined],
            ].map(([label, value, hint]) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
                  {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
                </CardContent>
              </Card>
            ))}
          </section>

          <Card>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm">
                <p className="font-medium">
                  Seat di website dihitung dari:{" "}
                  <Badge variant="outline" className={pkg.seat_source === "website" ? "bg-emerald-100 text-emerald-900" : "bg-slate-100"}>
                    {pkg.seat_source === "website" ? "Data jamaah di sini" : "Google Sheet"}
                  </Badge>
                </p>
                <p className="mt-1 text-muted-foreground">
                  Google Sheet: {sheetSeats} terisi · Terdaftar di sini: {websiteSeats}
                  {pkg.seat_source === "sheet" && sheetSeats !== websiteSeats && " · belum cocok, import/lengkapi dulu sebelum dipindah"}
                </p>
              </div>
              {isOwner && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSwitchTo(pkg.seat_source === "website" ? "sheet" : "website")}
                >
                  {pkg.seat_source === "website" ? "Kembalikan ke Google Sheet" : "Pakai data di sini untuk seat"}
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Cari nama / no. WA" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari jamaah" />
              </div>
              <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <SelectTrigger className="sm:w-48" aria-label="Filter status bayar"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua jamaah aktif</SelectItem>
                  <SelectItem value="belum_dp">Belum DP</SelectItem>
                  <SelectItem value="dp">Sudah DP</SelectItem>
                  <SelectItem value="lunas">Lunas</SelectItem>
                  <SelectItem value="cancelled">Batal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setImportOpen(true)}>
                <FileSpreadsheet className="h-4 w-4" /> Import dari Sheet
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={!active.length}
                onClick={() =>
                  exportJamaahWorkbook({ packageName: pkg.package_name, departureDate: pkg.departure_date, registrations, payments, groups, agents })
                }
              >
                <Download className="h-4 w-4" /> Export Excel
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1" disabled={!active.length} onClick={() => openPay(null)}>
                <CreditCard className="h-4 w-4" /> Catat Pembayaran
              </Button>
              <Button type="button" size="sm" className="gap-1" onClick={openNew}>
                <Plus className="h-4 w-4" /> Tambah Jamaah
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-10">No</TableHead>
                  <TableHead className="min-w-[200px]">Nama</TableHead>
                  <TableHead>Kamar</TableHead>
                  <TableHead className="text-right">Tagihan</TableHead>
                  <TableHead className="text-right">Masuk</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Perlengkapan</TableHead>
                  <TableHead>Dokumen</TableHead>
                  <TableHead>Domisili / Start</TableHead>
                  <TableHead>Agen</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={13} className="py-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !visible.length && (
                  <TableRow>
                    <TableCell colSpan={13} className="py-10 text-center text-sm text-muted-foreground">
                      {registrations.length ? "Tidak ada jamaah yang cocok dengan filter." : (
                        <span className="inline-flex flex-col items-center gap-2">
                          <Users className="h-6 w-6" />
                          Belum ada jamaah di paket ini. Tambah satu per satu, atau import dari Google Sheet.
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )}
                {visible.map(({ r, b, state, docs }, i) => {
                  const docsDone = docs.filter((d) => d.done).length;
                  return (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetail(r)}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <span className="font-medium">{r.full_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {[groupName(r.group_id), r.phone].filter(Boolean).join(" · ") || "–"}
                        </span>
                      </TableCell>
                      <TableCell>{ROOM_SHORT[r.room_type]}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {rupiah(b.agreed)}
                        {Number(r.discount) > 0 && <span className="block text-xs text-muted-foreground">diskon {rupiah(Number(r.discount))}</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {rupiah(b.paidVerified)}
                        {b.paidPending > 0 && <span className="block text-xs text-amber-700">+{rupiah(b.paidPending)} menunggu</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">{rupiah(Math.max(0, b.outstanding))}</TableCell>
                      <TableCell>
                        {r.status === "cancelled" ? (
                          <Badge variant="outline" className="bg-red-100 text-red-900">Batal</Badge>
                        ) : (
                          <Badge variant="outline" className={PAY_STATE_CLASS[state]}>{PAY_STATE_LABEL[state]}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{r.equipment_size || "–"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={!!r.equipment_taken_at}
                            disabled={r.status === "cancelled"}
                            onCheckedChange={(c) => toggleEquipment(r, !!c)}
                            aria-label={`Perlengkapan ${r.full_name} sudah diambil`}
                          />
                          {r.equipment_taken_at ? "Diambil" : "Belum"}
                        </label>
                      </TableCell>
                      <TableCell>
                        <span className={docsDone === docs.length ? "text-emerald-700" : "text-muted-foreground"}>
                          {docsDone}/{docs.length}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.domicile || "–"}
                        {r.start_city && <span className="block text-xs text-muted-foreground">Start {r.start_city}</span>}
                      </TableCell>
                      <TableCell className="text-sm">{agentName(r) || "–"}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {r.status === "active" && (
                          <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => openPay(r.id)}>
                            Bayar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <RegistrationDialog open={regOpen} onOpenChange={setRegOpen} pkg={pkg} groups={groups} registration={editing} onSaved={invalidate} />
      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        registrations={registrations}
        payments={payments}
        groups={groups}
        registrationId={payFor}
        isOwner={isOwner}
        onSaved={invalidate}
      />
      <ImportSheetDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        pkg={pkg}
        registrations={registrations}
        agents={agents}
        isOwner={isOwner}
        onImported={invalidate}
      />
      <RegistrationSheet
        registration={detail}
        payments={payments}
        departureDate={pkg?.departure_date}
        isOwner={isOwner}
        currentUserId={user?.id}
        onOpenChange={(o) => !o && setDetail(null)}
        onEdit={() => {
          setEditing(detail);
          setRegOpen(true);
        }}
        onPay={() => openPay(detail?.id ?? null)}
        onChanged={invalidate}
      />

      <AlertDialog open={!!switchTo} onOpenChange={(o) => !o && setSwitchTo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {switchTo === "website" ? "Hitung seat dari data jamaah di website?" : "Kembalikan seat ke Google Sheet?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {switchTo === "website"
                ? `Sisa seat di website akan dihitung dari ${websiteSeats} jamaah terdaftar di sini (Google Sheet saat ini: ${sheetSeats}). Sync Google Sheet tengah malam tidak lagi mengubah paket ini.`
                : "Sisa seat di website kembali mengikuti angka Google Sheet yang disinkronkan tiap tengah malam."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={switchSeatSource}>Ya, ubah</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
