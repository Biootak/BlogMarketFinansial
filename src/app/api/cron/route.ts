import { NextResponse } from 'next/server';
import { updateExchangeRates } from '@/actions/updateExchangeRates';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    await updateExchangeRates();
    return NextResponse.json({ success: true, message: 'Exchange rates updated successfully' });
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update exchange rates' },
      { status: 500 },
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
