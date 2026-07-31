import { Skeleton } from '@/components/Dashboard/primitives';
import s from './loading.module.css';

export default function ObservabilityLoading() {
  return (
    <div dir="rtl" className={s.root}>
      <div className={s.blockCard}>
        <Skeleton variant="card" className="!h-full" />
      </div>
      <div className={s.summary}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={s.summaryItem}>
            <Skeleton variant="card" className="!h-full" />
          </div>
        ))}
      </div>
      <div className={s.blockRow}>
        <Skeleton variant="row" className="!h-full" />
      </div>
      <div className={s.overview}>
        <div className={s.overviewItem}>
          <Skeleton variant="card" className="!h-full" />
        </div>
        <div className={s.overviewItem}>
          <Skeleton variant="card" className="!h-full" />
        </div>
      </div>
    </div>
  );
}
