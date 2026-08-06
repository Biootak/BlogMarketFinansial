/**
 * GET|POST /api/cron/backup
 * Scheduled backup endpoint protected by CRON_SECRET.
 */

import { runBackup } from '@/lib/backup';
import { verifyCronSecret } from '@/lib/cron-auth';
import { serverLog } from '@/lib/server-logger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handleBackup(req: Request) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  try {
    const info = await runBackup('scheduled', 'cron');
    return NextResponse.json({
      success: true,
      data: {
        filename: info.filename,
        sizeBytes: info.sizeBytes,
        totalRows: info.totalRows,
      },
    });
  } catch (err) {
    serverLog.error('cron-backup', 'run-backup', err);
    return NextResponse.json(
      { success: false, error: { code: 'BACKUP_FAILED', message: 'خطا در اجرای backup' } },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function GET(req: Request) {
  return handleBackup(req);
}

export async function POST(req: Request) {
  return handleBackup(req);
}
