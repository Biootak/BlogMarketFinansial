'use client';

import { RefreshCw } from 'lucide-react';

import { clock, faNum } from './format';
import { useObs } from './ObsProvider';
import s from './obs.module.css';

const SYNC_TEXT: Record<string, string> = {
  idle: 'زنده',
  syncing: 'در حال هم‌گام‌سازی',
  failed: 'اتصال قطع شد',
  blocked: 'نشست منقضی شده',
};

/**
 * نوار وضعیت زنده. به‌جای اسپینر چرخان یک خط مویی determinate داریم:
 * فقط transform روی محور inline حرکت می‌کند و هیچ keyframe محلی لازم نیست.
 * زمان‌ها با timeZone ثابت فرمت می‌شوند تا SSR و کلاینت یکی باشند.
 */
export function ObsToolbar() {
  const { data, sync, refresh } = useObs();

  return (
    <div className={s.toolbar}>
      <span className={s.live}>
        <span
          className={sync === 'idle' ? `${s.liveDot} anim-ping-soft` : s.liveDot}
          data-state={sync}
          aria-hidden="true"
        />
        <span aria-live="polite">{SYNC_TEXT[sync] ?? 'زنده'}</span>
      </span>

      <span className={s.syncTrack} aria-hidden="true">
        <span className={s.syncBar} data-state={sync} />
      </span>

      <span className={s.window}>
        {faNum(data?.windowHours ?? 24)} ساعت · هر {faNum(30)} ثانیه
      </span>

      <span className={s.stamp}>{data ? `خوانش ${clock(data.generatedAt)}` : 'بدون خوانش'}</span>

      <button type="button" className={s.refresh} onClick={refresh} disabled={sync === 'syncing'}>
        <RefreshCw size={16} strokeWidth={1.5} aria-hidden="true" />
        <span>خواندن دوباره</span>
      </button>
    </div>
  );
}
