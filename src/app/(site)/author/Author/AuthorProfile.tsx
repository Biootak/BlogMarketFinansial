import Image from 'next/image';
import Link from 'next/link';
import { FaGlobe } from 'react-icons/fa';
import { Card } from '@/components/ui/card';
import FollowButton from '@/components/FollowButton';
import VerifyIcon from '@/components/VerifyIcon';
import type { UserWithProfile } from '@/types/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
          src={author.profile?.bgImage || '/images/default-cover.jpg'}
          className="object-cover"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
         
        />
      </div>
      <div className="container -mt-10 lg:-mt-16">
        <Card className="relative bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 p-5 lg:p-8 rounded-3xl md:rounded-[40px] shadow-xl flex flex-col md:flex-row">
          <div className="w-32 lg:w-40 flex-shrink-0 mt-12 sm:mt-0">
            <Avatar className="wil-avatar relative flex-shrink-0 inline-flex items-center justify-center overflow-hidden text-neutral-100 uppercase font-semibold rounded-full w-20 h-20 text-xl lg:text-2xl lg:w-36 lg:h-36 ring-4 ring-white dark:ring-0 shadow-2xl z-0">
              <AvatarImage
                src={author.profile?.avatar || '/images/default-avatar.png'}
                alt={author.name || 'ناشناس'}
              />
              <AvatarFallback>{author.name?.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
          <div className="pt-5 md:pt-1 md:ml-6 xl:ml-12 flex-grow">
            <div className="max-w-screen-sm space-y-3.5">
              <h2 className="inline-flex items-center text-2xl sm:text-3xl lg:text-4xl font-semibold">
                <span>{author.name}</span>
                {author.emailVerified && <VerifyIcon className="mr-2" />}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400">
                {author.profile?.bio || 'هنوز بیوگرافی ثبت نشده است.'}
              </p>
              {author.profile?.jobName && (
                <Link
                  href={`/author/${author.id}`}
                  className="flex items-center text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-500"
                >
                  <FaGlobe className="w-4 h-4 ml-2" />
                  <span>{author.profile.jobName}</span>
                </Link>
              )}
              <SocialsList itemClass="w-7 h-7" />
            </div>
          </div>
          <div className="absolute md:static start-5 end-5 top-4 sm:start-auto sm:top-5 sm:end-5 flex justify-end">
            <FollowButton
              isFollowing={false}
              fontSize="text-sm md:text-base font-medium"
              sizeClass="px-4 py-1 md:py-2.5 h-8 md:!h-10 sm:px-6 lg:px-8"
            />
            <div className="mx-2">
              <AccountActionDropdown />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
