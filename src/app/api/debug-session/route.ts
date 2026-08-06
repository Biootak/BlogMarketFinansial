import { NextResponse } from 'next/server';

// Debug session introspection must not exist in production artifacts.
export function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
