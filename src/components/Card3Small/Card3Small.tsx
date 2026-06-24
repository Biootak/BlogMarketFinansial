import type React from 'react';
import Link from 'next/link';
import { SafeImage } from '@/components/SafeImage';
import PostCardMeta from '@/components/PostCardMeta/PostCardMeta';
import type { PostWithRelations } from '@/types/types';
import { heading, text } from '@/lib/design-tokens';

export interface Card3SmallProps {
  className?: string;
  post: PostWithRelations;
}

const Card3Small: React.FC<Card3SmallProps> = ({ className = 'h-full', post }) => {
  const { title, slug, featuredImage } = post;
  const href = `/single/${slug}`;

  return (
    <div
      className={`nc-Card3Small relative flex flex-row justify-between items-center ${className}`}
    >
      <Link href={href} className="absolute inset-0" aria-label={title} tabIndex={-1} />
      <div className="relative space-y-1.5">
        <PostCardMeta meta={post} />
        <h2 className={heading.h4}>
          <Link href={href} className="line-clamp-2">
            {title}
          </Link>
        </h2>
      </div>

      <Link
        href={href}
        aria-label={title}
        className="block w-20 flex-shrink-0 relative rounded-lg overflow-hidden z-0 ms-4 group"
      >
        <div className="w-full aspect-[16/10]">
          <SafeImage
            alt={title}
            sizes="(max-width: 640px) 80px, 100px"
            className="object-cover w-full h-full group-hover:scale-110 transform transition-transform duration-300"
            src={featuredImage}
            fill
            priority={false}
            variant="thumbnail"
          />
        </div>
      </Link>
    </div>
  );
};

export default Card3Small;
