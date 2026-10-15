import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Calendar, Check, Copy, FileText, Hotel, MapPin, Package, Plane, Route, Share2, Star, UserPlus, X } from "lucide-react";
import { AgentEmpty, AgentPage, AgentPanel, agentGlass, agentPrimary } from "@/components/agent/AgentPage";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { MyCommission } from "@/components/agent/MyCommission";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatCurrency, getTierPrice, getSlotsTaken } from "@/lib/utils";
import { AGENT_PACKAGE_COLUMNS } from "@/hooks/usePackages";
import { useToast } from "@/hooks/use-toast";
import PackageShareModal from "@/components/package-detail/PackageShareModal";
import { LoadError } from "@/components/admin/jamaah/LoadError";

interface PackagePrice {
  quad: number;
  double: number;
  triple: number;
}

interface Package {
  id: string;
  slug?: string | null;
  package_name: string;
  departure_date: string;
  duration_days: number;
  flight: string;
  flight_type: string;
  madinah_hotel_name: string | null;
  madinah_hotel_star: number | null;
  madinah_distance: string | null;
  madinah_duration_walk: string | null;
  makkah_hotel_name: string | null;
  makkah_hotel_star: number | null;
  makkah_distance: string | null;
  makkah_duration_walk: string | null;
  package_price: PackagePrice;
  hemat_package_price?: Partial<PackagePrice> | null;
  five_star_package_price?: Partial<PackagePrice> | null;
  pelataran_package_price?: Partial<PackagePrice> | null;
  available_tiers?: string[] | null;
  banner_image: string | null;
  gallery_images: string[] | null;
  status: string;
  slots_total: number | null;
  slots_filled: number | null;
  slots_booked_online: number | null;
  catalog_link: string | null;
  itinerary_link: string | null;
  included_items: string | null;
  excluded_items: string | null;
  equipment_list: string | null;
}

const AgentPackageDetail = () => {
  const { id: packageId } = useParams();
  const navigate = useNavigate();
  const { agent } = useAgentAuth();
  const { toast } = useToast();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const { data: pkg, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["agent-package", packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select(AGENT_PACKAGE_COLUMNS)
        .eq("id", packageId)
        .single();

      if (error) throw error;
      return data as unknown as Package;
    },
    enabled: !!packageId,
  });

  const formatPrice = (price: number) => formatCurrency(price);

  const getSlotStatus = (pkg: Package) => {
    const total = pkg.slots_total || 40;
    // Seats taken: sheet number or registered jamaah, depending on the package (see getSlotsTaken).
    const filled = getSlotsTaken(pkg);
    const remaining = total - filled;

    if (remaining <= 0) {
      return { status: "full", label: "Penuh", color: "destructive" };
    }
    if (remaining <= 5) {
      return { status: "almost", label: `Hampir penuh (${remaining} kursi)`, color: "warning" };
    }
    return { status: "open", label: `Tersedia (${remaining} kursi)`, color: "success" };
  };

  const renderStars = (count: number | null) => {
    if (!count) return null;
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < count ? "fill-amber text-amber" : "text-muted-foreground"
        }`}
      />
    ));
  };

  const generateSalesScript = () => {
    if (!pkg) return "";
    const lowestPrice = getTierPrice(pkg).quad;
    
    return `🕌 *${pkg.package_name}*

📅 Keberangkatan: ${format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: id })}
⏱️ Durasi: ${pkg.duration_days} Hari

🏨 *Hotel:*
• Makkah: ${pkg.makkah_hotel_name || "-"} ${pkg.makkah_hotel_star ? `(${pkg.makkah_hotel_star}⭐)` : ""}
• Madinah: ${pkg.madinah_hotel_name || "-"} ${pkg.madinah_hotel_star ? `(${pkg.madinah_hotel_star}⭐)` : ""}

✈️ Penerbangan: ${pkg.flight} (${pkg.flight_type})

💰 *Harga mulai dari:* ${formatPrice(lowestPrice)}/pax

📞 Hubungi saya untuk info lebih lanjut dan pendaftaran!
${pkg.slug && agent?.referral_code ? `📝 Daftar langsung: ${window.location.origin}/daftar/${pkg.slug}?ref=${agent.referral_code}` : ""}

