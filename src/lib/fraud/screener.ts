/**
 * fraud/screener.ts — High-level fraud screener
 *
 * Assesses risk and persists FraudReview when triggered.
 * Never throws to caller — all errors logged internally.
 */

import prisma from '@/lib/db';
import { serverLog } from '@/lib/server-logger';
import { v4 as createId } from 'uuid';
import { type FraudRisk, assessTransactionRisk } from './rules';

type ScreenParams = Parameters<typeof assessTransactionRisk>[0];

export async function screenTransaction(params: ScreenParams): Promise<FraudRisk> {
  const risk = await assessTransactionRisk(params);

  if (risk.shouldBlock || risk.shouldHold) {
    await createFraudReview({
      exchangeId: params.exchangeId,
      customerId: params.customerId,
      riskScore: risk.score,
      reasons: risk.reasons,
    }).catch((error) => {
      serverLog.error('fraud', 'screen-transaction-review-failed', error);
    });
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
  } catch (error) {
    // DB write failure must not crash caller — but a fraud review that never
    // reaches the queue is a blocked/held transaction nobody will look at, so
    // it has to be visible in SystemLog + Sentry.
    serverLog.error('fraud', 'create-fraud-review-failed', error);
  }
}
