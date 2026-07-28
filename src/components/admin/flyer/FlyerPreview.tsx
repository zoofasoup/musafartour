import { forwardRef, useEffect, type CSSProperties } from "react";
import { CheckCircle2, Clock, Plane } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { airlineLogos } from "@/lib/airlineLogos";
import {
  formatDepartureDate,
  formatPriceJuta,
  getQuadPrice,
  getSeatLabel,
  getTierColor,
  monthLabel,
  type FlyerPackage,
} from "@/lib/flyer/flyerData";

interface FlyerPreviewProps {
  packages: FlyerPackage[];
}

/** Single-line, for text that's inherently short and structured (dates, "9 Hari", route codes) - never needs to wrap. */
const LINE_STYLE: CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "block",
};
const CENTER_LINE_STYLE: CSSProperties = { ...LINE_STYLE, textAlign: "center" };
const LEFT_LINE_STYLE: CSSProperties = { ...LINE_STYLE, textAlign: "left" };

/**
 * Header labels wrap normally (2 lines is fine, e.g. "Sisa"/"Seat") rather
 * than truncating - a flyer can't show "Sisa Se..." in its own header.
 * overflowWrap handles single unbroken words like "Keberangkatan" that have
 * no space to wrap on and would otherwise just overflow the column as one
 * line; overflow:hidden clips as a last-resort safety net, not the primary
 * mechanism.
 */
const HEADER_WRAP_STYLE: CSSProperties = {
  textAlign: "center",
  lineHeight: 1.2,
  overflowWrap: "break-word",
  overflow: "hidden",
};

/**
 * Up to 2 lines for free-text that can be genuinely long in real data
 * (package/hotel names) - a flyer can't show a mid-word "..." cutoff, so
 * this gives real names two lines' worth of room (sized so 2 lines still
 * fits the row height budget) before the ellipsis fallback would ever
 * kick in, rather than truncating almost everything to one line.
 */
const CLAMP_2_STYLE: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const CENTER_CLAMP_2_STYLE: CSSProperties = { ...CLAMP_2_STYLE, textAlign: "center" };

