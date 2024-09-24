import { NextResponse } from 'next/server';
import { getExchangeRates } from '@/actions/exchange-rates';

export async function GET(request: Request) {
  const exchangeRates = await getExchangeRates();

  return NextResponse.json(exchangeRates);
}
