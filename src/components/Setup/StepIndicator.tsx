'use client';

import { toPersianDigits } from '@/lib/setup/format';
import type { StepId } from '@/lib/setup/schema';
import { STEPS, stepIndex } from '@/lib/setup/steps';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { STEP_GLYPHS } from './WizardIcons';

/**
 * StepIndicator — horizontal progress stepper used at the top of the wizard.
 *
 * - Each step is rendered as a focusable button so screen-reader users can
 *   jump to any previously-completed step without losing context.
 * - The connecting line fills from 0% to 100% as the active index advances.
 * - The current step gets a conic glow ring; completed steps show a check
 *   glyph over their numbered circle.
 * - On small screens the row becomes horizontally scrollable so titles never
 *   get clipped or squeezed.
 * - A live region announces the progress percentage + remaining time so
 *   assistive tech users hear progress as it changes.
 */

export interface StepIndicatorProps {
  current: StepId;
  furthestReached: StepId;
  onJump?: (step: StepId) => void;
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '۰ ثانیه';
  if (seconds < 60) return `${toPersianDigits(Math.round(seconds))} ثانیه`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (s === 0) return `${toPersianDigits(m)} دقیقه`;
  return `${toPersianDigits(m)} دقیقه و ${toPersianDigits(s)} ثانیه`;
}

export function StepIndicator({ current, furthestReached, onJump }: StepIndicatorProps) {
  const activeIdx = stepIndex(current);
  const furthestIdx = stepIndex(furthestReached);

  // On narrow screens the stepper row scrolls horizontally; keep the active
  // step centered so its title is always in view when the step changes.
  const activeRef = React.useRef<HTMLLIElement | null>(null);
  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [current]);

  // The connecting track must span exactly between the FIRST and LAST disc
  // centers. Step titles have natural widths on mobile, so no fixed CSS
  // inset can line up with the discs — measure them instead (once the
  // layout is known, and again when fonts/widths settle).
  const listRef = React.useRef<HTMLOListElement | null>(null);
  const [trackSpan, setTrackSpan] = React.useState<{
    start: number;
    end: number;
    top: number;
  } | null>(null);
  React.useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const discs = list.querySelectorAll<HTMLElement>('.setup-stepper__disc');
      if (discs.length < 2) return;
      const lr = list.getBoundingClientRect();
      const first = discs[0].getBoundingClientRect();
      const last = discs[discs.length - 1].getBoundingClientRect();
      setTrackSpan({
        start: lr.right - (first.x + first.width / 2),
        end: last.x + last.width / 2 - lr.left,
        top: first.y + first.height / 2 - lr.y,
      });
    };
    measure();
    // Re-measure once webfonts finish swapping (they change item widths).
    if (typeof document !== 'undefined' && document.fonts) {
      void document.fonts.ready.then(measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, []);

  // Progress as a 0..1 fraction across the ENTIRE wizard (excluding the
  // intro from the form-fill accounting — the intro counts as 0% work).
  const fieldSteps = STEPS.filter((s) => s.id !== 'intro');
  const fieldIdx = Math.max(0, activeIdx - 1);
  const progress = Math.min(1, Math.max(0, fieldIdx / fieldSteps.length));
  const percent = Math.round(progress * 100);

  // Fill width for the connecting track (between disc 0 and disc N-1).
  const trackFillPct =
    STEPS.length <= 1 ? 0 : Math.min(100, Math.max(0, (activeIdx / (STEPS.length - 1)) * 100));

  // Remaining ETA — sum the etaSeconds of the current step + all steps after.
  const remainingSeconds = STEPS.slice(activeIdx).reduce((acc, s) => acc + s.etaSeconds, 0);

  return (
    <nav aria-label="مراحل تنظیم" className="setup-stepper" aria-describedby="setup-stepper-status">
      <div className="setup-stepper__statusbar" aria-hidden="true">
        <div className="setup-stepper__pct">
          <span className="setup-stepper__pct-num">{toPersianDigits(percent)}٪</span>
          <span className="setup-stepper__pct-label">پیشرفت</span>
        </div>
        <div className="setup-stepper__pct-track">
          <span className="setup-stepper__pct-fill" style={{ inlineSize: `${percent}%` }} />
        </div>
        <div className="setup-stepper__eta">
          <span className="setup-stepper__eta-num">{formatRemaining(remainingSeconds)}</span>
          <span className="setup-stepper__eta-label">زمان تقریبی باقی‌مانده</span>
        </div>
      </div>

      <span id="setup-stepper-status" className="sr-only" aria-live="polite">
        {`پیشرفت ${toPersianDigits(percent)} درصد؛ ${formatRemaining(remainingSeconds)} تا پایان`}
      </span>

      <div className="setup-stepper__scroll">
        <ol className="setup-stepper__list" ref={listRef}>
          {/* The connecting track lives inside the list so it scrolls with
              the steps and stays aligned under the discs on narrow screens. */}
          <li className="setup-stepper__track-slot" aria-hidden="true">
            <span
              className="setup-stepper__track"
              style={
                trackSpan
                  ? {
                      insetInlineStart: trackSpan.start,
                      insetInlineEnd: trackSpan.end,
                      insetBlockStart: trackSpan.top - 1,
                    }
                  : undefined
              }
            >
              <span
                className="setup-stepper__fill"
                style={{ inlineSize: `${trackFillPct}%` }}
              />
            </span>
          </li>
          {STEPS.map((step, idx) => {
            const isActive = step.id === current;
            const isDone = idx < activeIdx;
            const isReachable = idx <= furthestIdx;
            const Glyph = STEP_GLYPHS[step.glyph as keyof typeof STEP_GLYPHS];
            return (
              <li
                key={step.id}
                ref={isActive ? activeRef : undefined}
                className={cn(
                  'setup-stepper__item',
                  isActive && 'setup-stepper__item--active',
                  isDone && 'setup-stepper__item--done',
                )}
              >
                <button
                  type="button"
                  className="setup-stepper__btn"
                  onClick={() => isReachable && onJump?.(step.id)}
                  disabled={!isReachable}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`${step.title} — ${step.eyebrow}`}
                >
                  <span className="setup-stepper__disc">
                    <span className="setup-stepper__disc-inner">
                      {isDone ? (
                        <STEP_GLYPHS.check className="setup-stepper__glyph" />
                      ) : (
                        <Glyph className="setup-stepper__glyph" />
                      )}
                    </span>
                  </span>
                  <span className="setup-stepper__copy">
                    <span className="setup-stepper__title">{step.title}</span>
                    <span className="setup-stepper__sub">{step.eyebrow}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
