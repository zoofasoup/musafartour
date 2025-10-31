import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plane, Calendar, Hotel, Star, Train, Bus, ChevronDown } from "lucide-react";
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
  // Five-Star tier props
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
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
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
  const [isOpen, setIsOpen] = useState(false);
  
  const hasFiveStarTier = !!fiveStarPrice && !!fiveStarHotelMakkah && !!fiveStarHotelMadinah;
  const hasMultipleTiers = hasFiveStarTier;
  
  const displayPrice = selectedTier === "five-star" && fiveStarPrice ? fiveStarPrice : price;
  const displayMakkahHotel = selectedTier === "five-star" && fiveStarHotelMakkah ? fiveStarHotelMakkah : hotelMakkah;
  const displayMakkahRating = selectedTier === "five-star" && fiveStarHotelMakkah ? fiveStarHotelMakkahRating : hotelMakkahRating;
  const displayMadinahHotel = selectedTier === "five-star" && fiveStarHotelMadinah ? fiveStarHotelMadinah : hotelMadinah;
  const displayMadinahRating = selectedTier === "five-star" && fiveStarHotelMadinah ? fiveStarHotelMadinahRating : hotelMadinahRating;
  const displayTransport = selectedTier === "five-star" ? fiveStarTransport : bestSellerTransport;

  const handleViewDetails = () => {
    const urlParam = slug || id;
    if (urlParam) {
      navigate(`/paket-umroh/${urlParam}`);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col lg:flex-row">
      {/* Banner Image - Left Column */}
      <div className="relative lg:w-2/5 flex-shrink-0 bg-muted">
        {seatAvailable && (
          <Badge className="absolute bottom-3 left-3 z-10 bg-orange-500 text-white border-0 rounded-sm px-3 py-1 text-xs font-bold shadow-lg">
            SEAT TERBATAS
          </Badge>
        )}
        <div className="aspect-[4/5] lg:aspect-auto lg:h-full overflow-hidden flex items-center justify-center">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </div>

      {/* Content Section - Right Column */}
      <CardContent className="p-4 flex flex-col flex-1 lg:w-3/5">
        <div className="space-y-3 flex-1">
          {/* Title */}
          <h3 className="font-bold text-xl text-foreground leading-tight line-clamp-2">{title}</h3>

          {/* Date and Duration - Prominent */}
          <div className="flex items-center gap-3 text-base font-semibold text-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-5 h-5" />
              <span>{date}</span>
            </div>
            <span className="text-border">•</span>
            <span>{duration}</span>
          </div>

          {/* Tier Selector */}
          {hasMultipleTiers && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-9 text-sm"
                >
                  <span>
                    {selectedTier === "five-star" ? "Five Star" : "Best Seller"} - {displayPrice}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs font-semibold border-b pb-2">
                    <div>Tier</div>
                    <div>Harga</div>
                    <div>Hotel</div>
                  </div>
                  <button
                    onClick={() => setSelectedTier("best-seller")}
                    className={`grid grid-cols-3 gap-2 text-xs p-2 rounded hover:bg-background transition-colors ${
                      selectedTier === "best-seller" ? "bg-background ring-2 ring-primary" : ""
                    }`}
                  >
                    <div className="font-medium">Best Seller</div>
                    <div className="font-bold text-primary">{price}</div>
                    <div className="text-left">
                      <div className="line-clamp-1">{hotelMakkah}</div>
                      <StarRating rating={hotelMakkahRating} />
                    </div>
                  </button>
                  {hasFiveStarTier && (
                    <button
                      onClick={() => setSelectedTier("five-star")}
                      className={`grid grid-cols-3 gap-2 text-xs p-2 rounded hover:bg-background transition-colors ${
                        selectedTier === "five-star" ? "bg-background ring-2 ring-primary" : ""
                      }`}
                    >
                      <div className="font-medium">Five Star</div>
                      <div className="font-bold text-primary">{fiveStarPrice}</div>
                      <div className="text-left">
                        <div className="line-clamp-1">{fiveStarHotelMakkah}</div>
                        <StarRating rating={fiveStarHotelMakkahRating} />
                      </div>
                    </button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Flight & Transport Info - Horizontal */}
          <div className="flex gap-2 flex-wrap items-center">
            <Badge variant="outline" className="bg-cyan-50 text-cyan-600 border-cyan-200 rounded-full text-xs">
              <Plane className="w-3 h-3 mr-1" />
              {airline}
            </Badge>
            {transit && (
              <Badge variant="outline" className="bg-pink-50 text-pink-600 border-pink-200 rounded-full text-xs">
                {transit}
              </Badge>
            )}
            <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 rounded-full text-xs">
              {selectedTier === "five-star" ? <Train className="w-3 h-3 mr-1" /> : <Bus className="w-3 h-3 mr-1" />}
              {displayTransport}
            </Badge>
          </div>

          {/* Hotels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayMakkahHotel && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Hotel className="w-4 h-4 text-green-600" />
                  <p className="text-xs font-semibold text-muted-foreground">Makkah:</p>
                </div>
                <div className="pl-5">
                  <p className="text-xs font-medium text-foreground line-clamp-1">{displayMakkahHotel}</p>
                  <StarRating rating={displayMakkahRating} />
                </div>
              </div>
            )}
            {displayMadinahHotel && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Hotel className="w-4 h-4 text-green-600" />
                  <p className="text-xs font-semibold text-muted-foreground">Madinah:</p>
                </div>
                <div className="pl-5">
                  <p className="text-xs font-medium text-foreground line-clamp-1">{displayMadinahHotel}</p>
                  <StarRating rating={displayMadinahRating} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Price and CTA */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Harga Mulai</p>
            <p className="text-2xl font-bold text-red-600">{displayPrice}</p>
          </div>
          <Button 
            onClick={handleViewDetails}
            className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg px-4 py-2 text-sm"
          >
            Lihat Detail
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
