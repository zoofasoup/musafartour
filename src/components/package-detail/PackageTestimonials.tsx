import { useTestimonials } from "@/hooks/useHomepageData";
import { TestimonialCard } from "@/components/TestimonialCard";
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
    <section className="mt-12">
      <h2 className={headingClassName}>Apa kata jamaah</h2>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-6 scroll-px-6 px-6 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {testimonials.map((t) => (
          <div key={t.id} className={flat ? "w-[300px] shrink-0 snap-start" : "w-[320px] shrink-0 snap-start"}>
            {flat ? (
              <PkgTestimonialCard
                name={t.name}
                text={t.content}
                location={t.location || ""}
                gender={(t.gender as "male" | "female") || "male"}
                imageUrl={t.image_url}
              />
            ) : (
            <TestimonialCard
              name={t.name}
              text={t.content}
              location={t.location || ""}
              gender={(t.gender as "male" | "female") || "male"}
              imageUrl={t.image_url}
            />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
