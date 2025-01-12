import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BookOpen, 
  FolderOpen, 
  Tag, 
  Clock,
  Flame,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FiFilter } from 'react-icons/fi';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { IoClose } from 'react-icons/io5';
import { BsFolder2Open, BsTag } from 'react-icons/bs';
import { IoTimeOutline } from 'react-icons/io5';
import Link from 'next/link';

import { getArchivePosts } from '@/actions/postActions';
import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';
import { getTopAuthors } from '@/actions/getTopAuthors';
import Image from 'next/image';
import ModalCategories from '../../ModalCategories';
import ModalTags from '../../ModalTags';
import ArchiveFilterListBox from '@/components/ArchiveFilterListBox/ArchiveFilterListBox';
import AnimatedPostGrid from '../../AnimatedPostGrid';
import Pagination from '@/components/Pagination/Pagination';
import BackgroundSection from '@/components/BackgroundSection/BackgroundSection';
import DynamicCategories from '@/components/DynamicCategories';
import SectionSliderNewAuthors from '@/components/SectionSliderNewAthors/SectionSliderNewAuthors';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import Empty from '@/components/Empty';

export async function generateMetadata({
  params,
}: {
  params: { slug?: string[] };
}): Promise<Metadata> {
  const [type, category, subcategory] = params.slug || [];
  let title = 'گنجینه مقالات | دنیای دانش و الهام';
  let description = 'کاوش در مجموعه گسترده مقالات ما: از علم تا هنر، از فناوری تا فلسفه';

  if (type === 'category') {
    if (subcategory) {
      title = `مقالات ${subcategory} در دسته‌بندی ${category} | ${title}`;
      description = `مطالب مرتبط با ${subcategory} در دسته‌بندی ${category}`;
    } else {
      title = `مقالات دسته‌بندی ${category} | ${title}`;
      description = `مطالب مرتبط با دسته‌بندی ${category}`;
    }
  } else if (type === 'tag') {
    title = `مقالات با برچسب ${category} | ${title}`;
    description = `مطالب مرتبط با برچسب ${category}`;
  }

  return {
    title,
    description,
  };
}

const FILTERS = [
  { name: 'همه مقالات', className: 'text-center' },
  { name: 'جدیدترین' },
  { name: 'قدیمی‌ترین' },
  { name: 'محبوب‌ترین' },
];

type PageArchiveProps = {
  params: { slug?: string[] };
  searchParams: {
    page?: string;
    filter?: string;
  };
};

