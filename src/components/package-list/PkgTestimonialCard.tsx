import { useLayoutEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import testimonialMale from "@/assets/testimonial-male.png";
import testimonialFemale from "@/assets/testimonial-female.png";
import { LazyImage } from "@/components/ui/lazy-image";
import { cn } from "@/lib/utils";

interface PkgTestimonialCardProps {
  name: string;
  text: string;
  location: string;
  gender?: "male" | "female";
  imageUrl?: string | null;
  className?: string;
}

/** A testimonial in the pkg-v2 look: glass container, red stars, light type, the quote folds after five lines. */
export function PkgTestimonialCard({ name, text, location, gender = "male", imageUrl, className }: PkgTestimonialCardProps) {
  const avatar = imageUrl || (gender === "female" ? testimonialFemale : testimonialMale);
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);
  const quoteRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = quoteRef.current;
    if (el && !open) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text, open]);

  return (
    <article className={cn("pkg-card flex h-full flex-col rounded-[32px] p-5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5" role="img" aria-label="Bintang 5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-pkg-red-bright text-pkg-red-bright" aria-hidden />
          ))}
        </div>
        <span className="pkg-caption text-pkg-fg-3">Google</span>
      </div>

      <p ref={quoteRef} className={cn("mt-4 text-base font-normal leading-relaxed text-pkg-fg", !open && "line-clamp-5")}>
        &ldquo;{text}&rdquo;
      </p>
      {(clamped || open) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="pkg-label -ml-1 mt-1 inline-flex min-h-11 items-center self-start px-1 text-pkg-red-deep underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink"
        >
          {open ? "Tutup" : "Baca selengkapnya"}
        </button>
      )}

      <div className="mt-auto flex items-center gap-3 pt-5">
        <LazyImage src={avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-pkg-hair" />
        <div className="min-w-0">
          <p className="pkg-label truncate text-pkg-fg">{name}</p>
          {location && <p className="truncate text-sm font-normal text-pkg-fg-3">{location}</p>}
        </div>
      </div>
    </article>
  );
}
