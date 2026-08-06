'use client';

/**
 * QueryBoard — بخش «کوئری کند».
 * ─────────────────────────────────────────────────────────────
 *  منبع داده: لاگ‌های ۶ ساعت گذشته که برچسب [perf] یا [slow] دارند یا در
 *  متنشان `duration=` آمده است. مرتب‌سازی و صافی روی همان داده انجام می‌شود.
 */

import { Clock, Database, Timer } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import { SearchInput } from '@/components/Dashboard/primitives/SearchInput';
import type { ObservabilitySnapshot } from '@/lib/observability';
import { LiveBar } from './LiveBar';
import { TimelineSpine } from './TimelineSpine';
import type { SpineGroupModel } from './TimelineSpine';
import { cssVars, formatNumber, formatTimeAgo, msMeasure, ratio } from './format';
import { buildSourceRows } from './spineModel';
import { useObservabilityFeed } from './useObservabilityFeed';
import s from './QueryBoard.module.css';

const ALL = 'all';

type SortKey = 'duration' | 'recent';

interface Props {
  initialData: ObservabilitySnapshot;
}

export function QueryBoard({ initialData }: Props) {
  const { data, now, status, refresh } = useObservabilityFeed(initialData);
  const [sort, setSort] = useState<SortKey>('duration');
  const [source, setSource] = useState<string>(ALL);
  const [query, setQuery] = useState<string>('');

  const sourceOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of data.slowQueries) {
      counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([key, count]) => ({ key, count }));
  }, [data.slowQueries]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = data.slowQueries.filter((item) => {
      if (source !== ALL && item.source !== source) return false;
      if (needle.length === 0) return true;
      return (
        item.message.toLowerCase().includes(needle) || item.source.toLowerCase().includes(needle)
      );
    });
    return filtered.sort((a, b) =>
      sort === 'duration'
        ? b.durationMs - a.durationMs
        : Date.parse(b.timestamp) - Date.parse(a.timestamp),
    );
  }, [data.slowQueries, source, query, sort]);

  const slowest = data.slowQueries.reduce((max, item) => Math.max(max, item.durationMs), 1);
  const peak = msMeasure(slowest);

  const groups = useMemo<SpineGroupModel[]>(
    () => [
      {
        key: 'sources',
        title: 'منابع پرحجم',
        caption: 'کدام منبع بیشترین لاگ را نوشته و کجا خطا داشته است',
        emptyLabel: 'هنوز هیچ منبعی لاگ ننوشته است.',
        rows: buildSourceRows(data.heat, data.sources),
      },
    ],
    [data.heat, data.sources],
  );

  return (
    <div className={s.board}>
      <LiveBar
        generatedAt={data.generatedAt}
        now={now}
        status={status}
        onRefresh={refresh}
        sampled={data.totals.sampled}
      >
        <span className={s.chips}>
          <span className={s.chip} data-strong="true">
            {formatNumber(data.slowQueries.length)} لاگ کند
          </span>
          <span className={s.chip}>
            کندترین {peak.value}
            <span className={s.unit} dir="ltr">
              {peak.unit}
            </span>
          </span>
          <span className={s.chip}>{formatNumber(sourceOptions.length)} منبع درگیر</span>
        </span>
      </LiveBar>

      <section className={s.panel} aria-labelledby="obs-slow">
        <header className={s.panelHead}>
          <h2 id="obs-slow" className={s.panelTitle}>
            <Timer size={15} strokeWidth={1.75} aria-hidden />
            کوئری‌ها و عملیات کند
          </h2>
          <p className={s.panelCaption}>
            لاگ‌های شش ساعت گذشته با برچسب [perf] یا [slow] یا الگوی duration. طول نوار نسبت به
            کندترین مورد است.
          </p>
        </header>

        <div className={s.controls}>
          <div className={s.sortGroup} role="group" aria-label="ترتیب نمایش">
            <button
              type="button"
              className={s.sortBtn}
              data-active={sort === 'duration'}
              onClick={() => setSort('duration')}
            >
              <Timer size={13} strokeWidth={1.75} aria-hidden />
              کندترین
            </button>
            <button
              type="button"
              className={s.sortBtn}
              data-active={sort === 'recent'}
              onClick={() => setSort('recent')}
            >
              <Clock size={13} strokeWidth={1.75} aria-hidden />
              تازه‌ترین
            </button>
          </div>

          {sourceOptions.length > 1 ? (
            <div className={s.sourceChips} role="group" aria-label="صافی منبع">
              <button
                type="button"
                className={s.sourceChip}
                data-active={source === ALL}
                onClick={() => setSource(ALL)}
              >
                همه
              </button>
              {sourceOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={s.sourceChip}
                  data-active={source === option.key}
                  onClick={() => setSource(option.key)}
                >
                  <span dir="ltr">{option.key}</span>
                  <span className={s.chipCount}>{formatNumber(option.count)}</span>
                </button>
              ))}
            </div>
          ) : null}

          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="جست‌وجو در پیام لاگ"
            ariaLabel="جست‌وجو در کوئری‌های کند"
            className={s.search}
          />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Database}
            title={
              data.slowQueries.length === 0
                ? 'هیچ عملیات کندی ثبت نشده است'
                : 'هیچ ردیفی با این صافی مطابقت ندارد'
            }
            description={
              data.slowQueries.length === 0
                ? 'برای دیدن داده اینجا، لاگ‌ها را با الگوی duration=<ms> بنویسید.'
                : 'منبع یا عبارت جست‌وجو را تغییر دهید.'
            }
          />
        ) : (
          <ol className={s.queries}>
            {rows.map((item) => {
              const measure = msMeasure(item.durationMs);
              return (
                <li key={item.id} className={s.query}>
                  <span className={s.duration}>
                    {measure.value}
                    <span className={s.unit} dir="ltr">
                      {measure.unit}
                    </span>
                  </span>
                  <span className={s.bar} aria-hidden>
                    <span
                      className={s.fill}
                      style={cssVars({ '--v': ratio(item.durationMs, slowest) })}
                    />
                  </span>
                  <span className={s.source} dir="ltr">
                    {item.source}
                  </span>
                  <span className={s.message} dir="ltr">
                    {item.message}
                  </span>
                  <time className={s.time} dateTime={item.timestamp}>
                    {formatTimeAgo(item.timestamp, now)}
                  </time>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <TimelineSpine
        title="منابع پرحجم لاگ"
        caption="وقتی یک منبع در ساعت مشخصی داغ می‌شود، معمولاً همان‌جا باید دنبال کوئری کند گشت."
        groups={groups}
      />
    </div>
  );
}
