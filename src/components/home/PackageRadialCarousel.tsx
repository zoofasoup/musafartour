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
  const rotationRef = useRef(Number(sessionStorage.getItem('carouselRotation')) || 0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (loading || !packages || packages.length === 0) return;
    
    // Set initial rotation explicitly to avoid snap to 0
    controls.set({ rotate: rotationRef.current });
    
    // Start infinite spin
    controls.start({
      rotate: [rotationRef.current, rotationRef.current - 360],
      transition: { ease: "linear", duration: 80, repeat: Infinity }
    });
  }, [loading, packages, controls]);

  if (loading || !packages || packages.length === 0) {
    return (
      <section id="packages-carousel" className="relative w-full h-[600px] md:h-[750px] overflow-hidden bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Memuat paket...</div>
      </section>
    );
  }

  // Duplicate packages to 24 items to find the sweet spot for spacing (makes them closer)
  let displayPackages = packages;
  while (displayPackages.length < 24) {
    displayPackages = [...displayPackages, ...packages];
  }
  displayPackages = displayPackages.slice(0, 24);

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
    <section id="packages-carousel" className="relative w-full h-[600px] md:h-[750px] overflow-hidden bg-[#FAFAFA] flex flex-col items-center justify-end pb-12 md:pb-24 pt-32">
      
      {/* Headline above carousel */}
      <div className="absolute top-8 md:top-16 left-1/2 -translate-x-1/2 z-20 w-full px-4 text-center pointer-events-none">
        <h2 className="text-3xl md:text-[2.5rem] font-display font-semibold text-[#1c1c1c]/90 tracking-tight">
          Pilih Paketmu
        </h2>
        
        {/* Color Code Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5 mt-3 text-xs md:text-sm text-[#1c1c1c]/70 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-600 shadow-sm" /> Hemat
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-blue-600 shadow-sm" /> Nyaman
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-amber-500 shadow-sm" /> Pelataran Hemat
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-pink-600 shadow-sm" /> Five-star
          </div>
        </div>
      </div>
      
      {/* The Spinning Wheel */}
      <div className="absolute top-[140px] md:top-[200px] left-1/2 -translate-x-1/2 w-[2400px] h-[2400px]">
        <motion.div 
          className="w-full h-full rounded-full cursor-grab active:cursor-grabbing touch-none md:touch-pan-y"
          animate={controls}
          onPanStart={handlePanStart}
          onPan={handlePan}
          onPanEnd={handlePanEnd}
          onUpdate={(latest) => {
            if (latest.rotate !== undefined) {
              rotationRef.current = parseFloat(latest.rotate as string);
            }
          }}
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
                  if (isDragging.current) {
                    e.preventDefault();
                  } else {
                    sessionStorage.setItem('carouselRotation', rotationRef.current.toString());
                    window.history.replaceState(null, '', window.location.pathname + '#packages-carousel');
                  }
                }}>
                  <Link to={`/paket-umroh/${pkg.slug}`} className="block transition-transform duration-500 md:hover:scale-105 md:hover:-translate-y-4" draggable={false}>
                    <img 
                      src={pkg.banner_image || '/placeholder.svg'} 
                      alt={pkg.package_name}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      className="w-[230px] md:w-[280px] h-auto object-cover shadow-2xl rounded-sm pointer-events-none"
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
