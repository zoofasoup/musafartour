import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Heart, ChevronLeft, ChevronRight, Bell, Users, ShieldCheck, CheckCircle2, ShoppingCart, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "@/hooks/use-toast";
import { LazyImage } from "@/components/ui/lazy-image";
import { getPriceBadgeStyle, getOptimizedImageUrl } from "@/lib/utils";

import garudaLogo from "@/assets/airlines/garuda-indonesia.svg";
import saudiaLogo from "@/assets/airlines/saudia.svg";
import qatarLogo from "@/assets/airlines/qatar-airways.svg";
import emiratesLogo from "@/assets/airlines/emirates.svg";
import omanAirLogo from "@/assets/airlines/oman-air.svg";
import lionAirLogo from "@/assets/airlines/lion-air.svg";
import scootLogo from "@/assets/airlines/scoot.svg";

const airlineLogos: Record<string, string> = {
  "Garuda Indonesia": garudaLogo,
  "Saudia": saudiaLogo,
  "Qatar Airways": qatarLogo,
  "Emirates": emiratesLogo,
  "Oman Air": omanAirLogo,
  "Lion Air": lionAirLogo,
  "Scoot": scootLogo,
};

interface PackageCardProps {
  id?: string;
  slug?: string;
  image: string;
  images?: string[];
  title: string;
  price: string;
  date: string;
  duration: string;
  airline: string;
  transit?: string;
  hotelMakkah?: string;
  hotelMakkahRating?: number;
  hotelMadinah?: string;
  hotelMadinahRating?: number;
  category: string;
  seatAvailable?: boolean;
  isSoldOut?: boolean;
  waitlistCount?: number;
  index?: number;
  className?: string;
  imageClassName?: string;
}



