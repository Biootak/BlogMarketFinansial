// src/app/dashboard/exchange-rates/_components/RateEditorDrawer.tsx
// 2026-06-20: Drawer 3 مرحله‌ای — Discovery → Configure → Review
// RTL slide از راست، focus trap با خود focusable elements، Portal mount.

'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, ArrowLeft, Check, Search } from 'lucide-react';
import {
  createMarketRate,
  updateMarketRate,
} from '@/actions/market-rates';
import DiscoveryCommand from './DiscoveryCommand';
import type { TgjuSymbol } from '@/lib/market-rates/discovery';
import type { RateRowData } from './ExchangeRateRow';
import type { MarketRateGroup, MarketRateUnit } from '@/lib/market-rates';

type Step = 'discover' | 'configure' | 'review';
type Mode = 'create' | 'edit';

interface Props {
  open: boolean;
  mode: Mode;
  initialRow?: RateRowData | null;
  onClose: () => void;
  onSaved: () => void;
}

const GROUPS: MarketRateGroup[] = [
  'afghan',
  'iran-forex',
  'iran-coin',
  'iran-gold',
  'global',
  'minor',
];
const UNITS: MarketRateUnit[] = ['toman', 'usd', 'eur', 'afn'];

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

const inputStyle: CSSProperties = {
  width: '100%',
  height: '2.25rem',
  padding: '0 0.75rem',
  fontSize: 'var(--ds-text-sm)',
  color: 'var(--ds-text-primary)',
  background: 'var(--ds-canvas-subtle)',
  border: '1px solid var(--ds-border-subtle)',
  borderRadius: 'var(--ds-radius-md)',
  outline: 'none',
  fontFamily: 'inherit',
};

