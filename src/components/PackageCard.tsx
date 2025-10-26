import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plane, Calendar, Hotel, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PackageCardProps {
  id?: string;
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
}: PackageCardProps) => {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    if (id) {
      navigate(`/paket-umroh/${id}`);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">
      {/* Flyer Image - Top with 1080:1350 aspect ratio */}
      <div className="relative">
        {seatAvailable && (
          <Badge className="absolute bottom-3 left-3 z-10 bg-orange-500 text-white border-0 rounded-sm px-3 py-1 text-xs font-bold shadow-lg">
            SEAT TERBATAS
          </Badge>
        )}
        <div className="aspect-[1080/1350] overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </div>

      {/* Content Section - Bottom */}
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="space-y-3 flex-1">
          {/* Title */}
          <h3 className="font-bold text-lg text-foreground leading-tight line-clamp-2">{title}</h3>

          {/* Date and Duration */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{date}</span>
            <span className="mx-1">•</span>
            <span>{duration}</span>
          </div>

          {/* Transit & Airline Badges */}
          <div className="flex gap-2 flex-wrap">
            {transit && (
              <Badge variant="outline" className="bg-pink-50 text-pink-600 border-pink-200 rounded-full text-xs">
                <Plane className="w-3 h-3 mr-1" />
                {transit}
              </Badge>
            )}
            <Badge variant="outline" className="bg-cyan-50 text-cyan-600 border-cyan-200 rounded-full text-xs">
              <Plane className="w-3 h-3 mr-1" />
              {airline}
            </Badge>
          </div>

          {/* Hotels */}
          <div className="space-y-2">
            {hotelMakkah && (
              <div className="flex items-start gap-2">
                <Hotel className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{hotelMakkah}</p>
                  <StarRating rating={hotelMakkahRating} />
                </div>
              </div>
            )}
            {hotelMadinah && (
              <div className="flex items-start gap-2">
                <Hotel className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{hotelMadinah}</p>
                  <StarRating rating={hotelMadinahRating} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Price and CTA */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Harga Mulai</p>
            <p className="text-xl font-bold text-red-600">{price}</p>
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
