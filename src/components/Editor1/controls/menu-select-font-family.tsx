// menu-select-font-family.tsx — Inkwell 2026
// 2026-07-06: مهاجرت از inline lucide-react به Icon wrapper.
//   - همهٔ آیکون‌ها یکدست (size 14-16 با stroke 1.25)
//   - تب‌ها، آپلود، و حذف همگی از Icon می‌آیند

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '../../ui/icon';
import { fontFamilies, loadFont, type FontOption } from '../extensions/font-family';
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

type TabKey = 'all' | 'persian' | 'system' | 'google' | 'uploaded';
interface Tab {
  id: TabKey;
  label: string;
  /** نام آیکون از Icon registry */
  icon: string;
  count: number;
}

const TABS_BASE: Omit<Tab, 'count'>[] = [
  { id: 'all', label: 'همه', icon: 'sparkles' },
  { id: 'persian', label: 'فارسی', icon: 'languages' },
  { id: 'system', label: 'سیستم', icon: 'monitor' },
  { id: 'google', label: 'آنلاین', icon: 'globe' },
  { id: 'uploaded', label: 'آپلود', icon: 'upload' },
];

const FONT_MIME = /\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/;

const MenuSelectFontFamily: React.FC<MenuSelectFontFamilyProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadedFonts, setUploadedFonts] = useState<UploadedFont[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFontFamily = editor.getAttributes('textStyle').fontFamily || '';

  const allFonts: FontItem[] = [
    ...fontFamilies,
    ...uploadedFonts.map((f) => ({
      label: f.name,
      value: f.family,
      category: 'uploaded',
    })),
  ];

  const currentFont = allFonts.find((f) => f.value === currentFontFamily);
  const displayLabel = currentFont?.label || 'فونت';

  const filteredFonts = allFonts.filter((f) => {
    const matchSearch =
      !searchQuery || f.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTab = activeTab === 'all' || f.category === activeTab;
    return matchSearch && matchTab;
  });

  useEffect(() => {
    fontFamilies.forEach((font) => {
      if (font.url) loadFont(font);
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('editor-uploaded-fonts');
    if (saved) {
      try {
        const fonts: UploadedFont[] = JSON.parse(saved);
        setUploadedFonts(fonts);
        fonts.forEach((font) => {
          const fontFace = new FontFace(font.family, `url(${font.url})`);
          fontFace.load().then(() => document.fonts.add(fontFace)).catch(() => {
            /* font failed to load — silent, demo fallback */
          });
        });
      } catch {
        // localStorage ممکن است خراب باشد — silent fail
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setActiveTab('all');
    }
  }, [isOpen]);

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    // .ttf etc supported, otherwise notify
    if (!FONT_MIME.test(ext)) {
      // eslint-disable-next-line no-alert
      alert('فرمت نامعتبر؛ ttf، otf، woff، woff2 مجاز است');
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const fontName = file.name.replace(/\.[^/.]+$/, '');
      const fontFamily = `uploaded-${fontName}-${Date.now()}`;
      try {
        const fontFace = new FontFace(fontFamily, `url(${dataUrl})`);
        await fontFace.load();
        document.fonts.add(fontFace);
        const newFont: UploadedFont = {
          name: fontName,
          family: fontFamily,
          url: dataUrl,
        };
        const updated = [...uploadedFonts, newFont];
        setUploadedFonts(updated);
        localStorage.setItem('editor-uploaded-fonts', JSON.stringify(updated));
        editor.chain().focus().setFontFamily(fontFamily).run();
        setActiveTab('uploaded');
      } catch {
        // eslint-disable-next-line no-alert
        alert('خطا در بارگذاری فونت');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      // eslint-disable-next-line no-alert
      alert('خطا در خواندن فایل');
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const removeFont = (family: string) => {
    const updated = uploadedFonts.filter((f) => f.family !== family);
    setUploadedFonts(updated);
    localStorage.setItem('editor-uploaded-fonts', JSON.stringify(updated));
    if (currentFontFamily === family) {
      editor.chain().focus().unsetFontFamily().run();
    }
  };

  const selectFont = useCallback(
    (font: FontItem) => {
      if ('url' in font && font.url) loadFont(font as FontOption);
      if (font.value) {
        editor.chain().focus().setFontFamily(font.value).run();
      } else {
        editor.chain().focus().unsetFontFamily().run();
      }
      setIsOpen(false);
    },
    [editor],
  );

  const tabs: Tab[] = TABS_BASE.map((t) => ({
    ...t,
    count:
      t.id === 'all'
        ? allFonts.length
        : t.id === 'uploaded'
          ? uploadedFonts.length
          : allFonts.filter((f) => f.category === t.id).length,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-haspopup="dialog"
          className="h-8 px-2 gap-1.5 text-xs hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-600 dark:text-primary-400"
        >
          {/* بجای آیکون، خود نام فونت را نشان می‌دهیم — رنگ و وزن همان فونت */}
          <span
            className="max-w-[80px] truncate font-bold text-[13px] leading-none"
            style={{ fontFamily: currentFontFamily || 'inherit' }}
          >
            {displayLabel}
          </span>
          <Icon name="chevron-down" size={12} strokeWidth={1.5} className="text-gray-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-xl">
        <DialogHeader className="p-4 pb-3 bg-primary-50 dark:bg-primary-900/20 border-b">
          <DialogTitle className="flex items-center gap-3 text-base">
            <span
              className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white"
              aria-hidden
            >
              <Icon name="type" size={18} strokeWidth={1.5} />
            </span>
            <div>
              <span className="font-semibold">انتخاب فونت</span>
              <p className="text-xs text-gray-500 font-normal">
                {allFonts.length.toLocaleString('fa-IR')} فونت
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Input
              placeholder="جستجو..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="جستجوی فونت"
              className="h-9 pe-9 rounded-lg text-sm"
            />
            <span
              className="absolute inset-y-0 end-3 flex items-center text-gray-400 pointer-events-none"
              aria-hidden
            >
              <Icon name="search" size={14} strokeWidth={1.5} />
            </span>
          </div>
        </div>

        {/* تب‌ها */}
        <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto" role="tablist">
          {tabs.map((tab) => {
            if (tab.id !== 'all' && tab.count === 0) return null;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/25'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200',
                )}
              >
                <Icon
                  name={tab.icon as IconName}
                  size={12}
                  strokeWidth={1.5}
                  aria-hidden
                />
                {tab.label}
                <span
                  className={cn(
                    'text-[10px] px-1 rounded font-bold',
                    activeTab === tab.id
                      ? 'bg-white/20'
                      : 'bg-gray-200 dark:bg-gray-700',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* نوار آپلود */}
        <div className="px-4 py-3 bg-primary-50/50 dark:bg-primary-900/10 border-b">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            onChange={handleFontUpload}
            className="hidden"
            id="font-upload"
          />
          <label
            htmlFor="font-upload"
            className={cn(
              'w-full h-9 flex items-center justify-center gap-2 text-sm font-medium cursor-pointer bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all',
              isUploading && 'opacity-60 cursor-not-allowed',
            )}
          >
            <Icon
              name={isUploading ? 'loader-2' : 'upload'}
              size={14}
              strokeWidth={1.5}
              className={isUploading ? 'animate-spin' : ''}
              aria-hidden
            />
            {isUploading ? 'در حال بارگذاری...' : 'آپلود فونت'}
          </label>
        </div>

        <ScrollArea className="h-[260px]">
          <div className="p-3 grid grid-cols-2 gap-2">
            {filteredFonts.length > 0 ? (
              filteredFonts.map((font) => {
                const isSelected = currentFontFamily === font.value;
                const isUploaded = font.category === 'uploaded';
                return (
                  <div
                    key={font.value || 'default'}
                    className={cn(
                      'relative p-2.5 text-right rounded-lg transition-all border group hover:shadow-sm',
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => selectFont(font)}
                      className="w-full text-right"
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1"
                          style={{ fontFamily: font.value || 'inherit' }}
                        >
                          {font.label}
                        </span>
                        {isSelected && (
                          <span
                            className="w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center shrink-0"
                            aria-hidden
                          >
                            <Icon
                              name="check"
                              size={10}
                              strokeWidth={2.5}
                              className="text-white"
                            />
                          </span>
                        )}
                      </div>
                      <span
                        className="block text-xs text-gray-400 mt-1 truncate"
                        style={{ fontFamily: font.value || 'inherit' }}
                      >
                        نمونه ABC
                      </span>
                    </button>
                    {isUploaded && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFont(font.value);
                        }}
                        aria-label={`حذف ${font.label}`}
                        className="absolute top-1 start-1 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 focus:opacity-100"
                      >
                        <Icon name="x" size={10} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 py-10 text-center">
                <Icon
                  name="type"
                  size={28}
                  className="mx-auto mb-2 text-gray-300"
                  aria-hidden
                />
                <p className="text-sm text-gray-500">فونتی یافت نشد</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-4 py-2.5 border-t bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {filteredFonts.length.toLocaleString('fa-IR')} فونت
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              editor.chain().focus().unsetFontFamily().run();
              setIsOpen(false);
            }}
            className="h-7 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50"
          >
            پیش‌فرض
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MenuSelectFontFamily;