export const PackageCard = ({
  id,
  slug,
  image,
  images = [],
  title,
  price,
  date,
  duration,
  airline,
  transit,
  hotelMakkah = "Hotel Makkah",
  hotelMakkahRating = 4,
  hotelMadinah = "Hotel Madinah",
  hotelMadinahRating = 4,
  category,
  seatAvailable = true,
  isSoldOut = false,
  waitlistCount = 0,
  index = 0,
  className = "",
  imageClassName = "aspect-square",
}: PackageCardProps) => {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  // Format price "Rp 32.500.000" to "32,5 Jt"
  const formatPriceJuta = (priceStr: string) => {
    const numStr = priceStr.replace(/\D/g, '');
    if (!numStr) return priceStr;
    const num = parseInt(numStr, 10);
    if (num >= 1000000) {
      let jt = (num / 1000000).toFixed(1);
      jt = jt.replace('.', ',');
      if (jt.endsWith(',0')) {
        jt = jt.replace(',0', '');
      }
      return `${jt} Jt`;
    }
    return priceStr;
  };
  
  const displayPrice = formatPriceJuta(price);

  const allImages = [image, ...images].filter(Boolean);
  const hasMultipleImages = allImages.length > 1;

  const packageId = id || slug || '';
  const isFav = isFavorite(packageId);
  const [isAnimating, setIsAnimating] = useState(false);
  const heartRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    const urlParam = slug || id;
    if (urlParam) {
      navigate(`/paket-umroh/${urlParam}`);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);
    toggleFavorite({
      id: packageId,
      slug,
      title,
      image,
      price: displayPrice,
      date,
    });
  };

  const handleNotifyMe = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: "Notifikasi Aktif",
      description: `Kami akan memberitahu Anda jika ada seat tersedia untuk ${title}`,
    });
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1);
  };

  const handleDotClick = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    setCurrentImageIndex(idx);
  };

  return (
    <article 
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`cursor-pointer group flex flex-col bg-card rounded-3xl border border-border shadow-sm p-2 md:p-2.5 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out ${isSoldOut ? 'opacity-90' : ''} ${className}`}
    >
      {/* Image Container */}
      <div className="relative w-full h-[160px] md:h-[170px] shrink-0 bg-muted rounded-2xl md:rounded-[20px] overflow-hidden">
        {isSoldOut && (
          <div className="absolute top-0 left-0 right-0 z-20">
            <div className="bg-destructive text-destructive-foreground text-center py-2 font-bold text-sm shadow-lg">
              PENUH
            </div>
          </div>
        )}

        <LazyImage
          src={getOptimizedImageUrl(allImages[currentImageIndex], 500) || '/placeholder.svg'}
          alt={`Paket Umroh ${title} - Musafar Tour`}
          loading={index < 4 ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={index < 4 ? 'high' : 'auto'}
          className={`w-full h-full object-cover object-top transition-all duration-500 ${
            isSoldOut ? 'grayscale-[60%] brightness-75' : ''
          }`}
          onError={(e: any) => {
            const target = e.currentTarget;
            if (target.src !== window.location.origin + '/placeholder.svg') {
              target.src = '/placeholder.svg';
            }
          }}
        />

        {/* Blur Gradient Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-24 backdrop-blur-md [mask-image:linear-gradient(to_top,black,transparent)] [-webkit-mask-image:linear-gradient(to_top,black,transparent)] pointer-events-none z-10" />

        {isSoldOut && (
          <div className="absolute inset-0 bg-black/30 pointer-events-none z-10" />
        )}

        {hasMultipleImages && isHovered && !isSoldOut && (
          <>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePrevImage(e); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-background/90 hover:bg-background shadow-md transition-all opacity-0 group-hover:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNextImage(e); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-background/90 hover:bg-background shadow-md transition-all opacity-0 group-hover:opacity-100"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {hasMultipleImages && !isSoldOut && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {allImages.slice(0, 5).map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDotClick(e, idx); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  currentImageIndex === idx 
                    ? 'bg-white w-3' 
                    : 'bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Cart Button Overlaid */}
        <div className="absolute bottom-4 right-4 z-20">
          {!isSoldOut && (
            <button
              ref={heartRef}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleFavoriteClick(e); }}
              className={`p-2.5 rounded-xl backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 transition-all shadow-lg ${isAnimating ? 'scale-110' : ''}`}
              aria-label={isFav ? "Keluarkan dari keranjang" : "Masukkan ke keranjang"}
            >
              <ShoppingCart 
                className={`w-5 h-5 transition-all duration-300 ${
                  isFav ? 'fill-white text-white' : 'text-white'
                }`} 
              />
            </button>
          )}
        </div>

        {isSoldOut && waitlistCount > 0 && (
          <div className="absolute bottom-16 left-4 z-20">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-xs border-0">
              <Users className="w-3 h-3 mr-1" />
              {waitlistCount} jamaah daftar
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 space-y-1 z-10">
        
        <div className="flex flex-col gap-2.5">
          {/* Header: Date & Duration */}
          <div className="flex items-baseline gap-2">
            <h3 className="font-bold text-lg text-foreground tracking-tight">
              {date}
            </h3>
            <span className="font-semibold text-sm text-muted-foreground">
              · {duration}
            </span>
          </div>

          {/* Details: Hotels (Left) & Airline (Right) */}
          <div className="flex items-center justify-between mt-0.5">
            {/* Hotels (Left) */}
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground/80 font-semibold">
              {hotelMakkah && (
                <div className="flex items-center gap-1.5" title={`Makkah: ${hotelMakkah}`}>
                  <span className="truncate max-w-[130px]">{hotelMakkah}</span>
                  <span className="flex items-center text-amber-500/90"><Star className="w-3 h-3 fill-current mr-0.5" />{hotelMakkahRating}</span>
                </div>
              )}

              {hotelMadinah && (
                <div className="flex items-center gap-1.5" title={`Madinah: ${hotelMadinah}`}>
                  <span className="truncate max-w-[130px]">{hotelMadinah}</span>
                  <span className="flex items-center text-amber-500/90"><Star className="w-3 h-3 fill-current mr-0.5" />{hotelMadinahRating}</span>
                </div>
              )}
            </div>

            {/* Airline (Right) */}
            <div className="flex items-center shrink-0">
              {airlineLogos[airline] ? (
                <img src={airlineLogos[airline]} alt={airline} className="h-5 object-contain opacity-80" title={airline} />
              ) : (
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{airline}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action: Price & Button */}
        <div className="mt-auto pt-4 flex items-center justify-between">
          {isSoldOut ? (
            <div className="space-y-2 w-full">
              <p className="text-sm text-muted-foreground line-through px-1">{displayPrice} Quad</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2 rounded-full h-9 text-sm font-semibold"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNotifyMe(e); }}
              >
                <Bell className="w-4 h-4" />
                Notify Me
              </Button>
            </div>
          ) : (
            <>
              {/* Price Pill */}
              <div className={`px-3.5 py-1.5 rounded-full flex items-center shadow-sm ${getPriceBadgeStyle(title)}`}>
                <span className="font-extrabold text-xl tracking-tight">{displayPrice}</span>
              </div>
              
              {/* Action Pill */}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/paket-umroh/${slug || id}`); }}
                className="flex items-center justify-center bg-foreground text-background hover:bg-foreground/90 w-9 h-9 rounded-full transition-all shadow-md group/btn"
                aria-label="Lihat Detail"
              >
                <ArrowUpRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
};
