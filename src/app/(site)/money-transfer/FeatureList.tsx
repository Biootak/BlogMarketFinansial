'use client';

/**
 * FeatureList — clean 2-column feature list (Linear-style).
 *
 * Design intent:
 * - Replaces the old 6-card colorful grid with a precise, dense list.
 * - Each cell = small icon + title + description, all aligned in 2 columns.
 * - No heavy gradients, no decorative rings.
 * - Subtle hover state (background tint, no scale).
 *
 * 2026-07-05: rewritten — replaced InfoCards.tsx.
 */

import {
  ArrowLeftRight,
  Shield,
  Clock,
  Headphones,
  CreditCard,
  Globe,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Tailwind-safe color variant class suffix. */
  variant: '' | '--emerald' | '--amber' | '--rose' | '--violet' | '--cyan';
}

const features: Feature[] = [
  {
    icon: ArrowLeftRight,
    title: 'نرخ‌های رقابتی',
    description: 'بهترین نرخ‌های ارز در بازار آزاد، بدون کارمزد پنهان.',
    variant: '',
  },
  {
    icon: Shield,
    title: 'امنیت بالا',
    description: 'تسویه از طریق کانال‌های مطمئن با احراز هویت کامل.',
    variant: '--emerald',
  },
  {
    icon: Clock,
    title: 'سرعت تسویه',
    description: 'اکثر حواله‌ها در کمتر از ۲۴ ساعت کاری تکمیل می‌شوند.',
    variant: '--cyan',
  },
  {
    icon: Headphones,
    title: 'پشتیبانی ۲۴/۷',
    description: 'تیم پشتیبانی همیشه پاسخ‌گوی شماست، حتی در روزهای تعطیل.',
    variant: '--amber',
  },
  {
    icon: CreditCard,
    title: 'کارمزد شفاف',
    description: 'نرخ کارمزد از ابتدا مشخص است؛ بدون هزینه‌های پنهان.',
    variant: '--violet',
  },
  {
    icon: Globe,
    title: 'پوشش جهانی',
    description: 'انتقال ارز به بیش از ۵۰ کشور، از آسیا تا اروپا و آمریکا.',
    variant: '--rose',
  },
];

export default function FeatureList() {
  return (
    <div className="mt-features">
      {features.map((feature, i) => {
        const Icon = feature.icon;
        return (
          <div key={i} className="mt-feature">
            <span className={`mt-feature__icon${feature.variant}`} aria-hidden>
              <Icon className="w-4 h-4" strokeWidth={2} />
            </span>
            <div className="mt-feature__body">
              <h3 className="mt-feature__title">{feature.title}</h3>
              <p className="mt-feature__desc">{feature.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}