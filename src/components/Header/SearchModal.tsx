'use client';

import { type FC, Fragment, type ReactNode, useState } from 'react';
import { Combobox, Dialog, Transition } from '@headlessui/react';
import {
  HiOutlineExclamationTriangle,
  HiOutlineHashtag,
  HiOutlineLifebuoy,
  HiOutlineClock,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import Image from 'next/image';
import { DEMO_AUTHORS } from '@/data/authors';
import { DEMO_CATEGORIES } from '@/data/taxonomies';
import { DEMO_POSTS } from '@/data/posts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const categories = DEMO_CATEGORIES.filter((_, i) => i < 9);
const posts = DEMO_POSTS.filter((_, i) => i < 5);
const authors = DEMO_AUTHORS.filter((_, i) => i < 9);

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ');
}

interface Props {
  renderTrigger?: () => ReactNode;
}

const SearchModal: FC<Props> = ({ renderTrigger }) => {
  const [open, setOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState('a');

  const router = useRouter();

  const query = rawQuery.toLowerCase().replace(/^[#>]/, '');

  const filteredPosts =
    rawQuery === '#'
      ? posts
      : query === '' || rawQuery.startsWith('>')
        ? []
        : posts.filter((project) => project.title.toLowerCase().includes(query));

  const filteredProjects =
    rawQuery === '#'
      ? categories
      : query === '' || rawQuery.startsWith('>')
        ? []
        : categories.filter((project) => project.name.toLowerCase().includes(query));

  const filteredUsers =
    rawQuery === '>'
      ? authors
      : query === '' || rawQuery.startsWith('#')
        ? []
        : authors.filter((user) => user.displayName.toLowerCase().includes(query));

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {renderTrigger ? (
          renderTrigger()
        ) : (
          <button type='button' className="flex w-10 h-10 sm:w-12 sm:h-12 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none items-center justify-center">
            <HiOutlineMagnifyingGlass className="w-6 h-6" />
          </button>
        )}
      </div>

      <Transition.Root show={open} as={Fragment} afterLeave={() => setRawQuery('a')} appear>
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
              <Dialog.Panel
                className="block mx-auto max-w-2xl transform divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all"
                as="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  router.push('/search');
                  setOpen(false);
                }}
              >
                <Combobox
                  onChange={(item: any) => {
                    router.push(item.href);
                    setOpen(false);
                  }}
                  name="searchpallet"
                >
                  <div className="relative">
                    <HiOutlineMagnifyingGlass
                      className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                    <Combobox.Input
                      className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                      placeholder="Search..."
                      onChange={(event) => setRawQuery(event.target.value)}
                    />
                  </div>

                  {(filteredProjects.length > 0 ||
                    filteredUsers.length > 0 ||
                    filteredPosts.length > 0) && (
                    <Combobox.Options
                      static
                      className="max-h-80 scroll-py-10 scroll-pb-2 space-y-4 overflow-y-auto p-4 pb-2"
                    >
                      {filteredPosts.length > 0 && (
                        <li>
                          <h2 className="text-xs font-semibold text-gray-900">Posts</h2>
                          <ul className="-mx-4 mt-2 text-sm text-gray-700">
                            {filteredPosts.map((post) => (
                              <Combobox.Option
                                key={post.id}
                                value={post}
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
                                    <span className="ms-3 flex-auto truncate">{post.title}</span>
                                  </>
                                )}
                              </Combobox.Option>
                            ))}
                          </ul>
                        </li>
                      )}

                      {filteredProjects.length > 0 && (
                        <li>
                          <h2 className="text-xs font-semibold text-gray-900">Categories</h2>
                          <ul className="-mx-4 mt-2 text-sm text-gray-700">
                            {filteredProjects.map((project) => (
                              <Combobox.Option
                                key={project.id}
                                value={project}
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
                                    <span className="ms-3 flex-auto truncate">{project.name}</span>
                                  </>
                                )}
                              </Combobox.Option>
                            ))}
                          </ul>
                        </li>
                      )}

                      {filteredUsers.length > 0 && (
                        <li>
                          <h2 className="text-xs font-semibold text-gray-900">Authors</h2>
                          <ul className="-mx-4 mt-2 text-sm text-gray-700">
                            {filteredUsers.map((user) => (
                              <Combobox.Option
                                key={user.id}
                                value={user}
                                className={({ active }) =>
                                  classNames(
                                    'flex select-none items-center px-4 py-2',
                                    active && 'bg-indigo-600 text-white',
                                  )
                                }
                              >
                                <Image
                                  src={user.avatar}
                                  alt="author"
                                  className="h-6 w-6 flex-none rounded-full"
                                  sizes="30px"
                                />
                                <span className="ms-3 flex-auto truncate">{user.displayName}</span>
                              </Combobox.Option>
                            ))}
                          </ul>
                        </li>
                      )}
                    </Combobox.Options>
                  )}

                  {rawQuery === '?' && (
                    <div className="py-14 px-6 text-center text-sm sm:px-14">
                      <HiOutlineLifebuoy
                        className="mx-auto h-6 w-6 text-gray-400"
                        aria-hidden="true"
                      />
                      <p className="mt-4 font-semibold text-gray-900">Help with searching</p>
                      <p className="mt-2 text-gray-500">
                        Use this tool to quickly search for users and projects across our entire
                        platform. You can also use the search modifiers found in the footer below to
                        limit the results to just users or projects.
                      </p>
                    </div>
                  )}

                  {query !== '' &&
                    rawQuery !== '?' &&
                    filteredProjects.length === 0 &&
                    filteredUsers.length === 0 && (
                      <div className="py-14 px-6 text-center text-sm sm:px-14">
                        <HiOutlineExclamationTriangle
                          className="mx-auto h-6 w-6 text-gray-400"
                          aria-hidden="true"
                        />
                        <p className="mt-4 font-semibold text-gray-900">No results found</p>
                        <p className="mt-2 text-gray-500">
                          We couldn’t find anything with that term. Please try again.
                        </p>
                      </div>
                    )}

                  <div className="flex flex-wrap items-center bg-gray-50 py-2.5 px-4 text-xs text-gray-700">
                    Type{' '}
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
                    <span className="sm:hidden">for projects,</span>
                    <span className="hidden sm:inline">to access projects,</span>
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
                    for users,{' '}
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
                    for help, or{' '}
                    <Link
                      href={'/search'}
                      className="mx-1 flex h-5 px-1.5 items-center justify-center rounded border bg-white sm:mx-2 border-primary-6000 text-neutral-900"
                      onClick={() => setOpen(false)}
                    >
                      Go to search page
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
