/**
 * ExchangeTopCustomers — top 5 customers by transaction count (last 30 days).
 *
 * Server Component. avatar از initial فارسی.
 */

import s from './ExchangeDashboard.module.css';
import { KYC_LEVEL_FA } from '@/lib/exchange-labels';
import type { TopCustomer } from '@/actions/exchange-dashboard';

function formatAmount(volumeStr: string, currency: string): string {
  const minor = BigInt(volumeStr);
  return `${new Intl.NumberFormat('fa-IR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(minor) / 100)} ${currency}`;
}

function getInitial(name: string): string {
  // اولین کاراکتر غیرخالی (RTL friendly)
  const trimmed = name.trim();
  if (!trimmed) return '?';
  // سعی می‌کنیم نام کوچک‌تر (در RTL = کلمهٔ اول = اسم کوچک) را بگیریم
  const parts = trimmed.split(/\s+/);
  // در RTL، اسم اول معمولاً اول است
  return (parts[0]?.[0] ?? trimmed[0] ?? '?').toUpperCase();
}

export default function ExchangeTopCustomers({ items }: { items: TopCustomer[] }) {
  if (items.length === 0) {
    return <div className={s.flowEmpty}>هنوز مشتری فعالی ندارید.</div>;
  }

  return (
    <ul className={s.topList} aria-label="پنج مشتری برتر">
      {items.map((c, idx) => {
        const initials = getInitial(c.fullName);
        const tone = idx === 0 ? '0' : idx === 1 ? '1' : '2';
        return (
          <li key={c.id} className={s.topItem}>
            <span className={s.topAvatar} data-tone={tone} aria-hidden>
              {initials}
            </span>
            <span>
              <span className={s.topName}>{c.fullName}</span>
              <br />
              <span className={s.topMeta}>
                {c.txnCount} تراکنش · {KYC_LEVEL_FA[c.kycLevel] ?? c.kycLevel}
                {c.city ? ` · ${c.city}` : ''}
              </span>
            </span>
            <span className={s.topAmount}>
              {formatAmount(c.totalAmount, c.currency)}
              <br />
              <span className={s.topAmountSub} dir="ltr">
                {c.phone ? c.phone : '—'}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
