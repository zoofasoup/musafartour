import { forwardRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  formatDepartureDate,
  formatPriceJuta,
  getQuadPrice,
  getSeatLabel,
  monthLabel,
  type FlyerPackage,
} from "@/lib/flyer/flyerData";

interface FlyerPreviewProps {
  packages: FlyerPackage[];
}

/**
 * Rendered at true 1080x1920px (never scaled internally - the parent page
 * scales the whole node down visually for on-screen display via a CSS
 * transform). html2canvas would otherwise pick up that ancestor transform
 * when computing bounding rects in its cloned document, capturing a
 * shrunken flyer instead of the full-size one - the export helper
 * (flyerExport.ts) neutralizes the scaling wrapper's transform during
 * capture via html2canvas's `onclone` hook, which runs only in the clone
 * so the on-screen preview is unaffected.
 */
export const FlyerPreview = forwardRef<HTMLDivElement, FlyerPreviewProps>(
  ({ packages }, ref) => {
    const today = format(new Date(), "d MMMM yyyy", { locale: localeId });

    return (
      <div ref={ref} className="relative bg-black overflow-hidden" style={{ width: 1080, height: 1920 }}>
        <img
          src="/flyer/background.png"
          alt=""
          crossOrigin="anonymous"
          className="absolute inset-0 object-cover"
          style={{ width: 1080, height: 1920 }}
        />

        <div
          className="absolute flex items-center gap-2 bg-neutral-900/90 text-white rounded-full px-4 py-2"
          style={{ top: 24, left: 24 }}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-semibold">Diperbarui {today}</span>
        </div>

        <div className="absolute" style={{ top: 480, left: 40, width: 1000, height: 1310 }}>
          <table className="w-full border-collapse" style={{ fontSize: 15 }}>
            <thead>
              <tr className="bg-black text-white">
                <th className="py-4 px-2 text-left">Sisa Seat</th>
                <th className="py-4 px-2 text-left">Keberangkatan</th>
                <th className="py-4 px-2 text-left">Judul Paket</th>
                <th className="py-4 px-2 text-left">Durasi &amp; Rute</th>
                <th className="py-4 px-2 text-left">Maskapai</th>
                <th className="py-4 px-2 text-left">Hotel Makkah</th>
                <th className="py-4 px-2 text-left">Hotel Madinah</th>
                <th className="py-4 px-2 text-right">Harga</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => {
                const seatLabel = getSeatLabel(pkg);
                const isSoldOut = seatLabel === "Sold Out!";
                return (
                  <tr key={pkg.id} className={isSoldOut ? "bg-neutral-200" : "bg-white"}>
                    <td className="py-4 px-2 font-bold">{seatLabel}</td>
                    <td className="py-4 px-2">{formatDepartureDate(pkg.departure_date)}</td>
                    <td className="py-4 px-2">
                      <div className="font-bold">{pkg.package_name}</div>
                      <div className="text-neutral-500" style={{ fontSize: 11 }}>{monthLabel(pkg.departure_date)}</div>
                    </td>
                    <td className="py-4 px-2">
                      {pkg.duration_days} Hari
                      <br />
                      {pkg.route}
                    </td>
                    <td className="py-4 px-2">{pkg.flight}</td>
                    <td className="py-4 px-2">
                      {pkg.makkah_hotel_name}
                      <br />
                      {"★".repeat(pkg.makkah_hotel_star ?? 0)}
                    </td>
                    <td className="py-4 px-2">
                      {pkg.madinah_hotel_name}
                      <br />
                      {"★".repeat(pkg.madinah_hotel_star ?? 0)}
                    </td>
                    <td className="py-4 px-2 text-right font-bold">Rp {formatPriceJuta(getQuadPrice(pkg))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);
FlyerPreview.displayName = "FlyerPreview";
