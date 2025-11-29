import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import testimonialMale from "@/assets/testimonial-male.png";
import testimonialFemale from "@/assets/testimonial-female.png";

interface TestimonialCardProps {
  name: string;
  text: string;
  location: string;
  gender?: 'male' | 'female';
  imageUrl?: string | null;
}

export const TestimonialCard = ({ name, text, location, gender = 'male', imageUrl }: TestimonialCardProps) => {
  const defaultAvatar = gender === 'female' ? testimonialFemale : testimonialMale;
  const avatarImage = imageUrl || defaultAvatar;

  return (
    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow h-full flex flex-col">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-[#FBBC05] text-[#FBBC05]" />
            ))}
          </div>
          <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </div>
        <p className="text-foreground leading-relaxed mb-4 flex-grow line-clamp-4">"{text}"</p>
        <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border/50">
          <img
            src={avatarImage}
            alt={name}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{name}</p>
            <p className="text-sm text-muted-foreground truncate">{location}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
