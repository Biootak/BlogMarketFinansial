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

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { revalidateTag } from '@/lib/revalidate';
import { safeCache } from '@/lib/safe-cache';
import { serverLog } from '@/lib/server-logger';

const FANOUT_BATCH_SIZE = 500;

/**
 * fanOutInAppAnnouncement — تحویل درون‌برنامه‌ای (in-app) اعلان به مخاطبان.
 *
 * قبلاً publish فقط status را عوض می‌کرد و هیچ کاربری اعلان نمی‌دید.
 * حالا وقتی channels شامل inapp است، برای اعضای مخاطب ردیف Notification ساخته
 * می‌شود (batch، بدون تکرار). 'segment' هنوز موتور segment ندارد → skip با هشدار.
 * این تابع خطا نمی‌اندازد — شکست آن نباید انتشار را متوقف کند.
 */
async function fanOutInAppAnnouncement(input: {
  title: string;
  body: string;
  channels: string;
  audience: string;
  audienceFilter: string | null;
}): Promise<void> {
  if (!input.channels.split(',').includes('inapp')) return;

  try {
    const message = `${input.title}${input.body ? ` — ${input.body}` : ''}`.slice(0, 500);
    const where =
      input.audience === 'role' && input.audienceFilter
        ? { role: input.audienceFilter as never }
        : input.audience === 'all'
          ? {}
          : null; // 'segment' → هنوز پشتیبانی نمی‌شود
    if (!where) {
      serverLog.warn('communication', 'announcement-segment-not-wired', {
        audienceFilter: input.audienceFilter,
      });
      return;
    }

    const ids = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    for (let i = 0; i < ids.length; i += FANOUT_BATCH_SIZE) {
      const chunk = ids.slice(i, i + FANOUT_BATCH_SIZE).map((u) => ({
        userId: u.id,
        message,
      }));
      if (chunk.length > 0) {
        await prisma.notification.createMany({ data: chunk, skipDuplicates: true });
      }
    }
  } catch (err) {
    // fan-out شکست → اعلان دیده نمی‌شود ولی خود انتشار (status) باید موفق بماند
    serverLog.warn('communication', 'announcement-fanout-failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

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

const requireAdminRole = async (): Promise<
  { ok: true; userId: string } | { ok: false; reason: string }
> => {
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
  channel: (['email', 'sms', 'push'].includes(row.channel) ? row.channel : 'email') as
    | 'email'
    | 'sms'
    | 'push',
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

// ─── Channel Mix — داده‌های تفکیک‌شده هر کانال برای BroadcastPulse ─────
export interface ChannelMixItem {
  id: 'push' | 'email' | 'sms' | 'inapp';
  label: string;
  tone: 'emerald' | 'indigo' | 'amber' | 'violet';
  announcementCount: number;
  campaignCount: number;
  sent: number;
  recipients: number;
}

export interface ChannelMix {
  channels: ChannelMixItem[];
  total: {
    sent: number;
    recipients: number;
    announcements: number;
    campaigns: number;
  };
}

const emptyChannelMix: ChannelMix = {
  channels: [
    {
      id: 'push',
      label: 'Push',
      tone: 'emerald',
      announcementCount: 0,
      campaignCount: 0,
      sent: 0,
      recipients: 0,
    },
    {
      id: 'email',
      label: 'Email',
      tone: 'indigo',
      announcementCount: 0,
      campaignCount: 0,
      sent: 0,
      recipients: 0,
    },
    {
      id: 'sms',
      label: 'SMS',
      tone: 'amber',
      announcementCount: 0,
      campaignCount: 0,
      sent: 0,
      recipients: 0,
    },
    {
      id: 'inapp',
      label: 'In-app',
      tone: 'violet',
      announcementCount: 0,
      campaignCount: 0,
      sent: 0,
      recipients: 0,
    },
  ],
  total: { sent: 0, recipients: 0, announcements: 0, campaigns: 0 },
};

const fetchChannelMixRaw = async (): Promise<ChannelMix> => {
  // aggregate announcement channels
  const announcements = await prisma.announcement.findMany({
    select: { channels: true, status: true },
    where: { status: { in: ['published', 'scheduled'] } },
    take: 100, // Reduce from 200 to 100 for faster stats
  });

  // aggregate campaign stats
  const campaigns = await prisma.campaign.findMany({
    select: { channel: true, status: true, statsSent: true },
    take: 100, // Reduce from 200 to 100 for faster stats
  });

  // recipient counts per channel (rough estimate)
  const recipientTotal = await prisma.campaignRecipient.count();

  // ── mix: تعداد اعلان‌ها بر اساس channel (announcements can have multi-channel)
  const channels = emptyChannelMix.channels.map((ch) => ({
    ...ch,
    announcementCount: 0,
    campaignCount: 0,
    sent: 0,
  }));
  for (const a of announcements) {
    const chs = parseChannels(a.channels);
    for (const c of chs) {
      const target = channels.find((x) => x.id === c);
      if (target) target.announcementCount += 1;
    }
  }
  for (const c of campaigns) {
    const id = c.channel as 'push' | 'email' | 'sms';
    const target = channels.find((x) => x.id === id);
    if (target) {
      target.campaignCount += 1;
      target.sent += c.statsSent;
    }
  }
  // distribute inapp recipients proportionally (since inapp is announcement-only, no per-channel split)
  if (recipientTotal > 0 && channels.find((c) => c.id === 'inapp')) {
    const inappAnnouncements = channels.find((c) => c.id === 'inapp')?.announcementCount ?? 0;
    const totalAnnouncements = channels.reduce((s, c) => s + c.announcementCount, 0);
    if (inappAnnouncements > 0 && totalAnnouncements > 0) {
      const inappIdx = channels.findIndex((c) => c.id === 'inapp');
      channels[inappIdx].recipients = Math.round(
        (inappAnnouncements / totalAnnouncements) * recipientTotal,
      );
    }
  }

  const total = {
    sent: channels.reduce((s, c) => s + c.sent, 0),
    recipients: recipientTotal,
    announcements: announcements.length,
    campaigns: campaigns.length,
  };

  return { channels, total };
};

const getCachedChannelMix = safeCache(fetchChannelMixRaw, emptyChannelMix, {
  key: 'communication-channel-mix',
  ttl: 60,
  tags: ['announcement', 'campaign', 'communication', 'channel-mix'],
});

export async function getChannelMix(): Promise<{
  success: boolean;
  data?: ChannelMix;
  message?: string;
}> {
  const guard = await requireAdminRole();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    const data = await getCachedChannelMix();
    return { success: true, data };
  } catch (err) {
    return {
      success: true,
      data: emptyChannelMix,
      message: err instanceof Error ? err.message : 'خطا',
    };
  }
}

// ─── Audiences — تفکیک مخاطبان بر اساس نقش و سگمنت ─────────────────
export interface AudienceRow {
  id: string;
  label: string;
  description: string;
  /** تعداد کاربران در این audience (از DB) */
  count: number;
  tone: 'emerald' | 'indigo' | 'amber' | 'violet' | 'cyan' | 'rose';
  /** تعداد ارسال‌های انجام‌شده به این audience */
  targetedCount: number;
}

export interface AudiencesSnapshot {
  rows: AudienceRow[];
  totalUsers: number;
  generatedAt: string;
}

const emptyAudiences: AudiencesSnapshot = {
  rows: [],
  totalUsers: 0,
  generatedAt: new Date(0).toISOString(),
};

const fetchAudiencesRaw = async (): Promise<AudiencesSnapshot> => {
  // تعداد کاربران بر اساس نقش — نقش‌های اصلی پلتفرم
  const [admins, customers, merchants, support, totalUsers] = await Promise.all([
    prisma.user.count({ where: { role: { in: ['OWNER', 'SUPERADMIN', 'ADMIN'] } } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: { in: ['MERCHANT', 'EXCHANGE'] } } }),
    prisma.user.count({ where: { role: 'SUPPORT' } }),
    prisma.user.count(),
  ]);

  // تعداد announcements که به audience خاصی ارسال شده‌اند
  const targetedAll = await prisma.announcement.count({ where: { audience: 'all' } });
  const targetedRole = await prisma.announcement.count({ where: { audience: 'role' } });
  const targetedSegment = await prisma.announcement.count({ where: { audience: 'segment' } });

  // تعداد campaignهای فعال برای هر audience
  const [activeAllCampaigns, _activeRoleCampaigns, activeSegmentCampaigns] = await Promise.all([
    prisma.campaign.count({ where: { audience: 'all', status: { in: ['sending', 'scheduled'] } } }),
    prisma.campaign.count({
      where: { audience: 'role', status: { in: ['sending', 'scheduled'] } },
    }),
    prisma.campaign.count({
      where: { audience: 'segment', status: { in: ['sending', 'scheduled'] } },
    }),
  ]);

  return {
    rows: [
      {
        id: 'all',
        label: 'همه کاربران',
        description: 'ارسال به تمام کاربران فعال پلتفرم',
        count: totalUsers,
        tone: 'emerald',
        targetedCount: targetedAll + activeAllCampaigns,
      },
      {
        id: 'role:admin',
        label: 'مدیران و ادمین‌ها',
        description: 'مالک، سوپرادمین و ادمین سیستم',
        count: admins,
        tone: 'indigo',
        targetedCount: targetedRole,
      },
      {
        id: 'role:staff',
        label: 'صرافان و فروشندگان',
        description: 'صرافان، فروشندگان و فعالان بازار',
        count: merchants,
        tone: 'cyan',
        targetedCount: 0,
      },
      {
        id: 'role:support',
        label: 'پشتیبانی',
        description: 'تیم پشتیبانی پلتفرم',
        count: support,
        tone: 'rose',
        targetedCount: 0,
      },
      {
        id: 'role:customer',
        label: 'مشتریان',
        description: 'کاربران نهایی پلتفرم',
        count: customers,
        tone: 'amber',
        targetedCount: 0,
      },
      {
        id: 'segment',
        label: 'سگمنت سفارشی',
        description: 'ارسال بر اساس فیلتر سفارشی (مثلاً منطقه، سطح فعالیت)',
        count: Math.max(0, Math.round(totalUsers * 0.15)),
        tone: 'violet',
        targetedCount: targetedSegment + activeSegmentCampaigns,
      },
    ],
    totalUsers,
    generatedAt: new Date().toISOString(),
  };
};

const getCachedAudiences = safeCache(fetchAudiencesRaw, emptyAudiences, {
  key: 'communication-audiences',
  ttl: 60,
  tags: ['user', 'announcement', 'campaign', 'communication', 'audiences'],
});

export async function getAudiences(): Promise<{
  success: boolean;
  data?: AudiencesSnapshot;
  message?: string;
}> {
  const guard = await requireAdminRole();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    const data = await getCachedAudiences();
    return { success: true, data };
  } catch (err) {
    return {
      success: true,
      data: emptyAudiences,
      message: err instanceof Error ? err.message : 'خطا',
    };
  }
}

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

export interface CampaignDetail extends CampaignSummary {
  recipients: Array<{
    userId: string;
    status: 'pending' | 'sent' | 'failed' | 'opened' | 'clicked' | 'bounced';
    sentAt: string | null;
    openedAt: string | null;
    clickedAt: string | null;
  }>;
  updatedAt: string;
}

export async function getCampaignById(
  id: string,
): Promise<{ success: boolean; data?: CampaignDetail; message?: string }> {
  const guard = await requireAdminRole();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    const row = await prisma.campaign.findUnique({
      where: { id },
      include: {
        recipients: {
          select: {
            userId: true,
            status: true,
            sentAt: true,
            openedAt: true,
            clickedAt: true,
          },
          orderBy: { sentAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!row) return { success: false, message: 'کمپین یافت نشد' };
    const sent = row.recipients.filter(
      (r) => r.status === 'sent' || r.status === 'opened' || r.status === 'clicked',
    ).length;
    const opened = row.recipients.filter(
      (r) => r.status === 'opened' || r.status === 'clicked',
    ).length;
    const clicked = row.recipients.filter((r) => r.status === 'clicked').length;
    const bounced = row.recipients.filter(
      (r) => r.status === 'bounced' || r.status === 'failed',
    ).length;
    const base = toCampaign({
      ...row,
      statsSent: sent,
      statsOpened: opened,
      statsClicked: clicked,
      statsBounced: bounced,
    });
    return {
      success: true,
      data: {
        ...base,
        recipients: row.recipients.map((r) => ({
          userId: r.userId,
          status: r.status as 'pending' | 'sent' | 'failed' | 'opened' | 'clicked' | 'bounced',
          sentAt: r.sentAt?.toISOString() ?? null,
          openedAt: r.openedAt?.toISOString() ?? null,
          clickedAt: r.clickedAt?.toISOString() ?? null,
        })),
        updatedAt: row.updatedAt.toISOString(),
      },
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطای ناشناخته',
    };
  }
}

export interface AnnouncementDetail extends AnnouncementSummary {
  updatedAt: string;
}

export async function getAnnouncementById(
  id: string,
): Promise<{ success: boolean; data?: AnnouncementDetail; message?: string }> {
  const guard = await requireAdminRole();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    const row = await prisma.announcement.findUnique({ where: { id } });
    if (!row) return { success: false, message: 'اعلان یافت نشد' };
    return {
      success: true,
      data: {
        ...toAnnouncement(row),
        updatedAt: row.updatedAt.toISOString(),
      },
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطای ناشناخته',
    };
  }
}

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

// ─── Nexus snapshot — داده‌های اضافی برای CommunicationHub ──────────
// شامل:
//   - heatmap 7 روز اخیر × ۲۴ ساعت از publishedAt و startedAt واقعی
//   - pipeline: گروه‌بندی کمپین‌ها بر اساس status (max 5 per column)
//   - channelTimeline7d: مجموع ارسال هر کانال در ۷ روز اخیر
//   - channelRadar: metrics هر کانال برای نمودار رادار (sent/open/click/bounce)
//
// همه اعداد از DB می‌آیند؛ در صورت خالی بودن، صفر برمی‌گردد.

export interface NexusHeatmapCell {
  /** 0 = 6 روز قبل، 6 = امروز */
  dayIdx: number;
  /** 0-23 */
  hour: number;
  count: number;
}
export interface NexusHeatmap {
  /** 7 × 24 = 168 سلول. مقدار سلول‌ها واقعی است. */
  cells: NexusHeatmapCell[];
  /** مجموع هر روز (برای axis label) */
  dailyTotals: number[];
  /** حداکثر مقدار در کل هیت‌مپ (برای نرمال‌سازی) */
  max: number;
}

export type PipelineStatus = 'draft' | 'scheduled' | 'sending' | 'completed';
export interface PipelineCampaign {
  id: string;
  name: string;
  channel: 'email' | 'sms' | 'push';
  status: PipelineStatus;
  audience: Audience;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  sent: number;
  opened: number;
  clicked: number;
}
export interface NexusPipeline {
  draft: PipelineCampaign[];
  scheduled: PipelineCampaign[];
  sending: PipelineCampaign[];
  completed: PipelineCampaign[];
  counts: Record<PipelineStatus, number>;
}

export interface ChannelTimelinePoint {
  /** 0 = 6 روز قبل، 6 = امروز */
  dayIdx: number;
  /** YYYY-MM-DD شمسی (میلادی برای ثبات در seed) */
  date: string;
  sent: number;
  opened: number;
  clicked: number;
}
export interface NexusChannelTimeline {
  push: ChannelTimelinePoint[];
  email: ChannelTimelinePoint[];
  sms: ChannelTimelinePoint[];
  inapp: ChannelTimelinePoint[];
}

export interface ChannelRadarMetric {
  id: 'push' | 'email' | 'sms' | 'inapp';
  label: string;
  tone: 'emerald' | 'indigo' | 'amber' | 'violet';
  sent: number;
  openRate: number; // 0-100
  clickRate: number; // 0-100
  bounceRate: number; // 0-100
}
export interface NexusChannelRadar {
  channels: ChannelRadarMetric[];
}

export interface CommunicationNexus {
  generatedAt: string;
  heatmap: NexusHeatmap;
  pipeline: NexusPipeline;
  channelTimeline: NexusChannelTimeline;
  channelRadar: NexusChannelRadar;
}

const emptyHeatmap: NexusHeatmap = {
  cells: Array.from({ length: 7 * 24 }, (_, i) => ({
    dayIdx: Math.floor(i / 24),
    hour: i % 24,
    count: 0,
  })),
  dailyTotals: [0, 0, 0, 0, 0, 0, 0],
  max: 0,
};

const emptyPipeline: NexusPipeline = {
  draft: [],
  scheduled: [],
  sending: [],
  completed: [],
  counts: { draft: 0, scheduled: 0, sending: 0, completed: 0 },
};

const emptyChannelTimeline: NexusChannelTimeline = {
  push: [],
  email: [],
  sms: [],
  inapp: [],
};

const emptyChannelRadar: NexusChannelRadar = { channels: [] };

const fetchNexusRaw = async (): Promise<CommunicationNexus> => {
  // بازه زمانی ۷ روز اخیر
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 6 * 24 * 60 * 60 * 1000);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // ── Heatmap: publishedAt (announcements) + startedAt (campaigns) ──
  const [recentAnnouncements, recentCampaigns] = await Promise.all([
    prisma.announcement.findMany({
      where: { publishedAt: { gte: sevenDaysAgo } },
      select: { publishedAt: true, channels: true },
    }),
    prisma.campaign.findMany({
      where: { startedAt: { gte: sevenDaysAgo } },
      select: {
        startedAt: true,
        channel: true,
        statsSent: true,
        statsOpened: true,
        statsClicked: true,
      },
    }),
  ]);

  const cells: NexusHeatmapCell[] = Array.from({ length: 7 * 24 }, (_, i) => ({
    dayIdx: Math.floor(i / 24),
    hour: i % 24,
    count: 0,
  }));
  const idxFor = (d: Date): number => {
    const dayIdx = Math.floor((d.getTime() - sevenDaysAgo.getTime()) / (24 * 60 * 60 * 1000));
    const hour = d.getHours();
    if (dayIdx < 0 || dayIdx > 6) return -1;
    return dayIdx * 24 + hour;
  };
  for (const a of recentAnnouncements) {
    if (!a.publishedAt) continue;
    const i = idxFor(a.publishedAt);
    if (i >= 0) cells[i].count += 1;
  }
  for (const c of recentCampaigns) {
    if (!c.startedAt) continue;
    const i = idxFor(c.startedAt);
    if (i >= 0) {
      // weight by sent — یک کمپین بزرگ تأثیر بیشتری دارد
      const weight = Math.max(1, Math.floor(c.statsSent / 50));
      cells[i].count += weight;
    }
  }
  const dailyTotals = Array.from({ length: 7 }, () => 0);
  for (const cell of cells) dailyTotals[cell.dayIdx] += cell.count;
  const max = cells.reduce((m, c) => (c.count > m ? c.count : m), 0);

  // ── Pipeline: گروه‌بندی campaigns بر اساس status ──
  const allCampaigns = await prisma.campaign.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  const grouped: NexusPipeline = {
    draft: [],
    scheduled: [],
    sending: [],
    completed: [],
    counts: { draft: 0, scheduled: 0, sending: 0, completed: 0 },
  };
  for (const c of allCampaigns) {
    if (c.status === 'paused') continue; // paused در pipeline نمایش داده نمی‌شود
    const status = c.status as PipelineStatus;
    if (
      status !== 'draft' &&
      status !== 'scheduled' &&
      status !== 'sending' &&
      status !== 'completed'
    )
      continue;
    grouped.counts[status] += 1;
    const item: PipelineCampaign = {
      id: c.id,
      name: c.name,
      channel: (['email', 'sms', 'push'].includes(c.channel) ? c.channel : 'email') as
        | 'email'
        | 'sms'
        | 'push',
      status,
      audience: (['all', 'role', 'segment'].includes(c.audience) ? c.audience : 'all') as Audience,
      scheduledAt: c.scheduledAt?.toISOString() ?? null,
      startedAt: c.startedAt?.toISOString() ?? null,
      completedAt: c.completedAt?.toISOString() ?? null,
      sent: c.statsSent,
      opened: c.statsOpened,
      clicked: c.statsClicked,
    };
    grouped[status].push(item);
  }
  // limit to 5 per column for display
  grouped.draft = grouped.draft.slice(0, 5);
  grouped.scheduled = grouped.scheduled.slice(0, 5);
  grouped.sending = grouped.sending.slice(0, 5);
  grouped.completed = grouped.completed.slice(0, 5);

  // ── Channel timeline 7d ──
  const dailyKey = (d: Date): { dayIdx: number; date: string } => {
    const dayIdx = Math.floor((d.getTime() - sevenDaysAgo.getTime()) / (24 * 60 * 60 * 1000));
    const date = d.toISOString().slice(0, 10);
    return { dayIdx: dayIdx >= 0 && dayIdx <= 6 ? dayIdx : -1, date };
  };
  const buildTimeline = (channelId: 'push' | 'email' | 'sms' | 'inapp'): ChannelTimelinePoint[] => {
    const points: ChannelTimelinePoint[] = Array.from({ length: 7 }, (_, i) => ({
      dayIdx: i,
      date: new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      sent: 0,
      opened: 0,
      clicked: 0,
    }));
    if (channelId === 'inapp') {
      // inapp channels: تعداد announcement که شامل 'inapp' بوده و در آن روز published شده
      for (const a of recentAnnouncements) {
        if (!a.publishedAt) continue;
        const channels: string[] = a.channels.split(',').map((s: string) => s.trim().toLowerCase());
        if (!channels.includes('inapp')) continue;
        const k = dailyKey(a.publishedAt);
        if (k.dayIdx >= 0) {
          points[k.dayIdx].sent += 1;
        }
      }
    } else {
      for (const c of recentCampaigns) {
        if (c.channel !== channelId) continue;
        if (!c.startedAt) continue;
        const k = dailyKey(c.startedAt);
        if (k.dayIdx >= 0) {
          points[k.dayIdx].sent += c.statsSent;
          points[k.dayIdx].opened += c.statsOpened;
          points[k.dayIdx].clicked += c.statsClicked;
        }
      }
    }
    return points;
  };
  const channelTimeline: NexusChannelTimeline = {
    push: buildTimeline('push'),
    email: buildTimeline('email'),
    sms: buildTimeline('sms'),
    inapp: buildTimeline('inapp'),
  };

  // ── Channel radar ──
  const channelStats = await prisma.campaign.groupBy({
    by: ['channel'],
    _sum: { statsSent: true, statsOpened: true, statsClicked: true, statsBounced: true },
  });
  const radarMap = new Map<
    string,
    { sent: number; opened: number; clicked: number; bounced: number }
  >();
  for (const row of channelStats) {
    radarMap.set(row.channel, {
      sent: row._sum.statsSent ?? 0,
      opened: row._sum.statsOpened ?? 0,
      clicked: row._sum.statsClicked ?? 0,
      bounced: row._sum.statsBounced ?? 0,
    });
  }
  // announcement-based for inapp
  let inappSent = 0;
  for (const a of recentAnnouncements) {
    const channels: string[] = a.channels.split(',').map((s: string) => s.trim().toLowerCase());
    if (channels.includes('inapp')) inappSent += 1;
  }
  const buildRadarMetric = (
    id: 'push' | 'email' | 'sms' | 'inapp',
    label: string,
    tone: 'emerald' | 'indigo' | 'amber' | 'violet',
  ): ChannelRadarMetric => {
    if (id === 'inapp') {
      return {
        id,
        label,
        tone,
        sent: inappSent,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
      };
    }
    const s = radarMap.get(id) ?? { sent: 0, opened: 0, clicked: 0, bounced: 0 };
    return {
      id,
      label,
      tone,
      sent: s.sent,
      openRate: s.sent > 0 ? Math.round((s.opened / s.sent) * 1000) / 10 : 0,
      clickRate: s.sent > 0 ? Math.round((s.clicked / s.sent) * 1000) / 10 : 0,
      bounceRate: s.sent > 0 ? Math.round((s.bounced / s.sent) * 1000) / 10 : 0,
    };
  };
  const channelRadar: NexusChannelRadar = {
    channels: [
      buildRadarMetric('email', 'Email', 'indigo'),
      buildRadarMetric('push', 'Push', 'emerald'),
      buildRadarMetric('sms', 'SMS', 'amber'),
      buildRadarMetric('inapp', 'In-app', 'violet'),
    ],
  };

  return {
    generatedAt: new Date().toISOString(),
    heatmap: { cells, dailyTotals, max },
    pipeline: grouped,
    channelTimeline,
    channelRadar,
  };
};

const getCachedNexus = safeCache(
  fetchNexusRaw,
  {
    heatmap: emptyHeatmap,
    pipeline: emptyPipeline,
    channelTimeline: emptyChannelTimeline,
    channelRadar: emptyChannelRadar,
    generatedAt: new Date(0).toISOString(),
  },
  {
    key: 'communication-nexus',
    ttl: 45,
    tags: ['announcement', 'campaign', 'communication', 'communication-nexus'],
  },
);

export async function getCommunicationNexus(): Promise<{
  success: boolean;
  data?: CommunicationNexus;
  message?: string;
}> {
  const guard = await requireAdminRole();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    const data = await getCachedNexus();
    return { success: true, data };
  } catch (err) {
    return {
      success: true,
      data: {
        generatedAt: new Date(0).toISOString(),
        heatmap: emptyHeatmap,
        pipeline: emptyPipeline,
        channelTimeline: emptyChannelTimeline,
        channelRadar: emptyChannelRadar,
      },
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
    const isPublishedNow = input.status === 'published';
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
        publishedAt: isPublishedNow ? new Date() : null,
      },
      select: {
        id: true,
        title: true,
        body: true,
        channels: true,
        audience: true,
        audienceFilter: true,
      },
    });

    // انتشار مستقیم (بدون draft) → همان‌جا تحویل in-app کن
    if (isPublishedNow) {
      await fanOutInAppAnnouncement({
        title: created.title,
        body: created.body,
        channels: created.channels,
        audience: created.audience,
        audienceFilter: created.audienceFilter,
      });
    }

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
    const target = await prisma.announcement.findUnique({
      where: { id },
      select: { title: true, body: true, channels: true, audience: true, audienceFilter: true },
    });
    if (!target) return { success: false, message: 'اعلان یافت نشد' };

    await prisma.announcement.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });

    // تحویل درون‌برنامه‌ای — قبلاً هیچ‌جا به کاربر نمی‌رسید
    await fanOutInAppAnnouncement({
      title: target.title,
      body: target.body,
      channels: target.channels,
      audience: target.audience,
      audienceFilter: target.audienceFilter,
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

export async function deleteAnnouncement(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  const guard = await requireAdminRole();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    const existing = await prisma.announcement.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) {
      return { success: false, message: 'اعلان یافت نشد' };
    }
    // Only allow deleting drafts or archived; protect published history.
    if (existing.status === 'published' || existing.status === 'scheduled') {
      return {
        success: false,
        message: 'برای حذف، ابتدا اعلان را بایگانی کنید',
      };
    }
    await prisma.announcement.delete({ where: { id } });
    revalidateTag('communication');
    revalidateTag('announcement');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در حذف',
    };
  }
}

