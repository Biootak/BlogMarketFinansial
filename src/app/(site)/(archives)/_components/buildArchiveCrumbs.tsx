/**
 * buildArchiveCrumbs — سازنده‌ی crumbs برای ArchiveBreadcrumb
 * ----------------------------------------------------------------------------
 * این تابع server-safe است (هیچ side-effect یا hook ندارد) و در
 * Server Component (page.tsx) صدا زده می‌شود. سپس نتیجه به Client
 * Component (ArchiveBreadcrumb) پاس داده می‌شود.
 */

import { Home } from 'lucide-react';
import {
  HiOutlineDocumentText,
  HiOutlineRectangleStack,
  HiOutlineTag,
  HiSparkles,
} from 'react-icons/hi2';
import type { Crumb } from './ArchiveBreadcrumb';

type BuildArgs = {
  type?: string;
  selectedCategory?: { slug: string; name: string } | null;
  selectedSubcategory?: { slug: string; name: string } | null;
  selectedTag?: { slug: string; name: string } | null;
  total?: number;
};

type BuildResult = {
  crumbs: Crumb[];
  badge?: { label: string; icon?: React.ReactNode };
};

export function buildArchiveCrumbs({
  type,
  selectedCategory,
  selectedSubcategory,
  selectedTag,
  total,
}: BuildArgs): BuildResult {
  const crumbs: Crumb[] = [
    {
      href: '/',
      label: 'خانه',
      icon: Home,
      accent: 'slate',
    },
    {
      href: '/archive',
      label: 'آرشیو',
      icon: HiOutlineDocumentText,
      accent: 'brand',
    },
  ];

  if (type === 'category' && selectedCategory) {
    crumbs.push({
      href: '/archive/category',
      label: 'دسته‌بندی',
      icon: HiOutlineRectangleStack,
      accent: 'slate',
    });
    crumbs.push({
      href: `/archive/category/${selectedCategory.slug}`,
      label: selectedCategory.name,
      icon: HiOutlineRectangleStack,
      accent: 'violet',
    });
    if (selectedSubcategory) {
      crumbs.push({
        href: `/archive/category/${selectedCategory.slug}/${selectedSubcategory.slug}`,
        label: selectedSubcategory.name,
        icon: HiSparkles,
        accent: 'violet',
        current: true,
      });
    } else {
      crumbs[crumbs.length - 1]!.current = true;
    }
  } else if (type === 'tag' && selectedTag) {
    crumbs.push({
      href: '/archive/tag',
      label: 'برچسب',
      icon: HiOutlineTag,
      accent: 'slate',
    });
    crumbs.push({
      href: `/archive/tag/${selectedTag.slug}`,
      label: `#${selectedTag.name}`,
      icon: HiOutlineTag,
      accent: 'emerald',
      current: true,
    });
  } else {
    crumbs[crumbs.length - 1]!.current = true;
  }

  const badge =
    typeof total === 'number'
      ? {
          label: total.toLocaleString('fa-IR'),
          icon: <HiOutlineDocumentText className="w-3 h-3" aria-hidden />,
        }
      : undefined;

  return { crumbs, badge };
}
