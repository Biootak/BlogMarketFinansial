'use client';

import { type ReactNode, useEffect, useRef } from 'react';

interface Props {
  children: ReactNode;
  /** Additional className to merge */
  className?: string;
  /** Delay in ms before animation starts (stagger siblings) */
  delay?: number;
}

/**
 * ScrollReveal — IntersectionObserver wrapper that adds `.mt-revealed`
 * when the element enters the viewport, triggering a CSS transition.
 *
 * The actual animation lives in globals.css (.mt-reveal / .mt-revealed).
 * This component only toggles the class — zero layout shift.
 */
export default function ScrollReveal({ children, className = '', delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            timeoutId = setTimeout(() => el.classList.add('mt-revealed'), delay);
          } else {
            el.classList.add('mt-revealed');
          }
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [delay]);

  return (
    <div ref={ref} className={`mt-reveal ${className}`}>
      {children}
    </div>
  );
}
