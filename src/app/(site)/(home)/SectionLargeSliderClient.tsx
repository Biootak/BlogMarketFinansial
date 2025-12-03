'use client';

// فعلاً طرح 7 رو نشون میدم
import Design7 from './designs/Design7';

import type { PostWithRelations } from '@/types/types';

type Props = {
  initialPosts: PostWithRelations[];
  className?: string;
};

export default function SectionLargeSliderClient({ initialPosts, className = '' }: Props) {
  // طرح 7: سه‌بعدی
  return <Design7 initialPosts={initialPosts} className={className} />;
}
