'use server';

/**
 * ledger-actions — کاوشگر دفتر کل پلتفرم (ادمین).
 *
 * مدل LedgerEntry از ابتدای فین‌تک وجود داشت اما فقط مشتری در پنل خودش
 * لجر می‌دید؛ ادمین هیچ دید سراسری نداشت. این ماژول فراهم می‌کند:
 *   - لیست صفحه‌بندی‌شده با فیلتر (صرافی، ارز، جهت، بازهٔ زمانی)
 *   - جمع کل اعتبار/بدهیِ فیلتر جاری برای نوار KPI
 *   - کاوش با دکمهٔ «بارگذاری بیشتر»
 */

import prisma from '@/lib/db';
import { authFailureToActionResult, requireAdmin } from '@/lib/require-auth';
import type { ActionResult } from '@/types/types';
import { LEDGER_CURRENCIES } from './ledger-constants';

export type LedgerDirection = 'DEBIT' | 'CREDIT';

export type LedgerRow = {
  id: string;
  direction: LedgerDirection;
  amount: string;
  currency: string;
  runningBalance: string;
  description: string | null;
  createdAt: Date;
  time: string;
  exchangeId: string;
  exchangeName: string;
  customerName: string | null;
  accountLabel: string | null;
  txnId: string | null;
};

export type LedgerFilters = {
  exchangeId?: string;
  currency?: string;
  direction?: 'DEBIT' | 'CREDIT' | 'ALL';
  from?: string; // ISO date
  to?: string; // ISO date
  query?: string; // جستجو در توضیحات / نام مشتری / شماره تراکنش
};

export type LedgerListResult = ActionResult<{
  rows: LedgerRow[];
  total: number;
  creditTotal: string;
  debitTotal: string;
  creditCount: number;
  debitCount: number;
}>;

/** تبدیل فیلترها به where پرایزما. */
function buildWhere(filters: LedgerFilters = {}) {
  const where: Record<string, unknown> = {};

  if (filters.exchangeId) where.exchangeId = filters.exchangeId;
  if (filters.currency && LEDGER_CURRENCIES.includes(filters.currency))
    where.currency = filters.currency;
  if (filters.direction && filters.direction !== 'ALL') where.direction = filters.direction;

  const timeClauses: Record<string, unknown>[] = [];
  if (filters.from && !Number.isNaN(Date.parse(filters.from))) {
    timeClauses.push({ createdAt: { gte: new Date(filters.from) } });
  }
  if (filters.to && !Number.isNaN(Date.parse(filters.to))) {
    timeClauses.push({ createdAt: { lte: new Date(filters.to) } });
  }
  if (timeClauses.length > 0) where.AND = timeClauses;

  if (filters.query?.trim()) {
    const q = filters.query.trim();
    const searchClauses: Record<string, unknown>[] = [
      { description: { contains: q, mode: 'insensitive' } },
      { txnId: { contains: q, mode: 'insensitive' } },
      { Customer: { is: { fullName: { contains: q, mode: 'insensitive' } } } },
      { FintechAccount: { is: { label: { contains: q, mode: 'insensitive' } } } },
      { Exchange: { is: { name: { contains: q, mode: 'insensitive' } } } },
    ];
    if (where.AND) {
      where.AND = [...(where.AND as Record<string, unknown>[]), { OR: searchClauses }];
    } else {
      where.OR = searchClauses;
    }
  }

  return where;
}

/** لیست صفحه‌بندی‌شدهٔ دفتر کل + جمع فیلتر جاری. */
export async function getLedgerEntries(
  filters: LedgerFilters = {},
  options: { limit?: number; offset?: number } = {},
): Promise<LedgerListResult> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const limit = Math.min(options.limit ?? 40, 100);
    const offset = options.offset ?? 0;
    const where = buildWhere(filters);

    const [rows, total, sums] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          Exchange: { select: { name: true } },
          Customer: { select: { fullName: true } },
          FintechAccount: { select: { label: true } },
        },
      }),
      prisma.ledgerEntry.count({ where }),
      prisma.ledgerEntry.groupBy({
        by: ['direction'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const credit = sums.find((s) => s.direction === 'CREDIT');
    const debit = sums.find((s) => s.direction === 'DEBIT');

    return {
      success: true,
      message: 'رکوردهای دفتر کل بازیابی شدند',
      data: {
        rows: rows.map((e) => ({
          id: e.id,
          direction: e.direction as LedgerDirection,
          amount: e.amount.toString(),
          currency: e.currency,
          runningBalance: e.runningBalance.toString(),
          description: e.description,
          createdAt: e.createdAt,
          time: e.createdAt.toLocaleString('fa-IR'),
          exchangeId: e.exchangeId,
          exchangeName: e.Exchange.name,
          customerName: e.Customer?.fullName ?? null,
          accountLabel: e.FintechAccount?.label ?? null,
          txnId: e.txnId,
        })),
        total,
        creditTotal: credit?._sum.amount?.toString() ?? '0',
        debitTotal: debit?._sum.amount?.toString() ?? '0',
        creditCount: credit?._count ?? 0,
        debitCount: debit?._count ?? 0,
      },
    };
  } catch {
    return { success: false, message: 'خطا در بارگذاری دفتر کل' };
  }
}

/** لیست صرافی‌ها برای فیلتر — فقط id و name. */
export async function getLedgerExchanges(): Promise<ActionResult<{ id: string; name: string }[]>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const exchanges = await prisma.exchange.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    return { success: true, message: 'صرافی‌ها بارگذاری شدند', data: exchanges };
  } catch {
    return { success: false, message: 'خطا در بارگذاری صرافی‌ها' };
  }
}
