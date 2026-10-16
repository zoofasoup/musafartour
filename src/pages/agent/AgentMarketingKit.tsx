import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronRight, Copy, Download, FileText, ImageIcon, Map as MapIcon, MessageSquareQuote, Package, Share2, Star, UserPlus } from "lucide-react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { usePublishedPackages, type PublishedPackage } from "@/hooks/usePackages";
import { useTestimonials } from "@/hooks/useHomepageData";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AgentEmpty, AgentPage, AgentPanel, Chips, agentGlass } from "@/components/agent/AgentPage";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { agentCsWhatsAppUrl } from "@/lib/agentSupport";
import { buildPackageTexts } from "@/lib/marketingText";
import { copyText } from "@/lib/copy";
import { COMPANY_JAMAAH, PPIU_NUMBER } from "@/lib/company";
import { PT_ACCOUNT_HOLDER } from "@/lib/jamaah";
import { getSlotsTaken } from "@/lib/utils";
import { toast } from "sonner";

type Side = "travel" | "paket";

const rowCls =
  "pkg-press flex min-h-14 w-full items-center gap-3 border-b border-pkg-hair py-3 text-left text-[17px] text-pkg-fg last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2";

/** Saves a file from a link: fetched and saved when the host allows it, opened in a new tab when it does not. */
async function downloadFile(url: string, name: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("download failed");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast.success("Gambar diunduh.");
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** The phone's own share menu where it exists (needs https); anywhere else the link is copied. */
async function shareLink(url: string, title: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch {
      /* closed without sharing */
    }
    return;
  }
  void copyText(url, "Link disalin.");
}

function Sheet({ onClose, title, children }: { onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        <div className="pkg-v2 pkg-form min-w-0 !bg-transparent">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="pkg-label text-pkg-fg-2">{label}</h3>
        <button type="button" data-plain onClick={() => void copyText(text, `${label} disalin.`)} className="pkg-press pkg-glass-red pkg-label inline-flex h-11 items-center gap-2 rounded-full px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2">
          <Copy className="h-4 w-4" aria-hidden /> Salin
        </button>
      </div>
      <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-[20px] bg-pkg-cream-2 p-4 font-sans text-[14px] leading-[1.5] text-pkg-fg">{text}</pre>
    </section>
  );
}

function PackageSheet({ pkg, agentCode, onClose }: { pkg: PublishedPackage; agentCode: string; onClose: () => void }) {
  const texts = useMemo(() => buildPackageTexts(pkg, agentCode, window.location.origin), [pkg, agentCode]);
  const date = format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: localeId });
  return (
    <Sheet onClose={onClose} title={pkg.package_name}>
      <p className="-mt-1 text-[16px] text-pkg-fg-2">{date}, {pkg.duration_days} hari</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link to={`/agent/daftar-jamaah?paket=${pkg.id}`} className="pkg-press pkg-glass-red pkg-label inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2">
          <UserPlus className="h-4 w-4" aria-hidden /> Daftarkan
        </Link>
        <Link to={`/agent/packages/${pkg.id}`} className={agentGlass}>Detail paket</Link>
      </div>

      {pkg.banner_image && (
        <section className="mt-6">
          <img src={pkg.banner_image} alt={`Flyer ${pkg.package_name}`} className="max-h-72 w-full rounded-[24px] bg-pkg-cream-2 object-contain" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" data-plain onClick={() => void downloadFile(pkg.banner_image!, `${pkg.package_name}.jpg`)} className={agentGlass}>
              <Download className="h-4 w-4" aria-hidden /> Unduh
            </button>
            <button type="button" data-plain onClick={() => void shareLink(texts.link, pkg.package_name)} className={agentGlass}>
              <Share2 className="h-4 w-4" aria-hidden /> Bagikan ke...
            </button>
          </div>
        </section>
      )}

      <TextBlock label="WA singkat" text={texts.wa_short} />
      <TextBlock label="WA lengkap" text={texts.wa_full} />
      <TextBlock label="Instagram" text={texts.instagram} />

      <section className="mt-6">
        <h3 className="pkg-label text-pkg-fg-2">Link kamu</h3>
        <div className="mt-3 flex items-center gap-2">
          <p className="pkg-glass min-w-0 flex-1 truncate rounded-full px-5 py-3.5 text-[15px]">{texts.link}</p>
          <button type="button" data-plain aria-label="Salin link" onClick={() => void copyText(texts.link, "Link disalin.")} className="pkg-press pkg-glass grid h-12 w-12 shrink-0 place-items-center rounded-full">
            <Copy className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </section>

      {(pkg.catalog_link || pkg.itinerary_link) && (
        <section className="mt-6">
          {pkg.catalog_link && (
            <a href={pkg.catalog_link} target="_blank" rel="noopener noreferrer" className={rowCls}>
              <FileText className="h-5 w-5 text-pkg-fg-3" aria-hidden /> <span className="flex-1">Katalog PDF</span> <ChevronRight className="h-5 w-5 text-pkg-fg-3" aria-hidden />
            </a>
          )}
          {pkg.itinerary_link && (
            <a href={pkg.itinerary_link} target="_blank" rel="noopener noreferrer" className={rowCls}>
              <MapIcon className="h-5 w-5 text-pkg-fg-3" aria-hidden /> <span className="flex-1">Itinerary</span> <ChevronRight className="h-5 w-5 text-pkg-fg-3" aria-hidden />
            </a>
          )}
        </section>
      )}
    </Sheet>
  );
}

