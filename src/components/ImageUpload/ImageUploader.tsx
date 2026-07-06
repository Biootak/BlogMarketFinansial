'use client';

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import Image from 'next/image';

import {
  RiUploadCloud2Line,
  RiImageAddLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiCheckLine,
} from 'react-icons/ri';
import { motion, AnimatePresence } from '@/lib/motion-shim';
import { toast } from '@/components/ui/use-toast';

// Re-export UploadFolder so callers only need to import from this module.
// Keeps the dependency graph clean: components → uploader (not components →
// server-action for a type).
export type UploadFolder =
  | 'posts'
  | 'avatars'
  | 'categories'
  | 'tags'
  | 'ads'
  | 'general';

export interface UploadedFile {
  url: string;
  width?: number | null;
  height?: number | null;
}

interface UploadApiSuccess {
  url: string;
  s3Url: string | null;
  localPath: string;
  filename: string;
  size: number;
  width: number | null;
  height: number | null;
  mime: string;
}
interface UploadApiFailure {
  filename?: string;
  code: string;
  message: string;
}
interface UploadApiResponse {
  success: boolean;
  data?: {
    files: UploadApiSuccess[];
    failures?: UploadApiFailure[];
    message?: string;
  };
  error?: { code: string; message: string; details?: UploadApiFailure[] };
}

// ---------- pre-upload validation (UX, not security) ----------------------
// Same rules the server enforces. Checking here gives instant feedback and
// saves a round-trip on the common case of "wrong file picked".
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ClientValidationError {
  file: File;
  reason: string;
}

function validateClientSide(files: File[]): { ok: File[]; bad: ClientValidationError[] } {
  const ok: File[] = [];
  const bad: ClientValidationError[] = [];
  for (const f of files) {
    if (!ALLOWED_TYPES.includes(f.type as (typeof ALLOWED_TYPES)[number])) {
      bad.push({ file: f, reason: `نوع فایل ${f.type || 'نامشخص'} مجاز نیست` });
      continue;
    }
    if (f.size > MAX_FILE_SIZE) {
      bad.push({ file: f, reason: 'حجم فایل بیشتر از ۱۰ مگابایت است' });
      continue;
    }
    ok.push(f);
  }
  return { ok, bad };
}

// ---------- XHR upload with real progress ---------------------------------
// `fetch` does not expose upload progress. XHR does via `upload.onprogress`,
// which is what gives users the moving progress bar they expect. We also
// abort per-file via AbortController so removing a file mid-flight actually
// stops the network transfer, not just the UI.
interface XhrResult {
  file: File;
  status: number;
  body: UploadApiResponse;
}

function uploadOneFile(
  file: File,
  folder: UploadFolder,
  onProgress: (loaded: number, total: number) => void,
  signal: AbortSignal,
): Promise<XhrResult> {
  return new Promise<XhrResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    const formData = new FormData();
    formData.append('files', file);
    formData.append('folder', folder);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    });

    xhr.addEventListener('load', () => {
      let body: UploadApiResponse;
      try {
        body = JSON.parse(xhr.responseText) as UploadApiResponse;
      } catch {
        reject(new Error('پاسخ نامعتبر از سرور'));
        return;
      }
      resolve({ file, status: xhr.status, body });
    });

    xhr.addEventListener('error', () => reject(new Error('خطای شبکه')));
    xhr.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));

    signal.addEventListener('abort', () => {
      xhr.abort();
    });

    xhr.send(formData);
  });
}

// ---------- component ------------------------------------------------------

interface ImageUploaderProps {
  onImageUpload: (urls: string[]) => void;
  onImageRemove: (index: number) => void;
  maxFiles?: number;
  multiple?: boolean;
  initialPreviews?: string[];
  folder?: UploadFolder;
  /**
   * اختیاری — اگر داده شود، بعد از هر آپلود موفق، اطلاعات کامل هر فایل
   * (url، width، height) هم به این کالبک پاس داده می‌شود.
   * برای فرم‌هایی که ابعاد تصویر را در DB ذخیره می‌کنند (مثل تبلیغات).
   */
  onUploadComplete?: (results: UploadedFile[]) => void;
}

interface FileEntry {
  id: string;
  file: File;
  previewUrl: string;
  status: 'queued' | 'uploading' | 'done' | 'error';
  progress: number; // 0..100
  errorMessage?: string;
  uploaded?: UploadedFile;
}

