'use server';

/**
 * Phone Verification — Server Actions
 *
 * جریان:
 *   1. sendPhoneOtp({ phone }) — اعتبارسنجی + ذخیره شماره موقت + ارسال SMS OTP
 *   2. verifyPhoneOtp({ phone, code }) — تأیید کد + ذخیره phoneNumber در User + mark verified
 *
 * امنیت:
 *   - rate-limit per user (در CGNAT مخابرات افغانستان per-IP کاربر عادی را
 *     بی‌دلیل بلاک می‌کرد — حذف شد، ر.ک sendPhoneOtp)
 *   - کد ۶ رقمی با OTP_EXPIRES_MS = 10 دقیقه
 *   - OTP روی email+intent کاربر ذخیره می‌شود (از جدول VerificationToken موجود)
 */

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { isPhoneValid, normalizeToE164 } from '@/lib/phone-validation';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limiter';
import { revalidatePath } from '@/lib/revalidate';
import { consumeOtpToken, generateOtpToken, invalidateOtpTokens } from '@/lib/tokens';

// intent اختصاصی برای تأیید موبایل
const PHONE_VERIFY_INTENT = 'service-verify' as const;

export interface PhoneOtpResult {
  success: boolean;
  message: string;
  retryAfterMs?: number;
  /** فقط در dev: کد برای نمایش */
  devCode?: string;
}

// ─── sendPhoneOtp ─────────────────────────────────────────────────────────── //

export async function sendPhoneOtp(args: {
  phone: string;
}): Promise<PhoneOtpResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return { success: false, message: 'ابتدا وارد حساب کاربری شوید.' };
    }

    // ۱) اعتبارسنجی شماره — قبل از rate-limit تا شمارهٔ نامعتبر بودجه نسوزاند.
    const phone = args.phone.trim();
    if (!isPhoneValid(phone)) {
      return { success: false, message: 'شماره موبایل معتبر نیست (مثال: ۰۷۰۱۲۳۴۵۶۷)' };
    }
    const e164 = normalizeToE164(phone);

    // ۲) rate-limit per user.
    // 2026-08-17 (UX-fix): bucket جداگانهٔ per-IP حذف شد — این اکشن auth لازم
    // دارد و ضد-اسپم واقعی همین per-user + cooldown ۶۰ثانیه‌ای OTP است؛ در
    // CGNAT مخابرات افغانستان یک IP عمومی بین صدها کاربر شریک است و bucket
    // هر-IP با چند درخواست کاربران دیگر پر می‌شود → کاربر عادی بی‌دلیل بلاک
    // می‌شد. (ساخت حساب هم خودش rate-limit دارد، پس چند-اکانتی‌سازی هم گیت
    // دارد.)
    const userRate = await checkRateLimit(`phone-otp-user:${session.user.id}`, 'auth');
    if (!userRate.success) {
      const ms = Math.max(0, userRate.reset - Date.now());
      return { success: false, message: 'تعداد درخواست‌ها بیش از حد است.', retryAfterMs: ms };
    }

    // تولید کد OTP — از email کاربر به عنوان کلید VerificationToken استفاده می‌کنیم
    const email = session.user.email.trim().toLowerCase();
    const otpResult = await generateOtpToken({ email, intent: PHONE_VERIFY_INTENT });
    if (!otpResult.ok) {
      const ms = (otpResult as { retryAfterMs: number }).retryAfterMs;
      const sec = Math.ceil(ms / 1000);
      return { success: false, message: `لطفاً ${sec} ثانیه صبر کنید.`, retryAfterMs: ms };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { telegramChatId: true },
    });

    // ── تحویل OTP از بهترین کانال موجود: تلگرام → ایمیل → پیامک ──
    // تلگرام بلاک‌کننده نیست: بدون تلگرام هم کد از طریق ایمیل (یا SMS) می‌رسد.
    const otpBody = `🛡️ Financial Market — کد تأیید شماره موبایل شما: ${otpResult.code}\nاعتبار: ۱۰ دقیقه\nاین کد را با کسی به اشتراک نگذارید.`;
    const { sendOtp } = await import('@/lib/email-otp');
    const delivery = await sendOtp(
      {
        telegramChatId: user?.telegramChatId,
        email: session.user.email,
        phone: e164,
      },
      otpResult.code,
      'phone-verify',
      otpBody,
    );

    if (!delivery.success) {
      // 2026-08-17 (UX-fix): تحویل fail شد — مشکل سمت سرور است، نه تلاش کاربر.
      // قبلاً هر تلاش ناموفق (۱) سهمیهٔ rate-limit را می‌سوزاند، (۲) توکن OTP
      // ساخته‌شده را نگه می‌داشت تا تلاش بعدی با cooldown ۶۰ثانیه‌ای «لطفاً
      // صبر کنید» بلاک شود. نتیجه: کاربر بعد از ۲-۳ کلیک پشت سر هم برای ۳ دقیقه
      // قفل می‌شد. حالا: توکن هرگز تحویل‌نشده حذف می‌شود (تلاش بعدی از صفر) و
      // سهمیهٔ کاربر برگشت داده می‌شود (فقط ارسال‌های موفق حساب می‌شوند).
      await invalidateOtpTokens({ email, intent: PHONE_VERIFY_INTENT });
      await resetRateLimit(`phone-otp-user:${session.user.id}`, 'auth');
      return {
        success: false,
        message:
          delivery.errorCode === 'NO_CHANNEL'
            ? 'کانال ارسال کد در دسترس نیست. تلگرام را وصل کنید (مطمئن‌ترین راه) یا بعداً تلاش کنید.'
            : 'ارسال کد ناموفق بود. تلگرام را وصل کنید یا چند لحظه بعد دوباره تلاش کنید.',
      };
    }

    const channelMsg: Record<string, string> = {
      telegram: 'کد تأیید به تلگرام شما ارسال شد. ✅',
      email: 'کد تأیید به ایمیل شما ارسال شد. 📧',
      sms: 'کد تأیید به شماره شما پیامک شد. 📱',
    };

    // SECURITY-fix (2026-08-22): کد صادرشده به همین شماره bind می‌شود —
    // pendingPhone مبنای مقایسه در verifyPhoneOtp و KYC LEVEL_1 است تا کدِ
    // دریافتیِ خود کاربر برای شمارهٔ A نتواند یک شمارهٔ دلخواه B را
    // «تأییدشده» ثبت کند (دور زدن تأیید موبایل در پلتفرم مالی).
    await prisma.user.update({
      where: { id: session.user.id },
      data: { pendingPhone: e164 },
    });

    return {
      success: true,
      message: channelMsg[delivery.channel ?? 'sms'] ?? 'کد تأیید ارسال شد.',
      devCode: delivery.devCode,
    };
  } catch {
    return { success: false, message: 'خطای سرور. لطفاً دوباره تلاش کنید.' };
  }
}

