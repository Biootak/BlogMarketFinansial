'use client';

/**
 * OnlinePaymentLanding — Premium Fintech Landing Page 2026
 *
 * ساختار:
 *  1. Hero  — full-bleed، ۳ floating glass card، ambient orbs، stagger entrance
 *  2. Trust strip — آمار زنده (animated counters)
 *  3. Services grid — ۶ خدمت با glass card + scroll-reveal + accent line
 *  4. How it works — ۳ مرحله با connector SVG line
 *  5. CTA contact (از ContactCTA موجود)
 *
 * تکنیک‌ها:
 *  - Glass morphism واقعی: backdrop-filter + layered box-shadow + shine overlay
 *  - 3D tilt rAF-based برای glass cards (صفر state re-render)
 *  - Floating animation با CSS @keyframes (off main thread)
 *  - Scroll-reveal با IntersectionObserver
 *  - RTL-safe (فقط logical properties)
 *  - prefers-reduced-motion رعایت شده
 *  - Tokens only — بدون hardcode hex
 */

import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe,
  GraduationCap,
  type LucideIcon,
  Phone,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import s from './OnlinePaymentHero.module.css';

/* ─────────────────────────────────────────────────────────────────────────
   TYPES & DATA
   ───────────────────────────────────────────────────────────────────────── */

type AccentKey =
  | 'accentBrand'
  | 'accentViolet'
  | 'accentEmerald'
  | 'accentAmber'
  | 'accentRose'
  | 'accentSlate';

interface Service {
  icon: LucideIcon;
  title: string;
  desc: string;
  accentKey: AccentKey;
}

const SERVICES: Service[] = [
  {
    icon: Globe,
    title: 'حواله‌های بین‌المللی',
    desc: 'انتقال سریع و امن پول برای افراد و شرکت‌ها به سراسر جهان',
    accentKey: 'accentBrand',
  },
  {
    icon: CreditCard,
    title: 'پرداخت‌های آنلاین',
    desc: 'خرید آسان از سایت‌های معتبر جهانی با کارت‌های اعتباری بین‌المللی',
    accentKey: 'accentViolet',
  },
  {
    icon: GraduationCap,
    title: 'شهریه دانشگاه',
    desc: 'پرداخت شهریه و هزینه‌های تحصیلی دانشگاه‌های خارج از کشور',
    accentKey: 'accentEmerald',
  },
  {
    icon: Wallet,
    title: 'نقد کردن درآمد',
    desc: 'دریافت درآمد فریلنسری از پلتفرم‌های بین‌المللی مثل Upwork و Fiverr',
    accentKey: 'accentAmber',
  },
  {
    icon: ShoppingBag,
    title: 'خرید نرم‌افزار',
    desc: 'اشتراک و لایسنس سرویس‌های خارجی — Adobe، Microsoft، AWS و...',
    accentKey: 'accentRose',
  },
  {
    icon: Sparkles,
    title: 'خدمات ویژه',
    desc: 'راه‌حل‌های سفارشی برای نیازهای پرداخت خاص کسب‌وکار شما',
    accentKey: 'accentSlate',
  },
];

const STEPS = [
  {
    num: '۱',
    title: 'درخواست بدید',
    desc: 'از طریق فرم آنلاین یا تماس مستقیم، نیاز خود را ثبت کنید',
  },
  {
    num: '۲',
    title: 'مشاوره رایگان',
    desc: 'کارشناس ما بهترین روش و نرخ را برای شما پیشنهاد می‌دهد',
  },
  {
    num: '۳',
    title: 'انجام پرداخت',
    desc: 'با اطمینان کامل، تراکنش شما در کمترین زمان انجام می‌شود',
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   HOOK: useReveal (IntersectionObserver-based)
   ───────────────────────────────────────────────────────────────────────── */

function useReveal<T extends Element>(rootMargin = '-60px'): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);

  return [ref, visible];
}

/* ─────────────────────────────────────────────────────────────────────────
   HOOK: useGlassTilt (rAF 3D tilt, zero re-render)
   ───────────────────────────────────────────────────────────────────────── */

