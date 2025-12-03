'use client';

import React from 'react';
import Avatar from '@/components/Avatar/Avatar';
import NewPostButton from './NewPostButton';
import { motion } from 'framer-motion';

import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function WelcomeSectionContent() {
  const user = useCurrentUser();

  return (
    <div className="relative z-10 flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-6">
      {/* Avatar */}
      <motion.div 
        className="relative sm:order-last flex-shrink-0"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
      >
        <div className="absolute -inset-2 bg-gradient-to-r from-pink-500/40 via-violet-500/40 to-indigo-500/40 rounded-full blur-lg" />
        <motion.div 
          className="relative"
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Avatar
            imgUrl={(user?.profile?.avatar || user?.image) ?? undefined}
            userName={user?.name ?? undefined}
            sizeClass="h-24 w-24 sm:h-28 sm:w-28"
            containerClassName="border-[3px] border-white/30 shadow-xl"
          />
          {/* Online indicator */}
          <motion.div 
            className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>

      {/* Text content */}
      <motion.div 
        className="text-center sm:text-right flex-1"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
      >
        {/* Status badge */}
        <motion.div 
          className="inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-medium"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span>آنلاین</span>
        </motion.div>

        <h2 className="text-2xl sm:text-3xl font-bold mb-2">
          سلام، {user?.name ?? 'کاربر'} 👋
        </h2>
        
        <p className="text-white/80 mb-5 text-sm sm:text-base leading-relaxed max-w-md">
          به داشبورد وبلاگ خود خوش آمدید. آماده نوشتن مطالب جدید هستید؟
        </p>
        
        <NewPostButton />
      </motion.div>
    </div>
  );
}
