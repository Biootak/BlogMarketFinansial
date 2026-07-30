/**
 * GET    /api/communication/announcements/[id]    — دریافت جزئیات یک اعلان
 * PATCH  /api/communication/announcements/[id]    — ویرایش اعلان
 * DELETE /api/communication/announcements/[id]    — حذف اعلان (فقط draft/archived)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import {
  deleteAnnouncement,
  updateAnnouncement,
  type UpdateAnnouncementInput,
} from '@/lib/communication';
import { parseChannelsFromBody } from './_helpers';

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
  channels: z.array(z.enum(['inapp', 'email', 'push', 'sms'])).min(1).optional(),
  audience: z.enum(['all', 'role', 'segment']).optional(),
  audienceFilter: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).optional(),
});

async function guard() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, status: 401, msg: 'احراز هویت نشده‌اید' };
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    return { ok: false as const, status: 403, msg: 'دسترسی ندارید' };
  }
  return { ok: true as const };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await guard();
  if (!g.ok) {
    return NextResponse.json(
      { success: false, error: { code: g.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: g.msg } },
      { status: g.status },
    );
  }
  const { id } = await params;
  const row = await prisma.announcement.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'اعلان یافت نشد' } },
      { status: 404 },
    );
  }
  return NextResponse.json({
    success: true,
    data: {
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
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await guard();
  if (!g.ok) {
    return NextResponse.json(
      { success: false, error: { code: g.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: g.msg } },
      { status: g.status },
    );
  }
  const { id } = await params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_BODY', message: 'بدنه نامعتبر' } },
      { status: 400 },
    );
  }
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION',
          message: parsed.error.issues[0]?.message ?? 'خطای اعتبارسنجی',
        },
      },
      { status: 400 },
    );
  }
  const patch: UpdateAnnouncementInput = {};
  const p = parsed.data;
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
    return NextResponse.json(
      { success: false, error: { code: 'SERVER', message: result.message ?? 'خطای سرور' } },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await guard();
  if (!g.ok) {
    return NextResponse.json(
      { success: false, error: { code: g.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: g.msg } },
      { status: g.status },
    );
  }
  const { id } = await params;
  const result = await deleteAnnouncement(id);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER', message: result.message ?? 'خطای سرور' } },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true });
}
