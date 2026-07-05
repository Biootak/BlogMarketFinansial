// FixedMenu.tsx
import React, { useState } from 'react';
import { MoreHorizontal, X } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import dynamic from 'next/dynamic';
import { Toolbar } from '../../ui/toolbar';
import { TooltipProvider } from '@radix-ui/react-tooltip';

// Dynamic imports for client-side components
const MenuButtonUndo = dynamic(() => import('../controls/menu-button-undo'));
const MenuButtonRedo = dynamic(() => import('../controls/menu-button-redo'));
const MenuSelectHeading = dynamic(() => import('../controls/menu-select-heading'));
const MenuSelectFontSize = dynamic(() => import('../controls/menu-select-font-size'));
const MenuSelectFontFamily = dynamic(() => import('../controls/menu-select-font-family'));
const MenuButtonBold = dynamic(() => import('../controls/menu-button-bold'));
const MenuButtonItalic = dynamic(() => import('../controls/menu-button-italic'));
const MenuButtonUnderline = dynamic(() => import('../controls/menu-button-underline'));
const MenuButtonColor = dynamic(() => import('../controls/menu-button-color'));
const MenuButtonHighlight = dynamic(() => import('../controls/menu-button-highlight'));
const MenuSelectTextAlign = dynamic(() => import('../controls/menu-select-text-align'));
const MenuButtonOrderedList = dynamic(() => import('../controls/menu-button-ordered-list'));
const MenuButtonBulletedList = dynamic(() => import('../controls/menu-button-bulleted-list'));
const MenuButtonLink = dynamic(() => import('../controls/menu-button-link'));
const MenuButtonBlockquote = dynamic(() => import('../controls/menu-button-blockquote'));
const MenuButtonCodeblock = dynamic(() => import('../controls/menu-button-codeblock'));
const MenuButtonImage = dynamic(() => import('../controls/menu-button-image'));
const MenuButtonTable = dynamic(() => import('../controls/menu-button-table'));
const MenuButtonTaskList = dynamic(() => import('../controls/menu-button-task-list'));
const MenuButtonSuperscript = dynamic(() => import('../controls/menu-button-superscript'));
const MenuButtonSubscript = dynamic(() => import('../controls/menu-button-subscript'));

export type FixedMenuProps = {
  editor: Editor;
  className?: string;
};

const FixedMenu = ({ editor, className }: FixedMenuProps) => {
  // D13 — Mobile-aware: when narrow, secondary controls collapse into a
  // "More" panel that's revealed via a button. The button itself is hidden
  // on wider viewports (≥sm) by CSS, so the desktop experience is unchanged.
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <TooltipProvider disableHoverableContent delayDuration={500} skipDelayDuration={0}>
      <Toolbar.Wrapper
        className={`${className} sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md transition-all duration-300 ease-in-out overflow-x-auto text-primary-600`}
        data-more-open={moreOpen || undefined}
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
            <MenuButtonTable editor={editor} />
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
              {moreOpen ? <X size={16} /> : <MoreHorizontal size={16} />}
            </button>
          </Toolbar.Group>
        </div>
      </Toolbar.Wrapper>
    </TooltipProvider>
  );
};

export default FixedMenu;
