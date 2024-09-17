'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { TaxonomyType } from '@/types/types';
import { FiX } from 'react-icons/fi';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

interface CategorySelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategories: (categories: string[]) => void;
  initialSelectedCategories: string[];
  categories: TaxonomyType[];
  onLoadMore: () => Promise<void>;
  isLoading: boolean;
  hasNextPage: boolean;
}

export function CategorySelectDialog({
  isOpen,
  onClose,
  onSelectCategories,
  initialSelectedCategories,
  categories,
  onLoadMore,
  isLoading,
  hasNextPage,
}: CategorySelectDialogProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialSelectedCategories);
  const [searchTerm, setSearchTerm] = useState('');
 
  const infiniteScrollRef = useInfiniteScroll(onLoadMore, hasNextPage, isLoading);

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

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rtl">
        <DialogHeader>
          <DialogTitle className="text-right">انتخاب دسته‌بندی‌ها</DialogTitle>
        </DialogHeader>
        <div className="mb-4">
          <Input
            type="text"
            placeholder="جستجوی دسته‌بندی..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedCategories.map((categoryId) => {
            const category = categories.find((c) => c.id === categoryId);
            return category ? (
              <Badge
                key={categoryId}
                variant="secondary"
                className="px-2 py-1 text-sm bg-primary-100 text-primary-800"
              >
                {category.name}
                <button
                  type="button"
                  onClick={() => handleToggleCategory(categoryId)}
                  className="mr-2 text-red-500 hover:text-red-700"
                >
                  <FiX size={14} />
                </button>
              </Badge>
            ) : null;
          })}
        </div>
        <ScrollArea className="h-[300px] pr-4" dir="rtl">
          {filteredCategories.map((category) => (
            <Button
              key={category.id}
              variant="ghost"
              className={`w-full justify-start mb-1 text-right ${
                selectedCategories.includes(category.id) ? 'bg-primary-100' : ''
              }`}
              onClick={() => handleToggleCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
          <div ref={infiniteScrollRef} style={{ height: '20px', marginTop: '10px' }} />
          {isLoading && <div className="text-center py-2">در حال بارگذاری...</div>}
        </ScrollArea>
        <div className="flex justify-end mt-4">
          <Button onClick={handleSave}>ذخیره</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}