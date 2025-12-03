// FixedMenu.tsx
import React from 'react';
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
  return (
    <TooltipProvider disableHoverableContent delayDuration={500} skipDelayDuration={0}>
      <Toolbar.Wrapper
        className={`${className} sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md transition-all duration-300 ease-in-out overflow-x-auto text-primary-600`}
      >
        <div className="flex flex-wrap items-center justify-start space-x-1 space-y-1 p-2">
          <Toolbar.Group className="flex-shrink-0 [&_svg]:text-primary-600 [&_svg]:stroke-primary-600">
            <MenuButtonUndo editor={editor} />
            <MenuButtonRedo editor={editor} />
          </Toolbar.Group>

          <Toolbar.Divider className="hidden sm:block" />

          <Toolbar.Group className="flex-shrink-0 [&_svg]:text-primary-600 [&_svg]:stroke-primary-600">
            <MenuSelectHeading editor={editor} />
            <MenuSelectFontFamily editor={editor} />
            <MenuSelectFontSize editor={editor} />
          </Toolbar.Group>

          <Toolbar.Divider className="hidden sm:block" />

          <Toolbar.Group className="flex-shrink-0 [&_svg]:text-primary-600 [&_svg]:stroke-primary-600">
            <MenuButtonBold editor={editor} />
            <MenuButtonItalic editor={editor} />
            <MenuButtonUnderline editor={editor} />
            <MenuButtonSuperscript editor={editor} />
            <MenuButtonSubscript editor={editor} />
          </Toolbar.Group>

          <Toolbar.Divider className="hidden sm:block" />

          <Toolbar.Group className="flex-shrink-0 [&_svg]:text-primary-600 [&_svg]:stroke-primary-600">
            <MenuButtonColor editor={editor} />
            <MenuButtonHighlight editor={editor} />
          </Toolbar.Group>

          <Toolbar.Divider className="hidden sm:block" />

          <Toolbar.Group className="flex-shrink-0 [&_svg]:text-primary-600 [&_svg]:stroke-primary-600">
            <MenuSelectTextAlign editor={editor} />
          </Toolbar.Group>

          <Toolbar.Divider className="hidden sm:block" />

          <Toolbar.Group className="flex-shrink-0 [&_svg]:text-primary-600 [&_svg]:stroke-primary-600">
            <MenuButtonOrderedList editor={editor} />
            <MenuButtonBulletedList editor={editor} />
            <MenuButtonTaskList editor={editor} />
          </Toolbar.Group>

          <Toolbar.Divider className="hidden sm:block" />

          <Toolbar.Group className="flex-shrink-0 [&_svg]:text-primary-600 [&_svg]:stroke-primary-600">
            <MenuButtonLink editor={editor} />
            <MenuButtonBlockquote editor={editor} />
            <MenuButtonCodeblock editor={editor} />
            <MenuButtonImage editor={editor} />
            <MenuButtonTable editor={editor} />
          </Toolbar.Group>
        </div>
      </Toolbar.Wrapper>
    </TooltipProvider>
  );
};

export default FixedMenu;
