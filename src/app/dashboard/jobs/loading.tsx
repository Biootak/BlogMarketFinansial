import { Skeleton } from '@/components/Dashboard/primitives';
import s from './jobs.module.css';

export default function JobsLoading() {
  return (
    <div dir="rtl" className={s.jobsLoading}>
      <div className={s.jobsLoadingHero}>
        <Skeleton variant="card" className={s.jobsLoadingFill} />
      </div>
      <div className={s.jobsLoadingGrid}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={s.jobsLoadingTile}>
            <Skeleton variant="card" className={s.jobsLoadingFill} />
          </div>
        ))}
      </div>
      <div className={s.jobsLoadingBody}>
        <Skeleton variant="card" className={s.jobsLoadingFill} />
      </div>
    </div>
  );
}
