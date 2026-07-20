'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { TaxonomyType } from '@/types/types';
import { useCallback, useEffect, useState } from 'react';
import { BiLoaderAlt } from 'react-icons/bi';
import { FiCheck, FiFolder, FiSearch, FiX } from 'react-icons/fi';

interface CategorySelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategories: (categories: string[]) => void;
  initialSelectedCategories: string[];
  categories: TaxonomyType[];
  onLoadMore: () => Promise<void>;
  isLoading: boolean;
  hasMoreItems: boolean;
}

export function CategorySelectDialog({
  isOpen,
  onClose,
  onSelectCategories,
  initialSelectedCategories,
  categories,
  onLoadMore,
  isLoading,
  hasMoreItems,
}: CategorySelectDialogProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialSelectedCategories);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setSelectedCategories(initialSelectedCategories);
  }, [initialSelectedCategories]);

  const handleToggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    );
  }, []);

  const handleSave = useCallback(() => {
    onSelectCategories(selectedCategories);
    onClose();
  }, [selectedCategories, onSelectCategories, onClose]);
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMoreItems) onLoadMore();
  }, [isLoading, hasMoreItems, onLoadMore]);
  const infiniteScrollRef = useInfiniteScroll(handleLoadMore, hasMoreItems, isLoading);
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 rtl at-dialog-content">
        {/* Header */}
        <div className="at-dialog-header">
          <div className="at-dialog-title">
            <span className="at-dialog-title__ico" aria-hidden>
              <FiFolder className="w-4 h-4" />
            </span>
            <div>
              <div>انتخاب دسته‌بندی‌ها</div>
              <div className="at-dialog-sub">
                {selectedCategories.length.toLocaleString('fa-IR')} دسته‌بندی انتخاب شده
              </div>
            </div>
          </div>
        </div>

        {/* Selected chips preview */}
        {selectedCategories.length > 0 && (
          <div className="at-dialog-chips">
            {selectedCategories.map((categoryId) => {
              const category = categories.find((c) => c.id === categoryId);
              return category ? (
                <span key={categoryId} className="at-pill at-pill--blue">
                  <span>{category.name}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleCategory(categoryId)}
                    className="at-pill__close"
                    aria-label={`حذف ${category.name}`}
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Search */}
        <div className="at-dialog-body">
          <div className="at-dialog-search">
            <input
              type="text"
              placeholder="جستجوی دسته‌بندی..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FiSearch className="at-dialog-search__ico w-4 h-4" aria-hidden />
          </div>
        </div>

        {/* Categories list */}
        <ScrollArea className="at-dialog-list" dir="rtl">
          <div>
            {filteredCategories.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleToggleCategory(category.id)}
                  className={`at-dialog-item ${isSelected ? 'is-selected' : ''}`}
                  aria-pressed={isSelected}
                >
                  <span className="truncate">{category.name}</span>
                  <span className="at-dialog-item__check" aria-hidden>
                    <FiCheck className="w-3.5 h-3.5" />
                  </span>
                </button>
              );
            })}
            <div ref={infiniteScrollRef} style={{ height: '20px' }} />
            {isLoading && (
              <div className="flex items-center justify-center py-3 text-[color:var(--at-fg-muted)] text-xs">
                <BiLoaderAlt className="w-4 h-4 animate-spin ml-2" />
                در حال بارگذاری...
              </div>
            )}
            {filteredCategories.length === 0 && !isLoading && (
              <div className="at-form-empty text-sm">نتیجه‌ای برای «{searchTerm}» یافت نشد.</div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="at-dialog-foot">
          <button type="button" onClick={onClose} className="at-btn at-btn--secondary">
            انصراف
          </button>
          <button type="button" onClick={handleSave} className="at-btn at-btn--primary">
            ذخیره تغییرات
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
