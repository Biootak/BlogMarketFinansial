import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/core';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ExternalLink,
  Maximize2,
  Minimize2,
  Trash2,
} from 'lucide-react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDirection } from '@/hooks/useDirection';

// 2026-06-30: This component intentionally uses a plain <img> tag.
// The editor image is resized interactively and its natural aspect ratio
// is unknown at render time. next/image requires both width and height
// (or a fixed fill container) to avoid layout shift, which would force
// us to either crop the image to a guessed aspect ratio or measure it
// with an extra render pass. Lazy loading and alt text are still handled
// explicitly below.

interface ImageNodeAttributes {
  src: string;
  alt?: string | null;
  width?: string | number | null;
  title?: string | null;
  textAlign?: 'left' | 'right' | 'center';
}

type ResizeImageProps = NodeViewProps & {
  node: NodeViewProps['node'] & {
    attrs: ImageNodeAttributes;
  };
};

// 2026-07-06: عرض تصویر در storage سه شکل دارد:
//   - '100%'  → عرض کامل ستون (پیش‌فرض، واکنش‌گرا)
//   - '500px' → عرض ثابت پیکسلی (پس از درگ)
//   - 500     → عدد خالص (legacy)
//
// در حین نمایش و درگ با عدد (px) کار می‌کنیم تا مقایسه‌ها ساده بماند.
// helper های زیر تبدیل بین فرمت ذخیره‌سازی و عدد نمایش را انجام می‌دهند.

const MIN_WIDTH = 80;
const PERCENT_FULL_THRESHOLD = 0.99; // 99% به بالا = 100% ذخیره شود

type DisplayWidth = number;

function widthToDisplay(value: ImageNodeAttributes['width']): DisplayWidth {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const trimmed = String(value).trim();
  // '100%' یا '50%' → نمایش عددی نداریم (0 = «از wrapper پیروی کن»)
  const m = /^(\d+(?:\.\d+)?)(px|%)?$/.exec(trimmed);
  if (!m) return 0;
  return m[2] === '%' ? 0 : parseFloat(m[1]!);
}

function widthToStored(value: DisplayWidth, parentWidth: number): string {
  // اگر تقریباً برابر عرض ظرف شد، به جای px، 100% ذخیره کن
  // تا با کوچک‌شدن viewport همچنان واکنش‌گرا بماند.
  if (parentWidth > 0 && value / parentWidth >= PERCENT_FULL_THRESHOLD) {
    return '100%';
  }
  return `${Math.max(MIN_WIDTH, Math.round(value))}px`;
}

function sizeClamp(length: number, min: number, max: number): number {
  if (Number.isFinite(min)) length = Math.max(length, min);
  if (Number.isFinite(max)) length = Math.min(length, max);
  return length;
}

