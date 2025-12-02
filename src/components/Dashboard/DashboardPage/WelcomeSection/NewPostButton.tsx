'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function NewPostButton() {
  const router = useRouter();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="mt-4 bg-white dark:bg-neutral-800 text-purple-600 dark:text-purple-400 font-bold py-2 px-4 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors duration-300"
      onClick={() => router.push('/dashboard/posts/create')}
    >
      نوشتن پست جدید
    </motion.button>
  );
}
