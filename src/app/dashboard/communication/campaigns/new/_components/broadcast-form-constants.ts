'use client';

/**
 * BroadcastForm constants — channels و audiences specifications.
 *  Shared between NewCampaignForm و BroadcastFormPreview.
 */

import type { LucideIcon } from 'lucide-react';
import { Bell, Inbox, Mail, Smartphone, Sparkles, Target, Users } from 'lucide-react';

export type Channel = 'inapp' | 'email' | 'push' | 'sms';
export type Audience = 'all' | 'role' | 'segment';
export type Status = 'draft' | 'scheduled' | 'published' | 'archived' | 'sending';
export type ChannelTone = 'emerald' | 'indigo' | 'amber' | 'violet';

export interface ChannelSpec {
  id: Channel;
  label: string;
  hint: string;
  tone: ChannelTone;
  icon: LucideIcon;
}

export const CHANNELS: ChannelSpec[] = [
  { id: 'inapp', label: 'In-app', hint: 'نوتیفیکیشن درون‌برنامه', tone: 'violet', icon: Inbox },
  { id: 'push', label: 'Push', hint: 'نوتیفیکیشن مرورگر', tone: 'emerald', icon: Bell },
  { id: 'email', label: 'Email', hint: 'ایمیل — نیاز به موضوع', tone: 'indigo', icon: Mail },
  { id: 'sms', label: 'SMS', hint: 'پیامک — هزینه‌بر', tone: 'amber', icon: Smartphone },
];

export interface AudienceSpec {
  id: Audience;
  label: string;
  description: string;
  count: number;
  tone: 'emerald' | 'indigo' | 'amber';
  icon: LucideIcon;
}

export const AUDIENCES: AudienceSpec[] = [
  { id: 'all', label: 'همه کاربران', description: 'ارسال به تمام کاربران فعال پلتفرم', count: 12_400, tone: 'emerald', icon: Users },
  { id: 'role', label: 'بر اساس نقش', description: 'مثلاً فقط مدیران یا صرافان', count: 280, tone: 'indigo', icon: Target },
  { id: 'segment', label: 'سگمنت سفارشی', description: 'سگمنت تعریف‌شده در بخش مخاطبان', count: 1_850, tone: 'amber', icon: Sparkles },
];

export const toPersianDigits = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
