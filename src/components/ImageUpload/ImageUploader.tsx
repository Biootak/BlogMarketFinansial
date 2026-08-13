'use client';

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type FileRejection, useDropzone } from 'react-dropzone';

import { toast } from '@/components/ui/use-toast';
import { FOLDER_TO_DEFAULT_SLOT, getSlot } from '@/lib/image-slots';
import type { ImageSlotId } from '@/lib/image-slots';
import {
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiImageAddLine,
  RiUploadCloud2Line,
} from 'react-icons/ri';
import s from './ImageUploader.module.css';

// Re-export UploadFolder so callers only need to import from this module.
// Keeps the dependency graph clean: components → uploader (not components →
// server-action for a type).
export type UploadFolder =
  | 'posts'
  | 'avatars'
  | 'categories'
  | 'tags'
  | 'ads'
  | 'general'
  | 'kyc'
  | 'logos'
  | 'exchange';

/** شناسه‌ی اسلات تصویر از رجیستری مرکزی (image-slots.ts). */
export type { ImageSlotId } from '@/lib/image-slots';

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
// 2026-08-13: SVG removed from the allowlist to match the server (C5 fix —
// SVG was dropped server-side because a sanitized regex blocklist is
// trivially bypassable and SVG executes as a document). Keep client and
// server allowlists identical.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
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
  slot?: ImageSlotId,
): Promise<XhrResult> {
  return new Promise<XhrResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    const formData = new FormData();
    formData.append('files', file);
    formData.append('folder', folder);
    if (slot) {
      formData.append('slot', slot);
    }

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

export type ThumbnailSize = 'sm' | 'md' | 'lg' | 'xl';

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
  /**
   * اندازهٔ نمایش thumbnail فایل آپلودشده:
   *  - 'sm' (64px)  — لیست‌های چندگانه (پست‌ها، تبلیغات)
   *  - 'md' (96px)  — پیش‌فرض
   *  - 'lg' (160px) — فرم‌های تک‌فایل (KYC، پروفایل)
   *  - 'xl' (240px) — context تأیید/بررسی
   */
  thumbSize?: ThumbnailSize;
  /**
   * برچسب بالای dropzone — برای context فرمی.
   * اگر ندهید، نمایش داده نمی‌شود.
   */
  label?: string;
  /**
   * راهنمای کوچک زیر برچسب.
   */
  hint?: string;
  /**
   * غیرفعال‌سازی کل اپلودر (مثلاً حین submit فرم).
   */
  disabled?: boolean;
  /**
   * شناسه‌ی اسلات تصویر از رجیستری مرکزی (image-slots.ts).
   * وقتی داده شود، سرور تصویر را با smart-crop به نسبت استاندارد نرمال‌سازی
   * می‌کند و hint مناسب خودکار نمایش داده می‌شود.
   * اگه ندهید، از نگاشت فولدر→اسلات پیش‌فرض استفاده می‌شود.
   */
  slot?: ImageSlotId;
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
  thumbSize = 'md',
  label,
  hint,
  disabled = false,
  slot,
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

  // Mirror of `entries` in a ref so async handlers (remove, retry) can
  // read the current list without depending on a stale closure. Updated
  // on every render.
  const entriesRef = useRef<FileEntry[]>(entries);
  entriesRef.current = entries;

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
            slot,
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
    [folder, slot, onImageUpload, onUploadComplete, updateEntry],
  );

  // ---------- dropzone ----------------------------------------------------

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (disabled) return;

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
    [multiple, maxFiles, runUpload, disabled],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    noClick: disabled,
    noKeyboard: disabled,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
    },
    maxFiles: multiple ? maxFiles : 1,
    multiple,
  });

  // ---------- remove ------------------------------------------------------

  const removeImage = useCallback(
    (id: string) => {
      if (disabled) return;

      // Abort if still uploading.
      const ctrl = abortersRef.current.get(id);
      if (ctrl) {
        ctrl.abort();
        abortersRef.current.delete(id);
      }

      // Compute the index BEFORE updating state so we can mirror the
      // removal in the parent state without calling onImageRemove from
      // inside a setState updater (which React 19+ flags as a render-time
      // setState in another component).
      const idx = entriesRef.current.findIndex((e) => e.id === id);

      setEntries((prev) => {
        const next = prev.filter((e) => e.id !== id);
        const removed = prev.find((e) => e.id === id);
        if (removed?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(removed.previewUrl);
        return next;
      });

      // Mirror removal in parent state — after the local update is
      // committed, so React doesn't see cross-component setState during
      // a parent's render.
      if (idx >= 0) onImageRemove(idx);
    },
    [onImageRemove, disabled],
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

  const anyUploading = useMemo(() => entries.some((e) => e.status === 'uploading'), [entries]);
  const hasEntries = entries.length > 0;

  // Map thumbSize prop → CSS module class (ابعاد explicit px) و سایز
  // آیکون‌ها. سایز بزرگ‌تر (lg/xl) برای context فرمی تک‌فایل (KYC) است.
  //
  // دلیل استفاده از CSS module به جای Tailwind: کلاس‌های dynamic مثل
  // `w-60 h-60` در purge سالم می‌ماند ولی اگر Tailwind v4 در scan fail شود
  // یا dynamic class حذف شود، thumbnail ارتفاع/عرض خود را از دست می‌دهد.
  // CSS module چون static است این ریسک را ندارد.
  const thumbClass = (() => {
    switch (thumbSize) {
      case 'sm':
        return s.thumbSm;
      case 'lg':
        return s.thumbLg;
      case 'xl':
        return s.thumbXl;
      default:
        return s.thumbMd;
    }
  })();
  const isLargeThumb = thumbSize === 'lg' || thumbSize === 'xl';
  const isSmThumb = thumbSize === 'sm';
  const removeIconSize = isSmThumb ? 12 : 16;

  // ---------- render ------------------------------------------------------

  const zonePadding = hasEntries
    ? isLargeThumb
      ? s.zoneWithFileLarge
      : s.zoneWithFile
    : isLargeThumb
      ? s.zoneLarge
      : s.zoneCompact;

  // Per-slot guidance: وقتی slot مشخص باشد از رجیستری مرکزی می‌خوانیم
  // تا آپلود و نمایش همیشه هماهنگ باشند. اگه slot ندهند، از نگاشت
  // فولدر→اسلات پیش‌فرض استفاده می‌کنیم.
  const resolvedSlot = slot ?? FOLDER_TO_DEFAULT_SLOT[folder] ?? 'custom';
  const slotConfig = getSlot(resolvedSlot);
  const effectiveHint = hint ?? (slotConfig.id === 'custom' ? undefined : slotConfig.hint);

  return (
    <div className={s.root} data-disabled={disabled ? 'true' : undefined} aria-disabled={disabled}>
      {(label || effectiveHint) && (
        <div className={s.head}>
          {label && <div className={s.headLabel}>{label}</div>}
          {effectiveHint && <div className={s.headHint}>{effectiveHint}</div>}
        </div>
      )}

      <div
        {...getRootProps()}
        className={[
          s.zone,
          zonePadding,
          isDragActive ? s.zoneActive : '',
          disabled ? s.zoneDisabled : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="منطقه آپلود تصویر. فایل را بکشید یا کلیک کنید."
      >
        <input {...getInputProps()} aria-label="انتخاب فایل تصویر" />
        {hasEntries ? (
          <div className={[s.grid, isLargeThumb ? s.gridLarge : ''].filter(Boolean).join(' ')}>
            {entries.map((entry) => (
              <div key={entry.id} className={[s.thumb, thumbClass].join(' ')}>
                {/* Dynamic user upload (blob: or relative URL not in next.config remotePatterns) */}
                <img
                  src={entry.previewUrl}
                  alt={entry.file.name || 'پیش‌نمایش'}
                  loading="lazy"
                  draggable={false}
                  className={[s.thumbImg, entry.status === 'error' ? s.thumbImgError : '']
                    .filter(Boolean)
                    .join(' ')}
                />

                {/* status overlay — uploading */}
                {entry.status === 'uploading' && (
                  <div
                    className={s.uploadingOverlay}
                    role="progressbar"
                    aria-valuenow={entry.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`در حال آپلود ${entry.file.name}`}
                  >
                    <RiUploadCloud2Line className="animate-pulse" size={18} aria-hidden />
                    <span className={s.uploadingPct}>
                      {entry.progress >= 100 ? 'در حال پردازش…' : `${entry.progress}%`}
                    </span>
                  </div>
                )}

                {/* status overlay — error (click to retry) */}
                {entry.status === 'error' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      retryEntry(entry.id);
                    }}
                    className={s.errorOverlay}
                    title={entry.errorMessage ?? 'خطا — برای تلاش مجدد کلیک کنید'}
                  >
                    <RiErrorWarningLine size={18} />
                    <span>تلاش مجدد</span>
                  </button>
                )}

                {/* done badge */}
                {entry.status === 'done' && (
                  <div
                    className={[s.doneBadge, isSmThumb ? s.doneBadgeSm : '']
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <RiCheckLine size={10} />
                    <span>آپلود شد</span>
                  </div>
                )}

                {/* remove button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(entry.id);
                  }}
                  disabled={disabled}
                  aria-label={`حذف ${entry.file.name}`}
                  className={[s.removeBtn, isSmThumb ? s.removeBtnSm : s.removeBtnMd].join(' ')}
                >
                  <RiCloseLine size={removeIconSize} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={s.empty}>
            <RiImageAddLine size={isLargeThumb ? 56 : 48} className={s.emptyIcon} aria-hidden />
            <p className={[s.emptyTitle, isLargeThumb ? s.emptyTitleLarge : ''].join(' ')}>
              {isDragActive
                ? 'فایل تصویر را اینجا رها کنید…'
                : multiple
                  ? 'برای انتخاب تصاویر، فایل‌ها را اینجا بکشید و رها کنید یا کلیک کنید'
                  : 'برای انتخاب تصویر، فایل را اینجا بکشید و رها کنید یا کلیک کنید'}
            </p>
            <p className={s.emptyHint}>فرمت‌های مجاز: JPG, PNG, GIF, WebP — حداکثر ۱۰MB</p>
          </div>
        )}
      </div>

      {/* Aggregate progress cue for the whole batch.
          Per-file progress is on each thumbnail; this is a quick visual
          confirmation for the user when the batch is still in flight. */}
      {anyUploading && (
        <div className={s.progress} role="status" aria-live="polite">
          <RiUploadCloud2Line className="animate-pulse" size={20} aria-hidden />
          <span>در حال آپلود…</span>
        </div>
      )}
    </div>
  );
};

export { ImageUploader };
