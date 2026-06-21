import type { ReactNode } from 'react';
import BannerAds from '@/components/BannerADS/BannerADS';
import type { Advertisement, PostWithRelations } from '@/types/types';
import AtelierCard from './AtelierCard';

/**
 * AtelierGrid — dense fluid editorial grid (2026).
 * Article cards interleaved with compact, multi-ad strips: several ads are
 * spread through the page in slim rows (2 per strip) instead of one large
 * banner — more inventory, far less vertical footprint per placement.
 */
type Props = {
  posts: PostWithRelations[];
  ads?: Advertisement[];
};

/** Cards between two consecutive ad strips. */
const CARDS_PER_CHUNK = 6;
/** Ads shown side-by-side in a single strip. */
const ADS_PER_STRIP = 2;

function AdStrip({ ads }: { ads: Advertisement[] }) {
  if (ads.length === 0) return null;
  return (
    <div className="atl-adstrip atl-reveal">
      <span className="atl-adstrip__label">تبلیغات</span>
      <div className="atl-adstrip__row">
        {ads.map((ad) => (
          <div key={ad.id} className="atl-adstrip__item">
            <BannerAds ad={ad} variant="image" />
          </div>
        ))}
      </div>
    </div>
  );
}

const AtelierGrid: React.FC<Props> = ({ posts, ads = [] }) => {
  if (posts.length === 0) return null;

  // Split posts into chunks, each rendered as its own complete grid. Ad strips
  // live BETWEEN grids (never inside), so the grid never has to break a row for
  // a full-width ad — no empty cells are ever left before a placement.
  const chunks: PostWithRelations[][] = [];
  for (let i = 0; i < posts.length; i += CARDS_PER_CHUNK) {
    chunks.push(posts.slice(i, i + CARDS_PER_CHUNK));
  }

  const items: ReactNode[] = [];
  let adCursor = 0;
  let cardIndex = 0;

  chunks.forEach((chunk, chunkIndex) => {
    items.push(
      <div key={`grid-${chunkIndex}`} className="atl-grid">
        {chunk.map((post) => {
          const priority = cardIndex < 3;
          cardIndex += 1;
          return (
            <div key={post.id} className="atl-reveal">
              <AtelierCard post={post} priority={priority} />
            </div>
          );
        })}
      </div>,
    );

    const isLastChunk = chunkIndex === chunks.length - 1;
    if (ads.length > 0 && adCursor < ads.length && !isLastChunk) {
      const slice = ads.slice(adCursor, adCursor + ADS_PER_STRIP);
      adCursor += slice.length;
      items.push(<AdStrip key={`ad-${chunkIndex}`} ads={slice} />);
    }
  });

  // Any ads not yet placed get one final strip so nothing is dropped silently.
  if (ads.length > 0 && adCursor < ads.length) {
    items.push(<AdStrip key="ad-tail" ads={ads.slice(adCursor)} />);
  }

  return <div className="atl-feed">{items}</div>;
};

export default AtelierGrid;
