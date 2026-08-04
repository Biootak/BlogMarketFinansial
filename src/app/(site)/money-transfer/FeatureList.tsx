'use client';

/**
 * FeatureList — premium 3-column feature grid.
 * Each card: colored icon badge (40px) + title + description.
 * 2026 redesign: individual cards with depth, hover lift, hairline shine.
 */

import { ArrowLeftRight, Clock, CreditCard, Globe, Headphones, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
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
    <div className="mt-features-wrap">
      <header className="mt-features-header">
        <span className="mt-features-eyebrow">چرا ما</span>
        <h2 className="mt-features-title">خدماتی که به آن‌ها اعتماد می‌کنید</h2>
      </header>

      <div className="mt-features">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="mt-feature">
              <span className={`mt-feature__icon${feature.variant}`} aria-hidden>
                <Icon size={18} strokeWidth={2} />
              </span>
              <div className="mt-feature__body">
                <h3 className="mt-feature__title">{feature.title}</h3>
                <p className="mt-feature__desc">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
