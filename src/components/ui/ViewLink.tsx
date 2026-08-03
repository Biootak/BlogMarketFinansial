'use client';

/**
 * ViewLink — `<Link>` با View Transitions API
 * ----------------------------------------------------------------------------
 * رفتار:
 *   - اگر مرورگر startViewTransition را پشتیبانی کند، navigation با
 *     transition CSS اجرا می‌شود (cross-fade + slide در RTL).
 *   - در غیر این صورت، navigation معمولی Next.js (بدون transition).
 *   - کلیدهای modifier (Ctrl/Cmd/Shift/Alt/Middle-click) → اجازهٔ باز شدن در
 *     تب جدید بدون transition.
 *   - prefers-reduced-motion → transition غیرفعال می‌شود.
 *
 * ساختار:
 *   1. onClick به‌جای Next.js Link: ابتدا transition شروع، سپس router.push.
 *   2. <Link> با preventDefault پیش‌فرض Next.js در onClick.
 *   3. href همچنان به‌عنوان fallback برای SEO/right-click وجود دارد.
 *
 * استفاده:
 *   <ViewLink href="/customer/security">مرکز امنیت</ViewLink>
 *
 * CSS متناظر در `app/globals.css` تحت selector های ::view-transition-*.
 */

import { useViewTransition } from '@/hooks/useViewTransition';
import Link from 'next/link';
import type { ComponentProps, MouseEvent } from 'react';

type LinkProps = ComponentProps<typeof Link>;

export interface ViewLinkProps extends LinkProps {
  /**
   * اگر false باشد، navigation معمولی Next.js بدون transition.
   * پیش‌فرض: true.
   */
  withTransition?: boolean;
}

export function ViewLink({
  href,
  onClick,
  withTransition = true,
  children,
  ...rest
}: ViewLinkProps) {
  const navigate = useViewTransition();
  const target = typeof href === 'string' ? href : ((href as { pathname?: string }).pathname ?? '');

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // اول onClick اصلی consumer را صدا بزن
    onClick?.(e);
    if (e.defaultPrevented) return;

    // modifier keys → browser handles (new tab, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }

    // اگر href بیرونی است (http/https/mailto) → بدون transition
    if (typeof target === 'string' && /^(https?:|mailto:|tel:)/.test(target)) {
      return;
    }

    if (!withTransition || typeof target !== 'string' || target.length === 0) {
      return;
    }

    e.preventDefault();
    navigate(target);
  };

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
