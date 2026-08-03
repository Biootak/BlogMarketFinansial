'use client';

/**
 * BroadcastFormPreview — sticky live preview pane.
 *  Page-specific (right column در فرم) — co-located.
 */

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Bell, Eye, Inbox, Mail, Smartphone } from 'lucide-react';
import s from './NewCampaign.module.css';

const toPersianDigits = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

type Channel = 'inapp' | 'email' | 'push' | 'sms';

interface ChannelMeta {
  id: Channel;
  label: string;
  tone: 'emerald' | 'indigo' | 'amber' | 'violet';
  icon: LucideIcon;
}

const CHANNEL_META: Record<Channel, ChannelMeta> = {
  inapp: { id: 'inapp', label: 'In-app', tone: 'violet', icon: Inbox },
  push: { id: 'push', label: 'Push', tone: 'emerald', icon: Bell },
  email: { id: 'email', label: 'Email', tone: 'indigo', icon: Mail },
  sms: { id: 'sms', label: 'SMS', tone: 'amber', icon: Smartphone },
};

interface BroadcastFormPreviewProps {
  campaignMode: boolean;
  channels: Channel[];
  name: string;
  body: string;
  subject: string;
  reachCount: number;
}

export function BroadcastFormPreview({
  campaignMode,
  channels,
  name,
  body,
  subject,
  reachCount,
}: BroadcastFormPreviewProps) {
  return (
    <aside className={s.colRight}>
      <div className={s.preview}>
        <header className={s.previewHead}>
          <span className={s.previewHeadLeft}>
            <Eye size={14} aria-hidden />
            پیش‌نمایش زنده
          </span>
          <span className={s.previewHeadRight} data-live="true">
            <span className={s.previewDot} />
            همگام
          </span>
        </header>

        <div className={s.previewBody}>
          {campaignMode && channels[0] === 'email' && subject ? (
            <div className={s.previewSubject}>{subject}</div>
          ) : null}

          <h3 className={cn(s.previewTitle, !name && s.previewPlaceholder)}>
            {name || 'عنوان پیام شما اینجا نمایش داده می‌شود.'}
          </h3>
          <p className={cn(s.previewBodyText, !body && s.previewPlaceholder)}>
            {body || 'متن پیام خود را بنویسید. این پیش‌نمایش بلافاصله به‌روز می‌شود.'}
          </p>
        </div>

        <footer className={s.previewFoot}>
          <div className={s.previewChips}>
            {channels.map((cId) => {
              const c = CHANNEL_META[cId];
              if (!c) return null;
              const Icon = c.icon;
              return (
                <span key={cId} className={s.previewChip} data-tone={c.tone}>
                  <Icon size={11} aria-hidden />
                  {c.label}
                </span>
              );
            })}
          </div>
          <span className={s.previewAudience}>
            {toPersianDigits(reachCount.toLocaleString('en-US'))} گیرنده
          </span>
        </footer>
      </div>
    </aside>
  );
}
