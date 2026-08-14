'use client';

/**
 * ExchangeRatesWorkspace v2 — مدیریت نرخ‌های صرافی در پنل صراف.
 *
 * طراحی ۲۰۲۶ — بنتو asymmetric دو ستونه:
 *   - ستون چپ (1.6fr): پیکربندی نرخ با section های مستقل
 *   - ستون راست (1fr): پیش‌نمایش زنده sticky
 *
 * داده‌ها واقعی از DB؛ هیچ mock / static value ای برای preview نمایش داده نمی‌شود.
 */

import type { ExchangeRow } from '@/actions/exchanges';
import { upsertExchangeProvider } from '@/actions/transfer-providers';
import type { TransferProviderRow } from '@/actions/transfer-providers';
import { Switch } from '@/components/ui/switch';
import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  Percent,
  Save,
  Tag,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import s from './ExchangeRatesWorkspace.module.css';

interface Props {
  exchange: ExchangeRow;
  provider: TransferProviderRow | null;
}

const FEATURE_OPTIONS = [
  { value: 'live-rate', label: 'نرخ لحظه‌ای', Icon: Zap },
  { value: 'fee-transparent', label: 'کارمزد شفاف', Icon: BadgeCheck },
  { value: 'cash-pickup', label: 'دریافت نقدی', Icon: Wallet },
  { value: 'bank-transfer', label: 'انتقال بانکی', Icon: Banknote },
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
    spreadPercent: provider ? String(roundSpread(provider.spreadPercent)) : '0',
    flatFeeToman: provider ? String(provider.flatFeeToman) : '0',
    speedMinutes: provider ? String(provider.speedMinutes) : '30',
    features: (provider?.features ?? ['fee-transparent']) as Feature[],
    active: provider?.active ?? true,
    description: provider?.description ?? '',
  };
}

