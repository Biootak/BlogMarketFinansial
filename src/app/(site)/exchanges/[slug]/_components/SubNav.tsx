'use client';

/**
 * SubNav — Sticky in-page navigation for exchange profile.
 *
 *   Mobile-first pill bar (sticky top, glass surface).
 *   Uses IntersectionObserver to highlight the active section as user scrolls.
 *   Reduced-motion safe.
 */

import { Banknote, Building2, ChartLine, Clock4, Info, MessageSquare, Radio } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import s from './SubNav.module.css';

const _faNum = new Intl.NumberFormat('fa-IR');

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  /** نمایش در pill bar صفحه اصلی (با anchor scroll) */
  inPage?: boolean;
};

type Props = {
  exchange: {
    slug: string;
    name: string;
    city: string | null;
    activeCurrencies: number;
    hasHours: boolean;
    serviceCount: number;
  };
};

export default function SubNav({ exchange }: Props) {
  const pathname = usePathname();
  const isHome = pathname === `/exchanges/${exchange.slug}`;
  const [active, setActive] = useState<string>('hero');
  const [stuck, setStuck] = useState(false);

  // ── ساخت آیتم‌ها بر اساس context ──
  const items: NavItem[] = isHome
    ? [
        { key: 'hero', label: 'پروفایل', href: '#hero', icon: Building2, inPage: true },
        { key: 'rates', label: 'نرخ‌ها', href: '#rates', icon: Radio, inPage: true },
        ...(exchange.serviceCount > 0
          ? ([
              {
                key: 'services',
                label: 'خدمات',
                href: '#services',
                icon: Banknote,
                inPage: true,
              },
            ] as NavItem[])
          : []),
        {
          key: 'hours',
          label: 'ساعات کاری',
          href: exchange.hasHours ? '#hours' : `/exchanges/${exchange.slug}/hours`,
          icon: Clock4,
          inPage: exchange.hasHours,
        },
        { key: 'about', label: 'درباره', href: '#about', icon: Info, inPage: true },
        { key: 'contact', label: 'تماس', href: '#contact', icon: MessageSquare, inPage: true },
      ]
    : [
        { key: 'profile', label: 'پروفایل', href: `/exchanges/${exchange.slug}`, icon: Building2 },
        {
          key: 'markets',
          label: 'بازارها',
          href: `/exchanges/${exchange.slug}/markets`,
          icon: ChartLine,
        },
        ...(exchange.serviceCount > 0
          ? ([
              {
                key: 'services',
                // ۲۰۲۶-۰۷-۲۹: لینک در sub-route ها به صفحهٔ اصلی صرافی
                // با anchor «#services» می‌رود تا کاربر از context صرافی جدا نشود.
                // قبلاً: `/services/compare?exchange=...` (URL جدا و گیج‌کننده)
                label: 'خدمات',
                href: `/exchanges/${exchange.slug}#services`,
                icon: Banknote,
                inPage: false,
              },
            ] as NavItem[])
          : []),
        {
          key: 'hours',
          label: 'ساعات کاری',
          href: `/exchanges/${exchange.slug}/hours`,
          icon: Clock4,
        },
        {
          key: 'about',
          label: 'درباره',
          href: `/exchanges/${exchange.slug}/about`,
          icon: Info,
        },
      ];

  // ── Sticky shadow when scrolling past ──
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Active section via IntersectionObserver (in-page mode) ──
  useEffect(() => {
    if (!isHome) return;
    const sections = ['hero', 'rates', 'services', 'hours', 'about', 'contact']
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, [isHome]);

  return (
    <nav
      className={`${s.nav} ${stuck ? s.navStuck : ''}`}
      aria-label={`ناوبری ${exchange.name}`}
      dir="rtl"
    >
      <div className={s.inner}>
        {/* Brand — mobile only, shows the exchange name */}
        <Link href={`/exchanges/${exchange.slug}`} className={s.brand}>
          <span className={s.brandDot} aria-hidden />
          <span className={s.brandName}>{exchange.name}</span>
        </Link>

        {/* Items */}
        <ul className={s.list}>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              isHome && item.inPage
                ? active === item.key
                : pathname === item.href ||
                  (item.href !== `/exchanges/${exchange.slug}` && pathname.startsWith(item.href));
            return (
              <li key={item.key} className={s.item}>
                {item.inPage ? (
                  <a
                    href={item.href}
                    className={`${s.pill} ${isActive ? s.pillActive : ''}`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <Icon size={14} strokeWidth={1.9} aria-hidden />
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    className={`${s.pill} ${isActive ? s.pillActive : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={14} strokeWidth={1.9} aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        {/* Meta — currencies count */}
        <div className={s.meta} aria-label="خلاصه">
          <Radio size={12} strokeWidth={1.9} aria-hidden />
          <span className={s.metaNum}>
            {_faNum.format(exchange.activeCurrencies)}
          </span>
          <span className={s.metaLabel}>ارز فعال</span>
        </div>
      </div>
    </nav>
  );
}
