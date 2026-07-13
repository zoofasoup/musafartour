import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { TestimonialCard } from "@/components/TestimonialCard";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import type { Testimonial, WebsiteSettings } from "@/hooks/useHomepageData";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
  websiteSettings: WebsiteSettings | null | undefined;
}

export const TestimonialsSection = ({
  testimonials,
  websiteSettings
}: TestimonialsSectionProps) => {
  const testimonialsAnimation = useScrollAnimation();
  const googleReviewUrl = websiteSettings?.google_review_url || "https://share.google/IEeiBZM6iD11Byerq";

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);

  // Auto play carousel
  useEffect(() => {
    if (selectedTestimonial || testimonials.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedTestimonial, testimonials.length]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedTestimonial) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedTestimonial]);

  const nextSlide = () => setActiveIndex((prev) => (prev + 1) % testimonials.length);
  const prevSlide = () => setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  // 3D Perspective variants
  const getVariants = (index: number) => {
    if (testimonials.length === 0) return {};
    
    // Center active card
    if (index === activeIndex) {
      return {
        x: "0%",
        scale: 1,
        z: 0,
        rotateY: 0,
        opacity: 1,
        filter: "blur(0px)",
        zIndex: 30,
      };
    }
    
    // Left card
    if (index === (activeIndex - 1 + testimonials.length) % testimonials.length) {
      return {
        x: "-60%",
        scale: 0.85,
        z: -100,
        rotateY: 15,
        opacity: 0.6,
        filter: "blur(4px)",
        zIndex: 20,
      };
    }
    
    // Right card
    if (index === (activeIndex + 1) % testimonials.length) {
      return {
        x: "60%",
        scale: 0.85,
        z: -100,
        rotateY: -15,
        opacity: 0.6,
        filter: "blur(4px)",
        zIndex: 20,
      };
    }
    
    // Hidden cards
    return {
      x: "0%",
      scale: 0.7,
      z: -200,
      rotateY: 0,
      opacity: 0,
      filter: "blur(10px)",
      zIndex: 10,
    };
  };

  return (
    <section className="py-16 md:py-24 bg-muted/50 overflow-hidden relative">
      <div className="container mx-auto px-6 md:px-8">
        <div className="text-center mb-10 md:mb-12">
          <span className="text-accent uppercase tracking-[0.2em] text-xs font-bold mb-3 block">
            Testimoni
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-center mb-6 text-foreground tracking-tight">
            Apa Kata Musafriends di Google
          </h2>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
            <div className="inline-flex items-center gap-2 bg-background px-4 py-2 rounded-full shadow-sm">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="font-semibold text-sm text-foreground">
                Verified Reviews
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => <svg key={i} className="w-5 h-5" fill="#FBBC05" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>)}
              </div>
              <span className="text-xl font-bold text-foreground">5/5</span>
              <span className="text-sm text-muted-foreground ml-1">(180+)</span>
            </div>
          </div>
        </div>
        
        <div ref={testimonialsAnimation.ref} className={`transition-all duration-700 ${testimonialsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          {testimonials.length > 0 ? (
            <div className="relative w-full max-w-6xl mx-auto mb-24 md:mb-16 h-[380px] md:h-[300px] perspective-[1200px] flex items-center justify-center">
              {testimonials.map((testimonial, index) => {
                const isActive = index === activeIndex;
                const isLeft = index === (activeIndex - 1 + testimonials.length) % testimonials.length;
                const isRight = index === (activeIndex + 1) % testimonials.length;

                return (
                  <motion.div
                    key={testimonial.id}
                    initial={false}
                    animate={getVariants(index)}
                    transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
                    className="absolute w-full max-w-[320px] md:max-w-xl h-full cursor-pointer"
                    style={{ transformStyle: "preserve-3d", touchAction: "pan-y" }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onClick={() => {
                      if (isActive) {
                        setSelectedTestimonial(testimonial);
                      } else if (isLeft) {
                        prevSlide();
                      } else if (isRight) {
                        nextSlide();
                      }
                    }}
                    onDragEnd={(e, { offset, velocity }) => {
                      if (offset.x < -50 || velocity.x < -300) {
                        nextSlide();
                      } else if (offset.x > 50 || velocity.x > 300) {
                        prevSlide();
                      }
                    }}
                  >
                    <div className={`w-full ${!isActive && 'pointer-events-none'}`}>
                      <TestimonialCard 
                        name={testimonial.name} 
                        text={testimonial.content} 
                        location={testimonial.location || ""} 
                        gender={(testimonial.gender as 'male' | 'female') || 'male'} 
                        imageUrl={testimonial.image_url} 
                      />
                    </div>
                  </motion.div>
                );
              })}
              
              {/* Navigation Arrows */}
              <div className="absolute -bottom-10 md:bottom-auto md:top-1/2 md:-translate-y-1/2 left-0 right-0 flex justify-center md:justify-between w-full max-w-[800px] mx-auto gap-4 md:gap-0 px-4 md:px-0 pointer-events-none z-40">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full bg-white/80 backdrop-blur-sm pointer-events-auto shadow-md border-border/50 text-foreground hover:bg-white h-12 w-12 md:h-10 md:w-10"
                  onClick={prevSlide}
                >
                  <ChevronLeft className="h-6 w-6 md:h-5 md:w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full bg-white/80 backdrop-blur-sm pointer-events-auto shadow-md border-border/50 text-foreground hover:bg-white h-12 w-12 md:h-10 md:w-10"
                  onClick={nextSlide}
                >
                  <ChevronRight className="h-6 w-6 md:h-5 md:w-5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="col-span-full text-center text-muted-foreground mb-12">
              Belum ada testimonial yang ditambahkan
            </div>
          )}
        </div>

        <div className="text-center">
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
      </div>

      {/* Full-Screen Blur Modal for Testimonial Detail */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selectedTestimonial && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/50 backdrop-blur-md"
              onClick={() => setSelectedTestimonial(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                className="w-full max-w-2xl cursor-default relative shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute -top-14 right-0 md:-right-14 text-white hover:bg-white/20 hover:text-white rounded-full bg-black/20 backdrop-blur-sm"
                  onClick={() => setSelectedTestimonial(null)}
                >
                  <X className="h-6 w-6" />
                </Button>
                <div className="h-[auto] max-h-[80vh] overflow-y-auto rounded-xl custom-scrollbar">
                  <TestimonialCard 
                    name={selectedTestimonial.name} 
                    text={selectedTestimonial.content} 
                    location={selectedTestimonial.location || ""} 
                    gender={(selectedTestimonial.gender as 'male' | 'female') || 'male'} 
                    imageUrl={selectedTestimonial.image_url}
                    isFullView={true}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
};