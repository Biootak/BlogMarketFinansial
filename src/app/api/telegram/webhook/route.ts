import prisma from '@/lib/db';
import { autoVerifyPhoneFromTelegram } from '@/lib/phone-kyc';
import {
  answerTelegramCallback,
  consumeTelegramLinkToken,
  editTelegramMessage,
  getPortalUrl,
  isTelegramWebhookSecretValid,
  sendTelegramMessage,
} from '@/lib/telegram';
import { after } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/telegram/webhook — دریافت update های Bot API
 *
 * ⚡ سرعت: این هندلر بلافاصله 200 به تلگرام برمی‌گرداند (پاسخ فوری) و پردازش
 * واقعی (DB + ارسال پیام) را با after() بعد از پاسخ اجرا می‌کند. نتیجه:
 *   - تلگرام هیچ‌وقت update ها را پشت سر هم صف نمی‌کند و retry نمی‌زند
 *   - یک update کند/خطادار بقیه را بلاک نمی‌کند
 *   - کوئری‌های DB به حداقل رسیده (consume خروجی pendingPhone می‌دهد،
 *     autoVerify کاربر از قبل‌خوانده‌شده می‌گیرد — نه کوئری تکراری)
 *
 * جریان‌ها:
 *   ۱. `/start link_<token>` — اتصال تلگرام به حساب سایت؛ از.id ذخیره می‌شود و
 *      اگر شماره‌ای در انتظار تأیید باشد، دکمهٔ «ارسال شماره تماس» فرستاده می‌شود.
 *   ۲. `message.contact` — تأیید خودکار فقط وقتی انجام می‌شود که:
 *        a. contact.user_id برابر telegramUserId ثبت‌شده باشد
 *        b. شمارهٔ تلگرام با pendingPhone یکی باشد (E.164)
 *        c. مشتری FROZEN/CLOSED نباشد
 *   ۳. `callback_query` — منوی اینلاین: وضعیت حساب / راهنما / پورتال
 *   ۴. `/start`، `/help`، `/status` — راهنما و وضعیت حساب
 *
 * امنیت: secret header الزامی (fail-closed) + توکن یک‌بارمصرف + انقضا ۱۵ دقیقه.
 */

interface TelegramUpdate {
  message?: {
    chat?: { id: number };
    text?: string;
    from?: { id?: number };
    contact?: { phone_number?: string; user_id?: number };
  };
  callback_query?: {
    id: string;
    message?: { chat?: { id: number }; message_id?: number };
    data?: string;
  };
}

const BOT_NAME = 'Financial Market';
const BOT_TAGLINE = 'دستیار رسمی حساب شما';

const PORTAL_BTN = { text: '🌐 باز کردن پورتال', url: getPortalUrl('/customer/dashboard') };

/** منوی اصلی ربات — دکمه‌های اینلاین (سبک، بدون ارسال پیام اضافه) */
const MENU_KEYBOARD = [
  [PORTAL_BTN],
  [
    { text: '📊 وضعیت حساب', callback_data: 'status' },
    { text: '📖 راهنما', callback_data: 'help' },
  ],
];

function welcomeMessage(): string {
  return (
    `✨ <b>${BOT_NAME}</b>\n${BOT_TAGLINE}\n\n` +
    `سلام 👋 خوش آمدید.\n\n` +
    `این دستیار برای <b>تأیید امن هویت</b>، دریافت کدهای امنیتی و اطلاع‌رسانی حساب شما طراحی شده است — در هر کجای جهان.\n\n` +
    `🔍 <b>دستورات:</b>\n` +
    `/start — شروع مجدد اتصال\n` +
    `/status — وضعیت حساب\n` +
    `/help — راهنما\n\n` +
    `🔐 امنیت: شمارهٔ شما با شمارهٔ حساب مقایسه و فقط در صورت تطابق تأیید می‌شود.`
  );
}

function helpMessage(): string {
  return (
    `📖 <b>راهنمای ${BOT_NAME}</b>\n\n` +
    `1️⃣ از <b>پورتال حساب</b> روی «اتصال تلگرام» بزنید\n` +
    `2️⃣ لینک را باز کرده و دکمهٔ <b>Start</b> را بزنید\n` +
    `3️⃣ برای تأیید خودکار شماره، دکمهٔ <b>«ارسال شماره تماس»</b> را لمس کنید\n\n` +
    `💡 نکته: شمارهٔ تلگرام شما باید با شماره‌ای که در حساب وارد کرده‌اید یکی باشد.\n\n` +
    `دستورات: /start · /status · /help`
  );
}

