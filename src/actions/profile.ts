'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { ZodError } from 'zod';
import type { ActionResult, UpdateProfileInput, UserWithProfile } from '@/types/types';
import { auth } from '@/auth';
import { UpdateProfileSchema } from '@/schemas';

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

    console.log('Received form data:', Object.fromEntries(formData));

    const validatedFields = UpdateProfileSchema.parse(
      Object.fromEntries(formData),
    ) as UpdateProfileInput;

    console.log('Validated fields:', validatedFields);

    const updateData: Partial<UpdateProfileInput & { password?: string }> = {};
    if (validatedFields.name) updateData.name = validatedFields.name;
    if (validatedFields.email) updateData.email = validatedFields.email;

    // Profile update data - همیشه فیلدها رو آپدیت کن حتی اگه خالی باشن
    const profileUpdateData: any = {};
    if (validatedFields.bio !== undefined) profileUpdateData.bio = validatedFields.bio || '';
    if (validatedFields.imageUrl !== undefined) profileUpdateData.avatar = validatedFields.imageUrl || null;
    if (validatedFields.bgImage !== undefined) profileUpdateData.bgImage = validatedFields.bgImage || null;
    if (validatedFields.jobName !== undefined) profileUpdateData.jobName = validatedFields.jobName || '';

    if (validatedFields.currentPassword && validatedFields.newPassword) {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!user || !user.password) {
        return {
          success: false,
          message: 'کاربر یافت نشد یا رمز عبور تنظیم نشده است',
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

      const hashedNewPassword = await bcrypt.hash(validatedFields.newPassword, 12);
      updateData.password = hashedNewPassword;
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

    const updatedUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { profile: true },
    });
    console.log('Updated user data:', updatedUser);

    revalidatePath('/edit-profile');
    return { success: true, message: 'پروفایل با موفقیت بروزرسانی شد', variant: 'success' };
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error instanceof ZodError) {
      return { success: false, message: error.errors[0].message, variant: 'destructive' };
    }
    return { success: false, message: 'خطایی در بروزرسانی پروفایل رخ داد', variant: 'destructive' };
  }
}
