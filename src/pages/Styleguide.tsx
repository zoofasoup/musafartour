import { useState } from "react";
import { Bell, Copy, MessageCircle, MoreHorizontal, Plus, Search, Trash2, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusKind } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const COLORS: { name: string; cls: string; use: string }[] = [
  { name: "brand", cls: "bg-brand", use: "Aksi utama situs publik" },
  { name: "amber", cls: "bg-amber", use: "Sorotan dan peringatan lembut" },
  { name: "primary", cls: "bg-primary", use: "Teks, aksi utama area kerja" },
  { name: "background", cls: "bg-background border", use: "Latar halaman" },
  { name: "card", cls: "bg-card border", use: "Kartu, panel, menu" },
  { name: "field", cls: "bg-field", use: "Kolom isian, jalur saklar" },
  { name: "border", cls: "bg-border", use: "Garis 1px" },
  { name: "destructive", cls: "bg-destructive", use: "Galat dan hapus (merah tua)" },
];

const STATUS: { kind: StatusKind; label: string }[] = [
  { kind: "warn", label: "Belum DP" },
  { kind: "info", label: "Sudah DP" },
  { kind: "ok", label: "Lunas" },
  { kind: "over", label: "Lebih bayar" },
  { kind: "bad", label: "Batal" },
  { kind: "mute", label: "Kedaluwarsa" },
];

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-4 space-y-3">
    <h2 className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">{title}</h2>
    {children}
  </section>
);
const Stage = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 ${className}`}>{children}</div>
);

/**
 * Living reference for DESIGN.md (/styleguide, noindex). Everything here is the real component, so when this page
 * and the design agreement disagree, the code is wrong. Compare against the UI Kit that was approved.
 */
export default function Styleguide() {
  const [confirm, setConfirm] = useState<null | "plain" | "delete">(null);
  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">DESIGN.md</p>
        <h1 className="text-4xl font-extrabold tracking-tight">Musafar styleguide</h1>
        <p className="max-w-prose text-muted-foreground">Komponen asli dalam keadaan yang dipakai. Token ada di src/index.css, aturan di DESIGN.md.</p>
      </header>

      <Section id="warna" title="Warna">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLORS.map((c) => (
            <div key={c.name} className="overflow-hidden rounded-lg border bg-card">
              <div className={`h-16 ${c.cls}`} />
              <div className="p-3">
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.use}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="huruf" title="Huruf (Onest)">
        <div className="space-y-2 rounded-lg border bg-card p-4">
          <p className="text-5xl font-extrabold tracking-[-0.035em]">Berangkat umroh</p>
          <p className="text-3xl font-bold tracking-tight">Data Jamaah</p>
          <p className="text-2xl font-bold tracking-tight">Perlu ditindaklanjuti</p>
          <p className="text-lg font-bold">Umroh Pelataran Hemat</p>
          <p className="text-base">Isi sekali saja, sekitar 2 menit.</p>
          <p className="text-sm">Rp 24.500.000 lagi · batas lunas 12 hari lagi</p>
          <p className="text-[13px] font-medium text-muted-foreground">Berangkat 27 Okt 2026 · 9 hari</p>
          <p className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">Status pembayaran (12px, terkecil)</p>
        </div>
      </Section>

      <Section id="sudut" title="Sudut dan bayangan">
        <Stage className="items-end gap-4">
          {[["4", "rounded-[4px]"], ["6", "rounded-sm"], ["8", "rounded-md"], ["12", "rounded-lg"], ["16", "rounded-2xl"], ["24", "rounded-3xl"]].map(([n, c]) => (
            <div key={n} className={`flex h-20 w-20 items-end border border-input bg-field p-2 text-xs text-muted-foreground ${c}`}>{n}</div>
          ))}
          <div className="flex h-20 w-28 items-end rounded-lg bg-card p-2 text-xs text-muted-foreground shadow-sm">Bayangan 1</div>
          <div className="flex h-20 w-28 items-end rounded-lg bg-card p-2 text-xs text-muted-foreground shadow-lg">Bayangan 2</div>
        </Stage>
      </Section>

      <Section id="tombol" title="Tombol">
        <Stage>
          <Button>Simpan</Button>
          <Button variant="brand">Daftar Sekarang</Button>
          <Button variant="outline">Export Excel</Button>
          <Button variant="secondary">Lainnya</Button>
          <Button variant="ghost">Batal</Button>
          <Button variant="destructive"><Trash2 />Hapus permanen</Button>
          <Button variant="destructiveSolid">Hapus permanen</Button>
          <Button variant="link">Term of Service</Button>
        </Stage>
        <Stage>
          <Button size="sm">Kecil 32</Button>
          <Button>Standar 40</Button>
          <Button variant="brand" size="lg">Hero 48</Button>
          <Button variant="outline"><Plus />Tambah baru</Button>
          <Button variant="outline" size="icon" aria-label="Salin"><Copy /></Button>
          <Button variant="outline" size="icon" aria-label="Lainnya"><MoreHorizontal /></Button>
          <Button variant="outline"><MessageCircle />WhatsApp</Button>
          <Button disabled>Nonaktif</Button>
        </Stage>
      </Section>

      <Section id="isian" title="Isian">
        <Stage className="items-start">
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="sg1">Nama sesuai paspor</Label><Input id="sg1" placeholder="Ahmad Zufar Sidqi" /></div>
            <div className="space-y-1.5"><Label htmlFor="sg2">Email</Label><Input id="sg2" defaultValue="ahmad@" aria-invalid="true" /><p className="text-xs text-destructive">Alamat email belum lengkap.</p></div>
            <div className="space-y-1.5"><Label>Tipe kamar</Label><Select defaultValue="quad"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="quad">Quad (ber-4)</SelectItem><SelectItem value="triple">Triple (ber-3)</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="sg3">Cari</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="sg3" className="pl-9" placeholder="Nama atau no. WA" /></div></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="sg4">Catatan</Label><Textarea id="sg4" placeholder="Ingin sekamar dengan siapa" /></div>
          </div>
        </Stage>
      </Section>

      <Section id="status" title="Status dan lencana">
        <Stage>{STATUS.map((s) => <StatusBadge key={s.label} kind={s.kind}>{s.label}</StatusBadge>)}<Badge variant="brand">3 baru</Badge></Stage>
        <Stage>
          <Tabs defaultValue="menunggu"><TabsList><TabsTrigger value="menunggu">Menunggu</TabsTrigger><TabsTrigger value="diterima">Diterima</TabsTrigger><TabsTrigger value="ditolak">Ditolak</TabsTrigger></TabsList></Tabs>
        </Stage>
      </Section>

      <Section id="tabel" title="Tabel (48 satu baris)">
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Paket</TableHead><TableHead className="text-right">Sisa</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              <TableRow><TableCell className="font-medium">Hasan Basri</TableCell><TableCell>Pelataran Hemat</TableCell><TableCell className="text-right">Rp 29.500.000</TableCell><TableCell><StatusBadge kind="warn">Belum DP</StatusBadge></TableCell><TableCell><Button variant="ghost" size="icon" aria-label="Aksi"><MoreHorizontal /></Button></TableCell></TableRow>
              <TableRow><TableCell className="font-medium">Siti Aminah</TableCell><TableCell>Pelataran Hemat</TableCell><TableCell className="text-right">Rp 24.500.000</TableCell><TableCell><StatusBadge kind="info">Sudah DP</StatusBadge></TableCell><TableCell><Button variant="ghost" size="icon" aria-label="Aksi"><MoreHorizontal /></Button></TableCell></TableRow>
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section id="kartu" title="Kartu, peringatan, kosong, memuat">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-base">Umroh Pelataran Hemat</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Berangkat 27 Okt 2026 · 9 hari · Saudia</CardContent></Card>
          <div className="space-y-2">
            <Alert><Bell className="h-4 w-4" /><AlertTitle>Link pribadi sudah dibuat</AlertTitle><AlertDescription>Kirim ke jamaah lewat WhatsApp.</AlertDescription></Alert>
            <Skeleton className="h-10 w-full" />
          </div>
          <EmptyState icon={Users} title="Belum ada jamaah atas namamu" action={<Button>Daftarkan jamaah</Button>}>Daftarkan jamaah pertama, atau kirim link supaya jamaah mengisi sendiri.</EmptyState>
        </div>
      </Section>

      <Section id="dialog" title="Dialog konfirmasi">
        <Stage>
          <Button variant="outline" onClick={() => setConfirm("plain")}>Dialog biasa</Button>
          <Button variant="destructive" onClick={() => setConfirm("delete")}><Trash2 />Hapus permanen</Button>
        </Stage>
        <ConfirmDialog open={confirm === "plain"} onOpenChange={(o) => !o && setConfirm(null)} title="Terima pendaftaran MSF-PAUP4?" description="Jamaah dibuat dengan harga paket." confirmLabel="Terima 1 orang" onConfirm={() => setConfirm(null)} />
        <ConfirmDialog open={confirm === "delete"} onOpenChange={(o) => !o && setConfirm(null)} title="Hapus Ahmad Zufar Sidqi?" description="Data jamaah dan dokumen dihapus permanen." confirmLabel="Hapus permanen" confirmText="Ahmad Zufar Sidqi" destructive onConfirm={() => setConfirm(null)} />
      </Section>
    </div>
  );
}
