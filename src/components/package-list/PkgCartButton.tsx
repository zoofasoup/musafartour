import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface PkgCartButtonProps {
  isFav: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** sm = 44 px (on package cards), lg = 56 px (next to the main button). */
  size?: "sm" | "lg";
  /** Sits on the red panel: the active state gets a light ring so it still reads against the red. */
  onRed?: boolean;
  /** Match what sits next to it: "deep" beside the dark seat pill on a card, "glass" beside the other round buttons. */
  look?: "glass" | "deep";
  id?: string;
  tabIndex?: number;
  className?: string;
}

/** The one cart button of the site: glass circle like the pills and buttons around it; active = red glass with a filled icon. */
export function PkgCartButton({ isFav, onClick, size = "lg", onRed = false, look = "glass", id, tabIndex, className }: PkgCartButtonProps) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      tabIndex={tabIndex}
      aria-pressed={isFav}
      aria-label={isFav ? "Keluarkan dari keranjang" : "Tambah ke keranjang"}
      className={cn(
        "pkg-press flex shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2",
        size === "sm" ? "h-11 w-11" : "h-14 w-14",
        isFav ? "pkg-glass-red" : look === "deep" ? "pkg-glass-deep" : "pkg-glass",
        isFav && onRed && "ring-2 ring-pkg-on-red",
        className
      )}
    >
      <ShoppingCart className={cn("h-5 w-5", isFav && "fill-current")} aria-hidden />
    </button>
  );
}
