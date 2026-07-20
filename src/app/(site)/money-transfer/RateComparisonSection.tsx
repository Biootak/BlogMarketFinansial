'use client';

/**
 * RateComparisonSection — Provider Quote Comparison (real-time)
 * ----------------------------------------------------------------------------
 * Single most important decision-support block on /money-transfer after the
 * HeroConverter. Shows the user the same `100 USD → IRT` quoted by 7 different
 * providers (TGJU market-mid, Wise, Remitly, crypto, bank, etc.) so they can
 * pick the cheapest route at a glance.
 *
 * Design intent (2026 — Stripe × Wise × Linear):
 *  - Sits in its own `container` section, NOT inside the dark hero surface —
 *    the comparison is a "decision" tool, the hero is an "impression" tool.
 *    Two different emotional beats → two different surfaces.
 *  - Eyebrow + title + sub use the same vocabulary as `mt-section-title` and
 *    `mt-section-lead` defined in globals.css so the page reads as one piece.
 *  - Internal state (defaultSymbol/defaultAmount) starts with USD/100 — most
 *    Persian users ask "100 دلار چند تومان" first. The converter above stays
 *    the primary input; this section reflects whatever the API reports.
 *  - Uses the live `/api/money-transfer/rates` endpoint (60s cache) — same
 *    data layer as the MoneyTransfer components, so the project is one piece.
 */

import RateComparisonTable from '@/components/MoneyTransfer/RateComparisonTable';
import { Sparkles } from 'lucide-react';

export default function RateComparisonSection() {
  return (
    <div>
      <header className="mb-5 sm:mb-6">
        <span className="mt-eyebrow mt-eyebrow--emerald">
          <Sparkles className="w-3 h-3" aria-hidden />
          مقایسه real-time
        </span>
        <h2 id="mt-compare-title" className="mt-section-title mt-3">
          بهترین قیمت تبدیل ارز، در یک نگاه
        </h2>
        <p className="mt-section-lead mt-2">
          هفت صرافی و سرویس آنلاین برای یک مبلغ یکسان چه قیمتی می‌دهند؟ جدول زیر هر ۶۰ ثانیه از منابع
          زنده (TGJU، USDT/Exir، FX) به‌روز می‌شود — کارمزد ضمنی و ثابت کنار مبلغ نهایی، کاملاً شفاف.
        </p>
      </header>

      <RateComparisonTable defaultSymbol="USD" defaultAmount={100} />
    </div>
  );
}
