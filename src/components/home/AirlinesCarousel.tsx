import { PkgPanel } from "@/components/package-detail/PkgPanel";
import garudaLogo from "@/assets/airlines/garuda-indonesia.svg";
import saudiaLogo from "@/assets/airlines/saudia.svg";
import qatarLogo from "@/assets/airlines/qatar-airways.svg";
import emiratesLogo from "@/assets/airlines/emirates.svg";
import omanAirLogo from "@/assets/airlines/oman-air.svg";
import lionAirLogo from "@/assets/airlines/lion-air.svg";
import scootLogo from "@/assets/airlines/scoot.svg";

const airlines = [
  { name: "Garuda Indonesia", logo: garudaLogo, className: "h-12 md:h-16" },
  { name: "Saudia", logo: saudiaLogo, className: "h-10 md:h-14" },
  { name: "Qatar Airways", logo: qatarLogo, className: "h-10 md:h-14" },
  { name: "Emirates", logo: emiratesLogo, className: "h-12 md:h-16" },
  { name: "Oman Air", logo: omanAirLogo, className: "h-12 md:h-16" },
  { name: "Lion Air", logo: lionAirLogo, className: "h-10 md:h-14" },
  { name: "Scoot", logo: scootLogo, className: "h-14 md:h-20" },
];

export const AirlinesCarousel = () => {
  // Three identical sets; the track is as wide as its content (w-max), so the -1/3 shift is exactly one set and the loop never cuts.
  const items = [...airlines, ...airlines, ...airlines];

  return (
    <PkgPanel tone="cream-2" className="!px-0 !pt-7 !pb-12">
      <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
        <div className="flex w-max items-center animate-scroll-logos" style={{ animationDuration: "100s" }}>
          {items.map((airline, index) => (
            <div key={`${airline.name}-${index}`} className="flex min-w-[140px] flex-shrink-0 items-center justify-center px-8 md:min-w-[180px] md:px-12">
              <img src={airline.logo} alt={airline.name} className={`${airline.className} w-auto max-w-[140px] object-contain`} loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </PkgPanel>
  );
};
