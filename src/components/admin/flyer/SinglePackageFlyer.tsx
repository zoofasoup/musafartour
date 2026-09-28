import React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Building2, MapPin } from "lucide-react";

interface SinglePackageFlyerProps {
  tier?: string;
  title?: string;
  timeframe?: string;
  priceQuad?: number;
  priceTriple?: number;
  priceDouble?: number;
  departureDate?: string | null;
  duration?: number;
  flightType?: string;
  flightRoute?: string;
  airlineName?: string;
  airlineImage?: string | null;
  startCity?: string;
  nightsMakkah?: number;
  nightsMadinah?: number;
  facilities?: any[];
  hotels?: any[];
}

export const SinglePackageFlyer = ({
  tier = "hemat",
  title = "Umroh Hemat",
  timeframe = "Liburan Sekolah",
  priceQuad = 29900000,
  priceTriple = 31900000,
  priceDouble = 33900000,
  departureDate,
  duration = 9,
  flightType = "Transit Flight",
  flightRoute = "CGK - MCT - JED | JED - MCT - CGK",
  airlineName = "Oman Air",
  airlineImage,
  startCity = "Jakarta",
  nightsMakkah = 4,
  nightsMadinah = 3,
  facilities = [],
  hotels = []
}: SinglePackageFlyerProps) => {
  const normalizedTier = (tier || "hemat").toLowerCase();
  
  const formattedDate = departureDate 
    ? format(new Date(departureDate), "dd MMMM yyyy", { locale: localeId })
    : "21 Juni 2026";

  const titleParts = title.split(" ");
  const titleLine1 = titleParts[0] || "Umroh";
  const titleLine2 = titleParts.slice(1).join(" ") || "Hemat";

  const formatPrice = (price: number) => (price / 1000000).toFixed(1);

  // Default bonuses if empty
  const displayBonuses = facilities.length > 0 
    ? facilities.slice(0, 5) 
    : [
        { name: "Perlengkapan Manasik & Full Handling" },
        { name: "Al Romansiah" },
        { name: "Quba Night" },
        { name: "Fotografer Grup" },
        { name: "Tour Thaif" }
      ];

  const makkahHotel = hotels.find(h => h.location === "Makkah")?.name || "Mövenpick / Setaraf";
  const madinahHotel = hotels.find(h => h.location === "Madinah")?.name || "Rua International / Setaraf";
  const makkahStars = hotels.find(h => h.location === "Makkah")?.stars || 5;
  const madinahStars = hotels.find(h => h.location === "Madinah")?.stars || 3;

  // Render Airline Logo
  const renderAirline = () => {
    // Map popular airlines to quick text or placeholders
    return (
      <div className="flex flex-col items-start mt-[0.5cqw]">
        {airlineImage ? (
           <img src={airlineImage} alt={airlineName} className="h-[4cqw] object-contain" />
        ) : (
           <div className="flex items-center gap-[1cqw]">
             <span className="font-bold text-[3cqw] italic">{airlineName}</span>
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full aspect-[4/5] bg-gray-900 overflow-hidden rounded-md shadow-xl text-white font-['Onest']" style={{ containerType: "inline-size" }}>
      
      {/* Background Image */}
      <img 
        src={`/blank-templates/${normalizedTier}.png`} 
        className="absolute inset-0 w-full h-full object-cover z-0" 
        onError={(e) => e.currentTarget.style.display = "none"} 
        alt="Background Template" 
      />
      
      {/* Overlay Content */}
      <div className="absolute inset-0 z-10 w-full h-full">
        
        {/* Title Block */}
        <div className="absolute top-[12.5%] left-[7.5%] flex flex-col items-start">
          <h1 className="text-[12cqw] font-extrabold leading-[0.9] tracking-tight text-white drop-shadow-md">
            {titleLine1}
            <br />
            {titleLine2}
          </h1>
          <div className="mt-[3cqw] bg-[#d8f3dc] text-[#1b4332] font-bold px-[2cqw] py-[0.5cqw] rounded-sm text-[3.5cqw] shadow-sm">
            {timeframe}
          </div>
        </div>

        {/* Date Block */}
        <div className="absolute top-[35%] left-[7.5%] flex items-center gap-[1.5cqw] font-bold text-[5cqw] drop-shadow-md">
          <span>{duration} Hari</span>
          <div className="w-[4cqw] h-[4cqw] bg-[#0ea5e9] rounded-full flex items-center justify-center text-[2.5cqw] text-white">✓</div>
          <span>{formattedDate}</span>
        </div>

        {/* Flight Block */}
        <div className="absolute top-[43%] left-[7.5%] flex justify-between items-start w-[50%] drop-shadow-md">
          <div className="flex flex-col">
            <span className="font-bold text-[4cqw]">{flightType}</span>
            <span className="text-[2.5cqw] font-semibold tracking-widest mt-[0.5cqw] uppercase">{flightRoute}</span>
          </div>
          {renderAirline()}
        </div>

        {/* Price Block */}
        <div className="absolute top-[54%] left-[7.5%] flex items-end gap-[4cqw]">
          {/* Main Price (Quad) */}
          <div className="flex flex-col">
            <span className="text-[2.5cqw] tracking-widest opacity-90 mb-[-1cqw]">Ber - 4</span>
            <div className="flex items-start">
              <span className="text-[17cqw] font-black tracking-tighter leading-none drop-shadow-lg">
                {formatPrice(priceQuad)}
              </span>
              <div className="bg-[#dc2626] rounded-full w-[6cqw] h-[6cqw] flex items-center justify-center mt-[2cqw] ml-[1cqw] shadow-md">
                <span className="text-[2.5cqw] font-bold text-white">jt</span>
              </div>
            </div>
          </div>

          {/* Secondary Prices */}
          <div className="flex flex-col gap-[2cqw] pb-[1.5cqw]">
            <div className="flex flex-col">
              <span className="text-[2cqw] opacity-90 mb-[-0.5cqw]">Ber - 3</span>
              <div className="flex items-center gap-[0.5cqw]">
                <span className="text-[6cqw] font-black leading-none drop-shadow-md">{formatPrice(priceTriple)}</span>
                <div className="bg-[#dc2626] rounded-full w-[3cqw] h-[3cqw] flex items-center justify-center mt-[0.5cqw]">
                  <span className="text-[1.2cqw] font-bold">jt</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[2cqw] opacity-90 mb-[-0.5cqw]">Ber - 2</span>
              <div className="flex items-center gap-[0.5cqw]">
                <span className="text-[6cqw] font-black leading-none drop-shadow-md">{formatPrice(priceDouble)}</span>
                <div className="bg-[#dc2626] rounded-full w-[3cqw] h-[3cqw] flex items-center justify-center mt-[0.5cqw]">
                  <span className="text-[1.2cqw] font-bold">jt</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bonus Section */}
        <div className="absolute top-[69%] left-[7.5%] right-[7.5%] flex flex-col gap-[1cqw]">
          <span className="font-extrabold text-[4.5cqw] italic text-center drop-shadow-md">Bonus!</span>
          <div className="flex gap-[1cqw] overflow-hidden">
            {displayBonuses.map((bonus, idx) => (
              <div key={idx} className="flex-1 bg-white/10 border-2 border-dashed border-white/40 rounded-sm p-[1cqw] flex items-center justify-center text-center">
                <span className="text-[1.8cqw] font-bold leading-tight line-clamp-2">{bonus.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Info Box */}
        <div className="absolute top-[80%] left-[7.5%] right-[7.5%] flex items-stretch gap-[3cqw]">
          {/* Left: Duration Details */}
          <div className="flex flex-col items-start gap-[1cqw]">
            <div className="bg-[#166534] text-white text-[2.5cqw] font-bold px-[2cqw] py-[0.5cqw] rounded-sm uppercase tracking-wider">
              Start {startCity}
            </div>
            <div className="flex flex-col font-extrabold text-[3cqw] leading-tight drop-shadow-md mt-[0.5cqw]">
              <span>{nightsMakkah} Malam Makkah</span>
              <span>{nightsMadinah} Malam Madinah</span>
            </div>
          </div>

          {/* Right: Hotel Box */}
          <div className="flex-1 bg-white text-gray-900 rounded-lg p-[2cqw] flex items-center justify-around shadow-xl">
            {/* Makkah Hotel */}
            <div className="flex items-center gap-[1.5cqw]">
              <Building2 className="w-[5cqw] h-[5cqw] text-gray-700" />
              <div className="flex flex-col">
                <span className="text-[1.8cqw] text-gray-500 font-semibold leading-tight">Hotel Mekah</span>
                <span className="text-[2.5cqw] font-black leading-tight max-w-[15cqw] truncate">{makkahHotel}</span>
                <div className="text-[1.5cqw] text-gray-400 font-bold mt-[0.2cqw]">{"★".repeat(makkahStars)} / Setaraf</div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-[6cqw] bg-gray-200"></div>

            {/* Madinah Hotel */}
            <div className="flex items-center gap-[1.5cqw]">
              <MapPin className="w-[5cqw] h-[5cqw] text-gray-700" />
              <div className="flex flex-col">
                <span className="text-[1.8cqw] text-gray-500 font-semibold leading-tight">Hotel Madinah</span>
                <span className="text-[2.5cqw] font-black leading-tight max-w-[15cqw] truncate">{madinahHotel}</span>
                <div className="text-[1.5cqw] text-gray-400 font-bold mt-[0.2cqw]">{"★".repeat(madinahStars)} / Setaraf</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
