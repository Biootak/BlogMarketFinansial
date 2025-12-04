'use client';

import { useState, useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import {
  FaFacebook,
  FaTwitter,
  FaTelegram,
  FaLinkedinIn,
  FaWhatsapp,
} from 'react-icons/fa';
import { HiLink, HiCheck } from 'react-icons/hi2';

interface ShareDropdownProps {
  url: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
}

const HASHTAGS = '#بیوتاک #ارز_دیجیتال #بازار_مالی';

const SHARE_PLATFORMS = [
  {
    id: 'telegram',
    name: 'تلگرام',
    icon: FaTelegram,
    color: '#0088cc',
    getUrl: (url: string, title: string) => {
      const text = `📰 ${title}\n\n🔗 مطالعه در بیوتاک\n\n${HASHTAGS}`;
      return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    },
  },
  {
    id: 'whatsapp',
    name: 'واتساپ',
    icon: FaWhatsapp,
    color: '#25D366',
    getUrl: (url: string, title: string) => {
      const text = `📰 *${title}*\n\n🔗 مطالعه در بیوتاک\n\n${HASHTAGS}\n\n${url}`;
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    },
  },
  {
    id: 'twitter',
    name: 'توییتر / X',
    icon: FaTwitter,
    color: '#1DA1F2',
    getUrl: (url: string, title: string) => {
      const text = `📰 ${title}\n\n🔗 مطالعه در بیوتاک\n\n${HASHTAGS}`;
      return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    },
  },
  {
    id: 'facebook',
    name: 'فیسبوک',
    icon: FaFacebook,
    color: '#1877F2',
    getUrl: (url: string, title: string) => {
      const quote = `📰 ${title}\n\n🔗 مطالعه در بیوتاک`;
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(quote)}`;
    },
  },
  {
    id: 'linkedin',
    name: 'لینکدین',
    icon: FaLinkedinIn,
    color: '#0A66C2',
    getUrl: (url: string, title: string) => {
      return `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent('مطالعه در بیوتاک')}&source=Biotak`;
    },
  },
];

export default function ShareDropdown({
  url,
  title,
  description,
  children,
  align = 'start',
  side = 'bottom',
}: ShareDropdownProps) {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = useCallback(
    (platform: (typeof SHARE_PLATFORMS)[0]) => {
      const shareUrl = platform.getUrl(url, title);
      window.open(shareUrl, '_blank', 'width=600,height=500,scrollbars=yes');
    },
    [url, title],
  );

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    toast({
      title: 'کپی شد!',
      description: 'لینک در کلیپ‌بورد کپی شد',
      variant: 'success',
    });
    setTimeout(() => setIsCopied(false), 2000);
  }, [url, toast]);

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        sideOffset={8}
        avoidCollisions={true}
        collisionPadding={16}
        className="min-w-[240px] p-3 rounded-2xl border-neutral-200/80 dark:border-neutral-700/80 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-2xl z-50"
      >
        {/* Header */}
        <div className="px-2 pb-3 mb-2 border-b border-neutral-100 dark:border-neutral-800">
          <p className="text-sm font-bold text-neutral-900 dark:text-white">اشتراک‌گذاری مقاله</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
            {title}
          </p>
        </div>

        {/* Social Platforms */}
        <div className="space-y-1">
          {SHARE_PLATFORMS.map((platform) => (
            <DropdownMenuItem
              key={platform.id}
              onClick={() => handleShare(platform)}
              className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:bg-neutral-100 dark:focus:bg-neutral-800"
            >
              <div
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-transform duration-200"
                style={{ backgroundColor: `${platform.color}15` }}
              >
                <platform.icon className="w-4 h-4" style={{ color: platform.color }} />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-neutral-700 dark:text-neutral-200">
                  {platform.name}
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                  {platform.id === 'telegram' && 'ارسال به مخاطبین یا کانال'}
                  {platform.id === 'whatsapp' && 'ارسال به چت یا گروه'}
                  {platform.id === 'twitter' && 'توییت کردن'}
                  {platform.id === 'facebook' && 'اشتراک در تایم‌لاین'}
                  {platform.id === 'linkedin' && 'اشتراک حرفه‌ای'}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator className="my-2 bg-neutral-100 dark:bg-neutral-800" />

        {/* Copy Link */}
        <DropdownMenuItem
          onClick={copyLink}
          className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus:bg-emerald-50 dark:focus:bg-emerald-900/20"
        >
          <div
            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 ${
              isCopied
                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                : 'bg-neutral-100 dark:bg-neutral-800'
            }`}
          >
            {isCopied ? (
              <HiCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <HiLink className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            )}
          </div>
          <div className="flex flex-col">
            <span
              className={`font-medium transition-colors duration-200 ${
                isCopied
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-neutral-700 dark:text-neutral-200'
              }`}
            >
              {isCopied ? 'کپی شد!' : 'کپی لینک'}
            </span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              کپی لینک مقاله
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
