'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function AudienceDetailLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)', padding: 'var(--ds-space-6)' }}>
      <Skeleton style={{ height: '2.5rem', width: '40%', borderRadius: 'var(--ds-radius-md)' }} />
      <Skeleton style={{ height: '1rem', width: '60%', borderRadius: 'var(--ds-radius-sm)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--ds-space-4)' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} style={{ height: '6rem', borderRadius: 'var(--ds-radius-lg)' }} />
        ))}
      </div>
      <Skeleton style={{ height: '16rem', borderRadius: 'var(--ds-radius-lg)' }} />
    </div>
  );
}
