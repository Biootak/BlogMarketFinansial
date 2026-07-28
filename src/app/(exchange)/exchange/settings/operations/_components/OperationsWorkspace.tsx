'use client';

/**
 * OperationsWorkspace — فرم تنظیمات عملیاتی.
 *
 *   شامل:
 *   - SettingsSurfaceCard «KYC»: requireKyc toggle + licenseNo + توضیح
 *   - SettingsSurfaceCard «سقف تراکنش»: dailyLimitAf slider + input
 *   - SettingsSurfaceCard «کارمزد و ارز»: platformFee + primaryCurrency + allowedCurrencies (chips)
 *   - SettingsSurfaceCard «پیشنهاد و مقایسه»: quoteAutoExpireMin + showInComparison
 */

import { SettingsField, SettingsSurfaceCard, StickySaveBar } from '@/components/Dashboard/primitives';
import { type ExchangeRow, updateExchangeSelf } from '@/actions/exchanges';
import {
  Banknote,
  CircleDollarSign,
  Eye,
  Hourglass,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import s from './OperationsWorkspace.module.css';

const KNOWN_CURRENCIES = [
  { code: 'AFN', label: 'افغانی' },
  { code: 'USD', label: 'دلار' },
  { code: 'EUR', label: 'یورو' },
  { code: 'IRR', label: 'ریال' },
  { code: 'PKR', label: 'روپیه' },
  { code: 'AED', label: 'درهم' },
  { code: 'SAR', label: 'ریال سعودی' },
  { code: 'CNY', label: 'یوان' },
  { code: 'TRY', label: 'لیر' },
  { code: 'GBP', label: 'پوند' },
];

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

type Props = { exchange: ExchangeRow; canEdit: boolean };

export default function OperationsWorkspace({ exchange, canEdit }: Props) {
  const router = useRouter();

  // ── state ─────────────────────────────────────────────────────────
  const [requireKyc, setRequireKyc] = useState(exchange.requireKyc);
  const [licenseNo, setLicenseNo] = useState(exchange.licenseNo ?? '');
  const [dailyLimit, setDailyLimit] = useState(exchange.dailyLimitAf);
  const [platformFee, setPlatformFee] = useState(exchange.platformFee);
  const [primaryCurrency, setPrimaryCurrency] = useState(exchange.primaryCurrency);
  const [allowedCurrencies, setAllowedCurrencies] = useState<string[]>(exchange.allowedCurrencies);
  const [quoteAutoExpireMin, setQuoteAutoExpireMin] = useState(exchange.quoteAutoExpireMin);
  const [showInComparison, setShowInComparison] = useState(exchange.showInComparison);
  const [newCurrency, setNewCurrency] = useState('');

  // ── initial snapshot for dirty tracking ──────────────────────────
  const initial = useRef({
    requireKyc: exchange.requireKyc,
    licenseNo: exchange.licenseNo ?? '',
    dailyLimit: exchange.dailyLimitAf,
    platformFee: exchange.platformFee,
    primaryCurrency: exchange.primaryCurrency,
    allowedCurrencies: exchange.allowedCurrencies,
    quoteAutoExpireMin: exchange.quoteAutoExpireMin,
    showInComparison: exchange.showInComparison,
  });

  // ── dirty tracking ───────────────────────────────────────────────
  const dirtyCount = useMemo(() => {
    let n = 0;
    if (requireKyc !== initial.current.requireKyc) n++;
    if (licenseNo.trim() !== initial.current.licenseNo.trim()) n++;
    if (dailyLimit !== initial.current.dailyLimit) n++;
    if (platformFee !== initial.current.platformFee) n++;
    if (primaryCurrency !== initial.current.primaryCurrency) n++;
    if (JSON.stringify(allowedCurrencies) !== JSON.stringify(initial.current.allowedCurrencies)) n++;
    if (quoteAutoExpireMin !== initial.current.quoteAutoExpireMin) n++;
    if (showInComparison !== initial.current.showInComparison) n++;
    return n;
  }, [
    requireKyc,
    licenseNo,
    dailyLimit,
    platformFee,
    primaryCurrency,
    allowedCurrencies,
    quoteAutoExpireMin,
    showInComparison,
  ]);

  // ── save flow ────────────────────────────────────────────────────
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = () => {
    if (!canEdit) return;
    setErrorMessage(null);

    if (licenseNo.length > 60) {
      setStatus('error');
      setErrorMessage('شماره مجوز نباید بیش از ۶۰ کاراکتر باشد');
      return;
    }
    if (dailyLimit < 0 || dailyLimit > 1_000_000_000) {
      setStatus('error');
      setErrorMessage('سقف تراکنش نامعتبر است');
      return;
    }
    if (platformFee < 0 || platformFee > 100) {
      setStatus('error');
      setErrorMessage('کارمزد باید بین ۰ تا ۱۰۰ درصد باشد');
      return;
    }
    if (quoteAutoExpireMin < 5 || quoteAutoExpireMin > 1440) {
      setStatus('error');
      setErrorMessage('مدت اعتبار quote باید بین ۵ دقیقه تا ۲۴ ساعت باشد');
      return;
    }
    if (!allowedCurrencies.includes(primaryCurrency)) {
      setStatus('error');
      setErrorMessage('ارز پایه باید در لیست ارزهای مجاز باشد');
      return;
    }

    setStatus('saving');
    void (async () => {
      const res = await updateExchangeSelf(exchange.id, {
        requireKyc,
        licenseNo: licenseNo.trim() || null,
        dailyLimitAf: dailyLimit,
        platformFee,
        primaryCurrency,
        allowedCurrencies,
        quoteAutoExpireMin,
        showInComparison,
      });

      if (res.success) {
        initial.current = {
          requireKyc,
          licenseNo,
          dailyLimit,
          platformFee,
          primaryCurrency,
          allowedCurrencies,
          quoteAutoExpireMin,
          showInComparison,
        };
        setStatus('saved');
        router.refresh();
      } else {
        setStatus('error');
        setErrorMessage(res.error.message);
      }
    })();
  };

  const reset = () => {
    setRequireKyc(initial.current.requireKyc);
    setLicenseNo(initial.current.licenseNo);
    setDailyLimit(initial.current.dailyLimit);
    setPlatformFee(initial.current.platformFee);
    setPrimaryCurrency(initial.current.primaryCurrency);
    setAllowedCurrencies(initial.current.allowedCurrencies);
    setQuoteAutoExpireMin(initial.current.quoteAutoExpireMin);
    setShowInComparison(initial.current.showInComparison);
    setStatus('idle');
    setErrorMessage(null);
  };

  if (status === 'idle' && dirtyCount > 0 && canEdit) {
    setStatus('dirty');
  }

  const addCurrency = (code: string) => {
    const c = code.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(c)) return;
    if (allowedCurrencies.includes(c)) return;
    if (allowedCurrencies.length >= 20) return;
    setAllowedCurrencies((p) => [...p, c]);
    setNewCurrency('');
  };

  const removeCurrency = (code: string) => {
    if (code === primaryCurrency) return; // نمی‌توان ارز پایه را حذف کرد
    setAllowedCurrencies((p) => p.filter((c) => c !== code));
  };

  return (
    <>
      <div className={s.root}>
        {/* ── 1. KYC & License ───────────────────────────────────── */}
        <SettingsSurfaceCard
          id="operations-kyc"
          title="احراز هویت و مجوز"
          description="سطح اعتماد و شماره مجوز رسمی صرافی"
          icon={ShieldCheck}
          tone="accent"
        >
          <div className={s.grid2}>
            <SettingsField
              label="نیاز به احراز هویت مشتریان"
              hint="اگر فعال باشد، مشتری قبل از اولین تراکنش باید KYC را تکمیل کند"
              tag={{ label: 'پیشنهادی', tone: 'recommended' }}
              layout="inline"
              span="full"
            >
              <button
                type="button"
                role="switch"
                aria-checked={requireKyc}
                disabled={!canEdit}
                onClick={() => setRequireKyc((v) => !v)}
                className={`${s.bigToggle} ${requireKyc ? s.bigToggleOn : s.bigToggleOff}`}
              >
                <span className={s.bigToggleDot} aria-hidden />
                <span className={s.bigToggleLabel}>
                  {requireKyc ? 'الزامی — همه مشتریان احراز هویت شوند' : 'غیرفعال — مشتریان بدون KYC می‌توانند تراکنش کنند'}
                </span>
              </button>
            </SettingsField>

            <SettingsField
              label="شماره مجوز"
              hint="شماره ثبت رسمی صرافی (در صورت وجود)"
              span={1}
            >
              <input
                className={`${s.input} ${s.inputLtr}`}
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
                disabled={!canEdit}
                maxLength={60}
                placeholder="EX-1405-12345"
                aria-label="شماره مجوز"
              />
            </SettingsField>

            <SettingsField
              label="شناسه صرافی"
              hint="شناسه داخلی سیستم"
              span={1}
            >
              <input
                className={`${s.input} ${s.inputLtr} ${s.inputReadonly}`}
                value={exchange.id}
                readOnly
                aria-label="شناسه صرافی"
              />
            </SettingsField>
          </div>
        </SettingsSurfaceCard>

        {/* ── 2. Transaction limits ──────────────────────────────── */}
        <SettingsSurfaceCard
          id="operations-limits"
          title="سقف تراکنش"
          description="حداکثر مبلغ قابل تراکنش در روز برای هر مشتری"
          icon={Banknote}
          tone="gold"
        >
          <div className={s.limitHero}>
            <div className={s.limitDisplay}>
              <span className={s.limitAmount}>
                {new Intl.NumberFormat('fa-IR').format(dailyLimit)}
              </span>
              <span className={s.limitUnit}>{primaryCurrency} / روز</span>
            </div>
            <div className={s.limitProgress}>
              <div
                className={s.limitProgressBar}
                style={{
                  width: `${Math.min(100, (dailyLimit / 1_000_000) * 100)}%`,
                }}
                aria-hidden
              />
            </div>
          </div>

          <div className={s.grid2}>
            <SettingsField
              label="مقدار دقیق (افغانی)"
              hint="مقدار را می‌توانید به‌صورت دستی وارد کنید"
              span={1}
            >
              <input
                className={`${s.input} ${s.inputLtr} ${s.inputPadUnit}`}
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Math.max(0, Number(e.target.value) || 0))}
                disabled={!canEdit}
                min={0}
                max={1_000_000_000}
                step={10_000}
                aria-label="سقف تراکنش"
              />
            </SettingsField>
            <SettingsField
              label="تنظیم سریع"
              hint="با اسلایدر مقدار را به سرعت تغییر دهید"
              span={1}
            >
              <input
                className={s.slider}
                type="range"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                disabled={!canEdit}
                min={0}
                max={1_000_000}
                step={10_000}
                aria-label="تنظیم سریع سقف تراکنش"
              />
            </SettingsField>
          </div>

          <div className={s.presetRow}>
            <span className={s.presetLabel}>پیش‌تنظیم:</span>
            {[100_000, 500_000, 1_000_000, 5_000_000].map((v) => (
              <button
                key={v}
                type="button"
                className={`${s.presetChip} ${dailyLimit === v ? s.presetChipActive : ''}`}
                onClick={() => setDailyLimit(v)}
                disabled={!canEdit}
              >
                {new Intl.NumberFormat('fa-IR').format(v)}
              </button>
            ))}
          </div>
        </SettingsSurfaceCard>

        {/* ── 3. Fees & Currencies ───────────────────────────────── */}
        <SettingsSurfaceCard
          id="operations-fees"
          title="کارمزد و ارز"
          description="کارمزد پلتفرم، ارز پایه و لیست ارزهای قابل معامله"
          icon={Receipt}
          tone="violet"
        >
          <div className={s.grid2}>
            <SettingsField
              label="کارمزد پلتفرم"
              hint="درصد از هر تراکنش که به پلتفرم تعلق می‌گیرد"
              tag={{ label: '٪', tone: 'optional' }}
              span={1}
            >
              <div className={s.percentInputWrap}>
                <input
                  className={`${s.input} ${s.inputLtr} ${s.inputPadUnit}`}
                  type="number"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  disabled={!canEdit}
                  min={0}
                  max={100}
                  step={0.1}
                  aria-label="کارمزد پلتفرم"
                />
                <span className={s.percentSign}>٪</span>
              </div>
            </SettingsField>

            <SettingsField
              label="ارز پایه"
              hint="ارز اصلی محاسبات آماری"
              span={1}
            >
              <select
                className={`${s.input} ${s.inputLtr}`}
                value={primaryCurrency}
                onChange={(e) => setPrimaryCurrency(e.target.value)}
                disabled={!canEdit}
                aria-label="ارز پایه"
              >
                {KNOWN_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.label}
                  </option>
                ))}
                {!KNOWN_CURRENCIES.some((c) => c.code === primaryCurrency) && (
                  <option value={primaryCurrency}>{primaryCurrency}</option>
                )}
              </select>
            </SettingsField>
          </div>

          {/* Currencies chips */}
          <div className={s.currenciesBox}>
            <div className={s.currenciesHead}>
              <span className={s.currenciesTitle}>
                <CircleDollarSign size={13} strokeWidth={1.85} aria-hidden />
                ارزهای قابل معامله
              </span>
              <span className={s.currenciesCount}>
                {new Intl.NumberFormat('fa-IR').format(allowedCurrencies.length)} ارز
              </span>
            </div>

            <div className={s.chips}>
              {allowedCurrencies.map((code) => {
                const known = KNOWN_CURRENCIES.find((c) => c.code === code);
                const isBase = code === primaryCurrency;
                return (
                  <span
                    key={code}
                    className={`${s.chip} ${isBase ? s.chipBase : ''}`}
                  >
                    <span className={s.chipCode}>{code}</span>
                    {known && <span className={s.chipLabel}>{known.label}</span>}
                    {isBase && <span className={s.chipTag}>پایه</span>}
                    {!isBase && canEdit && (
                      <button
                        type="button"
                        className={s.chipX}
                        onClick={() => removeCurrency(code)}
                        aria-label={`حذف ${code}`}
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    )}
                  </span>
                );
              })}
              {canEdit && (
                <form
                  className={s.chipAdd}
                  onSubmit={(e) => {
                    e.preventDefault();
                    addCurrency(newCurrency);
                  }}
                >
                  <Plus size={12} aria-hidden />
                  <input
                    type="text"
                    className={s.chipAddInput}
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value.toUpperCase().slice(0, 3))}
                    placeholder="USD"
                    maxLength={3}
                    aria-label="افزودن ارز"
                  />
                </form>
              )}
            </div>
          </div>
        </SettingsSurfaceCard>

        {/* ── 4. Quote & Visibility ──────────────────────────────── */}
        <SettingsSurfaceCard
          id="operations-quote"
          title="پیشنهاد قیمت و نمایش"
          description="مدت اعتبار quote و نمایش در جدول مقایسه"
          icon={Hourglass}
          tone="info"
        >
          <div className={s.grid2}>
            <SettingsField
              label="مدت اعتبار quote"
              hint="قیمت پیشنهادی چند دقیقه معتبر بماند"
              tag={{ label: 'دقیقه', tone: 'optional' }}
              span={1}
            >
              <div className={s.percentInputWrap}>
                <input
                  className={`${s.input} ${s.inputLtr} ${s.inputPadUnit}`}
                  type="number"
                  value={quoteAutoExpireMin}
                  onChange={(e) => setQuoteAutoExpireMin(Math.max(5, Math.min(1440, Number(e.target.value) || 0)))}
                  disabled={!canEdit}
                  min={5}
                  max={1440}
                  step={5}
                  aria-label="مدت اعتبار quote"
                />
                <span className={s.percentSign}>دقیقه</span>
              </div>
            </SettingsField>

            <SettingsField
              label="نمایش در مقایسه"
              hint="نمایش صرافی در جدول مقایسهٔ money-transfer"
              tag={{ label: 'قابل فهرست', tone: 'recommended' }}
              layout="inline"
              span={1}
            >
              <button
                type="button"
                role="switch"
                aria-checked={showInComparison}
                disabled={!canEdit}
                onClick={() => setShowInComparison((v) => !v)}
                className={`${s.smallToggle} ${showInComparison ? s.smallToggleOn : s.smallToggleOff}`}
              >
                <span className={s.smallToggleThumb} aria-hidden />
                <span className={s.smallToggleLabel}>
                  {showInComparison ? 'نمایش داده می‌شود' : 'پنهان است'}
                </span>
              </button>
            </SettingsField>

            <SettingsField
              label="پیش‌نمایش عمومی"
              hint="پیوند صفحهٔ عمومی صرافی"
              span="full"
            >
              <a
                href={`/exchanges/${exchange.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={s.previewLink}
              >
                <Eye size={12} aria-hidden />
                <span dir="ltr">/exchanges/{exchange.slug}</span>
                <Sparkles size={11} className={s.previewSparkle} aria-hidden />
              </a>
            </SettingsField>
          </div>
        </SettingsSurfaceCard>
      </div>

      {canEdit && (
        <StickySaveBar
          status={status}
          dirtyCount={dirtyCount}
          errorMessage={errorMessage}
          onSave={handleSave}
          onDiscard={reset}
        />
      )}
    </>
  );
}
