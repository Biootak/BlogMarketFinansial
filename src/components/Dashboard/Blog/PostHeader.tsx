'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlineSparkles, HiOutlineDocumentText } from 'react-icons/hi2';
import FilterDropdown from './FilterDropdown';
import type { PostStatus } from '@prisma/client';

export default function PostHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilter = (filter: 'همه' | PostStatus) => {
    const params = new URLSearchParams(searchParams);
    if (filter !== 'همه') {
      params.set('filter', filter);
    } else {
      params.delete('filter');
    }
    router.push(`/dashboard/posts?${params.toString()}`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-800/50"
      style={{
        boxShadow: '0 4px 30px rgba(0,0,0,0.03)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          {/* Title Section */}
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl blur-lg opacity-40" />
              <div className="relative p-3.5 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xl">
                <HiOutlineDocumentText className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                پست‌ها
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                مدیریت و ویرایش محتوای وبلاگ
              </p>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div 
            className="flex items-center gap-3 w-full sm:w-auto"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <FilterDropdown onFilter={handleFilter} />
            
            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/dashboard/posts/create"
                className="group relative inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm overflow-hidden transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  boxShadow: `
                    0 0 0 1px rgba(124,58,237,0.5),
                    0 4px 6px -1px rgba(0,0,0,0.1),
                    0 10px 20px -5px rgba(124,58,237,0.4),
                    inset 0 1px 0 rgba(255,255,255,0.2)
                  `,
                }}
              >
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Icon */}
                <span className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-white/20 group-hover:rotate-90 transition-transform duration-300">
                  <HiOutlinePlus className="w-4 h-4 text-white" />
                </span>
                
                {/* Text */}
                <span className="relative text-white hidden sm:inline">افزودن پست جدید</span>
                
                {/* Sparkle */}
                <HiOutlineSparkles className="relative w-4 h-4 text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
