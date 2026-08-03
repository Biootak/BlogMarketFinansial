'use client';

import { cn } from '@/lib/utils';
import s from './PlatformHub.module.css';

export type WorkflowBridgeStep = {
  id: string;
  title: string;
  meta?: string;
  status: 'done' | 'current' | 'pending' | 'rejected' | 'skipped';
  approver?: string;
  at?: string;
};

export interface WorkflowBridgeProps {
  steps: WorkflowBridgeStep[];
  className?: string;
  ariaLabel?: string;
}

/**
 * WorkflowBridge — visual stage progression.
 * Like a metro map: a continuous rail with stations, each station has
 * a colored disc indicating its state. Approved segments glow.
 */
export function WorkflowBridge({ steps, className, ariaLabel }: WorkflowBridgeProps) {
  return (
    <ol className={cn(s.workflowBridge, className)} aria-label={ariaLabel}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const segState =
          step.status === 'done'
            ? 'seg-done'
            : step.status === 'current'
              ? 'seg-current'
              : step.status === 'rejected'
                ? 'seg-rejected'
                : 'seg-pending';
        return (
          <li key={step.id} className={s.wfStep} data-status={step.status}>
            <div className={s.wfDiscWrap}>
              <span className={s.wfDisc} />
              {!isLast ? <span className={s.wfSegment} data-state={segState} aria-hidden /> : null}
            </div>
            <div className={s.wfBody}>
              <div className={s.wfTitle}>{step.title}</div>
              {step.meta ? <div className={s.wfMeta}>{step.meta}</div> : null}
              <div className={s.wfFoot}>
                {step.approver ? <span className={s.wfApprover}>{step.approver}</span> : null}
                {step.at ? <span className={s.wfAt}>{step.at}</span> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
