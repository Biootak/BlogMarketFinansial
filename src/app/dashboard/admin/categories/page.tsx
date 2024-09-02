'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, type UseFormReturn, type SubmitHandler } from 'react-hook-form';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiMagnifyingGlass } from 'react-icons/hi2';
import Image from 'next/image';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/actions/categoryActions';
import type { TaxonomyType } from '@/types/types';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import ImageUploader from '@/components/ImageUpload/ImageUploader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ButtonPrimary from '@/components/Button/ButtonPrimary';
import SubmitButton from '@/components/SubmitButton';
import LoadingMore from '@/components/LoadingMore';
import Loading from '@/components/Loading';

type FormData = {
  name: string;
  thumbnail: string | null;
};

type CategoryFormProps = {
  form: UseFormReturn<FormData>;
  onSubmit: SubmitHandler<FormData>;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<TaxonomyType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [editingCategory, setEditingCategory] = useState<TaxonomyType | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  const form = useForm<FormData>({
    defaultValues: {
      name: '',
      thumbnail: null,
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    setCategories([]);
    fetchCategories(1, debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  const fetchCategories = useCallback(
    async (pageNumber: number, search: string) => {
      setIsLoading(true);
      const result = await getCategories({ limit: 10, page: pageNumber, search });
      if (result.success) {
        if (pageNumber === 1) {
          setCategories(result.data?.categories ?? []);
        } else {
          setCategories((prev) => [...prev, ...(result.data?.categories ?? [])]);
        }
        setHasNextPage((result.data?.categories?.length ?? 0) === 10);
      } else {
        toast({
          title: 'خطا',
          description: result.message,
          variant: 'destructive',
        });
      }
      setIsLoading(false);
    },
    [toast],
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isLoading) {
      setPage((prev) => prev + 1);
      fetchCategories(page + 1, debouncedSearchTerm);
    }
  }, [fetchCategories, hasNextPage, isLoading, page, debouncedSearchTerm]);

  const infiniteScrollRef = useInfiniteScroll(loadMore, hasNextPage, isLoading);

  const onSubmit = async (data: FormData) => {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.thumbnail) {
      formData.append('thumbnail', data.thumbnail);
    }

    const result = editingCategory
      ? await updateCategory(editingCategory.id, formData)
      : await createCategory(formData);

    if (result.success) {
      fetchCategories(1, debouncedSearchTerm);
      form.reset();
      setEditingCategory(null);
      setIsEditDialogOpen(false);
      toast({
        title: 'موفقیت',
        description: result.message,
        variant: 'success',
      });
    } else {
      toast({
        title: 'خطا',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (category: TaxonomyType) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      thumbnail: category.thumbnail || null,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید این دسته‌بندی را حذف کنید؟')) {
      const result = await deleteCategory(id);
      if (result.success) {
        fetchCategories(1, debouncedSearchTerm);
        toast({
          title: 'موفقیت',
          description: result.message,
          variant: 'success',
        });
      } else {
        toast({
          title: 'خطا',
          description: result.message,
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 rtl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 lg:mb-8 text-right text-primary-700 dark:text-primary-300">
        مدیریت دسته‌بندی‌ها
      </h1>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 lg:mb-8 space-y-4 sm:space-y-0">
        <Dialog>
          <DialogTrigger asChild>
            <ButtonPrimary
              aria-label="افزودن دسته‌بندی جدید"
              className="w-full sm:w-auto bg-gradient-to-l from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-medium py-2 px-4 sm:px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <HiOutlinePlus
                className="inline-block ml-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300"
                aria-hidden="true"
              />
              <span className="group-hover:mr-2 transition-all duration-300">
                افزودن دسته‌بندی جدید
              </span>
            </ButtonPrimary>
          </DialogTrigger>
          <DialogContent className="rtl sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] xl:max-w-[1000px] h-auto max-h-[90vh] bg-white dark:bg-neutral-800 rounded-lg overflow-hidden shadow-xl">
            <DialogHeader className="p-4 sm:p-6 pb-2">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-primary-300">
                افزودن دسته‌بندی جدید
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[calc(90vh-100px)] scrollbar-custom">
              <div className="p-4 sm:p-6 pt-2">
                <CategoryForm form={form} onSubmit={onSubmit} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <div className="w-full sm:w-auto relative mt-4 sm:mt-0">
          <Input
            type="text"
            placeholder="جستجوی دسته‌بندی..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 focus:border-primary-500 dark:focus:border-primary-400"
          />
          <HiMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
        </div>
      </div>

      {isLoading && page === 1 ? (
        <Loading className="items-center" />
      ) : (
        <div className="overflow-x-auto">
          <Table className="w-full bg-white dark:bg-neutral-800 shadow-md rounded-lg overflow-hidden">
            <TableHeader>
              <TableRow className="bg-neutral-100 dark:bg-neutral-700">
                <TableHead className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  تصویر
                </TableHead>
                <TableHead className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  نام
                </TableHead>
                <TableHead className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 hidden sm:table-cell">
                  تعداد پست‌ها
                </TableHead>
                <TableHead className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  عملیات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow
                  key={category.id}
                  className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors duration-150"
                >
                  <TableCell className="py-3 px-4 sm:py-4 sm:px-6">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 relative overflow-hidden rounded-full">
                      {category.thumbnail ? (
                        <Image
                          src={category.thumbnail}
                          alt={category.name}
                          layout="fill"
                          objectFit="cover"
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                          <span className="text-lg sm:text-2xl">
                            {category.name && category.name.length > 0
                              ? category.name[0].toUpperCase()
                              : '?'}
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200">
                    {category.name}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 hidden sm:table-cell">
                    {category._count?.posts ?? 0}
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:py-4 sm:px-6">
                    <div className="flex justify-start space-x-2 space-x-reverse">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        className="text-primary-600 border-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-primary-900 text-xs sm:text-sm px-2 sm:px-3 py-1"
                      >
                        <HiOutlinePencil className="ml-1 hidden sm:inline" />
                        ویرایش
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                        className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900 text-xs sm:text-sm px-2 sm:px-3 py-1"
                      >
                        <HiOutlineTrash className="ml-1 hidden sm:inline" />
                        حذف
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {isLoading && page > 1 && <LoadingMore message="در حال دریافت دسته‌بندی‌های بیشتر..." />}
          <div ref={infiniteScrollRef} style={{ height: '1px' }} />
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rtl sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] xl:max-w-[1000px] h-auto max-h-[90vh] bg-white dark:bg-neutral-800 rounded-lg overflow-hidden shadow-xl">
          <DialogHeader className="p-4 sm:p-6 pb-2">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-primary-300">
              ویرایش دسته‌بندی
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-100px)] scrollbar-custom">
            <div className="p-4 sm:p-6 pt-2">
              <CategoryForm form={form} onSubmit={onSubmit} />
            </div>
          </div>{' '}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryForm({ form, onSubmit }: CategoryFormProps) {
  const handleImageUpload = (urls: string[]) => {
    form.setValue('thumbnail', urls[0]);
  };

  const handleImageRemove = () => {
    form.setValue('thumbnail', null);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                نام دسته‌بندی
              </FormLabel>
              <FormControl>
                <Input placeholder="نام دسته‌بندی" {...field} className="text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="thumbnail"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                تصویر شاخص
              </FormLabel>
              <FormControl>
                <ImageUploader
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  maxFiles={1}
                  multiple={false}
                  initialPreviews={field.value ? [field.value] : []}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SubmitButton isSubmitting={form.formState.isSubmitting} />
      </form>
    </Form>
  );
}
