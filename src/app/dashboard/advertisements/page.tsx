'use client';

import {
  createAdvertisement,
  deleteAdvertisement,
  getAllAdvertisements,
  updateAdvertisement,
} from '@/actions/advertisementActions';
import { getAllHeaderAds } from '@/actions/headerAdActions';
import HeaderAdsClient, { type HeaderAdData } from '@/app/dashboard/header-ad/HeaderAdsClient';
import { ConfirmDialog, PageHeader } from '@/components/Dashboard/primitives';
import { AdvertisementsSkeleton } from '@/components/Skeletons';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import type { Advertisement, CustomAdDimensions } from '@/types/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { HiMagnifyingGlass, HiOutlineMegaphone, HiOutlinePlus } from 'react-icons/hi2';
import {
  AdvertisementForm,
  type AdvertisementFormData,
  advertisementSchema,
} from './_components/AdvertisementForm';
import { AdvertisementsList } from './_components/AdvertisementsList';
import { AdvertisementsStats } from './_components/AdvertisementsStats';

function AdvertisementsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'advertisements' | 'header'>(
    searchParams.get('tab') === 'header' ? 'header' : 'advertisements',
  );

  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  const [headerAds, setHeaderAds] = useState<HeaderAdData[]>([]);
  const [isHeaderAdsLoading, setIsHeaderAdsLoading] = useState(false);

  const form = useForm<AdvertisementFormData>({
    resolver: zodResolver(advertisementSchema),
    defaultValues: {
      size: 'MEDIUM',
      position: 'IN_CONTENT',
      isActive: true,
      order: 1,
      customDimensions: {},
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    setAds([]);
    fetchAds(1, debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  const fetchHeaderAds = useCallback(async () => {
    setIsHeaderAdsLoading(true);
    try {
      const result = await getAllHeaderAds();
      if (result.success && result.data) {
        setHeaderAds(result.data as HeaderAdData[]);
      } else {
        toast({ title: 'خطا', description: result.message, variant: 'destructive' });
      }
    } catch (_error) {
      toast({ title: 'خطا', description: 'ارتباط با سرور برقرار نشد', variant: 'destructive' });
    } finally {
      setIsHeaderAdsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'header') {
      fetchHeaderAds();
    }
  }, [activeTab, fetchHeaderAds]);

  const handleTabChange = (value: string) => {
    const next = value as 'advertisements' | 'header';
    setActiveTab(next);
    router.replace(`/dashboard/advertisements?tab=${next}`, { scroll: false });
  };

  const fetchAds = useCallback(
    async (pageNumber: number, search: string) => {
      setIsLoading(true);
      try {
        const result = await getAllAdvertisements({ limit: 10, page: pageNumber, search });
        if (result.success && result.data) {
          const { ads: newAds, totalCount } = result.data;
          if (pageNumber === 1) {
            setAds(newAds);
          } else {
            setAds((prev) => [...prev, ...newAds]);
          }
          setHasNextPage(pageNumber * 10 < totalCount);
        } else {
          toast({ title: 'خطا', description: result.message, variant: 'destructive' });
        }
      } catch (_error) {
        toast({
          title: 'خطا',
          description: 'دریافت اطلاعات با خطا مواجه شد',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isLoading) {
      setPage((prev) => prev + 1);
      fetchAds(page + 1, debouncedSearchTerm);
    }
  }, [fetchAds, hasNextPage, isLoading, page, debouncedSearchTerm]);

  const onSubmit = async (data: AdvertisementFormData) => {
    try {
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
        setIsDialogOpen(false);
        toast({ title: 'موفقیت', description: result.message, variant: 'success' });
      } else {
        toast({ title: 'خطا', description: result.message, variant: 'destructive' });
      }
    } catch (_error) {
      toast({ title: 'خطا', description: 'عملیات با خطا مواجه شد', variant: 'destructive' });
    }
  };

  const handleEdit = (ad: Advertisement) => {
    setEditingAd(ad);
    setIsDialogOpen(true);

    const validateCustomDimensions = (dimensions: unknown): CustomAdDimensions | undefined => {
      if (typeof dimensions === 'object' && dimensions !== null) {
        const d = dimensions as Record<string, unknown>;
        const fit = d.imageFit;
        return {
          width:
            typeof d.width === 'number'
              ? String(d.width)
              : typeof d.width === 'string'
                ? d.width
                : undefined,
          height:
            typeof d.height === 'number'
              ? String(d.height)
              : typeof d.height === 'string'
                ? d.height
                : undefined,
          aspectRatio: typeof d.aspectRatio === 'string' ? d.aspectRatio : undefined,
          imageFit:
            fit === 'ambient' || fit === 'cover' || fit === 'contain'
              ? (fit as CustomAdDimensions['imageFit'])
              : undefined,
        };
      }
      return undefined;
    };

    form.reset({
      title: ad.title,
      description: ad.description ?? undefined,
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl,
      startDate: new Date(ad.startDate),
      endDate: new Date(ad.endDate),
      isActive: ad.isActive,
      size: ad.size,
      position: ad.position,
      customPosition: ad.customPosition ?? undefined,
      order: Number(ad.order),
      customDimensions: validateCustomDimensions(ad.customDimensions ?? undefined),
    });
  };

  const openDelete = useCallback((ad: Advertisement) => {
    setDeleteTarget({ id: ad.id, title: ad.title });
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      try {
        const result = await deleteAdvertisement(deleteTarget.id);
        setDeleteTarget(null);
        if (result.success) {
          fetchAds(1, debouncedSearchTerm);
          toast({ title: 'موفقیت', description: result.message, variant: 'success' });
        } else {
          toast({ title: 'خطا', description: result.message, variant: 'destructive' });
        }
      } catch (_error) {
        toast({ title: 'خطا', description: 'حذف تبلیغ با خطا مواجه شد', variant: 'destructive' });
      }
    });
  }, [deleteTarget, fetchAds, debouncedSearchTerm, toast]);

  const openNewAdDialog = () => {
    setEditingAd(null);
    form.reset({
      size: 'MEDIUM',
      position: 'IN_CONTENT',
      isActive: true,
      order: 1,
      customDimensions: {},
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="route-frame dash-scope" dir="rtl">
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'تبلیغات' }]}
        eyebrow="محتوا"
        title={activeTab === 'header' ? 'تبلیغ بالای هدر' : 'مدیریت تبلیغات'}
        description={
          activeTab === 'header'
            ? 'نوار باریک تبلیغ که در بالای سایت نمایش داده می‌شود. فقط یک تبلیغ فعال در لحظه.'
            : 'مشاهده و مدیریت تبلیغات سایت'
        }
        actions={
          activeTab === 'advertisements' ? (
            <>
              <div className="at-filterbar__search" style={{ minWidth: '240px' }}>
                <input
                  type="text"
                  placeholder="جستجوی تبلیغ…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <HiMagnifyingGlass className="at-filterbar__search__ico size-4" />
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    onClick={openNewAdDialog}
                    className="at-btn at-btn--primary"
                  >
                    <HiOutlinePlus className="size-4" />
                    <span>افزودن تبلیغ</span>
                  </button>
                </DialogTrigger>
                <DialogContent
                  className="at-dialog-content max-h-[90vh] w-full max-w-5xl p-0 overflow-hidden"
                  dir="rtl"
                >
                  <div className="at-dialog-header">
                    <div className="at-dialog-title">
                      <span className="at-dialog-title__ico">
                        <HiOutlineMegaphone className="size-4" />
                      </span>
                      <div>
                        <div>{editingAd ? 'ویرایش تبلیغ' : 'افزودن تبلیغ جدید'}</div>
                        <div className="at-dialog-sub">محتوا، جایگاه و زمان‌بندی نمایش</div>
                      </div>
                    </div>
                  </div>
                  <div className="at-dialog-body" style={{ padding: '20px 22px' }}>
                    <AdvertisementForm form={form} onSubmit={onSubmit} />
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : null
        }
      />

      {/* Tabs — atelier */}
      <nav className="at-form-tabs" role="tablist" style={{ marginBottom: '18px' }}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'advertisements'}
          onClick={() => handleTabChange('advertisements')}
          className={`at-form-tab ${activeTab === 'advertisements' ? 'is-active' : ''}`}
        >
          تبلیغات
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'header'}
          onClick={() => handleTabChange('header')}
          className={`at-form-tab ${activeTab === 'header' ? 'is-active' : ''}`}
        >
          تبلیغ هدر
        </button>
      </nav>

      {activeTab === 'advertisements' && (
        <>
          <AdvertisementsStats ads={ads} />

          {isLoading && page === 1 ? (
            <AdvertisementsSkeleton />
          ) : ads.length === 0 ? (
            <div className="dash-panel p-20 flex flex-col items-center justify-center text-center">
              <div className="dash-ico dash-ico--indigo size-16 mb-6">
                <HiOutlineMegaphone className="size-8" />
              </div>
              <h3 className="text-lg font-bold mb-2">تبلیغی یافت نشد</h3>
              <p className="text-neutral-500 max-w-xs">
                هنوز هیچ تبلیغی در سیستم ثبت نشده است. برای شروع اولین تبلیغ را بسازید.
              </p>
            </div>
          ) : (
            <AdvertisementsList
              ads={ads}
              isLoading={isLoading}
              page={page}
              hasNextPage={hasNextPage}
              onLoadMore={loadMore}
              onEdit={handleEdit}
              onDelete={openDelete}
            />
          )}
        </>
      )}

      {activeTab === 'header' &&
        (isHeaderAdsLoading ? (
          <AdvertisementsSkeleton />
        ) : (
          <HeaderAdsClient initialAds={headerAds} onRefresh={fetchHeaderAds} />
        ))}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="حذف تبلیغ"
        description={`آیا مطمئن هستید که می‌خواهید تبلیغ «${deleteTarget?.title}» را حذف کنید؟ این عملیات برگشت‌پذیر نیست.`}
        confirmLabel="بله، حذف کن"
        cancelLabel="انصراف"
        variant="danger"
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  );
}

export default function AdvertisementsPage() {
  return (
    <Suspense fallback={null}>
      <AdvertisementsInner />
    </Suspense>
  );
}
