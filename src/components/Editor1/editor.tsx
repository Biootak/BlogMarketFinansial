// Editor — Inkwell 2026
// Rich-text canvas for editors. Three-tier shell:
//   • TopBar       — sticky command deck with mode + presence
//   • Stage        — the paper itself, with ruler + slash hint
//   • StatusBar    — sticky bottom: word count, reading time, save pulse
//
// All visuals live in styles/shell.scss. Tailwind is intentionally
// avoided here so the editor can be themed + dark-moded without
// touching the design system tokens.

'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EditorContent, type EditorOptions, useEditor } from '@tiptap/react';
import type { Content } from '@tiptap/core';
import { extensions as builtInExtensions } from './extensions';
import FixedMenu from './components/fixed-menu';
import LinkBubbleMenu from './components/link-bubble-menu';
import TableContextMenu from './components/table-context-menu';
import TextBubbleMenu from './components/text-bubble-menu';
import TableToolbar from './components/table-toolbar';
import type { EditorInstance } from '.';
import { getToCItems, type TocItem } from './lib/table-of-contents';
import { cn } from '@/lib/utils';
// 2026-07-05: منبع حقیقت جهت متن در کلاینت. به جای hardcode `dir="rtl"`
// از این hook می‌خوانیم تا اگر روزی پنلی LTR شد (مثلاً ادیتور چندزبانه)
// یا کاربر دکمهٔ تغییر زبان زد، shell درست رفتار کند.
import { useDirection } from '@/hooks/useDirection';

import './styles/index.scss';

export interface EditorProps extends Partial<EditorOptions> {
  toolBarClassName?: string;
  wrapperClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  displayWordsCount?: boolean;
  onUpdateToC?: (items: TocItem[]) => void;
}

export type EditorRef = {
  getEditor: () => EditorInstance | null;
};

// Reading time: Persian mixed content reads slower than pure English.
// 150 wpm mirrors an adult reading Persian financial content at a
// comfortable pace. The server-side field can override this later.
function readingTime(words: number): string {
  if (!words) return '—';
  const minutes = Math.max(1, Math.round(words / 150));
  return `${minutes.toLocaleString('fa-IR')} دقیقه`;
}

function toFaDigits(n: number): string {
  return n.toLocaleString('fa-IR');
}

function countCharsNoSpace(text: string): number {
  // Remove all whitespace (spaces, tabs, newlines, zero-width chars).
  return text.replace(/\s+/g, '').length;
}

