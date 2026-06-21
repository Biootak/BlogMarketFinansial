import { Skeleton } from '@/components/ds';

/**
 * ArchiveLoading — skeleton for the Atelier archive (2026).
 * Mirrors the real layout 1:1 (same .atl-* containers and dimensions) so the
 * transition to real content is shift-free (low CLS). Pure server component,
 * no client JS, motion respects the global reduced-motion rule.
 */
export default function ArchiveLoading() {
  return (
    <div className="atl-page" aria-busy="true" aria-label="در حال بارگذاری آرشیو">
      {/* ===== Hero ===== */}
      <div className="container" style={{ marginTop: 'var(--ds-space-5)' }}>
        <div className="atl-crumbs" style={{ marginBottom: 'var(--ds-space-4)' }}>
          <Skeleton width="3rem" height="0.875rem" />
          <Skeleton width="3.5rem" height="0.875rem" />
          <Skeleton width="5rem" height="0.875rem" />
        </div>

        <header className="atl-hero">
          <div className="atl-hero__intro">
            <Skeleton width="9rem" height="0.875rem" />
            <Skeleton width="8rem" height="1.75rem" style={{ borderRadius: '9999px' }} />
            <Skeleton width="80%" height="3rem" />
            <Skeleton width="55%" height="3rem" />
            <Skeleton width="90%" height="1rem" />
            <Skeleton width="70%" height="1rem" />

            <div className="atl-quicklinks" style={{ marginTop: 'var(--ds-space-2)' }}>
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} width="5rem" height="1.75rem" style={{ borderRadius: '9999px' }} />
              ))}
            </div>

            <div className="atl-stats">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="atl-stat">
                  <Skeleton width="3rem" height="1.5rem" />
                  <Skeleton width="5rem" height="0.75rem" />
                </div>
              ))}
            </div>
          </div>

          <div className="atl-hero__feature">
            <Skeleton block height="100%" className="absolute inset-0" />
          </div>
        </header>
      </div>

      {/* ===== Toolbar + grid ===== */}
      <div className="container" style={{ marginTop: 'var(--ds-space-6)' }}>
        <div className="atl-toolbar">
          <div className="atl-toolbar__search">
            <Skeleton block height="2.6rem" style={{ borderRadius: '9999px' }} />
          </div>
          <div className="atl-toolbar__group">
            <Skeleton width="7rem" height="2.25rem" style={{ borderRadius: '9999px' }} />
            <Skeleton width="7rem" height="2.25rem" style={{ borderRadius: '9999px' }} />
            <Skeleton width="13rem" height="2.25rem" style={{ borderRadius: '9999px' }} />
          </div>
        </div>

        <div className="atl-result-meta">
          <Skeleton width="14rem" height="1rem" />
          <span className="atl-result-meta__rule" aria-hidden />
        </div>

        <div className="atl-grid">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="atl-card">
              <div className="atl-card__media">
                <Skeleton block height="100%" className="absolute inset-0" />
              </div>
              <div className="atl-card__body">
                <Skeleton width="35%" height="0.75rem" />
                <Skeleton width="92%" height="1.1rem" />
                <Skeleton width="65%" height="1.1rem" />
                <div className="atl-card__foot">
                  <Skeleton width="6rem" height="0.875rem" />
                  <Skeleton width="3rem" height="0.875rem" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
