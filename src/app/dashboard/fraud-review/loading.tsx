import { Skeleton } from '@/components/Dashboard/primitives';

export default function FraudReviewLoading() {
  return (
    <div className="route-frame" dir="rtl">
      <div className="space-y-5">
        {/* PageHeader skeleton */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: 'var(--at-surface)',
            border: '1px solid var(--at-line)',
            borderRadius: '14px',
            marginBottom: '1.25rem',
          }}
        >
          <Skeleton variant="text" className="w-52 h-7 mb-2" />
          <Skeleton variant="text" className="w-64 h-4" />
        </div>
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`stat-${i}`} variant="card" className="h-24 rounded-xl" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={`sk-${i}`} variant="row" className="h-14" />
        ))}
      </div>
    </div>
  );
}

