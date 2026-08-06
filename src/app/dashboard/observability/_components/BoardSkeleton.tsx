/**
 * BoardSkeleton — اسکلت بارگذاری مشترک مسیرهای مرکز پایش.
 *
 *  ابعادش با چیدمان واقعی هم‌خوان است تا CLS نداشته باشیم.
 */

import { Skeleton } from '@/components/Dashboard/primitives/Skeleton';
import s from './BoardSkeleton.module.css';

interface Props {
  /** 'overview' = ریبون + ستون فقرات + ریل · 'board' = پنل‌های ردیفی */
  variant?: 'overview' | 'board';
}

export function BoardSkeleton({ variant = 'board' }: Props) {
  return (
    <div className={s.root} aria-hidden>
      <div className={s.bar}>
        <Skeleton variant="row" className="!h-full" />
      </div>

      {variant === 'overview' ? (
        <>
          <div className={s.hero}>
            <Skeleton variant="card" className="!h-full" />
          </div>
          <div className={s.split}>
            <div className={s.main}>
              <Skeleton variant="card" className="!h-full" />
            </div>
            <div className={s.rail}>
              <Skeleton variant="card" className="!h-full" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={s.panelSm}>
            <Skeleton variant="card" className="!h-full" />
          </div>
          <div className={s.panelLg}>
            <Skeleton variant="card" className="!h-full" />
          </div>
        </>
      )}
    </div>
  );
}
