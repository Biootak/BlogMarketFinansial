/**
 * Image utility functions for the editor
 */

export interface ImageInfo {
  width: number;
  height: number;
  aspectRatio: number;
  format?: string;
  size?: number;
}

/**
 * Get image information from URL
 */
export const getImageInfo = (src: string): Promise<ImageInfo> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const format = src.split('.').pop()?.toLowerCase();
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
        format,
      });
    };
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Download image from URL
 */
export const downloadImage = async (src: string, filename?: string): Promise<void> => {
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || src.split('/').pop() || 'image';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
};

/**
 * Convert image to base64
 */
export const imageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Compress image
 */
export const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        file.type,
        quality,
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Get optimal image format
 */
export const getOptimalFormat = (originalFormat: string): string => {
  const modernFormats = ['webp', 'avif'];
  const supportsWebP =
    document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;

  if (supportsWebP && !modernFormats.includes(originalFormat.toLowerCase())) {
    return 'webp';
  }

  return originalFormat;
};

/**
 * Calculate responsive sizes
 */
export const calculateResponsiveSizes = (
  originalWidth: number,
  breakpoints: number[] = [640, 768, 1024, 1280, 1536],
): number[] => {
  return breakpoints.filter((bp) => bp <= originalWidth).concat(originalWidth);
};

/**
 * Generate srcset string
 */
export const generateSrcSet = (baseUrl: string, sizes: number[]): string => {
  return sizes.map((size) => `${baseUrl}?w=${size} ${size}w`).join(', ');
};

/**
 * Validate image file
 */
export const validateImageFile = (
  file: File,
  maxSize: number = 5 * 1024 * 1024, // 5MB
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
): { valid: boolean; error?: string } => {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `فرمت فایل مجاز نیست. فرمت‌های مجاز: ${allowedTypes.join(', ')}`,
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `حجم فایل بیش از حد مجاز است. حداکثر: ${(maxSize / (1024 * 1024)).toFixed(0)}MB`,
    };
  }

  return { valid: true };
};

/**
 * Apply filter to image (returns data URL)
 */
export const applyFilterToImage = (src: string, filter: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.filter = filter;
      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL());
    };

    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Rotate image (returns data URL)
 */
export const rotateImage = (src: string, degrees: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const rad = (degrees * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad));
      const cos = Math.abs(Math.cos(rad));

      canvas.width = img.width * cos + img.height * sin;
      canvas.height = img.width * sin + img.height * cos;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL());
    };

    img.onerror = reject;
    img.src = src;
  });
};
