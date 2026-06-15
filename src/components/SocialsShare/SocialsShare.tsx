'use client';

// components/SocialsShare/SocialsShare.tsx
import React from 'react';
import { motion } from '@/lib/motion-shim';
import type { SocialType } from '@/types/types';
import {
  FaFacebook,
  FaTwitter,
  FaTelegram,
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
} from 'react-icons/fa';

interface SocialsShareProps {
  className?: string;
  itemClass?: string;
  url?: string;
  title?: string;
}

export const SOCIALS_DATA: SocialType[] = [
  { id: 'Facebook', name: 'فیسبوک', icon: FaFacebook, href: '#', color: '#1877F2' },
  { id: 'Twitter', name: 'توییتر', icon: FaTwitter, href: '#', color: '#1DA1F2' },
  { id: 'Telegram', name: 'تلگرام', icon: FaTelegram, href: '#', color: '#0088cc' },
  { id: 'Instagram', name: 'اینستاگرام', icon: FaInstagram, href: '#', color: '#E4405F' },
];

const SocialsShare: React.FC<SocialsShareProps> = ({
  className = '',
  itemClass = '',
  url = typeof window !== 'undefined' ? window.location.href : '',
  title = 'Check this out!',
}) => {
  const getShareUrl = (platform: string) => {
    switch (platform) {
      case 'Facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      case 'Twitter':
        return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
      case 'Telegram':
        return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
      case 'LinkedIn':
        return `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
      case 'WhatsApp':
        return `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} ${url}`)}`;
      default:
        return '#';
    }
  };

  return (
    <div className={`nc-SocialsShare flex flex-wrap gap-3 ${className}`} data-nc-id="SocialsShare">
      {SOCIALS_DATA.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.a
            key={item.id}
            href={getShareUrl(item.id)}
            className={`rounded-full p-2 transition-all duration-300 ease-in-out bg-white dark:bg-gray-800 shadow-md hover:shadow-lg ${itemClass}`}
            title={`اشتراک‌گذاری در ${item.name}`}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1, rotate: 10 }}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: item.color }} />
          </motion.a>
        );
      })}
    </div>
  );
};

export default React.memo(SocialsShare);
