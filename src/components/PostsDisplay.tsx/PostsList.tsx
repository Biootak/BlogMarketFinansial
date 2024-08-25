'use client';

import { useState, useEffect } from 'react';
import type { Advertisement, PostWithRelations } from '@/types/types';
import PostItem from './PostItem';
import AdItem from './AdItem';

interface PostsListProps {
  posts: PostWithRelations[];
  ads: Advertisement[];
}

interface ContentItem {
  component: React.ReactNode;
  height: number;
}

export default function PostsList({ posts, ads }: PostsListProps) {
  const [content, setContent] = useState<ContentItem[]>([]);

  useEffect(() => {
    const newContent: ContentItem[] = [];
    let adIndex = 0;

    posts.forEach((post, index) => {
      if (index === 0) {
        newContent.push({
          component: <PostItem key={`post-${post.id}`} post={post} isLarge={true} />,
          height: 5 // استفاده از مقدار بیشتر برای پست اول که بزرگتر است
        });
      } else {
        newContent.push({
          component: <PostItem key={`post-${post.id}`} post={post} />,
          height: 2
        });
      }

      if ((index + 1) % 4 === 0 && adIndex < ads.length) {
        newContent.push({
          component: <AdItem key={`ad-${adIndex}`} ad={ads[adIndex]} />,
          height: 2 // تنظیم ارتفاع مناسب برای تبلیغات
        });
        adIndex++;
      }
    });

    setContent(newContent);
  }, [posts, ads]);

  const splitContentIntoColumns = (content: ContentItem[]) => {
    const column1: React.ReactNode[] = [];
    const column2: React.ReactNode[] = [];
    let height1 = 0;
    let height2 = 0;

    content.forEach(({ component, height }) => {
      if (height1 <= height2) {
        column1.push(component);
        height1 += height;
      } else {
        column2.push(component);
        height2 += height;
      }
    });

    return [column1, column2];
  };

  const [column1Content, column2Content] = splitContentIntoColumns(content);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
      <div className="space-y-6 flex flex-col">{column1Content}</div>
      <div className="space-y-6 flex flex-col">{column2Content}</div>
    </div>
  );
}