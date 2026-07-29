// src/app/dashboard/exchange-rates/_components/RateEditorDrawer.tsx
// 2026-07-29: Single-page form drawer (not 3-step wizard). Accepts an
// optional `prefill` (from CurrencyCatalog) to bootstrap the form.

'use client';

import { createMarketRate, updateMarketRate } from '@/actions/market-rates';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { MarketRateGroup, MarketRateUnit } from '@/lib/market-rates';
import { DASHBOARD_UNIT_DESCRIPTIONS, DASHBOARD_UNIT_LABELS } from '../_lib/unit-labels';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  HiOutlineCheck,
  HiOutlineExclamationCircle,
  HiOutlineXMark,
} from 'react-icons/hi2';
import type { RateRowData } from './ExchangeRateRow';
import type { CatalogEntry } from './CurrencyCatalog';

type Mode = 'create' | 'edit';

interface Props {
  open: boolean;
  mode: Mode;
  initialRow?: RateRowData | null;
  /** Optional prefill from CurrencyCatalog (one-click add). */
  prefill?: CatalogEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Group list is kept as a curated subset of values surfaced in the editor.
 * The form still accepts the full MarketRateGroup union from the registry.
 */
const GROUPS: { value: MarketRateGroup; label: string }[] = [
  { value: 'afghan', label: 'محلی' },
  { value: 'iran-forex', label: 'فارکس' },
  { value: 'iran-coin', label: 'سکه' },
  { value: 'iran-gold', label: 'طلا' },
  { value: 'global', label: 'جهانی' },
  { value: 'minor', label: 'سایر' },
];

const UNITS: { value: MarketRateUnit; label: string; description: string }[] = (
  Object.keys(DASHBOARD_UNIT_LABELS) as MarketRateUnit[]
).map((value) => ({
  value,
  label: DASHBOARD_UNIT_LABELS[value],
  description: DASHBOARD_UNIT_DESCRIPTIONS[value],
}));

interface FormState {
  symbol: string;
  displayNameFa: string;
  group: MarketRateGroup;
  unit: MarketRateUnit;
  divisor: number;
  decimals: number;
  priority: number;
  provider: 'auto' | 'manual';
  tgjuKey: string;
  singleRate: string;
  active: boolean;
}

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
  active: true,
};

const inputBase: React.CSSProperties = {
  width: '100%',
  height: '2.4rem',
  padding: '0 0.75rem',
  fontSize: 'var(--ds-text-sm)',
  color: 'var(--ds-text-primary)',
  background: 'var(--ds-canvas-subtle)',
  border: '1px solid var(--ds-border-subtle)',
  borderRadius: 'var(--ds-radius-md)',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 160ms var(--ds-ease-out-expo)',
};

const selectBase: React.CSSProperties = {
  ...inputBase,
  paddingInlineEnd: '2.25rem',
  appearance: 'none',
  WebkitAppearance: 'none',
  cursor: 'pointer',
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'left 0.7rem center',
  backgroundSize: '12px',
};

