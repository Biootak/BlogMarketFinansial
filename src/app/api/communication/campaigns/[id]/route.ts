import { denyUnlessAdmin } from '@/lib/api/admin-guard';
import { apiOk, apiServerError, parseJsonBody } from '@/lib/api/response';
import { deleteCampaign, updateCampaignStatus } from '@/lib/communication';
/**
 * PATCH  /api/communication/campaigns/[id]    — تغییر وضعیت کمپین (pause/resume/send)
 * DELETE /api/communication/campaigns/[id]    — حذف کمپین
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';

const PatchSchema = z.object({
  status: z.enum(['draft', 'scheduled', 'sending', 'completed', 'paused']),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await parseJsonBody(req, PatchSchema, 'وضعیت نامعتبر');
  if (body.error) return body.error;

  const result = await updateCampaignStatus(id, body.data.status);
  if (!result.success) {
    return apiServerError(result.message);
  }
  return apiOk();
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const { id } = await params;
  const result = await deleteCampaign(id);
  if (!result.success) {
    return apiServerError(result.message);
  }
  return apiOk();
}
