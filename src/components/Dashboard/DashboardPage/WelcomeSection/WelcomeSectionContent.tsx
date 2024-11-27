'use client';

import React from 'react';
import Avatar from '@/components/Avatar/Avatar';
import NewPostButton from './NewPostButton';
import { motion } from 'framer-motion';

import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function WelcomeSectionContent() {
  const user = useCurrentUser();

  return (
    <div className="relative z-10 flex flex-col items-center sm:flex-row sm:items-start sm:justify-between">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-4 sm:mb-0 sm:order-last"
      >
        <Avatar
          imgUrl={(user?.profile?.avatar || user?.image) ?? undefined}
          userName={user?.name ?? undefined}
          sizeClass="h-20 w-20 sm:h-24 sm:w-24"
          containerClassName="border-4 border-white shadow-lg"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center sm:text-right"
      >
        <h2 className="text-2xl sm:text-xl font-bold mb-2"> {user?.name ?? 'کاربر'}</h2>
        <p className="text-neutral-200 mb-4">
          به داشبورد وبلاگ خود خوش آمدید. آماده نوشتن مطالب جدید هستید؟
        </p>
        <NewPostButton />
      </motion.div>
    </div>
  );
}
