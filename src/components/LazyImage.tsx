import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

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
  const [isInView, setIsInView] = useState(isHero); // Hero images load immediately
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current || isHero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [isHero]);

  // Generate responsive srcSet if enabled
  const srcSet = responsive 
    ? `${src}?width=640 640w, ${src}?width=1024 1024w, ${src}?width=1920 1920w`
    : undefined;
  
  const responsiveSizes = responsive 
    ? sizes || '(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px'
    : sizes;

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
        src={isInView ? src : ''}
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
