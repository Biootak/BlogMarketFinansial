import Card10 from '@/components/Card10/Card10';
import Card10V3 from '@/components/Card10/Card10V3';
import type { PostWithRelations } from '@/types/types';
import { Images, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { FC } from 'react';

export interface SectionMagazine7Props {
  posts: PostWithRelations[];
  className?: string;
}

const SectionMagazine7: FC<SectionMagazine7Props> = ({ posts = [], className = '' }) => {
  return (
    <section className={`nc-SectionMagazine7 relative ${className}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-10">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="relative">
            <div className="absolute -inset-1.5 sm:-inset-2 bg-gradient-to-r from-primary-500 to-cyan-400 rounded-2xl sm:rounded-2xl blur-xl opacity-20" />
            <div className="relative p-2.5 sm:p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl sm:rounded-2xl shadow-xl">
              <Images className="w-4.5 h-4.5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-lg sm:text-2xl lg:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              روایت‌های تصویری
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {posts.length > 0 ? `بیش از ${posts.length.toLocaleString('fa-IR')} روایت تصویری` : 'روایت‌هایی که با تصویر جان می‌گیرند'}
            </p>
          </div>
        </div>

        <Link
          href="/archive"
          className="group flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-2xl transition-all duration-300"
        >
          <span className="text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-200 group-hover:text-neutral-900 dark:hover:text-white">
            مشاهده همه
          </span>
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 group-hover:-translate-x-1 transition-all duration-300" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:gap-6 stagger-children">
        <div className="grid gap-3 sm:gap-4 md:gap-5 lg:grid-cols-2">
          {posts.slice(0, 2).map((post, index) => (
            <div key={post.id} className="group anim-fade-in-up">
              <div className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-neutral-800/60 backdrop-blur border border-neutral-200/60 dark:border-neutral-700/60 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1.5">
                <Card10V3 post={post} galleryType={index === 1 ? 2 : 1} className="h-full" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {posts.slice(2, 6).map((post) => (
            <div key={post.id} className="group anim-fade-in-up">
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-neutral-800/60 backdrop-blur border border-neutral-200/60 dark:border-neutral-700/60 transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                <Card10 post={post} className="h-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -top-24 -end-24 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -start-24 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
    </section>
  );
};

export default SectionMagazine7;