/** Same pattern already used in UmrohCalculator.tsx / UmrohCalculatorResult.tsx for loading the Onest font. */
function useOnestFont() {
  useEffect(() => {
    if (document.getElementById("onest-font")) return;
    const link = document.createElement("link");
    link.id = "onest-font";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800;900&display=swap";
    document.head.appendChild(link);
  }, []);
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
    useOnestFont();
    const today = format(new Date(), "d MMMM yyyy", { locale: localeId });

    return (
      <div
        ref={ref}
        className="relative bg-black overflow-hidden"
        style={{ width: 1080, height: 1920, fontFamily: "'Onest', system-ui, sans-serif" }}
      >
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

        <div
          className="absolute overflow-hidden rounded-3xl border border-black/10"
          style={{ top: 480, left: 40, width: 1000, height: 1310 }}
        >
          <table className="border-collapse" style={{ fontSize: 14, width: 1000, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 75 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 165 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 105 }} />
              <col style={{ width: 178 }} />
              <col style={{ width: 178 }} />
              <col style={{ width: 99 }} />
            </colgroup>
            <thead>
              <tr className="bg-black text-white">
                <th className="py-3 px-1"><div style={HEADER_WRAP_STYLE}>Sisa Seat</div></th>
                <th className="py-3 px-1"><div style={HEADER_WRAP_STYLE}>Keberangkatan</div></th>
                <th className="py-3 px-2 text-left"><div style={LINE_STYLE}>Judul Paket</div></th>
                <th className="py-3 px-2 text-left"><div style={{ ...HEADER_WRAP_STYLE, textAlign: "left" }}>Durasi &amp; Rute</div></th>
                <th className="py-3 px-1"><div style={HEADER_WRAP_STYLE}>Maskapai</div></th>
                <th className="py-3 px-1"><div style={HEADER_WRAP_STYLE}>Hotel Makkah</div></th>
                <th className="py-3 px-1"><div style={HEADER_WRAP_STYLE}>Hotel Madinah</div></th>
                <th className="py-3 px-1"><div style={HEADER_WRAP_STYLE}>Harga</div></th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg, i) => {
                const seatLabel = getSeatLabel(pkg);
                const isSoldOut = seatLabel === "Sold Out!";
                const logoSrc = airlineLogos[pkg.flight];
                const rowBorder = i > 0 ? "1px solid #e5e5e5" : "none";
                return (
                  <tr key={pkg.id} className="bg-white">
                    <td className="py-3 px-1 font-bold text-center bg-black text-white" style={{ borderTop: rowBorder }}>
                      {isSoldOut ? (
                        <div style={{ fontSize: 20, lineHeight: 1.05 }}>Sold<br />Out!</div>
                      ) : (
                        <>
                          <div style={{ ...CENTER_LINE_STYLE, fontSize: 32, lineHeight: 1 }}>{seatLabel}</div>
                          <div style={{ ...CENTER_LINE_STYLE, fontSize: 11, fontWeight: 400, lineHeight: 1.1 }} className="text-neutral-400">seat</div>
                        </>
                      )}
                    </td>
                    <td className="py-3 px-1" style={{ borderTop: rowBorder }}>
                      <div style={CENTER_LINE_STYLE}>{formatDepartureDate(pkg.departure_date)}</div>
                    </td>
                    <td className="py-3 px-2" style={{ borderTop: rowBorder }}>
                      <div className="font-bold" style={{ ...CLAMP_2_STYLE, color: getTierColor(pkg) }}>{pkg.package_name}</div>
                      <div className="text-neutral-500" style={{ ...LINE_STYLE, fontSize: 11 }}>{monthLabel(pkg.departure_date)}</div>
                    </td>
                    <td className="py-3 px-2" style={{ borderTop: rowBorder }}>
                      <div style={{ marginBottom: 3 }}>
                        <Clock className="h-3 w-3" style={{ display: "block", marginBottom: 1 }} />
                        <div style={LEFT_LINE_STYLE}>{pkg.duration_days} Hari</div>
                      </div>
                      <div>
                        <Plane className="h-3 w-3" style={{ display: "block", marginBottom: 1 }} />
                        <div style={LEFT_LINE_STYLE}>{pkg.route}</div>
                      </div>
                    </td>
                    <td className="py-3 px-1" style={{ borderTop: rowBorder }}>
                      {logoSrc ? (
                        <img src={logoSrc} alt={pkg.flight} style={{ height: 22, maxWidth: 100, objectFit: "contain", margin: "0 auto" }} />
                      ) : (
                        <div style={CENTER_LINE_STYLE}>{pkg.flight}</div>
                      )}
                    </td>
                    <td className="py-3 px-1" style={{ borderTop: rowBorder }}>
                      <div style={CENTER_CLAMP_2_STYLE}>{pkg.makkah_hotel_name || "—"}</div>
                      {pkg.makkah_hotel_name && (
                        <div className="text-amber-500" style={CENTER_LINE_STYLE}>
                          {"★".repeat(pkg.makkah_hotel_star ?? 0)} <span className="text-neutral-400">/ Setaraf</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-1" style={{ borderTop: rowBorder }}>
                      <div style={CENTER_CLAMP_2_STYLE}>{pkg.madinah_hotel_name || "—"}</div>
                      {pkg.madinah_hotel_name && (
                        <div className="text-amber-500" style={CENTER_LINE_STYLE}>
                          {"★".repeat(pkg.madinah_hotel_star ?? 0)} <span className="text-neutral-400">/ Setaraf</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-1 bg-black text-white" style={{ borderTop: rowBorder, position: "relative" }}>
                      <span
                        className="bg-red-600 text-white rounded-full flex items-center justify-center shrink-0"
                        style={{
                          width: 26,
                          height: 26,
                          fontSize: 10,
                          fontWeight: 700,
                          position: "absolute",
                          left: 0,
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          border: "2px solid white",
                        }}
                      >
                        Rp
                      </span>
                      <div className="font-bold text-center" style={{ fontSize: 30, lineHeight: 1 }}>{formatPriceJuta(getQuadPrice(pkg))}</div>
                    </td>
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
