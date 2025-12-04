import { useState, useRef, useEffect } from "react";

// Import airline logos
import garudaLogo from "@/assets/airlines/garuda-indonesia.png";
import saudiaLogo from "@/assets/airlines/saudia.png";
import qatarLogo from "@/assets/airlines/qatar-airways.png";
import emiratesLogo from "@/assets/airlines/emirates.png";
import omanAirLogo from "@/assets/airlines/oman-air.png";
import lionAirLogo from "@/assets/airlines/lion-air.png";
import scootLogo from "@/assets/airlines/scoot.png";

const airlines = [
  { name: "Garuda Indonesia", logo: garudaLogo, className: "h-12 md:h-14" },
  { name: "Saudia", logo: saudiaLogo, className: "h-8 md:h-10" },
  { name: "Qatar Airways", logo: qatarLogo, className: "h-10 md:h-12" },
  { name: "Emirates", logo: emiratesLogo, className: "h-8 md:h-10" },
  { name: "Oman Air", logo: omanAirLogo, className: "h-12 md:h-14" },
  { name: "Lion Air", logo: lionAirLogo, className: "h-8 md:h-10" },
  { name: "Scoot", logo: scootLogo, className: "h-12 md:h-14" },
];

export const AirlinesCarousel = () => {
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Clone items for seamless loop
  const items = [...airlines, ...airlines, ...airlines];

  return (
    <section className="py-12 bg-muted/20 overflow-hidden">
      <div className="container mx-auto px-4 mb-8">
        <h2 className="text-center text-lg md:text-xl font-semibold text-muted-foreground">
          Maskapai Mitra Kami
        </h2>
      </div>

      <div
        className="relative w-full overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          ref={scrollRef}
          className="flex items-center animate-scroll-logos"
          style={{
            animationPlayState: isPaused ? "paused" : "running",
          }}
        >
          {items.map((airline, index) => (
            <div
              key={`${airline.name}-${index}`}
              className="flex-shrink-0 flex items-center justify-center px-8 md:px-12 min-w-[140px] md:min-w-[180px]"
            >
              <img
                src={airline.logo}
                alt={airline.name}
                className={`${airline.className} w-auto max-w-[140px] object-contain grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300`}
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* Edge fade gradients */}
        <div className="absolute top-0 left-0 w-16 md:w-32 h-full bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
        <div className="absolute top-0 right-0 w-16 md:w-32 h-full bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
      </div>
    </section>
  );
};
