'use client';

import type { StepId } from '@/lib/setup/schema';
import { STEPS } from '@/lib/setup/steps';
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
 */

export interface StepIndicatorProps {
  current: StepId;
  furthestReached: StepId;
  onJump?: (step: StepId) => void;
}

function indexOf(id: StepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

export function StepIndicator({ current, furthestReached, onJump }: StepIndicatorProps) {
  const activeIdx = indexOf(current);
  const furthestIdx = indexOf(furthestReached);
  // Fill percentage of the connecting line. We treat the track as spanning
  // (n-1) gaps, so progress at step k covers (k / (n-1)) of the width.
  const fillPct =
    STEPS.length <= 1 ? 0 : Math.min(100, Math.max(0, (activeIdx / (STEPS.length - 1)) * 100));

  return (
    <nav aria-label="مراحل تنظیم" className="setup-stepper">
      <ol className="setup-stepper__list">
        {STEPS.map((step, idx) => {
          const isActive = step.id === current;
          const isDone = idx < activeIdx;
          const isReachable = idx <= furthestIdx;
          const Glyph = STEP_GLYPHS[step.glyph as keyof typeof STEP_GLYPHS];
          return (
            <li
              key={step.id}
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
                aria-label={`${step.title} — مرحله ${step.index} از ${STEPS.length}`}
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
                  <span className="setup-stepper__sub">{step.subtitle}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="setup-stepper__track" aria-hidden="true">
        <div
          className="setup-stepper__fill"
          style={{ insetInlineStart: '0%', inlineSize: `${fillPct}%` }}
        />
      </div>
    </nav>
  );
}
