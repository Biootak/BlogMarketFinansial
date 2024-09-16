'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { TaxonomyType } from '@/types/types';
import { FiX, FiPlus } from 'react-icons/fi';

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
  const [searchTerm, setSearchTerm] = useState('');
  const observerRef = useRef<IntersectionObserver | null>(null);

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

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const lastTagCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          onLoadMore();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isLoading, hasNextPage, onLoadMore],
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
          {filteredTags.map((tag, index) => (
            <div key={tag.id} ref={index === filteredTags.length - 1 ? lastTagCallback : null}>
              <Button
                variant="ghost"
                className={`w-full justify-start mb-1 text-right ${
                  selectedTags.includes(tag.name) ? 'bg-secondary-100' : ''
                }`}
                onClick={() => handleAddTag(tag.name)}
              >
                {tag.name}
              </Button>
            </div>
          ))}
          {isLoading && <div className="text-center py-2">در حال بارگیری...</div>}
        </ScrollArea>
        <div className="flex justify-start mt-4">
          <Button onClick={handleSave}>ذخیره</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
