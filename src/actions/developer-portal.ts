'use server';

import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';

const CreateApiKeySchema = z.object({
  name: z.string().min(3, 'نام کلید باید حداقل ۳ کاراکتر باشد').max(50),
});

/** تولید رشته تصادفی امن (URL-safe) از crypto.randomBytes */
function secureRandomString(length: number): string {
  const bytes = randomBytes(Math.ceil(length * 0.75));
  return bytes.toString('base64url').slice(0, length);
}

export async function getMyApiKeys() {
  const auth = await requireUser();
  if (!auth.success) return [];

  return prisma.apiKey.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createApiKey(raw: unknown) {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: 'احراز هویت نشد' };

  const parsed = CreateApiKeySchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  // تولید کلید و سکرت امن
  const key = `pk_${secureRandomString(32)}`;
  const secret = `sk_${secureRandomString(48)}`;

  await prisma.apiKey.create({
    data: {
      name: parsed.data.name,
      key,
      secret,
      userId: auth.user.id,
    },
  });

  revalidateTag('api-keys');
  return { success: true };
}

export async function deleteApiKey(id: string) {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: 'احراز هویت نشد' };

  await prisma.apiKey.delete({
    where: { id, userId: auth.user.id },
  });

  revalidateTag('api-keys');
  return { success: true };
}
