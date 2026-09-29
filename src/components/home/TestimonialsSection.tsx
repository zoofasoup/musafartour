import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import type { Testimonial, WebsiteSettings } from "@/hooks/useHomepageData";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
  websiteSettings: WebsiteSettings | null | undefined;
}

const GoogleLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const Stars = ({ className }: { className?: string }) => (
  <div className="flex gap-0.5">
    {[...Array(5)].map((_, i) => (
      <svg key={i} className={className} fill="#FBBC05" viewBox="0 0 24 24">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    ))}
  </div>
);

const ReviewCard = ({ testimonial, onOpen }: { testimonial: Testimonial; onOpen: () => void }) => (
  <button
    type="button"
    onClick={onOpen}
    className="group relative shrink-0 snap-start w-[78vw] max-w-[300px] sm:w-[300px] h-[420px] rounded-3xl overflow-hidden bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-shadow text-left"
  >
    {/* Photo owns the top ~60%; only its bottom edge fades, so the people (usually in the
        lower half of these shots) stay clear. Crop biased low for the same reason. */}
    <div className="absolute inset-x-0 top-0 h-[60%] overflow-hidden">
      {testimonial.image_url && (
        <img
          src={testimonial.image_url}
          alt={`Jamaah Musafar Tour - ${testimonial.name}`}
          loading="lazy"
          className="w-full h-full object-cover [object-position:50%_72%] transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 h-[28%] backdrop-blur-[5px] [mask-image:linear-gradient(to_bottom,transparent,black)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black)]" />
      <div
        className="absolute inset-x-0 bottom-0 h-[34%]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 25%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.85) 75%, #fff 100%)",
        }}
      />
    </div>

    <div className="absolute inset-x-0 bottom-0 p-6">
      <span className="block font-serif text-4xl leading-none text-foreground/80 -mb-1" aria-hidden>“</span>
      <p className="text-[15px] text-foreground leading-relaxed line-clamp-3">
        {testimonial.content}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <Stars className="w-3.5 h-3.5" />
        <p className="text-xs text-muted-foreground">— {testimonial.name}</p>
      </div>
    </div>
  </button>
);

export const TestimonialsSection = ({
  testimonials,
  websiteSettings
}: TestimonialsSectionProps) => {
  const testimonialsAnimation = useScrollAnimation();
  const googleReviewUrl = websiteSettings?.google_review_url || "https://share.google/IEeiBZM6iD11Byerq";
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Testimonial | null>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("button");
    const step = (card?.offsetWidth ?? 300) + 24;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <section className="py-16 md:py-24 bg-muted/50 overflow-hidden relative">
      <div className="container mx-auto px-6 md:px-8">
        <div className="text-center mb-10 md:mb-12">
          <span className="text-foreground uppercase tracking-[0.2em] text-xs font-bold mb-3 block">
            Testimoni
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-center mb-8 text-foreground tracking-tight">
            Apa Kata Musafriends di Google
          </h2>

          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-4 bg-white rounded-2xl px-6 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-shadow"
          >
            <GoogleLogo className="h-10 w-10 shrink-0" />
            <div className="text-left">
              <div className="flex items-center gap-2.5">
                <span className="text-4xl font-bold text-foreground leading-none tracking-tight">5.0</span>
                <Stars className="w-6 h-6" />
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">
                <span className="font-bold text-foreground">290+ ulasan</span> di Google Maps
              </p>
            </div>
          </a>
        </div>
      </div>

      <div ref={testimonialsAnimation.ref} className={`transition-all duration-700 ${testimonialsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        {testimonials.length > 0 ? (
          <div className="relative">
            {/* Full-bleed row: runs to both screen edges (faded there), but at rest the first
                card lines up with the 1400px container the heading sits in. --edge keeps the
                first card clear of the edge fade on screens narrower than the container. */}
            <div
              ref={scrollerRef}
              style={{
                paddingInline: "max(var(--edge), calc((100% - 1400px) / 2 + 2rem))",
                scrollPaddingInline: "max(var(--edge), calc((100% - 1400px) / 2 + 2rem))",
              }}
              className="[--edge:2rem] md:[--edge:6rem] flex gap-6 overflow-x-auto snap-x snap-mandatory pt-8 pb-14 -mt-4 -mb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_32px,black_calc(100%_-_32px),transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_32px,black_calc(100%_-_32px),transparent)] md:[mask-image:linear-gradient(to_right,transparent,black_96px,black_calc(100%_-_96px),transparent)] md:[-webkit-mask-image:linear-gradient(to_right,transparent,black_96px,black_calc(100%_-_96px),transparent)]"
            >
              {testimonials.map((testimonial) => (
                <ReviewCard key={testimonial.id} testimonial={testimonial} onOpen={() => setSelected(testimonial)} />
              ))}
            </div>

            <div className="hidden md:flex justify-center gap-3 mt-4">
              <Button variant="outline" size="icon" aria-label="Sebelumnya" className="rounded-full bg-white shadow-sm h-11 w-11" onClick={() => scrollBy(-1)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon" aria-label="Berikutnya" className="rounded-full bg-white shadow-sm h-11 w-11" onClick={() => scrollBy(1)}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground mb-12">
            Belum ada testimonial yang ditambahkan
          </div>
        )}
      </div>

      <div className="text-center mt-10">
        <Button
          size="lg"
          onClick={() => window.open(googleReviewUrl, "_blank")}
          className="gap-2 bg-white text-foreground hover:bg-white/90 shadow-md border border-border/30 font-semibold"
        >
          Lihat Semua Review di Google
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Button>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl">
          {selected && (
            <>
              {selected.image_url && (
                <img src={selected.image_url} alt={`Jamaah Musafar Tour - ${selected.name}`} className="w-full max-h-[45vh] object-cover" />
              )}
              <div className="p-6 max-h-[45vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <Stars className="w-4 h-4" />
                  <GoogleLogo className="h-4 w-4" />
                </div>
                <DialogTitle className="sr-only">Ulasan dari {selected.name}</DialogTitle>
                <p className="text-foreground leading-relaxed whitespace-pre-line">{selected.content}</p>
                <p className="mt-4 text-right text-sm text-muted-foreground">— {selected.name}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};