/** نرخ اسپرد را به حداکثر ۲ رقم اعشار محدود می‌کند (مشکل float دقت). */
function roundSpread(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatDuration(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return 'لحظه‌ای';
  if (min < 60) return `${min} دقیقه`;
  if (min < 60 * 24) return `${Math.round(min / 60)} ساعت`;
  return `${Math.round(min / (60 * 24))} روز`;
}

// Module-level Intl singleton — created once at module load
const _faNum = new Intl.NumberFormat('fa-IR');

function formatNum(n: number): string {
  return _faNum.format(n);
}

/** محاسبه کارمزد برای یک مقدار نمونه (تومان) — بر اساس نرخ واقعی provider */
function calcFeeForAmount(
  amountToman: number,
  spreadPercent: number,
  flatFeeToman: number,
): number {
  const spreadFee = (amountToman * spreadPercent) / 100;
  return spreadFee + flatFeeToman;
}

export default function ExchangeRatesWorkspace({ exchange, provider }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => buildInitial(exchange, provider));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [lastSaved, setLastSaved] = useState<Date | null>(
    provider?.updatedAt ? new Date(provider.updatedAt) : null,
  );
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
        setLastSaved(new Date(res.data.updatedAt));
        router.refresh();
        setTimeout(() => setSaved(false), 4000);
      } else {
        setError(res.error.message);
      }
    });
  }

  // ── محاسبات preview live (مبتنی بر مقادیر فرم) ────────────────────────
  const spread = Number(form.spreadPercent) || 0;
  const flat = Math.round(Number(form.flatFeeToman) || 0);
  const speed = Math.round(Number(form.speedMinutes) || 0);
  // نمونه‌های مختلف برای نمایش دامنه کارمزد — واقعی بر اساس تنظیمات صراف
  const SAMPLES = [
    { label: '۱۰۰ دلار', amountToman: 10_000_000 },
    { label: '۵۰۰ دلار', amountToman: 50_000_000 },
    { label: '۱۰۰۰ دلار', amountToman: 100_000_000 },
  ];

  const isFirstSetup = !provider;
  const hasPendingChanges =
    form.name !== (provider?.name ?? exchange.name) ||
    form.spreadPercent !== (provider ? String(provider.spreadPercent) : '0') ||
    form.flatFeeToman !== (provider ? String(provider.flatFeeToman) : '0') ||
    form.speedMinutes !== (provider ? String(provider.speedMinutes) : '30') ||
    form.active !== (provider?.active ?? true) ||
    form.description !== (provider?.description ?? '');

  return (
    <form onSubmit={handleSubmit} className={s.root}>
      {/* ── اولین راه‌اندازی — banner contextual ───────────────────────── */}
      {isFirstSetup && (
        <div className={s.setupBanner} role="note">
          <ArrowUpRight className={s.setupBannerIcon} aria-hidden />
          <div>
            <p className={s.setupBannerTitle}>اولین راه‌اندازی نرخ‌ها</p>
            <p className={s.setupBannerDesc}>
              پس از ذخیره، نرخ شما در صفحه مقایسه‌ی <strong>/money-transfer</strong> سایت نمایش داده
              می‌شود.
            </p>
          </div>
        </div>
      )}

      {/* ── layout دو ستونه ─────────────────────────────────────────────── */}
      <div className={s.layout}>
        {/* ══ ستون چپ: پیکربندی ═══════════════════════════════════════════ */}
        <div className={s.configCol}>
          {/* ─── بخش ۱: هویت صرافی ────────────────────────────────── */}
          <section className={s.section} aria-labelledby="sec-identity">
            <div className={s.sectionHead}>
              <div className={s.sectionHeadLeft}>
                <span className={s.sectionIcon} data-tone="indigo" aria-hidden>
                  <Tag size={14} />
                </span>
                <h2 id="sec-identity" className={s.sectionTitle}>
                  هویت در سایت
                </h2>
              </div>
              <p className={s.sectionDesc}>نام نمایشی شما در جدول مقایسه مشتریان</p>
            </div>
            <div className={s.sectionBody}>
              <div className={s.field}>
                <label htmlFor="ex-name" className={s.label}>
                  نام نمایشی
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
                  dir="rtl"
                />
                <span id="ex-name-help" className={s.hint}>
                  در جدول مقایسه نرخ به مشتریان نمایش داده می‌شود
                </span>
              </div>
              <div className={s.field}>
                <label htmlFor="ex-desc" className={s.label}>
                  توضیحات <span className={s.labelOptional}>(اختیاری)</span>
                </label>
                <textarea
                  id="ex-desc"
                  className={s.textarea}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  maxLength={500}
                  placeholder="مثال: انتقال سریع به افغانستان، بدون کارمزد پنهان"
                  dir="rtl"
                />
              </div>
            </div>
          </section>

          {/* ─── بخش ۲: تنظیم نرخ ─────────────────────────────────── */}
          <section className={s.section} aria-labelledby="sec-rate">
            <div className={s.sectionHead}>
              <div className={s.sectionHeadLeft}>
                <span className={s.sectionIcon} data-tone="emerald" aria-hidden>
                  <TrendingUp size={14} />
                </span>
                <h2 id="sec-rate" className={s.sectionTitle}>
                  ساختار نرخ
                </h2>
              </div>
              <p className={s.sectionDesc}>Spread روی نرخ بازار + کارمزد ثابت به ازای هر تراکنش</p>
            </div>
            <div className={s.sectionBody}>
              <div className={s.rateGrid}>
                {/* Spread */}
                <div className={s.rateCard}>
                  <div className={s.rateCardTop}>
                    <span className={s.rateCardIcon} aria-hidden>
                      <Percent size={13} />
                    </span>
                    <label htmlFor="ex-spread" className={s.rateCardLabel}>
                      درصد اسپرد
                    </label>
                  </div>
                  <div className={s.rateCardInput}>
                    <input
                      id="ex-spread"
                      type="number"
                      className={s.rateNumInput}
                      value={form.spreadPercent}
                      onChange={(e) => setForm((f) => ({ ...f, spreadPercent: e.target.value }))}
                      min="0"
                      max="50"
                      step="0.01"
                      aria-describedby="ex-spread-help"
                      dir="ltr"
                    />
                    <span className={s.rateUnit}>٪</span>
                  </div>
                  <span id="ex-spread-help" className={s.rateCardHint}>
                    ۰.۷ = ۰.۷٪ بالاتر از نرخ آزاد
                  </span>
                </div>

                {/* کارمزد ثابت */}
                <div className={s.rateCard}>
                  <div className={s.rateCardTop}>
                    <span className={s.rateCardIcon} aria-hidden>
                      <Banknote size={13} />
                    </span>
                    <label htmlFor="ex-fee" className={s.rateCardLabel}>
                      کارمزد ثابت
                    </label>
                  </div>
                  <div className={s.rateCardInput}>
                    <input
                      id="ex-fee"
                      type="number"
                      className={s.rateNumInput}
                      value={form.flatFeeToman}
                      onChange={(e) => setForm((f) => ({ ...f, flatFeeToman: e.target.value }))}
                      min="0"
                      max="10000000"
                      step="1000"
                      aria-describedby="ex-fee-help"
                      dir="ltr"
                    />
                    <span className={s.rateUnit}>تومان</span>
                  </div>
                  <span id="ex-fee-help" className={s.rateCardHint}>
                    ۰ = بدون کارمزد ثابت
                  </span>
                </div>

                {/* زمان انجام */}
                <div className={s.rateCard}>
                  <div className={s.rateCardTop}>
                    <span className={s.rateCardIcon} aria-hidden>
                      <Clock3 size={13} />
                    </span>
                    <label htmlFor="ex-speed" className={s.rateCardLabel}>
                      زمان انجام
                    </label>
                  </div>
                  <div className={s.rateCardInput}>
                    <input
                      id="ex-speed"
                      type="number"
                      className={s.rateNumInput}
                      value={form.speedMinutes}
                      onChange={(e) => setForm((f) => ({ ...f, speedMinutes: e.target.value }))}
                      min="0"
                      step="5"
                      aria-describedby="ex-speed-help"
                      dir="ltr"
                    />
                    <span className={s.rateUnit}>دقیقه</span>
                  </div>
                  <span id="ex-speed-help" className={s.rateCardHint}>
                    {formatDuration(speed)}
                  </span>
                </div>
              </div>

              {/* فرمول بصری */}
              <div className={s.formula} aria-label="فرمول محاسبه کارمزد">
                <span className={s.formulaPart} data-role="base">
                  نرخ بازار
                </span>
                <span className={s.formulaOp} aria-hidden>
                  +
                </span>
                <span className={s.formulaPart} data-role="spread">
                  <span dir="ltr">{spread.toFixed(2)}٪</span>
                  <span className={s.formulaLabel}>اسپرد</span>
                </span>
                <span className={s.formulaOp} aria-hidden>
                  +
                </span>
                <span className={s.formulaPart} data-role="flat">
                  <span dir="ltr">{flat > 0 ? formatNum(flat) : '۰'}</span>
                  <span className={s.formulaLabel}>کارمزد ثابت</span>
                </span>
                <span className={s.formulaOp} aria-hidden>
                  =
                </span>
                <span className={s.formulaPart} data-role="result">
                  نرخ نهایی
                </span>
              </div>
            </div>
          </section>

          {/* ─── بخش ۳: قابلیت‌ها ─────────────────────────────────── */}
          <section className={s.section} aria-labelledby="sec-features">
            <div className={s.sectionHead}>
              <div className={s.sectionHeadLeft}>
                <span className={s.sectionIcon} data-tone="amber" aria-hidden>
                  <BadgeCheck size={14} />
                </span>
                <h2 id="sec-features" className={s.sectionTitle}>
                  قابلیت‌های پشتیبانی‌شده
                </h2>
              </div>
              <p className={s.sectionDesc}>مشتریان این ویژگی‌ها را در پروفایل شما می‌بینند</p>
            </div>
            <div className={s.sectionBody}>
              <div className={s.featureGrid} role="group" aria-label="قابلیت‌های صرافی">
                {FEATURE_OPTIONS.map(({ value, label, Icon }) => {
                  const isActive = form.features.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggle(value)}
                      className={s.featureChip}
                      data-active={isActive ? 'true' : undefined}
                      aria-pressed={isActive}
                    >
                      <span className={s.featureChipIcon} aria-hidden>
                        <Icon size={13} />
                      </span>
                      <span className={s.featureChipLabel}>{label}</span>
                      <span className={s.featureChipCheck} aria-hidden>
                        {isActive ? <CheckCircle2 size={12} /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ─── بخش ۴: وضعیت نمایش ───────────────────────────────── */}
          <section className={s.section} aria-labelledby="sec-visibility">
            <div className={s.visibilityRow}>
              <div className={s.visibilityLeft}>
                <span
                  className={s.sectionIcon}
                  data-tone={form.active ? 'emerald' : 'neutral'}
                  aria-hidden
                >
                  {form.active ? <Eye size={14} /> : <EyeOff size={14} />}
                </span>
                <div>
                  <h2 id="sec-visibility" className={s.sectionTitle}>
                    نمایش در سایت
                  </h2>
                  <p className={s.sectionDesc}>
                    {form.active
                      ? 'نرخ شما در صفحه مقایسه مشتریان نمایش داده می‌شود'
                      : 'نرخ شما از دید مشتریان پنهان است'}
                  </p>
                </div>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(v: boolean) => setForm((f) => ({ ...f, active: v }))}
                aria-labelledby="sec-visibility"
                aria-label={form.active ? 'غیرفعال کردن نمایش' : 'فعال کردن نمایش'}
              />
            </div>
          </section>
        </div>

        {/* ══ ستون راست: پیش‌نمایش زنده ═══════════════════════════════════ */}
        <aside className={s.previewCol} aria-label="پیش‌نمایش زنده">
          <div className={s.previewCard}>
            {/* سربرگ preview */}
            <div className={s.previewCardHead}>
              <span
                className={s.previewLiveDot}
                aria-hidden
                data-active={form.active ? 'true' : undefined}
              />
              <span className={s.previewCardTitle}>پیش‌نمایش در سایت</span>
              <span className={s.previewBadge} data-active={form.active ? 'true' : undefined}>
                {form.active ? 'فعال' : 'غیرفعال'}
              </span>
            </div>

            {/* شبیه‌سازی کارت مشتری */}
            <div className={s.previewMockCard}>
              <div className={s.previewMockHead}>
                <div className={s.previewMockName}>{form.name || exchange.name}</div>
                <div className={s.previewMockType}>صرافی</div>
              </div>

              <div className={s.previewMockStats}>
                <div className={s.previewStat}>
                  <span className={s.previewStatLabel}>اسپرد</span>
                  <span className={s.previewStatValue} dir="ltr">
                    {spread.toFixed(2)}٪
                  </span>
                </div>
                <div className={s.previewStat}>
                  <span className={s.previewStatLabel}>کارمزد</span>
                  <span className={s.previewStatValue} dir="ltr">
                    {flat > 0 ? `${formatNum(flat)} ت` : '—'}
                  </span>
                </div>
                <div className={s.previewStat}>
                  <span className={s.previewStatLabel}>سرعت</span>
                  <span className={s.previewStatValue}>{formatDuration(speed)}</span>
                </div>
              </div>

              {form.features.length > 0 && (
                <div className={s.previewMockFeatures}>
                  {form.features.map((f) => {
                    const opt = FEATURE_OPTIONS.find((o) => o.value === f);
                    return opt ? (
                      <span key={f} className={s.previewMockFeature}>
                        {opt.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              {form.description && <p className={s.previewMockDesc}>{form.description}</p>}
            </div>

            {/* جدول کارمزد بر اساس مبلغ — واقعی و محاسبه‌شده */}
            <div className={s.feeBreakdown}>
              <p className={s.feeBreakdownTitle}>تخمین کارمزد (بر اساس فرض ۱۰۰,۰۰۰ تومان/دلار)</p>
              <div className={s.feeTable}>
                {SAMPLES.map(({ label, amountToman }) => {
                  const fee = calcFeeForAmount(amountToman, spread, flat);
                  const pct = amountToman > 0 ? (fee / amountToman) * 100 : 0;
                  return (
                    <div key={label} className={s.feeRow}>
                      <span className={s.feeRowLabel}>{label}</span>
                      <div className={s.feeRowBar}>
                        <div
                          className={s.feeRowBarFill}
                          style={{ width: `${Math.min(100, pct * 10)}%` }}
                          aria-hidden
                        />
                      </div>
                      <span className={s.feeRowValue} dir="ltr">
                        {formatNum(Math.round(fee))} ت
                      </span>
                      <span className={s.feeRowPct} dir="ltr">
                        {pct.toFixed(2)}٪
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* زمان آخرین ذخیره */}
            {lastSaved && (
              <p className={s.previewLastSaved}>
                آخرین ذخیره:{' '}
                <span dir="ltr">
                  {new Intl.DateTimeFormat('fa-IR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(lastSaved)}
                </span>
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* ── پیام‌های خطا / موفقیت ─────────────────────────────────────────── */}
      {error && (
        <div className={s.errorBanner} role="alert">
          <AlertCircle className={s.bannerIcon} aria-hidden />
          <span>{error}</span>
        </div>
      )}
      {saved && (
        <output className={s.successBanner}>
          <CheckCircle2 className={s.bannerIcon} aria-hidden />
          <span>نرخ‌ها با موفقیت ذخیره شدند و در سایت نمایش داده می‌شوند.</span>
        </output>
      )}

      {/* ── footer: دکمه ذخیره ────────────────────────────────────────────── */}
      <div className={s.footer}>
        <button
          type="submit"
          className={s.saveBtn}
          disabled={isPending}
          aria-busy={isPending}
          data-changed={hasPendingChanges ? 'true' : undefined}
        >
          {isPending ? (
            <Loader2 className={s.saveBtnSpinner} aria-hidden />
          ) : (
            <Save className={s.saveBtnIcon} aria-hidden />
          )}
          <span>{isPending ? 'در حال ذخیره…' : 'ذخیره نرخ‌ها'}</span>
          {hasPendingChanges && !isPending && (
            <span className={s.saveBtnDot} aria-label="تغییرات ذخیره‌نشده" />
          )}
        </button>
        {hasPendingChanges && !isPending && (
          <span className={s.pendingHint}>تغییرات ذخیره‌نشده وجود دارد</span>
        )}
      </div>
    </form>
  );
}
