'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { TaxonomyType } from '@/types/types';
import { FiX, FiSearch, FiFolder, FiCheck } from 'react-icons/fi';
import { BiLoaderAlt } from 'react-icons/bi';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

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
  isOpen, onClose, onSelectCategories, initialSelectedCategories,
  categories, onLoadMore, isLoading, hasMoreItems,
}: CategorySelectDialogProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialSelectedCategories);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { setSelectedCategories(initialSelectedCategories); }, [initialSelectedCategories]);

  const handleToggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  }, []);

  const handleSave = useCallback(() => { onSelectCategories(selectedCategories); onClose(); }, [selectedCategories, onSelectCategories, onClose]);
  const handleLoadMore = useCallback(() => { if (!isLoading && hasMoreItems) onLoadMore(); }, [isLoading, hasMoreItems, onLoadMore]);
  const infiniteScrollRef = useInfiniteScroll(handleLoadMore, hasMoreItems, isLoading);
  const filteredCategories = categories.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rtl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-2xl">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500 -mt-6 -mx-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-right">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <FiFolder className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">انتخاب دسته‌بندی‌ها</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedCategories.length} دسته‌بندی انتخاب شده</p>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Selected badges */}
        {selectedCategories.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map((categoryId) => {
                const category = categories.find((c) => c.id === categoryId);
                return category ? (
                  <Badge key={categoryId} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
                    {category.name}
                    <button type="button" onClick={() => handleToggleCategory(categoryId)} className="hover:bg-white/20 rounded-full p-0.5">
                      <FiX className="w-3 h-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-6 py-4">
          <div className="relative">
            <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="جستجوی دسته‌بندی..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
            />
          </div>
        </div>

        {/* Categories list */}
        <ScrollArea className="h-[280px] px-6" dir="rtl">
          <div className="space-y-2 pb-4">
            {filteredCategories.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleToggleCategory(category.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-colors duration-150 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500/50'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <span className={`font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {category.name}
                  </span>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    {isSelected && <FiCheck className="w-4 h-4" />}
                  </div>
                </button>
              );
            })}
            <div ref={infiniteScrollRef} style={{ height: '20px' }} />
            {isLoading && (
              <div className="flex items-center justify-center py-4 text-slate-500">
                <BiLoaderAlt className="w-5 h-5 animate-spin ml-2" />
                در حال بارگذاری...
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 h-11 rounded-xl">انصراف</Button>
            <Button onClick={handleSave} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              ذخیره تغییرات
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
