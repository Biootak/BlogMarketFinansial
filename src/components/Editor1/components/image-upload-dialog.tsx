'use client';

import { ImageUploader, type UploadFolder } from '@/components/ImageUpload/ImageUploader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import type { Editor } from '@tiptap/core';
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

export interface ImageUploadDialogRef {
  open: () => void;
  close: () => void;
  /**
   * Pre-fill the dialog with an already-uploaded URL (used by paste/drop).
   * `width` and `height` are accepted so the editor can set intrinsic
   * dimensions without re-probing the image.
   */
  setPending: (url: string, dims?: { width?: number | null; height?: number | null }) => void;
  /**
   * 2026-07-06: target an existing image node for in-place edit. When
   * set, the dialog's Insert button UPDATES the attrs of that node via
   * `tr.setNodeMarkup` instead of inserting a new image with
   * `setImage`. This is what makes the paste/drop flow drop-safe:
   * the image is already in the document (with a placeholder URL) while
   * the upload runs, and the dialog now updates that same node rather
   * than inserting a duplicate.
   *
   * Pass `null` (or omit) to return to plain "insert new image" mode.
   */
  setEditTarget: (nodePos: number | null) => void;
}

interface ImageUploadDialogProps {
  editor: Editor;
  /** controlled open state (used by the slash-command bridge) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** where uploaded files go in storage; defaults to 'posts' */
  folder?: UploadFolder;
  /** whether `alt` is required before insert (a11y strict mode) */
  requireAlt?: boolean;
}

interface PendingUpload {
  url: string;
  width: number | null;
  height: number | null;
}

