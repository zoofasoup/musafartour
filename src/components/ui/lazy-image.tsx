import React, { useState } from 'react';
import { cn, getOptimizedImageUrl } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const LazyImage = ({ className, alt, src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
  const [loaded, setLoaded] = useState(false);

  const defaultSrc = getOptimizedImageUrl(src);

  return (
    <div className={cn("relative overflow-hidden isolate", className, !loaded && "bg-muted")}>
      {!loaded && (
        <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
      )}
      <img
        alt={alt}
        src={defaultSrc}
        className={cn(
          "w-full h-full transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
          className // Put original classname here so object-cover, object-top, etc applies
        )}
        onLoad={() => setLoaded(true)}
        {...props}
      />
    </div>
  );
};
