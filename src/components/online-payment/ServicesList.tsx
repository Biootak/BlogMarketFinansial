'use client';

/**
 * ServicesList — 2026 redesign
 * تغییرات: حذف react-icons و جایگزینی با lucide-react،
 * حذف hardcode hex و استفاده از CSS module tokens،
 * scroll-reveal با IntersectionObserver (بدون motion library)
 */

import {
  CreditCard,
  Globe,
  GraduationCap,
  Receipt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import s from './ServicesList.module.css';

interface Service {
  icon: LucideIcon;
  title: string;
  description: string;
  accentClass: keyof typeof ACCENTS;
}

/* Semantic accent variants — مقادیر در CSS module */
const ACCENTS = {
  brand: 'brand',
  violet: 'violet',
  emerald: 'emerald',
  amber: 'amber',
  rose: 'rose',
  slate: 'slate',
} as const;

const SERVICES: Service[] = [
  {
    icon: Globe,
    title: 'حواله‌های بین‌المللی',
    description: 'انتقال سریع و امن پول برای افراد و شرکت‌ها به سراسر جهان',
    accentClass: 'brand',
  },
  {
    icon: CreditCard,
    title: 'پرداخت‌های آنلاین',
    description: 'خرید آسان از سایت‌های معتبر جهانی با کارت‌های اعتباری',
    accentClass: 'violet',
  },
  {
    icon: GraduationCap,
    title: 'خدمات آموزشی',
    description: 'پرداخت شهریه و هزینه‌های ثبت‌نام دانشگاه‌های خارجی',
    accentClass: 'emerald',
  },
  {
    icon: Wallet,
    title: 'نقد کردن درآمد',
    description: 'دریافت درآمد از پلتفرم‌های فریلنسری بین‌المللی',
    accentClass: 'amber',
  },
  {
    icon: ShoppingBag,
    title: 'خرید نرم‌افزار',
    description: 'تهیه اشتراک و لایسنس برنامه‌های خارجی و سرویس‌های آنلاین',
    accentClass: 'rose',
  },
  {
    icon: Smartphone,
    title: 'شارژ موبایل',
    description: 'شارژ فوری سیم‌کارت MTN، روشن، اتصالات و سایر اپراتورهای افغانستان',
    accentClass: 'brand',
  },
  {
    icon: Receipt,
    title: 'پرداخت قبض',
    description: 'پرداخت قبض برق DABS، آب، مخابرات و سایر خدمات دولتی',
    accentClass: 'emerald',
  },
  {
    icon: Sparkles,
    title: 'خدمات ویژه',
    description: 'راه‌حل‌های سفارشی برای نیازهای خاص کسب‌وکار شما',
    accentClass: 'slate',
  },
];

/* ---------------------------------------------------------------------- */
/*  ServiceCard — reveals itself when enters viewport                      */
/* ---------------------------------------------------------------------- */

function ServiceCard({
  service,
  index,
}: {
  service: Service;
  index: number;
}) {
  const ref = useRef<HTMLLIElement>(null);
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
      { rootMargin: '-40px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const Icon = service.icon;
  const accentKey = `accent_${service.accentClass}` as keyof typeof s;

  return (
    <li
      ref={ref}
      className={`${s.card} ${s[accentKey] ?? ''} ${visible ? s.visible : s.hidden}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className={s.iconWrap}>
        <Icon size={22} strokeWidth={1.5} />
      </div>
      <h3 className={s.cardTitle}>{service.title}</h3>
      <p className={s.cardBody}>{service.description}</p>
      <div className={s.cardLine} aria-hidden />
    </li>
  );
}

/* ---------------------------------------------------------------------- */
/*  Main ServicesList                                                       */
/* ---------------------------------------------------------------------- */

export default function ServicesList() {
  return (
    <section id="services" className={s.root}>
      {/* Section header */}
      <div className={s.header}>
        <span className={s.eyebrow}>خدمات ما</span>
        <h2 className={s.sectionTitle}>خدمات پرداخت بین‌المللی</h2>
        <p className={s.sectionSub}>
          با تیم متخصص ما، تمامی نیازهای پرداخت بین‌المللی شما با سرعت و امنیت بالا انجام می‌شود
        </p>
      </div>

      {/* Grid */}
      <ul className={s.grid}>
        {SERVICES.map((service, i) => (
          <ServiceCard key={service.title} service={service} index={i} />
        ))}
      </ul>
    </section>
  );
}
