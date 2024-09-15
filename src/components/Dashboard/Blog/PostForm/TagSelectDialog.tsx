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

interface TagSelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTags: (tags: string[]) => void;
  initialSelectedTags: string[];
  tags: TaxonomyType[];
  onLoadMore: () => void;
  isLoading: boolean;
  hasNextPage: boolean;
}

export function TagSelectDialog({
  isOpen,
  onClose,
  onSelectTags,
  initialSelectedTags,
  tags,
  onLoadMore,
  isLoading,
  hasNextPage,
}: TagSelectDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(initialSelectedTags);
  const [newTag, setNewTag] = useState('');

  const infiniteScrollRef = useInfiniteScroll(onLoadMore, hasNextPage, isLoading);

  useEffect(() => {
    setSelectedTags(initialSelectedTags);
  }, [initialSelectedTags]);

  const handleAddTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags((prev) => [...prev, tagName]);
    }
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTags((prev) => prev.filter((tag) => tag !== tagName));
  };

  const handleNewTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      handleAddTag(newTag.trim());
      setNewTag('');
    }
  };

  const handleSave = () => {
    onSelectTags(selectedTags);
    onClose();
  };

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
        <ScrollArea className="h-[200px] pl-4">
          {tags.map((tag) => (
            <Button
              key={tag.id}
              variant="ghost"
              className="w-full justify-start mb-1 text-right"
              onClick={() => handleAddTag(tag.name)}
              disabled={selectedTags.includes(tag.name)}
            >
              {tag.name}
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