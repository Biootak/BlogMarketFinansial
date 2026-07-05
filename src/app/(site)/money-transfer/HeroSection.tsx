'use client';

/**
 * MoneyTransferHero — Vercel-inspired minimal bold hero.
 *
 * Design intent:
 * - One message, one primary CTA, one secondary.
 * - Big fluid type (clamp), no heavy gradients — restrained aurora.
 * - Dark surface with subtle dotted grid for terminal/precision feel.
 * - Bottom strip with 4 key stats — establishes trust immediately.
 *
 * 2026-07-05: rewritten from scratch (was: gradient-heavy Vercel-clone).
 */

import { useDirection } from '@/hooks/useDirection';
import { ArrowDown, Sparkles } from 'lucide-react';

export default function MoneyTransferHero() {
  // RTL-safe: useDirection returns 'rtl' for this site
  const dir = useDirection('rtl');

  return (
    <section
      dir={dir}
      className="px-3 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-4 lg:px-6 lg:pt-5 lg:pb-5"
    >
      <div className="container-wide">
        <div className="mt-hero">
          {/* Aurora blobs — restrained, slow drift */}
          <div className="mt-hero__aurora mt-hero__aurora--a" aria-hidden />
          <div className="mt-hero__aurora mt-hero__aurora--b" aria-hidden />

          {/* Content */}
          <div className="relative z-10 px-5 py-12 sm:px-8 sm:py-14 lg:px-12 lg:py-20">
            <div className="max-w-3xl">
              {/* Live indicator */}
              <div className="mt-hero__live mb-6 sm:mb-8">
                <span className="mt-hero__live-dot" aria-hidden />
                <span>صرافی آنلاین — نرخ‌های زنده</span>
              </div>

              {/* Title */}
              <h1 className="mt-hero__title mb-5 sm:mb-6">
                انتقال ارز،{' '}
                <span className="mt-hero__title-accent">ساده و مطمئن</span>
              </h1>

              {/* Lead */}
              <p className="mt-hero__lead mb-7 sm:mb-9">
                نرخ‌های رقابتی، تسویه سریع، و پشتیبانی واقعی. حواله ارزی به بیش از
                ۵۰ کشور، بدون پیچیدگی.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3">
                <a href="#rates" className="mt-cta mt-cta--primary">
                  <span>مشاهده نرخ‌ها</span>
                  <ArrowDown className="w-4 h-4" aria-hidden />
                </a>
                <a href="#contact" className="mt-cta mt-cta--ghost">
                  <Sparkles className="w-4 h-4" aria-hidden />
                  <span>ثبت درخواست</span>
                </a>
              </div>
            </div>

            {/* Trust stats strip — sits at bottom of hero */}
            <div className="mt-hero__stats mt-8 sm:mt-10 lg:mt-14">
              <div className="mt-hero__stat">
                <span className="mt-hero__stat-num">۵۰+</span>
                <span className="mt-hero__stat-label">کشور مقصد</span>
              </div>
              <div className="mt-hero__stat">
                <span className="mt-hero__stat-num">۲۴/۷</span>
                <span className="mt-hero__stat-label">پشتیبانی آنلاین</span>
              </div>
              <div className="mt-hero__stat">
                <span className="mt-hero__stat-num">&lt;۳۰m</span>
                <span className="mt-hero__stat-label">پاسخ‌گویی اولیه</span>
              </div>
              <div className="mt-hero__stat">
                <span className="mt-hero__stat-num">۰.۴٪</span>
                <span className="mt-hero__stat-label">کارمزد میانگین</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}