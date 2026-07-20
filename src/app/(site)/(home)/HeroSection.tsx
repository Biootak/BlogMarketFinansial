'use client';

/**
 * HeroSection — Home landing hero (2026 redesign)
 *
 * بازطراحی کامل برای تجربه میلیارد‌دلاری:
 *  - headline دو‌خطی قوی با focal point واضح
 *  - سه CTA (نرخ‌ها / تحلیل‌ها / حواله)
 *  - کارت‌های glass با محتوای غنی‌تر
 *  - stats bar کوچک درون hero
 *  - signature ambient SVG stroke animation
 *  - رعایت کامل RTL، tokens، WCAG 2.2 AA
 */

import {
  ArrowLeft,
  BarChart2,
  Globe,
  SendHorizonal,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './HeroSection.module.css';

/* ─────────────────────────────────────────────────────────────────────────
   HOOK: useGlassTilt
   ───────────────────────────────────────────────────────────────────────── */

function useGlassTilt(strength = 5) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const h = () => setReduced(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduced || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (ref.current) {
            ref.current.style.transform = `perspective(1000px) rotateX(${-ny * strength}deg) rotateY(${nx * strength}deg) translateZ(6px)`;
          }
        });
      }
    },
    [reduced, strength],
  );

  const handleLeave = useCallback(() => {
    if (ref.current) {
      ref.current.style.transition = 'transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1)';
      ref.current.style.transform = '';
      setTimeout(() => {
        if (ref.current) ref.current.style.transition = 'transform 80ms ease-out';
      }, 500);
    }
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return { ref, handleMove, handleLeave };
}

/* ─────────────────────────────────────────────────────────────────────────
   HERO STATS — اعداد اعتماد‌ساز inline در hero
   ───────────────────────────────────────────────────────────────────────── */
const HERO_STATS = [
  { value: '+۵۰۰۰', label: 'کاربر فعال' },
  { value: '+۲', label: 'کشور' },
  { value: '۲۴/۷', label: 'پشتیبانی' },
  { value: '۹۹.۹٪', label: 'آپتایم' },
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────────────── */

export default function HeroSection() {
  const card1 = useGlassTilt(5);
  const card2 = useGlassTilt(4);

  return (
    <section className={s.root} aria-label="صفحه اصلی — پلتفرم مالی">
      {/* ── Ambient layered background ─────────────────────────────── */}
      <div className={s.bg} aria-hidden>
        <svg className={s.grid} role="presentation" focusable="false">
          <defs>
            <pattern id="homeGrid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#homeGrid)" />
        </svg>

        {/* Signature ambient SVG stroke — لحظه واو */}
        <svg
          className={s.ambientStroke}
          viewBox="0 0 900 600"
          aria-hidden
          focusable="false"
          role="presentation"
        >
          <path
            d="M 50 300 Q 225 100 450 280 T 850 250"
            fill="none"
            stroke="url(#strokeGrad)"
            strokeWidth="1.5"
            strokeDasharray="1200"
            strokeDashoffset="1200"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="1200"
              to="0"
              dur="2.8s"
              begin="0.4s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.22 1 0.36 1"
            />
          </path>
          <path
            d="M 100 400 Q 300 200 520 360 T 870 310"
            fill="none"
            stroke="url(#strokeGrad2)"
            strokeWidth="0.8"
            strokeDasharray="900"
            strokeDashoffset="900"
            opacity="0.5"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="900"
              to="0"
              dur="3.2s"
              begin="0.8s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.22 1 0.36 1"
            />
          </path>
          <defs>
            <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(58% 0.12 165)" stopOpacity="0" />
              <stop offset="30%" stopColor="oklch(58% 0.12 165)" stopOpacity="0.6" />
              <stop offset="70%" stopColor="oklch(58% 0.13 290)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="oklch(58% 0.13 290)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="strokeGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(72% 0.13 70)" stopOpacity="0" />
              <stop offset="50%" stopColor="oklch(72% 0.13 70)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="oklch(72% 0.13 70)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ── Text column ─────────────────────────────────────────────── */}
      <div className={s.content}>
        {/* Live badge */}
        <div className={s.badge}>
          <span className={s.badgeDot} aria-hidden />
          پلتفرم مالی معتمد افغانستان ۱۴۰۴
        </div>

        {/* Headline — دو‌خطی قوی با focal point */}
        <h1 className={s.headline}>
          <span className={s.headlineMain}>نرخ‌ها، حواله، تحلیل —</span>
          <br />
          <span className={s.headlineAccent}>همه در یک پلتفرم</span>
        </h1>

        {/* Sub */}
        <p className={s.sub}>
          نرخ ارز لحظه‌ای، انتقال پول امن، و تحلیل‌های تخصصی بازار
          <br className={s.subBreak} />
          برای کاربران افغانستان، ایران و فراتر از آن.
        </p>

        {/* Trust pills */}
        <ul className={s.pills} aria-label="ویژگی‌های کلیدی">
          {[
            { icon: Globe, text: 'افغانستان + ایران' },
            { icon: Zap, text: 'نرخ لحظه‌ای' },
            { icon: Shield, text: 'انتقال امن' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className={s.pill}>
              <Icon size={13} strokeWidth={1.75} />
              {text}
            </li>
          ))}
        </ul>

        {/* CTAs — سه دکمه */}
        <div className={s.ctas}>
          <Link href="/money-transfer" className={s.ctaPrimary}>
            <TrendingUp size={16} strokeWidth={1.75} />
            مشاهده نرخ‌ها
          </Link>
          <Link href="/money-transfer#send" className={s.ctaAction}>
            <SendHorizonal size={16} strokeWidth={1.75} />
            ارسال حواله
          </Link>
          <Link href="/archive" className={s.ctaSecondary}>
            <BarChart2 size={16} strokeWidth={1.5} />
            تحلیل‌ها
            <ArrowLeft size={15} strokeWidth={1.5} className={s.arrowIcon} />
          </Link>
        </div>

        {/* Mini stats bar */}
        <ul className={s.statsBar} aria-label="آمار پلتفرم">
          {HERO_STATS.map((stat) => (
            <li key={stat.label} className={s.statItem}>
              <span className={s.statVal}>{stat.value}</span>
              <span className={s.statLabel}>{stat.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Visual column: floating glass cards ─────────────────────── */}
      <div className={s.visual} aria-hidden>
        {/* Ambient orbs */}
        <div className={s.orbA} />
        <div className={s.orbB} />

        {/* Card 1: نرخ‌های زنده — foreground */}
        <div
          ref={card1.ref}
          className={`${s.glassCard} ${s.cardMain}`}
          onMouseMove={card1.handleMove}
          onMouseLeave={card1.handleLeave}
          style={{ transition: 'transform 80ms ease-out' }}
        >
          <div className={s.cardInner}>
            <div className={s.cardHeader}>
              <div className={s.cardLabel}>نرخ لحظه‌ای</div>
              <div className={s.cardLiveDot}>
                <span />
                زنده
              </div>
            </div>
            <div className={s.cardAmount}>
              ۷۹٬۵۰۰
              <span className={s.cardUnit}>IRR</span>
            </div>
            <div className={s.cardDivider} />
            {[
              { name: 'دلار / ریال', val: '۷۹٬۵۰۰', change: '+۰.۳٪', trend: 'up' as const },
              { name: 'دلار / افغانی', val: '۷۲٬۸', change: '-۰.۱٪', trend: 'down' as const },
              { name: 'یورو / دلار', val: '۱.۰۸', change: '+۰.۵٪', trend: 'up' as const },
            ].map((r) => (
              <div key={r.name} className={s.rateRow}>
                <span className={s.rateName}>{r.name}</span>
                <div className={s.rateRight}>
                  <span className={`${s.rateChange} ${r.trend === 'up' ? s.trendUp : s.trendDown}`}>
                    {r.change}
                  </span>
                  <span className={`${s.rateVal} ${r.trend === 'up' ? s.trendUp : s.trendDown}`}>
                    {r.trend === 'up' ? (
                      <TrendingUp
                        size={9}
                        strokeWidth={2}
                        style={{ display: 'inline', marginInlineEnd: 3 }}
                      />
                    ) : (
                      <TrendingDown
                        size={9}
                        strokeWidth={2}
                        style={{ display: 'inline', marginInlineEnd: 3 }}
                      />
                    )}
                    {r.val}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: انتقال پول — mid depth */}
        <div
          ref={card2.ref}
          className={`${s.glassCard} ${s.cardSecond}`}
          onMouseMove={card2.handleMove}
          onMouseLeave={card2.handleLeave}
          style={{ transition: 'transform 80ms ease-out' }}
        >
          <div className={s.cardInner}>
            <div className={s.cardLabel}>محاسبه حواله</div>
            <div className={s.cardAmount}>
              ۱٬۰۰۰
              <span className={s.cardUnit}>USD</span>
            </div>
            <div className={s.cardDivider} />
            <div className={s.rateRow}>
              <span className={s.rateName}>دریافتی (ریال)</span>
              <span className={`${s.rateVal} ${s.trendUp}`}>۷۹٬۲۰۰٬۰۰۰</span>
            </div>
            <div className={s.rateRow}>
              <span className={s.rateName}>کارمزد</span>
              <span className={s.rateVal}>رایگان</span>
            </div>
            <Link href="/money-transfer" className={s.cardCta}>
              ارسال حواله
              <ArrowLeft size={11} strokeWidth={2} />
            </Link>
          </div>
        </div>

        {/* Card 3: وضعیت سرویس — background */}
        <div className={`${s.glassCard} ${s.cardThird}`}>
          <div className={s.cardInner}>
            <div className={s.statusBadge}>
              <span className={s.statusDot} />
              سرویس فعال
            </div>
            <p className={s.cardNote}>
              نرخ‌ها به‌صورت خودکار
              <br />
              هر ۵ دقیقه به‌روز می‌شوند
            </p>
            <div className={s.uptimeBar}>
              <div className={s.uptimeFill} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className={s.bottomFade} aria-hidden />
    </section>
  );
}
