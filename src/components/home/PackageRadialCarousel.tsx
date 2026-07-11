import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { PublishedPackage } from "@/hooks/usePackages";
import { ChevronRight } from "lucide-react";
import { motion, useAnimation } from "framer-motion";

interface PackageRadialCarouselProps {
  packages: PublishedPackage[] | null;
  loading: boolean;
}

export const PackageRadialCarousel = ({ packages, loading }: PackageRadialCarouselProps) => {
  const controls = useAnimation();
  const rotationRef = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (loading || !packages || packages.length === 0) return;
    
    // Start infinite spin
    controls.start({
      rotate: [rotationRef.current, rotationRef.current - 360],
      transition: { ease: "linear", duration: 80, repeat: Infinity }
    });
  }, [loading, packages, controls]);

  if (loading || !packages || packages.length === 0) return null;

  // Duplicate packages to 20 items to find the sweet spot for spacing
  let displayPackages = packages;
  while (displayPackages.length < 20) {
    displayPackages = [...displayPackages, ...packages];
  }
  displayPackages = displayPackages.slice(0, 20);

  const handlePanStart = () => {
    isDragging.current = true;
    controls.stop();
  };

  const handlePan = (e: any, info: any) => {
    // 0.05 is the sensitivity. Dragging right (positive delta) rotates clockwise (positive degree)
    rotationRef.current += info.delta.x * 0.1;
    controls.set({ rotate: rotationRef.current });
  };

  const handlePanEnd = (e: any, info: any) => {
    setTimeout(() => {
      isDragging.current = false;
    }, 100);

    // Apply momentum
    const momentum = info.velocity.x * 0.05;
    rotationRef.current += momentum;

    controls.start({
      rotate: rotationRef.current,
      transition: { type: "spring", velocity: info.velocity.x * 0.05, stiffness: 50, damping: 20 }
    }).then(() => {
      // Resume slow spin in the negative (counter-clockwise) direction
      controls.start({
        rotate: [rotationRef.current, rotationRef.current - 360],
        transition: { ease: "linear", duration: 80, repeat: Infinity }
      });
    });
  };

  return (
    <section className="relative w-full h-[600px] md:h-[750px] overflow-hidden bg-[#FAFAFA] flex flex-col items-center justify-end pb-12 md:pb-24">
      
      {/* The Spinning Wheel */}
      <div className="absolute top-[120px] md:top-[160px] left-1/2 -translate-x-1/2 w-[2400px] h-[2400px]">
        <motion.div 
          className="w-full h-full rounded-full cursor-grab active:cursor-grabbing touch-pan-y"
          animate={controls}
          onPanStart={handlePanStart}
          onPan={handlePan}
          onPanEnd={handlePanEnd}
        >
          {displayPackages.map((pkg, i) => {
            const angle = (i / displayPackages.length) * 360;
            return (
              <div 
                key={`${pkg.id}-${i}`}
                className="absolute top-0 left-1/2"
                style={{ 
                  transform: `translateX(-50%) rotate(${angle}deg)`,
                  transformOrigin: '50% 1200px'
                }}
              >
                <div onClick={(e) => {
                  // Prevent navigation if the user was dragging
                  if (isDragging.current) e.preventDefault();
                }}>
                  <Link to={`/paket-umroh/${pkg.slug}`} className="block transition-transform duration-500 hover:scale-105 hover:-translate-y-4" draggable={false}>
                    <img 
                      src={pkg.banner_image || '/placeholder.svg'} 
                      alt={pkg.package_name}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      className="w-[180px] md:w-[260px] h-auto object-cover shadow-2xl rounded-sm pointer-events-none"
                    />
                  </Link>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Gradual blur/fade overlays to make the images disappear smoothly at the edges */}
      <div className="absolute bottom-0 left-0 w-full h-32 md:h-64 bg-gradient-to-t from-[#FAFAFA] to-transparent z-10 pointer-events-none" />
      <div className="absolute top-0 left-0 w-16 md:w-48 h-full bg-gradient-to-r from-[#FAFAFA] to-transparent z-10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-16 md:w-48 h-full bg-gradient-to-l from-[#FAFAFA] to-transparent z-10 pointer-events-none" />

      {/* CTA in the middle */}
      <div className="relative z-20 text-center max-w-md mx-auto px-4 mt-auto py-4 rounded-3xl pointer-events-auto">
        <h3 className="text-2xl md:text-[2rem] font-medium tracking-tight text-[#1c1c1c] mb-3">
          Temukan perjalanan suci.
        </h3>
        <p className="text-sm md:text-base text-[#1c1c1c]/60 mb-6 font-medium">
          Momen berharga yang abadi di Tanah Suci.
        </p>
        <Button 
          className="bg-[#1c1c1c] text-[#FAFAFA] hover:bg-[#1c1c1c]/80 rounded-full px-8 py-5 md:py-6 text-sm md:text-base shadow-xl transition-all hover:scale-105 group"
          onClick={() => window.location.href = '/paket-umroh'}
        >
          Lihat Paket <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </section>
  );
};
