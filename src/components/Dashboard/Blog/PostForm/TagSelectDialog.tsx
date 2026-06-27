'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { TaxonomyType } from '@/types/types';
import { FiX, FiPlus, FiSearch, FiTag, FiCheck } from 'react-icons/fi';
import { BiLoaderAlt } from 'react-icons/bi';
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
  isOpen, onClose, onSelectTags, initialSelectedTags,
  tags, onLoadMore, isLoading, hasMoreItems,
}: TagSelectDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(initialSelectedTags);
  const [newTag, setNewTag] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => { setSelectedTags(initialSelectedTags); }, [initialSelectedTags]);

  const handleAddTag = useCallback((tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags((prev) => [...prev, tagName]);
      toast({ title: 'موفقیت', description: 'برچسب اضافه شد', variant: 'success' });
    }
  }, [selectedTags, toast]);

  const handleRemoveTag = useCallback((tagName: string) => {
    setSelectedTags((prev) => prev.filter((tag) => tag !== tagName));
  }, []);

  const handleNewTagSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      handleAddTag(newTag.trim());
      setNewTag('');
    } else if (selectedTags.includes(newTag.trim())) {
      toast({ title: 'خطا', description: 'این برچسب قبلاً اضافه شده است.', variant: 'destructive' });
    }
  }, [newTag, handleAddTag, selectedTags, toast]);

  const handleSave = useCallback(() => { onSelectTags(selectedTags); onClose(); }, [selectedTags, onSelectTags, onClose]);
  const handleLoadMore = useCallback(() => { if (!isLoading && hasMoreItems) onLoadMore(); }, [isLoading, hasMoreItems, onLoadMore]);
  const infiniteScrollRef = useInfiniteScroll(handleLoadMore, hasMoreItems, isLoading);
  const filteredTags = tags.filter((tag) => tag.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rtl dash-panel">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500 -mt-6 -mx-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-right">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <FiTag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">انتخاب برچسب‌ها</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedTags.length} برچسب انتخاب شده</p>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Selected badges */}
        {selectedTags.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <Badge key={tag} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:bg-white/20 rounded-full p-0.5">
                    <FiX className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Add new tag */}
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50">
          <form onSubmit={handleNewTagSubmit} className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="برچسب جدید..."
              className="flex-1 h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
            />
            <Button type="submit" className="h-11 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
              <FiPlus className="w-5 h-5" />
            </Button>
          </form>
        </div>

        {/* Search */}
        <div className="px-6 py-4">
          <div className="relative">
            <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="جستجوی برچسب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
            />
          </div>
        </div>

        {/* Tags list */}
        <ScrollArea className="h-[200px] px-6" dir="rtl">
          <div className="space-y-2 pb-4">
            {filteredTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleAddTag(tag.name)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-colors duration-150 ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500/50'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <span className={`font-medium ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {tag.name}
                  </span>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' : 'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    {isSelected && <FiCheck className="w-4 h-4" />}
                  </div>
                </button>
              );
            })}
            <div ref={infiniteScrollRef} style={{ height: '1px' }} />
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
            <Button onClick={handleSave} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              ذخیره تغییرات
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
