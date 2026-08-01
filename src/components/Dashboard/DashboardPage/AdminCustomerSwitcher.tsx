'use client';

/**
 * AdminCustomerSwitcher — 2026 Million-Dollar Context Bar
 *
 * وقتی ادمین پلتفرم (OWNER/SUPERADMIN/ADMIN) وارد customer portal می‌شود،
 * این نوار بالای صفحه نمایش داده می‌شود و به او اجازه می‌دهد:
 *  - ببیند الان در نقش کدام مشتری عمل می‌کند (impersonation)
 *  - مشتری دیگری را با جستجو انتخاب کند
 *  - یا به حالت پیش‌فرض (اولین مشتری فعال) برگردد
 *
 * طراحی: Linear × Stripe Support — یک ribbon افقی با glass effect و رنگ domain
 *   که به وضوح از header اصلی متمایز است.
 *
 * نکات امنیتی:
 *  - فقط رنگ ادمینی که cookie ادمین دارد می‌تواند تغییر دهد
 *  - cookie httpOnly + sameSite=lax + 8 ساعت
 *  - در هر تغییر، router.refresh() تا server re-render شود
 */

import {
  clearAdminCustomerContext,
  listCustomersForAdmin,
  setAdminCustomerContext,
} from '@/lib/customer-auth';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowsRightLeft,
  HiOutlineCheck,
  HiOutlineMagnifyingGlass,
  HiOutlineShieldCheck,
  HiOutlineUserCircle,
  HiOutlineXMark,
} from 'react-icons/hi2';
import s from './AdminCustomerSwitcher.module.css';

type CustomerRow = {
  id: string;
  fullName: string;
  phone: string;
  exchangeName: string;
  city: string | null;
};

interface Props {
  currentCustomerId: string;
  currentCustomerName: string;
  currentExchangeName: string;
  isImpersonating: boolean; // آیا ادمین یک مشتری خاص را explicitly انتخاب کرده؟
}

export function AdminCustomerSwitcher({
  currentCustomerId,
  currentCustomerName,
  currentExchangeName,
  isImpersonating,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(t);
    }
    return;
  }, [open]);

  // Load customers (debounced search)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const t = window.setTimeout(async () => {
      const rows = await listCustomersForAdmin(search);
      if (!cancelled) {
        setItems(rows);
        setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [search, open]);

  const handleSelect = useCallback(
    (id: string) => {
      if (id === currentCustomerId) {
        setOpen(false);
        return;
      }
      startTransition(async () => {
        const res = await setAdminCustomerContext(id);
        if (res.success) {
          setOpen(false);
          setSearch('');
          router.refresh();
        } else {
          setError(res.error);
        }
      });
    },
    [currentCustomerId, router],
  );

  const handleClear = useCallback(() => {
    startTransition(async () => {
      await clearAdminCustomerContext();
      setOpen(false);
      router.refresh();
    });
  }, [router]);

  return (
    <div
      className={s.shell}
      data-impersonating={isImpersonating ? 'true' : 'false'}
      role="region"
      aria-label="انتخاب مشتری برای پشتیبانی"
    >
      <div className={s.inner}>
        {/* Impersonation badge */}
        <div className={s.badge} aria-hidden>
          <HiOutlineShieldCheck className={s.badgeIcon} />
          <span className={s.badgeText}>حالت پشتیبانی</span>
        </div>

        {/* Current target */}
        <div className={s.target}>
          <span className={s.targetLabel}>مشتری فعلی:</span>
          <span className={s.targetName}>{currentCustomerName}</span>
          <span className={s.targetDivider} aria-hidden>
            ·
          </span>
          <span className={s.targetExchange}>{currentExchangeName}</span>
          {isImpersonating && (
            <span className={s.targetFlag} title="ادمین یک مشتری خاص را explicit انتخاب کرده">
              انتخاب دستی
            </span>
          )}
        </div>

        {/* Switch trigger */}
        <div className={s.actions}>
          <button
            type="button"
            className={s.switchBtn}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <HiOutlineArrowsRightLeft className={s.switchIcon} />
            <span>تغییر مشتری</span>
          </button>
          {isImpersonating && (
            <button
              type="button"
              className={s.clearBtn}
              onClick={handleClear}
              disabled={isPending}
              aria-label="بازگشت به مشتری پیش‌فرض"
            >
              <HiOutlineXMark className="w-3.5 h-3.5" />
              <span>پیش‌فرض</span>
            </button>
          )}
        </div>
      </div>

      {/* Popover */}
      {open && (
        <div ref={popoverRef} className={s.popover} role="dialog" aria-label="انتخاب مشتری">
          <div className={s.popoverHead}>
            <HiOutlineAdjustmentsHorizontal className="w-4 h-4 opacity-70" />
            <span className={s.popoverTitle}>انتخاب مشتری برای پشتیبانی</span>
            <button
              type="button"
              className={s.popoverClose}
              onClick={() => setOpen(false)}
              aria-label="بستن"
            >
              <HiOutlineXMark className="w-4 h-4" />
            </button>
          </div>

          <div className={s.popoverSearch}>
            <HiOutlineMagnifyingGlass className="w-4 h-4 opacity-60" />
            <input
              ref={inputRef}
              type="search"
              inputMode="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="نام، تلفن یا صرافی…"
              className={s.popoverInput}
              aria-label="جستجوی مشتری"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className={s.popoverInputClear}
                aria-label="پاک کردن جستجو"
              >
                <HiOutlineXMark className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {error && (
            <div className={s.popoverError} role="alert">
              {error}
            </div>
          )}

          <ul className={s.popoverList} aria-busy={loading || undefined}>
            {loading && items.length === 0 ? (
              <li className={s.popoverEmpty}>
                <span>در حال جستجو…</span>
              </li>
            ) : items.length === 0 ? (
              <li className={s.popoverEmpty}>
                <span>مشتری‌ای یافت نشد</span>
              </li>
            ) : (
              items.map((c) => {
                const isCurrent = c.id === currentCustomerId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(c.id)}
                      className={cn(s.popoverItem, isCurrent && s.popoverItemCurrent)}
                      disabled={isPending}
                    >
                      <span className={s.popoverAvatar} aria-hidden>
                        <HiOutlineUserCircle className="w-4 h-4" />
                      </span>
                      <span className={s.popoverItemMain}>
                        <span className={s.popoverItemName}>{c.fullName}</span>
                        <span className={s.popoverItemMeta}>
                          <span dir="ltr">{c.phone}</span>
                          {c.city && <span>· {c.city}</span>}
                          <span>· {c.exchangeName}</span>
                        </span>
                      </span>
                      {isCurrent && (
                        <span className={s.popoverItemCheck} aria-label="مشتری فعلی">
                          <HiOutlineCheck className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className={s.popoverFoot}>
            <span>تغییرات فقط برای همین نشست است (۸ ساعت)</span>
          </div>
        </div>
      )}
    </div>
  );
}
