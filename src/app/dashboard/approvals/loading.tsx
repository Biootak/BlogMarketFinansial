import { Skeleton } from '@/components/Dashboard/primitives';

export default function ApprovalsLoading() {
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
      <div style={{ height: 88, borderRadius: 14, overflow: 'hidden' }}>
        <Skeleton variant="card" className="!h-full" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ height: 78, borderRadius: 10, overflow: 'hidden' }}>
            <Skeleton variant="card" className="!h-full" />
          </div>
        ))}
      </div>
      <div style={{ height: 380, borderRadius: 14, overflow: 'hidden' }}>
        <Skeleton variant="card" className="!h-full" />
      </div>
    </div>
  );
}
