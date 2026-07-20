'use client';

import { type FormEvent, type ReactNode, useCallback, useRef, useState } from 'react';

export interface SearchFieldProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  leadingIcon?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  inputId?: string;
  debounceMs?: number;
}

/**
 * SearchField — ورودی جستجو با debounce اختیاری.
 * - کنترل کامل توسط parent (value/onChange/onSubmit)
 * - اگر debounceMs > 0 و onSubmit داده شده، onSubmit بعد از debounce فراخوانی می‌شود
 */
export default function SearchField({
  value,
  onChange,
  onSubmit,
  placeholder = 'جستجو…',
  ariaLabel = 'جستجو',
  leadingIcon,
  trailing,
  className = '',
  inputId = 'ds-search-field',
  debounceMs = 0,
}: SearchFieldProps) {
  const [internal, setInternal] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (next: string) => {
      setInternal(next);
      onChange(next);
      if (debounceMs > 0 && onSubmit) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => onSubmit(next), debounceMs);
      }
    },
    [debounceMs, onChange, onSubmit],
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onSubmit?.(internal);
    },
    [internal, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className={`ds-search-field ${className}`.trim()} role="search">
      {leadingIcon ? <span className="ds-search-field__icon">{leadingIcon}</span> : null}
      <input
        id={inputId}
        type="search"
        value={internal}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
        className="ds-search-field__input"
      />
      {trailing ? <span className="ds-search-field__trailing">{trailing}</span> : null}
    </form>
  );
}
