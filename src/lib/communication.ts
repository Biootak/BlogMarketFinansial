/**
 * communication.ts — مرکز داده‌های Communication Center
 * ─────────────────────────────────────────────────────────────
 *  داده‌های واقعی از:
 *   - Announcement (broadcast/in-app)
 *   - Campaign + CampaignRecipient (email/SMS campaigns)
 *
 *  این فایل همهٔ توابع read و write را برای مرکز ارتباطات فراهم می‌کند.
 *  در صورت خطا، fallback امن برمی‌گرداند.
 */

import 'server-only';

import { revalidateTag } from '@/lib/revalidate';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';

export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused';
export type Channel = 'inapp' | 'email' | 'push' | 'sms';
export type Audience = 'all' | 'role' | 'segment';

export interface AnnouncementSummary {
  id: string;
  title: string;
  body: string;
  channels: Channel[];
  audience: Audience;
  audienceFilter: string | null;
  status: AnnouncementStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignSummary {
  id: string;
  name: string;
  description: string | null;
  channel: 'email' | 'sms' | 'push';
  subject: string | null;
  body: string;
  status: CampaignStatus;
  audience: Audience;
  audienceFilter: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
  };
  createdById: string;
  createdAt: string;
}

export interface CommunicationSnapshot {
  generatedAt: string;
  announcements: AnnouncementSummary[];
  campaigns: CampaignSummary[];
  metrics: {
    publishedAnnouncements: number;
    scheduledAnnouncements: number;
    draftAnnouncements: number;
    activeCampaigns: number;
    totalRecipients: number;
    totalSent: number;
    openRate: number;
    clickRate: number;
  };
}

const requireAdminRole = async (): Promise<{ ok: true; userId: string } | { ok: false; reason: string }> => {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, reason: 'احراز هویت نشده‌اید' };
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    return { ok: false, reason: 'دسترسی ندارید' };
  }
  return { ok: true, userId: session.user.id };
};

const parseChannels = (raw: string): Channel[] => {
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is Channel => ['inapp', 'email', 'push', 'sms'].includes(s));
};

const toAnnouncement = (row: {
  id: string;
  title: string;
  body: string;
  channels: string;
  audience: string;
  audienceFilter: string | null;
  status: string;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  expiresAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}): AnnouncementSummary => ({
  id: row.id,
  title: row.title,
  body: row.body,
  channels: parseChannels(row.channels),
  audience: (['all', 'role', 'segment'].includes(row.audience) ? row.audience : 'all') as Audience,
  audienceFilter: row.audienceFilter,
  status: (['draft', 'scheduled', 'published', 'archived'].includes(row.status)
    ? row.status
    : 'draft') as AnnouncementStatus,
  scheduledAt: row.scheduledAt?.toISOString() ?? null,
  publishedAt: row.publishedAt?.toISOString() ?? null,
  expiresAt: row.expiresAt?.toISOString() ?? null,
  createdById: row.createdById,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toCampaign = (row: {
  id: string;
  name: string;
  description: string | null;
  channel: string;
  subject: string | null;
  body: string;
  status: string;
  audience: string;
  audienceFilter: string | null;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  statsSent: number;
  statsOpened: number;
  statsClicked: number;
  statsBounced: number;
  createdById: string;
  createdAt: Date;
}): CampaignSummary => ({
  id: row.id,
  name: row.name,
  description: row.description,
  channel: (['email', 'sms', 'push'].includes(row.channel) ? row.channel : 'email') as 'email' | 'sms' | 'push',
  subject: row.subject,
  body: row.body,
  status: (['draft', 'scheduled', 'sending', 'completed', 'paused'].includes(row.status)
    ? row.status
    : 'draft') as CampaignStatus,
  audience: (['all', 'role', 'segment'].includes(row.audience) ? row.audience : 'all') as Audience,
  audienceFilter: row.audienceFilter,
  scheduledAt: row.scheduledAt?.toISOString() ?? null,
  startedAt: row.startedAt?.toISOString() ?? null,
  completedAt: row.completedAt?.toISOString() ?? null,
  stats: {
    sent: row.statsSent,
    opened: row.statsOpened,
    clicked: row.statsClicked,
    bounced: row.statsBounced,
  },
  createdById: row.createdById,
  createdAt: row.createdAt.toISOString(),
});

const fetchSnapshotRaw = async (): Promise<CommunicationSnapshot> => {
  const [announcements, campaigns] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  const announcementSummaries = announcements.map(toAnnouncement);
  const campaignSummaries = campaigns.map(toCampaign);

  // محاسبه metrics
  const published = announcementSummaries.filter((a) => a.status === 'published').length;
  const scheduled = announcementSummaries.filter((a) => a.status === 'scheduled').length;
  const drafts = announcementSummaries.filter((a) => a.status === 'draft').length;
  const active = campaignSummaries.filter(
    (c) => c.status === 'sending' || c.status === 'scheduled',
  ).length;

  const totalSent = campaignSummaries.reduce((s, c) => s + c.stats.sent, 0);
  const totalOpened = campaignSummaries.reduce((s, c) => s + c.stats.opened, 0);
  const totalClicked = campaignSummaries.reduce((s, c) => s + c.stats.clicked, 0);

  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 1000) / 10 : 0;
  const clickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 1000) / 10 : 0;

  // تعداد کل recipients از campaignRecipient
  const recipientCount = await prisma.campaignRecipient.count();

  return {
    generatedAt: new Date().toISOString(),
    announcements: announcementSummaries,
    campaigns: campaignSummaries,
    metrics: {
      publishedAnnouncements: published,
      scheduledAnnouncements: scheduled,
      draftAnnouncements: drafts,
      activeCampaigns: active,
      totalRecipients: recipientCount,
      totalSent,
      openRate,
      clickRate,
    },
  };
};

