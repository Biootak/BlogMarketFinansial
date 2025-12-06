'use client';

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
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Search, Sparkles, Tag } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import Loading from '@/components/Button/Loading';
import { useFilterStore } from '@/lib/store';
import type { TaxonomyType } from '@/types/types';

const searchSchema = z.object({
  searchTerm: z.string().max(100, 'جستجو نمی‌تواند بیشتر از 100 کاراکتر باشد'),
});

type SearchFormData = z.infer<typeof searchSchema>;

export type ModalTagsProps = {
  initialTags: TaxonomyType[];
};

const ModalTags: React.FC<ModalTagsProps> = ({ initialTags }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [tags, setTags] = useState(initialTags);
  const { isFiltering, setIsFiltering } = useFilterStore();

  const { register, handleSubmit, watch } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      searchTerm: '',
    },
  });

  const searchTerm = watch('searchTerm');

  const handleTagSelect = useCallback(
    async (tagSlug: string | null) => {
      setIsFiltering(true);
      setIsOpen(false);
      try {
        if (tagSlug) {
          await router.push(`/archive/tag/${tagSlug}`);
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

  const handleAllTags = useCallback(() => {
    handleTagSelect(null);
  }, [handleTagSelect]);

  const onSearchSubmit = useCallback(
    (data: SearchFormData) => {
      const filteredTags = initialTags.filter((tag) =>
        tag.name.toLowerCase().includes(data.searchTerm.toLowerCase()),
      );
      setTags(filteredTags);
    },
    [initialTags],
  );

  // Live search
  useEffect(() => {
    const filteredTags = initialTags.filter((tag) =>
      tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setTags(filteredTags);
  }, [searchTerm, initialTags]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    setIsFiltering(false);
  }, [pathname, searchParams, setIsFiltering]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full md:w-auto relative overflow-hidden gap-2 px-4 py-2.5 rounded-xl border-neutral-200 dark:border-neutral-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200"
        >
          {isFiltering && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-emerald/0 via-emerald/20 to-emerald/0"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: 'linear' }}
            />
          )}
          <Tag className="w-4 h-4 text-emerald-500" />
          {isFiltering ? <Loading size="sm" variant="secondary" type="spinner" /> : 'برچسب‌ها'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] md:max-w-[700px] lg:max-w-[900px] w-[95vw] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border-neutral-200/80 dark:border-neutral-700/80">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-800 dark:to-neutral-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-white">
                برچسب‌ها
              </DialogTitle>
              <DialogDescription className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                برچسب مورد نظر خود را انتخاب کنید
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <form onSubmit={handleSubmit(onSearchSubmit)} className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              {...register('searchTerm')}
              placeholder="جستجوی برچسب..."
              className="pr-10 h-11 rounded-xl border-neutral-200 dark:border-neutral-700 focus:border-emerald-400 dark:focus:border-emerald-600 bg-neutral-50 dark:bg-neutral-800/50"
            />
          </form>
        </div>

        <ScrollArea className="flex-grow px-6 py-4">
          <Button
            variant="ghost"
            className="w-full justify-between mb-4 h-12 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 hover:from-emerald-100 hover:to-emerald-200/50 dark:hover:from-emerald-900/50 dark:hover:to-emerald-800/30 border border-emerald-200/50 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300"
            onClick={handleAllTags}
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
              className="flex flex-wrap gap-2"
            >
              {tags.map((tag, index) => (
                <motion.div
                  key={tag.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Button
                    variant="ghost"
                    className="h-9 px-4 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-neutral-200/80 dark:border-neutral-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 group"
                    onClick={() => handleTagSelect(tag.slug)}
                  >
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      #{tag.name}
                    </span>
                    <span className="mr-1.5 text-xs text-neutral-400 dark:text-neutral-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-500">
                      ({tag.count})
                    </span>
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          {tags.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <Search className="w-7 h-7 text-neutral-400" />
              </div>
              <p className="text-neutral-500 dark:text-neutral-400">برچسبی یافت نشد</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ModalTags;
