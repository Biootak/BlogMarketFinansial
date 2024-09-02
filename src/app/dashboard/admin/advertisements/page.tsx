'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiMagnifyingGlass } from 'react-icons/hi2';
import {
  getActiveAdvertisements,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  getAllAdvertisements,
} from '@/actions/advertisementActions';
import type { Advertisement } from '@/types/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { PersianDatePicker } from '@/components/ui/PersianDatePicker';
import SubmitButton from '@/components/SubmitButton';
import LoadingMore from '@/components/LoadingMore';
import Loading from '@/components/Loading';

interface AdvertisementFormProps {
  form: UseFormReturn<Omit<Advertisement, 'id'>>;
  onSubmit: (data: Omit<Advertisement, 'id'>) => Promise<void>;
}

export default function AdvertisementsPage() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  const [totalCount, setTotalCount] = useState(0);

  const form = useForm<Omit<Advertisement, 'id'>>();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    setAds([]);
    fetchAds(1, debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const fetchAds = useCallback(
    async (pageNumber: number, search: string) => {
      setIsLoading(true);
      const result = await getAllAdvertisements({ limit: 10, page: pageNumber, search });
      if (result.success && result.data) {
        const { ads: newAds, totalCount } = result.data;
        if (pageNumber === 1) {
          setAds(newAds);
        } else {
          setAds((prev) => [...prev, ...newAds]);
        }
        setTotalCount(totalCount);
        setHasNextPage(page * 10 < totalCount);
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
      fetchAds(page + 1, debouncedSearchTerm);
    }
  }, [fetchAds, hasNextPage, isLoading, page, debouncedSearchTerm]);

  const infiniteScrollRef = useInfiniteScroll(loadMore, hasNextPage, isLoading);

  const onSubmit = async (data: Omit<Advertisement, 'id'>) => {
    const formattedData = {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate: data.endDate ? new Date(data.endDate) : new Date(),
    };

    const result = editingAd
      ? await updateAdvertisement(editingAd.id, formattedData)
      : await createAdvertisement(formattedData);

    if (result.success) {
      fetchAds(1, debouncedSearchTerm);
      form.reset();
      setEditingAd(null);
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

  const handleEdit = (ad: Advertisement) => {
    setEditingAd(ad);
    form.reset({
      ...ad,
      startDate: new Date(ad.startDate),
      endDate: new Date(ad.endDate),
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید این تبلیغ را حذف کنید؟')) {
      const result = await deleteAdvertisement(id);
      if (result.success) {
        fetchAds(1, debouncedSearchTerm);
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
        مدیریت تبلیغات
      </h1>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 lg:mb-8 space-y-4 sm:space-y-0">
        <Dialog>
          <DialogTrigger asChild>
            <ButtonPrimary
              aria-label="افزودن تبلیغ جدید"
              className="w-full sm:w-auto bg-gradient-to-l from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-medium py-2 px-4 sm:px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <HiOutlinePlus
                className="inline-block ml-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300"
                aria-hidden="true"
              />
              <span className="group-hover:mr-2 transition-all duration-300">
                افزودن تبلیغ جدید
              </span>
            </ButtonPrimary>
          </DialogTrigger>
          <DialogContent className="rtl sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] xl:max-w-[1000px] h-auto max-h-[90vh] bg-white dark:bg-neutral-800 rounded-lg overflow-hidden shadow-xl">
            <DialogHeader className="p-4 sm:p-6 pb-2">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-primary-300">
                افزودن تبلیغ جدید
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[calc(90vh-100px)] scrollbar-custom">
              <div className="p-4 sm:p-6 pt-2">
                <AdvertisementForm form={form} onSubmit={onSubmit} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <div className="w-full sm:w-auto relative mt-4 sm:mt-0">
          <Input
            type="text"
            placeholder="جستجوی تبلیغ..."
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
                  عنوان
                </TableHead>
                <TableHead className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 hidden sm:table-cell">
                  تاریخ شروع
                </TableHead>
                <TableHead className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 hidden sm:table-cell">
                  تاریخ پایان
                </TableHead>
                <TableHead className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  عملیات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((ad) => (
                <TableRow
                  key={ad.id}
                  className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors duration-150"
                >
                  <TableCell className="py-3 px-4 sm:py-4 sm:px-6">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 relative overflow-hidden rounded-full">
                      <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200">
                    {ad.title}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 hidden sm:table-cell">
                    {new Date(ad.startDate).toLocaleDateString('fa-IR')}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 hidden sm:table-cell">
                    {new Date(ad.endDate).toLocaleDateString('fa-IR')}
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:py-4 sm:px-6">
                    <div className="flex justify-start space-x-2 space-x-reverse">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(ad)}
                        className="text-primary-600 border-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-primary-900 text-xs sm:text-sm px-2 sm:px-3 py-1"
                      >
                        <HiOutlinePencil className="ml-1 hidden sm:inline" />
                        ویرایش
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(ad.id)}
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
          {isLoading && page > 1 && <LoadingMore message="در حال دریافت تبلیغات بیشتر..." />}
          <div ref={infiniteScrollRef} style={{ height: '1px' }} />
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rtl sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] xl:max-w-[1000px] h-auto max-h-[90vh] bg-white dark:bg-neutral-800 rounded-lg overflow-hidden shadow-xl">
          <DialogHeader className="p-4 sm:p-6 pb-2">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-primary-300">
              ویرایش تبلیغ
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-100px)] scrollbar-custom">
            <div className="p-4 sm:p-6 pt-2">
              <AdvertisementForm form={form} onSubmit={onSubmit} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdvertisementForm({ form, onSubmit }: AdvertisementFormProps) {
  const handleImageUpload = (urls: string[]) => {
    form.setValue('imageUrl', urls[0]);
  };

  const handleImageRemove = () => {
    form.setValue('imageUrl', '');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  عنوان
                </FormLabel>
                <FormControl>
                  <Input placeholder="عنوان تبلیغ" {...field} className="text-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  اندازه تبلیغ
                </FormLabel>
                <Select dir="rtl" onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="انتخاب اندازه تبلیغ" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="SMALL">کوچک</SelectItem>
                    <SelectItem value="MEDIUM">متوسط</SelectItem>
                    <SelectItem value="LARGE">بزرگ</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                توضیحات
              </FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  value={field.value || ''}
                  placeholder="توضیحات تبلیغ"
                  className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="linkUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                لینک
              </FormLabel>
              <FormControl>
                <Input placeholder="لینک تبلیغ" {...field} className="text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                تصویر تبلیغ
              </FormLabel>
              <FormControl>
                <ImageUploader
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  initialPreviews={field.value ? [field.value] : []}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  تاریخ شروع
                </FormLabel>
                <FormControl>
                  <PersianDatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  تاریخ پایان
                </FormLabel>
                <FormControl>
                  <PersianDatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <SubmitButton isSubmitting={form.formState.isSubmitting} />
      </form>
    </Form>
  );
}
