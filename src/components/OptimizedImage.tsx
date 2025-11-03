import { LazyImage } from "./LazyImage";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  isHero?: boolean;
  priority?: boolean;
}

/**
 * Optimized image component with automatic WebP conversion and responsive srcset
 * Use for all images on the site for best performance
 */
export const OptimizedImage = ({
  src,
  alt,
  className,
  isHero = false,
  priority = false,
}: OptimizedImageProps) => {
  return (
    <LazyImage
      src={src}
      alt={alt}
      className={className}
      responsive={true}
      isHero={isHero || priority}
      fetchPriority={priority ? "high" : "auto"}
      sizes="(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px"
    />
  );
};
