'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import type { PostWithRelations } from '@/types/types';

interface BookmarkCheckProps {
  post: PostWithRelations;
  children: (isBookmarked: boolean) => React.ReactNode;
}

export default function BookmarkCheck({ post, children }: BookmarkCheckProps) {
  const { data: session } = useSession();

  const isBookmarked = useMemo(() => {
    if (!session?.user?.id || !post?.savedBy) return false;
    return post.savedBy.some((save) => save.userId === session.user.id);
  }, [post?.savedBy, session?.user?.id]);

  return <>{children(isBookmarked)}</>;
}