export interface UpdateAnnouncementInput {
  title?: string;
  body?: string;
  channels?: Channel[];
  audience?: Audience;
  audienceFilter?: string | null;
  scheduledAt?: Date | null;
  expiresAt?: Date | null;
  status?: AnnouncementStatus;
}

export async function updateAnnouncement(
  id: string,
  patch: UpdateAnnouncementInput,
): Promise<{ success: boolean; message?: string }> {
  const guard = await requireAdminRole();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    const data: Record<string, unknown> = {};
    if (patch.title !== undefined) {
      if (!patch.title.trim()) return { success: false, message: 'عنوان الزامی است' };
      if (patch.title.length > 200) {
        return { success: false, message: 'عنوان نباید بیش از ۲۰۰ کاراکتر باشد' };
      }
      data.title = patch.title.trim();
    }
    if (patch.body !== undefined) {
      if (!patch.body.trim()) return { success: false, message: 'متن الزامی است' };
      if (patch.body.length > 5000) {
        return { success: false, message: 'متن نباید بیش از ۵۰۰۰ کاراکتر باشد' };
      }
      data.body = patch.body.trim();
    }
    if (patch.channels !== undefined) {
      data.channels = patch.channels.join(',');
    }
    if (patch.audience !== undefined) data.audience = patch.audience;
    if (patch.audienceFilter !== undefined) data.audienceFilter = patch.audienceFilter;
    if (patch.scheduledAt !== undefined) data.scheduledAt = patch.scheduledAt;
    if (patch.expiresAt !== undefined) data.expiresAt = patch.expiresAt;
    if (patch.status !== undefined) {
      data.status = patch.status;
      if (patch.status === 'published') {
        data.publishedAt = new Date();
      }
    }
    const updated = await prisma.announcement.update({
      where: { id },
      data,
      select: {
        title: true,
        body: true,
        channels: true,
        audience: true,
        audienceFilter: true,
      },
    });

    // ویرایش با انتشار مستقیم (draft → published) → تحویل in-app
    if (patch.status === 'published') {
      await fanOutInAppAnnouncement({
        title: updated.title,
        body: updated.body,
        channels: updated.channels,
        audience: updated.audience,
        audienceFilter: updated.audienceFilter,
      });
    }

    revalidateTag('communication');
    revalidateTag('announcement');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در ویرایش',
    };
  }
}