export default function RateEditorDrawer({
  open,
  mode,
  initialRow,
  onClose,
  onSaved,
}: Props) {
  const [step, setStep] = useState<Step>(mode === 'edit' ? 'configure' : 'discover');
  const [form, setForm] = useState<FormState>(EMPTY);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Hydrate form when opened
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initialRow) {
      setForm({
        symbol: initialRow.symbol,
        displayNameFa: initialRow.displayNameFa,
        group:
          (initialRow.group as MarketRateGroup | null) ?? 'iran-forex',
        unit: (initialRow.unit as MarketRateUnit | null) ?? 'toman',
        divisor: initialRow.divisor || 10,
        decimals: initialRow.decimals || 0,
        priority: initialRow.priority,
        provider: initialRow.provider === 'manual' ? 'manual' : 'auto',
        tgjuKey: initialRow.tgjuKey || '',
        singleRate: initialRow.singleRate || '',
        active: initialRow.active,
      });
      setStep('configure');
    } else {
      setForm(EMPTY);
      setStep('discover');
    }
    setError(null);
  }, [mode, initialRow, open]);

  // Esc to close
  useEffect(() => {
    if (!open || discoveryOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, discoveryOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleDiscoverySelect = (s: TgjuSymbol) => {
    setForm((f) => ({
      ...f,
      symbol: `CUSTOM_${s.tgjuKey.toUpperCase()}`,
      displayNameFa: s.displayNameFa || s.tgjuKey,
      tgjuKey: s.tgjuKey,
      provider: 'auto',
      divisor: 10,
      unit: 'toman',
    }));
    setStep('configure');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    let result:
      | { success: true; id?: string }
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
      onSaved();
      onClose();
    } else {
      setError(result.error.message);
    }
  };

  if (!open || !mounted) return null;

  const drawer = (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        className="fixed inset-0 z-40"
        style={{
          background:
            'color-mix(in oklch, var(--ds-canvas) 50%, transparent)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="fixed inset-y-0 z-50 flex flex-col overflow-hidden"
        style={{
          insetInlineEnd: 0,
          width: 'min(480px, 100vw)',
          background: 'var(--ds-surface-elevated)',
          borderInlineStart: '1px solid var(--ds-border-default)',
          boxShadow: 'var(--ds-shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: 'var(--ds-space-4) var(--ds-space-5)',
            borderBottom: '1px solid var(--ds-border-subtle)',
          }}
        >
          <h2
            id="drawer-title"
            className="font-bold"
            style={{
              fontSize: 'var(--ds-text-lg)',
              color: 'var(--ds-text-primary)',
              margin: 0,
            }}
          >
            {mode === 'create' ? 'افزودن نرخ جدید' : 'ویرایش نرخ'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="inline-flex items-center justify-center"
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
            <X aria-hidden style={{ width: '1rem', height: '1rem' }} />
          </button>
        </div>

        {/* Step indicator */}
        <ol
          className="flex items-center"
          style={{
            padding: 'var(--ds-space-3) var(--ds-space-5)',
            gap: 'var(--ds-space-3)',
            borderBottom: '1px solid var(--ds-border-subtle)',
            background: 'var(--ds-canvas-subtle)',
            listStyle: 'none',
            margin: 0,
          }}
        >
          {(['discover', 'configure', 'review'] as Step[]).map((s, i) => {
            const active = s === step;
            const labels: Record<Step, string> = {
              discover: 'انتخاب',
              configure: 'تنظیمات',
              review: 'بررسی',
            };
            return (
              <li
                key={s}
                className="flex items-center"
                style={{
                  fontSize: 'var(--ds-text-xs)',
                  color: active ? 'var(--ds-brand-500)' : 'var(--ds-text-muted)',
                  fontWeight: active ? 600 : 400,
                  gap: '0.4rem',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '1.25rem',
                    height: '1.25rem',
                    borderRadius: 'var(--ds-radius-full)',
                    background: active
                      ? 'var(--ds-brand-500)'
                      : 'var(--ds-canvas-subtle)',
                    color: active
                      ? 'var(--ds-text-inverse)'
                      : 'var(--ds-text-muted)',
                    border: '1px solid var(--ds-border-default)',
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </span>
                {labels[s]}
              </li>
            );
          })}
        </ol>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: 'var(--ds-space-5)' }}
        >
          {step === 'discover' && mode === 'create' && (
            <div
              className="flex flex-col"
              style={{ gap: 'var(--ds-space-4)' }}
            >
              <p
                style={{
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-text-secondary)',
                  lineHeight: 'var(--ds-leading-relaxed)',
                  margin: 0,
                }}
              >
                از لیست نرخ‌های TGJU یکی انتخاب کنید یا بدون انتخاب، مستقیماً به مرحلهٔ تنظیمات بروید.
              </p>
              <button
                type="button"
                onClick={() => setDiscoveryOpen(true)}
                className="inline-flex items-center justify-center font-semibold"
                style={{
                  height: '2.75rem',
                  paddingInline: 'var(--ds-space-5)',
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-text-inverse)',
                  background: 'var(--ds-brand-500)',
                  borderRadius: 'var(--ds-radius-md)',
                  border: 'none',
                  cursor: 'pointer',
                  gap: '0.5rem',
                  alignSelf: 'start',
                }}
              >
                <Search aria-hidden style={{ width: '1rem', height: '1rem' }} />
                جست‌وجو در TGJU
              </button>
              <button
                type="button"
                onClick={() => setStep('configure')}
                style={{
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-text-secondary)',
                  background: 'transparent',
                  textDecoration: 'underline',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  alignSelf: 'start',
                }}
              >
                یا بدون انتخاب، دستی ادامه بده
              </button>
            </div>
          )}

          {step === 'configure' && (
            <div
              className="grid grid-cols-2"
              style={{ gap: 'var(--ds-space-4)' }}
            >
              <Field label="نماد (Symbol)" required>
                <input
                  value={form.symbol}
                  onChange={(e) =>
                    setForm({ ...form, symbol: e.target.value })
                  }
                  required
                  style={inputStyle}
                />
              </Field>
              <Field label="نام فارسی" required>
                <input
                  value={form.displayNameFa}
                  onChange={(e) =>
                    setForm({ ...form, displayNameFa: e.target.value })
                  }
                  required
                  style={inputStyle}
                />
              </Field>
              <Field label="گروه">
                <select
                  value={form.group}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      group: e.target.value as MarketRateGroup,
                    })
                  }
                  style={inputStyle}
                >
                  {GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="واحد">
                <select
                  value={form.unit}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      unit: e.target.value as MarketRateUnit,
                    })
                  }
                  style={inputStyle}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Divisor">
                <input
                  type="number"
                  value={form.divisor}
                  onChange={(e) =>
                    setForm({ ...form, divisor: Number(e.target.value) })
                  }
                  style={inputStyle}
                />
              </Field>
              <Field label="اولویت">
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: Number(e.target.value) })
                  }
                  style={inputStyle}
                />
              </Field>
              <Field label="منبع">
                <select
                  value={form.provider}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      provider: e.target.value as 'auto' | 'manual',
                    })
                  }
                  style={inputStyle}
                >
                  <option value="auto">خودکار (TGJU)</option>
                  <option value="manual">دستی</option>
                </select>
              </Field>
              <Field label="TGJU Key">
                <input
                  value={form.tgjuKey}
                  onChange={(e) =>
                    setForm({ ...form, tgjuKey: e.target.value })
                  }
                  placeholder="price_dollar_rl"
                  className="font-mono"
                  style={inputStyle}
                />
              </Field>
              {form.provider === 'manual' && (
                <Field
                  label={`مقدار دستی (${form.unit})`}
                  className="col-span-2"
                >
                  <input
                    type="number"
                    step="any"
                    value={form.singleRate}
                    onChange={(e) =>
                      setForm({ ...form, singleRate: e.target.value })
                    }
                    required
                    style={inputStyle}
                  />
                </Field>
              )}
              {mode === 'edit' && (
                <Field label="فعال" className="col-span-2">
                  <label
                    className="inline-flex items-center"
                    style={{
                      gap: '0.5rem',
                      cursor: 'pointer',
                      fontSize: 'var(--ds-text-sm)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) =>
                        setForm({ ...form, active: e.target.checked })
                      }
                    />
                    <span>این نرخ در تیکر نمایش داده شود</span>
                  </label>
                </Field>
              )}
            </div>
          )}

          {step === 'review' && (
            <div
              className="flex flex-col"
              style={{ gap: 'var(--ds-space-3)' }}
            >
              <p
                style={{
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-text-secondary)',
                  lineHeight: 'var(--ds-leading-relaxed)',
                  margin: 0,
                }}
              >
                قبل از ذخیره، تنظیمات را بررسی کنید.
              </p>
              <dl
                className="grid grid-cols-2"
                style={{
                  gap: 'var(--ds-space-3)',
                  padding: 'var(--ds-space-4)',
                  background: 'var(--ds-canvas-subtle)',
                  borderRadius: 'var(--ds-radius-md)',
                  border: '1px solid var(--ds-border-subtle)',
                }}
              >
                <SummaryRow label="نماد" value={form.symbol} mono />
                <SummaryRow label="نام فارسی" value={form.displayNameFa} />
                <SummaryRow label="گروه" value={form.group} />
                <SummaryRow label="واحد" value={form.unit} />
                <SummaryRow
                  label="اولویت"
                  value={form.priority.toString()}
                />
                <SummaryRow
                  label="منبع"
                  value={form.provider === 'auto' ? 'TGJU' : 'دستی'}
                />
                {form.tgjuKey && (
                  <SummaryRow label="TGJU Key" value={form.tgjuKey} mono />
                )}
              </dl>
              {error && (
                <p
                  role="alert"
                  style={{
                    fontSize: 'var(--ds-text-sm)',
                    color: 'var(--ds-accent-rose)',
                    padding: 'var(--ds-space-3)',
                    background:
                      'color-mix(in oklch, var(--ds-accent-rose) 10%, transparent)',
                    borderRadius: 'var(--ds-radius-md)',
                    margin: 0,
                  }}
                >
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: 'var(--ds-space-4) var(--ds-space-5)',
            borderTop: '1px solid var(--ds-border-subtle)',
            background: 'var(--ds-canvas-subtle)',
            gap: 'var(--ds-space-3)',
          }}
        >
          {step !== 'discover' ? (
            <button
              type="button"
              onClick={() =>
                setStep((s) => (s === 'review' ? 'configure' : 'discover'))
              }
              disabled={submitting}
              className="inline-flex items-center"
              style={{
                fontSize: 'var(--ds-text-sm)',
                color: 'var(--ds-text-secondary)',
                background: 'transparent',
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                gap: '0.4rem',
                opacity: submitting ? 0.5 : 1,
              }}
            >
              <ArrowRight aria-hidden style={{ width: '1rem', height: '1rem' }} />
              قبلی
            </button>
          ) : (
            <span />
          )}

          {step !== 'review' ? (
            <button
              type="button"
              onClick={() => {
                if (step === 'discover') {
                  setStep('configure');
                } else if (
                  step === 'configure' &&
                  form.symbol.trim() &&
                  form.displayNameFa.trim()
                ) {
                  setStep('review');
                }
              }}
              disabled={
                step === 'configure' &&
                (!form.symbol.trim() || !form.displayNameFa.trim())
              }
              className="inline-flex items-center font-semibold"
              style={{
                height: '2.25rem',
                paddingInline: 'var(--ds-space-4)',
                fontSize: 'var(--ds-text-sm)',
                color: 'var(--ds-text-inverse)',
                background: 'var(--ds-brand-500)',
                borderRadius: 'var(--ds-radius-md)',
                border: 'none',
                cursor: 'pointer',
                gap: '0.4rem',
                opacity:
                  step === 'configure' &&
                  (!form.symbol.trim() || !form.displayNameFa.trim())
                    ? 0.5
                    : 1,
              }}
            >
              بعدی
              <ArrowLeft aria-hidden style={{ width: '1rem', height: '1rem' }} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center font-semibold"
              style={{
                height: '2.25rem',
                paddingInline: 'var(--ds-space-4)',
                fontSize: 'var(--ds-text-sm)',
                color: 'var(--ds-text-inverse)',
                background: 'var(--ds-brand-500)',
                borderRadius: 'var(--ds-radius-md)',
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                gap: '0.4rem',
                opacity: submitting ? 0.5 : 1,
              }}
            >
              <Check aria-hidden style={{ width: '1rem', height: '1rem' }} />
              {submitting
                ? 'در حال ذخیره…'
                : mode === 'create'
                  ? 'ایجاد'
                  : 'ذخیره'}
            </button>
          )}
        </div>
      </aside>

      <DiscoveryCommand
        open={discoveryOpen}
        onOpenChange={setDiscoveryOpen}
        onSelect={handleDiscoverySelect}
      />
    </>
  );

  return createPortal(drawer, document.body);
}

function Field({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col ${className ?? ''}`}
      style={{ gap: '0.375rem' }}
    >
      <label
        style={{
          fontSize: 'var(--ds-text-xs)',
          fontWeight: 600,
          color: 'var(--ds-text-secondary)',
        }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--ds-accent-rose)' }}> *</span>
        )}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt
        style={{
          fontSize: 'var(--ds-text-xs)',
          color: 'var(--ds-text-muted)',
          fontWeight: 600,
          margin: 0,
        }}
      >
        {label}
      </dt>
      <dd
        className={mono ? 'font-mono' : ''}
        style={{
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-primary)',
          direction: mono ? 'ltr' : 'inherit',
          textAlign: mono ? 'start' : 'end',
          margin: 0,
        }}
      >
        {value}
      </dd>
    </>
  );
}
