import prisma from '@/lib/db';
import { formatFaNumber } from '@/lib/fa-number';
import { autoVerifyPhoneFromTelegram } from '@/lib/phone-kyc';
import {
  answerTelegramCallback,
  consumeTelegramLinkToken,
  editTelegramMessage,
  formatTelegramPhone,
  getPortalUrl,
  isTelegramWebhookSecretValid,
  sendTelegramChatAction,
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

/** پیام /start وقتی چت قبلاً به حساب دیگری وصل است — دکمهٔ ارسال شماره برای انتقال امن */
const CHAT_LINKED_RELINK_MESSAGE =
  '🔄 <b>این گفتگو به حساب دیگری متصل است</b>\n\nاگر این حساب و شمارهٔ تلگرام متعلق به <b>خود شما</b> است (شمارهٔ یکسان)، دکمهٔ «ارسال شماره تماس» را بزنید — انتقال فقط با تطبیق شماره انجام می‌شود.';

const PORTAL_BTN = { text: '🌐 باز کردن پورتال', url: getPortalUrl('/customer/dashboard') };

/** منوی اصلی ربات — دکمه‌های اینلاین (سبک، بدون ارسال پیام اضافه) */
const MENU_KEYBOARD = [
  [PORTAL_BTN],
  [
    { text: '📊 وضعیت حساب', callback_data: 'status' },
    { text: '📖 راهنما', callback_data: 'help' },
  ],
];

/** کیبورد وضعیت حساب — مطابق طراحی: پورتال + بروزرسانی + راهنما */
const STATUS_KEYBOARD = [
  [PORTAL_BTN],
  [
    { text: '🔄 بروزرسانی', callback_data: 'refresh' },
    { text: '📖 راهنما', callback_data: 'help' },
  ],
];

/** دکمهٔ پورتال به‌تنهایی — برای پیام‌های خطا (طراحی: اسکرین‌های ۶ و ۷) */
const PORTAL_KEYBOARD = [[PORTAL_BTN]];

function welcomeMessage(): string {
  return `✨ <b>${BOT_NAME}</b>\n${BOT_TAGLINE}\n\nسلام 👋 خوش آمدید.\n\nاین دستیار برای <b>تأیید امن هویت</b>، دریافت کدهای امنیتی و اطلاع‌رسانی حساب شما طراحی شده است — در هر کجای جهان.\n\n🔍 <b>دستورات:</b>\n/start — شروع مجدد اتصال\n/status — وضعیت حساب\n/help — راهنما\n\n🔐 امنیت: شمارهٔ شما با شمارهٔ حساب مقایسه و فقط در صورت تطابق تأیید می‌شود.`;
}

function helpMessage(): string {
  return `📖 <b>راهنمای ${BOT_NAME}</b>\n\n1️⃣ از <b>پورتال حساب</b> روی «اتصال تلگرام» بزنید\n2️⃣ لینک را باز کرده و دکمهٔ <b>Start</b> را بزنید\n3️⃣ برای تأیید خودکار شماره، دکمهٔ <b>«ارسال شماره تماس»</b> را لمس کنید\n\n💡 نکته: شمارهٔ تلگرام شما باید با شماره‌ای که در حساب وارد کرده‌اید یکی باشد.\n\nدستورات: /start · /status · /help`;
}

/** وضعیت حساب + احراز هویت از DB — مطابق طراحی (اسکرین ۴): سطح، پیشرفت و مرحلهٔ بعد */
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
      return '⚠️ حساب شما هنوز به تلگرام متصل نشده است.\n\nاز <b>پورتال حساب</b> روی «اتصال تلگرام» بزنید و سپس /start را اجرا کنید.';
    }

    const level = user.Customer?.kycLevel ?? 'NONE';
    const levelFa: Record<string, string> = {
      NONE: 'بدون تأیید',
      LEVEL_1: 'سطح ۱',
      LEVEL_2: 'سطح ۲',
      LEVEL_3: 'سطح ۳',
    };
    const statusFa: Record<string, string> = {
      NOT_STARTED: 'شروع نشده',
      PENDING: 'در حال بررسی',
      APPROVED: '✅ تأیید شده',
      REJECTED: 'رد شده ❌',
      EXPIRED: 'منقضی شده',
    };

    // پیشرفت احراز هویت: ۳ سطح → نوار ▰▱▱ + درصد (طراحی: ۳۳٪ برای سطح ۱)
    const stepIndex: Record<string, number> = { NONE: 0, LEVEL_1: 1, LEVEL_2: 2, LEVEL_3: 3 };
    const steps = stepIndex[level] ?? 0;
    const stepsBar = '▰'.repeat(steps) + '▱'.repeat(3 - steps);
    const pct = Math.round((steps / 3) * 100);

    const nextStep: Record<string, string> = {
      NONE: 'مرحلهٔ بعد: تأیید شماره موبایل (سطح ۱)',
      LEVEL_1: 'مرحلهٔ بعد: مدرک و سلفی (سطح ۲)',
      LEVEL_2: 'مرحلهٔ بعد: آدرس و صورتحساب (سطح ۳)',
      LEVEL_3: '🎉 احراز هویت کامل — همهٔ سطح‌ها تأیید شده',
    };

    return `📊 <b>وضعیت حساب</b>\n\n👤 حساب: <code>${user.email}</code>\n🏅 سطح امنیت: <b>${levelFa[level] ?? '—'}</b>\n📋 وضعیت: ${statusFa[user.Customer?.kycStatus ?? 'NOT_STARTED'] ?? '—'}\n\n${stepsBar}  ${formatFaNumber(pct)}٪ — سطح ${formatFaNumber(steps)} از ۳\n${nextStep[level] ?? ''}\n${
      user.pendingPhone
        ? `\n⏳ شماره در انتظار تأیید: <code>${formatTelegramPhone(user.pendingPhone)}</code>`
        : ''
    }`;
  } catch {
    return '⚠️ خطا در دریافت وضعیت. لطفاً دوباره تلاش کنید.';
  }
}

