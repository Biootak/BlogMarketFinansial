'use client';

/**
 * ExchangeRatesWorkspace — مدیریت نرخ‌های صرافی در پنل صراف.
 *
 * صراف می‌تواند:
 *   - نرخ spread خود را تنظیم کند
 *   - کارمزد ثابت اعمال کند
 *   - زمان تقریبی انجام حواله را مشخص کند
 *   - نام نمایشی و توضیحات خود را ویرایش کند
 *   - فعال/غیرفعال کردن نمایش در سایت
 *
 * این نرخ‌ها در صفحه عمومی /money-transfer کنار سایر صرافی‌ها نمایش داده می‌شوند.
 */

import type { ExchangeRow } from '@/actions/exchanges';
import { upsertExchangeProvider } from '@/actions/transfer-providers';
import type { TransferProviderRow } from '@/actions/transfer-providers';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Percent,
  Save,
  Tag,
  ToggleLeft,
  ToggleRight,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import s from './ExchangeRatesWorkspace.module.css';

interface Props {
  exchange: ExchangeRow;
  provider: TransferProviderRow | null;
}

const FEATURE_OPTIONS = [
  { value: 'live-rate', label: 'نرخ لحظه‌ای' },
  { value: 'fee-transparent', label: 'کارمزد شفاف' },
  { value: 'cash-pickup', label: 'دریافت نقدی' },
  { value: 'bank-transfer', label: 'انتقال بانکی' },
] as const;

type Feature = 'live-rate' | 'fee-transparent' | 'cash-pickup' | 'bank-transfer';

interface FormState {
  name: string;
  spreadPercent: string;
  flatFeeToman: string;
  speedMinutes: string;
  features: Feature[];
  active: boolean;
  description: string;
}

function buildInitial(exchange: ExchangeRow, provider: TransferProviderRow | null): FormState {
  return {
    name: provider?.name ?? exchange.name,
    spreadPercent: provider ? String(provider.spreadPercent) : '0',
    flatFeeToman: provider ? String(provider.flatFeeToman) : '0',
    speedMinutes: provider ? String(provider.speedMinutes) : '30',
    features: (provider?.features ?? ['fee-transparent']) as Feature[],
    active: provider?.active ?? true,
    description: provider?.description ?? '',
  };
}

