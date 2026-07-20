'use client';

/**
 * WalletHero — 3D glass card visual (client component)
 * Uses rAF-based tilt (همان useGlassTilt از HeroSection)
 * No DB dependency — purely presentational / landing.
 */

import { TrendingDown, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './wallet.module.css';

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

export default function WalletHero() {
  const card1 = useGlassTilt(5);
  const card2 = useGlassTilt(4);

  return (
    <>
      {/* Ambient background */}
      <div className={s.bg} aria-hidden>
        <svg className={s.gridSvg} role="presentation" focusable="false">
          <defs>
            <pattern id="walletGrid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#walletGrid)" />
        </svg>
      </div>

      {/* Visual column */}
      <div className={s.visual} aria-hidden>
        <div className={s.orbA} />
        <div className={s.orbB} />

        {/* Card 1: موجودی */}
        <div
          ref={card1.ref}
          className={`${s.glassCard} ${s.cardMain}`}
          onMouseMove={card1.handleMove}
          onMouseLeave={card1.handleLeave}
          style={{ transition: 'transform 80ms ease-out' }}
        >
          <div className={s.cardInner}>
            <div className={s.cardLabel}>موجودی کیف پول</div>
            <div className={s.cardAmount}>
              ۱۲٬۵۰۰
              <span className={s.cardUnit}>AFN</span>
            </div>
            <div className={s.cardDivider} />
            {[
              { label: 'آخرین واریز', val: '+۲۰۰٬۰۰۰', trend: 'up' as const },
              { label: 'آخرین برداشت', val: '−۵۰٬۰۰۰', trend: 'down' as const },
            ].map((r) => (
              <div key={r.label} className={s.cardRow}>
                <span className={s.cardRowLabel}>{r.label}</span>
                <span
                  className={s.cardRowVal}
                  style={{
                    color: r.trend === 'up' ? 'var(--ds-accent-emerald)' : 'var(--ds-accent-rose)',
                  }}
                >
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
            ))}
          </div>
        </div>

        {/* Card 2: انتقال */}
        <div
          ref={card2.ref}
          className={`${s.glassCard} ${s.cardSecond}`}
          onMouseMove={card2.handleMove}
          onMouseLeave={card2.handleLeave}
          style={{ transition: 'transform 80ms ease-out' }}
        >
          <div className={s.cardInner}>
            <div className={s.cardLabel}>انتقال سریع</div>
            <div className={s.cardAmount}>
              ۱٬۰۰۰
              <span className={s.cardUnit}>USD</span>
            </div>
            <div className={s.cardDivider} />
            <div className={s.cardRow}>
              <span className={s.cardRowLabel}>دریافتی</span>
              <span className={s.cardRowVal}>۷۹٬۲۰۰٬۰۰۰</span>
            </div>
          </div>
        </div>

        {/* Card 3: وضعیت */}
        <div className={`${s.glassCard} ${s.cardThird}`}>
          <div className={s.cardInner}>
            <div className={s.statusBadge}>
              <span className={s.statusDot} />
              پرداخت فعال
            </div>
            <p className={s.cardNote}>
              پردازش فوری
              <br />
              ۲۴/۷ در دسترس
            </p>
          </div>
        </div>
      </div>

      <div className={s.bottomFade} aria-hidden />
    </>
  );
}
