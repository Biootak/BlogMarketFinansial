'use client';

import type React from 'react';
import { useState } from 'react';
import { Icon } from '../ui/icon';

interface CopyNotificationProps {
  className?: string;
  iconClassName?: string;
}

const CopyNotification: React.FC<CopyNotificationProps> = ({
  className = '',
  iconClassName = 'mr-1 size-2 text-neutral-400 group-hover:text-primary-500 transition-colors duration-200',
}) => {
  const [showNotification, setShowNotification] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={copyToClipboard}
        className={`group flex items-center justify-center focus:outline-none ${className}`}
      >
        <Icon name="Link" className={iconClassName} />
      </button>
      {showNotification && (
        <div className="fixed bottom-4 left-4 bg-green-500 text-white px-2 py-1 rounded-md shadow-lg text-[10px] leading-tight tracking-wide whitespace-nowrap h-5 flex items-center justify-center">
          لینک کپی شد!
        </div>
      )}
    </>
  );
};

export default CopyNotification;
