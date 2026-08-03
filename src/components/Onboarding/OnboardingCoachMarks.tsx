'use client';

/**
 * OnboardingCoachMarks — First-visit experience (3 steps).
 *
 * Shown only the FIRST time a user enters the dashboard. State is stored
 * in localStorage so refreshes don't show it again. Once dismissed, it
 * never reappears.
 *
 * Design: Linear × Vercel × Notion 2026
 *  - Floating glass sheet bottom-center
 *  - Step indicator (1/3 → 2/3 → 3/3)
 *  - Smooth morphing between steps (framer-free, CSS @keyframes)
 *  - Brand gradient progress bar
 *  - Skip / Next / Done actions
 *
 * Mount: dashboard/layout.tsx (or any layout that wants first-visit hint)
 */

import { AnimatePresence, motion } from '@/lib/motion-shim';
import { useCallback, useEffect, useState } from 'react';
import { HiOutlineArrowLeft, HiOutlineCheck, HiOutlineXMark } from 'react-icons/hi2';
import s from './OnboardingCoachMarks.module.css';

export interface OnboardingStep {
  id: string;
  title: string;
  body: string;
  href?: string;
  ctaLabel?: string;
}

interface Props {
  /** LocalStorage key (per-user recommended, e.g. `onboard-v1-${userId}`) */
  storageKey: string;
  steps: OnboardingStep[];
  /** When true, mark as already seen on mount (e.g. role already onboarded) */
  skipIfAlreadySeen?: boolean;
}

const OnboardingCoachMarks = ({ storageKey, steps, skipIfAlreadySeen = true }: Props) => {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = window.localStorage.getItem(storageKey);
    if (seen) {
      if (skipIfAlreadySeen) return;
    }
    // Slight delay so it doesn't appear before the dashboard has painted
    const t = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(t);
  }, [storageKey, skipIfAlreadySeen]);

  const dismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, new Date().toISOString());
    }
    setOpen(false);
  }, [storageKey]);

  const goNext = useCallback(() => {
    if (index < steps.length - 1) {
      setIndex((i) => i + 1);
    } else {
      dismiss();
    }
  }, [index, steps.length, dismiss]);

  const goBack = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  if (!open) return null;

  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="onboard-shell"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className={s.shell}
        role="dialog"
        aria-modal="false"
        aria-label="راهنمای شروع"
      >
        <div className={s.card}>
          {/* Header */}
          <div className={s.header}>
            <div className={s.steps}>
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={s.dot}
                  data-active={i === index}
                  data-done={i < index}
                  aria-hidden
                />
              ))}
            </div>
            <button type="button" className={s.close} onClick={dismiss} aria-label="بستن راهنما">
              <HiOutlineXMark size={14} aria-hidden />
            </button>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className={s.body}
            >
              <h2 className={s.title}>{step.title}</h2>
              <p className={s.text}>{step.body}</p>
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className={s.actions}>
            <button type="button" className={s.btnSecondary} onClick={dismiss}>
              رد کردن
            </button>
            {index > 0 && (
              <button type="button" className={s.btnSecondary} onClick={goBack}>
                قبلی
              </button>
            )}
            <button
              type="button"
              className={s.btnPrimary}
              onClick={goNext}
              data-last={isLast ? 'true' : undefined}
            >
              {isLast ? (
                <>
                  <HiOutlineCheck size={14} aria-hidden />
                  <span>متوجه شدم</span>
                </>
              ) : (
                <>
                  <span>{step.ctaLabel ?? 'بعدی'}</span>
                  <HiOutlineArrowLeft size={14} aria-hidden />
                </>
              )}
            </button>
          </div>

          {/* Progress */}
          <div className={s.progressTrack} aria-hidden>
            <span
              className={s.progressFill}
              style={{ width: `${((index + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingCoachMarks;
