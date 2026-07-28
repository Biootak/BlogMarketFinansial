'use client';

/**
 * TrustStrip — "Why this comparison board" strip + final CTA.
 *
 *   • Four trust signals in a clean row.
 *   • Final "register your exchange" CTA with arrow.
 *   • Server-rendered (no client fetching).
 */

import { ArrowLeft, BadgeCheck, Clock, Eye, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import s from './TrustStrip.module.css';

type TrustItem = {
  icon: 'shield' | 'clock' | 'eye' | 'users';
  title: string;
  desc: string;
};

const ICONS = {
  shield: ShieldCheck,
  clock: Clock,
  eye: Eye,
  users: Users,
} as const;

type Props = {
  items: TrustItem[];
  ctaLabel: string;
  ctaHref: string;
  ctaHint?: string;
  heading: string;
  subheading?: string;
};

export default function TrustStrip({
  items,
  ctaLabel,
  ctaHref,
  ctaHint,
  heading,
  subheading,
}: Props) {
  return (
    <section className={s.section} aria-label="اعتماد و شفافیت">
      <div className={s.inner}>
        <div className={s.head}>
          <BadgeCheck size={18} strokeWidth={2.25} className={s.headIcon} aria-hidden />
          <div>
            <h2 className={s.heading}>{heading}</h2>
            {subheading && <p className={s.subheading}>{subheading}</p>}
          </div>
        </div>

        <ul className={s.grid} role="list">
          {items.map((item, i) => {
            const Icon = ICONS[item.icon];
            return (
              <li
                key={item.title}
                className={s.card}
                style={{ ['--i' as string]: i } as React.CSSProperties}
              >
                <span className={s.iconWrap} aria-hidden>
                  <Icon size={18} strokeWidth={2.25} />
                </span>
                <div className={s.cardText}>
                  <h3 className={s.cardTitle}>{item.title}</h3>
                  <p className={s.cardDesc}>{item.desc}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className={s.cta}>
          <div className={s.ctaText}>
            <h3 className={s.ctaTitle}>صرافی شما اینجا نیست؟</h3>
            <p className={s.ctaDesc}>
              {ctaHint ??
                'درخواست عضویت رایگان — بررسی مدارک و تأیید در کمتر از ۲ روز کاری.'}
            </p>
          </div>
          <Link href={ctaHref} className={s.ctaBtn}>
            <span>{ctaLabel}</span>
            <ArrowLeft size={15} strokeWidth={2.5} className={s.ctaArrow} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
