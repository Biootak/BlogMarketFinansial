import React from 'react';
import type { SocialType } from '@/types/types';
import { FaFacebook, FaTwitter, FaTelegram, FaInstagram } from 'react-icons/fa';

interface SocialsShareProps {
  className?: string;
  itemClass?: string;
}

export const SOCIALS_DATA: SocialType[] = [
  { id: 'Facebook', name: 'فیسبوک', icon: FaFacebook, href: '#', color: '#1877F2' },
  { id: 'Twitter', name: 'توییتر', icon: FaTwitter, href: '#', color: '#1DA1F2' },
  { id: 'Telegram', name: 'تلگرام', icon: FaTelegram, href: '#', color: '#0088cc' },
  { id: 'Instagram', name: 'اینستاگرام', icon: FaInstagram, href: '#', color: '#E4405F' },
];

const SocialsShare: React.FC<SocialsShareProps> = ({ className = '', itemClass = '' }) => {
  return (
    <div
      className={`nc-SocialsShare flex flex-row-reverse gap-4 ${className}`}
      data-nc-id="SocialsShare"
    >
      {SOCIALS_DATA.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.id}
            href={item.href}
            className={`rounded-full p-2 transition-colors hover:bg-gray-100 ${itemClass}`}
            title={`اشتراک‌گذاری در ${item.name}`}
          >
            <Icon className="w-8 h-8" style={{ color: item.color }} />
          </a>
        );
      })}
    </div>
  );
};

export default React.memo(SocialsShare);
