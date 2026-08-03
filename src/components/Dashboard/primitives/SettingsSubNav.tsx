/**
 * SettingsSubNav — vertical navigation برای settings sub-routes.
 *
 *  الگو: Vercel/Stripe — یک ستون عمودی با dot+line (timeline ایستاده) که
 *  هر گزینه را به گزینهٔ بعد متصل می‌کند. این الگو حس "رهنمونی/audit" می‌دهد
 *  که با دامنهٔ مالی هم‌خوانی دارد.
 *
 *  هر آیتم شامل:
 *    - bullet (dot) — در حالت active تبدیل به numbered step می‌شود
 *    - icon در یک chip مربع
 *    - label + sub-label
 *    - counter اختیاری (مثلاً تعداد اخطار یا پرچم)
 *
 *  این کامپوننت در /exchange/settings و sub-routes آن استفاده می‌شود.
 */

import { cn } from '@/lib/utils';
import {
  Activity,
  Archive,
  BarChart2,
  Bell,
  Building2,
  Clock,
  Cog,
  CreditCard,
  Database,
  Globe,
  Key,
  LayoutGrid,
  Lock,
  type LucideIcon,
  Mail,
  Power,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import s from './SettingsSubNav.module.css';

/**
 * نام‌های آیکن مجاز — به‌جای پاس دادن LucideIcon function از Server به Client.
 * هر نام جدید را اینجا اضافه کن و به ICON_MAP map کن.
 */
export type SettingsNavIconName =
  | 'activity'
  | 'archive'
  | 'bar-chart'
  | 'bell'
  | 'building'
  | 'clock'
  | 'cog'
  | 'credit-card'
  | 'database'
  | 'globe'
  | 'key'
  | 'layout-grid'
  | 'lock'
  | 'mail'
  | 'power'
  | 'settings'
  | 'shield'
  | 'users'
  | 'wallet'
  | 'zap';

const ICON_MAP: Record<SettingsNavIconName, LucideIcon> = {
  activity: Activity,
  archive: Archive,
  'bar-chart': BarChart2,
  bell: Bell,
  building: Building2,
  clock: Clock,
  cog: Cog,
  'credit-card': CreditCard,
  database: Database,
  globe: Globe,
  key: Key,
  'layout-grid': LayoutGrid,
  lock: Lock,
  mail: Mail,
  power: Power,
  settings: Settings,
  shield: ShieldCheck,
  users: Users,
  wallet: Wallet,
  zap: Zap,
};

export interface SettingsSubNavItem {
  /** کلید یکتا — برای تشخیص active */
  key: string;
  /** لینک مقصد (نسبی یا مطلق) */
  href: string;
  /** عنوان فارسی */
  label: string;
  /** توضیح کوتاه فارسی */
  description: string;
  /**
   * نام آیکن — string به جای LucideIcon function تا از Server Component قابل پاس باشد.
   * ر.ک SettingsNavIconName برای مقادیر مجاز.
   */
  iconName: SettingsNavIconName;
  /** badge اختیاری — مثلاً شمارنده یا پرچم */
  badge?: { label: string; tone?: 'neutral' | 'warn' | 'success' | 'info' };
  /** علامت‌گذاری به‌عنوان "توصیه‌شده برای تکمیل" (مثل KYC) */
  recommended?: boolean;
}

interface Props {
  items: SettingsSubNavItem[];
  /** کلید فعال — اگر داده نشود، از pathname تشخیص داده می‌شود. */
  activeKey?: string;
  /** اگر true، به جای <Link> از <button> استفاده می‌کند (برای state-driven tabs). */
  asTabs?: boolean;
  /** callback وقتی asTabs=true و کاربر آیتمی را می‌زند */
  onSelect?: (key: string) => void;
  className?: string;
}

export function SettingsSubNav({ items, activeKey, asTabs, onSelect, className }: Props) {
  return (
    <nav className={cn(s.nav, className)} aria-label="بخش‌های تنظیمات">
      <ol className={s.list}>
        {items.map((item, idx) => {
          const Icon = ICON_MAP[item.iconName] ?? Activity;
          const isActive = item.key === activeKey;
          const isLast = idx === items.length - 1;
          const isFirst = idx === 0;
          const Content = (
            <>
              {/* Timeline rail (line behind bullet) */}
              {!isLast && <span className={s.rail} aria-hidden />}

              {/* Bullet / step number */}
              <span
                className={cn(
                  s.bullet,
                  isActive && s.bulletActive,
                  item.recommended && s.bulletRecommended,
                )}
                aria-hidden
              >
                {isActive ? (
                  <span className={s.stepNum}>{toFaDigit(idx + 1)}</span>
                ) : (
                  <span className={s.stepDot} />
                )}
              </span>

              {/* Icon chip */}
              <span className={cn(s.iconChip, isActive && s.iconChipActive)} aria-hidden>
                <Icon size={14} strokeWidth={1.85} />
              </span>

              {/* Text */}
              <span className={s.text}>
                <span className={s.label}>
                  {item.label}
                  {item.badge && (
                    <span className={cn(s.badge, s[`badge_${item.badge.tone ?? 'neutral'}`])}>
                      {item.badge.label}
                    </span>
                  )}
                </span>
                <span className={s.desc}>{item.description}</span>
              </span>

              {/* Active indicator (subtle right-edge bar) */}
              {isActive && <span className={s.activeBar} aria-hidden />}
            </>
          );

          if (asTabs) {
            return (
              <li key={item.key} className={s.item}>
                <button
                  type="button"
                  className={cn(s.btn, isActive && s.btnActive, isFirst && s.firstItem)}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onSelect?.(item.key)}
                >
                  {Content}
                </button>
              </li>
            );
          }

          return (
            <li key={item.key} className={s.item}>
              <Link
                href={item.href}
                className={cn(s.btn, isActive && s.btnActive, isFirst && s.firstItem)}
                aria-current={isActive ? 'page' : undefined}
              >
                {Content}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** تبدیل اعداد انگلیسی به فارسی برای شماره step */
function toFaDigit(n: number): string {
  return new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(n);
}