// ─── verifyPhoneOtp ───────────────────────────────────────────────────────── //

export async function verifyPhoneOtp(args: {
  phone: string;
  code: string;
}): Promise<PhoneOtpResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return { success: false, message: 'ابتدا وارد حساب کاربری شوید.' };
    }

    // اعتبارسنجی شماره
    const phone = args.phone.trim();
    if (!isPhoneValid(phone)) {
      return { success: false, message: 'شماره موبایل معتبر نیست.' };
    }
    const e164 = normalizeToE164(phone);

    // SECURITY-fix (2026-08-22): کد باید برای همین شماره صادر شده باشد.
    // pendingPhone در sendPhoneOtp هنگام صدور کد ثبت می‌شود؛ عدم تطابق یعنی
    // این کد برای شمارهٔ دیگری رفته — قبل از مصرف کد، fail-fast می‌کنیم تا
    // تلاش کاربر هم نسوزد و شمارهٔ دلخواه قابل تأیید نباشد.
    const userForBinding = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { pendingPhone: true },
    });
    if (!userForBinding?.pendingPhone || userForBinding.pendingPhone !== e164) {
      return {
        success: false,
        message: 'این کد برای این شماره موبایل صادر نشده است. برای همین شماره کد جدید بگیرید.',
      };
    }

    // verify OTP
    const email = session.user.email.trim().toLowerCase();
    const result = await consumeOtpToken({
      email,
      code: args.code.trim(),
      intent: PHONE_VERIFY_INTENT,
    });

    if (!result.ok) {
      const messages: Record<string, string> = {
        'not-found': 'کد معتبر نیست. لطفاً دوباره درخواست کنید.',
        expired: 'کد منقضی شده. لطفاً کد جدید دریافت کنید.',
        'too-many-attempts': 'تعداد تلاش بیش از حد. لطفاً کد جدید دریافت کنید.',
        'wrong-code': 'کد اشتباه است.',
      };
      return { success: false, message: messages[result.reason] ?? 'کد نامعتبر است.' };
    }

    // ذخیره شماره تأیید شده در DB + مصرف binding (تک‌بارمصرف)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { phoneNumber: e164, pendingPhone: null },
    });

    // sync داشبورد — صفحه مدیریت کاربران را revalidate کن
    revalidatePath('/dashboard/users');

    return { success: true, message: 'شماره موبایل با موفقیت تأیید شد.' };
  } catch {
    return { success: false, message: 'خطای سرور. لطفاً دوباره تلاش کنید.' };
  }
}
