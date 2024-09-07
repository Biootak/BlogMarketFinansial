import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { HiGlobeAlt } from 'react-icons/hi2';

import BackgroundSection from '@/components/BackgroundSection/BackgroundSection';
import ButtonPrimary from '@/components/Button/ButtonPrimary';
import ButtonSecondary from '@/components/Button/ButtonSecondary';
import Card11 from '@/components/Card11/Card11';
import FollowButton from '@/components/FollowButton';
import NavItem from '@/components/NavItem/NavItem';
import Pagination from '@/components/Pagination/Pagination';
import SectionGridCategoryBox from '@/components/SectionGridCategoryBox/SectionGridCategoryBox';
import SectionSliderNewAuthors from '@/components/SectionSliderNewAthors/SectionSliderNewAuthors';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import SocialsList from '@/components/SocialsList/SocialsList';
import VerifyIcon from '@/components/VerifyIcon';
import ArchiveFilterListBox from '@/components/ArchiveFilterListBox/ArchiveFilterListBox';
import AccountActionDropdown from '@/components/AccountActionDropdown/AccountActionDropdown';

import { SOCIALS_DATA } from '@/components/SocialsShare/SocialsShare';
import NcDropDown from '@/components/NcDropDown/NcDropDown';
import Link from 'next/link';
import { getAuthorById } from '@/actions/authorActions';
import { getPostsByAuthor } from '@/actions/getPostsByAuthor';
import DynamicCategories from '@/components/DynamicCategories';
import { getCategories } from '@/actions/categoryActions';
import { getTopAuthors } from '@/actions/getTopAuthors';

const TABS = ['مقالات', 'مورد علاقه‌ها', 'ذخیره شده‌ها'];
const FILTERS = [
  { name: 'جدیدترین' },
  { name: 'قدیمی‌ترین' },
  { name: 'محبوب‌ترین' },
  { name: 'پربحث‌ترین' },
];

type PageAuthorProps = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

async function getPageData(authorId: string, page: number, filter: string) {
  const [authorResult, postsResult, categoriesResult, topAuthorsResult] = await Promise.all([
    getAuthorById(authorId),
    getPostsByAuthor(authorId, { page, limit: 12, filter }),
    getCategories({ limit: 10, page: 1 }),
    getTopAuthors(5),
  ]);

  if (!authorResult.success || !authorResult.data) {
    notFound();
  }

  return {
    author: authorResult.data,
    posts: postsResult.data?.posts || [],
    totalPosts: postsResult.data?.total || 0,
    totalPages: postsResult.data?.pages || 0,
    categories: categoriesResult.data?.categories || [],
    totalCategories: categoriesResult.data?.totalCount || 0,
    topAuthors: topAuthorsResult || [],
  };
}

