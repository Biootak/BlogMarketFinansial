import { denyUnlessAdmin } from '@/lib/api/admin-guard';
import { apiError, apiOk, apiServerError } from '@/lib/api/response';
import { cancelJob } from '@/lib/jobs';
/**
 * POST /api/jobs/[id]/cancel
 * انتقال یک job به صف مرده (لغو).
 */
import type { NextRequest } from 'next/server';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!id) {
    return apiError('BAD_REQUEST', 'شناسه job الزامی است', 400);
  }

  const result = await cancelJob(id);
  if (!result.success) {
    return apiServerError(result.message);
  }

  return apiOk();
}
