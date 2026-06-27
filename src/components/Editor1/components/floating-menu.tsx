'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FloatingMenu as TiptapFloatingMenu } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { Plus, Type, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Code, Table, Minus, Image, AlertCircle, FileText, Lightbulb } from 'lucide-react';

interface FloatingMenuProps {
  editor: Editor;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  description?: string;
  action: () => void;
  category: 'text' | 'list' | 'media' | 'advanced';
}

const FloatingMenuComponent: React.FC<FloatingMenuProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const menuItems: MenuItem[] = useMemo(() => [
    {
      icon: <Type size={16} />,
      label: 'متن',
      description: 'پاراگراف معمولی',
      action: () => editor.chain().focus().setParagraph().run(),
      category: 'text',
    },
    {
      icon: <Heading1 size={16} />,
      label: 'عنوان ۱',
      description: 'عنوان بزرگ',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      category: 'text',
    },
    {
      icon: <Heading2 size={16} />,
      label: 'عنوان ۲',
      description: 'عنوان متوسط',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      category: 'text',
    },
    {
      icon: <Heading3 size={16} />,
      label: 'عنوان ۳',
      description: 'عنوان کوچک',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      category: 'text',
    },
    {
      icon: <List size={16} />,
      label: 'لیست نقطه‌ای',
      description: 'لیست با نقطه',
      action: () => editor.chain().focus().toggleBulletList().run(),
      category: 'list',
    },
    {
      icon: <ListOrdered size={16} />,
      label: 'لیست شماره‌ای',
      description: 'لیست با شماره',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      category: 'list',
    },
    {
      icon: <CheckSquare size={16} />,
      label: 'لیست وظایف',
      description: 'لیست با چک‌باکس',
      action: () => editor.chain().focus().toggleTaskList().run(),
      category: 'list',
    },
    {
      icon: <Quote size={16} />,
      label: 'نقل قول',
      description: 'بلاک نقل قول',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      category: 'advanced',
    },
    {
      icon: <Code size={16} />,
      label: 'کد',
      description: 'بلاک کد',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      category: 'advanced',
    },
    {
      icon: <Table size={16} />,
      label: 'جدول',
      description: 'درج جدول ۳×۳',
      action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      category: 'advanced',
    },
    {
      icon: <AlertCircle size={16} />,
      label: 'نکته',
      description: 'بلاک اطلاعات',
      action: () => editor.chain().focus().setCallout({ type: 'info' }).run(),
      category: 'advanced',
    },
    {
      icon: <FileText size={16} />,
      label: 'آکاردئون',
      description: 'بلاک قابل باز/بسته',
      action: () => editor.chain().focus().setDetails().run(),
      category: 'advanced',
    },
    {
      icon: <Minus size={16} />,
      label: 'خط جداکننده',
      description: 'خط افقی',
      action: () => editor.chain().focus().setHorizontalRule().run(),
      category: 'advanced',
    },
  ], [editor]);

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Reset selected index when menu opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % menuItems.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
        break;
      case 'Enter':
        e.preventDefault();
        menuItems[selectedIndex].action();
        setIsOpen(false);
        break;
    }
  }, [isOpen, menuItems, selectedIndex]);

  const handleItemClick = useCallback((item: MenuItem) => {
    item.action();
    setIsOpen(false);
  }, []);

  return (
    <TiptapFloatingMenu
      editor={editor}
      tippyOptions={{ 
        duration: 150,
        animation: 'shift-away',
      }}
      shouldShow={({ state }) => {
        const { $from } = state.selection;
        const currentLineText = $from.nodeBefore?.textContent || '';
        return currentLineText === '' && $from.parent.content.size === 0;
      }}
    >
      <div ref={menuRef} className="relative" onKeyDown={handleKeyDown}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="منوی درج بلاک"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 ${
            isOpen 
              ? 'bg-primary-500 text-white shadow-lg rotate-45' 
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-primary-100 dark:hover:bg-primary-900/30 text-gray-500 dark:text-gray-400 hover:text-primary-600'
          }`}
        >
          <Plus size={20} className="transition-transform duration-200" />
        </button>

        {isOpen && (
          <div 
            className="absolute top-0 right-12 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[220px] max-h-[400px] overflow-y-auto z-50 animate-in fade-in slide-in-from-right-2 duration-150"
            role="menu"
            aria-label="انتخاب نوع بلاک"
          >
            <div className="px-3 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              درج بلاک جدید
            </div>
            {menuItems.map((item, index) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-right transition-all duration-100 ${
                  index === selectedIndex
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-r-2 border-primary-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-r-2 border-transparent'
                }`}
              >
                <span className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                  index === selectedIndex
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${
                    index === selectedIndex ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {item.label}
                  </div>
                  {item.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
            <div className="px-3 py-2 mt-1 border-t border-gray-100 dark:border-gray-700">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 inline-flex items-center gap-1.5">
                <Lightbulb className="h-3 w-3" strokeWidth={1.75} aria-hidden />
                تایپ کنید <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px]">/</kbd> برای دستورات بیشتر
              </p>
            </div>
          </div>
        )}
      </div>
    </TiptapFloatingMenu>
  );
};

export default FloatingMenuComponent;
