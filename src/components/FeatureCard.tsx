import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  compact?: boolean;
}

export const FeatureCard = ({ icon: Icon, title, description, compact = false }: FeatureCardProps) => {
  if (compact) {
    return (
      <Card className="group relative border border-border/50 shadow-md hover:shadow-xl transition-all duration-300 bg-card overflow-hidden hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <CardContent className="relative p-5 flex items-start gap-4">
          <div className="relative flex-shrink-0 w-12 h-12">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 rotate-3 group-hover:rotate-6 transition-transform duration-300" />
            <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
              <Icon className="w-6 h-6 text-primary-foreground" strokeWidth={1.5} />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base mb-1 text-foreground group-hover:text-primary transition-colors duration-300">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {description}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group relative border border-border/50 shadow-md hover:shadow-xl transition-all duration-300 bg-card overflow-hidden hover:-translate-y-1">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="relative p-8 text-center">
        {/* Icon with animated ring */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 rotate-6 group-hover:rotate-12 transition-transform duration-300" />
          <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <Icon className="w-10 h-10 text-primary-foreground" strokeWidth={1.5} />
          </div>
        </div>
        
        <h3 className="font-bold text-xl mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
};
