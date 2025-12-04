import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import type { SellingPoint } from "@/hooks/useHomepageData";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef } from "react";

interface WhyChooseSectionProps {
  sellingPoints: SellingPoint[];
}

// Placeholder images for jamaah photos
const placeholderImages = [
  "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=600&h=800&fit=crop",
];

export const WhyChooseSection = ({ sellingPoints }: WhyChooseSectionProps) => {
  const animation = useScrollAnimation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Take first 4 selling points
  const features = sellingPoints.slice(0, 4);

  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 340;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(updateScrollButtons, 300);
    }
  };

  return (
    <section className="py-16 md:py-20 bg-card">
      <div className="container mx-auto px-4">
        {/* Section Header - Linear style */}
        <div
          ref={animation.ref}
          className={`mb-12 transition-all duration-700 ${
            animation.isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground font-medium">
              Tentang Kami
            </span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Kenapa Memilih Musafar?
            </h2>
            <p className="text-muted-foreground text-lg self-center">
              Kami mendampingi perjalanan ibadah Anda dengan sepenuh hati, memberikan pelayanan terbaik dari awal hingga pulang kembali ke tanah air.
            </p>
          </div>
        </div>

        {/* Cards Carousel */}
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={updateScrollButtons}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {features.length > 0 ? (
              features.map((feature, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-[280px] md:w-[320px] h-[400px] md:h-[440px] rounded-2xl overflow-hidden relative group cursor-pointer snap-start"
                >
                  {/* Background Image */}
                  <img
                    src={placeholderImages[index % placeholderImages.length]}
                    alt={feature.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-white/70 text-sm mb-2">{feature.description}</p>
                    <h3 className="text-white text-xl font-semibold flex items-center justify-between">
                      {feature.title}
                      <ChevronRight className="w-5 h-5 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                    </h3>
                  </div>
                </div>
              ))
            ) : (
              // Default cards if no selling points
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-[280px] md:w-[320px] h-[400px] md:h-[440px] rounded-2xl overflow-hidden relative group cursor-pointer snap-start"
                >
                  <img
                    src={placeholderImages[index]}
                    alt={`Feature ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-white/70 text-sm mb-2">Deskripsi fitur</p>
                    <h3 className="text-white text-xl font-semibold flex items-center justify-between">
                      Judul Fitur
                      <ChevronRight className="w-5 h-5 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                    </h3>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-center gap-3 mt-8">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="p-3 rounded-full border border-border bg-background hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="p-3 rounded-full border border-border bg-background hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
