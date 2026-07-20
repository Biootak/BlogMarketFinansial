// text-bubble-menu.tsx — Inkwell 2026
// Floating toolbar that appears when the user selects text.
// Visual surface defined in styles/shell.scss (.at-bubble).
//
// 2026-07-06: مهاجرت از inline lucide-react به Icon wrapper. مزایا:
//   - Premium stroke width (1.25) خودکار از Icon می‌آید
//   - consistency با toolbar (menu-button-*.tsx)
//   - اگر روزی iconها SVG سفارشی شوند، فقط iconMap تغییر می‌کند

'use client';

// 2026-07-05: dir از hook مرکزی برای consistency با shell.
import { useDirection } from '@/hooks/useDirection';
import type { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../ui/icon';

interface TextBubbleMenuProps {
  editor: Editor;
}

const TextBubbleMenu: React.FC<TextBubbleMenuProps> = ({ editor }) => {
  const dir = useDirection('rtl');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus();
      linkInputRef.current.select();
    }
  }, [showLinkInput]);

  const handleLinkClick = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkInput(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      let finalUrl = linkUrl.trim();
      if (
        finalUrl &&
        !/^https?:\/\//i.test(finalUrl) &&
        !finalUrl.startsWith('/') &&
        !finalUrl.startsWith('#')
      ) {
        finalUrl = `https://${finalUrl}`;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const cancelLink = useCallback(() => {
    setShowLinkInput(false);
    setLinkUrl('');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyLink();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelLink();
      }
    },
    [applyLink, cancelLink],
  );

  // Re-derive active marks every time the selection changes.
  const activeStates = useMemo(
    () => ({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      strike: editor.isActive('strike'),
      highlight: editor.isActive('highlight'),
      code: editor.isActive('code'),
      link: editor.isActive('link'),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor.state.selection],
  );

  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: 'top-start',
      }}
      shouldShow={({ editor: ed, state }) => {
        const { from, to } = state.selection;
        const hasSelection = from !== to;
        return (
          hasSelection &&
          !ed.isActive('image') &&
          !ed.isActive('embed') &&
          !ed.isActive('table') &&
          !ed.isActive('codeBlock')
        );
      }}
    >
      <div
        className="at-bubble"
        role="toolbar"
        aria-label="ابزار فرمت‌بندی متن"
        dir={dir}
        data-dir={dir}
      >
        {showLinkInput ? (
          <>
            <input
              ref={linkInputRef}
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="example.com"
              className="at-bubble__input"
              aria-label="آدرس لینک"
            />
            <button
              type="button"
              onClick={applyLink}
              aria-label="تایید لینک"
              className="at-bubble__btn at-bubble__btn--success"
            >
              <Icon name="check" size={14} />
            </button>
            <span className="at-bubble__sep" aria-hidden />
            <button
              type="button"
              onClick={cancelLink}
              aria-label="لغو"
              className="at-bubble__btn at-bubble__btn--neutral"
            >
              <Icon name="x" size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              aria-label="Bold (Ctrl+B)"
              aria-pressed={activeStates.bold}
              className="at-bubble__btn"
            >
              <Icon name="bold" size={14} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              aria-label="Italic (Ctrl+I)"
              aria-pressed={activeStates.italic}
              className="at-bubble__btn"
            >
              <Icon name="italic" size={14} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              aria-label="Underline (Ctrl+U)"
              aria-pressed={activeStates.underline}
              className="at-bubble__btn"
            >
              <Icon name="underline" size={14} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              aria-label="خط‌خورده (Ctrl+Shift+X)"
              aria-pressed={activeStates.strike}
              className="at-bubble__btn"
            >
              <Icon name="strikethrough" size={14} />
            </button>

            <span className="at-bubble__sep" aria-hidden />

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              aria-label="هایلایت (Ctrl+Shift+H)"
              aria-pressed={activeStates.highlight}
              className="at-bubble__btn"
            >
              <Icon name="highlighter" size={14} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              aria-label="کد درون‌خطی (Ctrl+E)"
              aria-pressed={activeStates.code}
              className="at-bubble__btn"
            >
              <Icon name="code" size={14} />
            </button>

            <span className="at-bubble__sep" aria-hidden />

            <button
              type="button"
              onClick={handleLinkClick}
              aria-label="لینک (Ctrl+K)"
              aria-pressed={activeStates.link}
              className="at-bubble__btn"
            >
              <Icon name="link" size={14} />
            </button>
          </>
        )}
      </div>
    </BubbleMenu>
  );
};

export default TextBubbleMenu;
