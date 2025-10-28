import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
}

export const LazyImage = ({ 
  src, 
  alt, 
  className, 
  placeholderClassName,
  fetchPriority = 'auto',
  sizes,
  ...props 
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

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
  }, []);

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
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={() => setIsLoaded(true)}
        loading="lazy"
        decoding="async"
        fetchPriority={fetchPriority}
        sizes={sizes}
        {...props}
      />
    </div>
  );
};
