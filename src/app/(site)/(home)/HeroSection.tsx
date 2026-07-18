'use client';

/**
 * HeroSection — Home landing hero (2026)
 *
 * دقیقاً همان design language صفحه online-payment:
 *  - همان glassCard با backdrop-filter + layered box-shadow + signature gradient ring
 *  - همان floating card animations (floatA/B/C keyframes)
 *  - همان rAF-based 3D tilt (useGlassTilt)
 *  - همان staggered entrance روی content children
 *  - همان liveBadge + pill pattern
 *  - RTL-safe — logical properties only
 *  - prefers-reduced-motion رعایت شده
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ArrowLeft,
  BarChart2,
  Globe,
  Zap,
  Shield,
  TrendingDown,
} from 'lucide-react';
import s from './HeroSection.module.css';

/* ─────────────────────────────────────────────────────────────────────────
   HOOK: useGlassTilt — دقیقاً همان hook صفحه حواله
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
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────────────── */

export default function HeroSection() {
  const card1 = useGlassTilt(5);
  const card2 = useGlassTilt(4);

  return (
    <section className={s.root} aria-label="صفحه اصلی — پلتفرم مالی">
      {/* ── Ambient layered background — همان صفحه حواله ─────────────── */}
      <div className={s.bg} aria-hidden>
        <svg className={s.grid} role="presentation" focusable="false">
          <defs>
            <pattern id="homeGrid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#homeGrid)" />
        </svg>
      </div>

      {/* ── Text column ─────────────────────────────────────────────── */}
      <div className={s.content}>
        {/* Live badge */}
        <div className={s.badge}>
          <span className={s.badgeDot} aria-hidden />
          پلتفرم مالی معتمد افغانستان ۱۴۰۴
        </div>

        {/* Headline */}
        <h1 className={s.headline}>
          <span className={s.headlineMain}>Financial Market</span>
          <br />
          <span className={s.headlineAccent}>در کنار شما</span>
        </h1>

        {/* Sub */}
        <p className={s.sub}>
          نرخ ارز لحظه‌ای، انتقال پول امن، و تحلیل‌های تخصصی بازار — همه در یک پلتفرم
        </p>

        {/* Trust pills — همان heroPills صفحه حواله */}
        <ul className={s.pills} aria-label="ویژگی‌های کلیدی">
          {[
            { icon: Globe,  text: '۲ کشور' },
            { icon: Zap,    text: 'نرخ لحظه‌ای' },
            { icon: Shield, text: 'انتقال امن' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className={s.pill}>
              <Icon size={13} strokeWidth={1.75} />
              {text}
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div className={s.ctas}>
          <Link href="/money-transfer" className={s.ctaPrimary}>
            <TrendingUp size={16} strokeWidth={1.75} />
            مشاهده نرخ‌ها
          </Link>
          <Link href="/archive" className={s.ctaSecondary}>
            <BarChart2 size={16} strokeWidth={1.5} />
            آخرین تحلیل‌ها
            <ArrowLeft size={15} strokeWidth={1.5} className={s.arrowIcon} />
          </Link>
        </div>
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
            <div className={s.cardLabel}>نرخ لحظه‌ای</div>
            <div className={s.cardAmount}>
              ۷۹٬۵۰۰
              <span className={s.cardUnit}>IRR</span>
            </div>
            <div className={s.cardDivider} />
            {[
              { name: 'دلار / ریال',  val: '۷۹٬۵۰۰', trend: 'up'   as const },
              { name: 'دلار / افغانی', val: '۷۲٬۸',   trend: 'down' as const },
              { name: 'یورو / دلار',  val: '۱.۰۸',   trend: 'up'   as const },
            ].map((r) => (
              <div key={r.name} className={s.rateRow}>
                <span className={s.rateName}>{r.name}</span>
                <span className={`${s.rateVal} ${r.trend === 'up' ? s.trendUp : s.trendDown}`}>
                  {r.trend === 'up'
                    ? <TrendingUp   size={9} strokeWidth={2} style={{ display: 'inline', marginInlineEnd: 3 }} />
                    : <TrendingDown size={9} strokeWidth={2} style={{ display: 'inline', marginInlineEnd: 3 }} />
                  }
                  {r.val}
                </span>
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
            <div className={s.cardLabel}>مبلغ ارسال</div>
            <div className={s.cardAmount}>
              ۱٬۰۰۰
              <span className={s.cardUnit}>USD</span>
            </div>
            <div className={s.cardDivider} />
            <div className={s.rateRow}>
              <span className={s.rateName}>دریافتی</span>
              <span className={`${s.rateVal} ${s.trendUp}`}>۷۹٬۲۰۰٬۰۰۰</span>
            </div>
          </div>
        </div>

        {/* Card 3: وضعیت — background */}
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
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className={s.bottomFade} aria-hidden />
    </section>
  );
}
