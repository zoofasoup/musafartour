/**
 * Image processing utilities for automatic compression and WebP conversion
 */

/**
 * Slugify text for use in filenames
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50); // Limit length
};

/**
 * Generate contextual filename based on content type
 */
export const generateContextualFileName = (
  context: 'package' | 'article' | 'wisata',
  metadata: {
    name?: string;
    slug?: string;
    destination?: string;
    index?: number;
  },
  type: 'banner' | 'gallery' | 'featured'
): string => {
  const timestamp = Date.now();
  
  switch (context) {
    case 'package':
      const packageSlug = slugify(metadata.name || 'paket-umroh');
      if (type === 'gallery') {
        return `paket-umroh-${packageSlug}-gallery-${metadata.index || 1}-${timestamp}.webp`;
      }
      return `paket-umroh-${packageSlug}-banner-${timestamp}.webp`;
      
    case 'article':
      const articleSlug = metadata.slug || 'artikel-baru';
      return `artikel-${slugify(articleSlug)}-featured-${timestamp}.webp`;
      
    case 'wisata':
      const wisataSlug = slugify(metadata.destination || 'wisata-halal');
      return `wisata-halal-${wisataSlug}-banner-${timestamp}.webp`;
      
    default:
      return `image-${timestamp}.webp`;
  }
};

/**
 * Load image file into HTMLImageElement
 */
const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Calculate optimal dimensions while maintaining aspect ratio
 */
const calculateDimensions = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  let newWidth = width;
  let newHeight = height;

  if (width > maxWidth) {
    newWidth = maxWidth;
    newHeight = Math.round((height * maxWidth) / width);
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = Math.round((width * maxHeight) / height);
  }

  return { width: newWidth, height: newHeight };
};

/**
 * Generate responsive image srcset for different screen sizes
 * @param baseUrl The base URL of the image
 * @returns srcset and sizes attributes
 */
export const generateResponsiveSrcSet = (baseUrl: string) => {
  return {
    srcSet: `${baseUrl}?width=640 640w, ${baseUrl}?width=1024 1024w, ${baseUrl}?width=1920 1920w`,
    sizes: '(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px'
  };
};

/**
 * Compress and convert image to WebP format with aggressive optimization
 * Targets smaller file sizes for banner images (50-100KB)
 * 
 * @param file - Original image file
 * @param maxSizeKB - Target maximum file size in KB (default: 80 for banners, 100 for content)
 * @param initialQuality - Starting quality (0.0 - 1.0), default 0.8 for better compression
 * @returns Compressed WebP file
 */
export const compressAndConvertToWebP = async (
  file: File,
  maxSizeKB: number = 80,
  initialQuality: number = 0.8
): Promise<File> => {
  try {
    // Load the image
    const img = await loadImage(file);
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Calculate optimal dimensions (max 1920px for largest dimension)
    const maxDimension = 1920;
    const { width, height } = calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      maxDimension,
      maxDimension
    );

    canvas.width = width;
    canvas.height = height;

    // Draw image with good quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to WebP with iterative quality reduction
    let quality = initialQuality;
    let blob: Blob | null = null;
    let attempts = 0;
    const maxAttempts = 10;
    const targetSizeBytes = maxSizeKB * 1024;

    while (attempts < maxAttempts) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b),
          'image/webp',
          quality
        );
      });

      if (!blob) throw new Error('Failed to create blob');

      // If size is acceptable or quality is already very low, stop
      if (blob.size <= targetSizeBytes || quality <= 0.3) {
        break;
      }

      // Reduce quality for next attempt
      quality -= 0.1;
      attempts++;
    }

    if (!blob) throw new Error('Failed to compress image');

    // Clean up
    URL.revokeObjectURL(img.src);

    // Create File object from blob
    const compressedFile = new File([blob], 'compressed.webp', {
      type: 'image/webp',
      lastModified: Date.now(),
    });

    console.log(`Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB (quality: ${quality.toFixed(2)})`);

    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
};
