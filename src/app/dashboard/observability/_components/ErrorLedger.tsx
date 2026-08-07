'use client';

import { ShieldCheck } from 'lucide-react';

import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { faNum, levelLabel, levelTone, relative, sourceName, stamp } from './format';
import l from './ledger.module.css';

/** سقف نمایش — بیشتر از این، فهرست به دیوار متن تبدیل می‌شود. */
const MAX_ROWS = 24;

/**
 * دفتر خطا.
 *
 * رکوردهای هم‌شکل روی سرور گروه شده‌اند، پس یک خطای تکرارشونده صد ردیف
 * نمی‌سازد و صد خطای متفاوت هم پشت یک ردیف پنهان نمی‌شود.
 *
 * باز و بسته شدن با `details/summary` بومی انجام می‌شود: صفر بایت JS، رفتار
 * صحیح صفحه‌خوان و کار کردن حتی قبل از hydration.
 */
export function ErrorLedger() {
  const { data } = useObs();
  const errors = data?.errors ?? [];

  if (!data || errors.length === 0) {
    return (
      <ObsEmpty
        icon={ShieldCheck}
        title="هیچ خطایی در این پنجره ثبت نشده"
        hint="این یعنی سطح error و fatal در بازهٔ جاری خالی است. اگر ترافیک هم صفر باشد، ارزش دارد جمع‌آورندهٔ لاگ را چک کنید."
      />
    );
  }

  const shown = errors.slice(0, MAX_ROWS);

  return (
    <ol className={l.records}>
      {shown.map((error) => (
        <li key={error.id}>
          <details className={l.record} data-tone={levelTone(error.level)}>
            <summary className={l.recordSummary}>
              <span className={l.recordLevel}>{levelLabel(error.level)}</span>
              <span className={l.recordMessage}>{error.message}</span>
              <span className={l.recordCount}>
                {error.count > 1 ? `×${faNum(error.count)}` : '×۱'}
              </span>
              <span className={l.recordMeta}>
                <span>
                  منبع <bdi>{sourceName(error.source)}</bdi>
                </span>
                <span>{relative(error.timestamp, data.generatedAt)}</span>
                <span>{stamp(error.timestamp)}</span>
              </span>
            </summary>

            <p className={l.recordDetail}>
              {error.count > 1
                ? `${faNum(error.count)} رکورد هم‌شکل زیر همین پیام گروه شده‌اند؛ زمان بالا مربوط به تازه‌ترین آن‌هاست.`
                : 'این پیام فقط یک‌بار در پنجرهٔ جاری ثبت شده است.'}{' '}
              شناسهٔ رکورد مرجع: <bdi>{error.id}</bdi>
            </p>
          </details>
        </li>
      ))}
    </ol>
  );
}
