import type React from 'react';

interface NotificationItemProps {
  message: string;
  time: string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ message, time }) => (
  <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
    <p className="dark:text-white">{message}</p>
    <span className="text-sm text-gray-500 dark:text-gray-400">{time}</span>
  </div>
);

export default NotificationItem;