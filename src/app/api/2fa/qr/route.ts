import { auth } from '@/auth';
import { type NextRequest, NextResponse } from 'next/server';

const QR_ORIGIN = 'https://api.qrserver.com/v1/create-qr-code/';
const PRIVATE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
  'X-Content-Type-Options': 'nosniff',
} as const;

/**
 * QR proxy for the current 2FA enrollment flow.
 *
 * The payload contains the TOTP enrollment secret. This route is therefore
 * authenticated and never cacheable. The client must still migrate to local
 * QR rendering before production: this temporary proxy sends the secret to
 * the upstream QR renderer, which is not acceptable for a final release.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHENTICATED', message: 'احراز هویت لازم است' } },
      { status: 401, headers: PRIVATE_HEADERS },
    );
  }

  const data = request.nextUrl.searchParams.get('data');
  if (!data || data.length > 2048 || !data.startsWith('otpauth://totp/')) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'مقدار QR نامعتبر است' } },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }

  const url = new URL(QR_ORIGIN);
  url.searchParams.set('size', '240x240');
  url.searchParams.set('margin', '1');
  url.searchParams.set('data', data);

  try {
    const upstream = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: { code: 'QR_PROVIDER_FAILED', message: 'تولید QR ممکن نشد' } },
        { status: 502, headers: PRIVATE_HEADERS },
      );
    }
    return new NextResponse(await upstream.arrayBuffer(), {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        'Content-Type': upstream.headers.get('content-type') ?? 'image/png',
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'QR_UNAVAILABLE', message: 'تولید QR موقتاً در دسترس نیست' } },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }
}
