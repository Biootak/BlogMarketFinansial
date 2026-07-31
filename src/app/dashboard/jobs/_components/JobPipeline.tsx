'use client';

import Link from 'next/link';
import { toPersianDigits } from '@/lib/setup/format';
import s from '../jobs.module.css';

export interface JobPipelineStage {
  key: 'scheduled' | 'pending' | 'running' | 'completed' | 'dead';
  label: string;
  value: number;
  sub: string;
  href?: string;
}

export interface JobPipelineProps {
  stages: JobPipelineStage[];
  /** نرخ ورودی — jobs/min در ۵ دقیقه اخیر */
  inflowPerMin: number;
  /** نرخ خروجی موفق — jobs/min در ۵ دقیقه اخیر */
  outflowPerMin: number;
}

const STAGE_COLOR: Record<JobPipelineStage['key'], string> = {
  scheduled: 'oklch(70% 0.08 255)',
  pending: 'oklch(72% 0.14 75)',
  running: 'oklch(64% 0.16 285)',
  completed: 'oklch(64% 0.14 162)',
  dead: 'oklch(60% 0.18 15)',
};

export function JobPipeline({ stages, inflowPerMin, outflowPerMin }: JobPipelineProps) {
  return (
    <section className={s.pipeline} aria-label="جریان پردازش job">
      <div className={s.pipelineHeader}>
        <div className={s.pipelineTitle}>
          <span className={s.pipelineTitleEyebrow}>Pipeline Flow</span>
          <span className={s.pipelineTitleText}>
            از زمان‌بندی تا تکمیل — در یک نگاه
          </span>
        </div>
        <div className={s.pipelineLegend}>
          <span className={s.pipelineLegendItem}>
            <span
              className={s.pipelineLegendDot}
              style={{ background: 'oklch(72% 0.14 162)' }}
            />
            ورودی: {toPersianDigits(inflowPerMin)}/min
          </span>
          <span className={s.pipelineLegendItem}>
            <span
              className={s.pipelineLegendDot}
              style={{ background: 'oklch(60% 0.18 15)' }}
            />
            خروجی: {toPersianDigits(outflowPerMin)}/min
          </span>
        </div>
      </div>

      <div className={s.pipelineFlow}>
        {stages.map((stage) => {
          const inner = (
            <>
              <div className={s.pipelineStageHeader}>
                <span className={s.pipelineStageName}>{stage.label}</span>
                <span
                  className={
                    stage.key === 'running' || stage.key === 'pending'
                      ? `${s.pipelineStageDot} ${s['pipelineStageDot--pulse']}`
                      : s.pipelineStageDot
                  }
                  style={{ background: STAGE_COLOR[stage.key] }}
                />
              </div>
              <span className={s.pipelineStageValue}>{toPersianDigits(stage.value)}</span>
              <span className={s.pipelineStageSub}>{stage.sub}</span>
            </>
          );
          if (stage.href) {
            return (
              <Link
                key={stage.key}
                href={stage.href}
                className={`${s.pipelineStage} ${s[`pipelineStage--${stage.key}`] ?? ''}`}
                aria-label={`${stage.label}: ${stage.value} job`}
              >
                {inner}
              </Link>
            );
          }
          return (
            <div
              key={stage.key}
              className={`${s.pipelineStage} ${s[`pipelineStage--${stage.key}`] ?? ''}`}
              role="group"
              aria-label={`${stage.label}: ${stage.value} job`}
            >
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default JobPipeline;
