'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function NewCustomerLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-5)',
        padding: 'var(--ds-space-6)',
      }}
    >
      <Skeleton style={{ height: '2.5rem', width: '35%', borderRadius: 'var(--ds-radius-md)' }} />
      <Skeleton style={{ height: '1rem', width: '55%', borderRadius: 'var(--ds-radius-sm)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ds-space-4)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} style={{ height: '3.5rem', borderRadius: 'var(--ds-radius-md)' }} />
        ))}
      </div>
      <Skeleton style={{ height: '2.75rem', width: '30%', borderRadius: 'var(--ds-radius-md)' }} />
    </div>
  );
}
