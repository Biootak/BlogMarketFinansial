/**
 * GET|POST /api/cron/backup
 * ─────────────────────────────────────────────────────────────
 * Scheduled backup endpoint — محافظت‌شده توسط CRON_SECRET.
 *
 * فراخوانی می‌شود از: Vercel Cron، docker crontab، یا هر scheduler خارجی.
 *
 * هر بار اجرا می‌شود:
 *  1. backup کامل Prisma JSON را می‌سازد
 *  2. retention خودکار — حداکثر ۲۰ نسخه نگه می‌دارد
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */

import { runBackup } from '@/lib/backup';
import { verifyCronSecret } from '@/lib/cron-auth';
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
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BACKUP_FAILED',
          message: err instanceof Error ? err.message : 'خطا در اجرای backup',
        },
      },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return handleBackup(req);
}

export async function POST(req: Request) {
  return handleBackup(req);
}
