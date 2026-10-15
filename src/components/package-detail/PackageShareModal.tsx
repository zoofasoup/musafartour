import { useCallback, useState, type ReactNode } from "react";
import { copyText } from "@/lib/copy";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Facebook, Instagram, Link2, Share2, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSwipeDownClose } from "@/hooks/useSwipeDownClose";
import "@/styles/pkg-v2.css";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatCurrency, getTierPrice } from "@/lib/utils";

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
  makkah_hotel_name: string | null;
  makkah_hotel_star: number | null;
  package_price: PackagePrice;
  hemat_package_price?: Partial<PackagePrice> | null;
  five_star_package_price?: Partial<PackagePrice> | null;
  pelataran_package_price?: Partial<PackagePrice> | null;
  available_tiers?: string[] | null;
}

interface PackageShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  package: Package;
  agentCode: string;
  /** "pkg": the phone sheet in the pkg-v2 look. */
  variant?: "pkg";
}

const PackageShareModal = ({
  open,
  onOpenChange,
  package: pkg,
  agentCode,
  variant,
}: PackageShareModalProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const closeSheet = useCallback(() => onOpenChange(false), [onOpenChange]);
  useSwipeDownClose(panel, closeSheet);

  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/paket-umroh/${pkg.slug || pkg.id}${agentCode ? `?ref=${agentCode}` : ""}`;

  const formatPrice = (price: number) => formatCurrency(price);

  const generateShareText = () => {
    return `🕌 *${pkg.package_name}*

📅 Keberangkatan: ${format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: id })}
⏱️ Durasi: ${pkg.duration_days} Hari

🏨 Hotel:
• Makkah: ${pkg.makkah_hotel_name || "-"} ${pkg.makkah_hotel_star ? `(${pkg.makkah_hotel_star}⭐)` : ""}
• Madinah: ${pkg.madinah_hotel_name || "-"} ${pkg.madinah_hotel_star ? `(${pkg.madinah_hotel_star}⭐)` : ""}

✈️ ${pkg.flight} (${pkg.flight_type})

💰 Harga mulai: ${formatPrice(getTierPrice(pkg).quad)}/pax

🔗 Info lebih lanjut: ${shareUrl}`;
  };

  const copyLink = async () => {
    if (!(await copyText(shareUrl, "Link paket disalin."))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToWhatsApp = () => {
    const text = generateShareText();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
    onOpenChange(false);
  };

  const shareToFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
    onOpenChange(false);
  };

  const shareToInstagram = () => {
    // Instagram doesn't have a direct share URL, so we copy the text
    const text = generateShareText();
    void copyText(text, "Teks disalin. Tempel ke caption Instagram.");
    onOpenChange(false);
  };

  const nativeShare = async () => {
    // The phone's own share menu needs https and a browser that has it; anywhere else the link is copied instead.
    if (!navigator.share) {
      void copyText(shareUrl, "Link paket disalin.");
      return;
    }
    try {
      await navigator.share({ title: pkg.package_name, text: generateShareText(), url: shareUrl });
      onOpenChange(false);
    } catch {
      // closed without sharing
    }
  };

  const dateText = format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: id });

  // Like the share row of a social app: round buttons with a label under each, the row scrolls sideways.
  const actions: { key: string; label: string; icon: ReactNode; onClick: () => void; red?: boolean }[] = [
    { key: "copy", label: copied ? "Tersalin" : "Salin link", icon: copied ? <Check className="h-6 w-6 text-pkg-ok" aria-hidden /> : <Link2 className="h-6 w-6" aria-hidden />, onClick: copyLink },
    { key: "more", label: "Bagikan ke...", icon: <Share2 className="h-6 w-6" aria-hidden />, onClick: nativeShare },
    { key: "wa", label: "WhatsApp", icon: <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>, onClick: shareToWhatsApp, red: true },
    { key: "fb", label: "Facebook", icon: <Facebook className="h-6 w-6" aria-hidden />, onClick: shareToFacebook },
    { key: "ig", label: "Instagram", icon: <Instagram className="h-6 w-6" aria-hidden />, onClick: shareToInstagram },
  ];
  const shareBody = (
    <>
      <ul className="-mx-6 -my-4 mt-6 flex gap-4 overflow-x-auto px-6 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {actions.map((a) => (
          <li key={a.key} className="w-[76px] shrink-0">
            <button
              type="button"
              onClick={a.onClick}
              className="pkg-press flex w-full flex-col items-center gap-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
            >
              <span className={`${a.red ? "pkg-glass-red text-pkg-on-red" : "pkg-glass"} grid h-16 w-16 place-items-center rounded-full`}>{a.icon}</span>
              <span className="text-[13px] font-normal leading-tight text-pkg-fg-2">{a.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 truncate text-[13px] font-normal text-pkg-fg-3">{shareUrl}</p>
      {agentCode && <p className="mt-1 text-[13px] font-normal text-pkg-fg-3">Agent ID kamu ({agentCode}) sudah ada di link.</p>}
    </>
  );

  if (variant === "pkg") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" overlayClassName="pkg-overlay" className="pkg-v2 pkg-float border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Bagikan paket</SheetTitle>
          </SheetHeader>
          <div ref={setPanel} data-pkg-tone="cream" className="pkg-panel pkg-panel-sheet">
            <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-pkg-hair" aria-hidden />
            <SheetClose asChild>
              <button type="button" aria-label="Tutup" className="pkg-press pkg-glass absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </SheetClose>

            <h2 className="pkg-sub">Bagikan paket</h2>
            <p className="pkg-label mt-2 text-pkg-fg-2">{pkg.package_name}, {dateText}, {pkg.duration_days} hari</p>

            {shareBody}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[32px] border-0 bg-[#fbf8f2] p-7 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bagikan paket</DialogTitle>
        </DialogHeader>
        <div className="pkg-v2 pkg-form min-w-0 !bg-transparent">
          <p className="pkg-label -mt-1 text-pkg-fg-2">{pkg.package_name}, {dateText}, {pkg.duration_days} hari</p>
          {shareBody}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PackageShareModal;
