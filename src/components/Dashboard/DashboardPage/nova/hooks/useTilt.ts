'use client';

/**
 * useTilt — cursor-reactive 3D tilt for a "spatial depth" tile (2026).
 *
 * Attach the returned ref to a `transform-style: preserve-3d` element. On
 * pointer move over the element we compute a small rotateX/rotateY based on
 * where the cursor sits relative to the element centre, and write it straight
 * to `element.style.transform`. On leave we ease back to rest.
 *
 * Design notes:
 *   • We drive `transform` (not `translate`) so the scroll-reveal keyframe —
 *     which animates the `translate` property — composes with the tilt
 *     instead of fighting it.
 *   • rAF-throttled; a single frame is scheduled per move.
 *   • Fully disabled under `prefers-reduced-motion: reduce` and on coarse
 *     (touch) pointers, where a tilt would be jarring or impossible.
 */

import { useEffect, useRef } from 'react';

interface UseTiltOptions {
  /** Maximum rotation in degrees on each axis. Default 6. */
  max?: number;
  /** Extra scale applied while hovering. Default 1.008. */
  scale?: number;
}

export function useTilt<T extends HTMLElement = HTMLDivElement>({
  max = 6,
  scale = 1.008,
}: UseTiltOptions = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)');
    if (reduce.matches || coarse.matches) return;

    let frame: number | null = null;

    const rest = () => {
      el.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg) scale(1)';
    };

    const onMove = (e: PointerEvent) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        const ry = px * max * 2;
        const rx = -py * max * 2;
        el.style.transform = `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${scale})`;
      });
    };

    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      rest();
    };

    rest();
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [max, scale]);

  return ref;
}
