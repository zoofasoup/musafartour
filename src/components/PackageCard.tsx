import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plane, Calendar, Star, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PackageCardProps {
  id?: string;
  slug?: string;
  image: string;
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
  const [selectedTier, setSelectedTier] = useState<"best-seller" | "five-star">("best-seller");
  
  const hasFiveStarTier = !!fiveStarPrice && !!fiveStarHotelMakkah && !!fiveStarHotelMadinah;
  
  const displayPrice = selectedTier === "five-star" && fiveStarPrice ? fiveStarPrice : price;
  const displayMakkahRating = selectedTier === "five-star" && fiveStarHotelMakkah ? fiveStarHotelMakkahRating : hotelMakkahRating;

  const handleClick = () => {
    const urlParam = slug || id;
    if (urlParam) {
      navigate(`/paket-umroh/${urlParam}`);
    }
  };

  return (
    <article 
      onClick={handleClick}
      className="cursor-pointer group"
    >
      {/* Image Container */}
      <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
        {seatAvailable && (
          <Badge className="absolute top-3 left-3 z-10 bg-background text-foreground border shadow-sm rounded-full px-3 py-1 text-xs font-medium">
            Seat Terbatas
          </Badge>
        )}
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
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