export default function ExchangeRatesWorkspace({ exchange, provider }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => buildInitial(exchange, provider));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // آخرین زمان ذخیره — جدا از فرم نگه‌داری می‌شود تا refresh فرم را reset نکند
  const [lastSaved, setLastSaved] = useState<Date | null>(
    provider?.updatedAt ? new Date(provider.updatedAt) : null,
  );
  // اگر exchange تغییر کند (مثلاً navigation)، فرم را reset کن
  const prevExchangeIdRef = useRef(exchange.id);
  useEffect(() => {
    if (prevExchangeIdRef.current !== exchange.id) {
      prevExchangeIdRef.current = exchange.id;
      setForm(buildInitial(exchange, provider));
      setLastSaved(provider?.updatedAt ? new Date(provider.updatedAt) : null);
    }
  }, [exchange, provider]);

  function toggle(feat: Feature) {
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
    setSaved(false);

    const spreadVal = Number(form.spreadPercent);
    const flatVal = Math.round(Number(form.flatFeeToman));
    const speedVal = Math.round(Number(form.speedMinutes));

    if (!Number.isFinite(spreadVal) || spreadVal < 0 || spreadVal > 50) {
      setError('درصد اسپرد باید بین ۰ تا ۵۰ باشد');
      return;
    }
    if (!Number.isFinite(flatVal) || flatVal < 0) {
      setError('کارمزد ثابت نامعتبر است');
      return;
    }
    if (!Number.isFinite(speedVal) || speedVal < 0) {
      setError('زمان انجام نامعتبر است');
      return;
    }

    startTransition(async () => {
      const res = await upsertExchangeProvider(exchange.id, {
        name: form.name.trim() || exchange.name,
        spreadPercent: spreadVal,
        flatFeeToman: flatVal,
        speedMinutes: speedVal,
        features: form.features,
        active: form.active,
        description: form.description.trim() || null,
        logoUrl: null,
      });
      if (res.success) {
        setSaved(true);
        // زمان ذخیره را local آپدیت کن — بدون reset فرم
        setLastSaved(new Date(res.data.updatedAt));
        // cache را invalidate کن تا /money-transfer آپدیت شود
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(res.error.message);
      }
    });
  }

  // محاسبه نمونه: ۱۰۰ دلار
  const spreadEx = (100 * Number(form.spreadPercent || 0)) / 100;
  const flatEx = Math.round(Number(form.flatFeeToman || 0));
  const totalMarkupEx = spreadEx + flatEx / 1000; // تقریبی در مثال ۱۰۰ دلار

  function formatDuration(min: number): string {
    if (!Number.isFinite(min) || min <= 0) return 'لحظه‌ای';
    if (min < 60) return `${min} دقیقه`;
    if (min < 60 * 24) return `${Math.round(min / 60)} ساعت`;
    return `${Math.round(min / (60 * 24))} روز`;
  }

  return (
    <form onSubmit={handleSubmit} className={s.root}>
      {/* Header info */}
      <div className={s.infoCard}>
        <Info className={s.infoIcon} aria-hidden />
        <p className={s.infoText}>
          نرخ‌های زیر در صفحه عمومی <strong>/money-transfer</strong> سایت کنار سایر صرافی‌ها نمایش
          داده می‌شوند. مشتریان می‌توانند نرخ شما را با سایرین مقایسه کنند.
        </p>
      </div>

      {/* Live preview */}
      <div className={s.preview}>
        <div className={s.previewTitle}>
          <BarChart3 className={s.previewIcon} aria-hidden />
          <span>پیش‌نمایش در جدول مقایسه (۱۰۰ دلار)</span>
          <span
            className={`${s.previewBadge} ${form.active ? s.previewBadgeActive : s.previewBadgeOff}`}
          >
            {form.active ? '● فعال' : '○ غیرفعال'}
          </span>
        </div>
        <div className={s.previewRow}>
          <span className={s.previewName}>{form.name || exchange.name}</span>
          <span className={s.previewKind}>صرافی</span>
          <span className={s.previewSpread}>{Number(form.spreadPercent || 0).toFixed(2)}٪</span>
          <span className={s.previewFee}>
            {flatEx > 0 ? `${new Intl.NumberFormat('fa-IR').format(flatEx)} ت` : '—'}
          </span>
          <span className={s.previewTime}>{formatDuration(Number(form.speedMinutes || 0))}</span>
        </div>
        {(spreadEx > 0 || flatEx > 0) && (
          <p className={s.previewNote}>
            برای ۱۰۰ دلار، تفاوت نرخ شما با بازار تقریباً{' '}
            <strong>{totalMarkupEx.toFixed(2)} دلار</strong> است.
          </p>
        )}
      </div>

      {/* Form fields */}
      <div className={s.grid}>
        {/* نام نمایشی */}
        <div className={s.field}>
          <label htmlFor="ex-name" className={s.label}>
            <Tag className={s.labelIcon} aria-hidden />
            نام نمایشی در سایت
          </label>
          <input
            id="ex-name"
            type="text"
            className={s.input}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={exchange.name}
            maxLength={100}
            aria-describedby="ex-name-help"
          />
          <span id="ex-name-help" className={s.hint}>
            این نام در جدول مقایسه نرخ به مشتریان نمایش داده می‌شود.
          </span>
        </div>

        {/* درصد اسپرد */}
        <div className={s.field}>
          <label htmlFor="ex-spread" className={s.label}>
            <Percent className={s.labelIcon} aria-hidden />
            درصد اسپرد (markup روی نرخ بازار)
          </label>
          <div className={s.inputWithSuffix}>
            <input
              id="ex-spread"
              type="number"
              className={s.input}
              value={form.spreadPercent}
              onChange={(e) => setForm((f) => ({ ...f, spreadPercent: e.target.value }))}
              min="0"
              max="50"
              step="0.01"
              aria-describedby="ex-spread-help"
            />
            <span className={s.suffix}>٪</span>
          </div>
          <span id="ex-spread-help" className={s.hint}>
            مثال: ۰.۷ یعنی ۰.۷٪ بالاتر از نرخ بازار آزاد.
          </span>
        </div>

        {/* کارمزد ثابت */}
        <div className={s.field}>
          <label htmlFor="ex-fee" className={s.label}>
            <Wallet className={s.labelIcon} aria-hidden />
            کارمزد ثابت (تومان)
          </label>
          <div className={s.inputWithSuffix}>
            <input
              id="ex-fee"
              type="number"
              className={s.input}
              value={form.flatFeeToman}
              onChange={(e) => setForm((f) => ({ ...f, flatFeeToman: e.target.value }))}
              min="0"
              max="10000000"
              step="1000"
              aria-describedby="ex-fee-help"
            />
            <span className={s.suffix}>تومان</span>
          </div>
          <span id="ex-fee-help" className={s.hint}>
            کارمزد ثابت به ازای هر تراکنش — اگر ندارید عدد ۰ وارد کنید.
          </span>
        </div>

        {/* زمان انجام */}
        <div className={s.field}>
          <label htmlFor="ex-speed" className={s.label}>
            <Clock className={s.labelIcon} aria-hidden />
            زمان تقریبی انجام (دقیقه)
          </label>
          <div className={s.inputWithSuffix}>
            <input
              id="ex-speed"
              type="number"
              className={s.input}
              value={form.speedMinutes}
              onChange={(e) => setForm((f) => ({ ...f, speedMinutes: e.target.value }))}
              min="0"
              step="5"
              aria-describedby="ex-speed-help"
            />
            <span className={s.suffix}>{formatDuration(Number(form.speedMinutes || 0))}</span>
          </div>
          <span id="ex-speed-help" className={s.hint}>
            ۰ = لحظه‌ای · ۳۰ = نیم ساعت · ۱۴۴۰ = ۱ روز
          </span>
        </div>
      </div>

      {/* توضیحات */}
      <div className={s.field}>
        <label htmlFor="ex-desc" className={s.label}>
          توضیحات (اختیاری)
        </label>
        <textarea
          id="ex-desc"
          className={s.textarea}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          maxLength={500}
          placeholder="مثال: انتقال سریع به افغانستان، بدون کارمزد پنهان"
        />
      </div>

      {/* قابلیت‌ها */}
      <div className={s.featuresSection}>
        <p className={s.featuresTitle}>قابلیت‌های پشتیبانی‌شده</p>
        <div className={s.features}>
          {FEATURE_OPTIONS.map((opt) => {
            const active = form.features.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`${s.featureChip} ${active ? s.featureChipActive : ''}`}
                aria-pressed={active}
              >
                {active ? (
                  <CheckCircle2 className={s.featureIcon} aria-hidden />
                ) : (
                  <XCircle className={s.featureIconOff} aria-hidden />
                )}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* وضعیت نمایش */}
      <div className={s.toggleRow}>
        <div>
          <p className={s.toggleLabel}>نمایش در جدول مقایسه سایت</p>
          <p className={s.toggleHint}>اگر غیرفعال باشد، نرخ شما در صفحه عمومی نشان داده نمی‌شود.</p>
        </div>
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
          className={s.toggleBtn}
          aria-label={form.active ? 'غیرفعال کردن نمایش' : 'فعال کردن نمایش'}
          aria-pressed={form.active}
        >
          {form.active ? (
            <ToggleRight className={s.toggleIconOn} aria-hidden />
          ) : (
            <ToggleLeft className={s.toggleIconOff} aria-hidden />
          )}
          <span className={form.active ? s.toggleTextOn : s.toggleTextOff}>
            {form.active ? 'فعال' : 'غیرفعال'}
          </span>
        </button>
      </div>

      {/* خطا */}
      {error && (
        <div className={s.errorBanner} role="alert">
          <XCircle className={s.errorIcon} aria-hidden />
          {error}
        </div>
      )}

      {/* موفقیت */}
      {saved && (
        <output className={s.successBanner}>
          <CheckCircle2 className={s.successIcon} aria-hidden />
          نرخ‌ها با موفقیت ذخیره شدند و در سایت نمایش داده می‌شوند.
        </output>
      )}

      {/* ذخیره */}
      <div className={s.footer}>
        <button type="submit" className={s.saveBtn} disabled={isPending} aria-busy={isPending}>
          {isPending ? (
            <Loader2 className={s.saveBtnSpinner} aria-hidden />
          ) : (
            <Save className={s.saveBtnIcon} aria-hidden />
          )}
          {isPending ? 'در حال ذخیره…' : 'ذخیره نرخ‌ها'}
        </button>
        {lastSaved && (
          <p className={s.lastUpdate}>
            آخرین ذخیره:{' '}
            {new Intl.DateTimeFormat('fa-IR', {
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(lastSaved)}
          </p>
        )}
      </div>
    </form>
  );
}
