import type { Advertisement, PostWithRelations } from '@/types/types';
import { memo } from 'react';
import ArchiveAdCard from './ArchiveAdCard';
import AtelierCard from './AtelierCard';

/**
 * AtelierGrid — editorial grid with inline ad strips (2026).
 *
 * همه کارت‌ها در یک grid هستند. تبلیغ با `grid-column: 1 / -1` کل عرض را
 * می‌گیرد و بین هر N کارت قرار می‌گیرد — بدون chunk جداگانه.
 * این روش ردیف‌های ناقص را حذف می‌کند چون grid هرگز قطع نمی‌شود.
 */
type Props = {
  posts: PostWithRelations[];
  ads?: Advertisement[];
};

/** After how many cards to insert an ad strip */
const AD_EVERY = 10;

const AtelierGrid: React.FC<Props> = memo(
  ({ posts, ads = [] }) => {
    if (posts.length === 0) return null;

    let adCursor = 0;

    // Build a flat list of grid items: cards + full-span ad strips
    const items: React.ReactNode[] = [];

    posts.forEach((post, i) => {
      items.push(<AtelierCard key={post.id} post={post} priority={i < 3} />);

      // After every AD_EVERY cards (but not after the very last card), insert an ad
      const isLast = i === posts.length - 1;
      if (!isLast && (i + 1) % AD_EVERY === 0 && adCursor < ads.length) {
        const slice = ads.slice(adCursor, adCursor + 2);
        adCursor += slice.length;
        items.push(
          // biome-ignore lint/suspicious/noArrayIndexKey: positional ad strip — stable order
          <div key={`ad-${i}`} className="atl-grid-ad">
            <div className="atl-adstrip">
              <span className="atl-adstrip__label">تبلیغات</span>
              <div className="atl-adstrip__row">
                {slice.map((ad) => (
                  <div key={ad.id} className="atl-adstrip__item">
                    <ArchiveAdCard ad={ad} />
                  </div>
                ))}
              </div>
            </div>
          </div>,
        );
      }
    });

    // Remaining ads at the end
    if (adCursor < ads.length) {
      const tail = ads.slice(adCursor);
      items.push(
        <div key="ad-tail" className="atl-grid-ad">
          <div className="atl-adstrip">
            <span className="atl-adstrip__label">تبلیغات</span>
            <div className="atl-adstrip__row">
              {tail.map((ad) => (
                <div key={ad.id} className="atl-adstrip__item">
                  <ArchiveAdCard ad={ad} />
                </div>
              ))}
            </div>
          </div>
        </div>,
      );
    }

    return (
      <div className="atl-feed">
        <div className="atl-grid">{items}</div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // 2026-08-08: نسخهٔ قبلی در هر رندر `posts.map(p => p.id).join(',')`
    // می‌ساخت (O(n) با تخصیص string). این نسخه بدون تخصیص است:
    // - همان آرایه → skip
    // - طول متفاوت → re-render
    // - فقط idهای اول و آخر را مقایسه کن — append-only است (Load More)
    if (prevProps.posts === nextProps.posts) {
      return (prevProps.ads?.length ?? 0) === (nextProps.ads?.length ?? 0);
    }
    if (prevProps.posts.length !== nextProps.posts.length) return false;
    if ((prevProps.ads?.length ?? 0) !== (nextProps.ads?.length ?? 0)) return false;
    const prevFirst = prevProps.posts[0]?.id;
    const nextFirst = nextProps.posts[0]?.id;
    const prevLast = prevProps.posts[prevProps.posts.length - 1]?.id;
    const nextLast = nextProps.posts[nextProps.posts.length - 1]?.id;
    return prevFirst === nextFirst && prevLast === nextLast;
  },
);

AtelierGrid.displayName = 'AtelierGrid';

export default AtelierGrid;
