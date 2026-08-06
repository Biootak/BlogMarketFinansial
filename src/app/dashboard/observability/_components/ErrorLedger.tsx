'use client';

import { ShieldCheck } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { faNum, levelLabel, levelTone, relative } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import s from './obs.module.css';

type Filter = 'all' | 'fatal' | 'error';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'همه' },
  { id: 'fatal', label: 'بحرانی' },
  { id: 'error', label: 'خطا' },
];

/** دفتر خطا — متراکم، قابل جست‌وجو، بدون کارت و بدون مودال. */
export function ErrorLedger() {
  const { data } = useObs();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const searchId = useId();

  const errors = data?.errors ?? [];
  const reference = data?.generatedAt ?? new Date(0).toISOString();

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
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={s.chip}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}

        <label className="sr-only" htmlFor={searchId}>
          جست‌وجو در پیام و منبع خطا
        </label>
        <input
          id={searchId}
          type="search"
          className={s.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جست‌وجو در پیام یا منبع"
        />
      </div>

      {visible.length === 0 ? (
        <ObsEmpty
          icon={ShieldCheck}
          title="چیزی با این فیلتر پیدا نشد"
          hint="عبارت جست‌وجو را کوتاه‌تر کنید یا فیلتر سطح را روی «همه» بگذارید."
        />
      ) : (
        <ol className={s.ledger}>
          {visible.map((item) => (
            <li key={item.id} className={s.ledgerRow} data-tone={levelTone(item.level)}>
              <span className={s.level}>{levelLabel(item.level)}</span>
              <span className={s.source}>{item.source}</span>
              <span className={s.message}>{item.message}</span>
              <span className={s.count}>
                {item.count > 1 ? `${faNum(item.count)} بار` : 'یک‌بار'}
              </span>
              <span className={s.time}>{relative(item.timestamp, reference)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
