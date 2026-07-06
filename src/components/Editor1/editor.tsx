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
import { EditorContent, useEditor } from '@tiptap/react';
import type { Content, EditorOptions } from '@tiptap/core';
import { extensions as builtInExtensions } from './extensions';
import FixedMenu from './components/fixed-menu';
import LinkBubbleMenu from './components/link-bubble-menu';
import TableContextMenu from './components/table-context-menu';
import TextBubbleMenu from './components/text-bubble-menu';
import TableToolbar from './components/table-toolbar';
import TocSidebar from './components/toc-sidebar';
import ImageUploadDialog, {
  type ImageUploadDialogRef,
} from './components/image-upload-dialog';
import { Icon } from '@/components/ui/icon';
import { toast } from '@/components/ui/use-toast';
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
  /**
   * اختیاری — اگر داده شود، editor محتوا را به صورت debounce‌شده در
   * `localStorage[autoSaveKey]` ذخیره می‌کند (پیش‌فرض ۳ ثانیه بعد از
   * آخرین تغییر) و در mount بعدی آن را بازیابی می‌کند.
   *
   * چرا localStorage به‌جای `/api/drafts`:
   *   - فعلاً endpoint نداریم (پروژه draftها را با post status="DRAFT"
   *     ذخیره می‌کند ولی endpoint اختصاصی برای autosave نه).
   *   - حتی با endpoint، localStorage یک fallback فوری برای قطع اینترنت
   *     یا بستن تب است.
   *   - وقتی endpoint اضافه شد، می‌توان auto-save را به آن سوییچ کرد
   *     بدون تغییر در call site.
   *
   * اگر `content` prop هم داده شده باشد، بازیابی انجام نمی‌شود
   * (post واقعی بر local draft优先 دارد).
   */
  autoSaveKey?: string | null;
  /** اختیاری — callback وقتی محتوای draft از localStorage بازیابی شد. */
  onAutoSaveRestore?: (savedAt: number) => void;
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
      autoSaveKey = null,
      onAutoSaveRestore,
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

    // 2026-07-06: refs that bridge paste/drop → upload → dialog.
    // The upload helper needs the dialog ref, the dialog ref is created
    // here. We declare it before mergedEditorProps so the helper closure
    // can capture it.
    const imageDialogRef = useRef<ImageUploadDialogRef | null>(null);

    // 2026-07-06: light XHR upload for paste/drop. We don't reuse
    // `uploadOneFile` from the ImageUploader module because that one is
    // private to the component and tied to its React state — for
    // paste/drop we want fire-and-forget semantics + toasts.
    // Returns the first uploaded file's URL + dimensions, or null on
    // failure (toast already shown to the user).
    const uploadFileSilently = useCallback(
      (file: File): Promise<{ url: string; width: number | null; height: number | null } | null> => {
        return new Promise((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/upload', true);
          const formData = new FormData();
          formData.append('files', file);
          formData.append('folder', 'posts');
          xhr.addEventListener('load', () => {
            try {
              const body = JSON.parse(xhr.responseText) as {
                success?: boolean;
                data?: { files?: { url: string; width: number | null; height: number | null }[] };
                error?: { message?: string };
              };
              if (xhr.status >= 200 && xhr.status < 300 && body.success) {
                const first = body.data?.files?.[0];
                if (first) {
                  resolve({ url: first.url, width: first.width, height: first.height });
                  return;
                }
              }
              toast({
                title: 'خطا در آپلود تصویر',
                description: body.error?.message ?? 'خطای نامشخص',
                variant: 'destructive',
              });
              resolve(null);
            } catch {
              toast({ title: 'خطا در آپلود تصویر', description: 'پاسخ نامعتبر سرور', variant: 'destructive' });
              resolve(null);
            }
          });
          xhr.addEventListener('error', () => {
            toast({ title: 'خطای شبکه', description: 'آپلود تصویر ناموفق بود', variant: 'destructive' });
            resolve(null);
          });
          xhr.send(formData);
        });
      },
      [],
    );

    // 2026-07-06: extract image files from a clipboard / drop event.
    // Returns null if no image is present (so the caller knows to fall
    // through to the default editor behavior).
    const extractImageFiles = useCallback(
      (dt: DataTransfer | null | undefined): File[] => {
        if (!dt) return [];
        const files: File[] = [];
        // `files` is the modern API and works for both paste and drop.
        // `items` is fallback for older browsers / drag-data uris.
        if (dt.files && dt.files.length > 0) {
          for (let i = 0; i < dt.files.length; i++) {
            const f = dt.files.item(i);
            if (f && f.type.startsWith('image/')) files.push(f);
          }
        }
        if (files.length === 0 && dt.items) {
          for (let i = 0; i < dt.items.length; i++) {
            const item = dt.items[i];
            if (item && item.kind === 'file' && item.type.startsWith('image/')) {
              const f = item.getAsFile();
              if (f) files.push(f);
            }
          }
        }
        return files;
      },
      [],
    );

    const handlePastedImage = useCallback(
      async (files: File[]) => {
        if (files.length === 0) return false;
        const file = files[0];
        if (!file) return false;
        // Only handle the first image — multi-image paste into a single
        // editor insertion is a niche case, and the dialog UX is built
        // around one-at-a-time. Extra files are ignored.
        toast({
          title: 'در حال آپلود...',
          description: file.name,
        });
        const result = await uploadFileSilently(file);
        if (!result) return true; // we handled (with error), don't fall through
        imageDialogRef.current?.setPending(result.url, {
          width: result.width,
          height: result.height,
        });
        imageDialogRef.current?.open();
        return true;
      },
      [uploadFileSilently],
    );

    const mergedEditorProps: EditorOptions['editorProps'] = {
      ...editorProps,
      attributes: {
        ...(editorProps as { attributes?: Record<string, string> })?.attributes,
        class: mergedClass,
        dir,
        'data-dir': dir,
      },
      // 2026-07-06: handle image paste. ProseMirror invokes this BEFORE
      // the default paste handler; returning `true` tells it we handled
      // the event and it should not also try to insert the image data
      // (which would yield a base64-embedded <img> — we want the
      // uploaded URL instead).
      handlePaste: (view, event) => {
        const files = extractImageFiles(event.clipboardData);
        if (files.length === 0) return false;
        // Fire-and-forget; the editor stays editable while upload runs.
        void handlePastedImage(files);
        return true;
      },
      // 2026-07-06: handle image drop. Returning `true` suppresses the
      // default drop behavior so we don't end up with both the dropped
      // base64 image AND our uploaded URL.
      handleDrop: (view, event) => {
        const e = event as unknown as DragEvent;
        const files = extractImageFiles(e.dataTransfer);
        if (files.length === 0) return false;
        // Only intercept drops that contain *only* images. If the user
        // is dragging text from elsewhere, let ProseMirror handle it.
        const hasNonImage =
          e.dataTransfer?.types.includes('text/plain') ||
          e.dataTransfer?.types.includes('text/html');
        if (hasNonImage) return false;
        event.preventDefault();
        void handlePastedImage(files);
        return true;
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
    const [tocItems, setTocItems] = useState<TocItem[]>([]);
    const [tocOpen, setTocOpen] = useState(true);
    const [imageUploadOpen, setImageUploadOpen] = useState(false);
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

    // 2026-07-06: Auto-save to localStorage.
    //
    // Why localStorage:
    //   - پروژه endpoint اختصاصی برای autosave ندارد (draftها با status
    //     ذخیره می‌شوند ولی autosave در حین ویرایش نداریم).
    //   - localStorage به‌عنوان یک safety net فوری کار می‌کند: قطع
    //     اینترنت، بستن تب، یا کرش مرورگر → محتوا از دست نمی‌رود.
    //   - وقتی backend draft API اضافه شد، می‌توان همین useEffect را به
    //     fetch('/api/drafts') تغییر داد بدون لمس call site.
    //
    // Flow:
    //   - mount: اگر `content` prop خالی باشد و localStorage چیزی داشته
    //     باشد، آن را لود می‌کنیم (post واقعی بر local draft اولویت دارد).
    //   - update: debounce 3s؛ محتوا + timestamp در localStorage ذخیره
    //     می‌شود.
    //   - unmount: timer لغو می‌شود تا نشتی نداشته باشیم.
    const AUTO_SAVE_DEBOUNCE_MS = 3000;
    const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      if (!editor || !autoSaveKey) return;

      // Restore: فقط وقتی هیچ `content` اولیه‌ای از prop نیامده باشد.
      // وقتی پست واقعی داریم، post سرور بر local draft ارجح است.
      if (!content) {
        try {
          const raw = window.localStorage.getItem(autoSaveKey);
          if (raw) {
            const parsed = JSON.parse(raw) as {
              html?: string;
              savedAt?: number;
            };
            if (parsed.html && typeof parsed.html === 'string') {
              // queueMicrotask: خارج از render فعلی اجرا شود تا با
              // initial content load که خودش در useEffect جداگانه‌ای
              // setContent می‌کند تداخل نکند.
              queueMicrotask(() => {
                if (!editor.isDestroyed) {
                  editor.commands.setContent(parsed.html as string, {
                    emitUpdate: false,
                  });
                  onAutoSaveRestore?.(parsed.savedAt ?? Date.now());
                }
              });
            }
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Auto-save restore failed:', e);
        }
      }

      const handleUpdate = () => {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
          try {
            window.localStorage.setItem(
              autoSaveKey,
              JSON.stringify({
                html: editor.getHTML(),
                savedAt: Date.now(),
              }),
            );
          } catch (e) {
            // QuotaExceeded یا localStorage در دسترس نبودن — silent fail
            // بهتر از کرش کردن ویرایشگر است.
            // eslint-disable-next-line no-console
            console.warn('Auto-save failed:', e);
          }
        }, AUTO_SAVE_DEBOUNCE_MS);
      };

      editor.on('update', handleUpdate);
      return () => {
        editor.off('update', handleUpdate);
        if (autoSaveTimer.current) {
          clearTimeout(autoSaveTimer.current);
          autoSaveTimer.current = null;
        }
      };
    }, [editor, autoSaveKey, content, onAutoSaveRestore]);

    // ── Editable propagation ──
    useEffect(() => {
      if (!editor || editor.isDestroyed || editor.isEditable === editable) return;
      queueMicrotask(() => editor.setEditable(editable));
    }, [editable, editor]);

    // ── TOC propagation ──
    useEffect(() => {
      if (!editor || editor.isDestroyed) return;
      const update = () => {
        const items = getToCItems(editor);
        setTocItems(items);
        onUpdateToC?.(items);
      };
      update();
      editor.on('update', update);
      return () => {
        editor.off('update', update);
      };
    }, [editor, onUpdateToC]);

    // ── Slash command image upload bridge ──
    useEffect(() => {
      if (!editor || editor.isDestroyed) return;
      editor.storage.slashCommands = {
        ...(editor.storage.slashCommands ?? {}),
        openImageUpload: () => setImageUploadOpen(true),
      };
    }, [editor]);

    // ── Content parsing + initial load ──
    // 2026-07-05: در v3 نوع Content فقط string | object | JSONContent[] | null
    // است. به جای undefined/null، رشتهٔ خالی برمی‌گردانیم تا setContent
    // هیچ‌وقت null دریافت نکند.
    const parseContent = useCallback(
      (raw: Content): Content => {
        if (!raw) return '';
        if (typeof raw !== 'string') return raw;
        const trimmed = raw.trim();
        if (!trimmed) return '';
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
      const parsedContent = parseContent(content ?? '');
      if (parsedContent) {
        queueMicrotask(() => {
          if (!editor.isDestroyed) {
            editor.commands.setContent(parsedContent, { emitUpdate: false });
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
              <span className="at-editor-deck__brand-mark" aria-hidden>
                <Icon name="sparkles" size={12} strokeWidth={2} />
              </span>
              ویراستار
            </span>
            <span className="at-editor-deck__sep" aria-hidden />
            <span className="at-editor-deck__hint">
              <Icon name="list" size={11} strokeWidth={2} className="at-editor-deck__hint-ico" />
              برای درج بلوک، در ابتدای خط تایپ کنید
              <kbd className="at-editor-deck__kbd">/</kbd>
            </span>
            <span className="at-editor-deck__spacer" />
            <span
              className={`at-editor-deck__save at-editor-deck__save--${saveState}`}
              title={saveState === 'saving' ? 'در حال ویرایش...' : 'آمادهٔ نوشتن'}
              role="status"
              aria-live="polite"
            >
              {saveState === 'saving' ? (
                <Icon
                  name="loader-2"
                  size={12}
                  strokeWidth={2}
                  className="at-editor-deck__save-ico"
                  aria-hidden
                />
              ) : (
                <Icon
                  name="check-check"
                  size={12}
                  strokeWidth={2}
                  className="at-editor-deck__save-ico"
                  aria-hidden
                />
              )}
              {saveState === 'saving' ? 'در حال ویرایش' : 'آماده'}
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
                tocOpen={tocOpen}
                onToggleToc={() => setTocOpen((v) => !v)}
                hasToc={tocItems.length > 0}
              />
            </div>
          )}

          {/* The canvas itself — paper feel + ruler */}
          <div className="at-editor-canvas">
            <div className="at-editor-ruler" aria-hidden />
            {tocOpen && tocItems.length > 0 && (
              <div className="at-editor-toc-panel">
                <TocSidebar items={tocItems} />
              </div>
            )}
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

        {/* ═══ Image upload dialog ═════════════════════════════════════════
            Mounted at the shell root so it's reachable from anywhere — the
            slash command `تصویر` opens it via `editor.storage.slashCommands.
            openImageUpload()` (wired in the effect above). Placing it here
            (rather than inside the stage) keeps it above editor overlays
            and out of the toolbar's stacking context. */}
        <ImageUploadDialog
          ref={imageDialogRef}
          editor={editor}
          open={imageUploadOpen}
          onOpenChange={setImageUploadOpen}
        />

        {/* ═══ Status bar ═══════════════════════════════════════════════════ */}
        {editable && displayWordsCount && (
          <div className={`at-editor-status ${footerClassName}`}>
            <div className="at-editor-status__inner">
              <span className="at-editor-status__item" title="تعداد کلمات">
                <Icon
                  name="file-text"
                  size={11}
                  strokeWidth={2}
                  className="at-editor-status__ico at-editor-status__ico--emerald"
                />
                <span className="at-editor-status__num">{toFaDigits(counts.words)}</span>
                <span className="at-editor-status__lbl">کلمه</span>
              </span>

              <span className="at-editor-status__sep" aria-hidden />

              <span className="at-editor-status__item" title="تعداد نویسه‌ها">
                <Icon
                  name="text"
                  size={11}
                  strokeWidth={2}
                  className="at-editor-status__ico at-editor-status__ico--cyan"
                />
                <span className="at-editor-status__num">{toFaDigits(counts.chars)}</span>
                <span className="at-editor-status__lbl">نویسه</span>
              </span>

              <span className="at-editor-status__sep" aria-hidden />

              <span className="at-editor-status__item" title="زمان تقریبی مطالعه">
                <Icon
                  name="clock"
                  size={11}
                  strokeWidth={2}
                  className="at-editor-status__ico at-editor-status__ico--violet"
                />
                <span className="at-editor-status__num">{totalMinutes}</span>
                <span className="at-editor-status__lbl">زمان مطالعه</span>
              </span>

              {selectionCount && (
                <>
                  <span className="at-editor-status__sep" aria-hidden />
                  <span
                    className="at-editor-status__item at-editor-status__item--selection"
                    aria-live="polite"
                    title="آمار انتخاب فعلی"
                  >
                    <Icon
                      name="highlighter"
                      size={11}
                      strokeWidth={2}
                      className="at-editor-status__ico at-editor-status__ico--amber"
                    />
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
                role="status"
                aria-live="polite"
              >
                {saveState === 'saving' ? (
                  <Icon
                    name="loader-2"
                    size={11}
                    strokeWidth={2.25}
                    className="at-editor-status__save-ico"
                    aria-hidden
                  />
                ) : (
                  <Icon
                    name="check-check"
                    size={11}
                    strokeWidth={2}
                    className="at-editor-status__save-ico"
                    aria-hidden
                  />
                )}
                {saveState === 'saving' ? 'در حال ویرایش' : 'آماده'}
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
