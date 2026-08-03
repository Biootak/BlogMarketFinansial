/**
 * 2026-07-28: نوتیفیکیشن به صرافی وقتی درخواستی مستقیماً از صفحه او ثبت می‌شود.
 *
 * مسیر:
 *   1. مشتری روی کارت سرویس کلیک می‌کند → مودال باز می‌شود
 *   2. submit → createServiceRequest با targetExchangeId
 *   3. این helper صدا زده می‌شود
 *   4. → email به ایمیل صرافی + log + (در آینده) تلگرام
 *
 * Design:
 *   - Fire-and-forget — اگر email fail شد، request ثبت شده، فقط log ثبت می‌شود
 *   - Rate limit: یک request منجر به حداکثر ۱ ایمیل می‌شود
 *   - اگر exchange.email null باشد، فقط log می‌شود (پلتفرم باید alert بدهد)
 */

import prisma from '@/lib/db';
import { getEmailProviderAsync } from '@/lib/email';
import { exchangeServiceRequestEmail } from '@/lib/email/templates';

type NotifyArgs = {
  requestId: string;
  trackingCode: string;
  serviceKey: string;
  exchangeId: string;
  customerName: string;
  customerPhone: string;
  amount: string;
  currency: string;
  description: string | null;
  contactMethod: string;
  urgency: string;
};

/**
 * اطلاع‌رسانی به صرافی درباره درخواست جدید.
 * اگر ایمیل exchange موجود نباشد، فقط log می‌شود.
 * هیچ throw نمی‌کند — request ثبت شده، این best-effort است.
 */
export async function notifyExchangeOfServiceRequest(args: NotifyArgs): Promise<void> {
  try {
    // 1) fetch exchange contact
    const exchange = await prisma.exchange.findUnique({
      where: { id: args.exchangeId },
      select: { id: true, name: true, displayName: true, email: true },
    });
    if (!exchange) {
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://financialmarket.page';

    // 2) send email if address exists
    if (exchange.email) {
      try {
        const provider = await getEmailProviderAsync();
        const _result = await provider.send(
          exchangeServiceRequestEmail({
            to: exchange.email,
            exchangeName: exchange.displayName ?? exchange.name,
            customerName: args.customerName,
            customerPhone: args.customerPhone,
            serviceKey: args.serviceKey,
            trackingCode: args.trackingCode,
            amount: args.amount,
            currency: args.currency,
            description: args.description,
            contactMethod: args.contactMethod,
            urgency: args.urgency,
            appUrl,
          }),
        );

        // 3) log success
        await prisma.systemLog.create({
          data: {
            level: 'INFO',
            source: 'ExchangeServiceRequest',
            message: `Notified exchange ${exchange.name} of new request ${args.trackingCode} via email`,
          },
        });
      } catch (emailErr) {
        await prisma.systemLog.create({
          data: {
            level: 'WARN',
            source: 'ExchangeServiceRequest',
            message: `Email to exchange ${exchange.name} failed for request ${args.trackingCode}: ${
              emailErr instanceof Error ? emailErr.message : 'unknown'
            }`,
          },
        });
      }
    } else {
      // بدون ایمیل — فقط log + (آینده) تلگرام
      await prisma.systemLog.create({
        data: {
          level: 'WARN',
          source: 'ExchangeServiceRequest',
          message: `Exchange ${exchange.name} has no email — request ${args.trackingCode} not notified (consider Telegram integration)`,
        },
      });
    }
  } catch (_err) {}
}
