import { forwardRef, useEffect, type CSSProperties } from "react";
import { CheckCircle2, Clock, Plane } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { airlineLogos } from "@/lib/airlineLogos";
import { ONEST_FONT_BASE64 } from "@/lib/flyer/onestFont";
import {
  formatDepartureDate,
  formatPriceJuta,
  getQuadPrice,
  getSeatLabel,
  getTierColor,
  monthLabel,
  splitTwoLines,
  type FlyerPackage,
} from "@/lib/flyer/flyerData";

interface FlyerPreviewProps {
  packages: FlyerPackage[];
}

/**
 * Single-line, for text that's inherently short and structured (dates,
 * "9 Hari", route codes, and the JS-pre-truncated title/hotel-name lines
 * from splitTwoLines) - never needs horizontal truncation, so no
 * overflow:hidden. Confirmed root cause of a real-world export bug:
 * overflow:hidden on an auto-height div is a live html2canvas clipping
 * risk regardless of how much line-height margin it's given - it can
 * mis-measure the wrapped/rendered height of custom-webfont text and
 * clip the glyphs' tops against that hidden boundary. Every string that
 * reaches this style is already length-bounded elsewhere (splitTwoLines,
 * or a fixed short format), so the ellipsis safety net was pure
 * downside once it started causing that.
 */
const LINE_STYLE: CSSProperties = {
  whiteSpace: "nowrap",
  display: "block",
  lineHeight: 1.2,
};
const CENTER_LINE_STYLE: CSSProperties = { ...LINE_STYLE, textAlign: "center" };
const LEFT_LINE_STYLE: CSSProperties = { ...LINE_STYLE, textAlign: "left" };

/**
 * Forces vertical centering of a cell's content via flexbox instead of
 * the table cell's own vertical-align:middle. Confirmed html2canvas
 * limitation: when a row's height is stretched by a sibling cell with
 * more lines (e.g. a hotel name + star rating vs. a lone "-" placeholder
 * with no star line), html2canvas doesn't re-center the shorter cell's
 * content within that stretched height - it pins it near the top. The
 * live browser renders this correctly; only the canvas export doesn't.
 */
const CELL_CENTER_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  height: "100%",
};

/**
 * Header labels wrap normally (2 lines is fine, e.g. "Sisa"/"Seat") rather
 * than truncating - a flyer can't show "Sisa Se..." in its own header.
 * overflowWrap handles single unbroken words like "Keberangkatan" that have
 * no space to wrap on and would otherwise just overflow the column as one
 * line. Uses a fixed height + flex centering rather than auto-height:
 * confirmed html2canvas can mis-measure the auto height of wrapped bold
 * text and clip the top of the glyphs against an ancestor's overflow -
 * a static height it never has to compute removes that risk entirely.
 */
const HEADER_WRAP_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  lineHeight: 1.25,
  overflowWrap: "break-word",
  height: 38,
};

/** Alternating header cell background, left to right. */
const HEADER_CELL_COLORS = ["#000000", "#262626", "#000000", "#262626", "#000000", "#262626", "#000000", "#262626"];

/**
 * Embeds Onest via a data-URI @font-face instead of the Google Fonts
 * <link> pattern used elsewhere (UmrohCalculator.tsx etc.) - see
 * onestFont.ts for why: html2canvas re-fetches fonts on every capture
 * rather than reusing the browser's loaded font, and a network-loaded
 * font is a real, confirmed source of export-only text-position drift.
 * A data URI has nothing left to fetch.
 */