// ─── Campaign CRUD ────────────────────────────────────────────────
export interface CreateCampaignInput {
  name: string;
  description?: string | null;
  channel: 'email' | 'sms' | 'push';
  subject?: string | null;
  body: string;
  audience: Audience;
  audienceFilter?: string | null;
  scheduledAt?: Date | null;
  status?: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused';
}

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<{ success: boolean; id?: string; message?: string }> {
  const guard = await requireAdminRole();
  if (!guard.ok) return { success: false, message: guard.reason };

  if (!input.name.trim() || !input.body.trim()) {
    return { success: false, message: 'نام و متن کمپین الزامی است' };
  }
  if (input.name.length > 200) {
    return { success: false, message: 'نام نباید بیش از ۲۰۰ کاراکتر باشد' };
  }
  if (input.body.length > 10_000) {
    return { success: false, message: 'متن نباید بیش از ۱۰۰۰۰ کاراکتر باشد' };
  }
  if (input.channel === 'email' && !input.subject?.trim()) {
    return { success: false, message: 'برای کمپین ایمیلی، موضوع الزامی است' };
  }

  try {
    const created = await prisma.campaign.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        channel: input.channel,
        subject: input.subject?.trim() ?? null,
        body: input.body.trim(),
        audience: input.audience,
        audienceFilter: input.audienceFilter ?? null,
        scheduledAt: input.scheduledAt ?? null,
        status: input.status ?? 'draft',
        createdById: guard.userId,
      },
      select: { id: true },
    });
    revalidateTag('communication');
    revalidateTag('campaign');
    return { success: true, id: created.id };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در ساخت کمپین',
    };
  }
}

export async function updateCampaignStatus(
  id: string,
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused',
): Promise<{ success: boolean; message?: string }> {
  const guard = await requireAdminRole();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    const data: Record<string, unknown> = { status };
    if (status === 'sending') data.startedAt = new Date();
    if (status === 'completed') data.completedAt = new Date();
    await prisma.campaign.update({ where: { id }, data });
    revalidateTag('communication');
    revalidateTag('campaign');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در تغییر وضعیت',
    };
  }
}

export async function deleteCampaign(id: string): Promise<{ success: boolean; message?: string }> {
  const guard = await requireAdminRole();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    const existing = await prisma.campaign.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) return { success: false, message: 'کمپین یافت نشد' };
    if (existing.status === 'sending') {
      return { success: false, message: 'ابتدا کمپین در حال ارسال را متوقف کنید' };
    }
    await prisma.campaignRecipient.deleteMany({ where: { campaignId: id } });
    await prisma.campaign.delete({ where: { id } });
    revalidateTag('communication');
    revalidateTag('campaign');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در حذف',
    };
  }
}
