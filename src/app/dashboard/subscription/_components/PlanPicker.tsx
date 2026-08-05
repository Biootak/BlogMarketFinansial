'use client';

/**
 * PlanPicker — انتخاب و تغییر پلن اشتراک
 *
 * ویژگی‌ها:
 *   - ۳ پلن (FREE / PRO / BUSINESS) با ویژگی‌ها و قیمت
 *   - انتخاب ماهانه/سالانه با تخفیف ۲ ماهه در سالانه
 *   - اعتبارسنجی (پلن فعلی غیرفعال)
 *   - ۳ حالت: idle / confirming / success
 *   - کاملاً ریسپانسیو
 */

import { changePlan } from '@/actions/subscription';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { PLANS, type PlanDefinition } from '@/lib/subscription-plans';
import { cn } from '@/lib/utils';
import { Check, CircleDot, Crown, Loader2, Sparkles, X, Zap } from 'lucide-react';
import { useState, useTransition } from 'react';
import s from './PlanPicker.module.css';

const _faNum = new Intl.NumberFormat('fa-IR');

interface Props {
  currentPlan: string;
  planExpiresAt: string | null;
}

const PLAN_ICONS = {
  free: Zap,
  pro: Sparkles,
  business: Crown,
};

const PLAN_ACCENT = {
  free: 'muted',
  pro: 'brand',
  business: 'gold',
} as const;

