// components/Dashboard/Blog/PostForm/TagSelectDialog.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { TaxonomyType } from '@/types/types';
import { FiX, FiPlus } from 'react-icons/fi';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useToast } from '@/components/ui/use-toast';

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
        toast({
          title: 'موفقیت',
          description: 'تگ با موفقیت اضافه شد',
          variant: 'success',
        });
      }
    },
    [selectedTags],
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
    if (!isLoading && hasMoreItems) {
      onLoadMore();
    }
  }, [isLoading, hasMoreItems, onLoadMore]);

  const infiniteScrollRef = useInfiniteScroll(handleLoadMore, hasMoreItems, isLoading);

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rtl">
        <DialogHeader>
          <DialogTitle className="text-right">انتخاب برچسب‌ها</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="px-2 py-1 text-sm bg-secondary-100 text-secondary-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="mr-2 text-red-500 hover:text-red-700"
              >
                <FiX size={14} />
              </button>
            </Badge>
          ))}
        </div>
        <form onSubmit={handleNewTagSubmit} className="flex gap-2 mb-4">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="برچسب جدید"
            className="flex-grow text-right"
          />
          <Button type="submit" size="sm">
            <FiPlus size={18} />
          </Button>
        </form>
        <div className="mb-4">
          <Input
            type="text"
            placeholder="جستجوی برچسب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ScrollArea className="h-[200px] pr-4" dir="rtl">
          {filteredTags.map((tag) => (
            <Button
              key={tag.id}
              variant="ghost"
              className={`w-full justify-start mb-1 text-right ${
                selectedTags.includes(tag.name) ? 'bg-secondary-100' : ''
              }`}
              onClick={() => handleAddTag(tag.name)}
            >
              {tag.name}
            </Button>
          ))}
          <div ref={infiniteScrollRef} style={{ height: '1px' }} />
          {isLoading && <div className="text-center py-2">در حال بارگذاری...</div>}
        </ScrollArea>
        <div className="flex justify-end mt-4">
          <Button onClick={handleSave}>ذخیره</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