const Heading = ({ children }: { children: ReactNode }) => <h2 className="pkg-h3 !text-[26px]">{children}</h2>;

const Skeleton = () => (
  <div className="space-y-3" role="status" aria-label="Memuat">
    {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-[20px] bg-pkg-cream-2" />)}
  </div>
);

function TravelSide({ agentCode }: { agentCode: string }) {
  const { data: points = [] } = useQuery({
    queryKey: ["marketing-selling-points"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("selling_points").select("id, title, description").eq("is_active", true).order("display_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: gallery = [] } = useQuery({
    queryKey: ["marketing-gallery"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("gallery_images").select("id, image_url, title").eq("is_active", true).order("display_order", { ascending: true }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: testimonials = [] } = useTestimonials();
  const [sheet, setSheet] = useState<{ title: string; text: string } | null>(null);
  const [photo, setPhoto] = useState<{ url: string; title: string } | null>(null);
  const site = `${window.location.origin}/r/${agentCode}`;

  const profile = [
    "Musafar Tour: travel umroh yang dirancang untuk keluarga, ramah lansia dan ramah anak.",
    `Berdiri sejak 2022, sudah memberangkatkan ${COMPANY_JAMAAH} jamaah.`,
    ...(points.length ? ["", ...points.map((p) => `• ${p.title}: ${p.description}`)] : []),
    "",
    `Kenalan lebih dekat: ${site}`,
  ].join("\n");
  const legal = [
    `Musafar Tour berizin resmi PPIU Kemenag No. ${PPIU_NUMBER}, dikelola ${PT_ACCOUNT_HOLDER}.`,
    `Berdiri sejak 2022, ${COMPANY_JAMAAH} jamaah sudah berangkat bersama kami.`,
    "",
    `Pembayaran hanya ke rekening atas nama ${PT_ACCOUNT_HOLDER}. Waspada rekening pribadi.`,
    "",
    `Info resmi: ${site}`,
  ].join("\n");

  return (
    <>
      <Heading>Profil dan legalitas</Heading>
      <div className="mt-4">
        <button type="button" data-plain className={rowCls} onClick={() => setSheet({ title: "Profil Musafar", text: profile })}>
          <Package className="h-5 w-5 text-pkg-fg-3" aria-hidden /> <span className="flex-1">Profil dan keunggulan</span> <ChevronRight className="h-5 w-5 text-pkg-fg-3" aria-hidden />
        </button>
        <button type="button" data-plain className={rowCls} onClick={() => setSheet({ title: "Legalitas dan pembayaran", text: legal })}>
          <Star className="h-5 w-5 text-pkg-fg-3" aria-hidden /> <span className="flex-1">Legalitas dan pembayaran</span> <ChevronRight className="h-5 w-5 text-pkg-fg-3" aria-hidden />
        </button>
      </div>

      <div className="mt-12">
        <Heading>Testimoni</Heading>
        {testimonials.length === 0 ? (
          <AgentEmpty icon={MessageSquareQuote} text="Belum ada testimoni" />
        ) : (
          <div className="mt-4">
            {testimonials.slice(0, 8).map((t) => (
              <button key={t.id} type="button" data-plain className={rowCls} onClick={() => setSheet({ title: t.name, text: `"${t.content}"\n\n${t.name}${t.location ? `, ${t.location}` : ""}\n\nMusafar Tour: ${site}` })}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{t.name}</span>
                  <span className="block truncate text-[14px] text-pkg-fg-3">{t.content}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-pkg-fg-3" aria-hidden />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-12">
        <Heading>Galeri</Heading>
        {gallery.length === 0 ? (
          <AgentEmpty icon={ImageIcon} text="Belum ada foto" />
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {gallery.map((g) => (
              <button key={g.id} type="button" data-plain aria-label={g.title || "Foto"} onClick={() => setPhoto({ url: g.image_url, title: g.title || "Musafar Tour" })} className="pkg-press aspect-square overflow-hidden rounded-[18px] bg-pkg-cream-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2">
                <img src={g.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {sheet && (
        <Sheet onClose={() => setSheet(null)} title={sheet.title}>
          <TextBlock label="Teks" text={sheet.text} />
        </Sheet>
      )}
      {photo && (
        <Sheet onClose={() => setPhoto(null)} title={photo.title}>
          <img src={photo.url} alt={photo.title} className="max-h-96 w-full rounded-[24px] bg-pkg-cream-2 object-contain" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" data-plain onClick={() => void downloadFile(photo.url, `${photo.title}.jpg`)} className={agentGlass}>
              <Download className="h-4 w-4" aria-hidden /> Unduh
            </button>
            <button type="button" data-plain onClick={() => void shareLink(photo.url, photo.title)} className={agentGlass}>
              <Share2 className="h-4 w-4" aria-hidden /> Bagikan ke...
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}

function PaketSide({ agentCode }: { agentCode: string }) {
  const { data: packages = [], isLoading, error, refetch, isFetching } = usePublishedPackages();
  const [open, setOpen] = useState<PublishedPackage | null>(null);

  const months = useMemo(() => {
    const groups = new Map<string, PublishedPackage[]>();
    for (const p of packages) {
      const key = format(new Date(p.departure_date), "MMMM yyyy", { locale: localeId });
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    return [...groups.entries()];
  }, [packages]);

  if (isLoading) return <Skeleton />;
  if (error) return <LoadError what="Daftar paket" error={error} onRetry={() => refetch()} retrying={isFetching} />;
  if (packages.length === 0) return <AgentEmpty icon={Package} text="Belum ada paket" />;

  return (
    <>
      {months.map(([month, list], i) => (
        <section key={month} className={i ? "mt-10" : ""}>
          <h2 className="pkg-label capitalize text-pkg-fg-3">{month}</h2>
          <div className="mt-2">
            {list.map((p) => {
              const left = p.slots_total ? Math.max(0, p.slots_total - getSlotsTaken(p)) : null;
              return (
                <button key={p.id} type="button" data-plain className={rowCls} onClick={() => setOpen(p)}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{p.package_name}</span>
                    <span className="block text-[14px] text-pkg-fg-3">
                      {format(new Date(p.departure_date), "d MMM", { locale: localeId })}, {p.duration_days} hari{left !== null ? (left === 0 ? ", penuh" : `, sisa ${left}`) : ""}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-pkg-fg-3" aria-hidden />
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {open && <PackageSheet pkg={open} agentCode={agentCode} onClose={() => setOpen(null)} />}
    </>
  );
}

const AgentMarketingKit = () => {
  const { agent } = useAgentAuth();
  const [side, setSide] = useState<Side>("travel");
  const agentCode = agent?.referral_code ?? "";
  const referral = `${window.location.origin}/r/${agentCode}`;

  return (
    <AgentPage
      title="Marketing"
      hero={
        <>
          <div className="pkg-glass-deep mt-7 flex items-center justify-between gap-3 rounded-full py-1.5 pl-5 pr-1.5">
            <span className="min-w-0 truncate text-[15px]">{referral.replace(/^https?:\/\//, "")}</span>
            <button type="button" data-plain onClick={() => void copyText(referral, "Link kamu disalin.")} className="pkg-press pkg-glass-red pkg-label inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream">
              <Copy className="h-4 w-4" aria-hidden /> Salin
            </button>
          </div>
          <div className="mt-6">
            <Chips<Side>
              label="Bagian"
              value={side}
              onChange={setSide}
              options={[
                { value: "travel", label: "Travel" },
                { value: "paket", label: "Paket" },
              ]}
            />
          </div>
        </>
      }
    >
      <AgentPanel last>
        {side === "travel" ? <TravelSide agentCode={agentCode} /> : <PaketSide agentCode={agentCode} />}
        <p className="mt-12 text-[14px] text-pkg-fg-3">
          Konten buatan sendiri? Kirim ke PIC dulu, dicek kurang dari 24 jam.{" "}
          <a href={agentCsWhatsAppUrl(agent?.name ?? "", agentCode, "Saya mau kirim konten buatan sendiri untuk dicek.")} target="_blank" rel="noopener noreferrer" className="font-medium text-pkg-red-deep underline underline-offset-4">
            Kirim ke PIC
          </a>
        </p>
      </AgentPanel>
    </AgentPage>
  );
};

export default AgentMarketingKit;
