/**
 * ExchangePendingQueue — top 5 oldest pending transactions.
 *
 * Server Component. لینک به صفحهٔ تراکنش‌ها (با فیلتر PENDING).
 */

import type { PendingTx } from '@/actions/exchange-dashboard';
import { TX_KIND_FA } from '@/lib/exchange-labels';
import { Check } from 'lucide-react';
import Link from 'next/link';
import s from './ExchangeDashboard.module.css';

// Module-level Intl singleton — created once at module load
const _faNum = new Intl.NumberFormat('fa-IR');

function formatAge(minutes: number): string {
  if (minutes < 1) return 'لحظاتی پیش';
  if (minutes < 60) return `${_faNum.format(minutes)} دقیقه`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${_faNum.format(hours)} ساعت`;
  const days = Math.floor(hours / 24);
  return `${_faNum.format(days)} روز`;
}

function formatAmount(amountStr: string, currency: string): string {
  return `${new Intl.NumberFormat('fa-IR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(BigInt(amountStr)) / 100)} ${currency}`;
}

export default function ExchangePendingQueue({ items }: { items: PendingTx[] }) {
  if (items.length === 0) {
    return (
      <div className={s.pendingEmpty}>
        <Check
          size={14}
          aria-hidden
          style={{ color: 'var(--at-accent)', marginInlineEnd: 6, verticalAlign: 'middle' }}
        />
        همهٔ تراکنش‌ها تکمیل شده‌اند.
      </div>
    );
  }

  return (
    <ul className={s.pendingList} aria-label="قدیمی‌ترین تراکنش‌های در انتظار">
      {items.map((p) => {
        const stale = p.ageMinutes > 120; // > 2h
        return (
          <li key={p.id}>
            <Link
              href="/exchange/transactions?status=PENDING"
              className={s.pendingItem}
              aria-label={`${p.customerName ?? 'بدون نام'} — ${p.kind}`}
            >
              <span className={s.pendingDot} data-age={stale ? 'stale' : 'fresh'} aria-hidden />
              <span className={s.pendingMain}>
                <span className={s.pendingName}>{p.customerName ?? 'بدون نام'}</span>
                <span className={s.pendingMeta}>
                  <span className={s.pendingKind}>{TX_KIND_FA[p.kind] ?? p.kind}</span>
                  <span>
                    ایجاد{' '}
                    {new Intl.DateTimeFormat('fa-IR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(p.createdAt))}
                  </span>
                </span>
              </span>
              <span>
                <span className={s.pendingAmount} dir="ltr" style={{ display: 'block' }}>
                  {formatAmount(p.amount, p.currency)}
                </span>
                <span className={s.pendingAge} data-stale={stale ? 'true' : 'false'}>
                  {formatAge(p.ageMinutes)} پیش
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
