'use client';

import type React from 'react';
import { motion } from 'framer-motion';
import Card11 from '@/components/Card11/Card11';
import type { PostWithRelations } from '@/types/types';

type AnimatedPostGridProps = {
  posts: PostWithRelations[];
};

const AnimatedPostGrid: React.FC<AnimatedPostGridProps> = ({ posts }) => {
  return (
    <motion.div
      className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 mt-8 lg:mt-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, staggerChildren: 0.1 }}
    >
      {posts.map((post) => (
        <motion.div key={post.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Card11 post={post} />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default AnimatedPostGrid;
