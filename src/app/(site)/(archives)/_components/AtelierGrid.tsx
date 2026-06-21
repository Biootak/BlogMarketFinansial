import type { PostWithRelations } from '@/types/types';
import AtelierCard from './AtelierCard';

/**
 * AtelierGrid — dense fluid editorial grid (2026).
 * Pure article cards; the featured story lives in the hero and any
 * advertisement lives in its own labeled band, so the grid rhythm stays clean.
 */
type Props = {
  posts: PostWithRelations[];
};

const AtelierGrid: React.FC<Props> = ({ posts }) => {
  if (posts.length === 0) return null;

  return (
    <div className="atl-grid">
      {posts.map((post, index) => (
        <div key={post.id} className="atl-reveal">
          <AtelierCard post={post} priority={index < 3} />
        </div>
      ))}
    </div>
  );
};

export default AtelierGrid;
