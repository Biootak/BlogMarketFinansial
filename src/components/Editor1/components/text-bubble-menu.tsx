// text-bubble-menu.tsx — Inkwell 2026
// Floating toolbar that appears when the user selects text.
// Visual surface defined in styles/shell.scss (.at-bubble).

'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { BubbleMenu } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { Bold, Italic, Underline, Highlighter, Link, Code, Strikethrough, X, Check } from 'lucide-react';

interface TextBubbleMenuProps {
  editor: Editor;
}

const TextBubbleMenu: React.FC<TextBubbleMenuProps> = ({ editor }) => {
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
      if (finalUrl && !/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith('/') && !finalUrl.startsWith('#')) {
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
      tippyOptions={{
        duration: 150,
        animation: 'shift-away',
        moveTransition: 'transform 0.15s ease-out',
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
      <div className="at-bubble" role="toolbar" aria-label="ابزار فرمت‌بندی متن">
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
              <Check size={14} />
            </button>
            <span className="at-bubble__sep" aria-hidden />
            <button
              type="button"
              onClick={cancelLink}
              aria-label="لغو"
              className="at-bubble__btn at-bubble__btn--neutral"
            >
              <X size={14} />
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
              <Bold size={14} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              aria-label="Italic (Ctrl+I)"
              aria-pressed={activeStates.italic}
              className="at-bubble__btn"
            >
              <Italic size={14} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              aria-label="Underline (Ctrl+U)"
              aria-pressed={activeStates.underline}
              className="at-bubble__btn"
            >
              <Underline size={14} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              aria-label="خط‌خورده (Ctrl+Shift+S)"
              aria-pressed={activeStates.strike}
              className="at-bubble__btn"
            >
              <Strikethrough size={14} />
            </button>

            <span className="at-bubble__sep" aria-hidden />

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              aria-label="هایلایت (Ctrl+Shift+H)"
              aria-pressed={activeStates.highlight}
              className="at-bubble__btn"
            >
              <Highlighter size={14} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              aria-label="کد درون‌خطی (Ctrl+E)"
              aria-pressed={activeStates.code}
              className="at-bubble__btn"
            >
              <Code size={14} />
            </button>

            <span className="at-bubble__sep" aria-hidden />

            <button
              type="button"
              onClick={handleLinkClick}
              aria-label="لینک (Ctrl+K)"
              aria-pressed={activeStates.link}
              className="at-bubble__btn"
            >
              <Link size={14} />
            </button>
          </>
        )}
      </div>
    </BubbleMenu>
  );
};

export default TextBubbleMenu;
