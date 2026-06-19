import { Skeleton } from '@/components/ds';

/**
 * Loading state برای صفحه‌ی Archive
 * - Hero skeleton + 12 card skeletons در auto-fit grid
 */
export default function ArchiveLoading() {
  return (
    <div className="nc-PageArchive max-w-full @container/archive @md/archive:overflow-x-visible">
      <div className="container mt-4 sm:mt-6 mb-6 sm:mb-8">
        <div
          className="archive-hero"
          style={{ minBlockSize: '20rem', padding: 'var(--ds-space-6)' }}
        >
          <Skeleton width="60%" height="3rem" className="mb-3" />
          <Skeleton width="80%" height="1.25rem" />
        </div>
      </div>

      <div className="container">
        <div className="archive-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="ds-card" style={{ overflow: 'hidden' }}>
              <Skeleton block height="auto" style={{ aspectRatio: '4 / 3' }} />
              <div className="ds-card__body">
                <Skeleton width="40%" height="0.875rem" />
                <Skeleton width="90%" height="1.25rem" />
                <Skeleton width="70%" height="0.875rem" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
