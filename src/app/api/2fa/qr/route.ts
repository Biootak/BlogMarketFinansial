import { auth } from '@/auth';
import prisma from '@/lib/db';
import { decryptTotpSecret } from '@/lib/totp-secrets';
import { generateOtpAuthUri } from '@/lib/totp';
import { type NextRequest, NextResponse } from 'next/server';

const PRIVATE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
  'X-Content-Type-Options': 'nosniff',
} as const;

/**
 * GET /api/2fa/qr
 *
 * M9-fix: Returns the otpauth:// URI for the current user's pending 2FA setup
 * so the client-side QR renderer can display the QR code locally — no
 * third-party QR service involved.
 *
 * The secret is decrypted server-side; only the opaque otpauth:// URI is
 * returned over HTTPS to the authenticated user.  The pending prefix written
 * by setup2FA() must still be present — once 2FA is confirmed the secret is
 * no longer pending and this endpoint returns 409.
 */
export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHENTICATED', message: 'احراز هویت لازم است' } },
      { status: 401, headers: PRIVATE_HEADERS },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, twoFactorSecretEnc: true, twoFactorEnabled: true },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'کاربر یافت نشد' } },
      { status: 404, headers: PRIVATE_HEADERS },
    );
  }

  if (!user.twoFactorSecretEnc?.startsWith('pending:')) {
    return NextResponse.json(
      { success: false, error: { code: 'SETUP_REQUIRED', message: 'ابتدا تنظیم ۲FA را شروع کنید' } },
      { status: 409, headers: PRIVATE_HEADERS },
    );
  }

  const secret = decryptTotpSecret(user.twoFactorSecretEnc.slice('pending:'.length));
  const otpauthUri = generateOtpAuthUri(secret, user.email ?? session.user.id);

  return NextResponse.json(
    { success: true, data: { otpauthUri } },
    { headers: PRIVATE_HEADERS },
  );
}
