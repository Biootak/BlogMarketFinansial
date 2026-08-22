'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { getEmailProviderAsync } from '@/lib/email';
import { otpEmail, otpExpiresLabel } from '@/lib/email/templates';
import { revalidateTag } from '@/lib/revalidate';
import { generateOtpToken } from '@/lib/tokens';
import { UpdateProfileSchema } from '@/schemas';
import type { ActionResult, UpdateProfileInput } from '@/types/types';
import bcrypt from 'bcryptjs';
import { ZodError } from 'zod';

export async function updateProfile(formData: FormData): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        message: 'شما مجاز به انجام این عملیات نیستید',
        variant: 'destructive',
      };
    }

    const validatedFields = UpdateProfileSchema.parse(
      Object.fromEntries(formData),
    ) as UpdateProfileInput;

    const updateData: Partial<
      UpdateProfileInput & {
        password?: string;
        emailVerified?: Date | null;
        phoneNumber?: string;
        tokenVersion?: { increment: number };
        passwordVersion?: { increment: number };
      }
    > = {};
    if (validatedFields.name) updateData.name = validatedFields.name;

    // SECURITY-fix (2026-08-22): تغییر ایمیل = عملیات حساس.
    //  ۱) بدون رمز عبور فعلی رد می‌شود — قبلاً یک سشن ربایش‌شده (XSS/کوکی
    //     سرقت‌شده) می‌توانست ایمیل را عوض کند، بازیابی را به آدرس مهاجم
    //     بفرستد و مالک را برای همیشه قفل کند.
    //  ۲) tokenVersion بامپ می‌شود تا ادعاهای سشن‌های دیگر فوراً از DB
    //     تازه شود (همان قرارداد تغییر نقش‌ها).
    //  ۳) اعلان «ایمیل شما تغییر کرد» به آدرس قدیمی می‌رود.
    const currentEmail = session.user.email ?? '';
    const newEmail = validatedFields.email?.trim().toLowerCase() ?? '';
    const wantsEmailChange =
      Boolean(validatedFields.email) && newEmail !== '' && newEmail !== currentEmail;

    const changingPassword = Boolean(
      validatedFields.currentPassword && validatedFields.newPassword,
    );

    // 2026-07-19: ذخیره شماره موبایل برای سرویس‌های مالی
    if (validatedFields.phoneNumber !== undefined) {
      updateData.phoneNumber = validatedFields.phoneNumber || undefined;
    }

    // Profile update data - همیشه فیلدها رو آپدیت کن حتی اگه خالی باشن
    const profileUpdateData: {
      bio?: string;
      avatar?: string | null;
      bgImage?: string | null;
      jobName?: string;
    } = {};
    if (validatedFields.bio !== undefined) profileUpdateData.bio = validatedFields.bio || '';
    if (validatedFields.imageUrl !== undefined)
      profileUpdateData.avatar = validatedFields.imageUrl || null;
    if (validatedFields.bgImage !== undefined)
      profileUpdateData.bgImage = validatedFields.bgImage || null;
    if (validatedFields.jobName !== undefined)
      profileUpdateData.jobName = validatedFields.jobName || '';

    if (wantsEmailChange || changingPassword) {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!user || !user.password) {
        return {
          success: false,
          message: 'کاربر یافت نشد یا رمز عبور تنظیم نشده است',
          variant: 'destructive',
        };
      }

      if (!validatedFields.currentPassword) {
        return {
          success: false,
          message: 'برای تغییر ایمیل، وارد کردن رمز عبور فعلی الزامی است',
          variant: 'destructive',
        };
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        validatedFields.currentPassword,
        user.password,
      );
      if (!isCurrentPasswordValid) {
        return { success: false, message: 'رمز عبور فعلی اشتباه است', variant: 'destructive' };
      }

      if (changingPassword && validatedFields.newPassword) {
        // M-1 fix (2026-08-22): passwordVersion بامپ می‌شود تا همهٔ سشن‌های
        // دیگر (کوکی‌های سرقت‌شده) فوراً باطل شوند — همان قرارداد AUTH-603
        // که در resetPassword و customer-portal استفاده می‌شود. سشن جاری هم
        // خارج می‌شود؛ پیام موفقیت کاربر را راهنمایی می‌کند.
        const hashedNewPassword = await bcrypt.hash(validatedFields.newPassword, 12);
        updateData.password = hashedNewPassword;
        updateData.passwordVersion = { increment: 1 };
      }
    }

    if (wantsEmailChange) {
      updateData.email = newEmail;
      updateData.emailVerified = null;
      updateData.tokenVersion = { increment: 1 };
    }

    // Update user data
    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    // Update or create profile
    if (Object.keys(profileUpdateData).length > 0) {
      await prisma.profile.upsert({
        where: { userId: session.user.id },
        update: profileUpdateData,
        create: { ...profileUpdateData, userId: session.user.id },
      });
    }

    // If email changed, issue an OTP to the new address so the user re-verifies.
    // emailVerified was already set to null above, so auth is blocked until verify.
    if (updateData.email) {
      // SECURITY-fix (2026-08-22): اعلان به آدرس قدیمی — اگر تغییر ایمیل
      // توسط مهاجم انجام شده باشد، مالک فوراً متوجه می‌شود و می‌تواند از
      // طریق «فراموشی رمز» حساب را بازیابی کند.
      try {
        const provider = await getEmailProviderAsync();
        await provider.send({
          to: currentEmail,
          subject: 'ایمیل حساب شما تغییر کرد',
          html: `<p dir="rtl" style="font-family:Tahoma,sans-serif;line-height:1.8">سلام،<br/>ایمیل حساب شما در Financial Market از <code>${currentEmail}</code> به <code>${updateData.email}</code> تغییر کرد.<br/>اگر این تغییر را شما انجام نداده‌اید، فوراً از طریق صفحهٔ «فراموشی رمز عبور» حساب خود را بازیابی کنید.</p>`,
        });
      } catch {
        // best-effort — نباید جریان اصلی را خراب کند
      }

      const minted = await generateOtpToken({ email: updateData.email, intent: 'reverify' });
      if (minted.ok) {
        try {
          const provider = await getEmailProviderAsync();
          await provider.send(
            otpEmail({
              to: updateData.email,
              code: minted.code,
              intent: 'reverify',
              expiresLabel: otpExpiresLabel(),
            }),
          );
        } catch {
          // Email delivery failed — OTP is still stored; user can request resend.
        }
      }
      revalidateTag('user-profile');
      return {
        success: true,
        message: 'ایمیل تغییر کرد — کد تأیید به آدرس جدید ارسال شد',
        variant: 'success',
        // 2026-08-10: readInitialStep فقط stepهای مجاز را می‌پذیرد — 'reverify'
        // نبود و کاربر به مرحلهٔ ایمیل برمی‌گشت. حالا step=verify + intent=reverify
        // که مستقیم به کد OTP می‌رود.
        redirect: `/auth?step=verify&intent=reverify&email=${encodeURIComponent(updateData.email)}`,
      };
    }

    revalidateTag('user-profile');
    return { success: true, message: 'پروفایل با موفقیت بروزرسانی شد', variant: 'success' };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, message: error.errors[0].message, variant: 'destructive' };
    }
    return { success: false, message: 'خطایی در بروزرسانی پروفایل رخ داد', variant: 'destructive' };
  }
}
