// FixedMenu.tsx — Inkwell 2026
// 2026-07-06: مهاجرت از inline lucide-react به Icon wrapper.
//   - همهٔ آیکون‌ها از یک نقطه می‌آیند → premium stroke (1.25) یکدست.
//   - دیگر size/stroke ناهماهنگ بین کنترل‌ها نیست.

import { useDirection } from '@/hooks/useDirection';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import type { Editor } from '@tiptap/core';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';

// Skeleton کوچک برای دکمه‌هایی که lazy-load می‌شوند تا در شبکهٔ کند
// چیدمان تولبار حفظ شود و پرش نداشته باشیم.
const MenuButtonSkeleton = () => (
  <span className="at-bubble__btn at-bubble__btn--skeleton" aria-hidden="true" />
);

// Dynamic imports for client-side components
const MenuButtonUndo = dynamic(() => import('../controls/menu-button-undo'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonRedo = dynamic(() => import('../controls/menu-button-redo'), {
  loading: MenuButtonSkeleton,
});
const MenuSelectHeading = dynamic(() => import('../controls/menu-select-heading'), {
  loading: MenuButtonSkeleton,
});
const MenuSelectFontSize = dynamic(() => import('../controls/menu-select-font-size'), {
  loading: MenuButtonSkeleton,
});
const MenuSelectFontFamily = dynamic(() => import('../controls/menu-select-font-family'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonBold = dynamic(() => import('../controls/menu-button-bold'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonItalic = dynamic(() => import('../controls/menu-button-italic'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonUnderline = dynamic(() => import('../controls/menu-button-underline'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonStrike = dynamic(() => import('../controls/menu-button-strike'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonColor = dynamic(() => import('../controls/menu-button-color'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonHighlight = dynamic(() => import('../controls/menu-button-highlight'), {
  loading: MenuButtonSkeleton,
});
const MenuSelectTextAlign = dynamic(() => import('../controls/menu-select-text-align'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonOrderedList = dynamic(() => import('../controls/menu-button-ordered-list'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonBulletedList = dynamic(() => import('../controls/menu-button-bulleted-list'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonLink = dynamic(() => import('../controls/menu-button-link'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonBlockquote = dynamic(() => import('../controls/menu-button-blockquote'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonCodeblock = dynamic(() => import('../controls/menu-button-codeblock'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonHorizontalRule = dynamic(() => import('../controls/menu-button-horizontal-rule'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonImage = dynamic(() => import('../controls/menu-button-image'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonTable = dynamic(() => import('../controls/menu-button-table'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonTaskList = dynamic(() => import('../controls/menu-button-task-list'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonSuperscript = dynamic(() => import('../controls/menu-button-superscript'), {
  loading: MenuButtonSkeleton,
});
const MenuButtonSubscript = dynamic(() => import('../controls/menu-button-subscript'), {
  loading: MenuButtonSkeleton,
});

export type FixedMenuProps = {
  editor: Editor;
  className?: string;
  tocOpen?: boolean;
  onToggleToc?: () => void;
  hasToc?: boolean;
};

const FixedMenu = ({ editor, className, tocOpen, onToggleToc, hasToc }: FixedMenuProps) => {
  // D13 — Mobile-aware: when narrow, secondary controls collapse into a
  // "More" panel that's revealed via a button. The button itself is hidden
  // on wider viewports (≥sm) by CSS, so the desktop experience is unchanged.
  const [moreOpen, setMoreOpen] = useState(false);
  const dir = useDirection('rtl');

  return (
    <TooltipProvider disableHoverableContent delayDuration={500} skipDelayDuration={0}>
      <Toolbar.Wrapper
        className={`${className} at-editor-toolbar-wrap overflow-x-auto text-primary-600`}
        data-more-open={moreOpen || undefined}
        dir={dir}
        data-dir={dir}
      >
        <div className="flex flex-wrap items-center justify-start gap-1 p-2">
          {/* History — always visible */}
          <Toolbar.Group className="flex-shrink-0 [&_svg]:text-primary-600 [&_svg]:stroke-primary-600">
            <MenuButtonUndo editor={editor} />
            <MenuButtonRedo editor={editor} />
          </Toolbar.Group>

          <Toolbar.Divider className="hidden sm:block" />

          {/* Block / heading — always visible */}
          <Toolbar.Group className="flex-shrink-0 [&_svg]:text-primary-600 [&_svg]:stroke-primary-600">
            <MenuSelectHeading editor={editor} />
          </Toolbar.Group>

          <Toolbar.Divider className="hidden sm:block" />

          {/* Inline marks — always visible */}
          <Toolbar.Group className="flex-shrink-0 [&_svg]:text-primary-600 [&_svg]:stroke-primary-600">
            <MenuButtonBold editor={editor} />
            <MenuButtonItalic editor={editor} />
            <MenuButtonUnderline editor={editor} />
            <MenuButtonStrike editor={editor} />
          </Toolbar.Group>

          <Toolbar.Divider className="hidden sm:block" />

          {/* Lists — always visible */}
          <Toolbar.Group className="flex-shrink-0 [&_svg]:text-primary-600 [&_svg]:stroke-primary-600">
            <MenuButtonOrderedList editor={editor} />
            <MenuButtonBulletedList editor={editor} />
            <MenuButtonTaskList editor={editor} />
          </Toolbar.Group>

          <Toolbar.Divider className="hidden sm:block" />

          {/* Insert — always visible */}
          <Toolbar.Group className="flex-shrink-0 [&_svg]:text-primary-600 [&_svg]:stroke-primary-600">
            <MenuButtonLink editor={editor} />
            <MenuButtonImage editor={editor} />
          </Toolbar.Group>

          {/*
            Overflow: only hidden when the "More" popover is closed at narrow widths.
            At ≥sm, this group is always visible (CSS override below).
          */}
          <Toolbar.Group
            className={`at-toolbar-overflow flex-shrink-0 [&_svg]:text-primary-600 [&_svg]:stroke-primary-600 ${
              moreOpen ? 'is-open' : ''
            }`}
            data-overflow="true"
          >
            <MenuSelectFontFamily editor={editor} />
            <MenuSelectFontSize editor={editor} />
            <MenuButtonSuperscript editor={editor} />
            <MenuButtonSubscript editor={editor} />
            <MenuButtonColor editor={editor} />
            <MenuButtonHighlight editor={editor} />
            <MenuSelectTextAlign editor={editor} />
            <MenuButtonBlockquote editor={editor} />
            <MenuButtonCodeblock editor={editor} />
            <MenuButtonHorizontalRule editor={editor} />
            <MenuButtonTable editor={editor} />
            <Toolbar.Divider className="hidden sm:block" />
            <Toolbar.Button
              type="button"
              onClick={onToggleToc}
              active={tocOpen}
              tooltip="فهرست مطالب"
              aria-pressed={tocOpen}
              disabled={!hasToc}
            >
              <Icon name="list-toc" size={16} />
            </Toolbar.Button>
          </Toolbar.Group>

          {/* More toggle — visible only when the overflow group is collapsed (mobile) */}
          <Toolbar.Group className="at-toolbar-more ms-auto">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-controls="at-toolbar-overflow"
              aria-label={moreOpen ? 'بستن ابزارهای بیشتر' : 'ابزارهای بیشتر'}
              className="at-bubble__btn"
            >
              {moreOpen ? <Icon name="x" size={16} /> : <Icon name="more-horizontal" size={16} />}
            </button>
          </Toolbar.Group>
        </div>
      </Toolbar.Wrapper>
    </TooltipProvider>
  );
};

export default FixedMenu;
