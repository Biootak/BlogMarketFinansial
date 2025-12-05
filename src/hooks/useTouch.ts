'use client';

import { useEffect, useRef } from 'react';
import { handleSwipe, addPassiveListener, isTouchDevice } from '@/lib/touch/touch-handler';

/**
 * Hook for handling swipe gestures
 */
export function useSwipe(
  onSwipe: (direction: 'left' | 'right' | 'up' | 'down') => void,
  threshold = 50
) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const cleanup = handleSwipe(element, onSwipe, threshold);
    return cleanup;
  }, [onSwipe, threshold]);

  return ref;
}

/**
 * Hook to check if device is touch-enabled
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);

  return isTouch;
}

/**
 * Hook for passive event listeners
 */
export function usePassiveListener<K extends keyof HTMLElementEventMap>(
  event: K,
  handler: (event: HTMLElementEventMap[K]) => void
) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const cleanup = addPassiveListener(element, event, handler as EventListener);
    return cleanup;
  }, [event, handler]);

  return ref;
}

import { useState } from 'react';
