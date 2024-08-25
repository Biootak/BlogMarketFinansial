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
      className="mt-4 bg-white text-purple-600 font-bold py-2 px-4 rounded hover:bg-gray-100 transition-colors duration-300"
      onClick={() => router.push('/dashboard/admin/posts/create')}
    >
      نوشتن پست جدید
    </motion.button>
  );
}
