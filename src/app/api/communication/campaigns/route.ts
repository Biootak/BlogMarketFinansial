import { denyUnlessAdmin } from '@/lib/api/admin-guard';
import { apiError, apiOk, apiServerError, parseJsonBody } from '@/lib/api/response';
import { createCampaign } from '@/lib/communication';
/**
 * POST /api/communication/campaigns
 * ایجاد کمپین جدید (email/sms/push).
 *
 * Body:
 *  - name: string (required)
 *  - description?: string
 *  - channel: 'email' | 'sms' | 'push' (required)
 *  - subject?: string  (required if channel === 'email')
 *  - body: string (required)
 *  - audience: 'all' | 'role' | 'segment' (default: 'all')
 *  - audienceFilter?: string
 *  - scheduledAt?: ISO string
 *  - status?: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused' (default: 'draft')
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';

const BodySchema = z.object({
  name: z.string().min(1, 'نام الزامی است').max(200),
  description: z.string().max(1000).nullable().optional(),
  channel: z.enum(['email', 'sms', 'push']),
  subject: z.string().max(150).nullable().optional(),
  body: z.string().min(1, 'متن الزامی است').max(10_000),
  audience: z.enum(['all', 'role', 'segment']).default('all'),
  audienceFilter: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  status: z.enum(['draft', 'scheduled', 'sending', 'completed', 'paused']).default('draft'),
});

export async function POST(req: NextRequest) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const body = await parseJsonBody(req, BodySchema);
  if (body.error) return body.error;
  const p = body.data;
  if (p.channel === 'email' && !p.subject?.trim()) {
    return apiError('VALIDATION', 'برای کمپین ایمیلی، موضوع الزامی است', 400);
  }
  const result = await createCampaign({
    name: p.name,
    description: p.description ?? null,
    channel: p.channel,
    subject: p.subject ?? null,
    body: p.body,
    audience: p.audience,
    audienceFilter: p.audienceFilter ?? null,
    scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : null,
    status: p.status,
  });
  if (!result.success) {
    return apiServerError(result.message);
  }
  return apiOk({ id: result.id });
}
