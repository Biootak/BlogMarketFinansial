/**
 * /exchanges — صفحه عمومی مقایسه صرافی‌ها
 *
 * Server Component با revalidate هر ۶۰ ثانیه.
 * نمایش همه صرافی‌های active با نرخ‌های فعال‌شان.
 */

import type { Metadata } from 'next';
import prisma from '@/lib/db';
import ExchangeQuotesBoard from '@/components/MoneyTransfer/ExchangeQuotesBoard';
import ScrollReveal from '@/app/(site)/money-transfer/ScrollReveal';
import { Building2, TrendingUp, Users, Zap } from 'lucide-react';
import s from './exchanges.module.css';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'مقایسه صرافی‌ها | بهترین نرخ ارز',
  description:
    'مقایسه نرخ خرید و فروش ارز از صرافی‌های تأییدشده — USD، EUR، AED، GBP و بیشتر. نرخ‌ها هر ۶۰ ثانیه به‌روز می‌شوند.',
  openGraph: {
    title: 'مقایسه صرافی‌ها | بهترین نرخ ارز',
    description: 'نرخ خرید و فروش ارز از صرافی‌های تأییدشده در یک نگاه',
    type: 'website',
  },
};

async function getExchangesData() {
  const exchanges = await prisma.exchange.findMany({
    where: { status: 'ACTIVE', showInComparison: true },
    include: {
      ExchangeRateQuote: {
        where: { status: 'ACTIVE' },
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return exchanges;
}

const CURRENCY_NAMES: Record<string, string> = {
  USD: 'دلار آمریکا',
  EUR: 'یورو',
  AED: 'درهم امارات',
  GBP: 'پوند انگلیس',
  AFN: 'افغانی',
  TRY: 'لیر ترکیه',
  SAR: 'ریال عربستان',
  CAD: 'دلار کانادا',
  AUD: 'دلار استرالیا',
  CHF: 'فرانک سوئیس',
  JPY: 'ین ژاپن',
  CNY: 'یوان چین',
};

export default async function ExchangesPage() {
  const exchanges = await getExchangesData();

  const totalQuotes = exchanges.reduce((sum, e) => sum + e.ExchangeRateQuote.length, 0);

  return (
    <main className={s.page} dir="rtl">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className={s.hero} aria-label="مقایسه صرافی‌ها">
        <div className={s.heroAmbient} aria-hidden />
        <div className={s.heroHairline} aria-hidden />
        <div className={s.heroInner}>
          <div className={s.badge}>
            <span className={s.badgeDot} aria-hidden />
            <Building2 size={11} strokeWidth={2} aria-hidden />
            صرافی‌های تأییدشده
          </div>
          <h1 className={s.headline}>مقایسه نرخ صرافی‌ها</h1>
          <p className={s.sub}>
            نرخ‌های خرید و فروش ارز از صرافی‌های تأییدشده — به‌روز هر ۶۰ ثانیه
          </p>

          {/* Stats strip */}
          <div className={s.stats} aria-label="آمار سریع">
            <div className={s.stat}>
              <span className={s.statNum}>
                {new Intl.NumberFormat('fa-IR').format(exchanges.length)}
              </span>
              <span className={s.statLabel}>صرافی فعال</span>
            </div>
            <div className={s.statDivider} aria-hidden />
            <div className={s.stat}>
              <span className={s.statNum}>
                {new Intl.NumberFormat('fa-IR').format(totalQuotes)}
              </span>
              <span className={s.statLabel}>نرخ ثبت‌شده</span>
            </div>
            <div className={s.statDivider} aria-hidden />
            <div className={s.stat}>
              <span className={s.statNum}>۲۴/۷</span>
              <span className={s.statLabel}>به‌روزرسانی</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Comparison Board ─────────────────────────────────────────── */}
      <section className={s.section} aria-label="تابلوی نرخ‌ها">
        <div className={s.sectionInner}>
          <ScrollReveal>
            <div className={s.sectionHeader}>
              <div className={s.eyebrow}>
                <TrendingUp size={12} strokeWidth={2} aria-hidden />
                نرخ لحظه‌ای
              </div>
              <h2 className={s.sectionTitle}>نرخ خرید و فروش صرافی‌ها</h2>
              <p className={s.sectionSub}>
                قیمت‌ها مستقیماً توسط صرافی‌های تأییدشده ثبت می‌شوند و هر ۳۰ ثانیه به‌روز می‌گردند.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <ExchangeQuotesBoard />
          </ScrollReveal>
        </div>
      </section>

      {/* ── Exchange Cards ─────────────────────────────────────────────────── */}
      {exchanges.length > 0 && (
        <section className={s.section} aria-label="اطلاعات صرافی‌ها">
          <div className={s.sectionInner}>
            <ScrollReveal>
              <div className={s.sectionHeader}>
                <div className={s.eyebrow}>
                  <Users size={12} strokeWidth={2} aria-hidden />
                  صرافی‌های عضو
                </div>
                <h2 className={s.sectionTitle}>صرافی‌های تأییدشده</h2>
              </div>
            </ScrollReveal>

            <div className={s.grid} role="list" aria-label="لیست صرافی‌ها">
              {exchanges.map((exchange, i) => {
                const activeQuotes = exchange.ExchangeRateQuote;
                const usdQuote = activeQuotes.find((q) => q.currencyCode === 'USD');
                const uniqueCurrencies = [...new Set(activeQuotes.map((q) => q.currencyCode))];

                return (
                  <ScrollReveal key={exchange.id} delay={i * 60}>
                    <article
                      className={s.exchangeCard}
                      role="listitem"
                      aria-label={exchange.displayName ?? exchange.name}
                      style={{ '--i': i } as React.CSSProperties}
                    >
                      {/* Card header */}
                      <div className={s.cardHeader}>
                        <div className={s.cardInfo}>
                          <h3 className={s.cardName}>
                            {exchange.displayName ?? exchange.name}
                          </h3>
                          {exchange.city && (
                            <span className={s.cardCity}>{exchange.city}</span>
                          )}
                        </div>
                        {activeQuotes.length > 0 && (
                          <div className={s.cardActiveBadge}>
                            <Zap size={10} strokeWidth={2.5} aria-hidden />
                            فعال
                          </div>
                        )}
                      </div>

                      {/* Best USD rate */}
                      {usdQuote && (
                        <div className={s.cardRateRow}>
                          <div className={s.rateItem}>
                            <span className={s.rateLabel}>خرید USD</span>
                            <span className={s.rateVal} dir="ltr">
                              {new Intl.NumberFormat('fa-IR').format(
                                Math.round(Number(usdQuote.buyRate)),
                              )}
                              <span className={s.rateUnit}>{usdQuote.unit}</span>
                            </span>
                          </div>
                          <div className={s.rateDivider} aria-hidden />
                          <div className={s.rateItem}>
                            <span className={s.rateLabel}>فروش USD</span>
                            <span className={s.rateVal} dir="ltr">
                              {new Intl.NumberFormat('fa-IR').format(
                                Math.round(Number(usdQuote.sellRate)),
                              )}
                              <span className={s.rateUnit}>{usdQuote.unit}</span>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Supported currencies */}
                      {uniqueCurrencies.length > 0 && (
                        <div className={s.currencies} aria-label="ارزهای پشتیبانی‌شده">
                          {uniqueCurrencies.slice(0, 6).map((code) => (
                            <span
                              key={code}
                              className={s.currencyBadge}
                              title={CURRENCY_NAMES[code] ?? code}
                            >
                              {code}
                            </span>
                          ))}
                          {uniqueCurrencies.length > 6 && (
                            <span className={s.currencyMore}>
                              +{uniqueCurrencies.length - 6}
                            </span>
                          )}
                        </div>
                      )}

                      {/* No quotes message */}
                      {activeQuotes.length === 0 && (
                        <p className={s.noRates}>قیمتی ثبت نشده است</p>
                      )}
                    </article>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {exchanges.length === 0 && (
        <section className={s.section}>
          <div className={s.sectionInner}>
            <div className={s.emptyState} role="status">
              <Building2 size={40} className={s.emptyIcon} aria-hidden />
              <h2 className={s.emptyTitle}>صرافی فعالی وجود ندارد</h2>
              <p className={s.emptySub}>
                در حال حاضر صرافی فعالی در سیستم ثبت نشده است. بعداً مراجعه کنید.
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
