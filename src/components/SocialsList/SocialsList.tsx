import React from 'react';
import * as motion from 'framer-motion/client';
import type { SocialType } from '@/types/types';

interface SocialsListProps {
  className?: string;
  itemClass?: string;
  socials?: SocialType[];
}

const SocialsList: React.FC<SocialsListProps> = ({
  className = '',
  itemClass = '',
  socials = [],
}) => {
  return (
    <nav className={`flex flex-wrap gap-3 ${className}`}>
      {socials.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.a
            key={item.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`${itemClass} rounded-full p-2 transition-all duration-200 ease-in-out bg-white dark:bg-neutral-800 shadow-lg hover:shadow-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 font-vazirmatn`}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            title={item.name}
            aria-label={`دنبال کردن در ${item.name}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Icon className="w-6 h-6" style={{ color: item.color }} />
          </motion.a>
        );
      })}
    </nav>
  );
};

export default React.memo(SocialsList);
