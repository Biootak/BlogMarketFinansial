'use client';

import { DensityToggle, useTableDensity } from '@/components/Dashboard/primitives';
import LoadingMore from '@/components/LoadingMore';
import { Switch } from '@/components/ui/switch';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { Advertisement } from '@/types/types';
import { Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { positionLabels, sizeLabels } from './AdvertisementForm';
import s from './AdvertisementsList.module.css';

interface AdvertisementsListProps {
  ads: Advertisement[];
  isLoading: boolean;
  page: number;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onEdit: (ad: Advertisement) => void;
  onDelete: (ad: Advertisement) => void;
  onToggle: (id: string, checked: boolean) => void;
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
  onToggle,
}: AdvertisementsListProps) {
  const infiniteScrollRef = useInfiniteScroll(onLoadMore, hasNextPage, isLoading);
  const { density } = useTableDensity();

  return (
    <div className={s.listWrapper}>
      {/* Desktop Table View */}
      <div className={s.desktopTable}>
        <div className="dash2-table__densitybar">
          <DensityToggle />
        </div>
        <table className={s.table} data-density={density}>
          <thead>
            <tr className={s.tableHeadRow}>
              <th className={s.tableHeadCell}>محتوا</th>
              <th className={s.tableHeadCell}>مشخصات فنی</th>
              <th className={s.tableHeadCellCenter}>وضعیت</th>
              <th className={s.tableHeadCellEnd}>عملیات</th>
            </tr>
          </thead>
          <tbody className={s.tableBody}>
            {ads.map((ad) => (
              <AdRowDesktop
                key={ad.id}
                ad={ad}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggle={onToggle}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className={s.mobileGrid}>
        {ads.map((ad) => (
          <AdCardMobile
            key={ad.id}
            ad={ad}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
          />
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
  onToggle,
}: {
  ad: Advertisement;
  onEdit: (ad: Advertisement) => void;
  onDelete: (ad: Advertisement) => void;
  onToggle: (id: string, checked: boolean) => void;
}) {
  return (
    <tr className={s.tableRow}>
      <td className={s.tableCell}>
        <div className={s.adContent}>
          <div className={s.adImageWrap}>
            <Image src={ad.imageUrl} alt={ad.title} fill className={s.adImage} />
          </div>
          <div className={s.adInfo}>
            <div className={s.adTitle}>{ad.title}</div>
            <div className={s.adLink}>{ad.linkUrl}</div>
          </div>
        </div>
      </td>
      <td className={s.tableCell}>
        <div className={s.badgeGroup}>
          <span className={s.badgeNeutral}>{sizeLabels[ad.size]}</span>
          <span className={s.badgeBrand}>{positionLabels[ad.position]}</span>
        </div>
      </td>
      <td className={s.tableCellCenter}>
        <div className="flex justify-center">
          <Switch
            checked={ad.isActive}
            onCheckedChange={(checked) => onToggle(ad.id, checked)}
            aria-label={ad.isActive ? 'غیرفعال کردن تبلیغ' : 'فعال کردن تبلیغ'}
          />
        </div>
      </td>
      <td className={s.tableCellEnd}>
        <div className={s.actionGroup}>
          <button
            type="button"
            onClick={() => onEdit(ad)}
            className={s.actionBtn}
            aria-label="ویرایش"
          >
            <Pencil size={14} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onDelete(ad)}
            className={`${s.actionBtn} ${s.actionBtnDanger}`}
            aria-label="حذف"
          >
            <Trash2 size={14} aria-hidden />
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
  onToggle,
}: {
  ad: Advertisement;
  onEdit: (ad: Advertisement) => void;
  onDelete: (ad: Advertisement) => void;
  onToggle: (id: string, checked: boolean) => void;
}) {
  return (
    <div className={s.mobileCard}>
      <div className={s.mobileCardTop}>
        <div className={s.mobileImageWrap}>
          <Image src={ad.imageUrl} alt={ad.title} fill className={s.mobileImage} />
        </div>
        <div className={s.mobileCardInfo}>
          <div className={s.mobileCardTitle}>{ad.title}</div>
          <div className={s.badgeGroup}>
            <span className={s.badgeNeutral}>{sizeLabels[ad.size]}</span>
            <span className={s.badgeBrand}>{positionLabels[ad.position]}</span>
          </div>
        </div>
      </div>
      <div className={s.mobileCardFooter}>
        <div className={s.mobileStatus}>
          <Switch
            checked={ad.isActive}
            onCheckedChange={(checked) => onToggle(ad.id, checked)}
            aria-label={ad.isActive ? 'غیرفعال کردن تبلیغ' : 'فعال کردن تبلیغ'}
          />
          <span className={s.statusText}>{ad.isActive ? 'فعال' : 'غیرفعال'}</span>
        </div>
        <div className={s.actionGroup}>
          <button
            type="button"
            onClick={() => onEdit(ad)}
            className={s.actionBtn}
            aria-label="ویرایش"
          >
            <Pencil size={14} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onDelete(ad)}
            className={`${s.actionBtn} ${s.actionBtnDanger}`}
            aria-label="حذف"
          >
            <Trash2 size={14} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
