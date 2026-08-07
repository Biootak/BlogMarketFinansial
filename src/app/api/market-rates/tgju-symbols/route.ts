import { auth } from '@/auth';
import { discoverTgjuSymbols } from '@/lib/market-rates/discovery';
import { TGJU_KEY_TO_SYMBOL } from '@/lib/market-rates/registry';
// src/app/api/market-rates/tgju-symbols/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user || !['OWNER', 'SUPERADMIN', 'ADMIN'].includes(session.user.role ?? '')) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const symbols = await discoverTgjuSymbols();

  const enriched = symbols.map((s) => ({
    ...s,
    canonicalSymbol: TGJU_KEY_TO_SYMBOL.get(s.tgjuKey) ?? null,
  }));

  return NextResponse.json({ success: true, data: enriched });
}
