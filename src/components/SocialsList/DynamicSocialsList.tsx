import React from 'react';
import * as motion from 'framer-motion/client';
import { FaTelegram, FaInstagram, FaTwitter, FaWhatsapp } from 'react-icons/fa';
import { getSystemSettingsData } from '@/data/getSystemSettings';

interface DynamicSocialsListProps {
  className?: string;
  itemClass?: string;
}

const socialConfig = {
  telegram: {
    id: 'Telegram',
    name: 'تلگرام',
    icon: FaTelegram,
    color: '#0088cc',
    getUrl: (username: string) =>
      username.startsWith('http') ? username : `https://t.me/${username.replace('@', '')}`,
  },
  instagram: {
    id: 'Instagram',
    name: 'اینستاگرام',
    icon: FaInstagram,
    color: '#E4405F',
    getUrl: (username: string) =>
      username.startsWith('http') ? username : `https://instagram.com/${username.replace('@', '')}`,
  },
  twitter: {
    id: 'Twitter',
    name: 'توییتر',
    icon: FaTwitter,
    color: '#1DA1F2',
    getUrl: (username: string) =>
      username.startsWith('http') ? username : `https://twitter.com/${username.replace('@', '')}`,
  },
  whatsapp: {
    id: 'WhatsApp',
    name: 'واتساپ',
    icon: FaWhatsapp,
    color: '#25D366',
    getUrl: (phone: string) =>
      phone.startsWith('http') ? phone : `https://wa.me/${phone.replace(/\D/g, '')}`,
  },
};

const DynamicSocialsList = async ({ className = '', itemClass = '' }: DynamicSocialsListProps) => {
  const settings = await getSystemSettingsData();

  const socials = [
    { key: 'telegram', value: settings.telegram },
    { key: 'instagram', value: settings.instagram },
    { key: 'twitter', value: settings.twitter },
    { key: 'whatsapp', value: settings.whatsapp },
  ].filter((s) => s.value && s.value.trim() !== '');

  if (socials.length === 0) {
    return null;
  }

  return (
    <nav className={`flex flex-wrap gap-3 ${className}`}>
      {socials.map((social, index) => {
        const config = socialConfig[social.key as keyof typeof socialConfig];
        const Icon = config.icon;
        const href = config.getUrl(social.value!);

        return (
          <motion.a
            key={config.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`${itemClass} rounded-full p-2 transition-all duration-300 ease-in-out bg-white dark:bg-neutral-800 shadow-lg hover:shadow-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 font-vazirmatn`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={config.name}
            aria-label={`دنبال کردن در ${config.name}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Icon className="w-6 h-6" style={{ color: config.color }} />
          </motion.a>
        );
      })}
    </nav>
  );
};

export default DynamicSocialsList;
