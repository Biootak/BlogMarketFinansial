import { denyUnlessAdmin } from '@/lib/api/admin-guard';
import { apiOk, apiServerError } from '@/lib/api/response';
import { archiveAnnouncement } from '@/lib/communication';
/**
 * POST /api/communication/announcements/[id]/archive
 * بایگانی اعلان.
 */
import type { NextRequest } from 'next/server';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const result = await archiveAnnouncement(id);
  if (!result.success) {
    return apiServerError(result.message);
  }
  return apiOk();
}