const ResizeImage = ({
  editor,
  node,
  updateAttributes,
  selected,
}: ResizeImageProps) => {
  const { src, textAlign, width: widthProps, alt, title } = node.attrs;
  const dir = useDirection('rtl');

  const isEditable = editor.isEditable;

  const wrapperRef = useRef<HTMLDivElement>(null);

  // ── Resize state ──
  const [isResizing, setIsResizing] = useState(false);
  const [initialPosition, setInitialPosition] = useState(0);
  const [initialSize, setInitialSize] = useState(0);
  // عرض فعلی برای نمایش زنده در حین درگ
  const [displayWidth, setDisplayWidth] = useState<DisplayWidth>(() =>
    widthToDisplay(widthProps),
  );
  const [showControls, setShowControls] = useState(false);

  // هر وقت widthProps از بیرون تغییر کند (undo، load پست)، همگام شو.
  useEffect(() => {
    setDisplayWidth(widthToDisplay(widthProps));
  }, [widthProps]);

  // 2026-07-06: منطق resize ساده شد.
  //   قبلاً direction و dirFactor در فرمول بود که در RTL/center خراب
  //   می‌شد. حالا:
  //     - center alignment: drag هر handle به اندازهٔ 2×delta عرض را
  //       تغییر می‌دهد (لبهٔ مخالف هم به همان اندازه جابجا می‌شود).
  //     - start/end alignment: drag هر handle به اندازهٔ delta عرض
  //       را تغییر می‌دهد (لبهٔ مخالف ثابت می‌ماند).
  //   handle ها در دو طرف فیزیکی تصویر قرار دارند، پس نیازی به
  //   تشخیص «کدام handle» نیست — هر دو یکسان رفتار می‌کنند.
  const computeNewWidth = useCallback(
    (delta: number, baseWidth: number): number => {
      const wrapperWidth = wrapperRef.current?.offsetWidth ?? 0;
      const centerFactor = textAlign === 'center' ? 2 : 1;
      const maxWidth = wrapperWidth > 0 ? wrapperWidth : Infinity;
      return sizeClamp(
        baseWidth + delta * centerFactor,
        MIN_WIDTH,
        maxWidth,
      );
    },
    [textAlign],
  );

  const handleResize = useCallback(
    (delta: number, finished: boolean) => {
      const newWidth = computeNewWidth(delta, initialSize);
      if (finished) {
        const wrapperWidth = wrapperRef.current?.offsetWidth ?? 0;
        const stored = wrapperWidth > 0
          ? widthToStored(newWidth, wrapperWidth)
          : `${Math.round(newWidth)}px`;
        updateAttributes({ width: stored });
      }
      setDisplayWidth(newWidth);
    },
    [computeNewWidth, initialSize, updateAttributes],
  );

  useEffect(() => {
    if (!isResizing) return;

    const onMove = (event: MouseEvent) => {
      handleResize(event.clientX - initialPosition, false);
    };
    const onUp = (event: MouseEvent) => {
      setIsResizing(false);
      handleResize(event.clientX - initialPosition, true);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing, initialPosition, handleResize]);

  // start drag — عرض فعلی را از <img> واقعی می‌خوانیم تا اگر widthProps
  // درصدی/legacy بود، باز هم delta درست محاسبه شود.
  const startResize =
    (): React.MouseEventHandler =>
    (e) => {
      e.preventDefault();
      const handleEl = e.currentTarget as HTMLElement;
      const imageEl = handleEl.parentElement?.querySelector(
        'img',
      ) as HTMLImageElement | null;
      const currentWidth =
        imageEl?.getBoundingClientRect().width ||
        wrapperRef.current?.offsetWidth ||
        0;
      setInitialPosition(e.clientX);
      setInitialSize(currentWidth);
      setIsResizing(true);
    };

  // keyboard: ArrowRight = بزرگ‌تر، ArrowLeft = کوچک‌تر.
  // رفتار مستقل از dir است چون handle ها دو طرف فیزیکی تصویرند.
  const handleKeyDown: React.KeyboardEventHandler = (e) => {
    const step = e.shiftKey ? 50 : 10;
    const dirSign = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    if (dirSign === 0) return;
    const wrapperWidth = wrapperRef.current?.offsetWidth ?? 0;
    const baseWidth = displayWidth || wrapperWidth;
    if (baseWidth <= 0) return;
    const newWidth = computeNewWidth(step * dirSign, baseWidth);
    if (newWidth === baseWidth) return;
    e.preventDefault();
    const stored = wrapperWidth > 0
      ? widthToStored(newWidth, wrapperWidth)
      : `${Math.round(newWidth)}px`;
    updateAttributes({ width: stored });
  };

  const handleAlignChange = (align: 'left' | 'center' | 'right') => {
    updateAttributes({ textAlign: align });
  };

  const handleFullWidth = useCallback(() => {
    updateAttributes({ width: '100%' });
  }, [updateAttributes]);

  const handleHalfWidth = useCallback(() => {
    const wrapperWidth = wrapperRef.current?.offsetWidth ?? 0;
    if (wrapperWidth <= 0) return;
    updateAttributes({ width: `${Math.round(wrapperWidth / 2)}px` });
  }, [updateAttributes]);

  const handleDelete = useCallback(() => {
    editor.chain().focus().deleteSelection().run();
  }, [editor]);

  const handleOpenInNewTab = useCallback(() => {
    if (src) {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  }, [src]);

  const getAlignButtonClass = useCallback(
    (align: string) => {
      const isActive = textAlign === align;
      return `p-2 rounded-lg transition-all duration-150 ${
        isActive
          ? 'bg-primary-500 text-white shadow-sm'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`;
    },
    [textAlign],
  );

  const alignmentClasses = useMemo(() => {
    switch (textAlign) {
      case 'left':
        return 'justify-start';
      case 'right':
        return 'justify-end';
      case 'center':
      default:
        return 'justify-center';
    }
  }, [textAlign]);

  // استایل width: اگر displayWidth صفر است (100% یا legacy)، مقدار خام
  // widthProps را پاس می‌دهیم تا CSS آن را هندل کند.
  const imageStyle: React.CSSProperties = {
    width:
      displayWidth > 0
        ? `${Math.round(displayWidth)}px`
        : ((widthProps as string | number | undefined) ?? '100%'),
  };

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.dataset.fallback === '1') return;
    target.dataset.fallback = '1';
    target.src = '/images/placeholder-large.png';
  }, []);

  const wrapperWidth = wrapperRef.current?.offsetWidth ?? 0;
  const indicatorPx = displayWidth > 0 ? Math.round(displayWidth) : null;
  const indicatorPct =
    displayWidth > 0 && wrapperWidth > 0
      ? Math.round((displayWidth / wrapperWidth) * 100)
      : null;

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`group relative my-4 flex -mx-4 px-4 ${alignmentClasses}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isResizing && setShowControls(false)}
      onFocus={() => setShowControls(true)}
      onBlur={() => setShowControls(false)}
    >
      {!isEditable ? (
        <img
          className="rounded-xl shadow-md"
          src={src}
          alt={alt || ''}
          title={title || undefined}
          style={imageStyle}
          loading="lazy"
          onError={handleError}
        />
      ) : (
        <div
          className={`relative transition-all duration-200 ${
            selected ? 'ring-2 ring-primary-500 ring-offset-2 rounded-xl' : ''
          }`}
          contentEditable={false}
        >
          {/* Toolbar — همیشه با hover یا selected نمایان */}
          <div
            className={`absolute -top-14 start-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-1.5 border border-gray-200 dark:border-gray-700 transition-all duration-200 ${
              showControls || selected
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
            role="toolbar"
            aria-label="ابزارهای تصویر"
          >
            <button
              type="button"
              onClick={() => handleAlignChange('left')}
              aria-label="چپ‌چین"
              aria-pressed={textAlign === 'left'}
              className={getAlignButtonClass('left')}
            >
              <AlignLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleAlignChange('center')}
              aria-label="وسط‌چین"
              aria-pressed={textAlign === 'center'}
              className={getAlignButtonClass('center')}
            >
              <AlignCenter size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleAlignChange('right')}
              aria-label="راست‌چین"
              aria-pressed={textAlign === 'right'}
              className={getAlignButtonClass('right')}
            >
              <AlignRight size={16} />
            </button>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" aria-hidden />

            <button
              type="button"
              onClick={handleHalfWidth}
              aria-label="نصف عرض"
              title="نصف عرض"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <Minimize2 size={16} />
            </button>

            <button
              type="button"
              onClick={handleFullWidth}
              aria-label="تمام عرض"
              title="تمام عرض"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <Maximize2 size={16} />
            </button>

            <button
              type="button"
              onClick={handleOpenInNewTab}
              aria-label="باز کردن در تب جدید"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <ExternalLink size={16} />
            </button>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" aria-hidden />

            <button
              type="button"
              onClick={handleDelete}
              aria-label="حذف تصویر"
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Resize handle — سمت inline-start (فیزیکی: چپ در LTR، راست در RTL) */}
          <div
            onMouseDown={startResize()}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="slider"
            aria-label="تغییر اندازه از ابتدا"
            aria-valuemin={MIN_WIDTH}
            aria-valuemax={wrapperWidth || undefined}
            aria-valuenow={displayWidth || undefined}
            aria-orientation="vertical"
            className={`absolute z-40 h-full cursor-col-resize top-0 flex w-8 select-none flex-col justify-center -start-4 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:rounded ${
              showControls || selected ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="h-16 w-1 rounded-full bg-primary-500 shadow-lg mx-auto" />
          </div>

          <img
            className="rounded-xl shadow-lg transition-shadow hover:shadow-xl"
            src={src}
            alt={alt || ''}
            title={title || undefined}
            style={imageStyle}
            loading="lazy"
            onError={handleError}
            data-drag-handle
          />

          {/* Resize handle — سمت inline-end */}
          <div
            onMouseDown={startResize()}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="slider"
            aria-label="تغییر اندازه از انتها"
            aria-valuemin={MIN_WIDTH}
            aria-valuemax={wrapperWidth || undefined}
            aria-valuenow={displayWidth || undefined}
            aria-orientation="vertical"
            className={`absolute z-40 h-full cursor-col-resize top-0 flex w-8 select-none flex-col justify-center items-center -end-4 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:rounded ${
              showControls || selected ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="h-16 w-1 rounded-full bg-primary-500 shadow-lg" />
          </div>

          {/* size indicator — px و درصد، وسط پایین */}
          {isResizing && (indicatorPx !== null || indicatorPct !== null) && (
            <div className="absolute bottom-4 start-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 text-white text-xs rounded-lg font-mono backdrop-blur-sm shadow-lg whitespace-nowrap">
              {indicatorPx !== null ? `${indicatorPx}px` : '—'}
              {indicatorPct !== null ? ` · ${indicatorPct}%` : ''}
            </div>
          )}

          {/* alt badge — گوشهٔ inline-end */}
          {alt && (
            <div className="absolute bottom-2 end-2 px-2 py-1 bg-black/60 text-white text-[10px] rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity max-w-[180px] truncate">
              {alt}
            </div>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default ResizeImage;
