'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function AnnouncementEditLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-5)',
        padding: 'var(--ds-space-6)',
      }}
    >
      <Skeleton style={{ height: '2.5rem', width: '40%', borderRadius: 'var(--ds-radius-md)' }} />
      <Skeleton style={{ height: '1rem', width: '60%', borderRadius: 'var(--ds-radius-sm)' }} />
      <Skeleton style={{ height: '12rem', borderRadius: 'var(--ds-radius-lg)' }} />
      <Skeleton style={{ height: '3rem', width: '30%', borderRadius: 'var(--ds-radius-md)' }} />
    </div>
  );
}
