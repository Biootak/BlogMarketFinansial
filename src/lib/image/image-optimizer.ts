/**
 * Image Optimization Utilities
 */

export interface ImageOptimizerConfig {
  formats: ('webp' | 'avif' | 'jpeg')[];
  quality: number;
  sizes: string;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
}

/**
 * Default image optimization config
 */
export const defaultImageConfig: ImageOptimizerConfig = {
  formats: ['avif', 'webp', 'jpeg'],
  quality: 80,
  sizes: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority: false,
  loading: 'lazy',
};

/**
 * Generate responsive sizes attribute based on breakpoints
 */
export function generateSizes(config: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
}): string {
  const { mobile = '100vw', tablet = '50vw', desktop = '33vw' } = config;
  return `(max-width: 768px) ${mobile}, (max-width: 1024px) ${tablet}, ${desktop}`;
}

/**
 * Get optimal image quality based on format
 */
export function getOptimalQuality(format: 'webp' | 'avif' | 'jpeg'): number {
  switch (format) {
    case 'avif':
      return 75; // AVIF has better compression
    case 'webp':
      return 80;
    case 'jpeg':
      return 85;
    default:
      return 80;
  }
}

/**
 * Calculate image dimensions while maintaining aspect ratio
 */
export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number
): { width: number; height: number } {
  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight };
  }

  const ratio = originalHeight / originalWidth;
  return {
    width: maxWidth,
    height: Math.round(maxWidth * ratio),
  };
}

/**
 * Get responsive image widths for srcset
 */
export function getResponsiveWidths(): number[] {
  return [320, 640, 768, 1024, 1280, 1536, 1920];
}

/**
 * Check if image should be lazy loaded
 */
export function shouldLazyLoad(priority: boolean, position: 'above-fold' | 'below-fold'): boolean {
  if (priority) return false;
  return position === 'below-fold';
}

/**
 * Get image loading strategy
 */
export function getLoadingStrategy(
  priority: boolean
): { loading: 'lazy' | 'eager'; fetchPriority?: 'high' | 'low' | 'auto' } {
  if (priority) {
    return {
      loading: 'eager',
      fetchPriority: 'high',
    };
  }

  return {
    loading: 'lazy',
    fetchPriority: 'auto',
  };
}

/**
 * Parse aspect ratio string to number
 */
export function parseAspectRatio(aspectRatio: string): number {
  const [width, height] = aspectRatio.split('/').map(Number);
  return width / height;
}

/**
 * Get aspect ratio for different breakpoints
 */
export function getResponsiveAspectRatio(breakpoint: 'mobile' | 'tablet' | 'desktop'): string {
  switch (breakpoint) {
    case 'mobile':
      return '4/3'; // More square on mobile
    case 'tablet':
      return '3/2';
    case 'desktop':
      return '16/9'; // Wider on desktop
    default:
      return '16/9';
  }
}
