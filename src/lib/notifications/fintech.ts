/**
 * notifications/fintech.ts — Fintech event notification engine
 *
 * Fire-and-forget pattern — never throws to caller.
 * All functions wrap bodies in try/catch and log errors only.
 */

import prisma from '@/lib/db';
import { serverLog } from '@/lib/server-logger';

interface DealInfo {
  trackingCode: string;
  customerName: string;
  customerPhone: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  status: string;
  exchangeName: string;
}

const DEAL_STATUS_FA: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  CONFIRMED: '✅ تأیید شد',
  PROCESSING: '🔄 در حال انجام',
  COMPLETED: '✅ تکمیل شد',
  CANCELLED: '❌ لغو شد',
  DISPUTED: '⚠️ مورد اختلاف',
  REFUNDED: '↩️ برگشت داده شد',
};

async function sendTelegram(message: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  let chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!chatId) {
    try {
      const settings = await prisma.systemSettings.findFirst({
        select: { telegram: true },
      });
      chatId = settings?.telegram ?? undefined;
    } catch (error) {
      serverLog.error('notifications/fintech', 'telegram-chat-id-lookup-failed', error);
      return;
    }
  }
  if (!chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    if (!res.ok) {
      serverLog.warn('notifications/fintech', 'telegram-send-rejected', {
        status: res.status,
        body: (await res.text().catch(() => '')).slice(0, 200),
      });
    }
  } catch (error) {
    serverLog.error('notifications/fintech', 'telegram-send-failed', error);
  }
}

export async function notifyDealStatusChange(deal: DealInfo, newStatus: string): Promise<void> {
  try {
    const label = DEAL_STATUS_FA[newStatus] ?? newStatus;
    const msg = `📊 <b>تغییر وضعیت معامله</b>\n🔑 کد: <code>${deal.trackingCode}</code>\n📌 وضعیت: ${label}\n👤 مشتری: ${deal.customerName}\n💱 ${deal.fromAmount} ${deal.fromCurrency} → ${deal.toAmount} ${deal.toCurrency}\n🏢 صرافی: ${deal.exchangeName}`;
    await sendTelegram(msg);
  } catch (error) {
    // fire-and-forget — notification failure must never crash the caller
    serverLog.error('notifications/fintech', 'notify-deal-status-change-failed', error);
  }
}

export async function notifyNewDeal(deal: DealInfo): Promise<void> {
  try {
    const msg = `🆕 <b>معامله جدید</b>\n🔑 <code>${deal.trackingCode}</code>\n👤 ${deal.customerName} — ${deal.customerPhone}\n💱 ${deal.fromAmount} ${deal.fromCurrency}`;
    await sendTelegram(msg);
  } catch (error) {
    // fire-and-forget
    serverLog.error('notifications/fintech', 'notify-new-deal-failed', error);
  }
}

export async function notifyKycStatusChange(
  _userId: string,
  _status: 'APPROVED' | 'REJECTED',
  _reason?: string,
): Promise<void> {
  // Email notification: TBD when email infrastructure is configured
  // KYC status change is logged by the auth system via audit trail
}
