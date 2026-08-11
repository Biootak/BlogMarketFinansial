import { StatCard, StatGrid } from '@/components/Dashboard/primitives';
import { FolderTree, Layers } from 'lucide-react';

interface CategoriesStatsProps {
  totalCount: number;
  parentCount: number;
}

/**
 * CategoriesStats — نوار آماری بالای صفحه دسته‌بندی‌ها.
 *
 * - StatGrid canonical با ۳ کارت: کل، والد، فرزند
 * - در موبایل ۲ ستون، دسکتاپ ۳ ستون
 */
export function CategoriesStats({ totalCount, parentCount }: CategoriesStatsProps) {
  const childCount = totalCount - parentCount;

  return (
    <StatGrid cols={3}>
      <StatCard
        label="کل دسته‌بندی‌ها"
        value={totalCount}
        icon={Layers}
        format="persian"
      />
      <StatCard
        label="دسته‌بندی والد"
        value={parentCount}
        icon={FolderTree}
        format="persian"
      />
      <StatCard
        label="دسته‌بندی فرزند"
        value={childCount}
        icon="folder"
        format="persian"
      />
    </StatGrid>
  );
}