/** دکمه‌های اینلاین → ویرایش پیام همان‌جا (بدون اسپم پیام جدید) */
async function handleCallback(cb: NonNullable<TelegramUpdate['callback_query']>): Promise<void> {
  const chat = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  if (chat === undefined || messageId === undefined) return;
  const chatStr = String(chat);
  const data = cb.data ?? '';

  if (data === 'status' || data === 'refresh') {
    // «بروزرسانی» همان پیام را دوباره از DB می‌خواند و در همان‌جا ویرایش می‌کند
    if (data === 'refresh') await answerTelegramCallback(cb.id, 'به‌روزرسانی شد ✅');
    else await answerTelegramCallback(cb.id);
    const msg = await statusMessage(chatStr);
    await editTelegramMessage(chatStr, messageId, msg, {
      inlineKeyboard: STATUS_KEYBOARD,
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
        // 2026-08-15: چت قبلاً به حساب دیگری وصل است → جریان انتقال امن.
        // توکن burn نشده (relinkChatId ست شده)؛ با دکمهٔ «ارسال شماره تماس»،
        // شمارهٔ تلگرام با شمارهٔ حساب مقصد تطبیق داده می‌شود و فقط در صورت
        // یکی‌بودن، چت منتقل می‌شود (ر.ک handleRelink).
        if (result.reason === 'chat-linked') {
          await sendTelegramMessage(chat, CHAT_LINKED_RELINK_MESSAGE, {
            requestContact: true,
          });
          return;
        }

        const replies: Record<string, string> = {
          'not-found':
            '⏰ این لینک اتصال <b>منقضی یا نامعتبر</b> شده است.\n\nبرای دریافت لینک تازه، دکمهٔ زیر را بزنید و از صفحهٔ احراز هویت دوباره «اتصال تلگرام» را انتخاب کنید.',
          used: '⏰ این لینک قبلاً استفاده شده است.\n\nاگر هنوز متصل نشده‌اید، از صفحهٔ احراز هویت لینک تازه بگیرید.',
          expired:
            '⏰ لینک اتصال <b>منقضی</b> شده است (۳۰ دقیقه).\n\nبرای دریافت لینک تازه، دکمهٔ زیر را بزنید و از صفحهٔ احراز هویت دوباره «اتصال تلگرام» را انتخاب کنید.',
          'db-error': '❌ خطای سرور رخ داد. لطفاً دوباره تلاش کنید.',
        };
        // مطابق طراحی (اسکرین ۷): هر خطای لینک با دکمهٔ باز کردن پورتال همراه است
        await sendTelegramMessage(chat, replies[result.reason] ?? replies['db-error'], {
          inlineKeyboard: PORTAL_KEYBOARD,
        });
        return;
      }

      // اتصال موفق — دو حالت: با شماره در انتظار (مستقیم تأیید) یا بدون آن
      if (result.pendingPhone) {
        // شماره در انتظار → پیام یکپارچه با دکمهٔ ارسال شماره (بدون پیام جداگانه)
        const account = result.accountName || 'حساب کاربری شما';
        await sendTelegramMessage(
          chat,
          `✅ <b>اتصال موفق!</b>\n\n👤 حساب: <code>${account}</code>\n📱 شماره در انتظار تأیید: <code>${formatTelegramPhone(result.pendingPhone)}</code>\n\n🔐 برای تأیید خودکار شماره، دکمهٔ زیر را بزنید. اگر شمارهٔ تلگرام شما با شماره بالا یکی باشد، تأیید فوری انجام می‌شود.`,
          { requestContact: true },
        );
      } else {
        // بدون شماره در انتظار → راهنمای گام بعدی
        await sendTelegramMessage(
          chat,
          `✅ <b>اتصال موفق!</b>\n\nحساب تلگرام شما به <b>${BOT_NAME}</b> متصل شد.\n\n📋 <b>گام بعدی:</b>\nبه صفحهٔ احراز هویت بروید، شماره موبایل خود را وارد کنید و «ارسال کد تأیید» را بزنید — شماره به‌صورت خودکار از طریق همین ربات تأیید می‌شود.`,
          {
            inlineKeyboard: [
              [{ text: '🛡️ رفتن به صفحهٔ احراز هویت', url: getPortalUrl('/customer/kyc') }],
              [PORTAL_BTN],
            ],
          },
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
      await sendTelegramMessage(chat, msg, { inlineKeyboard: STATUS_KEYBOARD });
      return;
    }

    // ── جریان ۵: message.contact — تأیید خودکار شماره (بدون OTP) ──────────
    const contactPhone = update.message?.contact?.phone_number;
    const contactUserId =
      update.message?.contact?.user_id !== undefined
        ? String(update.message.contact.user_id)
        : undefined;
    if (contactPhone) {
      // ── جریان ۵.۰: انتقال چت (relink) — چت قبلاً به حساب دیگری وصل شده ──
      // /start لینک را با توکنِ حساب مقصد باز کرده و توکن در حالت chat-linked
      // relinkChatId=chat ثبت شده. این contact جوابِ دکمهٔ «ارسال شماره تماس»
      // همان پیام است → با تطبیق شماره، چت به حساب مقصد منتقل می‌شود.
      const pendingRelink = await prisma.telegramLinkToken.findFirst({
        where: { relinkChatId: chat, used: false, expiresAt: { gt: new Date() } },
        select: { id: true, userId: true },
      });
      if (pendingRelink) {
        await handleRelink({
          chat,
          contactPhone,
          contactUserId,
          tokenId: pendingRelink.id,
          targetUserId: pendingRelink.userId,
        });
        return;
      }

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

      await sendTelegramChatAction(chat, 'typing');

      if (!user) {
        // chatId هنوز به هیچ حسابی وصل نشده — کاربر مستقیم contact فرستاده
        await sendTelegramMessage(
          chat,
          `⚠️ <b>حساب متصل نیست</b>\n\nاین گفتگوی تلگرام به هیچ حسابی در <b>${BOT_NAME}</b> متصل نشده است.\n\n📋 <b>چطور متصل شوید؟</b>\n۱. وارد سایت شوید\n۲. به صفحهٔ احراز هویت بروید\n۳. روی «اتصال تلگرام» بزنید\n۴. لینک را در همین تلگرام باز کنید`,
          {
            inlineKeyboard: [
              [{ text: '🛡️ رفتن به صفحهٔ احراز هویت', url: getPortalUrl('/customer/kyc') }],
              [PORTAL_BTN],
            ],
          },
        );
        return;
      }

      const result = await autoVerifyPhoneFromTelegram(user.id, contactPhone, {
        tgUserId: contactUserId,
        preloadedUser: user,
      });

      // شمارهٔ فرستاده‌شده برای نمایش در پیام‌های خطا
      const tgPhoneFmt = formatTelegramPhone(`+${contactPhone.replace(/\D/g, '')}`);
      const pendingFmt = user.pendingPhone ? formatTelegramPhone(user.pendingPhone) : '—';

      type MsgKey =
        | 'ok'
        | 'no-pending'
        | 'mismatch'
        | 'telegram-identity-mismatch'
        | 'account-blocked'
        | 'no-customer'
        | 'already-verified'
        | 'db-error';
      const msgs: Record<MsgKey, string> = {
        ok: `✅ <b>هویت شما تأیید شد!</b>\n\n📱 شماره: <code>${tgPhoneFmt}</code>\n🏅 سطح امنیت: <b>سطح ۱</b>\n\nمرحلهٔ بعدی (مدرک هویتی + سلفی) در پورتال شما فعال شده است.`,

        'no-pending':
          'ℹ️ <b>شماره‌ای در انتظار تأیید نیست</b>\n\nشما دکمه را زدید ولی هنوز شماره‌ای در سایت ثبت نشده است.\n\n📋 <b>چطور ادامه دهید؟</b>\n۱. به صفحهٔ احراز هویت بروید\n۲. شماره موبایل خود را وارد کنید\n۳. «ارسال کد تأیید» را بزنید\n۴. سپس در تلگرام دوباره روی دکمهٔ ارسال شماره بزنید',

        mismatch: `❌ <b>شماره‌ها یکی نیستند</b>\n\n📱 شمارهٔ تلگرام شما: <code>${tgPhoneFmt}</code>\n📝 شمارهٔ ثبت‌شده در سایت: <code>${pendingFmt}</code>\n\nاین دو شماره باید یکی باشند.\n\n💡 <b>راه‌حل:</b> در سایت همان شماره‌ای را وارد کنید که با آن در تلگرام ثبت‌نام کرده‌اید.`,

        'telegram-identity-mismatch':
          '❌ <b>هویت تلگرام مطابقت ندارد</b>\n\nاین شماره از یک حساب تلگرام <b>متفاوت</b> ارسال شده است.\n\n💡 <b>راه‌حل:</b> مطمئن شوید با همان تلگرامی که لینک اتصال را باز کردید، دکمهٔ «ارسال شماره تماس» را بزنید.',

        'account-blocked':
          '⛔ <b>حساب مسدود است</b>\n\nمتأسفانه حساب شما در وضعیت محدودشده قرار دارد و امکان انجام عملیات KYC وجود ندارد.\n\nبرای رفع مشکل با پشتیبانی تماس بگیرید.',

        'no-customer':
          '❌ <b>حساب مشتری پیدا نشد</b>\n\nحساب شما در سیستم به‌درستی تنظیم نشده است.\n\nلطفاً با پشتیبانی تماس بگیرید تا مشکل بررسی شود.',

        'already-verified': `✅ <b>شمارهٔ شما قبلاً تأیید شده است</b>\n\n📱 شماره: <code>${tgPhoneFmt}</code>\n🏅 سطح ۱ احراز هویت کامل است.\n\nبرای ادامه و ارتقا به سطح ۲ (مدرک و سلفی) به پورتال مراجعه کنید.`,

        'db-error':
          '⚠️ <b>خطای موقت سرور</b>\n\nعملیات به‌طور موقت ناموفق بود. لطفاً چند دقیقه صبر کنید و دوباره امتحان کنید.\n\nاگر مشکل ادامه داشت با پشتیبانی تماس بگیرید.',
      };

      const msgKey: MsgKey = result.ok ? 'ok' : (result.reason as MsgKey);
      const msgText = msgs[msgKey] ?? msgs['db-error'];

      // دکمه‌های متناسب با هر وضعیت
      let keyboard: Parameters<typeof sendTelegramMessage>[2] | undefined;
      if (result.ok) {
        keyboard = {
          inlineKeyboard: [
            [{ text: '🚀 ادامهٔ احراز هویت (سطح ۲)', url: getPortalUrl('/customer/kyc') }],
            [PORTAL_BTN],
          ],
        };
      } else if (result.reason === 'account-blocked' || result.reason === 'no-customer') {
        // این دو نیاز به پشتیبانی دارند — پورتال اضافه نمی‌شود
        keyboard = undefined;
      } else if (result.reason === 'already-verified') {
        keyboard = {
          inlineKeyboard: [
            [{ text: '📋 رفتن به پورتال (سطح ۲)', url: getPortalUrl('/customer/kyc') }],
            [PORTAL_BTN],
          ],
        };
      } else {
        // mismatch / no-pending / telegram-identity-mismatch / db-error → پورتال
        keyboard = { inlineKeyboard: PORTAL_KEYBOARD };
      }

      await sendTelegramMessage(chat, msgText, keyboard);
    } else if (text && !text.startsWith('/')) {
      // کاربر متن آزاد تایپ کرده — ربات فقط دستورات و contact می‌فهمد
      await sendTelegramMessage(
        chat,
        '💬 این ربات پیام متنی پردازش نمی‌کند.\n\nدستورات موجود:\n/start — شروع\n/status — وضعیت حساب\n/help — راهنما',
        { inlineKeyboard: MENU_KEYBOARD },
      );
    }
  } catch {
    // best-effort — هرگز به بیرون throw نمی‌کنیم؛ تلگرام retry نمی‌زند
  }
}

/**
 * handleRelink — انتقال امن چت تلگرام از حساب قبلی به حساب مقصد.
 *
 * امنیت (2026-08-15): انتقال فقط وقتی انجام می‌شود که شمارهٔ تماسِ تلگرام
 * (که خود تلگرام تأییدش کرده — حساب‌های VoIP/مجازی برای contact قبول نمی‌کند)
 * با شمارهٔ در انتظارِ حساب مقصد یکی باشد — proof-of-ownership. اگر شماره یکی
 * نبود، تلاش به‌عنوان دزدی توکن رد می‌شود (توکن سوزانده می‌شود) و به ادمین
 * هشدار داده می‌شود.
 */
async function handleRelink(opts: {
  chat: string;
  contactPhone: string;
  contactUserId?: string;
  tokenId: string;
  targetUserId: string;
}): Promise<void> {
  const { chat, contactPhone, contactUserId, tokenId, targetUserId } = opts;

  // نرمال‌سازی شمارهٔ تماس تلگرام → E.164 (همان منطق autoVerify)
  const tgDigits = contactPhone.replace(/\D/g, '');
  let tgE164: string | null = null;
  try {
    const { parsePhoneNumber } = await import('libphonenumber-js');
    const parsed = parsePhoneNumber(`+${tgDigits}`);
    if (parsed?.isValid()) tgE164 = parsed.format('E.164');
  } catch {
    // fallthrough — tgE164 = null → mismatch
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      pendingPhone: true,
      name: true,
      email: true,
      Customer: { select: { id: true, exchangeId: true } },
    },
  });

  const phonesMatch = !!target?.pendingPhone && tgE164 === target.pendingPhone;

  if (!target || !phonesMatch) {
    // ❌ شماره یکی نیست → رد + توکن سوزانده می‌شود + هشدار ادمین
    try {
      await prisma.telegramLinkToken.update({
        where: { id: tokenId },
        data: { used: true, relinkChatId: null },
      });
    } catch {
      // ignore
    }
    await sendTelegramMessage(
      chat,
      `❌ <b>انتقال انجام نشد</b>\n\n📱 شمارهٔ تلگرام شما: <code>${tgE164 ? formatTelegramPhone(tgE164) : 'نامشخص'}</code>\n📝 شمارهٔ در انتظارِ حساب: <code>${target?.pendingPhone ? formatTelegramPhone(target.pendingPhone) : '—'}</code>\n\nاین دو شماره یکی نیستند — برای امنیت، انتقال رد شد.\n\nاگر این درخواست مال شما نیست، با پشتیبانی تماس بگیرید.`,
      { inlineKeyboard: PORTAL_KEYBOARD },
    );
    // هشدار به ادمین — احتمال دزدی توکن
    const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
    if (adminChat) {
      await sendTelegramMessage(
        adminChat,
        `🚨 <b>هشدار امنیتی: انتقال چت رد شد</b>\n\nچت <code>${chat}</code> با توکنِ حساب <code>${targetUserId}</code> تلاش به انتقال کرد ولی شماره یکی نبود.\nشمارهٔ تلگرام: <code>${tgE164 ?? 'نامشخص'}</code> — احتمال دزدی توکن.`,
      );
    }
    return;
  }

  // ✅ شماره یکی است → انتقال امن
  const { v4: createId } = await import('uuid');
  const _now = new Date();
  const targetCustomer = target.Customer;

  await prisma.$transaction(async (tx) => {
    // ۱) چت را از حساب قبلی (A) جدا کن
    await tx.user.updateMany({
      where: { telegramChatId: chat },
      data: { telegramChatId: null, telegramUserId: null },
    });
    // ۲) چت را به حساب مقصد (B) وصل کن
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        telegramChatId: chat,
        ...(contactUserId ? { telegramUserId: contactUserId } : {}),
      },
    });
    // ۳) توکن را بسوزان — relink تمام شد
    await tx.telegramLinkToken.update({
      where: { id: tokenId },
      data: { used: true, relinkChatId: null },
    });
    // ۴) AuditLog — عملیات حساس (C10)
    if (targetCustomer) {
      await tx.auditLog.create({
        data: {
          id: createId(),
          exchangeId: targetCustomer.exchangeId,
          actorId: targetUserId,
          actorRole: 'USER',
          action: 'TELEGRAM_CHAT_RELINKED',
          entityType: 'User',
          entityId: '',
          meta: { chatId: chat, source: 'telegram-contact-relink' },
        },
      });
    }
  });

  // همان contact شمارهٔ مقصد را خودکار تأیید می‌کند — بدون دکمهٔ دوم
  const verify = await autoVerifyPhoneFromTelegram(targetUserId, contactPhone, {
    tgUserId: contactUserId,
  });
  if (verify.ok) {
    await sendTelegramMessage(
      chat,
      `✅ <b>انتقال انجام شد و هویت شما تأیید شد!</b>\n\nاین گفتگو حالا به حساب <code>${target.name?.trim() || target.email || 'شما'}</code> متصل است و سطح ۱ احراز هویت با شمارهٔ <code>${formatTelegramPhone(tgE164 as string)}</code> تکمیل شد.`,
      {
        inlineKeyboard: [
          [{ text: '🚀 ادامهٔ احراز هویت (سطح ۲)', url: getPortalUrl('/customer/kyc') }],
          [PORTAL_BTN],
        ],
      },
    );
  } else {
    await sendTelegramMessage(
      chat,
      `✅ <b>انتقال انجام شد</b>\n\nاین گفتگو حالا به حساب <code>${target.name?.trim() || target.email || 'شما'}</code> متصل است.\n\nشماره‌ای در انتظار تأیید نبود — از پورتال، «ارسال کد تأیید» را بزنید.`,
      { inlineKeyboard: PORTAL_KEYBOARD },
    );
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
