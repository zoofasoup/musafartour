import { useLayoutEffect, useRef, useState } from "react";
import { Maximize2, Star, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import testimonialMale from "@/assets/testimonial-male.png";
import testimonialFemale from "@/assets/testimonial-female.png";
import { cn } from "@/lib/utils";

interface PkgTestimonialCardProps {
  name: string;
  text: string;
  location: string;
  gender?: "male" | "female";
  imageUrl?: string | null;
  className?: string;
}

/**
 * Where the people are in each review photo (x%, y% of the image), so the 4:3 crop keeps them in the middle of the
 * frame. Photos are portrait or wide group shots, and a plain centre crop often cut heads off. Keyed by file name;
 * any other photo falls back to the centre, slightly above the middle (faces sit in the upper half).
 */
const FOCUS: Record<string, [number, number]> = {
  "review-adinda-putri-indraswari.webp": [50, 50],
  "review-arif-nur-rokhman.webp": [52, 50],
  "review-dewi-mentari.webp": [50, 62],
  "review-dias-darmawan-putra.webp": [45, 50],
  "review-hendy-ershi.webp": [50, 70],
  "review-huwaida-eljawiy.webp": [50, 50],
  "review-sukirman-akhmadi.webp": [50, 42],
  "review-zul-fikar.webp": [48, 50],
};
const focusFor = (src: string): string => {
  const [x, y] = FOCUS[src.split("?")[0].split("/").pop() ?? ""] ?? [50, 38];
  return `${x}% ${y}%`;
};

/**
 * A testimonial: the person's photo on top melting into the card (blur that grows toward the bottom edge plus a fade
 * to the card colour), then the quote, and a bottom row with the red stars and a right-aligned "— Name, Place".
 * A long quote stops after five lines; a small round icon (no words) in the top right corner opens the whole testimonial in a little window.
 */
export function PkgTestimonialCard({ name, text, location, gender = "male", imageUrl, className }: PkgTestimonialCardProps) {
  const photo = imageUrl || (gender === "female" ? testimonialFemale : testimonialMale);
  const position = imageUrl ? focusFor(imageUrl) : "50% 30%";
  const [open, setOpen] = useState(false); // the little window
  const [clamped, setClamped] = useState(false);
  const quoteRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = quoteRef.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  const stars = (
    <div className="flex shrink-0 gap-0.5 pb-0.5" role="img" aria-label="Bintang 5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-pkg-red-bright text-pkg-red-bright" aria-hidden />
      ))}
    </div>
  );
  const byline = (
    <p className="min-w-0 text-right text-[13px] leading-[1.3] text-pkg-fg-3">
      &mdash; {name}
      {location ? `, ${location}` : ""}
    </p>
  );
  const photoBlock = (aspect: string) => (
    <div className={cn("relative shrink-0 overflow-hidden", aspect)}>
      <img src={photo} alt={`Foto ${name}`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: position }} />
      <span className="pkg-card-blur" aria-hidden>
        <span><img src={photo} alt="" loading="lazy" decoding="async" style={{ objectPosition: position }} /></span>
        <span><img src={photo} alt="" loading="lazy" decoding="async" style={{ objectPosition: position }} /></span>
      </span>
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-pkg-white" />
    </div>
  );

  return (
    <>
    <article className={cn("pkg-card relative flex h-full flex-col overflow-hidden rounded-[28px]", className)}>
      {clamped && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label="Baca selengkapnya"
          className="pkg-press pkg-glass-deep absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream"
        >
          <Maximize2 className="h-4 w-4" aria-hidden />
        </button>
      )}
      {photoBlock("aspect-[4/3]")}

      <div className="relative -mt-7 flex flex-1 flex-col px-5 pb-5">
        <span aria-hidden className="text-[34px] font-light leading-none text-pkg-fg-3">&ldquo;</span>
        <p ref={quoteRef} className={"mt-1 line-clamp-5 text-[15px] font-normal leading-[1.5] text-pkg-fg"}>
          {text}
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          {stars}
          {byline}
        </div>
      </div>
    </article>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        overlayClassName="pkg-overlay"
        className="pkg-v2 pkg-float w-[calc(100%-32px)] max-w-[380px] gap-0 border-0 bg-transparent p-0 shadow-none sm:rounded-[28px] [&>button]:hidden"
      >
        <div className="pkg-card relative flex max-h-[86svh] flex-col overflow-hidden rounded-[28px]">
          {photoBlock("aspect-[4/3]")}
          <div className="relative -mt-7 flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-5">
            <DialogTitle className="sr-only">Ulasan dari {name}</DialogTitle>
            <DialogDescription className="sr-only">Testimoni lengkap jamaah Musafar Tour.</DialogDescription>
            <span aria-hidden className="text-[34px] font-light leading-none text-pkg-fg-3">&ldquo;</span>
            <p className="mt-1 whitespace-pre-line text-[15px] font-normal leading-[1.55] text-pkg-fg">{text}</p>
            <div className="mt-5 flex items-end justify-between gap-3">
              {stars}
              {byline}
            </div>
          </div>
          <DialogClose asChild>
            <button type="button" aria-label="Tutup" className="pkg-press pkg-glass absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