function useOnestFont() {
  useEffect(() => {
    if (document.getElementById("onest-font")) return;
    const style = document.createElement("style");
    style.id = "onest-font";
    style.textContent = `
      @font-face {
        font-family: 'Onest';
        font-style: normal;
        font-weight: 400;
        src: url(data:font/woff2;base64,${ONEST_FONT_BASE64}) format('woff2');
      }
      @font-face {
        font-family: 'Onest';
        font-style: normal;
        font-weight: 700;
        src: url(data:font/woff2;base64,${ONEST_FONT_BASE64}) format('woff2');
      }
    `;
    document.head.appendChild(style);
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
          className="absolute flex items-center"
          style={{ top: 480, left: 40, width: 1000, height: 1310 }}
        >
          <div className="overflow-hidden rounded-3xl border border-black/10" style={{ width: 1000 }}>
            <table className="border-collapse" style={{ fontSize: 14, width: 1000, tableLayout: "fixed", letterSpacing: "-0.02em" }}>
              <colgroup>
                <col style={{ width: 95 }} />
                <col style={{ width: 115 }} />
                <col style={{ width: 165 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 105 }} />
                <col style={{ width: 157 }} />
                <col style={{ width: 158 }} />
                <col style={{ width: 95 }} />
              </colgroup>
              <thead>
                <tr className="text-white">
                  <th className="py-2 px-1" style={{ backgroundColor: HEADER_CELL_COLORS[0] }}><div style={HEADER_WRAP_STYLE}>Sisa Seat</div></th>
                  <th className="py-2 px-1" style={{ backgroundColor: HEADER_CELL_COLORS[1] }}><div style={HEADER_WRAP_STYLE}>Keberangkatan</div></th>
                  <th className="py-2 px-2" style={{ backgroundColor: HEADER_CELL_COLORS[2] }}><div style={HEADER_WRAP_STYLE}>Judul Paket</div></th>
                  <th className="py-2 px-2 text-left" style={{ backgroundColor: HEADER_CELL_COLORS[3] }}><div style={{ ...HEADER_WRAP_STYLE, textAlign: "left", justifyContent: "flex-start" }}>Durasi &amp; Rute</div></th>
                  <th className="py-2 px-1" style={{ backgroundColor: HEADER_CELL_COLORS[4] }}><div style={HEADER_WRAP_STYLE}>Maskapai</div></th>
                  <th className="py-2 px-1" style={{ backgroundColor: HEADER_CELL_COLORS[5] }}><div style={HEADER_WRAP_STYLE}>Hotel Makkah</div></th>
                  <th className="py-2 px-1" style={{ backgroundColor: HEADER_CELL_COLORS[6] }}><div style={HEADER_WRAP_STYLE}>Hotel Madinah</div></th>
                  <th className="py-2 px-1" style={{ backgroundColor: HEADER_CELL_COLORS[7] }}><div style={HEADER_WRAP_STYLE}>Harga</div></th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg, i) => {
                  const seatLabel = getSeatLabel(pkg);
                  const isSoldOut = seatLabel === "Sold Out!";
                  const logoSrc = airlineLogos[pkg.flight];
                  const rowBorder = i > 0 ? "1px solid rgba(0,0,0,0.5)" : "none";
                  const [titleLine1, titleLine2] = splitTwoLines(pkg.package_name, 17);
                  const [makkahLine1, makkahLine2] = splitTwoLines(pkg.makkah_hotel_name || "—", 17);
                  const [madinahLine1, madinahLine2] = splitTwoLines(pkg.madinah_hotel_name || "—", 17);
                  return (
                    <tr key={pkg.id} className="bg-white">
                      <td className="py-2 px-1 font-bold text-center bg-black text-white" style={{ borderTop: rowBorder }}>
                        <div style={CELL_CENTER_STYLE}>
                          {isSoldOut ? (
                            <div style={{ textAlign: "center", fontSize: 20, lineHeight: 1.2 }}>Sold<br />Out!</div>
                          ) : (
                            <>
                              <div style={{ textAlign: "center", fontSize: 32, lineHeight: 1.2 }}>{seatLabel}</div>
                              <div style={{ textAlign: "center", fontSize: 11, fontWeight: 400, lineHeight: 1.2, marginTop: -2 }} className="text-neutral-400">seat</div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-1" style={{ borderTop: rowBorder }}>
                        <div style={CELL_CENTER_STYLE}>
                          <div className="font-bold" style={{ ...CENTER_LINE_STYLE, fontSize: 13 }}>{formatDepartureDate(pkg.departure_date)}</div>
                        </div>
                      </td>
                      <td className="py-2 px-2" style={{ borderTop: rowBorder }}>
                        <div style={CELL_CENTER_STYLE}>
                          <div className="font-bold" style={{ ...LINE_STYLE, color: getTierColor(pkg) }}>{titleLine1}</div>
                          {titleLine2 && (
                            <div className="font-bold" style={{ ...LINE_STYLE, color: getTierColor(pkg) }}>{titleLine2}</div>
                          )}
                          <div className="text-neutral-500" style={{ ...LINE_STYLE, fontSize: 11 }}>{monthLabel(pkg.departure_date)}</div>
                        </div>
                      </td>
                      <td className="py-2 px-2" style={{ borderTop: rowBorder }}>
                        <div style={CELL_CENTER_STYLE}>
                          <div className="flex items-center gap-1" style={{ marginBottom: 2 }}>
                            <Clock className="h-3 w-3 shrink-0" />
                            <div style={LEFT_LINE_STYLE}>{pkg.duration_days} Hari</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Plane className="h-3 w-3 shrink-0" />
                            <div style={LEFT_LINE_STYLE}>{pkg.route}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-1" style={{ borderTop: rowBorder }}>
                        <div style={CELL_CENTER_STYLE}>
                          {logoSrc ? (
                            <img src={logoSrc} alt={pkg.flight} style={{ height: 22, maxWidth: 100, objectFit: "contain", margin: "0 auto" }} />
                          ) : (
                            <div style={CENTER_LINE_STYLE}>{pkg.flight}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-1" style={{ borderTop: rowBorder }}>
                        <div style={CELL_CENTER_STYLE}>
                          <div style={CENTER_LINE_STYLE}>{makkahLine1}</div>
                          {makkahLine2 && <div style={CENTER_LINE_STYLE}>{makkahLine2}</div>}
                          {pkg.makkah_hotel_name && (
                            <div className="text-amber-500" style={{ ...CENTER_LINE_STYLE, fontSize: 11 }}>
                              {"★".repeat(pkg.makkah_hotel_star ?? 0)} <span className="text-neutral-400">/ Setaraf</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-1" style={{ borderTop: rowBorder }}>
                        <div style={CELL_CENTER_STYLE}>
                          <div style={CENTER_LINE_STYLE}>{madinahLine1}</div>
                          {madinahLine2 && <div style={CENTER_LINE_STYLE}>{madinahLine2}</div>}
                          {pkg.madinah_hotel_name && (
                            <div className="text-amber-500" style={{ ...CENTER_LINE_STYLE, fontSize: 11 }}>
                              {"★".repeat(pkg.madinah_hotel_star ?? 0)} <span className="text-neutral-400">/ Setaraf</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-1 bg-black text-white" style={{ borderTop: rowBorder, position: "relative" }}>
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
                          }}
                        >
                          Rp
                        </span>
                        <div style={CELL_CENTER_STYLE}>
                          <div className="font-bold text-center" style={{ fontSize: 30, lineHeight: 1.2 }}>{formatPriceJuta(getQuadPrice(pkg))}</div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
);
FlyerPreview.displayName = "FlyerPreview";
