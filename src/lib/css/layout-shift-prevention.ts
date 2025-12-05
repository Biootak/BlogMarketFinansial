/**
 * Layout Shift Prevention Utilities
 * Helps prevent CLS by reserving space for dynamic content
 */

/**
 * Reserve space for image with aspect ratio
 */
export function getImagePlaceholderStyle(aspectRatio: string): React.CSSProperties {
  const [width, height] = aspectRatio.split('/').map(Number);
  const paddingBottom = (height / width) * 100;

  return {
    position: 'relative',
    paddingBottom: `${paddingBottom}%`,
    overflow: 'hidden',
  };
}

/**
 * Reserve space for skeleton loader
 */
export function getSkeletonStyle(config: {
  width?: string | number;
  height?: string | number;
  aspectRatio?: string;
}): React.CSSProperties {
  const { width, height, aspectRatio } = config;

  if (aspectRatio) {
    return getImagePlaceholderStyle(aspectRatio);
  }

  return {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    backgroundColor: 'var(--skeleton-bg, #e5e7eb)',
    borderRadius: '0.5rem',
  };
}

/**
 * Get min-height to prevent layout shift
 */
export function getMinHeight(content: 'card' | 'list-item' | 'header' | 'footer'): string {
  const minHeights = {
    card: 'min-h-[300px]',
    'list-item': 'min-h-[80px]',
    header: 'min-h-[64px]',
    footer: 'min-h-[200px]',
  };

  return minHeights[content];
}

/**
 * Reserve space for dynamic content
 */
export function reserveSpace(config: {
  minHeight?: number;
  aspectRatio?: string;
}): React.CSSProperties {
  const { minHeight, aspectRatio } = config;

  if (aspectRatio) {
    return getImagePlaceholderStyle(aspectRatio);
  }

  return {
    minHeight: minHeight ? `${minHeight}px` : undefined,
  };
}
