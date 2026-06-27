/**
 * buildArchiveCrumbs — سازنده‌ی crumbs برای ArchiveBreadcrumb
 * ----------------------------------------------------------------------------
 * این تابع server-safe است (هیچ side-effect یا hook ندارد) و در
 * Server Component (page.tsx) صدا زده می‌شود. سپس نتیجه به Client
 * Component (ArchiveBreadcrumb) پاس داده می‌شود.
 */

import { FileText, Home, Layers, Sparkles, Tag } from 'lucide-react';
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
      icon: FileText,
      accent: 'brand',
    },
  ];

  if (type === 'category' && selectedCategory) {
    crumbs.push({
      href: '/archive/category',
      label: 'دسته‌بندی',
      icon: Layers,
      accent: 'slate',
    });
    crumbs.push({
      href: `/archive/category/${selectedCategory.slug}`,
      label: selectedCategory.name,
      icon: Layers,
      accent: 'violet',
    });
    if (selectedSubcategory) {
      crumbs.push({
        href: `/archive/category/${selectedCategory.slug}/${selectedSubcategory.slug}`,
        label: selectedSubcategory.name,
        icon: Sparkles,
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
      icon: Tag,
      accent: 'slate',
    });
    crumbs.push({
      href: `/archive/tag/${selectedTag.slug}`,
      label: `#${selectedTag.name}`,
      icon: Tag,
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
          icon: <FileText className="w-3 h-3" strokeWidth={1.5} aria-hidden />,
        }
      : undefined;

  return { crumbs, badge };
}
