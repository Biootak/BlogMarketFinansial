'use client';

import { Layers3 } from 'lucide-react';

import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { cssVars, faNum, faPercent, levelLabel, levelTone } from './format';
import h from './heat.module.css';

/**
 * توزیع سطوح لاگ.
 *
 * یک نوار انباشته به‌جای دونات: نسبت‌ها را در یک خط می‌خوانی و مقایسه با
 * پنجره‌های قبلی هم ساده می‌ماند. فهرست زیرش عدد دقیق را می‌دهد، چون نوار
 * برای «حس» است و عدد برای «تصمیم».
 *
 * نکته: `level` از سرور همیشه canonical و lowercase می‌آید
 * (`@/lib/log-levels`). تا قبل از ۲۰۲۶-۰۸-۰۷ مقدار خام `'WARNING'` رد می‌شد
 * و `levelLabel` آن را پیدا نمی‌کرد، پس برچسب‌ها انگلیسی و بی‌رنگ می‌ماندند.
 */
export function LevelDistribution() {
  const { data } = useObs();
  const levels = data?.levels ?? [];

  if (!data || levels.length === 0) {
    return (
      <ObsEmpty
        icon={Layers3}
        title="سطحی برای شمردن نیست"
        hint="هیچ رکوردی در پنجرهٔ جاری ثبت نشده است."
      />
    );
  }

  return (
    <div className={h.levels}>
      <div
        className={h.ribbon}
        role="img"
        aria-label={`توزیع سطوح لاگ: ${levels.map((level) => `${levelLabel(level.level)} ${faPercent(level.share)}`).join('، ')}`}
      >
        {levels.map((level) => (
          <span
            key={level.level}
            className={h.segment}
            data-tone={levelTone(level.level)}
            style={cssVars({ '--fill': `${level.share}%` })}
          />
        ))}
      </div>

      <ul className={h.legend}>
        {levels.map((level) => (
          <li key={level.level}>
            <div className={h.legendRow} data-tone={levelTone(level.level)}>
              <span className={h.legendPip} aria-hidden="true" />
              <span className={h.legendName}>{levelLabel(level.level)}</span>
              <span className={h.legendCount}>{faNum(level.count)}</span>
              <span className={h.legendShare}>{faPercent(level.share)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
