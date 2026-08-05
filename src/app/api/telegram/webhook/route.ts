import {
  consumeTelegramLinkToken,
  isTelegramWebhookSecretValid,
  sendTelegramMessage,
} from '@/lib/telegram';
import { NextResponse } from 'next/server';

/**
 * POST /api/telegram/webhook — دریافت update های Bot API
 *
 * فقط payload های `/start link_<token>` پردازش می‌شوند (اتصال تلگرام).
 * امنیت:
 *   - secret header الزامی (fail-closed) — از Bot API setWebhook بگذار:
 *     curl -F "url=https://market-finansial.vercel.app/api/telegram/webhook" \
 *          -F "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
 *          https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook
 *   - همیشه 200 برمی‌گردانیم تا تلگرام retry نکند (خطاها لاگ/پیام می‌شوند)
 */

interface TelegramUpdate {
  message?: {
    chat?: { id: number };
    text?: string;
  };
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  if (!isTelegramWebhookSecretValid(secret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim() ?? '';

  if (chatId !== undefined && text.startsWith('/start link_')) {
    const token = text.split(' ')[0] ?? '';
    const result = await consumeTelegramLinkToken(token, String(chatId));

    const replies: Record<string, string> = {
      ok: '✅ حساب شما با موفقیت به تلگرام متصل شد.\nاز این پس کدهای تأیید (OTP) به همین گفتگو ارسال می‌شوند.',
      'not-found': '❌ لینک اتصال نامعتبر است. از صفحه سایت دوباره «اتصال تلگرام» را بزنید.',
      used: '❌ این لینک قبلاً استفاده شده است. از صفحه سایت لینک جدید بگیرید.',
      expired: '❌ لینک اتصال منقضی شده است (۱۵ دقیقه). از صفحه سایت دوباره تلاش کنید.',
      'chat-linked': '❌ این گفتگوی تلگرام قبلاً به حساب دیگری متصل شده است.',
      'db-error': '❌ خطای سرور رخ داد. لطفاً دوباره تلاش کنید.',
    };

    await sendTelegramMessage(
      String(chatId),
      replies[result.ok ? 'ok' : result.reason] ?? replies['db-error'],
    );
  }

  return NextResponse.json({ ok: true });
}
