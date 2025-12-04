'use client';

import type React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FolderOpen, Search, Sparkles, ChevronLeft } from 'lucide-react';

import type { TaxonomyType } from '@/types/types';
import Loading from '@/components/Button/Loading';
import { useFilterStore } from '@/lib/store';

const searchSchema = z.object({
  searchTerm: z.string().max(100, 'جستجو نمی‌تواند بیشتر از 100 کاراکتر باشد'),
});

type SearchFormData = z.infer<typeof searchSchema>;

export type ModalCategoriesProps = {
  initialCategories: TaxonomyType[];
};

const ModalCategories: React.FC<ModalCategoriesProps> = ({ initialCategories }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const { isFiltering, setIsFiltering } = useFilterStore();

  const { register, handleSubmit, watch } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      searchTerm: '',
    },
  });

  const searchTerm = watch('searchTerm');

  const handleCategorySelect = useCallback(
    async (categorySlug: string | null) => {
      setIsFiltering(true);
      setIsOpen(false);
      try {
        if (categorySlug) {
          await router.push(`/archive/category/${categorySlug}`);
        } else {
          await router.push('/archive');
        }
      } catch (error) {
        console.error('Error during navigation:', error);
      } finally {
        setIsFiltering(false);
      }
    },
    [router, setIsFiltering],
  );

  const handleAllArticles = useCallback(() => {
    handleCategorySelect(null);
  }, [handleCategorySelect]);

  const onSearchSubmit = useCallback(
    (data: SearchFormData) => {
      const filteredCategories = initialCategories.filter((category) =>
        category.name.toLowerCase().includes(data.searchTerm.toLowerCase()),
      );
      setCategories(filteredCategories);
    },
    [initialCategories],
  );

  // Live search
  useEffect(() => {
    const filteredCategories = initialCategories.filter((category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setCategories(filteredCategories);
  }, [searchTerm, initialCategories]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    setIsFiltering(false);
  }, [pathname, searchParams, setIsFiltering]);

  return (
    <div className="rtl">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full md:w-auto relative overflow-hidden gap-2 px-4 py-2.5 rounded-xl border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200"
          >
            {isFiltering && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: 'linear' }}
              />
            )}
            <FolderOpen className="w-4 h-4 text-primary-500" />
            {isFiltering ? <Loading size="sm" variant="secondary" type="spinner" /> : 'دسته‌بندی‌ها'}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] md:max-w-[700px] lg:max-w-[900px] w-[95vw] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border-neutral-200/80 dark:border-neutral-700/80">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-800 dark:to-neutral-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-white">دسته‌بندی‌ها</DialogTitle>
                <DialogDescription className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                  دسته‌بندی مورد نظر خود را انتخاب کنید
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <form onSubmit={handleSubmit(onSearchSubmit)} className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                {...register('searchTerm')}
                placeholder="جستجوی دسته‌بندی..."
                className="pr-10 h-11 rounded-xl border-neutral-200 dark:border-neutral-700 focus:border-primary-400 dark:focus:border-primary-600 bg-neutral-50 dark:bg-neutral-800/50"
              />
            </form>
          </div>
          
          <ScrollArea className="flex-grow px-6 py-4">
            <Button
              variant="ghost"
              className="w-full justify-between mb-4 h-12 rounded-xl bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/30 dark:to-primary-800/20 hover:from-primary-100 hover:to-primary-200/50 dark:hover:from-primary-900/50 dark:hover:to-primary-800/30 border border-primary-200/50 dark:border-primary-700/50 text-primary-700 dark:text-primary-300"
              onClick={handleAllArticles}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold">همه مقالات</span>
              </div>
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <AnimatePresence mode="popLayout">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              >
                {categories.map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-between h-12 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition-all duration-200 group"
                      onClick={() => handleCategorySelect(category.slug)}
                    >
                      <span className="font-medium text-neutral-700 dark:text-neutral-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                        {category.name}
                      </span>
                      <span className="text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-1 rounded-full group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {category.count}
                      </span>
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
            
            {categories.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Search className="w-7 h-7 text-neutral-400" />
                </div>
                <p className="text-neutral-500 dark:text-neutral-400">دسته‌بندی‌ای یافت نشد</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModalCategories;
