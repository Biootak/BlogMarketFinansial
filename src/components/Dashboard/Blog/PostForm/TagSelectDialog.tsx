'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { TaxonomyType } from '@/types/types';
import { useCallback, useEffect, useState } from 'react';
import { BiLoaderAlt } from 'react-icons/bi';
import { FiCheck, FiPlus, FiSearch, FiTag, FiX } from 'react-icons/fi';

interface TagSelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTags: (tags: string[]) => void;
  initialSelectedTags: string[];
  tags: TaxonomyType[];
  onLoadMore: () => Promise<void>;
  isLoading: boolean;
  hasMoreItems: boolean;
}

export function TagSelectDialog({
  isOpen,
  onClose,
  onSelectTags,
  initialSelectedTags,
  tags,
  onLoadMore,
  isLoading,
  hasMoreItems,
}: TagSelectDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(initialSelectedTags);
  const [newTag, setNewTag] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setSelectedTags(initialSelectedTags);
  }, [initialSelectedTags]);

  const handleAddTag = useCallback(
    (tagName: string) => {
      if (!selectedTags.includes(tagName)) {
        setSelectedTags((prev) => [...prev, tagName]);
        toast({ title: 'موفقیت', description: 'برچسب اضافه شد', variant: 'success' });
      }
    },
    [selectedTags, toast],
  );

  const handleRemoveTag = useCallback((tagName: string) => {
    setSelectedTags((prev) => prev.filter((tag) => tag !== tagName));
  }, []);

  const handleNewTagSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
        handleAddTag(newTag.trim());
        setNewTag('');
      } else if (selectedTags.includes(newTag.trim())) {
        toast({
          title: 'خطا',
          description: 'این برچسب قبلاً اضافه شده است.',
          variant: 'destructive',
        });
      }
    },
    [newTag, handleAddTag, selectedTags, toast],
  );

  const handleSave = useCallback(() => {
    onSelectTags(selectedTags);
    onClose();
  }, [selectedTags, onSelectTags, onClose]);
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMoreItems) onLoadMore();
  }, [isLoading, hasMoreItems, onLoadMore]);
  const infiniteScrollRef = useInfiniteScroll(handleLoadMore, hasMoreItems, isLoading);
  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 rtl at-dialog-content">
        {/* Header */}
        <div className="at-dialog-header">
          <div className="at-dialog-title">
            <span className="at-dialog-title__ico" aria-hidden>
              <FiTag className="w-4 h-4" />
            </span>
            <div>
              <div>انتخاب برچسب‌ها</div>
              <div className="at-dialog-sub">
                {selectedTags.length.toLocaleString('fa-IR')} برچسب انتخاب شده
              </div>
            </div>
          </div>
        </div>

        {/* Selected chips preview */}
        {selectedTags.length > 0 && (
          <div className="at-dialog-chips">
            {selectedTags.map((tag) => (
              <span key={tag} className="at-pill">
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="at-pill__close"
                  aria-label={`حذف ${tag}`}
                >
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add new tag */}
        <div className="at-dialog-body" style={{ paddingTop: 0, paddingBottom: 10 }}>
          <form onSubmit={handleNewTagSubmit} className="flex gap-2">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="برچسب جدید…"
              className="at-input"
              dir="rtl"
            />
            <button
              type="submit"
              className="at-btn at-btn--primary at-btn--icon"
              aria-label="افزودن"
            >
              <FiPlus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Search */}
        <div className="at-dialog-body" style={{ paddingTop: 0 }}>
          <div className="at-dialog-search">
            <input
              type="text"
              placeholder="جستجوی برچسب…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FiSearch className="at-dialog-search__ico w-4 h-4" aria-hidden />
          </div>
        </div>

        {/* Tags list */}
        <ScrollArea className="at-dialog-list" dir="rtl">
          <div>
            {filteredTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleAddTag(tag.name)}
                  className={`at-dialog-item ${isSelected ? 'is-selected' : ''}`}
                  aria-pressed={isSelected}
                >
                  <span className="truncate">{tag.name}</span>
                  <span className="at-dialog-item__check" aria-hidden>
                    <FiCheck className="w-3.5 h-3.5" />
                  </span>
                </button>
              );
            })}
            <div ref={infiniteScrollRef} style={{ height: '1px' }} />
            {isLoading && (
              <div className="flex items-center justify-center py-3 text-[color:var(--at-fg-muted)] text-xs">
                <BiLoaderAlt className="w-4 h-4 animate-spin ml-2" />
                در حال بارگذاری...
              </div>
            )}
            {filteredTags.length === 0 && !isLoading && (
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
