import { forwardRef, type CSSProperties } from "react";
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

/** Single-line truncation so row/header height stays constant regardless of real data text length (long package/hotel names would otherwise wrap and blow past the fixed safe zone). */
const TRUNCATE_STYLE: CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "block",
};
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

        <div className="absolute overflow-hidden" style={{ top: 480, left: 40, width: 1000, height: 1310 }}>
          <table className="border-collapse" style={{ fontSize: 15, width: 1000, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 70 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 230 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 90 }} />
            </colgroup>
            <thead>
              <tr className="bg-black text-white">
                <th className="py-4 px-2 text-left"><div style={TRUNCATE_STYLE}>Sisa Seat</div></th>
                <th className="py-4 px-2 text-left"><div style={TRUNCATE_STYLE}>Keberangkatan</div></th>
                <th className="py-4 px-2 text-left"><div style={TRUNCATE_STYLE}>Judul Paket</div></th>
                <th className="py-4 px-2 text-left"><div style={TRUNCATE_STYLE}>Durasi &amp; Rute</div></th>
                <th className="py-4 px-2 text-left"><div style={TRUNCATE_STYLE}>Maskapai</div></th>
                <th className="py-4 px-2 text-left"><div style={TRUNCATE_STYLE}>Hotel Makkah</div></th>
                <th className="py-4 px-2 text-left"><div style={TRUNCATE_STYLE}>Hotel Madinah</div></th>
                <th className="py-4 px-2 text-right"><div style={TRUNCATE_STYLE}>Harga</div></th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => {
                const seatLabel = getSeatLabel(pkg);
                const isSoldOut = seatLabel === "Sold Out!";
                return (
                  <tr key={pkg.id} className={isSoldOut ? "bg-neutral-200" : "bg-white"}>
                    <td className="py-4 px-2 font-bold"><div style={TRUNCATE_STYLE}>{seatLabel}</div></td>
                    <td className="py-4 px-2"><div style={TRUNCATE_STYLE}>{formatDepartureDate(pkg.departure_date)}</div></td>
                    <td className="py-4 px-2">
                      <div className="font-bold" style={TRUNCATE_STYLE}>{pkg.package_name}</div>
                      <div className="text-neutral-500" style={{ ...TRUNCATE_STYLE, fontSize: 11 }}>{monthLabel(pkg.departure_date)}</div>
                    </td>
                    <td className="py-4 px-2">
                      <div style={TRUNCATE_STYLE}>{pkg.duration_days} Hari</div>
                      <div style={TRUNCATE_STYLE}>{pkg.route}</div>
                    </td>
                    <td className="py-4 px-2"><div style={TRUNCATE_STYLE}>{pkg.flight}</div></td>
                    <td className="py-4 px-2">
                      <div style={TRUNCATE_STYLE}>{pkg.makkah_hotel_name}</div>
                      <div style={TRUNCATE_STYLE}>{"★".repeat(pkg.makkah_hotel_star ?? 0)}</div>
                    </td>
                    <td className="py-4 px-2">
                      <div style={TRUNCATE_STYLE}>{pkg.madinah_hotel_name}</div>
                      <div style={TRUNCATE_STYLE}>{"★".repeat(pkg.madinah_hotel_star ?? 0)}</div>
                    </td>
                    <td className="py-4 px-2 text-right font-bold"><div style={TRUNCATE_STYLE}>Rp {formatPriceJuta(getQuadPrice(pkg))}</div></td>
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
