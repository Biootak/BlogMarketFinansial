import { getVerificationTokenByEmail } from '@/data/verfication-token';
import prisma from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const generateVerificationToken = async (email: string) => {
  const token = uuidv4();
  const expires = new Date(new Date().getTime() + 3600 * 1000);

  const existhinedToken = await getVerificationTokenByEmail(email);
  if (existhinedToken) {
    await prisma.verificationToken.delete({
      where: {
        id: existhinedToken.id,
      },
    });
  }

  const verificationToken = await prisma.verificationToken.create({
    data: {
      token,
      expires,
      email,
    },
  });

  return verificationToken;
};