const emptySnapshot: CommunicationSnapshot = {
  generatedAt: new Date().toISOString(),
  announcements: [],
  campaigns: [],
  metrics: {
    publishedAnnouncements: 0,
    scheduledAnnouncements: 0,
    draftAnnouncements: 0,
    activeCampaigns: 0,
    totalRecipients: 0,
    totalSent: 0,
    openRate: 0,
    clickRate: 0,
  },
};

const getCachedSnapshot = safeCache(fetchSnapshotRaw, emptySnapshot, {
  key: 'communication-snapshot',
  ttl: 30,
  tags: ['announcement', 'campaign', 'communication'],
});

export async function getCommunicationSnapshot(): Promise<{
  success: boolean;
  data?: CommunicationSnapshot;
  message?: string;
}> {
  const guard = await requireAdminRole();
  if (!guard.ok) return { success: false, message: guard.reason };

  try {
    const data = await getCachedSnapshot();
    return { success: true, data };
  } catch (err) {
    return {
      success: true,
      data: emptySnapshot,
      message: err instanceof Error ? err.message : 'خطای ناشناخته',
    };
  }
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  channels: Channel[];
  audience: Audience;
  audienceFilter?: string | null;
  scheduledAt?: Date | null;
  expiresAt?: Date | null;
  status?: AnnouncementStatus;
}

export async function createAnnouncement(
  input: CreateAnnouncementInput,
): Promise<{ success: boolean; id?: string; message?: string }> {
  const guard = await requireAdminRole();
  if (!guard.ok) return { success: false, message: guard.reason };

  if (!input.title.trim() || !input.body.trim()) {
    return { success: false, message: 'عنوان و متن الزامی است' };
  }
  if (input.title.length > 200) {
    return { success: false, message: 'عنوان نباید بیش از ۲۰۰ کاراکتر باشد' };
  }
  if (input.body.length > 5000) {
    return { success: false, message: 'متن نباید بیش از ۵۰۰۰ کاراکتر باشد' };
  }

  try {
    const created = await prisma.announcement.create({
      data: {
        title: input.title.trim(),
        body: input.body.trim(),
        channels: input.channels.join(','),
        audience: input.audience,
        audienceFilter: input.audienceFilter ?? null,
        scheduledAt: input.scheduledAt ?? null,
        expiresAt: input.expiresAt ?? null,
        status: input.status ?? 'draft',
        createdById: guard.userId,
        publishedAt: input.status === 'published' ? new Date() : null,
      },
      select: { id: true },
    });
    revalidateTag('communication');
    revalidateTag('announcement');
    return { success: true, id: created.id };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در ساخت اعلان',
    };
  }
}

export async function publishAnnouncement(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  const guard = await requireAdminRole();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    await prisma.announcement.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });
    revalidateTag('communication');
    revalidateTag('announcement');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در انتشار',
    };
  }
}

export async function archiveAnnouncement(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  const guard = await requireAdminRole();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    await prisma.announcement.update({
      where: { id },
      data: { status: 'archived' },
    });
    revalidateTag('communication');
    revalidateTag('announcement');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در بایگانی',
    };
  }
}
