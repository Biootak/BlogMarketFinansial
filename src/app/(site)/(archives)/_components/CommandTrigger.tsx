'use client';

/**
 * CommandTrigger — دکمه‌ی trigger برای CommandPanel
 * ----------------------------------------------------------------------------
 * - دو حالته: دسته‌بندی / تگ
 * - در صورت انتخاب، نام انتخاب‌شده نمایش داده می‌شه
 * - در غیر این صورت، متن پیش‌فرض
 * - با کیبورد فعال می‌شه
 */

import { ChevronDown, FolderOpen, Hash, X } from 'lucide-react';
import * as React from 'react';
import type { CommandMode } from './CommandPanel';

type Props = {
  mode: CommandMode;
  onClick: () => void;
  count?: number;
  selectedName?: string | null;
  className?: string;
};

export default function CommandTrigger({
  mode,
  onClick,
  count,
  selectedName,
  className = '',
}: Props) {
  const isCategory = mode === 'category';
  const Icon = isCategory ? FolderOpen : Hash;
  const iconClass = isCategory ? '' : '--emerald';
  const label = selectedName ?? (isCategory ? 'دسته‌بندی' : 'برچسب');

  return (
    <button
      type="button"
      onClick={onClick}
      className={`arc-cmd-trigger arc-focus ${className}`}
      aria-label={`${isCategory ? 'انتخاب دسته‌بندی' : 'انتخاب برچسب'}${selectedName ? ` — ${selectedName}` : ''}`}
    >
      <span className={`arc-cmd-trigger__icon${iconClass ? ` ${iconClass}` : ''}`}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="arc-cmd-trigger__label truncate max-w-[10rem]">{label}</span>
      {typeof count === 'number' && !selectedName ? (
        <span className="arc-cmd-trigger__count">{count.toLocaleString('fa-IR')}</span>
      ) : null}
      {selectedName ? (
        <span className="arc-cmd-trigger__count">
          <X className="w-3 h-3" aria-hidden />
        </span>
      ) : (
        <ChevronDown className="w-3.5 h-3.5 opacity-50" aria-hidden />
      )}
    </button>
  );
}