${agent?.referral_code ? `Agent ID: ${agent.referral_code}` : ""}`;
  };

  const copySalesScript = async () => {
    const script = generateSalesScript();
    await navigator.clipboard.writeText(script);
    setCopiedScript(true);
    toast({
      title: "Teks promosi disalin!",
      description: "Paste ke WhatsApp atau platform lainnya",
    });
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const shareToWhatsApp = () => {
    const script = generateSalesScript();
    const encoded = encodeURIComponent(script);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  if (error) {
    return (
      <AgentPage title="Paket." back={{ to: "/agent/packages", label: "Semua paket" }}>
        <AgentPanel last><LoadError what="Detail paket" error={error} onRetry={() => refetch()} retrying={isFetching} /></AgentPanel>
      </AgentPage>
    );
  }

  if (isLoading) {
    return (
      <AgentPage title="Paket." back={{ to: "/agent/packages", label: "Semua paket" }}>
        <AgentPanel last><div className="space-y-4"><Skeleton className="h-20 w-full rounded-3xl" /><Skeleton className="h-40 w-full rounded-3xl" /></div></AgentPanel>
      </AgentPage>
    );
  }

  if (!pkg) {
    return (
      <AgentPage title="Paket." back={{ to: "/agent/packages", label: "Semua paket" }}>
        <AgentPanel last><AgentEmpty icon={Package} text="Paket tidak ditemukan" /></AgentPanel>
      </AgentPage>
    );
  }

  const slotStatus = getSlotStatus(pkg);
  const tierPrice = getTierPrice(pkg);

  const includedItems = pkg.included_items?.split("\n").filter(Boolean) || [];
  const excludedItems = pkg.excluded_items?.split("\n").filter(Boolean) || [];

  const hotels = [
    { city: "Makkah", name: pkg.makkah_hotel_name, star: pkg.makkah_hotel_star, distance: pkg.makkah_distance, walk: pkg.makkah_duration_walk },
    { city: "Madinah", name: pkg.madinah_hotel_name, star: pkg.madinah_hotel_star, distance: pkg.madinah_distance, walk: pkg.madinah_duration_walk },
  ].filter((h) => h.name);

  return (
    <>
    <AgentPage
      title={pkg.package_name}
      back={{ to: "/agent/packages", label: "Semua paket" }}
      hero={
        <>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 text-[15px] text-pkg-fg-2">
            <Calendar className="h-4 w-4" aria-hidden />
            <span>{format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: id })}</span>
            <span aria-hidden>·</span>
            <span>{pkg.duration_days} hari</span>
            <span aria-hidden>·</span>
            <span>{slotStatus.status === "full" ? "Penuh" : slotStatus.status === "almost" ? "Hampir penuh" : "Tersedia"}</span>
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={shareToWhatsApp} className={agentPrimary}>
              <WhatsAppIcon className="h-5 w-5" /> Kirim via WhatsApp
            </button>
            <Link to={`/agent/daftar-jamaah?paket=${pkg.id}`} className="pkg-press pkg-glass pkg-label inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream focus-visible:ring-offset-2 focus-visible:ring-offset-pkg-ink">
              <UserPlus className="h-5 w-5" aria-hidden /> Daftarkan jamaah
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={copySalesScript} className="pkg-press pkg-glass pkg-label inline-flex h-11 items-center gap-2 rounded-full px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream">
              {copiedScript ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />} {copiedScript ? "Tersalin" : "Salin teks"}
            </button>
            <button type="button" onClick={() => setShareModalOpen(true)} className="pkg-press pkg-glass pkg-label inline-flex h-11 items-center gap-2 rounded-full px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream">
              <Share2 className="h-4 w-4" aria-hidden /> Lainnya
            </button>
          </div>
        </>
      }
    >
      <AgentPanel>
        <h2 className="pkg-h3">Harga dan komisi</h2>
        <ul className="mt-5 divide-y divide-pkg-hair">
          {[
            ["Quad", tierPrice.quad],
            ["Triple", tierPrice.triple],
            ["Double", tierPrice.double],
          ].map(([label, price]) => (
            <li key={label as string} className="flex items-baseline justify-between gap-4 py-4">
              <span className="text-[16px] text-pkg-fg-2">{label}</span>
              <span className="text-[22px] font-light tracking-[-0.02em] text-pkg-fg">{formatPrice(price as number)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6"><MyCommission packageId={pkg.id} variant="detail" /></div>
      </AgentPanel>

      <AgentPanel tone="cream-2">
        <h2 className="pkg-h3">Penerbangan dan hotel</h2>
        <div className="mt-5 flex items-center gap-3 text-[17px] text-pkg-fg">
          <Plane className="h-5 w-5 shrink-0 text-pkg-fg-3" aria-hidden />
          <span>{pkg.flight}</span>
          <span className="pkg-label rounded-full bg-pkg-cream px-3 py-1 text-[13px]">{pkg.flight_type}</span>
        </div>
        {hotels.length === 0 ? (
          <AgentEmpty icon={Hotel} text="Belum ada data hotel" />
        ) : (
          <ul className="mt-4 divide-y divide-pkg-hair">
            {hotels.map((h) => (
              <li key={h.city} className="py-5">
                <p className="pkg-caption text-pkg-fg-3">{h.city}</p>
                <p className="mt-1 flex items-center gap-2 text-[19px] text-pkg-fg">
                  {h.name}
                  {h.star ? <span className="inline-flex items-center gap-1 text-[14px] text-pkg-fg-3"><Star className="h-3.5 w-3.5 fill-current" aria-hidden />{h.star}</span> : null}
                </p>
                {(h.distance || h.walk) && (
                  <p className="mt-1 flex items-center gap-1.5 text-[14px] text-pkg-fg-3"><MapPin className="h-3.5 w-3.5" aria-hidden />{[h.distance, h.walk && `${h.walk} jalan kaki`].filter(Boolean).join(" · ")}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </AgentPanel>

      <AgentPanel>
        <h2 className="pkg-h3">Termasuk</h2>
        {includedItems.length > 0 ? (
          <ul className="mt-5 space-y-3">
            {includedItems.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-[16px] leading-[1.4] text-pkg-fg"><Check className="mt-0.5 h-5 w-5 shrink-0 text-pkg-ok" aria-hidden />{item}</li>
            ))}
          </ul>
        ) : (
          <AgentEmpty icon={Check} text="Belum ada data" />
        )}
        {excludedItems.length > 0 && (
          <>
            <h2 className="pkg-h3 mt-12">Belum termasuk</h2>
            <ul className="mt-5 space-y-3">
              {excludedItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-[16px] leading-[1.4] text-pkg-fg-2"><X className="mt-0.5 h-5 w-5 shrink-0 text-pkg-red-deep" aria-hidden />{item}</li>
              ))}
            </ul>
          </>
        )}
      </AgentPanel>

      <AgentPanel tone="cream-2" last>
        <h2 className="pkg-h3">Materi</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          {pkg.catalog_link && (
            <a href={pkg.catalog_link} target="_blank" rel="noopener noreferrer" className={agentGlass}><FileText className="h-5 w-5" aria-hidden /> Katalog PDF</a>
          )}
          {pkg.itinerary_link && (
            <a href={pkg.itinerary_link} target="_blank" rel="noopener noreferrer" className={agentGlass}><Route className="h-5 w-5" aria-hidden /> Itinerary PDF</a>
          )}
        </div>
        <details className="mt-6">
          <summary className="pkg-label inline-flex min-h-11 cursor-pointer items-center text-pkg-red-deep underline underline-offset-4">Lihat teks promosi</summary>
          <pre className="mt-3 whitespace-pre-wrap rounded-[20px] bg-pkg-cream p-4 font-mono text-[13px] leading-[1.5] text-pkg-fg-2">{generateSalesScript()}</pre>
        </details>
      </AgentPanel>
    </AgentPage>

    <PackageShareModal
      open={shareModalOpen}
      onOpenChange={setShareModalOpen}
      package={pkg}
      agentCode={agent?.referral_code || ""}
    />
    </>
  );
};

export default AgentPackageDetail;
