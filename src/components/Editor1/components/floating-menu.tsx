// floating-menu.tsx — Inkwell 2026
// Empty-line "+" trigger that opens a block-insert menu. Looks like
// a Notion-style quick insert, themed to match the dashboard shell.

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FloatingMenu as TiptapFloatingMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/core';
// 2026-07-05: dir صریح برای portal tippy.
import { useDirection } from '@/hooks/useDirection';
import { Icon } from '../../ui/icon';

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
  const dir = useDirection('rtl');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        icon: <Icon name="type" size={14} />,
        label: 'متن',
        description: 'پاراگراف معمولی',
        action: () => editor.chain().focus().setParagraph().run(),
        category: 'text',
      },
      {
        icon: <Icon name="heading-1" size={14} />,
        label: 'عنوان ۱',
        description: 'عنوان بزرگ',
        action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        category: 'text',
      },
      {
        icon: <Icon name="heading-2" size={14} />,
        label: 'عنوان ۲',
        description: 'عنوان متوسط',
        action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        category: 'text',
      },
      {
        icon: <Icon name="heading-3" size={14} />,
        label: 'عنوان ۳',
        description: 'عنوان کوچک',
        action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        category: 'text',
      },
      {
        icon: <Icon name="list" size={14} />,
        label: 'لیست نقطه‌ای',
        description: 'لیست با نقطه',
        action: () => editor.chain().focus().toggleBulletList().run(),
        category: 'list',
      },
      {
        icon: <Icon name="list-ordered" size={14} />,
        label: 'لیست شماره‌ای',
        description: 'لیست با شماره',
        action: () => editor.chain().focus().toggleOrderedList().run(),
        category: 'list',
      },
      {
        icon: <Icon name="task-list" size={14} />,
        label: 'لیست وظایف',
        description: 'لیست با چک‌باکس',
        action: () => editor.chain().focus().toggleTaskList().run(),
        category: 'list',
      },
      {
        icon: <Icon name="quote" size={14} />,
        label: 'نقل قول',
        description: 'بلاک نقل قول',
        action: () => editor.chain().focus().toggleBlockquote().run(),
        category: 'advanced',
      },
      {
        icon: <Icon name="code" size={14} />,
        label: 'کد',
        description: 'بلاک کد',
        action: () => editor.chain().focus().toggleCodeBlock().run(),
        category: 'advanced',
      },
      {
        icon: <Icon name="table" size={14} />,
        label: 'جدول',
        description: 'درج جدول ۳×۳',
        action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        category: 'advanced',
      },
      {
        icon: <Icon name="alert-circle" size={14} />,
        label: 'نکته',
        description: 'بلاک اطلاعات',
        action: () => editor.chain().focus().setCallout({ type: 'info' }).run(),
        category: 'advanced',
      },
      {
        icon: <Icon name="file-text" size={14} />,
        label: 'آکاردئون',
        description: 'بلاک قابل باز/بسته',
        action: () => editor.chain().focus().setDetails().run(),
        category: 'advanced',
      },
      {
        icon: <Icon name="horizontal-rule" size={14} />,
        label: 'خط جداکننده',
        description: 'خط افقی',
        action: () => editor.chain().focus().setHorizontalRule().run(),
        category: 'advanced',
      },
    ],
    [editor],
  );

  // Click outside + Escape close.
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

  useEffect(() => {
    if (isOpen) setSelectedIndex(0);
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
    },
    [isOpen, menuItems, selectedIndex],
  );

  const handleItemClick = useCallback((item: MenuItem) => {
    item.action();
    setIsOpen(false);
  }, []);

  return (
    <TiptapFloatingMenu
      editor={editor}
      options={{ placement: 'bottom-start' }}
      shouldShow={({ state }) => {
        const { $from } = state.selection;
        const currentLineText = $from.nodeBefore?.textContent || '';
        return currentLineText === '' && $from.parent.content.size === 0;
      }}
    >
      <div className="at-floating-shell" ref={menuRef} onKeyDown={handleKeyDown} dir={dir} data-dir={dir}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="منوی درج بلاک"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className="at-floating-trigger"
        >
          <Icon name="plus" size={16} />
        </button>

        {isOpen && (
          <div className="at-floating-popover" role="menu" aria-label="انتخاب نوع بلاک">
            <div className="at-floating-popover__head">درج بلاک جدید</div>

            {menuItems.map((item, index) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`at-floating-item ${index === selectedIndex ? 'is-active' : ''}`}
              >
                <span className="at-floating-item__ico" aria-hidden>
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="at-floating-item__label">{item.label}</span>
                  {item.description && (
                    <span className="at-floating-item__desc">{item.description}</span>
                  )}
                </span>
              </button>
            ))}

            <div className="at-floating-popover__foot">
              برای دستورات بیشتر تایپ کنید <kbd>/</kbd>
            </div>
          </div>
        )}
      </div>
    </TiptapFloatingMenu>
  );
};

export default FloatingMenuComponent;