/** وضعیت حساب + احراز هویت از DB */
async function statusMessage(chatId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramChatId: chatId },
      select: {
        email: true,
        pendingPhone: true,
        Customer: { select: { kycLevel: true, kycStatus: true, phone: true } },
      },
    });
    if (!user) {
      return `⚠️ حساب شما هنوز به تلگرام متصل نشده است.\n\nاز <b>پورتال حساب</b> روی «اتصال تلگرام» بزنید و سپس /start را اجرا کنید.`;
    }

    const levelFa: Record<string, string> = {
      NONE: 'بدون تأیید',
      LEVEL_1: 'سطح ۱ — موبایل و تلگرام',
      LEVEL_2: 'سطح ۲ — مدرک و سلفی',
      LEVEL_3: 'سطح ۳ — آدرس و صورتحساب',
    };
    const statusFa: Record<string, string> = {
      NOT_STARTED: 'شروع نشده',
      PENDING: 'در حال بررسی',
      APPROVED: 'تأیید شده ✅',
      REJECTED: 'رد شده ❌',
    };

    return (
      `📊 <b>وضعیت حساب</b>\n\n` +
      `👤 حساب: <code>${user.email}</code>\n` +
      `🏅 سطح امنیت: <b>${levelFa[user.Customer?.kycLevel ?? 'NONE'] ?? '—'}</b>\n` +
      `📋 وضعیت: ${statusFa[user.Customer?.kycStatus ?? 'NOT_STARTED'] ?? '—'}\n` +
      (user.pendingPhone ? `⏳ شماره در انتظار تأیید: <code>${user.pendingPhone}</code>\n` : '')
    );
  } catch {
    return '⚠️ خطا در دریافت وضعیت. لطفاً دوباره تلاش کنید.';
  }
}

/** دکمه‌های اینلاین → ویرایش پیام همان‌جا (بدون اسپم پیام جدید) */
async function handleCallback(
  cb: NonNullable<TelegramUpdate['callback_query']>,
): Promise<void> {
  const chat = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  if (chat === undefined || messageId === undefined) return;
  const chatStr = String(chat);
  const data = cb.data ?? '';

  if (data === 'status') {
    await answerTelegramCallback(cb.id);
    const msg = await statusMessage(chatStr);
    await editTelegramMessage(chatStr, messageId, msg, {
      inlineKeyboard: MENU_KEYBOARD,
    });
  } else if (data === 'help') {
    await answerTelegramCallback(cb.id);
    await editTelegramMessage(chatStr, messageId, helpMessage(), {
      inlineKeyboard: MENU_KEYBOARD,
    });
  } else {
    await answerTelegramCallback(cb.id, 'دستور نامعتبر');
  }
}

