'use client';

import { type FC, Fragment, type ReactNode, useState, useCallback, useEffect } from 'react';
import { Combobox, Dialog, Transition } from '@headlessui/react';
import {
  HiOutlineExclamationTriangle,
  HiOutlineHashtag,
  HiOutlineLifebuoy,
  HiOutlineClock,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import debounce from 'lodash/debounce';

import type { PostWithRelations, CategoryWithPostCount, UserWithProfile } from '@/types/types';
import { searchAuthors, searchCategories, searchPosts } from '@/actions/search';
import { getPostLink } from '@/lib/getPostLink';

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ');
}

interface Props {
  renderTrigger?: () => ReactNode;
}

const SearchModal: FC<Props> = ({ renderTrigger }) => {
  const [open, setOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState('');
  const [posts, setPosts] = useState<PostWithRelations[]>([]);
  const [categories, setCategories] = useState<CategoryWithPostCount[]>([]);
  const [authors, setAuthors] = useState<UserWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleSearch = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    try {
      if (searchQuery === '#') {
        const categoriesResult = await searchCategories('');
        if (categoriesResult.success && categoriesResult.data) {
          setCategories(categoriesResult.data);
        }
      } else if (searchQuery === '>') {
        const authorsResult = await searchAuthors('');
        if (authorsResult.success && authorsResult.data) {
          setAuthors(authorsResult.data);
        }
      } else if (searchQuery !== '') {
        const [postsResult, categoriesResult, authorsResult] = await Promise.all([
          searchPosts(searchQuery),
          searchCategories(searchQuery),
          searchAuthors(searchQuery),
        ]);
        if (postsResult.success && postsResult.data) setPosts(postsResult.data);
        if (categoriesResult.success && categoriesResult.data) setCategories(categoriesResult.data);
        if (authorsResult.success && authorsResult.data) setAuthors(authorsResult.data);
      } else {
        setPosts([]);
        setCategories([]);
        setAuthors([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Here you might want to set an error state and show an error message to the user
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(debounce(handleSearch, 300), [handleSearch]);

  useEffect(() => {
    if (rawQuery) {
      debouncedSearch(rawQuery);
    } else {
      setPosts([]);
      setCategories([]);
      setAuthors([]);
    }
    return () => {
      debouncedSearch.cancel();
    };
  }, [rawQuery, debouncedSearch]);

  const handleItemSelect = useCallback(
    (item: any) => {
      if (item?.href) {
        if (item.href.startsWith('/category')) {
          router.push(`/archive/${item.href.split('/').pop()}`);
        } else {
          router.push(item.href);
        }
        setOpen(false);
      } else {
        console.error('Invalid item or href:', item);
      }
    },
    [router],
  );

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {renderTrigger ? (
          renderTrigger()
        ) : (
          <button
            type="button"
            className="flex w-10 h-10 sm:w-12 sm:h-12 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none items-center justify-center"
          >
            <HiOutlineMagnifyingGlass className="w-6 h-6" />
          </button>
        )}
      </div>

      <Transition.Root show={open} as={Fragment} afterLeave={() => setRawQuery('')} appear>
        <Dialog as="div" className="relative z-[99]" onClose={() => setOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-100"
            >
              <Dialog.Panel className="mx-auto max-w-2xl transform divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all">
                <Combobox onChange={handleItemSelect}>
                  <div className="relative">
                    <HiOutlineMagnifyingGlass
                      className="pointer-events-none absolute top-3.5 right-4 h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                    <Combobox.Input
                      className="h-12 w-full border-0 bg-transparent pr-11 pl-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm text-right"
                      placeholder="جستجو..."
                      onChange={(event) => setRawQuery(event.target.value)}
                    />
                  </div>

                  {isLoading ? (
                    <div className="py-14 px-6 text-center text-sm sm:px-14">
                      <p className="mt-4 font-semibold text-gray-900">در حال جستجو...</p>
                    </div>
                  ) : (
                    (posts.length > 0 || categories.length > 0 || authors.length > 0) && (
                      <Combobox.Options
                        static
                        className="max-h-80 scroll-py-10 scroll-pb-2 space-y-4 overflow-y-auto p-4 pb-2"
                      >
                        {posts.length > 0 && (
                          <li>
                            <h2 className="text-xs font-semibold text-gray-900">پست‌ها</h2>
                            <ul className="-mx-4 mt-2 text-sm text-gray-700">
                              {posts.map((post) => (
                                <Combobox.Option
                                  key={post.id}
                                  value={{ href: getPostLink(post.postType, post.slug), ...post }}
                                  className={({ active }) =>
                                    classNames(
                                      'flex select-none items-center px-4 py-2',
                                      active && 'bg-indigo-600 text-white',
                                    )
                                  }
                                >
                                  {({ active }) => (
                                    <>
                                      <HiOutlineClock
                                        className={classNames(
                                          'h-6 w-6 flex-none',
                                          active ? 'text-white' : 'text-gray-400',
                                        )}
                                        aria-hidden="true"
                                      />
                                      <span className="mr-3 flex-auto truncate">{post.title}</span>
                                    </>
                                  )}
                                </Combobox.Option>
                              ))}
                            </ul>
                          </li>
                        )}
                        {categories.length > 0 && (
                          <li>
                            <h2 className="text-xs font-semibold text-gray-900">دسته‌بندی‌ها</h2>
                            <ul className="-mx-4 mt-2 text-sm text-gray-700">
                              {categories.map((category) => (
                                <Combobox.Option
                                  key={category.id}
                                  value={{ href: `/category/${category.slug}`, ...category }}
                                  className={({ active }) =>
                                    classNames(
                                      'flex select-none items-center px-4 py-2',
                                      active && 'bg-indigo-600 text-white',
                                    )
                                  }
                                >
                                  {({ active }) => (
                                    <>
                                      <HiOutlineHashtag
                                        className={classNames(
                                          'h-6 w-6 flex-none',
                                          active ? 'text-white' : 'text-gray-400',
                                        )}
                                        aria-hidden="true"
                                      />
                                      <span className="mr-3 flex-auto truncate">
                                        {category.name}
                                      </span>
                                    </>
                                  )}
                                </Combobox.Option>
                              ))}
                            </ul>
                          </li>
                        )}
                        {authors.length > 0 && (
                          <li>
                            <h2 className="text-xs font-semibold text-gray-900">نویسندگان</h2>
                            <ul className="-mx-4 mt-2 text-sm text-gray-700">
                              {authors.map((author) => (
                                <Combobox.Option
                                  key={author.id}
                                  value={{ href: `/author/${author.id}`, ...author }}
                                  className={({ active }) =>
                                    classNames(
                                      'flex select-none items-center px-4 py-2',
                                      active && 'bg-indigo-600 text-white',
                                    )
                                  }
                                >
                                  {({ active }) => (
                                    <>
                                      <Image
                                        src={author.image || '/default-avatar.png'}
                                        alt={author.name || 'نویسنده'}
                                        className="h-6 w-6 flex-none rounded-full"
                                        width={24}
                                        height={24}
                                      />
                                      <span className="mr-3 flex-auto truncate">
                                        {author.name || author.email}
                                      </span>
                                    </>
                                  )}
                                </Combobox.Option>
                              ))}
                            </ul>
                          </li>
                        )}
                      </Combobox.Options>
                    )
                  )}

                  {rawQuery === '?' && (
                    <div className="py-14 px-6 text-center text-sm sm:px-14">
                      <HiOutlineLifebuoy
                        className="mx-auto h-6 w-6 text-gray-400"
                        aria-hidden="true"
                      />
                      <p className="mt-4 font-semibold text-gray-900">راهنمای جستجو</p>
                      <p className="mt-2 text-gray-500">
                        از این ابزار برای جستجوی سریع کاربران و پروژه‌ها در سراسر پلتفرم ما استفاده
                        کنید. همچنین می‌توانید از تغییردهنده‌های جستجوی موجود در پاورقی زیر برای محدود
                        کردن نتایج به کاربران یا پروژه‌ها استفاده کنید.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center bg-gray-50 py-2.5 px-4 text-xs text-gray-700">
                    تایپ کنید{' '}
                    <kbd
                      className={classNames(
                        'mx-1 flex h-5 w-5 items-center justify-center rounded border bg-white font-semibold sm:mx-2',
                        rawQuery.startsWith('#')
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-gray-400 text-gray-900',
                      )}
                    >
                      #
                    </kbd>{' '}
                    <span className="sm:hidden">برای دسته‌بندی‌ها،</span>
                    <span className="hidden sm:inline">برای دسترسی به دسته‌بندی‌ها،</span>
                    <kbd
                      className={classNames(
                        'mx-1 flex h-5 w-5 items-center justify-center rounded border bg-white font-semibold sm:mx-2',
                        rawQuery.startsWith('>')
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-gray-400 text-gray-900',
                      )}
                    >
                      &gt;
                    </kbd>{' '}
                    برای نویسندگان،{' '}
                    <kbd
                      className={classNames(
                        'mx-1 flex h-5 w-5 items-center justify-center rounded border bg-white font-semibold sm:mx-2',
                        rawQuery === '?'
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-gray-400 text-gray-900',
                      )}
                    >
                      ?
                    </kbd>{' '}
                    برای راهنما، یا{' '}
                    <Link
                      href={'/search'}
                      className="mx-1 flex h-5 px-1.5 items-center justify-center rounded border bg-white sm:mx-2 border-primary-6000 text-neutral-900"
                      onClick={() => setOpen(false)}
                    >
                      رفتن به صفحه جستجو
                    </Link>{' '}
                  </div>
                </Combobox>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
};

export default SearchModal;
