import { Button } from "@/components/ui/button";
import { TestimonialCard } from "@/components/TestimonialCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import type { Testimonial, WebsiteSettings } from "@/hooks/useHomepageData";

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
  websiteSettings: WebsiteSettings | null | undefined;
}

export const TestimonialsSection = ({
  testimonials,
  websiteSettings,
}: TestimonialsSectionProps) => {
  const testimonialsAnimation = useScrollAnimation();

  const googleReviewUrl =
    websiteSettings?.google_review_url ||
    "https://share.google/IEeiBZM6iD11Byerq";

  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 bg-background px-4 py-2 rounded-full shadow-sm mb-4">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="font-semibold text-foreground">
              Verified Google Reviews
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-6 h-6" fill="#FBBC05" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              ))}
            </div>
            <span className="text-2xl font-bold text-foreground">4.9/5</span>
          </div>
          <p className="text-muted-foreground">dari 150+ review Google</p>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
          Apa Kata Musafriends di Google
        </h2>
        <div
          ref={testimonialsAnimation.ref}
          className={`transition-all duration-700 ${
            testimonialsAnimation.isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          {testimonials.length > 0 ? (
            <Carousel
              opts={{ align: "start", loop: true }}
              plugins={[Autoplay({ delay: 4000 })]}
              className="w-full mb-12"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {testimonials.map((testimonial) => (
                  <CarouselItem
                    key={testimonial.id}
                    className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3"
                  >
                    <TestimonialCard
                      name={testimonial.name}
                      image={
                        testimonial.image_url ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${testimonial.name}`
                      }
                      text={testimonial.content}
                      location={testimonial.location || ""}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="flex justify-center mt-4 gap-2">
                <CarouselPrevious className="relative left-0 translate-y-0" />
                <CarouselNext className="relative right-0 translate-y-0" />
              </div>
            </Carousel>
          ) : (
            <div className="col-span-full text-center text-muted-foreground mb-12">
              Belum ada testimonial yang ditambahkan
            </div>
          )}
        </div>
        <div className="text-center">
          <Button
            size="lg"
            variant="secondary"
            onClick={() => window.open(googleReviewUrl, "_blank")}
            className="gap-2"
          >
            Lihat Semua Review di Google
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </Button>
        </div>
      </div>
    </section>
  );
};