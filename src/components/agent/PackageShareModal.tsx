import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Copy, Facebook, Instagram, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

interface PackagePrice {
  quad: number;
  double: number;
  triple: number;
}

interface Package {
  id: string;
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
  commission_rate: number | null;
}

interface PackageShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  package: Package;
  agentCode: string;
}

const PackageShareModal = ({
  open,
  onOpenChange,
  package: pkg,
  agentCode,
}: PackageShareModalProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/paket-umroh/${pkg.id}${agentCode ? `?ref=${agentCode}` : ""}`;

  const formatPrice = (price: number) => formatCurrency(price);

  const generateShareText = () => {
    return `🕌 *${pkg.package_name}*

📅 Keberangkatan: ${format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: id })}
⏱️ Durasi: ${pkg.duration_days} Hari

🏨 Hotel:
• Makkah: ${pkg.makkah_hotel_name || "-"} ${pkg.makkah_hotel_star ? `(${pkg.makkah_hotel_star}⭐)` : ""}
• Madinah: ${pkg.madinah_hotel_name || "-"} ${pkg.madinah_hotel_star ? `(${pkg.madinah_hotel_star}⭐)` : ""}

✈️ ${pkg.flight} (${pkg.flight_type})

💰 Harga mulai: ${formatPrice(pkg.package_price.quad)}/pax

🔗 Info lebih lanjut: ${shareUrl}`;
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({
      title: "Link disalin!",
      description: "Link paket sudah disalin ke clipboard",
    });
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
    navigator.clipboard.writeText(text);
    toast({
      title: "Text disalin untuk Instagram!",
      description: "Paste ke caption Instagram Story atau Post",
    });
    onOpenChange(false);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: pkg.package_name,
          text: generateShareText(),
          url: shareUrl,
        });
        onOpenChange(false);
      } catch (err) {
        console.log("Share cancelled");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Paket
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Package Summary */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="font-semibold">{pkg.package_name}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: id })} •{" "}
              {pkg.duration_days} Hari
            </p>
          </div>

          {/* Copy Link */}
          <div className="space-y-2">
            <Label>Link Paket</Label>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="text-sm" />
              <Button size="icon" variant="outline" onClick={copyLink}>
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {agentCode && (
              <p className="text-xs text-muted-foreground">
                Kode referral kamu ({agentCode}) sudah termasuk di link
              </p>
            )}
          </div>

          {/* Share Buttons */}
          <div className="space-y-2">
            <Label>Share ke Platform</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="bg-[#25D366] hover:bg-[#128C7E] text-white"
                onClick={shareToWhatsApp}
              >
                <svg
                  className="h-5 w-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </Button>

              <Button
                className="bg-[#1877F2] hover:bg-[#166FE5] text-white"
                onClick={shareToFacebook}
              >
                <Facebook className="h-5 w-5 mr-2" />
                Facebook
              </Button>

              <Button
                className="bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white"
                onClick={shareToInstagram}
              >
                <Instagram className="h-5 w-5 mr-2" />
                Instagram
              </Button>

              {navigator.share && (
                <Button variant="outline" onClick={nativeShare}>
                  <Share2 className="h-5 w-5 mr-2" />
                  Lainnya
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PackageShareModal;
