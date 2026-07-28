'use client';

/**
 * SearchInput — فیلد جستجوی shared برای همه toolbar/filterbar های داشبورد.
 *
 * Controlled component — هیچ router/navigation ندارد.
 * RTL-safe: آیکون در سمت inline-end (چپ در RTL)، padding منطقی.
 * اختیاری: onClear برای دکمه × — اگر پاس نشود، دکمه نمایش داده نمی‌شود.
 */

import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import { useRef } from 'react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  /** aria-label برای accessibility — پیش‌فرض: «جست‌وجو» */
  ariaLabel?: string;
}

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'جست‌وجو...',
  className,
  ariaLabel = 'جست‌وجو',
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        'relative flex h-8 items-center overflow-hidden rounded-[var(--at-radius)] border border-[var(--at-line)] bg-[var(--at-bg-elevated)] transition-[border-color,box-shadow] focus-within:border-[var(--at-accent)] focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--at-accent)_18%,transparent)]',
        className,
      )}
    >
      {/* آیکون — inline-end (چپ در RTL) */}
      <span className="pointer-events-none flex shrink-0 items-center px-2 text-[var(--at-fg-subtle)]">
        <Search size={13} strokeWidth={1.75} aria-hidden />
      </span>

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
        className="h-full min-w-0 flex-1 bg-transparent pe-2 font-[inherit] text-[12px] text-[var(--at-fg)] outline-none placeholder:text-[var(--at-fg-subtle)] [&::-webkit-search-cancel-button]:hidden"
      />

      {/* دکمه × — فقط وقتی value پر است */}
      {value && (
        <button
          type="button"
          aria-label="پاک کردن جستجو"
          onClick={handleClear}
          className="flex shrink-0 items-center px-2 text-[var(--at-fg-subtle)] hover:text-[var(--at-fg)]"
        >
          <X size={12} strokeWidth={2} aria-hidden />
        </button>
      )}
    </div>
  );
}
