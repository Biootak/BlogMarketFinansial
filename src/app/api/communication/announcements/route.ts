import { denyUnlessAdmin } from '@/lib/api/admin-guard';
import { apiOk, apiServerError, parseJsonBody } from '@/lib/api/response';
import { createAnnouncement } from '@/lib/communication';
/**
 * POST /api/communication/announcements
 * ایجاد اعلان جدید از داشبورد.
 *
 * Body:
 *  - title: string (required)
 *  - body: string (required)
 *  - channels: ('inapp' | 'email' | 'push' | 'sms')[] (required, min 1)
 *  - audience: 'all' | 'role' | 'segment' (default: 'all')
 *  - audienceFilter?: string
 *  - scheduledAt?: ISO string
 *  - expiresAt?: ISO string
 *  - status?: 'draft' | 'scheduled' | 'published' | 'archived' (default: 'draft')
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';

const BodySchema = z.object({
  title: z.string().min(1, 'عنوان الزامی است').max(200),
  body: z.string().min(1, 'متن الزامی است').max(5000),
  channels: z.array(z.enum(['inapp', 'email', 'push', 'sms'])).min(1, 'حداقل یک کانال انتخاب کنید'),
  audience: z.enum(['all', 'role', 'segment']).default('all'),
  audienceFilter: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).default('draft'),
});

export async function POST(req: NextRequest) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const body = await parseJsonBody(req, BodySchema);
  if (body.error) return body.error;
  const p = body.data;

  const result = await createAnnouncement({
    title: p.title,
    body: p.body,
    channels: p.channels,
    audience: p.audience,
    audienceFilter: p.audienceFilter ?? null,
    scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : null,
    expiresAt: p.expiresAt ? new Date(p.expiresAt) : null,
    status: p.status,
  });

  if (!result.success) {
    return apiServerError(result.message);
  }

  return apiOk({ id: result.id });
}