// 2026-07-07: The upload URL comes from our own `/api/upload` route,
// which already validates files and generates safe paths. A strict
// client-side whitelist was rejecting valid URLs (e.g. Persian filenames
// in GIF/SVG, `http://` dev URLs, query-string cache busters) and
// silently breaking image insertion. We now only guard against empty or
// whitespace-only values and leave URL validation to the server.
function isAcceptableImageUrl(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

const ImageUploadDialog = forwardRef<ImageUploadDialogRef, ImageUploadDialogProps>(
  ({ editor, open: controlledOpen, onOpenChange, folder = 'posts', requireAlt = true }, ref) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : internalOpen;

    const setOpen = useCallback(
      (next: boolean) => {
        if (!isControlled) setInternalOpen(next);
        onOpenChange?.(next);
      },
      [isControlled, onOpenChange],
    );

    // uploaded file metadata kept here so we can attach dimensions and
    // require alt before insert. Reset on close.
    const [pending, setPending] = useState<PendingUpload | null>(null);
    const [alt, setAlt] = useState('');
    const [title, setTitle] = useState('');
    // 2026-07-06: when non-null, Insert will tr.setNodeMarkup on this
    // position instead of inserting a new image. See ImageUploadDialogRef
    // docstring.
    const [editingNodePos, setEditingNodePos] = useState<number | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        open: () => setOpen(true),
        close: () => setOpen(false),
        setPending: (url, dims) => {
          setPending({
            url,
            width: typeof dims?.width === 'number' ? dims.width : null,
            height: typeof dims?.height === 'number' ? dims.height : null,
          });
        },
        setEditTarget: (nodePos) => {
          setEditingNodePos(nodePos);
        },
      }),
      [setOpen],
    );

    // 2026-07-06: guard against double-insertion. The Insert button is
    // type="button" so Enter doesn't auto-submit, but rapid double-clicks
    // (or a synthetic double-fire from React 19 strict-mode reconciliation
    // edge cases) could still call `insertImage` twice before the dialog
    // actually closes. Without this guard, each call would insert a copy
    // of the same image node into the document — exactly the bug where
    // "one upload → multiple images appear on the page".
    //
    // We reset the flag every time the dialog opens so subsequent
    // uploads still work, and we reset on a successful insert.
    const insertedRef = useRef(false);

    // Reset transient state every time the dialog closes, otherwise the
    // next open shows a stale alt/title and a phantom "uploaded" preview.
    // Also reset the insert-guard + edit-target so the next session
    // behaves as a fresh insert (not a stale edit).
    useEffect(() => {
      if (isOpen) {
        insertedRef.current = false;
        return;
      }
      setPending(null);
      setAlt('');
      setTitle('');
      setEditingNodePos(null);
    }, [isOpen]);

    const handleImageUpload = useCallback((urls: string[]) => {
      const first = urls[0];
      if (!first) return;
      if (!isAcceptableImageUrl(first)) {
        toast({
          title: 'خطا در دریافت آدرس تصویر',
          description: 'آدرس بازگشتی از سرور خالی یا نامعتبر است.',
          variant: 'destructive',
        });
        return;
      }
      setPending({ url: first, width: null, height: null });
    }, []);

    const handleUploadComplete = useCallback(
      (files: { url: string; width?: number | null; height?: number | null }[]) => {
        const first = files[0];
        if (!first) return;
        if (!isAcceptableImageUrl(first.url)) {
          toast({
            title: 'خطا در دریافت آدرس تصویر',
            description: 'آدرس بازگشتی از سرور خالی یا نامعتبر است.',
            variant: 'destructive',
          });
          return;
        }
        setPending({
          url: first.url,
          width: typeof first.width === 'number' ? first.width : null,
          height: typeof first.height === 'number' ? first.height : null,
        });
      },
      [],
    );

    const insertImage = useCallback(() => {
      // 2026-07-06: see `insertedRef` above — bail out if a previous
      // invocation in the same open cycle already inserted. This is the
      // single source of truth for "we already inserted this image".
      if (insertedRef.current) return;
      if (!pending) return;
      insertedRef.current = true;
      const trimmedAlt = alt.trim();
      const trimmedTitle = title.trim();
      // پیش‌فرض عرض: 100% ستون (واکنش‌گرا). کاربر با ResizeImage بعداً
      // می‌تواند آن را به px تغییر دهد. ارتفاع intrinsic اگر از upload
      // برگشته، نگه می‌داریم تا renderer بتواند aspect ratio را حفظ کند.
      const newAttrs: Record<string, unknown> = {
        src: pending.url,
        uploadState: 'complete',
        width: '100%',
      };
      if (pending.height && pending.height > 0) newAttrs.height = pending.height;
      if (trimmedAlt) newAttrs.alt = trimmedAlt;
      if (trimmedTitle) newAttrs.title = trimmedTitle;

      if (editingNodePos !== null) {
        // Edit-mode: update the existing image node in place. We use a
        // direct `tr.setNodeMarkup` so we don't disturb the user's
        // selection / cursor. We don't `focus()` first because the
        // dialog is already focused and the user will return to the
        // editor when the dialog closes.
        const tr = editor.state.tr;
        const node = editor.state.doc.nodeAt(editingNodePos);
        if (node) {
          tr.setNodeMarkup(editingNodePos, undefined, {
            ...node.attrs,
            ...newAttrs,
          });
          editor.view.dispatch(tr);
        }
      } else {
        // Standard insert-mode: focus editor, insert fresh image node.
        editor
          .chain()
          .focus()
          .setImage(newAttrs as never)
          .run();
      }
      setOpen(false);
    }, [pending, alt, title, editor, setOpen, editingNodePos]);

    const altMissing = requireAlt && alt.trim().length === 0;
    const canInsert = !!pending && !altMissing;

    // Stable callbacks for ImageUploader (which doesn't need to re-render
    // when alt/title changes — that input is local to this dialog).
    const handleImageRemove = useCallback(() => {
      setPending(null);
    }, []);

    const altId = useId();
    const titleId = useId();

    return (
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>آپلود تصویر</DialogTitle>
            <DialogDescription>
              تصویر خود را انتخاب کنید، سپس متن جایگزین (alt) را برای دسترس‌پذیری وارد کنید.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <ImageUploader
              onImageUpload={handleImageUpload}
              onUploadComplete={handleUploadComplete}
              onImageRemove={handleImageRemove}
              maxFiles={1}
              multiple={false}
              folder={folder}
            />

            {pending && (
              <div className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50 dark:bg-neutral-900/40">
                <div className="space-y-1.5">
                  <Label htmlFor={altId}>
                    متن جایگزین (alt)
                    <span className="text-red-500 ms-1" aria-hidden>
                      *
                    </span>
                  </Label>
                  <Input
                    id={altId}
                    value={alt}
                    onChange={(e) => setAlt(e.target.value)}
                    placeholder="توضیح کوتاه از تصویر برای کاربران نابینا یا موتورهای جستجو"
                    aria-required={requireAlt}
                    aria-invalid={altMissing}
                    aria-describedby={altMissing ? `${altId}-err` : undefined}
                    autoFocus
                  />
                  {altMissing && (
                    <p id={`${altId}-err`} className="text-xs text-red-500" role="alert">
                      متن جایگزین برای دسترس‌پذیری لازم است.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={titleId}>عنوان (اختیاری)</Label>
                  <Input
                    id={titleId}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="tooltip که روی تصویر نمایش داده می‌شود"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button type="button" onClick={insertImage} disabled={!canInsert}>
              درج تصویر
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  },
);

ImageUploadDialog.displayName = 'ImageUploadDialog';

export default ImageUploadDialog;