/** پردازش واقعی update — بعد از پاسخ 200 اجرا می‌شود */
async function processUpdate(update: TelegramUpdate): Promise<void> {
  try {
    // ── جریان ۳: callback_query (منوی دکمه‌ای) ────────────────────────────
    if (update.callback_query?.id) {
      await handleCallback(update.callback_query);
      return;
    }

    const chatId = update.message?.chat?.id;
    const text = update.message?.text?.trim() ?? '';
    const fromId =
      update.message?.from?.id !== undefined ? String(update.message.from.id) : undefined;
    if (chatId === undefined) return;
    const chat = String(chatId);

    // ── جریان ۱: /start link_<token> — اتصال تلگرام ──────────────────────
    if (text.startsWith('/start link_')) {
      const token = text.replace(/^\/start\s+/, '').trim();
      const result = await consumeTelegramLinkToken(token, chat, fromId);

      if (!result.ok) {
        const replies: Record<string, string> = {
          'not-found': '❌ لینک اتصال نامعتبر است.\nاز صفحه سایت دوباره «اتصال تلگرام» را بزنید.',
          used: '❌ این لینک قبلاً استفاده شده است.\nاز صفحه سایت لینک جدید بگیرید.',
          expired:
            '⏰ لینک اتصال منقضی شده است (۱۵ دقیقه).\nاز صفحه سایت دوباره «اتصال تلگرام» را بزنید.',
          'chat-linked':
            '❌ این گفتگوی تلگرام قبلاً به حساب دیگری متصل شده است.\nبرای تغییر حساب، از پورتال کمک بگیرید.',
          'db-error': '❌ خطای سرور رخ داد. لطفاً دوباره تلاش کنید.',
        };
        await sendTelegramMessage(chat, replies[result.reason] ?? replies['db-error']);
        return;
      }

      await sendTelegramMessage(
        chat,
        `✅ <b>اتصال موفق</b>\n\n` +
          `حساب تلگرام شما با موفقیت به <b>${BOT_NAME}</b> متصل شد.\n` +
          `از این پس کدهای امنیتی و اعلان‌های حساب به همین گفتگو ارسال می‌شوند.`,
        { inlineKeyboard: MENU_KEYBOARD },
      );

      // اگر شماره‌ای در انتظار تأیید است → دکمهٔ ارسال شماره تماس (با نمایش حساب)
      // consume خروجی pendingPhone را همان‌جا داده — کوئری جداگانه نمی‌زنیم.
      if (result.pendingPhone) {
        const account = result.accountName || 'حساب کاربری شما';
        await sendTelegramMessage(
          chat,
          `🛡️ <b>${BOT_NAME}</b> — تأیید امن هویت\n\n` +
            `👤 حساب: <code>${account}</code>\n` +
            `📱 شماره: <code>${result.pendingPhone}</code>\n\n` +
            `اگر این حساب و شماره متعلق به <b>شما</b> است، دکمهٔ زیر را بزنید تا شماره به‌صورت خودکار و بدون کد تأیید شود. 🔐`,
          { requestContact: true },
        );
      }
      return;
    }

    // ── جریان ۲: /start بدون لینک ────────────────────────────────────────
    if (text === '/start') {
      await sendTelegramMessage(chat, welcomeMessage(), { inlineKeyboard: MENU_KEYBOARD });
      return;
    }

    // ── جریان ۳: /help ───────────────────────────────────────────────────
    if (text === '/help') {
      await sendTelegramMessage(chat, helpMessage(), { inlineKeyboard: MENU_KEYBOARD });
      return;
    }

    // ── جریان ۴: /status ─────────────────────────────────────────────────
    if (text === '/status') {
      const msg = await statusMessage(chat);
      await sendTelegramMessage(chat, msg, { inlineKeyboard: MENU_KEYBOARD });
      return;
    }

    // ── جریان ۵: message.contact — تأیید خودکار شماره (بدون OTP) ──────────
    const contactPhone = update.message?.contact?.phone_number;
    const contactUserId =
      update.message?.contact?.user_id !== undefined
        ? String(update.message.contact.user_id)
        : undefined;
    if (contactPhone) {
      // یک کوئری: کاربر با chatId + همهٔ فیلدهای لازم (autoVerify کوئری دوم نمی‌زند)
      const user = await prisma.user.findUnique({
        where: { telegramChatId: chat },
        select: {
          id: true,
          pendingPhone: true,
          telegramUserId: true,
          Customer: { select: { id: true, exchangeId: true, kycLevel: true, status: true } },
        },
      });

      if (user) {
        const result = await autoVerifyPhoneFromTelegram(user.id, contactPhone, {
          tgUserId: contactUserId,
          preloadedUser: user,
        });

        const msgs: Record<string, string> = {
          ok: `✅ <b>هویت شما تأیید شد</b>\n\n📱 شماره: <code>${contactPhone}</code>\n🏅 سطح امنیت حساب: <b>سطح ۱</b>\n\nمرحلهٔ بعدی (مدرک و سلفی) در پورتال شما فعال شده است.`,
          'no-pending':
            'ℹ️ شماره‌ای در انتظار تأیید نیست.\nبرای تأیید شماره، از پورتال حساب دوباره درخواست بدهید.',
          mismatch:
            '❌ <b>تأیید نشد</b>\n\nشمارهٔ تلگرام شما با شماره‌ای که در حساب وارد کرده‌اید یکی نیست.\nلطفاً در پورتال همان شمارهٔ تلگرام خود را وارد کنید و دوباره تلاش کنید.',
          'telegram-identity-mismatch':
            '❌ این شماره از حساب تلگرام دیگری ارسال شده است.\nلطفاً با همان تلگرامی که Start زده‌اید دوباره تلاش کنید.',
          'account-blocked':
            '⛔ حساب شما مسدود است و امکان تأیید شماره وجود ندارد.\nبا پشتیبانی تماس بگیرید.',
          'no-customer': '❌ حساب مشتری برای این کاربر پیدا نشد. با پشتیبانی تماس بگیرید.',
          'already-verified': 'ℹ️ شمارهٔ شما قبلاً تأیید شده است. ✅',
          'db-error': '❌ خطای سرور رخ داد. لطفاً دوباره تلاش کنید.',
        };
        await sendTelegramMessage(
          chat,
          msgs[result.ok ? 'ok' : result.reason] ?? msgs['db-error'],
          result.ok
            ? {
                inlineKeyboard: [
                  [{ text: '🚀 ادامه احراز هویت', url: getPortalUrl('/customer/kyc') }],
                  [PORTAL_BTN],
                ],
              }
            : undefined,
        );
      }
    }
  } catch {
    // best-effort — هرگز به بیرون throw نمی‌کنیم؛ تلگرام retry نمی‌زند
  }
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

  // ⚡ پاسخ فوری 200 — پردازش بعد از پاسخ (after)؛ خارج از request scope (تست‌ها)
  // همان‌جا اجرا می‌شود تا رفتار قبلی حفظ شود.
  try {
    after(() => processUpdate(update));
  } catch {
    void processUpdate(update);
  }
  return NextResponse.json({ ok: true });
}
