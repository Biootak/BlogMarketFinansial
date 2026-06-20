// src/app/dashboard/exchange-rates/components/RateForm.tsx
'use client';

import { useState } from 'react';
import { createMarketRate } from '@/actions/market-rates';
import DiscoveryDropdown from './DiscoveryDropdown';
import type { TgjuSymbol } from '@/lib/market-rates/discovery';
import { SYMBOL_REGISTRY } from '@/lib/market-rates/registry';

const GROUPS = ['afghan', 'iran-forex', 'iran-coin', 'iran-gold', 'global', 'minor'] as const;
const UNITS = ['toman', 'usd', 'eur', 'afn'] as const;

type FormState = {
  symbol: string;
  displayNameFa: string;
  group: (typeof GROUPS)[number];
  unit: (typeof UNITS)[number];
  divisor: number;
  decimals: number;
  priority: number;
  provider: 'auto' | 'manual';
  tgjuKey: string;
  singleRate: string;
};

const EMPTY: FormState = {
  symbol: '',
  displayNameFa: '',
  group: 'iran-forex',
  unit: 'toman',
  divisor: 10,
  decimals: 0,
  priority: 50,
  provider: 'auto',
  tgjuKey: '',
  singleRate: '',
};

export default function RateForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDiscoverySelect = (s: TgjuSymbol) => {
    const matched = SYMBOL_REGISTRY.find((r) => r.tgjuKey === s.tgjuKey);
    if (matched) {
      const safeUnit: FormState['unit'] = matched.unit === 'rial' || matched.unit === 'pound' ? 'toman' : matched.unit;
      setForm({
        symbol: matched.symbol,
        displayNameFa: matched.displayNameFa,
        group: matched.group,
        unit: safeUnit,
        divisor: matched.divisor,
        decimals: matched.decimals,
        priority: matched.priority,
        provider: 'auto',
        tgjuKey: matched.tgjuKey ?? '',
        singleRate: '',
      });
    } else {
      setForm((f) => ({
        ...f,
        symbol: `CUSTOM_${s.tgjuKey.toUpperCase()}`,
        displayNameFa: s.displayNameFa || s.tgjuKey,
        tgjuKey: s.tgjuKey,
        provider: 'auto',
        divisor: 1,
        unit: 'usd' as FormState['unit'],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const result = await createMarketRate({
      symbol: form.symbol,
      displayNameFa: form.displayNameFa,
      group: form.group,
      unit: form.unit,
      divisor: form.divisor,
      decimals: form.decimals,
      priority: form.priority,
      provider: form.provider,
      tgjuKey: form.tgjuKey || undefined,
      singleRate: form.provider === 'manual' ? form.singleRate : undefined,
    });

    setLoading(false);
    if (result.success) {
      setSuccess('نرخ با موفقیت اضافه شد');
      setForm(EMPTY);
    } else {
      setError(result.error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
      <h3 className="text-lg font-bold">افزودن نرخ جدید</h3>

      <div>
        <label className="block text-sm font-medium mb-1">Discovery از TGJU (اختیاری)</label>
        <DiscoveryDropdown onSelect={handleDiscoverySelect} />
        <p className="text-xs text-neutral-500 mt-1">
          اگر نماد در لیست نیست، فیلدهای زیر را دستی پر کنید.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Symbol</label>
          <input
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">نام فارسی</label>
          <input
            value={form.displayNameFa}
            onChange={(e) => setForm({ ...form, displayNameFa: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">گروه</label>
          <select
            value={form.group}
            onChange={(e) => setForm({ ...form, group: e.target.value as FormState['group'] })}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
          >
            {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">واحد</label>
          <select
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value as FormState['unit'] })}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Divisor</label>
          <input
            type="number"
            value={form.divisor}
            onChange={(e) => setForm({ ...form, divisor: Number(e.target.value) })}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">اولویت</label>
          <input
            type="number"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">منبع</label>
          <select
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value as 'auto' | 'manual' })}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
          >
            <option value="auto">خودکار (TGJU)</option>
            <option value="manual">دستی</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">TGJU Key (اگر auto)</label>
          <input
            value={form.tgjuKey}
            onChange={(e) => setForm({ ...form, tgjuKey: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900 font-mono text-sm"
            placeholder="price_dollar_rl"
          />
        </div>
        {form.provider === 'manual' && (
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">مقدار دستی ({form.unit})</label>
            <input
              type="number"
              step="any"
              value={form.singleRate}
              onChange={(e) => setForm({ ...form, singleRate: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
            />
          </div>
        )}
      </div>

      {error && <p className="text-rose-600 text-sm">{error}</p>}
      {success && <p className="text-emerald-600 text-sm">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? 'در حال ذخیره…' : 'ذخیره'}
      </button>
    </form>
  );
}
