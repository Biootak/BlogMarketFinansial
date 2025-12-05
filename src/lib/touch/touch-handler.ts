/**
 * Touch Handler Utilities
 * Ensures touch-friendly interactions on mobile devices
 */

export interface TouchConfig {
  minTouchTarget: number; // 44px minimum
  tapDelay: number; // 100ms max
  swipeThreshold: number; // pixels
}

export const defaultTouchConfig: TouchConfig = {
  minTouchTarget: 44,
  tapDelay: 100,
  swipeThreshold: 50,
};

/**
 * Ensure element meets minimum touch target size
 */
export function ensureTouchTarget(element: HTMLElement, minSize = 44): void {
  const rect = element.getBoundingClientRect();
  
  if (rect.width < minSize || rect.height < minSize) {
    console.warn(
      `Touch target too small: ${rect.width}x${rect.height}px. Minimum: ${minSize}x${minSize}px`,
      element
    );
  }
}

/**
 * Add passive event listener for better scroll performance
 */
export function addPassiveListener(
  element: HTMLElement,
  event: string,
  handler: EventListener
): () => void {
  element.addEventListener(event, handler, { passive: true });
  
  return () => {
    element.removeEventListener(event, handler);
  };
}

/**
 * Handle swipe gestures
 */
export function handleSwipe(
  element: HTMLElement,
  onSwipe: (direction: 'left' | 'right' | 'up' | 'down') => void,
  threshold = 50
): () => void {
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  const handleTouchStart = (e: TouchEvent) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const endTime = Date.now();

    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const deltaTime = endTime - startTime;

    // Ignore if too slow (> 300ms)
    if (deltaTime > 300) return;

    // Determine direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > threshold) {
        onSwipe(deltaX > 0 ? 'right' : 'left');
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > threshold) {
        onSwipe(deltaY > 0 ? 'down' : 'up');
      }
    }
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
  };
}

/**
 * Check if device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Get optimal input type for mobile
 */
export function getOptimalInputType(type: string): string {
  if (!isTouchDevice()) return type;

  const mobileTypes: Record<string, string> = {
    text: 'text',
    email: 'email',
    tel: 'tel',
    number: 'number',
    url: 'url',
    search: 'search',
    date: 'date',
    time: 'time',
    datetime: 'datetime-local',
  };

  return mobileTypes[type] || type;
}

/**
 * Add tap feedback with immediate response
 */
export function addTapFeedback(
  element: HTMLElement,
  onTap: () => void,
  maxDelay = 100
): () => void {
  let tapStartTime = 0;

  const handleTouchStart = () => {
    tapStartTime = Date.now();
    element.classList.add('active');
  };

  const handleTouchEnd = () => {
    const tapDuration = Date.now() - tapStartTime;
    element.classList.remove('active');

    if (tapDuration < maxDelay) {
      onTap();
    }
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
  };
}
