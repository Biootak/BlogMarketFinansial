'use client';

import { RefreshCw } from 'lucide-react';

import { faNum, relative } from './format';
import { useObs } from './ObsProvider';
import s from './obs.module.css';

const SYNC_TEXT: Record<string, string> = {
  idle: 'زنده',
  syncing: 'در حال هم‌گام‌سازی',
  failed: 'اتصال قطع شد',
};

/**
 * نوار وضعیت زنده. به‌جای اسپینر چرخان یک خط مویی determinate داریم:
 * فقط transform/opacity حرکت می‌کند و هیچ keyframe محلی لازم نیست.
 */
export function ObsToolbar() {
  const { data, sync, refresh } = useObs();
  const generatedAt = data?.generatedAt ?? null;

  return (
    <div className={s.toolbar}>
      <span className={s.live}>
        <span
          className={sync === 'idle' ? `${s.liveDot} anim-ping-soft` : s.liveDot}
          data-state={sync}
          aria-hidden
        />
        <span aria-live="polite">{SYNC_TEXT[sync] ?? 'زنده'}</span>
      </span>

      <span className={s.window}>
        {faNum(data?.windowHours ?? 24)} ساعت گذشته · هر {faNum(30)} ثانیه
      </span>

      <span className={s.syncTrack} aria-hidden>
        <span className={s.syncBar} data-state={sync} />
      </span>

      <span className={s.stamp}>
        {generatedAt ? `خوانش: ${relative(generatedAt, new Date().toISOString())}` : 'بدون خوانش'}
      </span>

      <button
        type="button"
        className={s.refresh}
        onClick={refresh}
        disabled={sync === 'syncing'}
      >
        <RefreshCw size={16} strokeWidth={1.5} aria-hidden />
        <span>خواندن دوباره</span>
      </button>
    </div>
  );
}
