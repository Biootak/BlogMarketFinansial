'use client';

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

import type { TaxonomyType } from '@/types/types';
import LoadingSpinner from '@/components/LoadingSpinner';
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

  const { register, handleSubmit } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      searchTerm: '',
    },
  });

  const handleCategorySelect = useCallback(
    async (categoryId: string | null) => {
      setIsFiltering(true);
      setIsOpen(false);
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      if (categoryId) {
        current.set('category', categoryId);
      } else {
        current.delete('category');
      }
      current.delete('page');
      current.delete('tag');
      const search = current.toString();
      const query = search ? `?${search}` : '';
      try {
        await router.push(`/archive${query}`);
      } catch (error) {
        console.error('Error during navigation:', error);
      } finally {
        setIsFiltering(false);
      }
    },
    [router, searchParams, setIsFiltering],
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    setIsFiltering(false);
  }, [pathname, searchParams, setIsFiltering]);

  return (
    <div className="rtl">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full md:w-auto relative overflow-hidden">
            {isFiltering && (
              <motion.div
                className="absolute inset-0 bg-primary/20"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: 'linear' }}
              />
            )}
            {isFiltering ? <LoadingSpinner /> : 'انتخاب دسته‌بندی'}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold mb-4">دسته‌بندی‌ها</DialogTitle>
            <DialogDescription className="sr-only">
              در این بخش می‌توانید دسته‌بندی مورد نظر خود را انتخاب کنید یا همه مقالات را مشاهده
              نمایید.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSearchSubmit)} className="mb-4">
            <Input
              {...register('searchTerm')}
              placeholder="جستجوی دسته‌بندی..."
              className="mb-2 text-right"
            />
          </form>
          <ScrollArea className="flex-grow pl-4 overflow-y-auto">
            <Button
              variant="ghost"
              className="w-full justify-end text-right mb-4"
              onClick={handleAllArticles}
            >
              همه مقالات
            </Button>

            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
              >
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant="ghost"
                    className="w-full justify-end text-right"
                    onClick={() => handleCategorySelect(category.id)}
                  >
                    {category.name} ({(category._count as { posts: number }).posts})
                  </Button>
                ))}
              </motion.div>
            </AnimatePresence>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModalCategories;
