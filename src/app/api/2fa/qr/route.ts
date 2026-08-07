import { auth } from '@/auth';
import { type NextRequest, NextResponse } from 'next/server';

const PRIVATE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
  'X-Content-Type-Options': 'nosniff',
} as const;

/**
 * TOTP enrollment payloads contain the user's seed secret. Do not proxy them
 * to a third-party QR service. A local QR renderer must be installed and
 * wired here before enabling this endpoint in production.
 */
export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHENTICATED', message: 'احراز هویت لازم است' } },
      { status: 401, headers: PRIVATE_HEADERS },
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'QR_LOCAL_RENDERER_REQUIRED',
        message: 'تولید QR امن هنوز فعال نشده است',
      },
    },
    { status: 503, headers: PRIVATE_HEADERS },
  );
}
