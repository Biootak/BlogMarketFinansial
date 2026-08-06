'use client';

import { Search, ShieldCheck } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { faNum, levelLabel, levelTone, relative } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { StatusGlyph } from './StatusGlyph';
import s from './obs.module.css';

type Filter = 'all' | 'fatal' | 'error';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'همه' },
  { id: 'fatal', label: 'بحرانی' },
  { id: 'error', label: 'خطا' },
];

/**
 * دفتر خطا — متراکم، قابل جست‌وجو، بدون کارت و بدون مودال.
 *
 * رکوردهای هم‌شکل در لایهٔ داده گروه شده‌اند، پس یک خطای تکراری صفحه را پر
 * نمی‌کند و شمارندهٔ «چند بار» همان گروه است.
 *
 * فیلترها شمارندهٔ واقعی خودشان را نشان می‌دهند تا کاربر قبل از کلیک بداند
 * پشت هر فیلتر چیزی هست یا نه — فیلتر خالی بدترین نوع بن‌بست UI است.
 */
export function ErrorLedger() {
  const { data } = useObs();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const searchId = useId();

  const errors = data?.errors ?? [];
  const reference = data?.generatedAt ?? new Date(0).toISOString();

  const counts = useMemo(
    () => ({
      all: errors.length,
      fatal: errors.filter((item) => item.level === 'fatal').length,
      error: errors.filter((item) => item.level === 'error').length,
    }),
    [errors],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return errors.filter((item) => {
      if (filter !== 'all' && item.level !== filter) return false;
      if (needle.length === 0) return true;
      return (
        item.message.toLowerCase().includes(needle) || item.source.toLowerCase().includes(needle)
      );
    });
  }, [errors, filter, query]);

  if (errors.length === 0) {
    return (
      <ObsEmpty
        icon={ShieldCheck}
        title="هیچ خطایی ثبت نشده"
        hint="رکوردهای SystemLog با سطح error یا fatal اینجا گروه‌بندی و شمارش می‌شوند. خالی بودنش خبر خوبی است."
      />
    );
  }

  return (
    <div>
      <div className={s.filters}>
        <div className={s.segmented} role="group" aria-label="فیلتر سطح خطا">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={s.chip}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
              <span className={s.chipCount}>{faNum(counts[item.id])}</span>
            </button>
          ))}
        </div>

        <label className={s.searchWrap} htmlFor={searchId}>
          <Search size={16} strokeWidth={1.5} aria-hidden="true" />
          <span className="sr-only">جست‌وجو در پیام و منبع خطا</span>
          <input
            id={searchId}
            type="search"
            className={s.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جست‌وجو در پیام یا منبع"
          />
        </label>

        <p className={s.filterMeta} aria-live="polite">
          {faNum(visible.length)} از {faNum(errors.length)} گروه
        </p>
      </div>

      {visible.length === 0 ? (
        <ObsEmpty
          icon={ShieldCheck}
          title="چیزی با این فیلتر پیدا نشد"
          hint="عبارت جست‌وجو را کوتاه‌تر کنید یا فیلتر سطح را روی «همه» بگذارید."
        />
      ) : (
        <ol className={s.ledger}>
          {visible.map((item) => {
            const tone = levelTone(item.level);
            return (
              <li key={item.id} className={s.ledgerRow} data-tone={tone}>
                <span className={s.level}>
                  <StatusGlyph tone={tone} />
                  {levelLabel(item.level)}
                </span>
                <span className={s.source}>{item.source}</span>
                <span className={s.message}>{item.message}</span>
                <span className={s.count} data-hot={item.count > 1}>
                  {item.count > 1 ? `${faNum(item.count)} بار` : 'یک‌بار'}
                </span>
                <span className={s.time}>{relative(item.timestamp, reference)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
