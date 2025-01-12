'use client';

import { useState, useEffect } from 'react';
import type { PostWithRelations } from '@/types/types';
import PostItem from './PostItem';

interface PostsListProps {
  posts: PostWithRelations[];
}

interface ContentItem {
  component: React.ReactNode;
  height: number;
}

export default function PostsList({ posts }: PostsListProps) {
  const [content, setContent] = useState<ContentItem[]>([]);

  useEffect(() => {
    const newContent: ContentItem[] = posts.map((post, index) => ({
      component: <PostItem key={`post-${post.id}`} post={post} isLarge={index === 0} />,
      height: index === 0 ? 5 : 2,
    }));

    setContent(newContent);
  }, [posts]);

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      <div className="space-y-4 flex flex-col">{column1Content}</div>
      <div className="space-y-4 flex flex-col">{column2Content}</div>
    </div>
  );
}
