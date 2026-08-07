'use client';

import { RefreshCw } from 'lucide-react';
<<<<<<< HEAD
import { useObs } from './ObsProvider';
import s from './command.module.css';
import { clock, faNum } from './format';

const SYNC_TEXT: Record<string, string> = {
  idle: 'زنده',
  syncing: 'در حال هم‌گام‌سازی',
  failed: 'اتصال قطع شد',
=======

import { clock, faNum } from './format';
import { useObs } from './ObsProvider';
import c from './command.module.css';

const SYNC_TEXT: Record<string, string> = {
  idle: 'خوانش زنده',
  syncing: 'در حال هم‌گام‌سازی',
  failed: 'اتصال قطع شد',
  blocked: 'نشست منقضی شده',
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f
};

const SYNC_TONE: Record<string, string> = {
  idle: 'ok',
  syncing: 'info',
  failed: 'warn',
  blocked: 'bad',
};

/**
 * وضعیت خوانش.
 *
 * هر چهار حالت provider اینجا حرف می‌زنند — از جمله `blocked` که یعنی نشست
 * منقضی شده و polling برای همیشه خوابیده. نسخهٔ قبلی این حالت را نداشت و
 * صفحه بی‌صدا کهنه می‌شد بدون اینکه کاربر بفهمد؛ بدترین نوع دروغِ داشبورد.
 */
export function ObsToolbar() {
  const { data, sync, refresh } = useObs();
<<<<<<< HEAD
  return (
    <div className={s.toolbar}>
      <span className={s.live}>
        <span className={s.liveDot} data-state={sync} aria-hidden />
        <span aria-live="polite">{SYNC_TEXT[sync] ?? 'زنده'}</span>
      </span>
      <span className={s.window}>{faNum(data?.windowHours ?? 24)} ساعت گذشته</span>
      <span className={s.syncTrack} aria-hidden>
        <span className={s.syncBar} data-state={sync} />
      </span>
      <span className={s.stamp}>{data ? `خوانش ${clock(data.generatedAt)}` : 'بدون خوانش'}</span>
      <button type="button" className={s.refresh} onClick={refresh} disabled={sync === 'syncing'}>
        <RefreshCw size={15} strokeWidth={1.7} aria-hidden />
        <span>خواندن دوباره</span>
      </button>
=======
  const tone = SYNC_TONE[sync] ?? 'idle';

  return (
    <div className={c.toolbar} data-tone={tone}>
      <span className={c.state}>
        <span className={c.dot} data-live={sync === 'idle' ? 'true' : undefined} aria-hidden="true" />
        <span aria-live="polite">{SYNC_TEXT[sync] ?? 'خوانش زنده'}</span>
      </span>

      <span className={c.divider} aria-hidden="true" />

      <span className={c.meta}>{faNum(data?.windowHours ?? 24)} ساعت گذشته</span>
      <span className={c.meta}>{data ? `آخرین خوانش ${clock(data.generatedAt)}` : 'بدون خوانش'}</span>

      <button
        type="button"
        className={c.refresh}
        onClick={refresh}
        disabled={sync === 'syncing' || sync === 'blocked'}
      >
        <RefreshCw size={14} strokeWidth={1.8} aria-hidden="true" data-spin={sync === 'syncing' ? 'true' : undefined} />
        <span>خواندن دوباره</span>
      </button>

      <span className={c.progress} data-state={sync} aria-hidden="true" />
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f
    </div>
  );
}
