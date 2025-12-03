'use client';

import React from 'react';
import * as motion from 'framer-motion/client';
import { FaTelegram, FaInstagram, FaTwitter, FaWhatsapp } from 'react-icons/fa';
import { useSiteSettings, getSocialUrl } from '@/hooks/useSiteSettings';

interface ClientSocialsListProps {
  className?: string;
  itemClass?: string;
}

const socialConfig = {
  telegram: { id: 'Telegram', name: 'تلگرام', icon: FaTelegram, color: '#0088cc' },
  instagram: { id: 'Instagram', name: 'اینستاگرام', icon: FaInstagram, color: '#E4405F' },
  twitter: { id: 'Twitter', name: 'توییتر', icon: FaTwitter, color: '#1DA1F2' },
  whatsapp: { id: 'WhatsApp', name: 'واتساپ', icon: FaWhatsapp, color: '#25D366' },
};

const ClientSocialsList: React.FC<ClientSocialsListProps> = ({ className = '', itemClass = '' }) => {
  const socials = useSiteSettings((state) => state.socials);
  const isLoaded = useSiteSettings((state) => state.isLoaded);

  if (!isLoaded) {
    return null;
  }

  const activeSocials = Object.entries(socials)
    .filter(([_, value]) => value && value.trim() !== '')
    .map(([key, value]) => ({
      key,
      value,
      config: socialConfig[key as keyof typeof socialConfig],
      url: getSocialUrl(key, value),
    }))
    .filter((s) => s.url);

  if (activeSocials.length === 0) {
    return null;
  }

  return (
    <nav className={`flex flex-wrap gap-3 ${className}`}>
      {activeSocials.map((social, index) => {
        const Icon = social.config.icon;
        return (
          <motion.a
            key={social.config.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`${itemClass} rounded-full p-2 transition-all duration-300 ease-in-out bg-white dark:bg-neutral-800 shadow-lg hover:shadow-xl hover:bg-neutral-100 dark:hover:bg-neutral-700`}
            href={social.url!}
            target="_blank"
            rel="noopener noreferrer"
            title={social.config.name}
            aria-label={`دنبال کردن در ${social.config.name}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Icon className="w-6 h-6" style={{ color: social.config.color }} />
          </motion.a>
        );
      })}
    </nav>
  );
};

export default ClientSocialsList;
