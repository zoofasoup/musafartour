import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Heart, ChevronLeft, ChevronRight, Bell, Users, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "@/hooks/use-toast";

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

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 fill-foreground text-foreground" />
      <span className="text-sm font-medium">{rating}.0</span>
    </div>
  );
};

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
  hotelMakkahRating = 4,
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
      price,
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
      className={`cursor-pointer group ${isSoldOut ? 'opacity-90' : ''} ${className}`}
    >
      {/* Image Container */}
      <div className={`relative rounded-xl overflow-hidden mb-3 ${imageClassName}`}>
        {isSoldOut && (
          <div className="absolute top-0 left-0 right-0 z-20">
            <div className="bg-destructive text-destructive-foreground text-center py-2 font-bold text-sm shadow-lg">
              PENUH
            </div>
          </div>
        )}

        {!isSoldOut && seatAvailable && (
          <Badge className="absolute top-3 left-3 z-10 bg-background text-foreground border shadow-sm rounded-full px-3 py-1 text-xs font-medium">
            Seat Terbatas
          </Badge>
        )}
        
        <button
          ref={heartRef}
          onClick={handleFavoriteClick}
          className={`absolute ${isSoldOut ? 'top-12' : 'top-3'} right-3 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-all ${
            isAnimating ? 'animate-heart-bounce' : ''
          }`}
          aria-label={isFav ? "Hapus dari favorit" : "Tambah ke favorit"}
        >
          <Heart 
            className={`w-5 h-5 transition-all duration-200 ${
              isFav ? 'fill-primary text-primary' : 'text-foreground hover:text-primary'
            } ${isAnimating ? 'scale-125' : ''}`} 
          />
        </button>
        
        {isAnimating && isFav && (
          <div className={`absolute ${isSoldOut ? 'top-12' : 'top-3'} right-3 z-20 pointer-events-none`}>
            <span className="absolute w-1.5 h-1.5 bg-primary rounded-full animate-particle-1" />
            <span className="absolute w-1.5 h-1.5 bg-primary rounded-full animate-particle-2" />
            <span className="absolute w-1 h-1 bg-primary/80 rounded-full animate-particle-3" />
            <span className="absolute w-1 h-1 bg-primary/80 rounded-full animate-particle-4" />
            <span className="absolute w-1.5 h-1.5 bg-primary rounded-full animate-particle-5" />
            <span className="absolute w-1 h-1 bg-primary/60 rounded-full animate-particle-6" />
          </div>
        )}

        <img
          src={allImages[currentImageIndex] || '/placeholder.svg'}
          alt={`Paket Umroh ${title} - Musafar Tour`}
          loading={index < 4 ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={index < 4 ? 'high' : 'auto'}
          width="600"
          height="600"
          className={`w-full h-full object-cover transition-all duration-300 ${
            isSoldOut ? 'grayscale-[60%] brightness-75' : 'group-hover:scale-105'
          }`}
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== window.location.origin + '/placeholder.svg') {
              target.src = '/placeholder.svg';
            }
          }}
        />

        {isSoldOut && (
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        )}

        {hasMultipleImages && isHovered && !isSoldOut && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/90 hover:bg-background shadow-md transition-all opacity-0 group-hover:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/90 hover:bg-background shadow-md transition-all opacity-0 group-hover:opacity-100"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {hasMultipleImages && !isSoldOut && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {allImages.slice(0, 5).map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => handleDotClick(e, idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  currentImageIndex === idx 
                    ? 'bg-background w-2' 
                    : 'bg-background/60 hover:bg-background/80'
                }`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {isSoldOut && waitlistCount > 0 && (
          <div className="absolute bottom-3 left-3 z-10">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-xs">
              <Users className="w-3 h-3 mr-1" />
              {waitlistCount} jamaah sudah daftar
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className={`font-semibold text-[15px] leading-tight line-clamp-1 ${isSoldOut ? 'text-muted-foreground' : 'text-foreground'}`}>
            {title}
          </h3>
          <StarRating rating={hotelMakkahRating} />
        </div>

        <p className="text-sm text-muted-foreground line-clamp-1">
          {airline}{transit ? ` · ${transit}` : ''}
        </p>

        <p className="text-sm text-muted-foreground">
          {duration} · {date}
        </p>
        
        {!isSoldOut && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pb-0.5">
            <span className="inline-flex items-center text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
              <ShieldCheck className="w-3 h-3 mr-1" /> Visa Terjamin
            </span>
            <span className="inline-flex items-center text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              <CheckCircle2 className="w-3 h-3 mr-1" /> All-in
            </span>
          </div>
        )}

        {isSoldOut ? (
          <div className="pt-2 space-y-2">
            <p className="text-sm text-muted-foreground line-through">{price} /orang</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full gap-2"
              onClick={handleNotifyMe}
            >
              <Bell className="w-4 h-4" />
              Notify Me
            </Button>
          </div>
        ) : (
          <p className="pt-1">
            <span className="font-semibold text-foreground">{price}</span>
            <span className="text-muted-foreground text-sm"> /orang</span>
          </p>
        )}
      </div>
    </article>
  );
};
