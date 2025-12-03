import type React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HiUser, HiArrowLeft } from 'react-icons/hi2';
import Avatar from '@/components/Avatar/Avatar';
import type { UserWithProfile } from '@/types/types';

export interface SingleAuthorProps {
  author?: UserWithProfile;
}

const SingleAuthor: React.FC<SingleAuthorProps> = ({ author }) => {
  if (!author) return null;

  return (
    <motion.div
      className="nc-SingleAuthor flex items-center gap-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Link href={`/author/${author.id}`} className="flex-shrink-0">
        <Avatar
          imgUrl={author.profile?.avatar}
          userName={author.name}
          sizeClass="h-12 w-12 text-lg sm:h-24 sm:w-24 sm:text-xl"
        />
      </Link>
      <div className="flex-grow">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
          نویسنده مطلب
        </p>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
          <Link href={`/author/${author.id}`}>{author.name}</Link>
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">
          {author.profile?.bio || 'این نویسنده هیچ توضیحی درباره آن ندارد'}
        </p>
        <Link
          href={`/author/${author.id}`}
          className="inline-flex items-center text-primary-600 dark:text-primary-400 font-medium text-sm mt-2 hover:underline"
        >
          درباره نویسنده <HiArrowLeft className="mr-1 w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  );
};

export default SingleAuthor;
