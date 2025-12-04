import { useState } from "react";

// Import airline logos
import garudaLogo from "@/assets/airlines/garuda-indonesia.png";
import saudiaLogo from "@/assets/airlines/saudia.png";
import qatarLogo from "@/assets/airlines/qatar-airways.png";
import emiratesLogo from "@/assets/airlines/emirates.png";
import omanAirLogo from "@/assets/airlines/oman-air.png";
import lionAirLogo from "@/assets/airlines/lion-air.png";
import scootLogo from "@/assets/airlines/scoot.png";

const airlines = [
  { name: "Garuda Indonesia", logo: garudaLogo },
  { name: "Saudia", logo: saudiaLogo },
  { name: "Qatar Airways", logo: qatarLogo },
  { name: "Emirates", logo: emiratesLogo },
  { name: "Oman Air", logo: omanAirLogo },
  { name: "Lion Air", logo: lionAirLogo },
  { name: "Scoot", logo: scootLogo },
];

export const AirlinesCarousel = () => {
  const [isPaused, setIsPaused] = useState(false);

  // Duplicate for seamless infinite loop
  const duplicatedAirlines = [...airlines, ...airlines];

  return (
    <section className="py-12 bg-muted/20 overflow-hidden">
      <div className="container mx-auto px-4 mb-8">
        <h2 className="text-center text-lg md:text-xl font-semibold text-muted-foreground">
          Maskapai Mitra Kami
        </h2>
      </div>

      <div
        className="relative w-full"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className="flex items-center"
          style={{
            animation: `scrollLogos 30s linear infinite`,
            animationPlayState: isPaused ? "paused" : "running",
            width: "fit-content",
          }}
        >
          {duplicatedAirlines.map((airline, index) => (
            <div
              key={`${airline.name}-${index}`}
              className="flex-shrink-0 px-8 md:px-12"
            >
              <img
                src={airline.logo}
                alt={airline.name}
                className="h-8 md:h-10 w-auto max-w-[120px] object-contain grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
                loading="lazy"
                width={120}
                height={40}
              />
            </div>
          ))}
        </div>

        {/* Edge fade gradients */}
        <div className="absolute top-0 left-0 w-16 md:w-32 h-full bg-gradient-to-r from-muted/20 to-transparent pointer-events-none z-10" />
        <div className="absolute top-0 right-0 w-16 md:w-32 h-full bg-gradient-to-l from-muted/20 to-transparent pointer-events-none z-10" />
      </div>

      <style>{`
        @keyframes scrollLogos {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
};