let fileIdCounter = 0;
function nextFileId(): string {
  fileIdCounter += 1;
  return `f${Date.now().toString(36)}-${fileIdCounter}`;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  onImageRemove,
  onUploadComplete,
  maxFiles = 1,
  multiple = false,
  initialPreviews = [],
  folder = 'general',
}) => {
  // Stable id-keyed map of file entries. We don't store File[] directly
  // because we need per-file status/progress and want to remove items
  // without index gymnastics.
  const [entries, setEntries] = useState<FileEntry[]>(() =>
    initialPreviews.map((url) => ({
      id: nextFileId(),
      file: new File([], url, { type: 'image/*' }), // synthetic; only url matters here
      previewUrl: url,
      status: 'done' as const,
      progress: 100,
      uploaded: { url },
    })),
  );

  // Track in-flight XHRs so we can abort on unmount or remove.
  const abortersRef = useRef<Map<string, AbortController>>(new Map());

  // Revoke object URLs on unmount to avoid memory leaks.
  useEffect(() => {
    return () => {
      for (const [, ctrl] of abortersRef.current) ctrl.abort();
      abortersRef.current.clear();
      for (const e of entries) {
        if (e.previewUrl.startsWith('blob:')) URL.revokeObjectURL(e.previewUrl);
      }
    };
    // entries intentionally excluded — we only want this on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- upload pipeline ---------------------------------------------

  const updateEntry = useCallback((id: string, patch: Partial<FileEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const runUpload = useCallback(
    async (toUpload: FileEntry[]) => {
      // Mark all as uploading
      setEntries((prev) =>
        prev.map((e) =>
          toUpload.some((u) => u.id === e.id)
            ? { ...e, status: 'uploading' as const, progress: 0, errorMessage: undefined }
            : e,
        ),
      );

      // Launch all uploads in parallel. We catch each promise individually
      // so one failure doesn't short-circuit the others.
      const tasks = toUpload.map(async (entry) => {
        const controller = new AbortController();
        abortersRef.current.set(entry.id, controller);
        try {
          const result = await uploadOneFile(
            entry.file,
            folder,
            (loaded, total) => {
              const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
              updateEntry(entry.id, { progress: pct });
            },
            controller.signal,
          );

          if (result.status >= 200 && result.status < 300 && result.body.success) {
            const first = result.body.data?.files?.[0];
            if (!first) {
              throw new Error('پاسخ سرور فاقد فایل است');
            }
            updateEntry(entry.id, {
              status: 'done',
              progress: 100,
              uploaded: {
                url: first.url,
                width: first.width,
                height: first.height,
              },
              previewUrl: first.url,
            });
            return { id: entry.id, ok: true as const, uploaded: first };
          }

          // Server-side failure
          const errMsg = result.body.error?.message ?? 'خطا در آپلود';
          updateEntry(entry.id, { status: 'error', errorMessage: errMsg });
          return { id: entry.id, ok: false as const, message: errMsg };
        } catch (err) {
          const message =
            err instanceof Error && err.name === 'AbortError'
              ? 'لغو شد'
              : err instanceof Error
                ? err.message
                : 'خطای نامشخص';
          updateEntry(entry.id, {
            status: 'error',
            errorMessage: message,
          });
          return { id: entry.id, ok: false as const, message };
        } finally {
          abortersRef.current.delete(entry.id);
        }
      });

      const outcomes = await Promise.all(tasks);
      const successOutcomes = outcomes.filter((o): o is Extract<typeof o, { ok: true }> => o.ok);

      // Notify parent — only successful uploads.
      if (successOutcomes.length > 0) {
        const urls = successOutcomes.map((o) => o.uploaded.url);
        onImageUpload(urls);
        onUploadComplete?.(
          successOutcomes.map((o) => ({
            url: o.uploaded.url,
            width: o.uploaded.width,
            height: o.uploaded.height,
          })),
        );

        // Aggregate toast — only one notification per batch.
        const failed = outcomes.length - successOutcomes.length;
        if (failed === 0) {
          toast({
            title: 'موفقیت',
            description: `${successOutcomes.length} فایل با موفقیت آپلود شد`,
            variant: 'success',
          });
        } else {
          toast({
            title: 'آپلود با خطای جزئی',
            description: `${successOutcomes.length} موفق، ${failed} ناموفق. برای جزئیات روی فایل‌های قرمز کلیک کنید.`,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'خطا در آپلود',
          description: 'هیچ فایلی آپلود نشد. لطفاً دوباره تلاش کنید.',
          variant: 'destructive',
        });
      }
    },
    [folder, onImageUpload, onUploadComplete, updateEntry],
  );

  // ---------- dropzone ----------------------------------------------------

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        // react-dropzone's own validation (mime/size at the edge).
        const firstReason = rejectedFiles[0]?.errors[0]?.message ?? 'فایل نامعتبر';
        toast({
          title: 'خطا',
          description: firstReason,
          variant: 'destructive',
        });
      }

      if (acceptedFiles.length === 0) return;

      // Pre-validate (UX, not security) and surface individual issues.
      const { ok, bad } = validateClientSide(acceptedFiles);
      if (bad.length > 0) {
        toast({
          title: `${bad.length} فایل رد شد`,
          description: bad.map((b) => `${b.file.name}: ${b.reason}`).join(' • '),
          variant: 'destructive',
        });
      }
      if (ok.length === 0) return;

      // Cap to maxFiles (drop extras rather than reject the whole batch).
      const capped = multiple ? ok.slice(0, maxFiles) : [ok[0]!];

      // Build new entries with object-URL previews.
      const newEntries: FileEntry[] = capped.map((file) => ({
        id: nextFileId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'queued' as const,
        progress: 0,
      }));

      setEntries((prev) => {
        const base = multiple ? prev : [];
        return [...base, ...newEntries].slice(0, maxFiles);
      });

      // Kick off uploads immediately.
      void runUpload(newEntries);
    },
    [multiple, maxFiles, runUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/svg+xml': ['.svg'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
    },
    maxFiles: multiple ? maxFiles : 1,
    multiple,
  });

  // ---------- remove ------------------------------------------------------

  const removeImage = useCallback(
    (id: string) => {
      // Abort if still uploading.
      const ctrl = abortersRef.current.get(id);
      if (ctrl) {
        ctrl.abort();
        abortersRef.current.delete(id);
      }

      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === id);
        if (idx === -1) return prev;
        const entry = prev[idx]!;
        if (entry.previewUrl.startsWith('blob:')) URL.revokeObjectURL(entry.previewUrl);
        const next = prev.filter((e) => e.id !== id);
        // Mirror removal in parent state.
        onImageRemove(idx);
        return next;
      });
    },
    [onImageRemove],
  );

  const retryEntry = useCallback(
    (id: string) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;
      void runUpload([entry]);
    },
    [entries, runUpload],
  );

  // ---------- derived -----------------------------------------------------

  const anyUploading = useMemo(
    () => entries.some((e) => e.status === 'uploading'),
    [entries],
  );
  const hasEntries = entries.length > 0;

  // ---------- render ------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 ${
          isDragActive
            ? 'border-secondary-500 bg-secondary-50 dark:bg-secondary-950/20'
            : 'border-neutral-300 dark:border-neutral-700 hover:border-primary-500'
        }`}
        aria-label="منطقه آپلود تصویر. فایل را بکشید یا کلیک کنید."
      >
        <input {...getInputProps()} aria-label="انتخاب فایل تصویر" />
        {hasEntries ? (
          <div className="flex flex-wrap gap-2 justify-center">
            <AnimatePresence initial={false}>
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.25 }}
                  className="relative w-24 h-24 group"
                >
                  <Image
                    src={entry.previewUrl}
                    alt={entry.file.name || 'پیش‌نمایش'}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    className={`rounded object-cover ${
                      entry.status === 'error' ? 'opacity-50' : ''
                    }`}
                    unoptimized={entry.previewUrl.startsWith('blob:')}
                  />

                  {/* status overlay */}
                  {entry.status === 'uploading' && (
                    <div
                      className="absolute inset-0 bg-black/50 rounded flex flex-col items-center justify-center text-white text-xs gap-1"
                      role="progressbar"
                      aria-valuenow={entry.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`در حال آپلود ${entry.file.name}`}
                    >
                      <RiUploadCloud2Line className="animate-pulse" size={18} />
                      <span>{entry.progress}%</span>
                    </div>
                  )}

                  {entry.status === 'error' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        retryEntry(entry.id);
                      }}
                      className="absolute inset-0 bg-red-500/80 rounded flex flex-col items-center justify-center text-white text-xs gap-1 hover:bg-red-500/90 transition"
                      title={entry.errorMessage ?? 'خطا — برای تلاش مجدد کلیک کنید'}
                    >
                      <RiErrorWarningLine size={18} />
                      <span>تلاش مجدد</span>
                    </button>
                  )}

                  {entry.status === 'done' && (
                    <div className="absolute bottom-0 inset-x-0 bg-emerald-500/90 text-white text-[10px] py-0.5 flex items-center justify-center gap-1 rounded-b">
                      <RiCheckLine size={10} />
                      <span>آپلود شد</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(entry.id);
                    }}
                    aria-label={`حذف ${entry.file.name}`}
                    className="absolute top-0 right-0 bg-primary-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                  >
                    <RiCloseLine size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <RiImageAddLine className="text-5xl text-neutral-400 mb-2" size={48} aria-hidden />
            <p className="text-neutral-700 dark:text-neutral-300">
              {isDragActive
                ? 'فایل تصویر را اینجا رها کنید...'
                : multiple
                  ? 'برای انتخاب تصاویر، فایل‌ها را اینجا بکشید و رها کنید یا کلیک کنید'
                  : 'برای انتخاب تصویر، فایل را اینجا بکشید و رها کنید یا کلیک کنید'}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              فرمت‌های مجاز: JPG, PNG, GIF, WebP, SVG — حداکثر ۱۰MB
            </p>
          </div>
        )}
      </div>

      {/* Aggregate progress bar for the whole batch.
          Per-file progress is shown on each thumbnail; this is a quick visual
          cue for the user when the batch is still in flight. */}
      {anyUploading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400"
          role="status"
          aria-live="polite"
        >
          <RiUploadCloud2Line className="animate-pulse" size={20} aria-hidden />
          <span>در حال آپلود...</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export { ImageUploader };
