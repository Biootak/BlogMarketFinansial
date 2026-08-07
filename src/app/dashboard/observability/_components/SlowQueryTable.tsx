'use client';

import { Database } from 'lucide-react';

import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { maxOf } from './chart';
import { cssVars, faNum, msShort, ratio, relative, sourceName } from './format';
import l from './ledger.module.css';

/** آستانه‌های خوانش زمان اجرا (میلی‌ثانیه). */
const BAD_MS = 1000;
const WARN_MS = 500;

const MAX_ROWS = 16;

/**
 * کندترین مسیرها.
 *
 * نوار نسبت، نسبت به بدترین رکورد همین فهرست است نه یک سقف ثابت؛ چون سؤال
 * واقعی «چقدر بدتر از بقیه» است، نه «چند درصد از یک عدد دلخواه».
 * تُن هم از آستانهٔ زمان می‌آید، پس رنگ حرف می‌زند نه تزئین می‌کند.
 */
export function SlowQueryTable() {
  const { data } = useObs();
  const queries = data?.slowQueries ?? [];

  if (!data || queries.length === 0) {
    return (
      <ObsEmpty
        icon={Database}
        title="مسیر کندی ثبت نشده"
        hint="در شش ساعت گذشته هیچ لاگی با نشانهٔ perf یا slow یا کلید duration نیامده است. اگر انتظار داشتید بیاید، ابزار سنجش را چک کنید."
      />
    );
  }

  const worst = Math.max(1, maxOf(queries.map((query) => query.durationMs)));

  return (
    <ol className={l.queries}>
      {queries.slice(0, MAX_ROWS).map((query) => {
        const tone =
          query.durationMs >= BAD_MS ? 'bad' : query.durationMs >= WARN_MS ? 'warn' : 'info';

        return (
          <li key={query.id}>
            <div className={l.query} data-tone={tone}>
              <span className={l.queryText}>{query.message}</span>
              <span className={l.queryDuration}>
                {query.durationMs > 0 ? msShort(query.durationMs) : '—'}
              </span>
              <span
                className={l.queryTrack}
                aria-hidden="true"
                style={cssVars({ '--fill': `${ratio(query.durationMs, worst, 2)}%` })}
              />
              <span className={l.queryMeta}>
                <span>
                  منبع <bdi>{sourceName(query.source)}</bdi>
                </span>
                <span>{relative(query.timestamp, data.generatedAt)}</span>
                <span>
                  {query.durationMs >= BAD_MS
                    ? 'از یک ثانیه رد شده'
                    : query.durationMs >= WARN_MS
                      ? 'در محدودهٔ هشدار'
                      : `${faNum(Math.round((query.durationMs / worst) * 100))}٪ بدترین رکورد`}
                </span>
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