export const Editor = forwardRef<EditorRef, EditorProps>(
  (
    {
      wrapperClassName = '',
      toolBarClassName = '',
      contentClassName = '',
      footerClassName = '',
      extensions = [],
      editable = true,
      editorProps = {},
      content,
      displayWordsCount = true,
      onUpdateToC,
      ...rest
    },
    ref,
  ) => {
    // 2026-07-05: dir متن را از hook مرکزی می‌گیریم تا ProseMirror
    // مستقل از cascade `<html dir>` جهت درست داشته باشد. مخصوصاً در
    // bubble menuهای tippy که body mount می‌شوند و از cascade قطع
    // می‌شوند. به‌علاوه data-dir روي shell برای CSS debugging handy است.
    const dir = useDirection('rtl');

    // Consumers (PostForm) sometimes pass `editorProps.attributes.class`
    // to override prose sizes — we still want our `at-prose` shell
    // classes to take effect, so we merge instead of letting the spread
    // overwrite them entirely.
    const baseProseClass =
      'at-prose at-prose--editor focus:outline-none prose prose-sm sm:prose-base lg:prose-lg prose-headings:scroll-mt-[80px] max-w-none';
    const consumerProseClass =
      typeof (editorProps as { attributes?: { class?: string } })?.attributes?.class === 'string'
        ? ((editorProps as { attributes?: { class?: string } }).attributes?.class as string)
        : '';
    const mergedClass = cn(baseProseClass, consumerProseClass);

    const mergedEditorProps: EditorOptions['editorProps'] = {
      ...editorProps,
      attributes: {
        ...(editorProps as { attributes?: Record<string, string> })?.attributes,
        class: mergedClass,
        dir,
        'data-dir': dir,
      },
    };

    const editor = useEditor(
      {
        extensions: [...builtInExtensions, ...extensions],
        immediatelyRender: false,
        content,
        editorProps: mergedEditorProps,
        ...rest,
      },
      [],
    );

    const getEditorInstance = useCallback(() => {
      if (!editor) {
        console.warn('Editor instance is not available');
        return null;
      }
      return editor;
    }, [editor]);

    useImperativeHandle(ref, () => ({
      getEditor: getEditorInstance,
    }));

    // ── Word / character / selection counters ──
    const [counts, setCounts] = useState({ words: 0, chars: 0, charsNoSpace: 0 });
    const [selectionCount, setSelectionCount] = useState<{
      words: number;
      chars: number;
    } | null>(null);

    useEffect(() => {
      if (!editor) return;
      const update = () => {
        const cc = editor.storage.characterCount;
        const chars = cc.characters?.() ?? 0;
        const words = cc.words?.() ?? 0;
        const fullText = editor.state.doc.textBetween(0, editor.state.doc.content.size, ' ');
        setCounts({
          words,
          chars,
          charsNoSpace: countCharsNoSpace(fullText),
        });
      };
      const updateSelection = () => {
        const { from, to } = editor.state.selection;
        if (from === to) {
          setSelectionCount(null);
          return;
        }
        const slice = editor.state.doc.textBetween(from, to, ' ');
        const trimmed = slice.trim();
        if (!trimmed) {
          setSelectionCount(null);
          return;
        }
        const words = trimmed.split(/\s+/).filter(Boolean).length;
        const chars = countCharsNoSpace(trimmed);
        setSelectionCount({ words, chars });
      };
      // Mark the deepest block ancestor of the current selection with
      // `data-active="true"` so CSS can highlight it. This is the "where
      // am I" cue — survive across renders and resets.
      const markActiveBlock = () => {
        const dom = editor.view.dom as HTMLElement;
        dom.querySelectorAll('[data-active="true"]').forEach((el) => {
          el.removeAttribute('data-active');
        });
        const { from } = editor.state.selection;
        try {
          const $pos = editor.state.doc.resolve(from);
          const depth = $pos.depth;
          // Find the closest block-level NodeDOM that contains the cursor.
          const domAt = editor.view.nodeDOM($pos.before(depth)) as HTMLElement | null;
          const block = domAt?.closest(
            'p, h1, h2, h3, h4, h5, h6, blockquote, pre, ul, ol, li, [data-callout], [data-embed], table',
          ) as HTMLElement | null;
          if (block && dom.contains(block)) {
            block.setAttribute('data-active', 'true');
          }
        } catch {
          /* selection may be transient; ignore */
        }
      };
      const handleSelectionUpdate = () => {
        updateSelection();
        markActiveBlock();
      };
      update();
      updateSelection();
      markActiveBlock();
      editor.on('update', update);
      editor.on('selectionUpdate', handleSelectionUpdate);
      return () => {
        editor.off('update', update);
        editor.off('selectionUpdate', handleSelectionUpdate);
      };
    }, [editor]);

    // ── Save state pulse (visual feedback that editor state has changed) ──
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      if (!editor) return;
      const pulse = () => {
        setSaveState('saving');
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => setSaveState('saved'), 700);
      };
      editor.on('update', pulse);
      return () => {
        editor.off('update', pulse);
        if (saveTimer.current) clearTimeout(saveTimer.current);
      };
    }, [editor]);

    // ── Editable propagation ──
    useEffect(() => {
      if (!editor || editor.isDestroyed || editor.isEditable === editable) return;
      queueMicrotask(() => editor.setEditable(editable));
    }, [editable, editor]);

    // ── TOC propagation ──
    useEffect(() => {
      if (!editor || editor.isDestroyed) return;
      const items = getToCItems(editor);
      onUpdateToC?.(items);
    }, [editor, onUpdateToC]);

    // ── Content parsing + initial load ──
    const parseContent = useCallback(
      (raw: string | object | undefined): string | object | undefined => {
        if (!raw) return undefined;
        if (typeof raw !== 'string') return raw;
        const trimmed = raw.trim();
        if (!trimmed) return undefined;
        if (trimmed.startsWith('<')) return trimmed;
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            return JSON.parse(trimmed);
          } catch {
            return trimmed;
          }
        }
        return trimmed;
      },
      [],
    );

    const initialContentLoadedRef = useRef(false);
    useEffect(() => {
      if (!editor || editor.isDestroyed || initialContentLoadedRef.current) return;
      const parsedContent = parseContent(content);
      if (parsedContent) {
        queueMicrotask(() => {
          if (!editor.isDestroyed) {
            editor.commands.setContent(parsedContent as NonNullable<Content>, false);
            initialContentLoadedRef.current = true;
          }
        });
      } else {
        initialContentLoadedRef.current = true;
      }
    }, [editor, content, parseContent]);

    useEffect(() => {
      return () => {
        editor?.destroy();
      };
    }, [editor]);

    // ── Slash command flag for the empty-state hint ──
    const isEmpty = useMemo(() => {
      if (!editor) return true;
      try {
        return editor.isEmpty;
      } catch {
        return true;
      }
    }, [editor, counts.words]);

    if (!editor) return null;

    const isEditable = editor.isEditable;
    const totalMinutes = readingTime(counts.words);

    return (
      <div className={`at-editor-shell ${wrapperClassName}`} dir={dir} data-dir={dir}>
        {/* ═══ Top command deck ═══════════════════════════════════════════════ */}
        <div className="at-editor-deck" aria-hidden={!isEditable}>
          <div className="at-editor-deck__inner">
            <span className="at-editor-deck__rail" />
            <span className="at-editor-deck__brand">
              <span className="at-editor-deck__brand-dot" />
              ویراستار
            </span>
            <span className="at-editor-deck__sep" aria-hidden />
            <span className="at-editor-deck__hint">
              برای درج بلوک، در ابتدای خط تایپ کنید
              <kbd className="at-editor-deck__kbd">/</kbd>
            </span>
            <span className="at-editor-deck__spacer" />
            <span
              className={`at-editor-deck__save at-editor-deck__save--${saveState}`}
              title={saveState === 'saving' ? 'در حال ذخیره...' : 'ذخیره شد'}
            >
              <span className="at-editor-deck__save-dot" />
              {saveState === 'saving' ? 'در حال ذخیره' : 'ذخیره خودکار'}
            </span>
          </div>
        </div>

        {/* ═══ Stage ════════════════════════════════════════════════════════ */}
        <div className="at-editor-stage">
          {/* Sticky toolbar container — the actual controls live in FixedMenu */}
          {isEditable && (
            <div className="at-editor-toolbar-wrap">
              <FixedMenu
                editor={editor}
                className={`at-editor-toolbar ${toolBarClassName}`}
              />
            </div>
          )}

          {/* The canvas itself — paper feel + ruler */}
          <div className="at-editor-canvas">
            <div className="at-editor-ruler" aria-hidden />
            <div className={`at-editor-paper ${isEmpty ? 'at-editor-paper--empty' : ''}`}>
              <LinkBubbleMenu editor={editor} />
              <TableContextMenu editor={editor} />
              <TextBubbleMenu editor={editor} />
              <TableToolbar editor={editor} />

              <EditorContent
                editor={editor}
                className={`at-editor-prose ${contentClassName}`}
              />

              {/* Floating empty-state hint */}
              {isEmpty && (
                <div className="at-editor-placeholder" aria-hidden>
                  <span className="at-editor-placeholder__kbd">/</span>
                  <span className="at-editor-placeholder__text">
                    برای افزودن بلوک، دستور تایپ کنید — یا شروع به نوشتن کنید
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ Status bar ═══════════════════════════════════════════════════ */}
        {editable && displayWordsCount && (
          <div className={`at-editor-status ${footerClassName}`}>
            <div className="at-editor-status__inner">
              <span className="at-editor-status__item">
                <span className="at-editor-status__dot at-editor-status__dot--emerald" />
                <span className="at-editor-status__num">{toFaDigits(counts.words)}</span>
                <span className="at-editor-status__lbl">کلمه</span>
              </span>

              <span className="at-editor-status__sep" aria-hidden />

              <span className="at-editor-status__item">
                <span className="at-editor-status__dot at-editor-status__dot--cyan" />
                <span className="at-editor-status__num">{toFaDigits(counts.chars)}</span>
                <span className="at-editor-status__lbl">نویسه</span>
              </span>

              <span className="at-editor-status__sep" aria-hidden />

              <span className="at-editor-status__item">
                <span className="at-editor-status__dot at-editor-status__dot--violet" />
                <span className="at-editor-status__num">{totalMinutes}</span>
                <span className="at-editor-status__lbl">زمان مطالعه</span>
              </span>

              {selectionCount && (
                <>
                  <span className="at-editor-status__sep" aria-hidden />
                  <span
                    className="at-editor-status__item at-editor-status__item--selection"
                    aria-live="polite"
                  >
                    <span className="at-editor-status__dot at-editor-status__dot--amber" />
                    <span className="at-editor-status__num">{toFaDigits(selectionCount.words)}</span>
                    <span className="at-editor-status__lbl">کلمه انتخاب</span>
                    <span className="at-editor-status__num-sep" aria-hidden>·</span>
                    <span className="at-editor-status__num">{toFaDigits(selectionCount.chars)}</span>
                    <span className="at-editor-status__lbl">نویسه</span>
                  </span>
                </>
              )}

              <span className="at-editor-status__spacer" />

              <span
                className={`at-editor-status__save at-editor-status__save--${saveState}`}
              >
                <span className="at-editor-status__save-dot" />
                {saveState === 'saving' ? 'در حال ذخیره' : 'همگام‌سازی شد'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  },
);

Editor.displayName = 'Editor';

export default Editor;
