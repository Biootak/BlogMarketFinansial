'use client';

import { motion } from 'framer-motion';
import type { PostWithRelations } from '@/types/types';
import Card2 from '@/components/Card2/Card2';
import Card6 from '../Card6/Card6';

interface PostItemProps {
  post: PostWithRelations;
  isLarge?: boolean;
}

export default function PostItem({ post, isLarge = false }: PostItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      {isLarge ? <Card2 size="large" post={post} /> : <Card6 post={post} />}
    </motion.div>
  );
}
