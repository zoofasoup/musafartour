import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";

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
  fiveStarPrice?: string;
  fiveStarHotelMakkah?: string;
  fiveStarHotelMakkahRating?: number;
  fiveStarHotelMadinah?: string;
  fiveStarHotelMadinahRating?: number;
  fiveStarTransport?: string;
  bestSellerTransport?: string;
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
  hotelMakkah,
  hotelMakkahRating = 4,
  hotelMadinah,
  hotelMadinahRating = 4,
  category,
  seatAvailable = true,
  fiveStarPrice,
  fiveStarHotelMakkah,
  fiveStarHotelMakkahRating = 5,
  fiveStarHotelMadinah,
  fiveStarHotelMadinahRating = 5,
  fiveStarTransport = "Kereta Cepat",
  bestSellerTransport = "Bus Eksklusif",
}: PackageCardProps) => {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [selectedTier, setSelectedTier] = useState<"best-seller" | "five-star">("best-seller");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  // Combine main image with gallery images
  const allImages = [image, ...images].filter(Boolean);
  const hasMultipleImages = allImages.length > 1;
  
  const hasFiveStarTier = !!fiveStarPrice && !!fiveStarHotelMakkah && !!fiveStarHotelMadinah;
  
  const displayPrice = selectedTier === "five-star" && fiveStarPrice ? fiveStarPrice : price;
  const displayMakkahRating = selectedTier === "five-star" && fiveStarHotelMakkah ? fiveStarHotelMakkahRating : hotelMakkahRating;

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
    
    // Trigger animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);
    
    toggleFavorite({
      id: packageId,
      slug,
      title,
      image,
      price: displayPrice,
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

  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

  return (
    <article 
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="cursor-pointer group"
    >
      {/* Image Container */}
      <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
        {seatAvailable && (
          <Badge className="absolute top-3 left-3 z-10 bg-background text-foreground border shadow-sm rounded-full px-3 py-1 text-xs font-medium">
            Seat Terbatas
          </Badge>
        )}
        
        {/* Favorite Button */}
        <button
          ref={heartRef}
          onClick={handleFavoriteClick}
          className={`absolute top-3 right-3 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-all ${
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
        
        {/* Particle effects on favorite */}
        {isAnimating && isFav && (
          <div className="absolute top-3 right-3 z-20 pointer-events-none">
            <span className="absolute w-1.5 h-1.5 bg-primary rounded-full animate-particle-1" />
            <span className="absolute w-1.5 h-1.5 bg-primary rounded-full animate-particle-2" />
            <span className="absolute w-1 h-1 bg-primary/80 rounded-full animate-particle-3" />
            <span className="absolute w-1 h-1 bg-primary/80 rounded-full animate-particle-4" />
            <span className="absolute w-1.5 h-1.5 bg-primary rounded-full animate-particle-5" />
            <span className="absolute w-1 h-1 bg-primary/60 rounded-full animate-particle-6" />
          </div>
        )}

        {/* Image Carousel */}
        <img
          src={allImages[currentImageIndex]}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Navigation Arrows */}
        {hasMultipleImages && isHovered && (
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

        {/* Carousel Dots */}
        {hasMultipleImages && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {allImages.slice(0, 5).map((_, index) => (
              <button
                key={index}
                onClick={(e) => handleDotClick(e, index)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  currentImageIndex === index 
                    ? 'bg-background w-2' 
                    : 'bg-background/60 hover:bg-background/80'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-1">
        {/* Title Row with Rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[15px] text-foreground leading-tight line-clamp-1">
            {title}
          </h3>
          <StarRating rating={displayMakkahRating} />
        </div>

        {/* Airline & Transit */}
        <p className="text-sm text-muted-foreground line-clamp-1">
          {airline}{transit ? ` · ${transit}` : ''}
        </p>

        {/* Duration & Date */}
        <p className="text-sm text-muted-foreground">
          {duration} · {date}
        </p>

        {/* Tier Selector */}
        {hasFiveStarTier && (
          <Select value={selectedTier} onValueChange={(value) => setSelectedTier(value as "best-seller" | "five-star")}>
            <SelectTrigger className="w-full h-8 text-xs mt-2" onClick={(e) => e.stopPropagation()}>
              <SelectValue>
                {selectedTier === "five-star" ? "Five Star" : "Best Seller"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="best-seller">Best Seller</SelectItem>
              <SelectItem value="five-star">Five Star</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Price */}
        <p className="pt-1">
          <span className="font-semibold text-foreground">{displayPrice}</span>
          <span className="text-muted-foreground text-sm"> /orang</span>
        </p>
      </div>
    </article>
  );
};
