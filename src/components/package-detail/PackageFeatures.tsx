import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  BedDouble, BookOpen, Bus, Check, CheckCircle2, Droplets, FileCheck2, ImageOff, Luggage, MapPin, Package, Plane, ShieldCheck,
  Backpack, ChevronDown, Compass, Drumstick, Flag, Headphones, TrainFront, Utensils, X, XCircle, type LucideIcon,
} from "lucide-react";
import { useEquipmentItems } from "@/hooks/useEquipmentItems";
import type { ReactNode } from "react";

/** A recognisable icon per kind of item, so the list can be scanned instead of read. */
const ITEM_ICONS: [RegExp, LucideIcon][] = [
  [/bagasi|koper|kabin/i, Luggage],
  [/tiket|pesawat|penerbangan|flight/i, Plane],
  [/visa/i, FileCheck2],
  [/hotel|akomodasi|kamar|penginapan/i, BedDouble],
  [/al ?baik|ayam|fried/i, Drumstick],
  [/makan|meal|konsumsi|catering|snack/i, Utensils],
  [/kereta|haramain/i, TrainFront],
  [/bus|transport|transfer|mobil/i, Bus],
  [/mut[h]?[oa]w{1,2}[iy]f|pembimbing|ustadz|ustaz/i, Compass],
  [/tour leader|team leader|\btl\b/i, Flag],
  [/handling|porter|bandara/i, Luggage],
  [/transmitter|headset|whisper|audio/i, Headphones],
  [/asuransi/i, ShieldCheck],
  [/perlengkapan|ihram|mukena|\btas\b|kain|seragam/i, Backpack],
  [/manasik|buku|doa|bimbingan/i, BookOpen],
  [/zam-?zam|air mineral|\bair\b/i, Droplets],
  [/city tour|ziarah|tour|wisata/i, MapPin],
];
const iconFor = (item: string): LucideIcon => ITEM_ICONS.find(([re]) => re.test(item))?.[1] ?? Check;

const FOLD_AFTER = 3;
const FOLD_PX = 190;

/**
 * A long list that opens in place. Closed: the first rows, fading to transparent, with a "Lihat semua" button.
 * Open: the heading row freezes under the navbar (like frozen panes in a spreadsheet) until the list ends,
 * with a "Tutup" button, so it can be collapsed from anywhere in the list.
 */
