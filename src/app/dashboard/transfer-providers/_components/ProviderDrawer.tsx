'use client';

/**
 * ProviderDrawer — فرم ایجاد/ویرایش TransferProvider در پنل ادمین.
 */

import type { TransferProviderRow } from '@/actions/transfer-providers';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Loader2, Save, X, XCircle } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import s from './TransferProvidersWorkspace.module.css';

const TRANSFER_KIND_VALUES = ['SARAJI', 'ONLINE', 'BANK', 'CRYPTO'] as const;
const TRANSFER_FEATURE_VALUES = [
  { value: 'live-rate', label: 'نرخ لحظه‌ای' },
  { value: 'fee-transparent', label: 'کارمزد شفاف' },
  { value: 'cash-pickup', label: 'دریافت نقدی' },
  { value: 'bank-transfer', label: 'انتقال بانکی' },
] as const;

type Feature = 'live-rate' | 'fee-transparent' | 'cash-pickup' | 'bank-transfer';

const KIND_FA: Record<string, string> = {
  SARAJI: 'صرافی',
  ONLINE: 'سرویس آنلاین',
  BANK: 'بانک',
  CRYPTO: 'رمزارز',
};

interface Props {
  open: boolean;
  editRow: TransferProviderRow | null;
  onClose: () => void;
  onSave: (data: unknown) => Promise<{ success: boolean; message?: string }>;
}

interface FormState {
  slug: string;
  name: string;
  kind: string;
  spreadPercent: string;
  flatFeeToman: string;
  speedMinutes: string;
  features: Feature[];
  active: boolean;
  order: string;
  description: string;
  logoUrl: string;
}

const EMPTY: FormState = {
  slug: '',
  name: '',
  kind: 'SARAJI',
  spreadPercent: '0',
  flatFeeToman: '0',
  speedMinutes: '0',
  features: ['live-rate', 'fee-transparent'],
  active: true,
  order: '50',
  description: '',
  logoUrl: '',
};

function rowToForm(r: TransferProviderRow): FormState {
  return {
    slug: r.slug,
    name: r.name,
    kind: r.kind,
    spreadPercent: String(r.spreadPercent),
    flatFeeToman: String(r.flatFeeToman),
    speedMinutes: String(r.speedMinutes),
    features: (r.features ?? []) as Feature[],
    active: r.active,
    order: String(r.order),
    description: r.description ?? '',
    logoUrl: r.logoUrl ?? '',
  };
}

