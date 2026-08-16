/**
 * notifications/fintech.ts — Fintech event notification engine
 *
 * Fire-and-forget pattern — never throws to caller.
 * All functions wrap bodies in try/catch and log errors only.
 */

import prisma from '@/lib/db';

/** Escape HTML special characters so user-supplied strings can't inject
 *  tags or links when parse_mode=HTML is used with Telegram's sendMessage. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
    } catch {
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
      // Telegram API error — fire-and-forget, no crash
    }
  } catch {
    // network failure — fire-and-forget
  }
}

export async function notifyDealStatusChange(deal: DealInfo, newStatus: string): Promise<void> {
  try {
    const label = DEAL_STATUS_FA[newStatus] ?? newStatus;
    const msg = `📊 <b>تغییر وضعیت معامله</b>\n🔑 کد: <code>${escapeHtml(deal.trackingCode)}</code>\n📌 وضعیت: ${label}\n👤 مشتری: ${escapeHtml(deal.customerName)}\n💱 ${escapeHtml(deal.fromAmount)} ${escapeHtml(deal.fromCurrency)} → ${escapeHtml(deal.toAmount)} ${escapeHtml(deal.toCurrency)}\n🏢 صرافی: ${escapeHtml(deal.exchangeName)}`;
    await sendTelegram(msg);
  } catch {
    // fire-and-forget — notification failure must never crash the caller
  }
}

export async function notifyNewDeal(deal: DealInfo): Promise<void> {
  try {
    const msg = `🆕 <b>معامله جدید</b>\n🔑 <code>${escapeHtml(deal.trackingCode)}</code>\n👤 ${escapeHtml(deal.customerName)} — ${escapeHtml(deal.customerPhone)}\n💱 ${escapeHtml(deal.fromAmount)} ${escapeHtml(deal.fromCurrency)}`;
    await sendTelegram(msg);
  } catch {
    // fire-and-forget
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
