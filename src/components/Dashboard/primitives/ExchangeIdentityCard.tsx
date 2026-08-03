/**
 * ExchangeIdentityCard — signature moment برای صفحه پروفایل صرافی.
 *
 * کارت شیشه‌ای مورب با:
 *   - cover gradient + ambient radial blobs
 *   - لوگوی بزرگ با halo (در fallback = monogram حرف اول)
 *   - نام رسمی/نمایشی + status pill زنده
 *   - slug، verified badge، ایجاد/به‌روزرسانی، لینک عمومی
 *   - QR placeholder + کلید «مشاهده صفحه عمومی»
 *
 * این کامپوننت client-safe است (هیچ state داخلی ندارد).
 */

import type { ExchangeRow } from '@/actions/exchanges';
import { ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
import s from './ExchangeIdentityCard.module.css';

interface Props {
  exchange: ExchangeRow;
  /** لینک صفحه عمومی — اگر undefined داده نشود، CTA نمایش داده نمی‌شود. */
  publicUrl?: string;
  /** شمارنده‌های اختیاری (مثلاً تعداد مشتری یا تراکنش) */
  counters?: Array<{ label: string; value: string | number }>;
}

const STATUS_FA: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'فعال و معتبر', cls: 'live' },
  PENDING: { label: 'در انتظار تأیید', cls: 'pending' },
  SUSPENDED: { label: 'معلق', cls: 'suspended' },
  CLOSED: { label: 'بسته شده', cls: 'closed' },
};

const dateFormatter = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' });

export function ExchangeIdentityCard({ exchange, publicUrl, counters }: Props) {
  const status = STATUS_FA[exchange.status] ?? { label: exchange.status, cls: 'closed' };
  const display = exchange.displayName ?? exchange.name;
  const initial = (display || '?').charAt(0).toUpperCase();

  return (
    <section className={s.card} aria-labelledby="exchange-identity-name">
      {/* ── Cover layer (gradient + ambient SVG) ───────────────────── */}
      <div className={s.cover} aria-hidden>
        <svg viewBox="0 0 800 240" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="eic-glow-a" cx="20%" cy="0%" r="60%">
              <stop offset="0%" stopColor="oklch(72% 0.14 165 / 0.5)" />
              <stop offset="100%" stopColor="oklch(72% 0.14 165 / 0)" />
            </radialGradient>
            <radialGradient id="eic-glow-b" cx="85%" cy="100%" r="70%">
              <stop offset="0%" stopColor="oklch(65% 0.16 280 / 0.45)" />
              <stop offset="100%" stopColor="oklch(65% 0.16 280 / 0)" />
            </radialGradient>
            <linearGradient id="eic-stripe" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(70% 0.14 165 / 0.08)" />
              <stop offset="100%" stopColor="oklch(60% 0.18 280 / 0.08)" />
            </linearGradient>
          </defs>
          <rect width="800" height="240" fill="url(#eic-stripe)" />
          <ellipse cx="160" cy="0" rx="320" ry="200" fill="url(#eic-glow-a)" />
          <ellipse cx="680" cy="240" rx="360" ry="220" fill="url(#eic-glow-b)" />
          {/* Hairline grid texture — فقط گوشه بالا-راست */}
          <g opacity="0.4">
            {Array.from({ length: 7 }).map((_, i) => (
              <line
                key={i}
                x1={520 + i * 36}
                y1="0"
                x2={520 + i * 36}
                y2="240"
                stroke="oklch(100% 0 0 / 0.06)"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={`h${i}`}
                x1="520"
                y1={i * 48}
                x2="800"
                y2={i * 48}
                stroke="oklch(100% 0 0 / 0.06)"
                strokeWidth="1"
              />
            ))}
          </g>
        </svg>
      </div>

      {/* ── Floating monogram/logo ──────────────────────────────────── */}
      <div className={s.logo} aria-hidden>
        {exchange.logoUrl ? (
          // Dynamic user URL
          <img src={exchange.logoUrl} alt="" className={s.logoImg} />
        ) : (
          <div className={s.logoFallback}>
            <span>{initial}</span>
          </div>
        )}
        <div className={s.logoHalo} />
      </div>

      {/* ── Body grid ──────────────────────────────────────────────── */}
      <div className={s.body}>
        <div className={s.identity}>
          <div className={s.eyebrowRow}>
            <span className={`${s.statusPill} ${s[`status_${status.cls}`]}`}>
              <span className={s.statusDot} aria-hidden />
              {status.label}
            </span>
            <span className={s.verifiedPill} title="صرافی توسط پلتفرم تأیید شده">
              <ShieldCheck size={11} strokeWidth={2.5} aria-hidden />
              تأیید شده
            </span>
          </div>

          <h1 id="exchange-identity-name" className={s.name}>
            {display}
          </h1>
          {exchange.displayName && exchange.displayName !== exchange.name && (
            <p className={s.legalName}>نام ثبتی: {exchange.name}</p>
          )}
          <p className={s.slugRow}>
            <code className={s.slug} dir="ltr">
              /{exchange.slug}
            </code>
            <span className={s.slugSep} aria-hidden>
              ·
            </span>
            <span className={s.joined}>
              عضو از {dateFormatter.format(new Date(exchange.createdAt))}
            </span>
          </p>
        </div>

        {/* ── Side actions (CTA + counters) ─────────────────────────── */}
        <div className={s.side}>
          {publicUrl && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className={s.cta}>
              <Sparkles size={13} strokeWidth={2} aria-hidden />
              <span>مشاهده صفحه عمومی</span>
              <ExternalLink size={12} strokeWidth={2} aria-hidden />
            </a>
          )}
          {counters && counters.length > 0 && (
            <dl className={s.counters}>
              {counters.map((c) => (
                <div key={c.label} className={s.counterCell}>
                  <dt className={s.counterLabel}>{c.label}</dt>
                  <dd className={s.counterValue}>
                    {typeof c.value === 'number'
                      ? new Intl.NumberFormat('fa-IR').format(c.value)
                      : c.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