export default function ProviderDrawer({ open, editRow, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(editRow ? rowToForm(editRow) : EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setForm(editRow ? rowToForm(editRow) : EMPTY);
      setError(null);
      setSaved(false);
    }
  }, [open, editRow]);

  function toggleFeature(feat: Feature) {
    setForm((f) => ({
      ...f,
      features: f.features.includes(feat)
        ? f.features.filter((x) => x !== feat)
        : [...f.features, feat],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const data = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      kind: form.kind,
      spreadPercent: Number(form.spreadPercent),
      flatFeeToman: Math.round(Number(form.flatFeeToman)),
      speedMinutes: Math.round(Number(form.speedMinutes)),
      features: form.features,
      active: form.active,
      order: Math.round(Number(form.order)),
      description: form.description.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
    };

    startTransition(async () => {
      const res = await onSave(data);
      if (res.success) {
        setSaved(true);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => {
          setSaved(false);
          onClose();
        }, 1200);
      } else {
        setError(res.message ?? 'خطا در ذخیره');
      }
    });
  }

  if (!open) return null;

  return (
    <div
      className={s.drawerOverlay}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="presentation"
    >
      <dialog
        open
        className={s.drawer}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        aria-label={editRow ? 'ویرایش صرافی' : 'افزودن صرافی جدید'}
      >
        {/* Header */}
        <div className={s.drawerHeader}>
          <h2 className={s.drawerTitle}>
            {editRow ? `ویرایش «${editRow.name}»` : 'افزودن صرافی جدید'}
          </h2>
          <button type="button" onClick={onClose} className={s.drawerClose} aria-label="بستن">
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {/* Form body — scrollable */}
        <form id="provider-form" onSubmit={handleSubmit} className={s.drawerForm}>
          {/* slug — فقط در حالت ایجاد */}
          {!editRow && (
            <div className={s.drawerField}>
              <label htmlFor="p-slug" className={s.drawerLabel}>
                slug (یکتا)
              </label>
              <input
                id="p-slug"
                type="text"
                className={s.drawerInput}
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="market-mid"
                required
                pattern="[a-z0-9-]+"
                maxLength={64}
                dir="ltr"
              />
              <span className={s.drawerHint}>فقط حروف انگلیسی کوچک، اعداد و خط تیره</span>
            </div>
          )}

          {/* نام */}
          <div className={s.drawerField}>
            <label htmlFor="p-name" className={s.drawerLabel}>
              نام نمایشی
            </label>
            <input
              id="p-name"
              type="text"
              className={s.drawerInput}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              maxLength={100}
            />
          </div>

          {/* نوع */}
          <div className={s.drawerField}>
            <label className={s.drawerLabel} id="p-kind-label">
              نوع سرویس
            </label>
            <Select value={form.kind} onValueChange={(v) => setForm((f) => ({ ...f, kind: v }))}>
              <SelectTrigger aria-labelledby="p-kind-label" className={s.drawerSelectTrigger}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSFER_KIND_VALUES.map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_FA[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* spread, fee, speed در یک row */}
          <div className={s.drawerGrid3}>
            <div className={s.drawerField}>
              <label htmlFor="p-spread" className={s.drawerLabel}>
                اسپرد٪
              </label>
              <input
                id="p-spread"
                type="number"
                className={s.drawerInput}
                value={form.spreadPercent}
                onChange={(e) => setForm((f) => ({ ...f, spreadPercent: e.target.value }))}
                min="0"
                max="50"
                step="0.01"
                dir="ltr"
              />
            </div>
            <div className={s.drawerField}>
              <label htmlFor="p-fee" className={s.drawerLabel}>
                کارمزد (ت)
              </label>
              <input
                id="p-fee"
                type="number"
                className={s.drawerInput}
                value={form.flatFeeToman}
                onChange={(e) => setForm((f) => ({ ...f, flatFeeToman: e.target.value }))}
                min="0"
                max="10000000"
                step="1000"
                dir="ltr"
              />
            </div>
            <div className={s.drawerField}>
              <label htmlFor="p-speed" className={s.drawerLabel}>
                زمان (دقیقه)
              </label>
              <input
                id="p-speed"
                type="number"
                className={s.drawerInput}
                value={form.speedMinutes}
                onChange={(e) => setForm((f) => ({ ...f, speedMinutes: e.target.value }))}
                min="0"
                step="5"
                dir="ltr"
              />
            </div>
          </div>

          {/* ترتیب */}
          <div className={s.drawerField}>
            <label htmlFor="p-order" className={s.drawerLabel}>
              ترتیب نمایش
            </label>
            <input
              id="p-order"
              type="number"
              className={s.drawerInput}
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
              min="1"
              max="9999"
              dir="ltr"
            />
            <span className={s.drawerHint}>عدد کمتر = بالاتر در جدول</span>
          </div>

          {/* قابلیت‌ها */}
          <div className={s.drawerField}>
            <p className={s.drawerLabel}>قابلیت‌ها</p>
            <div className={s.featureChips}>
              {TRANSFER_FEATURE_VALUES.map((opt) => {
                const active = form.features.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${s.featureChip} ${active ? s.featureChipActive : ''}`}
                    onClick={() => toggleFeature(opt.value)}
                    aria-pressed={active}
                  >
                    {active ? (
                      <CheckCircle2 className="w-3 h-3" aria-hidden />
                    ) : (
                      <XCircle className="w-3 h-3" style={{ opacity: 0.4 }} aria-hidden />
                    )}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* فعال */}
          <div className={s.drawerCheckRow}>
            <Checkbox
              id="p-active"
              className={s.drawerCheckbox}
              checked={form.active}
              onCheckedChange={(c) => setForm((f) => ({ ...f, active: c === true }))}
            />
            <label
              htmlFor="p-active"
              className={s.drawerCheckLabel}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                setForm((f) => ({ ...f, active: !f.active }));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setForm((f) => ({ ...f, active: !f.active }));
                }
              }}
            >
              فعال (نمایش در سایت)
            </label>
          </div>

          {/* توضیح */}
          <div className={s.drawerField}>
            <label htmlFor="p-desc" className={s.drawerLabel}>
              توضیحات (اختیاری)
            </label>
            <textarea
              id="p-desc"
              className={s.drawerTextarea}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              maxLength={500}
            />
          </div>

          {/* خطا / موفقیت */}
          {error && (
            <div className={s.formError} role="alert">
              <XCircle className="w-4 h-4" aria-hidden /> {error}
            </div>
          )}
          {saved && (
            <output className={s.formSuccess}>
              <CheckCircle2 className="w-4 h-4" aria-hidden /> ذخیره شد
            </output>
          )}
        </form>

        {/* Footer — sticky outside form scroll area */}
        <div className={s.drawerFooter}>
          <button
            type="submit"
            form="provider-form"
            className={s.saveBtn}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Save className="w-4 h-4" aria-hidden />
            )}
            {isPending ? 'در حال ذخیره…' : 'ذخیره'}
          </button>
          <button type="button" onClick={onClose} className={s.cancelBtn}>
            انصراف
          </button>
        </div>
      </dialog>
    </div>
  );
}