function FoldList({ id, title, items, icon, muted = false }: { id: string; title: string; items: string[]; icon: (item: string) => ReactNode; muted?: boolean }) {
  const foldable = items.length > FOLD_AFTER;
  const [open, setOpen] = useState(false);
  const [h, setH] = useState<number | "auto">(foldable ? FOLD_PX : "auto");
  // True while the heading bar is frozen under the navbar. Only then does it get a solid colour and a shadow; in place it
  // stays transparent, so it never shows as a box against the panel's gradient.
  const [stuck, setStuck] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 66), { rootMargin: "-65px 0px 0px 0px", threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const ref = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Height animates between the folded height and the full height; an explicit pixel value is always the start or end
  // (auto cannot be animated), then it settles on auto so the list can reflow.
  const expand = () => {
    const el = bodyRef.current;
    setOpen(true);
    if (!el || still()) return setH("auto");
    setH(el.scrollHeight);
  };
  const collapse = () => {
    const el = bodyRef.current;
    setOpen(false);
    requestAnimationFrame(() => {
      const top = ref.current?.getBoundingClientRect().top ?? 0;
      if (top < 72) ref.current?.scrollIntoView({ block: "start", behavior: still() ? "auto" : "smooth" });
    });
    if (!el || still()) return setH(FOLD_PX);
    setH(el.getBoundingClientRect().height);
    requestAnimationFrame(() => requestAnimationFrame(() => setH(FOLD_PX)));
  };

  // One continuous motion: the heading shrinks, the bar gains its shadow, "Tutup" fades in and "Lihat semua" folds away,
  // all on the same 340 ms curve as the list height. Nothing is mounted or unmounted, so nothing jumps.
  const t = still() ? "none" : "340ms var(--pkg-ease-out)";
  return (
    <section ref={ref} aria-labelledby={id} className="scroll-mt-16">
      <div ref={sentinel} aria-hidden className="h-px" />
      <div
        className="relative z-10 -mx-6 flex items-center justify-between gap-3 px-6"
        style={{
          // Frozen under the navbar only while open; closed, it scrolls away with its section like any heading.
          position: open ? "sticky" : "relative",
          // `top` also offsets a relative element, so it only applies while sticky.
          top: open ? 64 : "auto",
          paddingBlock: open ? 18 : 0,
          // Transparent while closed (the panel's own gradient shows through, no visible band); solid once open and stuck.
          backgroundColor: open && stuck ? "var(--pkg-cream-2)" : "rgb(234 227 214 / 0)",
          boxShadow: open && stuck ? "0 10px 14px -10px rgb(26 21 18 / 0.18)" : "0 10px 14px -10px rgb(26 21 18 / 0)",
          transition: still() ? "none" : `padding ${t}, box-shadow ${t}, background-color ${t}`,
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <h2
            id={id}
            className="leading-none"
            style={{
              fontSize: open ? 24 : 40,
              fontWeight: open ? 400 : 300,
              letterSpacing: open ? "-0.025em" : "-0.035em",
              transition: still() ? "none" : `font-size ${t}, font-weight ${t}, letter-spacing ${t}`,
            }}
          >
            {title}
          </h2>
          <span className="pkg-label inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-pkg-hair px-2 tracking-normal text-pkg-fg-2">{items.length}</span>
        </div>
        {foldable && (
          // Laid over the bar's right edge instead of taking part in the flex row: it needs no room while closed (the
          // heading keeps its full width) and nothing clips its shadow.
          <button
            type="button"
            onClick={collapse}
            aria-expanded={open}
            aria-hidden={!open}
            tabIndex={open ? 0 : -1}
            className="pkg-press pkg-label pkg-glass absolute right-6 top-1/2 inline-flex h-11 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink"
            style={{
              opacity: open ? 1 : 0,
              scale: open ? "1" : "0.92",
              pointerEvents: open ? "auto" : "none",
              transition: still() ? "none" : `opacity ${t}, scale ${t}`,
            }}
          >
            Tutup <ChevronDown className="h-4 w-4 rotate-180" aria-hidden />
          </button>
        )}
      </div>
      <div
        ref={bodyRef}
        className={cn("relative", foldable && "overflow-hidden")}
        style={foldable ? { height: h === "auto" ? "auto" : h, transition: still() ? "none" : "height 340ms var(--pkg-ease-out)" } : undefined}
        onTransitionEnd={(e) => {
          if (e.target === bodyRef.current && open) setH("auto");
        }}
      >
        <ul className="mt-3 divide-y divide-pkg-hair">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-3 py-3">
              {icon(item)}
              <span className={cn("text-base font-normal leading-snug", muted ? "text-pkg-fg-2" : "text-pkg-fg")}>{item}</span>
            </li>
          ))}
        </ul>
        {foldable && (
          <div
            aria-hidden
            className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-pkg-cream-2 transition-opacity duration-300", open ? "opacity-0" : "opacity-100")}
          />
        )}
      </div>
      {foldable && (
        <div
          className="grid"
          style={{
            gridTemplateRows: open ? "0fr" : "1fr",
            opacity: open ? 0 : 1,
            transition: still() ? "none" : `grid-template-rows ${t}, opacity ${t}`,
          }}
          aria-hidden={open}
        >
          <div className="min-h-0 overflow-hidden">
            <button type="button" onClick={expand} aria-expanded={open} tabIndex={open ? -1 : 0} className="pkg-press pkg-label mx-auto mt-1 flex h-12 items-center gap-2 rounded-full pkg-glass-deep px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2">
              Lihat semua <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

interface PackageFeaturesProps {
  includedItems: string[];
  excludedItems: string[];
  /** Phone layout: everything open, flat lists with an icon per item. */
  mobile?: boolean;
}

export function PackageFeatures({
  includedItems,
  excludedItems,
  mobile = false,
}: PackageFeaturesProps) {
  const { data: equipmentItems = [] } = useEquipmentItems();
  if (mobile) {
    // The admin often saves the whole list as one comma-separated line; one row per item reads far better.
    const split = (list: string[]) => list.flatMap((x) => x.split(/[,;\n]+/)).map((t) => t.trim()).filter(Boolean);
    includedItems = split(includedItems);
    excludedItems = split(excludedItems);
    return (
      <div className="space-y-14">
        {includedItems.length > 0 && (
          <FoldList
            id="incl-heading"
            title="Sudah termasuk"
            items={includedItems}
            icon={(item) => {
              const Icon = iconFor(item);
              return (
                <span className="pkg-glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                  <Icon className="h-[18px] w-[18px] text-pkg-ok" aria-hidden />
                </span>
              );
            }}
          />
        )}
        {excludedItems.length > 0 && (
          <FoldList
            id="excl-heading"
            title="Belum termasuk"
            items={excludedItems}
            muted
            icon={() => (
              <span className="pkg-glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                <X className="h-[18px] w-[18px] text-pkg-red-deep" aria-hidden />
              </span>
            )}
          />
        )}
        {equipmentItems.length > 0 && (
          <section aria-labelledby="equip-heading">
            <h2 id="equip-heading" className="pkg-h2">Perlengkapan</h2>
            <div className="-mx-6 mt-4 flex gap-3 overflow-x-auto px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {equipmentItems.map((item) => (
                <figure key={item.id} className="w-24 shrink-0">
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[var(--pkg-r-media)] pkg-tile pkg-glass">
                    {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <ImageOff className="h-6 w-6 text-pkg-fg-3" aria-hidden />}
                  </div>
                  <figcaption className="mt-1.5 text-center text-xs font-medium leading-tight text-pkg-fg">{item.name}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }
  return (
    <div className="mt-8">
      <Accordion type="single" collapsible className="w-full space-y-4" defaultValue="item-2">
        {/* Included & Excluded */}
        {(includedItems.length > 0 || excludedItems.length > 0) && (
          <AccordionItem value="item-2" className="rounded-3xl border border-border/60 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] px-5">
            <AccordionTrigger className="hover:no-underline py-4">
              <span className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Termasuk & Tidak Termasuk
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {includedItems.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-status-ok-fg uppercase mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Termasuk
                    </h4>
                    <ul className="space-y-2">
                      {includedItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-status-ok-fg shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {excludedItems.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-destructive uppercase mb-3 flex items-center gap-2">
                      <XCircle className="h-3.5 w-3.5" /> Tidak Termasuk
                    </h4>
                    <ul className="space-y-2">
                      {excludedItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-destructive shrink-0 font-bold mt-0.5">✕</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Equipment */}
        {equipmentItems.length > 0 && (
          <AccordionItem value="item-3" className="rounded-3xl border border-border/60 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] px-5">
            <AccordionTrigger className="hover:no-underline py-4">
              <span className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Perlengkapan
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {equipmentItems.map((item) => (
                  <div key={item.id} className="text-center">
                    <div className="aspect-square rounded-xl overflow-hidden bg-muted flex items-center justify-center mb-1.5">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageOff className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-xs font-medium">{item.name}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
