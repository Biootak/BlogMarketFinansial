'use client';

/**
 * useStaggerReveal — ورود پله‌ای المان‌های `[data-stagger]` داخل یک container.
 *
 * ref برگشتی را روی ریشه بگذارید؛ هوک بعد از mount هر فرزند `data-stagger` را
 * با تأخیر افزایشی fade/slide می‌کند (بدون dependency انیمیشن).
 */

import { type RefObject, useEffect, useRef } from 'react';

export interface StaggerRevealOptions {
  /** جابه‌جایی اولیه‌ی عمودی. */
  offsetY?: string;
  /** مدت transition. */
  duration?: string;
  /** فاصلهٔ تأخیر بین المان‌ها (ms). */
  delayStep?: number;
  /** easing — پیش‌فرض توکن `--nova-ease`. */
  easing?: string;
}

export function useStaggerReveal<T extends HTMLElement = HTMLDivElement>({
  offsetY = '6px',
  duration = '0.5s',
  delayStep = 60,
  easing = 'var(--nova-ease)',
}: StaggerRevealOptions = {}): RefObject<T | null> {
  const root = useRef<T | null>(null);

  useEffect(() => {
    if (!root.current) return;
    const items = root.current.querySelectorAll<HTMLElement>('[data-stagger]');
    items.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = `translateY(${offsetY})`;
      requestAnimationFrame(() => {
        el.style.transition = `opacity ${duration} ${easing}, transform ${duration} ${easing}`;
        el.style.transitionDelay = `${i * delayStep}ms`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  }, [offsetY, duration, delayStep, easing]);

  return root;
}
