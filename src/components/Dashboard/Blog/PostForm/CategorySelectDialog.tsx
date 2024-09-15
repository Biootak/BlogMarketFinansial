'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TaxonomyType } from '@/types/types';
import { FiX, FiPlus } from 'react-icons/fi';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

interface CategorySelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategories: (categories: string[]) => void;
  initialSelectedCategories: string[];
  categories: TaxonomyType[];
  onLoadMore: () => void;
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
  const [newCategory, setNewCategory] = useState('');

  const infiniteScrollRef = useInfiniteScroll(onLoadMore, hasNextPage, isLoading);

  useEffect(() => {
    setSelectedCategories(initialSelectedCategories);
  }, [initialSelectedCategories]);

  const handleAddCategory = (categoryName: string) => {
    if (!selectedCategories.includes(categoryName)) {
      setSelectedCategories((prev) => [...prev, categoryName]);
    }
  };

  const handleRemoveCategory = (categoryName: string) => {
    setSelectedCategories((prev) => prev.filter((category) => category !== categoryName));
  };

  const handleNewCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory.trim() && !selectedCategories.includes(newCategory.trim())) {
      handleAddCategory(newCategory.trim());
      setNewCategory('');
    }
  };

  const handleSave = () => {
    onSelectCategories(selectedCategories);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rtl">
        <DialogHeader>
          <DialogTitle className="text-right">انتخاب دسته‌بندی‌ها</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedCategories.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="px-2 py-1 text-sm bg-primary-100 text-primary-800"
            >
              {category}
              <button
                onClick={() => handleRemoveCategory(category)}
                className="mr-2 text-red-500 hover:text-red-700"
              >
                <FiX size={14} />
              </button>
            </Badge>
          ))}
        </div>
        <form onSubmit={handleNewCategorySubmit} className="flex gap-2 mb-4">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="دسته‌بندی جدید"
            className="flex-grow text-right"
          />
          <Button type="submit" size="sm">
            <FiPlus size={18} />
          </Button>
        </form>
        <ScrollArea className="h-[200px] pl-4">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant="ghost"
              className="w-full justify-start mb-1 text-right"
              onClick={() => handleAddCategory(category.name)}
              disabled={selectedCategories.includes(category.name)}
            >
              {category.name}
            </Button>
          ))}
          <div ref={infiniteScrollRef} />
          {isLoading && <div className="text-center py-2">در حال بارگیری...</div>}
        </ScrollArea>
        <div className="flex justify-start mt-4">
          <Button onClick={handleSave}>ذخیره</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}