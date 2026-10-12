import type { Testimonial, WebsiteSettings } from "@/hooks/useHomepageData";
import { ExternalLink } from "lucide-react";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { PkgTestimonialCard } from "@/components/package-list/PkgTestimonialCard";

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

export const TestimonialsSection = ({ testimonials, websiteSettings }: TestimonialsSectionProps) => {
  const googleReviewUrl = websiteSettings?.google_review_url || "https://share.google/IEeiBZM6iD11Byerq";

  // No reviews in the database: show nothing rather than an empty promise.
  if (testimonials.length === 0) return null;

  return (
    <PkgPanel tone="cream">
      <div className="mx-auto max-w-6xl">
        <h2 className="pkg-h2 text-balance">Kata Musafriends di Google</h2>
        <a
          href={googleReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pkg-card pkg-press mt-6 inline-flex items-center gap-3 rounded-full py-2.5 pl-3 pr-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
        >
          <GoogleLogo className="h-8 w-8 shrink-0" />
          <span className="text-[28px] font-normal leading-none tracking-[-0.03em]">5.0</span>
          <span className="pkg-label text-pkg-fg-2">290+ ulasan</span>
        </a>
      </div>
      <div className="-mx-6 mt-8 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
      <a
        href={googleReviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="pkg-label mt-6 inline-flex min-h-11 items-center gap-1.5 text-pkg-red-deep underline underline-offset-4"
      >
        Semua review di Google <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    </PkgPanel>
  );
};