export default async function PageArchive({ params, searchParams }: PageArchiveProps) {
  const [type, category, subcategory] = params.slug || [];
  const currentPage = searchParams.page ? Number.parseInt(searchParams.page) : 1;
  const filter = searchParams.filter || FILTERS[0].name;
  const limit = 12;

  if (type && !['category', 'tag'].includes(type)) {
    notFound();
  }

  const [postsResult, categoriesResult, tagsResult, topAuthorsResult] = await Promise.all([
    getArchivePosts(
      currentPage,
      limit,
      filter,
      type === 'category' ? category : undefined,
      subcategory,
      type === 'tag' ? category : undefined,
    ),
    getCategories({ limit: 10, page: 1 }),
    getTags({ limit: 10, page: 1 }),
    getTopAuthors(5),
  ]);

  const { posts, total, pages } = postsResult.data || { posts: [], total: 0, pages: 0 };
  const categories = categoriesResult.data?.categories || [];
  const tags = tagsResult.data?.tags || [];
  const topAuthors = topAuthorsResult || [];

  const selectedCategory =
    type === 'category' ? categories.find((cat) => cat.slug === category) : null;
  const selectedSubcategory = subcategory
    ? selectedCategory?.childCategories?.find((sub) => sub.slug === subcategory)
    : null;
  const selectedTag = type === 'tag' ? tags.find((tag) => tag.slug === category) : null;

  const defaultImage = '/images/crypto/crypto.png';

  return (
    <div className="nc-PageArchive max-w-full overflow-x-hidden">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <nav className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Link href="/" className="hover:text-primary transition-colors">
            <Home className="w-4 h-4" />
          </Link>
          <ChevronLeft className="w-4 h-4" />
          <Link href="/archive" className="hover:text-primary transition-colors">آرشیو</Link>
          {type && (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>{type === 'category' ? 'دسته‌بندی' : 'برچسب'}</span>
            </>
          )}
          {selectedCategory && (
            <>
              <ChevronLeft className="w-4 h-4" />
              <Link href={`/archive/category/${selectedCategory.slug}`} className="hover:text-primary transition-colors">
                {selectedCategory.name}
              </Link>
            </>
          )}
          {selectedSubcategory && (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-gray-900 dark:text-gray-100">{selectedSubcategory.name}</span>
            </>
          )}
          {selectedTag && (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-gray-900 dark:text-gray-100">{selectedTag.name}</span>
            </>
          )}
        </nav>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800/95 shadow-xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent dark:from-primary/15">
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
          </div>
          
          <div className="relative">
            <div className="flex flex-col md:flex-row items-center p-4 sm:p-6 gap-4">
              <div className="shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 relative rounded-xl overflow-hidden shadow-lg ring-1 ring-primary/10 dark:ring-white/10">
                  <Image
                    src={selectedCategory?.thumbnail || selectedTag?.thumbnail || defaultImage}
                    alt={selectedCategory?.name || selectedTag?.name || 'تصویر مقالات'}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transform hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
              
              <div className="flex-1 min-w-0 text-center md:text-right space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                    {/* نوع محتوا */}
                    <span className="inline-flex items-center gap-1.5">
                      {selectedCategory ? (
                        <BsFolder2Open className="w-4 h-4 text-primary" />
                      ) : selectedTag ? (
                        <BsTag className="w-4 h-4 text-primary" />
                      ) : (
                        <FileText className="w-4 h-4 text-primary" />
                      )}
                      <span className="font-medium">
                        {selectedCategory ? 'دسته‌بندی' : selectedTag ? 'برچسب' : 'همه مطالب'}
                      </span>
                    </span>

                    {/* تعداد مقالات */}
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" />
                      <span>{total} مقاله</span>
                    </span>

                    {/* زیرگروه‌ها */}
                    {!subcategory && selectedCategory?.childCategories && selectedCategory.childCategories.length > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <BsFolder2Open className="w-4 h-4 text-primary" />
                        <span>{selectedCategory.childCategories.length} زیرگروه</span>
                      </span>
                    )}

                    {/* آخرین بروزرسانی */}
                    <span className="inline-flex items-center gap-1.5">
                      <IoTimeOutline className="w-4 h-4 text-primary" />
                      <span>آخرین بروزرسانی: امروز</span>
                    </span>
                  </div>
                  
                  {/* عنوان اصلی */}
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-tight">
                    {selectedSubcategory
                      ? selectedSubcategory.name
                      : selectedCategory
                        ? selectedCategory.name
                        : selectedTag
                          ? `مطالب مرتبط با ${selectedTag.name}`
                          : 'همه مطالب'}
                  </h1>

                  {/* توضیحات */}
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {selectedSubcategory
                      ? `مطالب مربوط به ${selectedSubcategory.name}`
                      : selectedCategory
                        ? `مجموعه مطالب ${selectedCategory.name}`
                        : selectedTag
                          ? `مطالبی که با ${selectedTag.name} برچسب‌گذاری شده‌اند`
                          : 'همه مطالب و محتوای سایت در یک نگاه'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 space-y-8 sm:space-y-12 lg:space-y-16">
        <div>
          {/* Desktop View */}
          <div className="hidden md:flex md:flex-row md:items-center md:justify-between mb-6 sm:mb-8">
            <div className="flex flex-row space-x-2.5 rtl:space-x-reverse">
              <ModalCategories initialCategories={categories} />
              <ModalTags initialTags={tags} />
            </div>
            <div>
              <ArchiveFilterListBox filters={FILTERS} initialFilter={filter} />
            </div>
          </div>

          {/* Mobile View */}
          <div className="md:hidden fixed bottom-4 left-4 z-50">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <FiFilter className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="w-full sm:w-[380px] bg-background/20 backdrop-blur-xl border-0 rtl [&>button]:hidden"
              >
                <div className="h-full flex flex-col">
                  <SheetHeader className="mb-6 px-6 pt-6">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="text-2xl font-bold">فیلترها</SheetTitle>
                      <SheetClose className="h-10 w-10 rounded-full hover:bg-white/10 inline-flex items-center justify-center">
                        <IoClose className="h-5 w-5" />
                      </SheetClose>
                    </div>
                  </SheetHeader>

                  <div className="flex-1 overflow-auto px-6">
                    <div className="space-y-6">
                      <div className="filter-section">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-medium">دسته‌بندی‌ها</h3>
                          <span className="text-sm text-muted-foreground/70">انتخاب کنید</span>
                        </div>
                        <div className="bg-white/5 hover:bg-white/10 transition-colors duration-200 rounded-xl p-4 shadow-sm text-center">
                          <ModalCategories initialCategories={categories} />
                        </div>
                      </div>

                      <div className="filter-section">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-medium">برچسب‌ها</h3>
                          <span className="text-sm text-muted-foreground/70">انتخاب کنید</span>
                        </div>
                        <div className="bg-white/5 hover:bg-white/10 transition-colors duration-200 rounded-xl p-4 shadow-sm text-center">
                          <ModalTags initialTags={tags} />
                        </div>
                      </div>

                      <div className="filter-section pb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-medium">مرتب‌سازی</h3>
                          <span className="text-sm text-muted-foreground/70">{filter}</span>
                        </div>
                        <div className="bg-white/5 hover:bg-white/10 transition-colors duration-200 rounded-xl p-4 shadow-sm text-center">
                          <ArchiveFilterListBox filters={FILTERS} initialFilter={filter} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {posts.length > 0 ? <AnimatedPostGrid posts={posts} /> : <Empty />}

          {posts.length > 0 && (
            <div className="flex flex-col mt-8 sm:mt-10 lg:mt-12 space-y-5 sm:space-y-0 sm:space-x-3 sm:flex-row sm:justify-between sm:items-center">
              <Pagination currentPage={currentPage} totalPages={pages} />
            </div>
          )}
        </div>

        <div className="relative py-12 sm:py-16">
          <BackgroundSection />
          <DynamicCategories
            initialCategories={categories}
            initialTotalCount={categoriesResult.data?.totalCount || 0}
          />
        </div>

        <SectionSliderNewAuthors
          heading="قلم‌های برتر"
          subHeading="با ذهن‌های خلاق پشت مقالات ما آشنا شوید"
          authors={topAuthors}
          itemPerRow={5}
        />

        <SectionSubscribe2 />
      </div>
    </div>
  );
}