function useGlassTilt(strength = 6) {
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
      ref.current.style.transform = '';
      ref.current.style.transition = 'transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1)';
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
   SERVICE CARD
   ───────────────────────────────────────────────────────────────────────── */

function ServiceCard({
  service,
  index,
}: {
  service: Service;
  index: number;
}) {
  const [ref, visible] = useReveal<HTMLLIElement>('-40px');
  const Icon = service.icon;

  return (
    <li
      ref={ref}
      className={[s.serviceCard, s[service.accentKey], visible ? s.revealed : ''].join(' ')}
      style={{ transitionDelay: `${index * 70}ms` }}
    >
      <div className={s.serviceIconWrap}>
        <Icon size={22} strokeWidth={1.5} />
      </div>
      <h3 className={s.serviceTitle}>{service.title}</h3>
      <p className={s.serviceDesc}>{service.desc}</p>
    </li>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   STEP CARD
   ───────────────────────────────────────────────────────────────────────── */

function Step({
  step,
  index,
}: {
  step: (typeof STEPS)[number];
  index: number;
}) {
  const [ref, visible] = useReveal<HTMLDivElement>('-40px');

  return (
    <div
      ref={ref}
      className={`${s.step} ${visible ? s.revealed : ''}`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className={s.stepNum}>{step.num}</div>
      <div className={s.stepTitle}>{step.title}</div>
      <p className={s.stepDesc}>{step.desc}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MAIN LANDING COMPONENT
   ───────────────────────────────────────────────────────────────────────── */

interface OnlinePaymentLandingProps {
  /** پاس دادن از server component برای ContactCTA */
  onScrollToContact?: () => void;
}

export default function OnlinePaymentLanding({ onScrollToContact }: OnlinePaymentLandingProps) {
  const cardMainTilt = useGlassTilt(5);
  const cardRateTilt = useGlassTilt(4);
  const [trustRef, trustVisible] = useReveal<HTMLDivElement>('-30px');

  function scrollToContact() {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    onScrollToContact?.();
  }

  return (
    <div className={s.page}>
      {/* ================================================================
          SECTION 1: HERO
          ================================================================ */}
      <section className={s.hero} aria-label="صفحه اصلی پرداخت بین‌المللی">
        {/* Layered ambient background */}
        <div className={s.heroBg} aria-hidden>
          {/* SVG grid */}
          <svg className={s.heroGrid} aria-hidden>
            <defs>
              <pattern id="payGrid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#payGrid)" />
          </svg>
        </div>

        <div className={s.heroInner}>
          {/* ── Text column ─────────────────────────────────────── */}
          <div className={s.heroText}>
            {/* Live status badge */}
            <div className={s.liveBadge}>
              <span className={s.liveDot} aria-hidden />
              خدمات فعال — پاسخگویی ۲۴ ساعته
            </div>

            {/* Headline */}
            <h1 className={s.heroHeadline}>
              پرداخت بین‌المللی
              <br />
              <span className={s.heroAccent}>سریع و مطمئن</span>
            </h1>

            {/* Sub */}
            <p className={s.heroSub}>
              از پی‌پال تا حواله بانکی، از شهریه دانشگاه تا نقد درآمد فریلنسری — همه خدمات پرداخت
              بین‌المللی در یک جا با بهترین نرخ.
            </p>

            {/* Trust pills */}
            <div className={s.heroPills} role="list" aria-label="ویژگی‌های کلیدی">
              {[
                { icon: CheckCircle2, text: 'بدون واسطه' },
                { icon: Clock, text: 'انجام در ۲۴ ساعت' },
                { icon: Phone, text: 'پشتیبانی مستمر' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className={s.pill} role="listitem">
                  <Icon size={13} strokeWidth={2} />
                  {text}
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className={s.heroCtas}>
              <button type="button" onClick={scrollToContact} className={s.ctaMain}>
                شروع کنید
                <ArrowLeft size={16} strokeWidth={2} style={{ transform: 'scaleX(-1)' }} />
              </button>
              <Link href="#services" className={s.ctaGhost}>
                مشاهده خدمات
              </Link>
            </div>
          </div>

          {/* ── Visual column: 3 floating glass cards ───────────── */}
          <div className={s.heroVisual} aria-hidden>
            {/* Ambient orbs */}
            <div className={s.orbA} />
            <div className={s.orbB} />

            {/* Card 1: Payment total — foreground */}
            <div
              ref={cardMainTilt.ref}
              className={`${s.glassCard} ${s.cardMain}`}
              onMouseMove={cardMainTilt.handleMove}
              onMouseLeave={cardMainTilt.handleLeave}
              style={{ transition: 'transform 80ms ease-out' }}
            >
              <div className={s.cardRow}>
                <div className={s.cardLabel}>مبلغ انتقال</div>
                <div className={s.cardAmount}>
                  ۱٬۰۰۰
                  <span className={s.cardCurrency}>USD</span>
                </div>
                <div className={s.cardDivider} />
                <div className={s.methodRow}>
                  {['PP', 'MC', 'VI', 'BT'].map((m) => (
                    <div key={m} className={s.methodChip}>
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Live rates — mid depth */}
            <div
              ref={cardRateTilt.ref}
              className={`${s.glassCard} ${s.cardRate}`}
              onMouseMove={cardRateTilt.handleMove}
              onMouseLeave={cardRateTilt.handleLeave}
              style={{ transition: 'transform 80ms ease-out' }}
            >
              <div className={s.cardRow}>
                <div className={s.cardLabel}>نرخ لحظه‌ای</div>
                {[
                  { name: 'USD / IRR', val: '۷۹٬۵۰۰', trend: 'up' as const },
                  { name: 'USD / AFN', val: '۷۲٬۸', trend: 'down' as const },
                  { name: 'EUR / USD', val: '۱.۰۸', trend: 'up' as const },
                ].map((r) => (
                  <div key={r.name} className={s.rateItem}>
                    <span className={s.rateName}>{r.name}</span>
                    <span className={`${s.rateNum} ${r.trend === 'up' ? s.rateUp : s.rateDown}`}>
                      {r.trend === 'up' ? (
                        <TrendingUp
                          size={10}
                          strokeWidth={2}
                          style={{ display: 'inline', marginInlineEnd: 3 }}
                        />
                      ) : (
                        <TrendingDown
                          size={10}
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

            {/* Card 3: Status — background */}
            <div className={`${s.glassCard} ${s.cardStatus}`}>
              <div className={s.cardRow}>
                <div className={s.statusBadge}>
                  <span className={s.statusDot} />
                  پردازش موفق
                </div>
                <p className={s.cardStatusText}>
                  تراکنش شما در کمتر از ۲۴ ساعت
                  <br />
                  انجام خواهد شد
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 2: TRUST STRIP
          ================================================================ */}
      <div ref={trustRef} className={s.trustStrip} aria-label="آمار اعتماد">
        <div className={s.trustInner}>
          {[
            { num: '+۵۰۰۰', label: 'تراکنش موفق' },
            { num: '۹۸٪', label: 'رضایت مشتریان' },
            { num: '+۱۲', label: 'روش پرداخت' },
            { num: '۲۴/۷', label: 'پشتیبانی آنلاین' },
          ]
            .map((stat, i) => (
              <div
                key={stat.label}
                className={s.trustStat}
                style={{
                  opacity: trustVisible ? 1 : 0,
                  transform: trustVisible ? 'none' : 'translateY(12px)',
                  transition: `opacity 0.4s 0.1s, transform 0.4s ${i * 80}ms`,
                }}
              >
                <span className={s.trustNum}>{stat.num}</span>
                <span className={s.trustLabel}>{stat.label}</span>
              </div>
            ))
            .reduce<React.ReactNode[]>((acc, el, i, arr) => {
              acc.push(el);
              if (i < arr.length - 1)
                acc.push(<div key={`d${i}`} className={s.trustDivider} aria-hidden />);
              return acc;
            }, [])}
        </div>
      </div>

      {/* ================================================================
          SECTION 3: SERVICES
          ================================================================ */}
      <section id="services" className={s.services} aria-labelledby="services-title">
        <div className={s.sectionHeader}>
          <span className={s.sectionEyebrow}>خدمات ما</span>
          <h2 id="services-title" className={s.sectionTitle}>
            همه نیازهای پرداخت بین‌المللی
          </h2>
          <p className={s.sectionBody}>
            از حواله ارزی تا خرید نرم‌افزار، هر نوع پرداخت خارجی را با بهترین نرخ و سریع‌ترین زمان
            انجام می‌دهیم
          </p>
        </div>

        <ul className={s.servicesGrid} aria-label="لیست خدمات">
          {SERVICES.map((service, i) => (
            <ServiceCard key={service.title} service={service} index={i} />
          ))}
        </ul>
      </section>

      {/* ================================================================
          SECTION 4: HOW IT WORKS
          ================================================================ */}
      <section className={s.howWorks} aria-labelledby="how-title">
        <div className={s.sectionHeader}>
          <span className={s.sectionEyebrow}>نحوه کار</span>
          <h2 id="how-title" className={s.sectionTitle}>
            در ۳ مرحله ساده
          </h2>
          <p className={s.sectionBody}>پرداخت بین‌المللی دیگر پیچیده نیست</p>
        </div>

        <div className={s.stepsRow}>
          {STEPS.map((step, i) => (
            <Step key={step.num} step={step} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
