import { Skeleton } from '@/components/Dashboard/primitives';

export default function AuditLogLoading() {
  return (
    <div className="at-page" dir="rtl">
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
          <Skeleton variant="text" className="w-48 h-7 mb-2" />
          <Skeleton variant="text" className="w-64 h-4" />
        </div>
        {/* Filter bar skeleton */}
        <div className="flex items-center gap-3 mb-4">
          <Skeleton variant="text" className="w-56 h-9 rounded-md" />
          <Skeleton variant="text" className="w-36 h-9 rounded-md" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={`sk-${i}`} variant="row" className="h-12" />
        ))}
      </div>
    </div>
  );
}
