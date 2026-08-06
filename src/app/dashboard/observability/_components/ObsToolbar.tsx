'use client';

import { RefreshCw } from 'lucide-react';
import { clock, faNum } from './format';
import { useObs } from './ObsProvider';
import s from './command.module.css';

const SYNC_TEXT: Record<string, string> = { idle: 'زنده', syncing: 'در حال هم‌گام‌سازی', failed: 'اتصال قطع شد' };

export function ObsToolbar() {
  const { data, sync, refresh } = useObs();
  return <div className={s.toolbar}><span className={s.live}><span className={s.liveDot} data-state={sync} aria-hidden /><span aria-live="polite">{SYNC_TEXT[sync] ?? 'زنده'}</span></span><span className={s.window}>{faNum(data?.windowHours ?? 24)} ساعت گذشته</span><span className={s.syncTrack} aria-hidden><span className={s.syncBar} data-state={sync} /></span><span className={s.stamp}>{data ? `خوانش ${clock(data.generatedAt)}` : 'بدون خوانش'}</span><button type="button" className={s.refresh} onClick={refresh} disabled={sync === 'syncing'}><RefreshCw size={15} strokeWidth={1.7} aria-hidden /><span>خواندن دوباره</span></button></div>;
}
