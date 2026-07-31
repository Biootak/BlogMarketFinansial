import { cn } from '@/lib/utils';
import s from './HelpdeskHub.module.css';

/**
 * HelpdeskLoading — Skeleton کاملاً اختصاصی برای Hub،
 *  با حفظ layout برای جلوگیری از CLS.
 */
export function HelpdeskLoading() {
  return (
    <div className={s.hub} aria-busy="true" aria-live="polite">
      {/* Hero skeleton */}
      <section className={s.hero}>
        <div className={s.skel} style={{ height: '4rem', width: '40%' }} />
        <div className={s.heroGrid}>
          <div className={cn(s.skel, s.skelOrbit)} aria-hidden />
          <div className={s.statsWrap}>
            <div className={cn(s.skel, s.skelMetric)} style={{ height: '6rem' }} />
            <div className={cn(s.skel, s.skelMetric)} style={{ height: '6rem' }} />
          </div>
        </div>
      </section>

      {/* Toolbar skeleton */}
      <section className={s.toolbar}>
        <div className={cn(s.skel, s.skelBar)} style={{ height: '2.25rem' }} />
        <div className={cn(s.skel, s.skelBar)} style={{ height: '2.25rem', width: '12rem' }} />
        <div className={cn(s.skel, s.skelBar)} style={{ height: '2.25rem', width: '8rem' }} />
      </section>

      {/* Workspace skeleton */}
      <section className={s.workspace}>
        <div className={s.workspaceList}>
          <div className={cn(s.skel, s.skelBar)} style={{ height: '1.5rem', width: '40%' }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={cn(s.skel, s.skelRow)} style={{ height: '4.5rem' }} />
          ))}
        </div>
        <aside className={s.workspaceRail}>
          <div className={s.railCard}>
            <div className={cn(s.skel, s.skelBar)} style={{ height: '1.25rem', width: '50%' }} />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={cn(s.skel, s.skelBar)} style={{ height: '0.75rem' }} />
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
