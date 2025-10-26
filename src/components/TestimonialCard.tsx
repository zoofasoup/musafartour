import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

interface TestimonialCardProps {
  name: string;
  image: string;
  text: string;
  location: string;
}

export const TestimonialCard = ({ name, image, text, location }: TestimonialCardProps) => {
  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-6">
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-accent text-accent" />
          ))}
        </div>
        <p className="text-muted-foreground italic mb-4">"{text}"</p>
        <div className="flex items-center gap-3">
          <img
            src={image}
            alt={name}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold text-foreground">{name}</p>
            <p className="text-sm text-muted-foreground">{location}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
