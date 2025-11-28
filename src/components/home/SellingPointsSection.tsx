import { FeatureCard } from "@/components/FeatureCard";
import { Plane, MapPin, Hotel, MessageCircle, Heart, Package } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SellingPoint } from "@/hooks/useHomepageData";
import type { LucideIcon } from "lucide-react";

interface SellingPointsSectionProps {
  sellingPoints: SellingPoint[];
}

const iconMap: Record<string, LucideIcon> = {
  plane: Plane,
  "map-pin": MapPin,
  hotel: Hotel,
  heart: Heart,
  "message-circle": MessageCircle,
  package: Package,
};

const getIconComponent = (iconName: string): LucideIcon => {
  return iconMap[iconName] || Heart;
};

export const SellingPointsSection = ({
  sellingPoints,
}: SellingPointsSectionProps) => {
  const featuresAnimation = useScrollAnimation();
  const isMobile = useIsMobile();

  const features = sellingPoints.map((point) => ({
    icon: getIconComponent(point.icon),
    title: point.title,
    description: point.description,
  }));

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2 text-foreground">
            Mengapa Memilih Musafar Tour
          </h2>
          <p className="text-muted-foreground">
            Kami mendampingi Anda dengan hati dan profesionalisme
          </p>
        </div>
        <div
          ref={featuresAnimation.ref}
          className={`transition-all duration-700 ${
            featuresAnimation.isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          {isMobile ? (
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              <CarouselContent className="-ml-2">
                {features.length > 0 ? (
                  features.map((feature, index) => (
                    <CarouselItem key={index} className="pl-2 basis-[85%]">
                      <FeatureCard {...feature} />
                    </CarouselItem>
                  ))
                ) : (
                  <div className="col-span-full text-center text-muted-foreground">
                    Belum ada selling points yang ditambahkan
                  </div>
                )}
              </CarouselContent>
              <div className="flex justify-center mt-4 gap-2">
                <CarouselPrevious className="relative left-0 translate-y-0" />
                <CarouselNext className="relative right-0 translate-y-0" />
              </div>
            </Carousel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.length > 0 ? (
                features.map((feature, index) => (
                  <FeatureCard key={index} {...feature} />
                ))
              ) : (
                <div className="col-span-full text-center text-muted-foreground">
                  Belum ada selling points yang ditambahkan
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};