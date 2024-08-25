import React, { type FC, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { HiLink, HiEyeSlash, HiExclamationTriangle } from 'react-icons/hi2';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import ModalReportItem from '@/components/ModalReportItem/ModalReportItem';
import ModalHideAuthor from './ModalHideAuthor';
import type { PostWithRelations } from '@/types/types';
import { twMerge } from 'tailwind-merge';

export interface PostActionDropdownProps {
  containerClassName?: string;
  iconClass?: string;
  dropdownPosition?: 'top' | 'bottom';
  post: PostWithRelations;
}

const PostActionDropdown: FC<PostActionDropdownProps> = ({
  containerClassName = 'h-8 w-8 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700',
  iconClass = 'h-[18px] w-[18px]',
  dropdownPosition = 'bottom',
  post,
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isReporting, setIsReporting] = useState(false);
  const [showModalHideAuthor, setShowModalHideAuthor] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const openModalReportPost = useCallback(() => setIsReporting(true), []);
  const closeModalReportPost = useCallback(() => setIsReporting(false), []);
  const openModalHideAuthor = useCallback(() => setShowModalHideAuthor(true), []);
  const onCloseModalHideAuthor = useCallback(() => setShowModalHideAuthor(false), []);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.slug}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [post.slug]);

  const actions = [
    {
      id: 'copylink',
      name: isCopied ? 'لینک کپی شد!' : 'کپی لینک',
      icon: <HiLink className="w-4 h-4 ml-2 rtl:mr-2" />,
      onClick: copyLink,
    },
    {
      id: 'hideThisAuthor',
      name: 'پنهان کردن این نویسنده',
      icon: <HiEyeSlash className="w-4 h-4 ml-2 rtl:mr-2" />,
      onClick: openModalHideAuthor,
    },
    {
      id: 'reportThisArticle',
      name: 'گزارش این مقاله',
      icon: <HiExclamationTriangle className="w-4 h-4 ml-2 rtl:mr-2" />,
      onClick: openModalReportPost,
    },
  ];

  const filteredActions = actions.filter((action) => {
    if (action.id === 'hideThisAuthor' || action.id === 'reportThisArticle') {
      return session?.user?.id !== post.authorId;
    }
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={twMerge(
              'text-neutral-500 dark:text-neutral-400 flex items-center justify-center rounded-full',
              containerClassName,
            )}
          >
            <span className={iconClass}>⋮</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={dropdownPosition === 'top' ? 'end' : 'start'}
          side={dropdownPosition}
        >
          {filteredActions.map((action) => (
            <DropdownMenuItem key={action.id} onClick={action.onClick}>
              {action.icon}
              <span>{action.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ModalReportItem show={isReporting} onCloseModalReportItem={closeModalReportPost} />
      <ModalHideAuthor show={showModalHideAuthor} onCloseModalHideAuthor={onCloseModalHideAuthor} />
    </motion.div>
  );
};

export default PostActionDropdown;
