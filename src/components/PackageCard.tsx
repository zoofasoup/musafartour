import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plane, Calendar, Hotel, MapPin } from "lucide-react";

interface PackageCardProps {
  image: string;
  title: string;
  price: string;
  duration: string;
  airline: string;
  hotelClass: string;
  departureCity: string;
  category: string;
}

export const PackageCard = ({
  image,
  title,
  price,
  duration,
  airline,
  hotelClass,
  departureCity,
  category,
}: PackageCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
          {category}
        </Badge>
      </div>
      <CardContent className="p-5">
        <h3 className="font-semibold text-lg mb-3 text-foreground">{title}</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary" />
            <span>{airline}</span>
          </div>
          <div className="flex items-center gap-2">
            <Hotel className="w-4 h-4 text-primary" />
            <span>{hotelClass}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{departureCity}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-5 pt-0 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Starting from</p>
          <p className="text-2xl font-bold text-primary">{price}</p>
        </div>
        <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};
