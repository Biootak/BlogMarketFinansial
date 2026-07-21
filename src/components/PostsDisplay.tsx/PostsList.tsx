'use client';

/**
 * PostsList — نسخه ۲۰۲۶ v2 (refined, CSS-driven)
 *
 * چیدمان:
 *  - 3 پست اول: Bento Asymmetric
 *  - بقیه: CSS columns masonry
 *
 * تکنیک‌ها (بدون framer-motion):
 *  1. CSS columns masonry واقعی
 *  2. Stagger از .stagger-children utility (globals.css)
 *  3. Tilt 3D از TiltCard
 *  4. Card hover reveal از group-hover (Tailwind)
 *  5. prefers-reduced-motion: global CSS rule
 *
 * 2026-06-16: اصلاح فاصله‌ها + نمایش تبلیغ بین پست‌ها
 *  - فاصله‌های columns یکدست و متناسب با breakpoint
 *  - هر ۶ پست یک تبلیغ با de-dup هوشمند (AdCard.pickAd)
 *  - تبلیغ‌ها از initialAds props میان
 */

import { AdCard, buildAdEntries } from '@/components/AdCard';
import { cn } from '@/lib/utils';
import type { Advertisement, PostWithRelations } from '@/types/types';
import CompactPostCard from './CompactPostCard';
import FeaturedPostHero from './FeaturedPostHero';
import PostItem from './PostItem';

interface PostsListProps {
  posts: PostWithRelations[];
  ads?: Advertisement[];
  className?: string;
}

const ADS_INTERVAL = 6; // هر ۶ پست یک تبلیغ

const PostsList: React.FC<PostsListProps> = ({ posts, ads = [], className = '' }) => {
  const hero = posts[0];
  const mini = posts.slice(1, 3);
  const rest = posts.slice(3);

  if (!hero) return null;

  // آگهی‌های masonry با de-dup هوشمند
  const adEntries = buildMemoAdEntries(rest.length, ads, ADS_INTERVAL);

  // ساخت آرایه‌ی ترکیبی از پست و تبلیغ برای masonry
  type ListEntry =
    | { kind: 'post'; post: PostWithRelations }
    | { kind: 'ad'; ad: Advertisement; position: number };

  const mixedList: ListEntry[] = [];
  for (const post of rest) {
    mixedList.push({ kind: 'post', post });
  }
  // جای‌گذاری تبلیغ‌ها در موقعیت‌های صحیح
  for (const { ad, position } of adEntries) {
    const insertAt = Math.min((position + 1) * ADS_INTERVAL, mixedList.length);
    mixedList.splice(insertAt, 0, { kind: 'ad', ad, position });
  }

  return (
    <div className={cn('space-y-7 sm:space-y-9', className)}>
      {/* Bento row — hero + 2 mini */}
      <div className="stagger-children grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 lg:gap-6 items-stretch">
        <div className="md:col-span-7 lg:col-span-8 2xl:col-span-8 min-w-0 flex">
          <FeaturedPostHero post={hero} className="flex-1" />
        </div>

        {mini.length > 0 && (
          <div
            className={cn(
              'md:col-span-5 lg:col-span-4 2xl:col-span-4 min-w-0',
              'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-1',
              'gap-3.5 md:gap-4 lg:gap-5',
              'auto-rows-fr',
            )}
          >
            {mini.map((post) => (
              <div key={post.id} className="min-w-0 flex">
                <CompactPostCard post={post} className="flex-1 w-full" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Masonry — هر ۶ پست یک تبلیغ */}
      {mixedList.length > 0 && (
        <div className="relative">
          <div
            className={cn(
              'columns-1 sm:columns-2 lg:columns-3 xl:columns-3 2xl:columns-4',
              'gap-4 sm:gap-5 lg:gap-6',
              '[&>*]:mb-4 sm:[&>*]:mb-5 lg:[&>*]:mb-6',
              '[&>*]:break-inside-avoid',
              '[&>*]:inline-block [&>*]:w-full',
            )}
          >
            {mixedList.map((entry) =>
              entry.kind === 'post' ? (
                <PostItem key={`p-${entry.post.id}`} post={entry.post} />
              ) : (
                <AdCard
                  key={`ad-${entry.position}-${entry.ad.id}`}
                  ad={entry.ad}
                  variant="inline"
                  position={entry.position}
                />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- Local helper — بدون React import ---------- */
function buildMemoAdEntries(
  totalItems: number,
  ads: Advertisement[],
  interval: number,
): Array<{ ad: Advertisement; position: number }> {
  return buildAdEntries(totalItems, ads, interval, 0);
}

export default PostsList;
