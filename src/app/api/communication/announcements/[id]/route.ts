import { denyUnlessAdmin } from '@/lib/api/admin-guard';
import { apiError, apiOk, apiServerError, parseJsonBody } from '@/lib/api/response';
import {
  type UpdateAnnouncementInput,
  deleteAnnouncement,
  updateAnnouncement,
} from '@/lib/communication';
import prisma from '@/lib/db';
/**
 * GET    /api/communication/announcements/[id]    — دریافت جزئیات یک اعلان
 * PATCH  /api/communication/announcements/[id]    — ویرایش اعلان
 * DELETE /api/communication/announcements/[id]    — حذف اعلان (فقط draft/archived)
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { parseChannelsFromBody } from './_helpers';

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
  channels: z
    .array(z.enum(['inapp', 'email', 'push', 'sms']))
    .min(1)
    .optional(),
  audience: z.enum(['all', 'role', 'segment']).optional(),
  audienceFilter: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const { id } = await params;
  const row = await prisma.announcement.findUnique({ where: { id } });
  if (!row) {
    return apiError('NOT_FOUND', 'اعلان یافت نشد', 404);
  }
  return apiOk({
    id: row.id,
    title: row.title,
    body: row.body,
    channels: parseChannelsFromBody(row),
    audience: row.audience,
    audienceFilter: row.audienceFilter,
    status: row.status,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await parseJsonBody(req, PatchSchema);
  if (body.error) return body.error;
  const patch: UpdateAnnouncementInput = {};
  const p = body.data;
  if (p.title !== undefined) patch.title = p.title;
  if (p.body !== undefined) patch.body = p.body;
  if (p.channels !== undefined) patch.channels = p.channels;
  if (p.audience !== undefined) patch.audience = p.audience;
  if (p.audienceFilter !== undefined) patch.audienceFilter = p.audienceFilter;
  if (p.scheduledAt !== undefined) {
    patch.scheduledAt = p.scheduledAt ? new Date(p.scheduledAt) : null;
  }
  if (p.expiresAt !== undefined) {
    patch.expiresAt = p.expiresAt ? new Date(p.expiresAt) : null;
  }
  if (p.status !== undefined) patch.status = p.status;
  const result = await updateAnnouncement(id, patch);
  if (!result.success) {
    return apiServerError(result.message);
  }
  return apiOk();
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const { id } = await params;
  const result = await deleteAnnouncement(id);
  if (!result.success) {
    return apiServerError(result.message);
  }
  return apiOk();
}
