import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useConfirmDialog } from "@/components/admin/useConfirmDialog";
import { Loader2, Save, Home, Link as LinkIcon, Trash2 } from "lucide-react";

import { AdminPage, AdminPanel } from "@/components/admin/AdminPage";
const HOME_PATH = "/";
const TITLE_MAX = 60;
const DESC_MAX = 155;

/** Hint under a field: green-ish while it fits what Google shows, a warning once it will be cut. */
const Counter = ({ value, max }: { value: string; max: number }) => (
  <p className={`text-xs ${value.length > max ? "text-status-warn-text" : "text-muted-foreground"}`}>
    {value.length} dari {max} karakter{value.length > max ? ", akan terpotong di Google" : ""}
  </p>
);

/**
 * The two SEO settings that really change the site:
 *  - the home page's title and description (page_seo, path "/"), read by the page and by the server HTML;
 *  - 301 redirects for old addresses (redirects), read by the server for paths that no longer exist.
 * Everything else (robots.txt, sitemap, other pages' titles) lives in the code and is not editable here.
 */
const SEO = () => {
  const { loading: authLoading, isAdmin: isOwner, userRole } = useAuth();
  // The menu also shows this page to content_admin, so the page has to let that role in (it used to render blank).
  const isAdmin = isOwner || userRole === "content_admin";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { ask, dialog } = useConfirmDialog();

  const { data: home, isLoading: loadingHome } = useQuery({
    queryKey: ["page-seo", HOME_PATH],
    queryFn: async () => {
      const { data, error } = await supabase.from("page_seo").select("*").eq("page_path", HOME_PATH).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: redirects, isLoading: loadingRedirects } = useQuery({
    queryKey: ["redirects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("redirects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Home form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => {
    if (home !== undefined) {
      setTitle(home?.meta_title ?? "");
      setDescription(home?.meta_description ?? "");
    }
  }, [home]);

  const saveHome = useMutation({
    mutationFn: async () => {
      const payload = { meta_title: title.trim() || null, meta_description: description.trim() || null };
      const { error } = home?.id
        ? await supabase.from("page_seo").update(payload).eq("id", home.id)
        : await supabase.from("page_seo").insert({ ...payload, page_path: HOME_PATH, page_name: "Beranda" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-seo"] });
      queryClient.invalidateQueries({ queryKey: ["page-seo", HOME_PATH] });
      toast({ title: "Tersimpan", description: "Judul dan deskripsi beranda diperbarui. Google butuh beberapa hari untuk mengikutinya." });
    },
    onError: () => toast({ title: "Gagal menyimpan", description: "Coba lagi atau hubungi admin teknis.", variant: "destructive" }),
  });

  // Redirects
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const normalizedFrom = from.trim().replace(/\/+$/, "") || "";
  const trimmedTo = to.trim();
  const fromError = !normalizedFrom
    ? ""
    : !normalizedFrom.startsWith("/") || /[\s?#]/.test(normalizedFrom)
      ? "Mulai dengan / dan tanpa spasi, tanda tanya, atau #. Contoh: /paket-lama"
      : "";
  const toError = !trimmedTo
    ? ""
    : !(trimmedTo.startsWith("/") || /^https?:\/\//i.test(trimmedTo)) || trimmedTo.startsWith("//")
      ? "Isi dengan alamat di situs (/paket-umroh) atau alamat lengkap (https://...)"
      : trimmedTo.replace(/\/+$/, "") === normalizedFrom
        ? "Alamat tujuan tidak boleh sama dengan alamat asal"
        : "";
  const canAdd = !!normalizedFrom && !!trimmedTo && !fromError && !toError;

  const addRedirect = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("redirects")
        .insert({ from_path: normalizedFrom, to_path: trimmedTo, redirect_type: 301, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["redirects"] });
      setFrom("");
      setTo("");
      toast({ title: "Pengalihan ditambahkan" });
    },
    onError: () => toast({ title: "Gagal menambah", description: "Alamat asal mungkin sudah punya pengalihan.", variant: "destructive" }),
  });

  const toggleRedirect = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("redirects").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["redirects"] }),
    onError: () => toast({ title: "Gagal mengubah status", variant: "destructive" }),
  });

  const removeRedirect = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("redirects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["redirects"] });
      toast({ title: "Pengalihan dihapus" });
    },
    onError: () => toast({ title: "Gagal menghapus", variant: "destructive" }),
  });

  // Wait for the session and role before judging access: on a client-side move the hook starts empty, and judging
  // too early sent a signed-in admin to the login page. The admin layout already guards the signed-out case.
  if (authLoading || loadingHome || loadingRedirects) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" aria-label="Memuat" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/admin" replace />;

  const previewTitle = title.trim() || "Musafar Tour - Paket Umroh Terpercaya 2026";
  const previewDesc = description.trim() || "Isi deskripsi di atas.";

  return (
    <AdminPage title="SEO"
      intro="Dua pengaturan yang benar-benar mengubah situs."
    >
      <AdminPanel last>
<Tabs defaultValue="home" className="w-full">
        <TabsList>
          <TabsTrigger value="home">
            <Home className="mr-2 h-4 w-4" aria-hidden />
            SEO beranda
          </TabsTrigger>
          <TabsTrigger value="redirects">
            <LinkIcon className="mr-2 h-4 w-4" aria-hidden />
            Pengalihan 301
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home">
          <Card>
            <CardHeader>
              <CardTitle>Judul dan deskripsi beranda</CardTitle>
              <CardDescription>
                Ini yang muncul di hasil Google dan di pratinjau saat beranda dibagikan. Halaman lain (paket, artikel, kontak, dan seterusnya) memakai teks dari kode dan datanya masing-masing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="seo-title">Judul</Label>
                <Input id="seo-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Musafar Tour - Paket Umroh Terpercaya 2026" />
                <Counter value={title} max={TITLE_MAX} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo-desc">Deskripsi</Label>
                <Textarea id="seo-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
                <Counter value={description} max={DESC_MAX} />
              </div>

              <div className="rounded-lg bg-muted p-4" aria-label="Pratinjau di Google">
                <p className="mb-1 text-xs text-muted-foreground">Pratinjau di Google</p>
                <p className="text-sm text-muted-foreground">musafartour.com</p>
                <p className="text-lg leading-snug text-foreground">{previewTitle.slice(0, TITLE_MAX + 10)}</p>
                <p className="text-sm text-muted-foreground">{previewDesc.slice(0, DESC_MAX + 10)}</p>
              </div>

              <Button onClick={() => saveHome.mutate()} disabled={saveHome.isPending}>
                {saveHome.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redirects">
          <Card>
            <CardHeader>
              <CardTitle>Pengalihan 301</CardTitle>
              <CardDescription>
                Arahkan alamat lama ke alamat baru supaya tautan lama tidak mati dan peringkat Google ikut pindah. Hanya untuk alamat yang sudah tidak ada di situs; alamat yang masih aktif tidak akan dialihkan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form
                className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-start"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (canAdd) addRedirect.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="r-from">Dari (alamat lama)</Label>
                  <Input id="r-from" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="/paket-lama" className="font-mono" aria-invalid={!!fromError} />
                  {fromError && <p className="text-xs text-status-bad-text">{fromError}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-to">Ke (alamat baru)</Label>
                  <Input id="r-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="/paket-umroh" className="font-mono" aria-invalid={!!toError} />
                  {toError && <p className="text-xs text-status-bad-text">{toError}</p>}
                </div>
                <div className="md:pt-[26px]">
                  <Button type="submit" disabled={!canAdd || addRedirect.isPending}>
                    {addRedirect.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Tambah
                  </Button>
                </div>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dari</TableHead>
                    <TableHead>Ke</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Aktif</TableHead>
                    <TableHead className="w-12"><span className="sr-only">Hapus</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redirects?.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.from_path}</TableCell>
                      <TableCell className="font-mono text-sm">{r.to_path}</TableCell>
                      <TableCell><Badge variant="outline">{r.redirect_type ?? 301}</Badge></TableCell>
                      <TableCell>
                        <Switch
                          checked={!!r.is_active}
                          onCheckedChange={(active) => toggleRedirect.mutate({ id: r.id, active })}
                          aria-label={`Pengalihan ${r.from_path} aktif`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Hapus pengalihan ${r.from_path}`}
                          onClick={() => ask({ title: "Hapus pengalihan ini?", description: `${r.from_path} tidak lagi diarahkan ke ${r.to_path}.` }, () => removeRedirect.mutate(r.id))}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {redirects?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">Belum ada pengalihan</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
{dialog}
      </AdminPanel>
    </AdminPage>
  );
};

export default SEO;
