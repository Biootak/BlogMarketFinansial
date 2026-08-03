/**
 * Types — CommunicationHub data shape
 * ─────────────────────────────────────────────────────────────────
 * این فایل فقط types را نگه می‌دارد (نه JSX/UI). استفاده در
 * CommunicationHub برای typing داده‌های ورودی از
 * getCommunicationSnapshot().
 */

export type CommunicationChannelId = 'inapp' | 'email' | 'push' | 'sms';

export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused';
export type Audience = 'all' | 'role' | 'segment';
export type ChannelTone = 'emerald' | 'indigo' | 'amber' | 'violet' | 'rose' | 'cyan';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  channels: CommunicationChannelId[];
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

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  channel: 'email' | 'sms' | 'push';
  subject: string | null;
  body: string;
  status: CampaignStatus;
  audience: Audience;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  stats: { sent: number; opened: number; clicked: number; bounced: number };
  createdById: string;
  createdAt: string;
}

export interface ChannelMixData {
  channels: Array<{
    id: CommunicationChannelId;
    label: string;
    tone: ChannelTone;
    announcementCount: number;
    campaignCount: number;
    sent: number;
    recipients: number;
  }>;
  total: {
    sent: number;
    recipients: number;
    announcements: number;
    campaigns: number;
  };
}

export interface RecentActivityItem {
  id: string;
  at: string;
  title: string;
  detail?: string;
  tone?: ChannelTone;
}

export interface CommunicationMetrics {
  publishedAnnouncements: number;
  scheduledAnnouncements: number;
  draftAnnouncements: number;
  activeCampaigns: number;
  totalRecipients: number;
  totalSent: number;
  openRate: number;
  clickRate: number;
}

export interface CommunicationHubData {
  generatedAt: string;
  announcements: Announcement[];
  campaigns: Campaign[];
  metrics: CommunicationMetrics;
  series24h: number[];
  recentActivity: RecentActivityItem[];
  channelMix: ChannelMixData;
  /** تعداد واقعی سگمنت‌های تعریف‌شده */
  audienceCount?: number;
  /** تعداد کل کاربران فعال پلتفرم */
  totalUsers?: number;
}
