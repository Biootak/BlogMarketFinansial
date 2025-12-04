'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { fontFamilies, loadFont, type FontOption } from '../extensions/font-family';
import { Type, Check, Globe, Monitor, ChevronDown, Sparkles, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MenuSelectFontFamilyProps {
  editor: Editor;
}

interface UploadedFont {
  name: string;
  family: string;
  url: string;
}

type FontItem = FontOption | { label: string; value: string; category: string };

const MenuSelectFontFamily: React.FC<MenuSelectFontFamilyProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadedFonts, setUploadedFonts] = useState<UploadedFont[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFontFamily = editor.getAttributes('textStyle').fontFamily || '';
  const allFonts: FontItem[] = [
    ...fontFamilies,
    ...uploadedFonts.map(f => ({ label: f.name, value: f.family, category: 'uploaded' })),
  ];
  const currentFont = allFonts.find(f => f.value === currentFontFamily);
  const displayLabel = currentFont?.label || 'فونت';

  const filteredFonts = allFonts.filter(f => {
    const matchSearch = !searchQuery || f.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTab = activeTab === 'all' || f.category === activeTab;
    return matchSearch && matchTab;
  });

  const tabs = [
    { id: 'all', label: 'همه', icon: Sparkles, count: allFonts.length },
    { id: 'persian', label: 'فارسی', emoji: '🇮🇷', count: allFonts.filter(f => f.category === 'persian').length },
    { id: 'system', label: 'سیستم', icon: Monitor, count: allFonts.filter(f => f.category === 'system').length },
    { id: 'google', label: 'آنلاین', icon: Globe, count: allFonts.filter(f => f.category === 'google').length },
    { id: 'uploaded', label: 'آپلود', icon: Upload, count: uploadedFonts.length },
  ];

  useEffect(() => {
    fontFamilies.forEach(font => { if (font.url) loadFont(font); });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('editor-uploaded-fonts');
    if (saved) {
      try {
        const fonts: UploadedFont[] = JSON.parse(saved);
        setUploadedFonts(fonts);
        fonts.forEach(font => {
          const fontFace = new FontFace(font.family, `url(${font.url})`);
          fontFace.load().then(() => document.fonts.add(fontFace));
        });
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) { setSearchQuery(''); setActiveTab('all'); }
  }, [isOpen]);

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
      alert('فرمت نامعتبر'); return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const fontName = file.name.replace(/\.[^/.]+$/, '');
      const fontFamily = `uploaded-${fontName}-${Date.now()}`;
      const fontFace = new FontFace(fontFamily, `url(${dataUrl})`);
      await fontFace.load();
      document.fonts.add(fontFace);
      const newFont: UploadedFont = { name: fontName, family: fontFamily, url: dataUrl };
      const updated = [...uploadedFonts, newFont];
      setUploadedFonts(updated);
      localStorage.setItem('editor-uploaded-fonts', JSON.stringify(updated));
      editor.chain().focus().setFontFamily(fontFamily).run();
      setActiveTab('uploaded');
      setIsUploading(false);
    };
    reader.onerror = () => { alert('خطا'); setIsUploading(false); };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFont = (family: string) => {
    const updated = uploadedFonts.filter(f => f.family !== family);
    setUploadedFonts(updated);
    localStorage.setItem('editor-uploaded-fonts', JSON.stringify(updated));
    if (currentFontFamily === family) editor.chain().focus().unsetFontFamily().run();
  };

  const selectFont = useCallback((font: FontItem) => {
    if ('url' in font && font.url) loadFont(font as FontOption);
    font.value ? editor.chain().focus().setFontFamily(font.value).run() : editor.chain().focus().unsetFontFamily().run();
    setIsOpen(false);
  }, [editor]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800">
          <Type size={14} className="text-gray-500" />
          <span className="max-w-[65px] truncate" style={{ fontFamily: currentFontFamily || 'inherit' }}>{displayLabel}</span>
          <ChevronDown size={12} className="text-gray-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-xl">
        <DialogHeader className="p-4 pb-3 bg-primary-50 dark:bg-primary-900/20 border-b">
          <DialogTitle className="flex items-center gap-3 text-base">
            <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center">
              <Type size={18} className="text-white" />
            </div>
            <div>
              <span className="font-semibold">انتخاب فونت</span>
              <p className="text-xs text-gray-500 font-normal">{allFonts.length} فونت</p>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="px-4 py-3 border-b">
          <Input placeholder="جستجو..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 rounded-lg text-sm" />
        </div>
        <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto">
          {tabs.map((tab) => {
            if (tab.id !== 'all' && tab.count === 0) return null;
            const Icon = tab.icon;
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id ? "bg-primary-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200")}>
                {Icon ? <Icon size={12} /> : <span>{tab.emoji}</span>}
                {tab.label}
                <span className={cn("text-[10px] px-1 rounded", activeTab === tab.id ? "bg-white/20" : "bg-gray-200 dark:bg-gray-700")}>{tab.count}</span>
              </button>
            );
          })}
        </div>
        <div className="px-4 py-3 bg-primary-50/50 dark:bg-primary-900/10 border-b">
          <input ref={fileInputRef} type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontUpload} className="hidden" id="font-upload" />
          <label htmlFor="font-upload" className={cn("w-full h-9 flex items-center justify-center gap-2 text-sm font-medium cursor-pointer bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all", isUploading && "opacity-60 cursor-not-allowed")}>
            <Upload size={14} className={cn(isUploading && "animate-pulse")} />
            {isUploading ? 'آپلود...' : 'آپلود فونت'}
          </label>
        </div>
        <ScrollArea className="h-[260px]">
          <div className="p-3 grid grid-cols-2 gap-2">
            {filteredFonts.length > 0 ? filteredFonts.map((font) => {
              const isSelected = currentFontFamily === font.value;
              const isUploaded = font.category === 'uploaded';
              return (
                <div key={font.value || 'default'} className={cn("relative p-2.5 text-right rounded-lg transition-all border group hover:shadow-sm",
                  isSelected ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300")}>
                  <button type="button" onClick={() => selectFont(font)} className="w-full text-right">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1" style={{ fontFamily: font.value || 'inherit' }}>{font.label}</span>
                      {isSelected && <div className="w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center"><Check size={10} className="text-white" /></div>}
                    </div>
                    <span className="block text-xs text-gray-400 mt-1 truncate" style={{ fontFamily: font.value || 'inherit' }}>نمونه ABC</span>
                  </button>
                  {isUploaded && <button type="button" onClick={(e) => { e.stopPropagation(); removeFont(font.value); }} className="absolute top-1 left-1 w-4 h-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><X size={8} /></button>}
                </div>
              );
            }) : <div className="col-span-2 py-10 text-center"><Type size={24} className="mx-auto mb-2 text-gray-300" /><p className="text-sm text-gray-500">فونتی یافت نشد</p></div>}
          </div>
        </ScrollArea>
        <div className="px-4 py-2.5 border-t bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
          <span className="text-xs text-gray-500">{filteredFonts.length} فونت</span>
          <Button variant="ghost" size="sm" onClick={() => { editor.chain().focus().unsetFontFamily().run(); setIsOpen(false); }} className="h-7 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50">پیش‌فرض</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MenuSelectFontFamily;