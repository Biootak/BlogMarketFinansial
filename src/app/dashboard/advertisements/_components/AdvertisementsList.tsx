'use client';

import { updateAdvertisement } from '@/actions/advertisementActions';
import LoadingMore from '@/components/LoadingMore';
import { CustomSwitch } from '@/components/ui/CustomSwitch';
import { useToast } from '@/components/ui/use-toast';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { Advertisement } from '@/types/types';
import Image from 'next/image';
import { useCallback } from 'react';
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2';
import { positionLabels, sizeLabels } from './AdvertisementForm';

interface AdvertisementsListProps {
  ads: Advertisement[];
  isLoading: boolean;
  page: number;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onEdit: (ad: Advertisement) => void;
  onDelete: (ad: Advertisement) => void;
}

/**
 * AdvertisementsList — desktop table + mobile cards + infinite scroll.
 */
export function AdvertisementsList({
  ads,
  isLoading,
  page,
  hasNextPage,
  onLoadMore,
  onEdit,
  onDelete,
}: AdvertisementsListProps) {
  const infiniteScrollRef = useInfiniteScroll(onLoadMore, hasNextPage, isLoading);

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800">
              <th className="px-6 py-4 text-start text-xs font-bold text-neutral-500 uppercase tracking-wider">
                محتوا
              </th>
              <th className="px-6 py-4 text-start text-xs font-bold text-neutral-500 uppercase tracking-wider">
                مشخصات فنی
              </th>
              <th className="px-6 py-4 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider">
                وضعیت
              </th>
              <th className="px-6 py-4 text-end text-xs font-bold text-neutral-500 uppercase tracking-wider">
                عملیات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {ads.map((ad) => (
              <AdRowDesktop key={ad.id} ad={ad} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {ads.map((ad) => (
          <AdCardMobile key={ad.id} ad={ad} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>

      {isLoading && page > 1 && <LoadingMore message="در حال دریافت تبلیغات بیشتر…" />}
      <div ref={infiniteScrollRef} className="h-4" />
    </div>
  );
}

/* ── Desktop row ─────────────────────────────────────────── */

function AdRowDesktop({
  ad,
  onEdit,
  onDelete,
}: {
  ad: Advertisement;
  onEdit: (ad: Advertisement) => void;
  onDelete: (ad: Advertisement) => void;
}) {
  const { toast } = useToast();

  const handleToggle = useCallback(
    async (checked: boolean) => {
      try {
        const res = await updateAdvertisement(ad.id, { isActive: checked });
        if (!res.success) throw new Error(res.message);
        toast({ title: 'موفقیت', description: 'وضعیت تغییر کرد', variant: 'success' });
      } catch (_e) {
        toast({ title: 'خطا', description: 'خطا در بروزرسانی', variant: 'destructive' });
      }
    },
    [ad.id, toast],
  );

  return (
    <tr className="group hover:bg-primary-500/[0.02] transition-colors anim-fade-in-up">
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800">
            <Image
              src={ad.imageUrl}
              alt={ad.title}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate max-w-[200px]">{ad.title}</div>
            <div className="text-[10px] text-neutral-500 truncate max-w-[200px] mt-0.5">
              {ad.linkUrl}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1.5">
          <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
            {sizeLabels[ad.size]}
          </span>
          <span className="px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-900/20 text-[10px] font-bold text-primary-600 dark:text-primary-400">
            {positionLabels[ad.position]}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex justify-center">
          <CustomSwitch checked={ad.isActive} onCheckedChange={handleToggle} />
        </div>
      </td>
      <td className="px-6 py-4 text-end">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(ad)}
            className="size-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-primary-500 transition-all"
          >
            <HiOutlinePencil className="size-4" />
          </button>
          <button
            onClick={() => onDelete(ad)}
            className="size-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
          >
            <HiOutlineTrash className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Mobile card ─────────────────────────────────────────── */

function AdCardMobile({
  ad,
  onEdit,
  onDelete,
}: {
  ad: Advertisement;
  onEdit: (ad: Advertisement) => void;
  onDelete: (ad: Advertisement) => void;
}) {
  const { toast } = useToast();

  const handleToggle = useCallback(
    async (checked: boolean) => {
      try {
        const res = await updateAdvertisement(ad.id, { isActive: checked });
        if (!res.success) throw new Error(res.message);
        toast({ title: 'موفقیت', description: 'وضعیت تغییر کرد', variant: 'success' });
      } catch (_e) {
        toast({ title: 'خطا', description: 'خطا در بروزرسانی', variant: 'destructive' });
      }
    },
    [ad.id, toast],
  );

  return (
    <div className="dash-panel p-4 space-y-4">
      <div className="flex gap-4">
        <div className="relative h-20 w-32 rounded-xl overflow-hidden ring-1 ring-neutral-200">
          <Image src={ad.imageUrl} alt={ad.title} fill className="object-cover" />
        </div>
        <div className="flex-1 min-w-0 py-1">
          <div className="font-bold text-sm truncate">{ad.title}</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="px-2 py-0.5 rounded bg-neutral-100 text-[10px] font-bold">
              {sizeLabels[ad.size]}
            </span>
            <span className="px-2 py-0.5 rounded bg-primary-50 text-[10px] font-bold text-primary-600">
              {positionLabels[ad.position]}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <CustomSwitch checked={ad.isActive} onCheckedChange={handleToggle} />
          <span className="text-[10px] font-bold text-neutral-500">
            {ad.isActive ? 'فعال' : 'غیرفعال'}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(ad)}
            className="size-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center"
          >
            <HiOutlinePencil className="size-4" />
          </button>
          <button
            onClick={() => onDelete(ad)}
            className="size-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center"
          >
            <HiOutlineTrash className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}