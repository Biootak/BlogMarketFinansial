'use client';

import type React from 'react';
import { motion } from '@/lib/motion-shim';
import Card11 from '@/components/Card11/Card11';
import type { PostWithRelations } from '@/types/types';

type AnimatedPostGridProps = {
  posts: PostWithRelations[];
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

const AnimatedPostGrid: React.FC<AnimatedPostGridProps> = ({ posts }) => {
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6 lg:gap-7"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {posts.map((post, index) => (
        <motion.div
          key={post.id}
          variants={itemVariants}
          whileHover={{ 
            y: -8,
            transition: { type: 'spring', stiffness: 300, damping: 20 }
          }}
          whileTap={{ scale: 0.98 }}
          className="group"
        >
          <Card11 post={post} />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default AnimatedPostGrid;
