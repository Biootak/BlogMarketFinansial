'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { TaxonomyType } from '@/types/types';
import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Plus, Search, Tag, X } from 'lucide-react';



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
      <DialogContent className="w-[calc(100%-1rem)] max-w-[480px] p-0 overflow-hidden rtl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-2xl max-h-[95vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="h-1 gradient-success-br -mt-4 sm:-mt-6 -mx-4 sm:-mx-6 mb-3 sm:mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 sm:gap-3 text-right">
              <div className="p-2 sm:p-2.5 rounded-xl gradient-success-br text-white">
                <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  انتخاب برچسب‌ها
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedTags.length} برچسب انتخاب شده
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Selected badges */}
        {selectedTags.length > 0 && (
          <div className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  className="gradient-success-br text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-white/20 rounded-full p-0.5"
                  >
                    <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Add new tag */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200/50 dark:border-slate-700/50">
          <form onSubmit={handleNewTagSubmit} className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="برچسب جدید..."
              className="flex-1 h-9 sm:h-11 text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
            />
            <Button
              type="submit"
              className="h-9 sm:h-11 px-3 sm:px-4 rounded-xl gradient-success-br text-white"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </form>
        </div>

        {/* Search */}
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="جستجوی برچسب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9 sm:pr-10 h-9 sm:h-11 text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
            />
          </div>
        </div>

        {/* Tags list */}
        <ScrollArea className="h-[180px] sm:h-[200px] px-4 sm:px-6" dir="rtl">
          <div className="space-y-1.5 sm:space-y-2 pb-4">
            {filteredTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleAddTag(tag.name)}
                  className={`w-full flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl transition-colors duration-150 ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500/50'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <span
                    className={`text-sm sm:text-base font-medium ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    {tag.name}
                  </span>
                  <div
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'gradient-success-br text-white'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 sm:w-4 sm:h-4" />}
                  </div>
                </button>
              );
            })}
            <div ref={infiniteScrollRef} style={{ height: '1px' }} />
            {isLoading && (
              <div className="flex items-center justify-center py-3 sm:py-4 text-slate-500 text-sm">
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin ml-2" />
                در حال بارگذاری...
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-9 sm:h-11 text-sm sm:text-base rounded-xl"
            >
              انصراف
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 h-9 sm:h-11 text-sm sm:text-base rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              ذخیره تغییرات
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
