'use client';

import { RefreshCw } from 'lucide-react';

import { clock, faNum } from './format';
import { useObs } from './ObsProvider';
import s from './obs.module.css';

const SYNC_TEXT: Record<string, string> = {
  idle: 'زنده',
  syncing: 'در حال هم‌گام‌سازی',
  failed: 'اتصال قطع شد',
  blocked: 'نشست منقضی شد',
};

const SYNC_TONE: Record<string, 'ok' | 'info' | 'bad' | 'warn'> = {
  idle: 'ok',
  syncing: 'info',
  failed: 'bad',
  blocked: 'warn',
};

/**
 * وضعیت زنده. به‌جای اسپینر چرخان یک «نوار تلگرافی» determinate داریم که فقط
 * transform/opacity حرکت می‌کند؛ هیچ keyframe محلی لازم نیست و در
 * prefers-reduced-motion خودبه‌خود clamp می‌شود (قانون global در tokens.css).
 *
 * زمان‌ها با timeZone ثابت فرمت می‌شوند تا SSR و کلاینت بیت‌به‌بیت یکی باشند.
 */
export function ObsToolbar() {
  const { data, sync, refresh, windowHours } = useObs();
  const tone = SYNC_TONE[sync] ?? 'idle';

  return (
    <div className={s.toolbar} data-tone={tone}>
      <span className={s.live}>
        <span
          className={sync === 'idle' ? `${s.liveDot} anim-ping-soft` : s.liveDot}
          data-state={sync}
          aria-hidden="true"
        />
        <span className={s.liveText} aria-live="polite">
          {SYNC_TEXT[sync] ?? 'زنده'}
        </span>
      </span>

      <span className={s.tape} aria-hidden="true">
        <span className={s.tapeBar} data-state={sync} />
      </span>

      <span className={s.window}>
        پنجرهٔ {faNum(windowHours)} ساعت · هر {faNum(30)} ثانیه
      </span>

      <span className={s.stamp}>{data ? clock(data.generatedAt) : '—'}</span>

      <button
        type="button"
        className={s.refresh}
        onClick={refresh}
        disabled={sync === 'syncing' || sync === 'blocked'}
      >
        <RefreshCw size={16} strokeWidth={1.5} aria-hidden="true" />
        <span className={s.refreshLabel}>خواندن دوباره</span>
      </button>
    </div>
  );
}
