import { type NextRequest, NextResponse } from 'next/server';

const QR_ORIGIN = 'https://api.qrserver.com/v1/create-qr-code/';

export async function GET(request: NextRequest) {
  const data = request.nextUrl.searchParams.get('data');
  if (!data || !data.startsWith('otpauth://totp/')) {
    return NextResponse.json({ error: 'Invalid QR payload' }, { status: 400 });
  }
  const url = new URL(QR_ORIGIN);
  url.searchParams.set('size', '240x240');
  url.searchParams.set('margin', '1');
  url.searchParams.set('data', data);
  try {
    const upstream = await fetch(url, { next: { revalidate: 300 } });
    if (!upstream.ok) return new NextResponse(null, { status: 502 });
    return new NextResponse(await upstream.arrayBuffer(), {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/png',
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