function fmtPrice(value: number, currency: string): string {
  if (value === 0) return 'رایگان';
  const num = value / 100;
  // AFN: عدد فارسی + " AFN" بعد از عدد (نه «ف» جلوی عدد)
  if (currency === 'AFN') {
    const formatted = new Intl.NumberFormat('fa-IR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(num);
    return `${formatted} AFN`;
  }
  try {
    return new Intl.NumberFormat('fa-IR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${_faNum.format(num)} ${currency}`;
  }
}

export default function PlanPicker({ currentPlan, planExpiresAt }: Props) {
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<PlanDefinition | null>(null);

  const isExpiringSoon =
    planExpiresAt && new Date(planExpiresAt).getTime() - Date.now() < 14 * 24 * 60 * 60 * 1000;

  function handleSelect(plan: PlanDefinition) {
    if (plan.id === currentPlan) return;
    setConfirming(plan);
  }

  function handleConfirm() {
    if (!confirming) return;
    startTransition(async () => {
      const res = await changePlan({
        planId: confirming.id,
        billingCycle,
        paymentMethod: 'CARD',
      });
      if (!res.success) {
        toast({
          title: 'خطا',
          description: res.error.message,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'پلن با موفقیت تغییر کرد',
        description: `پلن جدید شما: ${confirming.name}`,
      });
      setConfirming(null);
      // Refresh server data
      if (typeof window !== 'undefined') window.location.reload();
    });
  }

  return (
    <div className={s.root}>
      <PageHeader
        variant="minimal"
        title="پلن اشتراک"
        description="پلن فعلی خود را ارتقاء دهید یا تغییر دهید"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'اشتراک' }]}
        icon="credit-card"
        accent="indigo"
      />

      {/* Current plan banner */}
      <div className={s.currentBanner} data-state={currentPlan}>
        <div className={s.currentLeft}>
          <span className={s.currentEyebrow}>پلن فعلی شما</span>
          <h2 className={s.currentName}>
            {PLANS.find((p) => p.id === currentPlan)?.name ?? 'رایگان'}
          </h2>
          {planExpiresAt && (
            <p className={s.currentExpiry}>
              {isExpiringSoon ? 'رو به اتمام — ' : 'انقضا: '}
              {new Date(planExpiresAt).toLocaleDateString('fa-IR')}
            </p>
          )}
        </div>
        {currentPlan !== 'free' && (
          <button
            type="button"
            className={s.downgradeBtn}
            onClick={() => {
              const free = PLANS.find((p) => p.id === 'free');
              if (free) handleSelect(free);
            }}
            disabled={pending}
          >
            بازگشت به پلن رایگان
          </button>
        )}
      </div>

      {/* Billing cycle switcher */}
      <div className={s.cycleSwitch} role="tablist" aria-label="دوره صورتحساب">
        <button
          type="button"
          role="tab"
          aria-selected={billingCycle === 'monthly'}
          className={cn(s.cycleTab, billingCycle === 'monthly' && s.cycleTabActive)}
          onClick={() => setBillingCycle('monthly')}
        >
          ماهانه
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={billingCycle === 'yearly'}
          className={cn(s.cycleTab, billingCycle === 'yearly' && s.cycleTabActive)}
          onClick={() => setBillingCycle('yearly')}
        >
          سالانه
          <span className={s.cycleBadge}>۲ ماه رایگان</span>
        </button>
      </div>

      {/* Plan grid */}
      <div className={s.plansGrid}>
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const Icon = PLAN_ICONS[plan.id];
          const accent = PLAN_ACCENT[plan.id];
          const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
          return (
            <div
              key={plan.id}
              className={cn(
                s.planCard,
                isCurrent && s.planCardCurrent,
                plan.highlight && s.planCardHighlight,
              )}
              data-accent={accent}
              data-state={isCurrent ? 'current' : 'available'}
            >
              {plan.badge && <span className={s.planBadge}>{plan.badge}</span>}
              {isCurrent && <span className={s.planCurrentPill}>پلن فعلی</span>}

              <div className={s.planHead}>
                <span className={s.planIcon} aria-hidden>
                  <Icon size={20} />
                </span>
                <h3 className={s.planName}>{plan.name}</h3>
                <p className={s.planTagline}>{plan.tagline}</p>
              </div>

              <div className={s.planPrice}>
                <span className={s.planPriceValue}>{fmtPrice(price, plan.currency)}</span>
                {price > 0 && (
                  <span className={s.planPriceUnit}>
                    / {billingCycle === 'yearly' ? 'سال' : 'ماه'}
                  </span>
                )}
              </div>

              <ul className={s.featureList} aria-label={`ویژگی‌های ${plan.name}`}>
                {plan.features.map((f) => (
                  <li key={f.text} className={cn(s.featureItem, f.ok ? s.featureOn : s.featureOff)}>
                    <span className={s.featureDot} aria-hidden>
                      {f.ok ? <Check size={11} /> : <X size={11} />}
                    </span>
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={cn(
                  s.planCta,
                  isCurrent && s.planCtaCurrent,
                  plan.highlight && !isCurrent && s.planCtaHighlight,
                )}
                onClick={() => handleSelect(plan)}
                disabled={isCurrent || pending}
                aria-label={isCurrent ? 'پلن فعلی' : `انتخاب پلن ${plan.name}`}
              >
                {isCurrent ? (
                  <>
                    <CircleDot size={14} /> پلن فعال شما
                  </>
                ) : (
                  <>{currentPlan === 'free' || plan.id === 'free' ? 'تغییر پلن' : 'انتخاب پلن'}</>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm modal */}
      {confirming && (
        <dialog
          className={s.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirming(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setConfirming(null);
          }}
          open
          aria-labelledby="confirm-plan-title"
        >
          <div className={s.modal}>
            <header className={s.modalHead}>
              <h3 id="confirm-plan-title">تأیید تغییر پلن</h3>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                aria-label="بستن"
                className={s.modalClose}
              >
                <X size={16} />
              </button>
            </header>
            <div className={s.modalBody}>
              <p className={s.modalDesc}>
                آیا از تغییر پلن به <strong>{confirming.name}</strong> مطمئن هستید؟
              </p>
              <div className={s.modalSummary}>
                <div className={s.modalRow}>
                  <span>پلن مبدأ</span>
                  <span>{PLANS.find((p) => p.id === currentPlan)?.name ?? '—'}</span>
                </div>
                <div className={s.modalRow}>
                  <span>پلن مقصد</span>
                  <span>{confirming.name}</span>
                </div>
                <div className={s.modalRow}>
                  <span>دوره</span>
                  <span>{billingCycle === 'yearly' ? 'سالانه' : 'ماهانه'}</span>
                </div>
                <div className={`${s.modalRow} ${s.modalRowTotal}`}>
                  <span>مبلغ قابل پرداخت</span>
                  <span>
                    {fmtPrice(
                      billingCycle === 'yearly' ? confirming.yearlyPrice : confirming.monthlyPrice,
                      confirming.currency,
                    )}
                  </span>
                </div>
              </div>
            </div>
            <footer className={s.modalFoot}>
              <Button variant="ghost" onClick={() => setConfirming(null)} disabled={pending}>
                انصراف
              </Button>
              <Button onClick={handleConfirm} disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                تأیید و پرداخت
              </Button>
            </footer>
          </div>
        </dialog>
      )}
    </div>
  );
}
