'use client';

/**
 * LogoUploader — آپلودر inline برای لوگوی صرافی.
 *
 *  الگوی استفاده:
 *  ─────────────────────────────────────────────
 *  - drag & drop یا کلیک روی dropzone
 *  - preview بزرگ قبل/بعد از آپلود
 *  - progress bar در حین آپلود
 *  - حذف/جایگزینی
 *  - URL اختیاری (در کنار آپلود)
 *
 *  پس از آپلود موفق، URL را به `onUploaded(url)` پاس می‌دهد.
 *  والد URL را در state لوکال نگه می‌دارد و در نهایت به server action پاس می‌دهد.
 *
 *  folder = 'logos' (پوشه‌ی اختصاصی صراف‌ها در S3)
 */

import { CheckCircle2, ExternalLink, ImagePlus, Loader2, Upload, X } from 'lucide-react';
import { useCallback, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import s from './LogoUploader.module.css';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface LogoUploaderProps {
  /** URL فعلی (ممکن است خالی باشد) */
  value: string;
  /** Callback پس از آپلود موفق */
  onUploaded: (url: string) => void;
  /** Callback هنگام حذف (والد می‌تواند state را reset کند) */
  onRemoved: () => void;
  /** آیا کاربر دسترسی ویرایش دارد؟ */
  disabled?: boolean;
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB — لوگو معمولاً کوچک است

export default function LogoUploader({
  value,
  onUploaded,
  onRemoved,
  disabled = false,
}: LogoUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // ── اعتبارسنجی سمت کلاینت (UX، نه امنیت — سرور هم چک می‌کند) ─────
  const validate = useCallback((file: File): string | null => {
    if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
      return `فرمت ${file.type || 'نامشخص'} پشتیبانی نمی‌شود. فرمت‌های مجاز: PNG، JPG، WebP، GIF`;
    }
    if (file.size > MAX_SIZE) {
      return 'حجم فایل بیش از ۵ مگابایت است';
    }
    return null;
  }, []);

  // ── آپلود XHR با progress واقعی ────────────────────────────────────
  const upload = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) {
        setStatus('error');
        setErrorMsg(err);
        return;
      }

      setStatus('uploading');
      setProgress(0);
      setErrorMsg(null);

      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('files', file);
      formData.append('folder', 'logos');

      xhr.open('POST', '/api/upload', true);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const body = JSON.parse(xhr.responseText) as {
            success: boolean;
            data?: { files?: Array<{ url: string }> };
            error?: { message: string };
          };
          if (xhr.status >= 200 && xhr.status < 300 && body.success) {
            const url = body.data?.files?.[0]?.url;
            if (!url) {
              setStatus('error');
              setErrorMsg('پاسخ سرور نامعتبر است');
              return;
            }
            setStatus('success');
            setProgress(100);
            onUploaded(url);
            // بعد از ۱.۵ ثانیه success state را idle کن
            window.setTimeout(() => {
              setStatus((cur) => (cur === 'success' ? 'idle' : cur));
            }, 1500);
          } else {
            setStatus('error');
            setErrorMsg(body.error?.message ?? 'خطا در آپلود');
          }
        } catch {
          setStatus('error');
          setErrorMsg('پاسخ نامعتبر از سرور');
        }
      });

      xhr.addEventListener('error', () => {
        setStatus('error');
        setErrorMsg('خطای شبکه');
      });

      xhr.addEventListener('abort', () => {
        setStatus('idle');
        setProgress(0);
      });

      xhr.send(formData);
    },
    [onUploaded, validate],
  );

  // ── Event handlers ──────────────────────────────────────────────────
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
      // reset input برای اجازه‌ی آپلود مجدد همان فایل
      if (inputRef.current) inputRef.current.value = '';
    },
    [upload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) upload(file);
    },
    [upload, disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;
      setDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleReplace = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleRemove = useCallback(() => {
    onRemoved();
    setStatus('idle');
    setProgress(0);
    setErrorMsg(null);
  }, [onRemoved]);

  const isUploading = status === 'uploading';
  const hasLogo = Boolean(value);

  return (
    <div className={s.root} data-disabled={disabled || undefined}>
      <div className={s.layout}>
        {/* ── Preview ────────────────────────────────────────────────── */}
        <div className={s.preview} aria-hidden={!hasLogo}>
          {hasLogo ? (
            // biome-ignore lint/performance/noImgElement: dynamic user URL
            <img src={value} alt="" className={s.previewImg} />
          ) : (
            <div className={s.placeholder}>
              <ImagePlus size={28} strokeWidth={1.5} />
            </div>
          )}
          {isUploading && (
            <div className={s.uploadingOverlay} role="status" aria-live="polite">
              <Loader2 size={22} className={s.spin} />
              <span className={s.uploadingPct}>{progress}٪</span>
            </div>
          )}
          {status === 'success' && (
            <div className={s.successBadge} role="status" aria-live="polite">
              <CheckCircle2 size={14} />
              <span>آپلود شد</span>
            </div>
          )}
        </div>

        {/* ── Drop zone + actions ────────────────────────────────────── */}
        <div className={s.zone}>
          <div
            className={cn(s.dropzone, dragOver && s.dropzoneOver, disabled && s.dropzoneDisabled)}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleReplace}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label="منطقه آپلود لوگو — فایل را بکشید یا کلیک کنید"
            aria-disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleReplace();
              }
            }}
          >
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple={false}
              onChange={handleFileChange}
              disabled={disabled || isUploading}
              className={s.fileInput}
              aria-label="انتخاب فایل لوگو"
            />
            <div className={s.zoneIcon}>
              <Upload size={18} strokeWidth={1.75} />
            </div>
            <div className={s.zoneText}>
              <span className={s.zonePrimary}>
                {isUploading
                  ? 'در حال آپلود…'
                  : hasLogo
                    ? 'جایگزینی لوگو'
                    : 'لوگو را اینجا بکشید'}
              </span>
              <span className={s.zoneSecondary}>
                یا کلیک کنید · PNG، JPG، WebP، GIF · حداکثر ۵MB
              </span>
            </div>
          </div>

          {/* ── progress bar (uploading) ─────────────────────────────── */}
          {isUploading && (
            <div
              className={s.progressBar}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className={s.progressFill} style={{ width: `${progress}%` }} />
            </div>
          )}

          {/* ── error message ────────────────────────────────────────── */}
          {status === 'error' && errorMsg && (
            <p className={s.errorMsg} role="alert">
              {errorMsg}
            </p>
          )}

          {/* ── action row (replace / remove / view) ─────────────────── */}
          {hasLogo && !isUploading && (
            <div className={s.actions}>
              <button
                type="button"
                className={s.actionPrimary}
                onClick={handleReplace}
                disabled={disabled}
              >
                <Upload size={13} aria-hidden />
                جایگزینی
              </button>
              <button
                type="button"
                className={s.actionGhost}
                onClick={handleRemove}
                disabled={disabled}
              >
                <X size={13} aria-hidden />
                حذف
              </button>
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className={s.actionLink}
                aria-label="مشاهده لوگو در تب جدید"
              >
                <ExternalLink size={13} aria-hidden />
                مشاهده
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
