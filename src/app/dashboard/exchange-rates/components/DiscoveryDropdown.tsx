// src/app/dashboard/exchange-rates/components/DiscoveryDropdown.tsx
'use client';

import { useEffect, useState } from 'react';
import type { TgjuSymbol } from '@/lib/market-rates/discovery';

interface Props {
  onSelect: (symbol: TgjuSymbol) => void;
}

export default function DiscoveryDropdown({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [symbols, setSymbols] = useState<TgjuSymbol[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/market-rates/tgju-symbols')
      .then((r) => r.json())
      .then((j: { success?: boolean; data?: TgjuSymbol[] }) => {
        if (j.success && j.data) setSymbols(j.data);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = symbols.filter((s) => {
    const q = query.toLowerCase();
    return s.tgjuKey.toLowerCase().includes(q) || s.displayNameFa.toLowerCase().includes(q);
  });

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="جستجو در نرخ‌های TGJU…"
        className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900"
      />
      {open && (
        <div className="absolute z-10 w-full mt-1 max-h-80 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg">
          {loading ? (
            <div className="p-4 text-center text-neutral-500">در حال بارگذاری…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-neutral-500">نتیجه‌ای یافت نشد</div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.tgjuKey}
                type="button"
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                  setQuery('');
                }}
                className="w-full text-right px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between gap-2"
              >
                <span className="text-sm">{s.displayNameFa || s.tgjuKey}</span>
                <span className="text-xs text-neutral-500 font-mono">{s.tgjuKey}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
