import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Armchair, Bell, Star } from "lucide-react";
import { PkgCartButton } from "@/components/package-list/PkgCartButton";
import { LazyImage } from "@/components/ui/lazy-image";
import { useFavorites } from "@/hooks/useFavorites";
import { toRupiah } from "@/lib/tracking";
import { getOptimizedImageUrl, cn } from "@/lib/utils";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { airlineLogos } from "@/lib/airlineLogos";

export interface PkgListCardProps {
  id?: string;
  slug?: string;
  image: string;
  title: string;
  /** Display text ("35,9 Juta"); used for the cart entry and as a fallback. */
  price: string;
  /** Quad price in rupiah. */
  priceValue?: number;
  date: string;
  /** Short form for narrow (two-column) cards, e.g. "27 Okt 2026". */
  dateShort?: string;
  duration: string;
  airline: string;
  hotelMakkah?: string;
  hotelMakkahRating?: number;
  hotelMadinah?: string;
  hotelMadinahRating?: number;
  isSoldOut?: boolean;
  waitlistCount?: number;
  slotsTotal?: number | null;
  slotsFilled?: number | null;
  index?: number;
  className?: string;
  /** DOM id for the cart button so the product tour can point at it. */
  cartButtonTourId?: string;
}

/** Rupiah -> "35.9" (dot, as on the package page). */
const toJt = (n?: number) => (n && n >= 1_000_000 ? (n / 1_000_000).toFixed(1).replace(/\.0$/, "") : null);

/**
 * A package in the list, flat: the photo carries the card, the text sits on the panel (no box, no border).
 * Glass pills over the photo for seats and the cart. The whole card is one real link (stretched).
 */
