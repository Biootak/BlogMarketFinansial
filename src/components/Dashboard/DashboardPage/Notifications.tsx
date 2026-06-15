'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from '@/lib/motion-shim';
import { HiOutlineBell } from 'react-icons/hi2';
import NotificationItem from './NotificationItem';


interface Notification {
  id: number;
  message: string;
  time: string;
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const newNotification = { id: Date.now(), message: 'اعلان جدید', time: 'الان' };
    setNotifications((prev) => [newNotification, ...prev]);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center">
        <HiOutlineBell className="w-6 h-6 mr-2 text-purple-500" />
        اعلان‌ها
      </h3>
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <NotificationItem message={notification.message} time={notification.time} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Notifications;