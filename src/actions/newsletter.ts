'use server';

import prisma from '@/lib/db';
import { z } from 'zod';

const emailSchema = z.string().email();

export async function subscribeToNewsletter(email: string) {
  const validatedEmail = emailSchema.parse(email);

  await prisma.newsletter.create({
    data: {
      email: validatedEmail,
    },
  });
}
