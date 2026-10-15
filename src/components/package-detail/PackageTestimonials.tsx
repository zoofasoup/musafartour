import { useTestimonials } from "@/hooks/useHomepageData";
import { PkgTestimonialCard } from "@/components/package-list/PkgTestimonialCard";

/**
 * Same testimonials table/admin panel the homepage uses (not per-package -
 * there's no per-package review data yet). Simple scroll-snap row here
 * instead of the homepage's 3D carousel, matching RelatedPackages' pattern.
 */
export function PackageTestimonials({ headingClassName = "text-xl font-bold mb-4 text-foreground", flat = false }: { headingClassName?: string; flat?: boolean }) {
  const { data: testimonials = [] } = useTestimonials();

  if (testimonials.length === 0) return null;

  return (
    // The desktop page is not a pkg-v2 page, so the cards bring their own tokens (transparent background).
    <section className={flat ? "mt-12" : "pkg-v2 pkg-float mt-12"}>
      <h2 className={headingClassName}>Apa kata jamaah</h2>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-6 scroll-px-6 px-6 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {testimonials.map((t) => (
          <div key={t.id} className="w-[300px] shrink-0 snap-start">
            <PkgTestimonialCard
              name={t.name}
              text={t.content}
              location={t.location || ""}
              gender={(t.gender as "male" | "female") || "male"}
              imageUrl={t.image_url}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
