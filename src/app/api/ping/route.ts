import { NextResponse } from 'next/server';

/**
 * GET /api/ping
 * Keep-alive endpoint — no auth required.
 * Called every 5 minutes by cron-job.org to prevent Heroku dyno from sleeping.
 */
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
