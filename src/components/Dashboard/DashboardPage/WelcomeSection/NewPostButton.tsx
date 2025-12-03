'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { HiOutlinePencilSquare, HiOutlineSparkles } from 'react-icons/hi2';

export default function NewPostButton() {
  const router = useRouter();

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.3 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="group inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white text-violet-700 font-semibold text-sm hover:bg-violet-50 transition-colors duration-200 shadow-lg"
      onClick={() => router.push('/dashboard/posts/create')}
    >
      <HiOutlinePencilSquare className="w-5 h-5" />
      <span>نوشتن پست جدید</span>
      <HiOutlineSparkles className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-amber-500" />
    </motion.button>
  );
}