export default async function PageAuthor({ params, searchParams }: PageAuthorProps) {
  const currentPage =
    typeof searchParams.page === 'string' ? Number.parseInt(searchParams.page, 10) : 1;
  const currentFilter =
    typeof searchParams.filter === 'string' ? searchParams.filter : FILTERS[0].name;
  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  const { author, posts, totalPosts, totalPages, categories, totalCategories, topAuthors } =
    await getPageData(params.id, currentPage, currentFilter);

  return (
    <div className="nc-PageAuthor">
      <div className="w-full">
        <div className="relative w-full h-40 md:h-60 2xl:h-72">
          <Image
            alt={`تصویر پس زمینه ${author.name}`}
            src={author.profile?.bgImage || '/images/default-cover.jpg'}
            className="object-cover"
            fill
            sizes="100vw"
            priority
          />
        </div>
        <div className="container -mt-10 lg:-mt-16">
          <div className="relative bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 p-5 lg:p-8 rounded-3xl md:rounded-[40px] shadow-xl flex flex-col md:flex-row">
            <div className="w-32 lg:w-40 flex-shrink-0 mt-12 sm:mt-0">
              <div className="wil-avatar relative flex-shrink-0 inline-flex items-center justify-center overflow-hidden text-neutral-100 uppercase font-semibold rounded-full w-20 h-20 text-xl lg:text-2xl lg:w-36 lg:h-36 ring-4 ring-white dark:ring-0 shadow-2xl z-0">
                <Image
                  alt={author.name || 'ناشناس'}
                  src={author.profile?.avatar || '/images/default-avatar.png'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            </div>
            <div className="pt-5 md:pt-1 lg:ml-6 xl:ml-12 flex-grow">
              <div className="max-w-screen-sm space-y-3.5 ">
                <h2 className="inline-flex items-center text-2xl sm:text-3xl lg:text-4xl font-semibold">
                  <span>{author.name}</span>
                  {author.emailVerified && (
                    <VerifyIcon className="ml-2" iconClass="w-6 h-6 sm:w-7 sm:h-7 xl:w-8 xl:h-8" />
                  )}
                </h2>
                <span className="block text-sm text-neutral-500 dark:text-neutral-400">
                  {author.profile?.bio || 'هنوز بیوگرافی ثبت نشده است.'}
                </span>
                {author.profile?.jobName && (
                  <Link
                    href="/author/[id]"
                    className="flex items-center text-xs font-medium space-x-2.5 rtl:space-x-reverse cursor-pointer text-neutral-500 dark:text-neutral-400 truncate"
                  >
                    <HiGlobeAlt className="flex-shrink-0 w-4 h-4" />
                    <span className="text-neutral-700 dark:text-neutral-300 truncate">
                      {author.profile.jobName}
                    </span>
                  </Link>
                )}
                <SocialsList itemClass="block w-7 h-7" />
              </div>
            </div>
            <div className="absolute md:static start-5 end-5 top-4 sm:start-auto sm:top-5 sm:end-5 flex justify-end">
              <FollowButton
                isFollowing={false}
                fontSize="text-sm md:text-base font-medium"
                sizeClass="px-4 py-1 md:py-2.5 h-8 md:!h-10 sm:px-6 lg:px-8"
              />
              <div className="mx-2">
                <NcDropDown
                  className="flex-shrink-0 flex items-center justify-center focus:outline-none h-10 w-10 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-full"
                  renderTrigger={() => (
                    <span className="nc-icon-field bg-neutral-100 dark:bg-neutral-800 rounded-full p-2">
                      <HiGlobeAlt className="h-5 w-5" />
                    </span>
                  )}
                  onClick={() => {}}
                  data={SOCIALS_DATA}
                />
              </div>
              <AccountActionDropdown containerClassName="h-10 w-10 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="container py-16 lg:pb-28 lg:pt-20 space-y-16 lg:space-y-28">
        <main>
          <div className="flex flex-col sm:items-center sm:justify-between sm:flex-row">
            <nav className="relative flex w-full overflow-x-auto text-sm md:text-base hiddenScrollbar">
              <ul className="flex sm:space-x-2 rtl:space-x-reverse">
                {TABS.map((item, index) => (
                  <li key={index} className="flex-shrink-0">
                    <NavItem isActive={index === 0}>{item}</NavItem>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="block my-4 border-b w-full border-neutral-300 dark:border-neutral-500 sm:hidden" />
            <div className="flex justify-end">
              <ArchiveFilterListBox filters={FILTERS} initialFilter={currentFilter} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 mt-8 lg:mt-10">
            {posts.map((post) => (
              <Card11 key={post.id} post={post} />
            ))}
          </div>

          <div className="flex flex-col mt-12 lg:mt-16 space-y-5 sm:space-y-0 sm:space-x-3 sm:flex-row sm:justify-between sm:items-center">
            <Pagination currentPage={currentPage} totalPages={totalPages} />
            <ButtonPrimary>نمایش بیشتر</ButtonPrimary>
          </div>
        </main>

        <div className="relative py-16">
          <BackgroundSection />
          <Suspense fallback={<div>در حال بارگذاری دسته‌بندی‌ها...</div>}>
            <DynamicCategories initialCategories={categories} initialTotalCount={totalCategories} />
          </Suspense>
          <div className="text-center mx-auto mt-10 md:mt-16">
            <ButtonSecondary>نمایش همه دسته‌بندی‌ها</ButtonSecondary>
          </div>
        </div>

        <Suspense fallback={<div>در حال بارگذاری نویسندگان برتر...</div>}>
          <SectionSliderNewAuthors
            heading="قلم‌های برتر"
            subHeading="با ذهن‌های خلاق پشت مقالات ما آشنا شوید"
            authors={topAuthors}
            itemPerRow={5}
          />
        </Suspense>

        <SectionSubscribe2 />
      </div>
    </div>
  );
}
