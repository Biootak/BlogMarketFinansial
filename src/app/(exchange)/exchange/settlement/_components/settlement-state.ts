/**
 * settlement-state.ts — shared types + lookups برای settlement components.
 *
 * Client-safe: فقط type و constant — هیچ server-only dependency ندارد.
 */

export type SettlementStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';

import type { SettlementRow as ServerSettlementRow } from '@/actions/settlement';

export type SettlementRow = ServerSettlementRow;

export const STATUS_META: Record<
  string,
  { label: string; tone: 'emerald' | 'amber' | 'violet' | 'muted' }
> = {
  PENDING: { label: 'در انتظار', tone: 'amber' },
  APPROVED: { label: 'تأیید شده', tone: 'violet' },
  PAID: { label: 'پرداخت شده', tone: 'emerald' },
  CANCELLED: { label: 'لغو شده', tone: 'muted' },
};
