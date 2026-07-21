/**
 * fraud/rules.ts — Fraud detection rules for fintech transactions
 *
 * All rules run in Promise.all() for performance.
 * shouldBlock = score >= 70
 * shouldHold  = score >= 40 && !shouldBlock
 */

import prisma from '@/lib/db';

export type FraudRisk = {
  score: number;
  reasons: string[];
  shouldBlock: boolean;
  shouldHold: boolean;
};

export async function assessTransactionRisk(params: {
  customerId: string;
  exchangeId: string;
  amount: bigint;
  currency: string;
  ip?: string;
  deviceId?: string;
  kind: string;
}): Promise<FraudRisk> {
  const { customerId, amount, kind } = params;
  const now = new Date();
  const reasons: string[] = [];
  let score = 0;

  const [velocityCount, duplicateTx, customer, failCount] = await Promise.all([
    // Rule 1: velocity — > 5 tx in last 10 minutes
    prisma.transaction.count({
      where: {
        customerId,
        createdAt: { gte: new Date(now.getTime() - 10 * 60 * 1000) },
      },
    }),
    // Rule 3: duplicate — same customerId + amount + currency in last 5 minutes
    prisma.transaction.count({
      where: {
        customerId,
        amount,
        currency: params.currency,
        createdAt: { gte: new Date(now.getTime() - 5 * 60 * 1000) },
      },
    }),
    // Rule 4: new customer check
    prisma.customer.findUnique({
      where: { id: customerId },
      select: { createdAt: true },
    }),
    // Rule 5: multiple failures in last 24h
    prisma.transaction.count({
      where: {
        customerId,
        status: 'FAILED',
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  if (velocityCount > 5) {
    score += 40;
    reasons.push(`VELOCITY_TRANSACTIONS:${velocityCount}`);
  }
  if (kind === 'WITHDRAWAL' && amount > BigInt(1_000_000)) {
    score += 30;
    reasons.push('HIGH_AMOUNT_WITHDRAWAL');
  }
  if (duplicateTx > 0) {
    score += 60;
    reasons.push('DUPLICATE_TRANSACTION');
  }
  if (
    customer &&
    now.getTime() - customer.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000 &&
    amount > BigInt(500_000)
  ) {
    score += 25;
    reasons.push('NEW_CUSTOMER_HIGH_VALUE');
  }
  if (failCount > 3) {
    score += 35;
    reasons.push(`MULTIPLE_FAILURES:${failCount}`);
  }

  return {
    score,
    reasons,
    shouldBlock: score >= 70,
    shouldHold: score >= 40 && score < 70,
  };
}
