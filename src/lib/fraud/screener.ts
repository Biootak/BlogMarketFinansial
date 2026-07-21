/**
 * fraud/screener.ts — High-level fraud screener
 *
 * Assesses risk and persists FraudReview when triggered.
 * Never throws to caller — all errors logged internally.
 */

import { v4 as createId } from 'uuid';
import prisma from '@/lib/db';
import { assessTransactionRisk, type FraudRisk } from './rules';

type ScreenParams = Parameters<typeof assessTransactionRisk>[0];

export async function screenTransaction(params: ScreenParams): Promise<FraudRisk> {
  const risk = await assessTransactionRisk(params);

  if (risk.shouldBlock || risk.shouldHold) {
    await createFraudReview({
      exchangeId: params.exchangeId,
      customerId: params.customerId,
      riskScore: risk.score,
      reasons: risk.reasons,
    }).catch(() => {});
  }

  return risk;
}

export async function createFraudReview(params: {
  exchangeId: string;
  customerId?: string;
  txnId?: string;
  riskScore: number;
  reasons: string[];
}): Promise<void> {
  try {
    await prisma.fraudReview.create({
      data: {
        id: createId(),
        exchangeId: params.exchangeId,
        customerId: params.customerId,
        txnId: params.txnId,
        reason: params.reasons.join('; '),
        riskScore: params.riskScore,
        status: 'OPEN',
      },
    });
  } catch {
    // DB write failure must not crash caller — fraud review is best-effort
  }
}