export default function RateEditorDrawer({
  open,
  mode,
  initialRow,
  prefill,
  onClose,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Hydrate form on open
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initialRow) {
      setForm({
        symbol: initialRow.symbol,
        displayNameFa: initialRow.displayNameFa,
        group: (initialRow.group as MarketRateGroup | null) ?? 'iran-forex',
        unit: (initialRow.unit as MarketRateUnit | null) ?? 'toman',
        divisor: initialRow.divisor || 10,
        decimals: initialRow.decimals || 0,
        priority: initialRow.priority,
        provider: initialRow.provider === 'manual' ? 'manual' : 'auto',
        tgjuKey: initialRow.tgjuKey || '',
        singleRate: initialRow.singleRate || '',
        active: initialRow.active,
      });
    } else if (prefill) {
      setForm({
        symbol: prefill.symbol,
        displayNameFa: prefill.displayNameFa,
        group: prefill.group,
        unit: prefill.unit as MarketRateUnit,
        divisor: prefill.divisor,
        decimals: prefill.decimals,
        priority: prefill.priority,
        provider: prefill.tgjuKey ? 'auto' : 'manual',
        tgjuKey: prefill.tgjuKey ?? '',
        singleRate: '',
        active: true,
      });
    } else {
      setForm(EMPTY);
    }
    setError(null);
  }, [mode, initialRow, prefill, open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const errors = useMemo(() => {
    const errs: { symbol?: string; displayNameFa?: string; singleRate?: string } = {};
    if (!form.symbol.trim()) errs.symbol = 'نماد الزامی است';
    if (!form.displayNameFa.trim()) errs.displayNameFa = 'نام فارسی الزامی است';
    if (form.provider === 'manual' && !form.singleRate.trim()) {
      errs.singleRate = 'مقدار دستی الزامی است';
    }
    return errs;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    setError(null);

    let result:
      | { success: true; data?: unknown }
      | { success: false; error: { code: string; message: string } };

    if (mode === 'create') {
      result = await createMarketRate({
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
    } else if (initialRow) {
      result = await updateMarketRate(initialRow.id, {
        displayNameFa: form.displayNameFa,
        group: form.group,
        unit: form.unit,
        divisor: form.divisor,
        decimals: form.decimals,
        priority: form.priority,
        provider: form.provider,
        tgjuKey: form.tgjuKey || null,
        singleRate: form.provider === 'manual' ? form.singleRate : null,
        active: form.active,
      });
    } else {
      result = {
        success: false,
        error: { code: 'NO_ROW', message: 'ردیفی برای ویرایش انتخاب نشده' },
      };
    }

    setSubmitting(false);

    if (result.success) {
      toast({
        title: mode === 'create' ? 'نرخ ایجاد شد' : 'نرخ به‌روزرسانی شد',
        description: `${form.displayNameFa} (${form.symbol})`,
        variant: 'success',
      });
      onSaved();
      onClose();
    } else {
      setError(result.error.message);
    }
  };

  if (!open || !mounted) return null;

  const title = mode === 'create' ? 'افزودن نرخ جدید' : 'ویرایش نرخ';
  const subtitle =
    mode === 'create'
      ? 'از کاتالوگ انتخاب کردید؟ فرم از قبل پر شده. فقط مقادیر را بازبینی و ذخیره کنید.'
      : `در حال ویرایش «${initialRow?.displayNameFa ?? ''}»`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="بستن"
        onClick={onClose}
        className="flex-1 cursor-default"
        style={{
          background: 'color-mix(in oklch, var(--ds-canvas) 55%, transparent)',
          backdropFilter: 'blur(6px)',
        }}
      />

      {/* Drawer panel — slides from start (RTL = right) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="rate-drawer-title"
        className="flex h-full flex-col"
        style={{
          width: 'min(34rem, 100vw)',
          background: 'var(--ds-surface-elevated)',
          borderInlineStart: '1px solid var(--ds-border-default)',
          boxShadow: 'var(--ds-shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between"
          style={{
            padding: 'var(--ds-space-4) var(--ds-space-5)',
            borderBottom: '1px solid var(--ds-border-subtle)',
            gap: 'var(--ds-space-3)',
          }}
        >
          <div className="flex flex-col" style={{ gap: '0.2rem' }}>
            <h2
              id="rate-drawer-title"
              className="font-bold"
              style={{
                fontSize: 'var(--ds-text-lg)',
                color: 'var(--ds-text-primary)',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {title}
            </h2>
            <p
              style={{
                fontSize: 'var(--ds-text-xs)',
                color: 'var(--ds-text-muted)',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="inline-flex items-center justify-center transition-colors"
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: 'var(--ds-radius-md)',
              background: 'transparent',
              color: 'var(--ds-text-muted)',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ds-canvas-subtle)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <HiOutlineXMark aria-hidden style={{ width: '1.1rem', height: '1.1rem' }} />
          </button>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: 'var(--ds-space-5)' }}
        >
          <div className="flex flex-col" style={{ gap: 'var(--ds-space-5)' }}>
            {/* Section 1: Identity */}
            <Section
              eyebrow="۰۱"
              title="هویت ارز"
              description="نماد یکتا (لاتین) و نام فارسی برای نمایش"
            >
              <div
                className="grid"
                style={{ gap: 'var(--ds-space-3)' }}
              >
                <Field
                  label="نماد (Symbol)"
                  required
                  error={errors.symbol}
                  hint="فقط حروف لاتین بزرگ، عدد و _"
                >
                  <input
                    value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                    placeholder="AFN_USD"
                    required
                    dir="ltr"
                    className="font-mono"
                    style={inputBase}
                  />
                </Field>
                <Field label="نام فارسی" required error={errors.displayNameFa}>
                  <input
                    value={form.displayNameFa}
                    onChange={(e) => setForm({ ...form, displayNameFa: e.target.value })}
                    placeholder="دلار هرات"
                    required
                    style={inputBase}
                  />
                </Field>
              </div>
            </Section>

            {/* Section 2: Classification */}
            <Section
              eyebrow="۰۲"
              title="دسته‌بندی"
              description="گروه و واحد پولی برای نمایش در تیکر و محاسبه"
            >
              <div
                className="grid grid-cols-1 sm:grid-cols-2"
                style={{ gap: 'var(--ds-space-3)' }}
              >
                <Field label="گروه">
                  <select
                    value={form.group}
                    onChange={(e) =>
                      setForm({ ...form, group: e.target.value as MarketRateGroup })
                    }
                    style={selectBase}
                  >
                    {GROUPS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="واحد">
                  <select
                    value={form.unit}
                    onChange={(e) =>
                      setForm({ ...form, unit: e.target.value as MarketRateUnit })
                    }
                    style={selectBase}
                  >
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ضریب (Divisor)" hint="مقدار خام ÷ این عدد = مقدار نمایش">
                  <input
                    type="number"
                    value={form.divisor}
                    onChange={(e) =>
                      setForm({ ...form, divisor: Math.max(1, Number(e.target.value)) })
                    }
                    min={1}
                    style={inputBase}
                  />
                </Field>
                <Field label="اولویت" hint="عدد کمتر = نمایش بالاتر">
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                    style={inputBase}
                  />
                </Field>
              </div>
            </Section>

            {/* Section 3: Source */}
            <Section
              eyebrow="۰۳"
              title="منبع و مقدار"
              description="زنده (خودکار) یا دستی (توسط ادمین)"
            >
              <div className="flex flex-col" style={{ gap: 'var(--ds-space-3)' }}>
                <div
                  role="radiogroup"
                  aria-label="نوع منبع"
                  className="grid grid-cols-2"
                  style={{ gap: 'var(--ds-space-2)' }}
                >
                  <SourceOption
                    selected={form.provider === 'auto'}
                    onSelect={() => setForm({ ...form, provider: 'auto' })}
                    label="زنده (خودکار)"
                    description="به‌صورت خودکار توسط سیستم به‌روزرسانی می‌شود"
                  />
                  <SourceOption
                    selected={form.provider === 'manual'}
                    onSelect={() => setForm({ ...form, provider: 'manual' })}
                    label="دستی (ادمین)"
                    description="توسط مدیر سیستم تنظیم می‌شود"
                  />
                </div>

                {form.provider === 'auto' ? (
                  <Field
                    label="کلید منبع"
                    hint="کلید داخلی برای فید خودکار"
                  >
                    <input
                      value={form.tgjuKey}
                      onChange={(e) => setForm({ ...form, tgjuKey: e.target.value })}
                      placeholder="dollar_rl"
                      dir="ltr"
                      className="font-mono"
                      style={inputBase}
                    />
                  </Field>
                ) : (
                  <Field
                    label={`مقدار دستی (${DASHBOARD_UNIT_LABELS[form.unit]})`}
                    required
                    error={errors.singleRate}
                  >
                    <input
                      type="number"
                      step="any"
                      value={form.singleRate}
                      onChange={(e) => setForm({ ...form, singleRate: e.target.value })}
                      required
                      dir="ltr"
                      className="font-mono"
                      style={inputBase}
                    />
                  </Field>
                )}
              </div>
            </Section>

            {/* Section 4: Visibility (edit only) */}
            {mode === 'edit' && (
              <Section
                eyebrow="۰۴"
                title="نمایش"
                description="کنترل نمایش در تیکر و سایر بخش‌ها"
              >
                <label
                  className="inline-flex items-center cursor-pointer"
                  style={{ gap: '0.6rem' }}
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.active}
                    onClick={() => setForm({ ...form, active: !form.active })}
                    style={{
                      width: '2.5rem',
                      height: '1.4rem',
                      borderRadius: 'var(--ds-radius-full)',
                      background: form.active
                        ? 'var(--ds-accent-emerald)'
                        : 'var(--ds-canvas-subtle)',
                      border: '1px solid var(--ds-border-default)',
                      position: 'relative',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'background 160ms var(--ds-ease-out-expo)',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        insetInlineStart: form.active ? 'calc(100% - 1.2rem - 2px)' : '2px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '1.1rem',
                        height: '1.1rem',
                        borderRadius: 'var(--ds-radius-full)',
                        background: 'var(--ds-surface-elevated)',
                        boxShadow: 'var(--ds-shadow-sm)',
                        transition: 'inset-inline-start 200ms var(--ds-ease-out-expo)',
                      }}
                    />
                  </button>
                  <span
                    style={{
                      fontSize: 'var(--ds-text-sm)',
                      color: 'var(--ds-text-primary)',
                      fontWeight: 500,
                    }}
                  >
                    {form.active ? 'این نرخ در تیکر نمایش داده شود' : 'این نرخ از تیکر مخفی است'}
                  </span>
                </label>
              </Section>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start"
                style={{
                  gap: '0.5rem',
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-accent-rose)',
                  padding: 'var(--ds-space-3) var(--ds-space-4)',
                  background:
                    'color-mix(in oklch, var(--ds-accent-rose) 10%, transparent)',
                  border:
                    '1px solid color-mix(in oklch, var(--ds-accent-rose) 24%, transparent)',
                  borderRadius: 'var(--ds-radius-md)',
                }}
              >
                <HiOutlineExclamationCircle
                  aria-hidden
                  style={{
                    width: '1.05rem',
                    height: '1.05rem',
                    flexShrink: 0,
                    marginTop: '0.15rem',
                  }}
                />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end"
          style={{
            padding: 'var(--ds-space-3) var(--ds-space-5)',
            borderTop: '1px solid var(--ds-border-subtle)',
            background: 'var(--ds-canvas-subtle)',
            gap: 'var(--ds-space-2)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex items-center font-semibold transition-colors"
            style={{
              height: '2.4rem',
              paddingInline: 'var(--ds-space-4)',
              fontSize: 'var(--ds-text-sm)',
              color: 'var(--ds-text-secondary)',
              background: 'transparent',
              border: '1px solid var(--ds-border-default)',
              borderRadius: 'var(--ds-radius-md)',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="inline-flex items-center font-semibold transition-all"
            style={{
              height: '2.4rem',
              paddingInline: 'var(--ds-space-4)',
              fontSize: 'var(--ds-text-sm)',
              color: 'var(--ds-text-inverse)',
              background: 'var(--ds-brand-500)',
              border: 'none',
              borderRadius: 'var(--ds-radius-md)',
              cursor: !isValid || submitting ? 'not-allowed' : 'pointer',
              opacity: !isValid || submitting ? 0.5 : 1,
              gap: '0.4rem',
              boxShadow: 'var(--ds-shadow-sm)',
            }}
          >
            <HiOutlineCheck aria-hidden style={{ width: '1rem', height: '1rem' }} />
            {submitting
              ? 'در حال ذخیره…'
              : mode === 'create'
                ? 'ایجاد نرخ'
                : 'ذخیره تغییرات'}
          </button>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Section — eyebrow + title + description + content
   ────────────────────────────────────────────────────────────────────── */

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col" style={{ gap: 'var(--ds-space-3)' }}>
      <div className="flex items-baseline" style={{ gap: '0.5rem' }}>
        <span
          className="font-mono font-bold"
          dir="ltr"
          style={{
            fontSize: '0.65rem',
            color: 'var(--ds-brand-500)',
            letterSpacing: '0.08em',
          }}
        >
          {eyebrow}
        </span>
        <h3
          className="font-bold"
          style={{
            fontSize: 'var(--ds-text-sm)',
            color: 'var(--ds-text-primary)',
            margin: 0,
          }}
        >
          {title}
        </h3>
        <span
          aria-hidden
          style={{
            flex: 1,
            height: '1px',
            background: 'var(--ds-border-subtle)',
          }}
        />
      </div>
      <p
        style={{
          fontSize: 'var(--ds-text-xs)',
          color: 'var(--ds-text-muted)',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
      {children}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Field — label + control + error + hint
   ────────────────────────────────────────────────────────────────────── */

function Field({
  label,
  children,
  required,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col" style={{ gap: '0.3rem' }}>
      <span
        style={{
          fontSize: 'var(--ds-text-xs)',
          fontWeight: 600,
          color: 'var(--ds-text-secondary)',
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--ds-accent-rose)' }}> *</span>}
      </span>
      {children}
      {error ? (
        <span
          role="alert"
          style={{
            fontSize: '0.7rem',
            color: 'var(--ds-accent-rose)',
            fontWeight: 500,
          }}
        >
          {error}
        </span>
      ) : hint ? (
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--ds-text-muted)',
          }}
        >
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   SourceOption — radio card for provider selection
   ────────────────────────────────────────────────────────────────────── */

function SourceOption({
  selected,
  onSelect,
  label,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'text-start transition-all',
      )}
      style={{
        padding: 'var(--ds-space-3) var(--ds-space-4)',
        background: selected
          ? 'color-mix(in oklch, var(--ds-brand-500) 8%, var(--ds-canvas-subtle))'
          : 'var(--ds-canvas-subtle)',
        border: `1px solid ${selected ? 'var(--ds-brand-500)' : 'var(--ds-border-subtle)'}`,
        borderRadius: 'var(--ds-radius-md)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
      }}
    >
      <div className="flex items-center" style={{ gap: '0.4rem' }}>
        <span
          aria-hidden
          style={{
            width: '0.9rem',
            height: '0.9rem',
            borderRadius: 'var(--ds-radius-full)',
            border: `2px solid ${selected ? 'var(--ds-brand-500)' : 'var(--ds-border-default)'}`,
            background: selected ? 'var(--ds-brand-500)' : 'transparent',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {selected && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: '2px',
                borderRadius: 'var(--ds-radius-full)',
                background: 'var(--ds-surface-elevated)',
              }}
            />
          )}
        </span>
        <span
          className="font-semibold"
          style={{
            fontSize: 'var(--ds-text-sm)',
            color: selected ? 'var(--ds-brand-500)' : 'var(--ds-text-primary)',
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontSize: '0.7rem',
          color: 'var(--ds-text-muted)',
          lineHeight: 1.4,
        }}
      >
        {description}
      </span>
    </button>
  );
}
