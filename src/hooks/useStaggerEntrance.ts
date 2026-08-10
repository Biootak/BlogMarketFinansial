'use client';

/**
 * useStaggerEntrance — staggered fade-in reveal for [data-stagger] elements.
 *
 * Replaces the repeated useEffect block that lived in every not-found.tsx.
 * Pure opacity + transform (GPU-friendly), respects prefers-reduced-motion.
 */

import { useEffect, useRef, type RefObject } from 'react';

interface UseStaggerEntranceOptions {
  /** Delay between each element in ms. Default 60. */
  staggerMs?: number;
  /** Duration of each transition in ms. Default 500. */
  durationMs?: number;
  /** Initial Y-offset in px. Default 8. */
  offsetPx?: number;
}

export function useStaggerEntrance(
  ref: RefObject<HTMLElement | null>,
  { staggerMs = 60, durationMs = 500, offsetPx = 8 }: UseStaggerEntranceOptions = {},
) {
  // Persist options in refs so the effect body is referentially stable
  const opts = useRef({ staggerMs, durationMs, offsetPx });
  opts.current = { staggerMs, durationMs, offsetPx };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;

    const items = el.querySelectorAll<HTMLElement>('[data-stagger]');
    items.forEach((item, i) => {
      item.style.opacity = '0';
      item.style.transform = `translateY(${opts.current.offsetPx}px)`;

      requestAnimationFrame(() => {
        item.style.transition = `opacity ${opts.current.durationMs}ms ease, transform ${opts.current.durationMs}ms ease`;
        item.style.transitionDelay = `${i * opts.current.staggerMs}ms`;
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      });
    });
  }, [ref]);
}