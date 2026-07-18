import { useState, useEffect, useRef } from 'react';
import { cn, getOptimizedImageUrl } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
  responsive?: boolean;
  isHero?: boolean;
}

export const LazyImage = ({ 
  src, 
  alt, 
  className, 
  placeholderClassName,
  fetchPriority = 'auto',
  sizes,
  responsive = false,
  isHero = false,
  ...props 
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // If it's a hero image, we load it immediately without IntersectionObserver
    if (isHero) {
      setIsInView(true);
      return;
    }

    const currentImgRef = imgRef.current;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (currentImgRef) {
            observer.unobserve(currentImgRef);
          }
        }
      },
      {
        rootMargin: '100px', // Start loading when image is 100px near viewport
        threshold: 0.1
      }
    );

    if (currentImgRef) {
      observer.observe(currentImgRef);
    }

    return () => {
      if (currentImgRef) {
        observer.unobserve(currentImgRef);
      }
    };
  }, [isHero]);

  // Handle responsive images if enabled
  const optimizedSrc = getOptimizedImageUrl(src, 800);
  
  const srcSet = responsive 
    ? `${getOptimizedImageUrl(src, 640)} 640w, ${getOptimizedImageUrl(src, 1024)} 1024w, ${getOptimizedImageUrl(src, 1920)} 1920w`
    : undefined;
  
  const responsiveSizes = responsive 
    ? sizes || '(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px'
    : sizes;

  const defaultSrc = optimizedSrc;

  return (
    <div className="relative overflow-hidden">
      {!isLoaded && (
        <div className={cn(
          "absolute inset-0 bg-muted animate-pulse",
          placeholderClassName
        )} />
      )}
      <img
        ref={imgRef}
        src={isInView ? defaultSrc : ''}
        srcSet={isInView ? srcSet : undefined}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={() => setIsLoaded(true)}
        loading={isHero ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={fetchPriority}
        sizes={responsiveSizes}
        {...props}
      />
    </div>
  );
};
