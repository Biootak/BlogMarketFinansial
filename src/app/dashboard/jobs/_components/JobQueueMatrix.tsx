'use client';

import { toPersianDigits } from '@/lib/setup/format';
import Link from 'next/link';
import s from '../jobs.module.css';

export interface QueueHealthDisplay {
  name: string;
  pending: number;
  completed24h: number;
  failed24h: number;
  dead: number;
  failureRate: number;
  score: number;
  status: 'healthy' | 'degraded' | 'critical' | 'idle';
}

export interface JobQueueMatrixProps {
  queues: QueueHealthDisplay[];
}

const STATUS_LABEL: Record<QueueHealthDisplay['status'], string> = {
  healthy: 'سالم',
  degraded: 'نیاز به توجه',
  critical: 'بحرانی',
  idle: 'بیکار',
};

const HEALTH_CLASS: Record<QueueHealthDisplay['status'], string> = {
  healthy: 'matrixHealthFill--healthy',
  degraded: 'matrixHealthFill--degraded',
  critical: 'matrixHealthFill--critical',
  idle: 'matrixHealthFill--idle',
};

export function JobQueueMatrix({ queues }: JobQueueMatrixProps) {
  if (queues.length === 0) {
    return (
      <div className={s.card}>
        <div className={s.cardHeader}>
          <div className={s.cardTitleBlock}>
            <span className={s.cardEyebrow}>Queue Matrix</span>
            <span className={s.cardTitle}>سلامت صف‌ها</span>
          </div>
        </div>
        <div className={s.cardBody}>
          <p className={s.tableEmpty}>هنوز job ای در سامانه ثبت نشده است.</p>
        </div>
      </div>
    );
  }
  return (
    <div className={s.card}>
      <div className={s.cardHeader}>
        <div className={s.cardTitleBlock}>
          <span className={s.cardEyebrow}>Queue Matrix</span>
          <span className={s.cardTitle}>سلامت صف‌ها</span>
        </div>
        <span className={s.streamCount}>{toPersianDigits(queues.length)} صف</span>
      </div>
      <div className={s.cardBody}>
        <ul className={s.matrixList}>
          {queues.map((q) => {
            const dash = 2 * Math.PI * 14; // r=14
            const offset = dash * (1 - q.score / 100);
            return (
              <li key={q.name} className={s.matrixItem}>
                <div className={s.matrixHealth}>
                  <svg className={s.matrixHealthSvg} viewBox="0 0 36 36" aria-hidden="true">
                    <circle className={s.matrixHealthTrack} cx="18" cy="18" r="14" />
                    <circle
                      className={`${s.matrixHealthFill} ${s[HEALTH_CLASS[q.status]]}`}
                      cx="18"
                      cy="18"
                      r="14"
                      strokeDasharray={`${dash} ${dash}`}
                      strokeDashoffset={offset}
                    />
                  </svg>
                  <span className={s.matrixHealthValue}>{toPersianDigits(q.score)}</span>
                </div>
                <div className={s.matrixBody}>
                  <div className={s.matrixName}>
                    <span className={s.matrixNameMono}>{q.name}</span>
                    <span className={`${s.matrixStatus} ${s[`matrixStatus--${q.status}`]}`}>
                      {STATUS_LABEL[q.status]}
                    </span>
                  </div>
                  <div className={s.matrixBadges}>
                    <span className={s.matrixBadge}>در انتظار {toPersianDigits(q.pending)}</span>
                    <span className={s.matrixBadge}>تکمیل {toPersianDigits(q.completed24h)}</span>
                    {q.failed24h > 0 ? (
                      <span className={`${s.matrixBadge} ${s['matrixBadge--failed']}`}>
                        خطا {toPersianDigits(q.failed24h)}
                      </span>
                    ) : null}
                    {q.dead > 0 ? (
                      <span className={`${s.matrixBadge} ${s['matrixBadge--dead']}`}>
                        مرده {toPersianDigits(q.dead)}
                      </span>
                    ) : null}
                    <span className={s.matrixBadgeMuted}>
                      نرخ خطا {toPersianDigits(q.failureRate.toFixed(1))}٪
                    </span>
                  </div>
                </div>
                <div className={s.matrixActions}>
                  <Link href={`/dashboard/jobs/queues#${q.name}`} className={s.matrixLink}>
                    جزئیات
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default JobQueueMatrix;