export function PkgListCard({
  id, slug, image, title, price, priceValue, date, dateShort, duration, airline,
  hotelMakkah, hotelMakkahRating, hotelMadinah, hotelMadinahRating,
  isSoldOut = false, waitlistCount = 0, slotsTotal, slotsFilled, index = 0, className, cartButtonTourId,
}: PkgListCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const packageId = id || slug || "";
  const isFav = isFavorite(packageId);
  const href = slug || id ? `/paket-umroh/${slug || id}` : undefined;
  const remaining = slotsTotal ? Math.max(0, slotsTotal - (slotsFilled || 0)) : null;
  const urgent = slotsTotal ? Math.round(((slotsFilled || 0) / slotsTotal) * 100) >= 80 : false;
  const jt = toJt(priceValue);
  // Full month name when the date and duration fit on one line, otherwise the short month. Measured, so it follows
  // the real card width and the real month ("September" vs "Mei"). The attribute is set before paint, no flicker.
  const headRef = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const dateEl = el.querySelector<HTMLElement>(".pkg-card-date");
    const over = () => !!dateEl && dateEl.scrollWidth > dateEl.clientWidth + 1;
    // long month -> short month -> short month at a smaller size; the first one that fits wins.
    const check = () => {
      el.dataset.dates = "long";
      if (!over()) return;
      el.dataset.dates = "short";
      if (!over()) return;
      el.dataset.dates = "tiny";
    };
    check();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
    ro?.observe(el);
    if (dateEl) ro?.observe(dateEl);
    // The webfont changes the text width after first paint.
    document.fonts?.ready.then(check).catch(() => undefined);
    return () => ro?.disconnect();
  }, [date, dateShort, duration]);
  const src = getOptimizedImageUrl(image, 700) || "/placeholder.svg";

  const onCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite({ id: packageId, slug, title, image, price: jt ? `${jt} Jt` : price, date, value: priceValue ?? toRupiah(price) });
  };
  const onWaitlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    redirectToWhatsApp(
      `Assalamu'alaikum Musafar Tour,\n\nSaya ingin masuk waitlist untuk paket *${title}* (${date}).\n\nMohon kabari saya jika ada seat kosong, atau info jadwal terdekat lainnya. Terima kasih.`,
      "package_card_waitlist",
      { id: packageId, name: title, value: priceValue ?? toRupiah(price) }
    );
  };

  const hotels = [
    { city: "Makkah", name: hotelMakkah, star: hotelMakkahRating },
    { city: "Madinah", name: hotelMadinah, star: hotelMadinahRating },
  ].filter((h) => h.name);

  return (
    <div className={cn("pkg-card-wrap", className)}>
    <article className="pkg-card group relative flex h-full flex-col rounded-[32px] p-3">
      <div className="pkg-card-media relative aspect-[16/10] overflow-hidden rounded-[20px] bg-pkg-cream-2">
        <LazyImage
          src={src}
          alt={`Paket Umroh ${title} - Musafar Tour`}
          loading={index < 3 ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={index < 3 ? "high" : "auto"}
          className={cn("h-full w-full object-cover object-top", isSoldOut && "grayscale-[60%] brightness-75")}
        />
        {/* Bottom of the photo fades into blur: blurred copies of the same photo, masked (a filter, not backdrop-filter). */}
        <span className={cn("pkg-card-blur", isSoldOut && "grayscale-[60%] brightness-75")} aria-hidden>
          <span><img src={src} alt="" decoding="async" /></span>
          <span><img src={src} alt="" decoding="async" /></span>
        </span>
        {/* Seats and cart sit on the photo, along its bottom edge, over the blur. */}
        <div className="pkg-card-row pointer-events-none absolute inset-x-3 bottom-3 z-20 flex items-center justify-between gap-2">
          {isSoldOut ? (
            <span className="pkg-card-pill pkg-glass-red pkg-label inline-flex h-8 items-center rounded-full px-3">Penuh</span>
          ) : remaining !== null ? (
            <span className={cn("pkg-card-pill pkg-label inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px]", urgent ? "pkg-glass-red" : "pkg-glass-deep")}>
              <Armchair className="h-3.5 w-3.5" aria-hidden />
              Sisa {remaining}
            </span>
          ) : (
            <span />
          )}
          {!isSoldOut && (
            <PkgCartButton id={cartButtonTourId} isFav={isFav} onClick={onCart} size="sm" look="deep" className="pkg-card-cart pointer-events-auto relative z-20 focus-visible:ring-pkg-cream" />
          )}
        </div>
      </div>

      <div className="pkg-card-body mt-4 flex flex-1 flex-col px-2 pb-2">
        <h3 ref={headRef} data-dates="long" className="pkg-card-head flex flex-nowrap items-baseline gap-x-2 whitespace-nowrap">
          {href ? (
            <Link
              to={href}
              aria-label={`${title}, berangkat ${date}`}
              className="pkg-card-date min-w-0 truncate text-[24px] font-normal leading-[1.1] tracking-[-0.025em] after:absolute after:inset-0 after:z-10 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-pkg-ink focus-visible:after:rounded-[32px]"
            >
              <span className="pkg-date-long">{date}</span>
              <span className="pkg-date-short">{dateShort ?? date}</span>
            </Link>
          ) : (
            <span className="pkg-card-date min-w-0 truncate text-[24px] font-normal leading-[1.1] tracking-[-0.025em]">
              <span className="pkg-date-long">{date}</span>
              <span className="pkg-date-short">{dateShort ?? date}</span>
            </span>
          )}
          <span className="pkg-card-dur pkg-label shrink-0 text-pkg-fg-3">· {duration}</span>
        </h3>

        {hotels.length > 0 && (
          <ul className="mt-3 space-y-1">
            {hotels.map((h) => (
              <li key={h.city} className="pkg-card-hotel flex items-center gap-2 text-[15px] text-pkg-fg-2">
                <span className="min-w-0 truncate">{h.name}</span>
                {h.star ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-pkg-fg" aria-label={`Bintang ${h.star}`}>
                    <Star className="h-3.5 w-3.5 fill-pkg-red-bright text-pkg-red-bright" aria-hidden />
                    {h.star}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          {isSoldOut ? (
            <div className="w-full space-y-3">
              <p className="pkg-label text-pkg-fg-3 line-through">{jt ? `${jt} jt` : price}</p>
              <button
                type="button"
                onClick={onWaitlist}
                className="pkg-press pkg-glass-deep pkg-label relative z-20 flex h-12 w-full items-center justify-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
              >
                <Bell className="h-4 w-4" aria-hidden />
                Gabung waitlist{waitlistCount > 0 ? ` (${waitlistCount})` : ""}
              </button>
            </div>
          ) : (
            <>
              <p className="pkg-card-price flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="pkg-stat">{jt ?? price}</span>
                {jt && <span className="pkg-label text-pkg-fg-2">jt</span>}
              </p>
              {airlineLogos[airline] ? (
                <img src={airlineLogos[airline]} alt={airline} className="h-6 max-w-[40%] shrink-0 object-contain object-right" />
              ) : (
                <span className="pkg-label shrink-0 text-pkg-fg-3">{airline}</span>
              )}
            </>
          )}
        </div>
      </div>
    </article>
    </div>
  );
}
