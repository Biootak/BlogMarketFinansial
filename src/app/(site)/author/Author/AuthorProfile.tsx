import Image from 'next/image';
import Link from 'next/link';
import { FaGlobe } from 'react-icons/fa';
import { Card } from '@/components/ui/card';
import FollowButton from '@/components/FollowButton';
import VerifyIcon from '@/components/VerifyIcon';
import type { UserWithProfile } from '@/types/types';
import Avatar from '@/components/Avatar/Avatar';
import SocialsList from '@/components/SocialsList/SocialsList';
import AccountActionDropdown from '@/components/AccountActionDropdown/AccountActionDropdown';

type AuthorProfileProps = {
  author: UserWithProfile;
};

export default function AuthorProfile({ author }: AuthorProfileProps) {
  return (
    <div className="w-full">
      <div className="relative w-full h-40 md:h-60 2xl:h-72">
        <Image
          alt={`تصویر پس زمینه ${author.name}`}
          src={author.profile?.bgImage || '/images/placeholder-large-h.png'}
          className="object-cover"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority
        />
      </div>
      <div className="container -mt-10 lg:-mt-16">
        <Card className="relative bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 p-5 lg:p-8 rounded-3xl md:rounded-[40px] shadow-xl flex flex-col md:flex-row">
          <div className="w-32 lg:w-40 flex-shrink-0 mt-12 sm:mt-0 mx-auto md:mx-0">
            <Avatar
              imgUrl={author?.profile?.avatar}
              userName={author?.name}
              sizeClass="h-32 w-32 lg:h-40 lg:w-40"
              containerClassName="border-4 border-white dark:border-neutral-900 shadow-xl"
            />
          </div>
          <div className="pt-4 md:pt-0 mr-4 flex-grow md:flex md:items-center">
            <div className="max-w-screen-sm space-y-2.5 text-center md:text-right w-full">
              <h2 className="inline-flex items-center text-xl sm:text-lg lg:text-2xl font-medium font-vazirmatn justify-center md:justify-start">
                <span>{author.name}</span>
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 font-vazirmatn leading-5">
                {author.profile?.bio || 'هنوز بیوگرافی ثبت نشده است.'}
              </p>
              {author.profile?.jobName && (
                <Link
                  href={`/author/${author.id}`}
                  className="flex items-center text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-500 font-vazirmatn justify-center md:justify-start"
                >
                  <FaGlobe className="w-3.5 h-3.5 ml-1.5" />
                  <span>{author.profile.jobName}</span>
                </Link>
              )}
              <div className="flex justify-center md:justify-start">
                <SocialsList itemClass="w-6 h-6" />
              </div>
            </div>
          </div>
          <div className="absolute md:static start-5 end-5 top-4 sm:start-auto sm:top-5 sm:end-5 flex justify-end">
            <div className="mx-2">
              <AccountActionDropdown />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
