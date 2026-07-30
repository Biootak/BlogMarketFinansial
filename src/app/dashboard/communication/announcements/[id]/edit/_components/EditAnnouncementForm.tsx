'use client';

/**
 * EditAnnouncementForm — thin wrapper around the shared BroadcastForm (NewCampaignForm).
 *  صفحه ویرایش اعلان: فقط initial values را از props می‌گیرد و به NewCampaignForm پاس می‌دهد.
 *  فرم اصلی در `NewCampaignForm.tsx` قرار دارد (هم برای new و هم برای edit استفاده می‌شود).
 */

import { useMemo } from 'react';
import { NewCampaignForm } from '@/app/dashboard/communication/campaigns/new/_components/NewCampaignForm';
import s from './EditAnnouncementForm.module.css';

type Status = 'draft' | 'scheduled' | 'published' | 'archived';
type Channel = 'inapp' | 'email' | 'push' | 'sms';
type Audience = 'all' | 'role' | 'segment';

interface Props {
  announcement: {
    id: string;
    title: string;
    body: string;
    channels: Channel[];
    audience: Audience;
    audienceFilter: string | null;
    status: Status;
    scheduledAt: string | null;
    publishedAt: string | null;
    expiresAt: string | null;
  };
}

export function EditAnnouncementForm({ announcement }: Props) {
  // map announcement → initialValues برای NewCampaignForm
  const initialValues = useMemo(
    () => ({
      name: announcement.title,
      subject: null,
      body: announcement.body,
      channels: announcement.channels,
      audience: announcement.audience,
      audienceFilter: announcement.audienceFilter,
      scheduledAt: announcement.scheduledAt,
      status: announcement.status,
    }),
    [announcement],
  );

  return (
    <div dir="rtl" className={s.shell}>
      <NewCampaignForm
        editId={announcement.id}
        entityLabel="اعلان"
        initialValues={initialValues}
        backHref={`/dashboard/communication/announcements/${announcement.id}`}
      />
    </div>
  );
}
