import { type NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Download,
  ExternalLink,
  Maximize2,
  RotateCw,
  Settings,
  Trash2,
  Type,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';

interface ImageNodeAttributes {
  src: string;
  alt?: string | null;
  width?: string | number | null;
  title?: string | null;
  textAlign?: 'left' | 'right' | 'center';
  rotation?: number;
  filter?: string;
  opacity?: number;
  borderRadius?: number;
  shadow?: boolean;
  caption?: string;
}

type ResizeImageProps = NodeViewProps & {
  node: NodeViewProps['node'] & {
    attrs: ImageNodeAttributes;
  };
};

const ResizeImage = ({ editor, node, updateAttributes, selected }: ResizeImageProps) => {
  const {
    src,
    textAlign,
    width: widthProps,
    alt,
    title,
    rotation = 0,
    filter = 'none',
    opacity = 100,
    borderRadius = 12,
    shadow = true,
    caption,
  } = node.attrs;

  // Debug: log attrs on every render

  const isEditable = editor.isEditable;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = React.useState({ width: 0, height: 0 });
  const [resizeHandle, setResizeHandle] = useState<
    'tl' | 'tr' | 'bl' | 'br' | 'l' | 'r' | 't' | 'b' | null
  >(null);
  // Store width in pixels for precise control
  const [widthPx, setWidthPx] = useState<number | null>(null);
  const [heightPx, setHeightPx] = useState<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAlt, setEditAlt] = useState(alt || '');
  const [editTitle, setEditTitle] = useState(title || '');
  const [editCaption, setEditCaption] = useState(caption || '');
  const [zoom, setZoom] = useState(1);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const lastResizeTime = useRef<number>(0);
  const isMobile = useRef<boolean>(false);
  const hasMovedRef = useRef<boolean>(false);
  const dragThreshold = 5;
  const aspectRatio = useRef<number>(1);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);

  // Detect mobile device
  useEffect(() => {
    isMobile.current = window.matchMedia('(max-width: 768px)').matches;
  }, []);

  // Track Shift and Alt keys for advanced resize
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
      if (e.key === 'Alt') setIsAltPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
      if (e.key === 'Alt') setIsAltPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Calculate actual dimensions
  const width = useMemo(() => {
    if (widthPx !== null) {
      return widthPx;
    }
    const containerWidth = wrapperRef.current?.offsetWidth || 0;
    return containerWidth;
  }, [widthPx]);

  const height = useMemo(() => {
    if (heightPx !== null) {
      return heightPx;
    }
    if (widthPx !== null && aspectRatio.current) {
      return widthPx / aspectRatio.current;
    }
    return null;
  }, [heightPx, widthPx]);

  const handleResize = useCallback(
    ({
      deltaX,
      deltaY,
      handle,
      finished,
    }: { deltaX: number; deltaY: number; handle: string; finished: boolean }) => {
      const now = Date.now();
      if (!finished && isMobile.current && now - lastResizeTime.current < 16) {
        return;
      }
      lastResizeTime.current = now;

      const wrapperWidth = wrapperRef.current?.offsetWidth || 0;
      if (!wrapperWidth || !aspectRatio.current) return;

      let newWidth = initialSize.width;
      let newHeight = initialSize.height;
      let primaryDelta = 0;

      let newOffsetX = 0;
      let newOffsetY = 0;

      const isCorner = ['tl', 'tr', 'bl', 'br'].includes(handle);
      const maintainAspectRatio = isCorner && !isShiftPressed;
      const resizeFromCenter = isAltPressed;

      // Calculate resize based on handle
      switch (handle) {
        case 'tl': // Top-left corner
          if (maintainAspectRatio) {
            primaryDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
            const tlDelta = deltaX < 0 ? -primaryDelta : primaryDelta;
            newWidth = initialSize.width - tlDelta * (resizeFromCenter ? 2 : 1);
            newHeight = newWidth / aspectRatio.current;
            if (!resizeFromCenter) {
              newOffsetX = tlDelta;
              newOffsetY = initialSize.height - newHeight;
            }
          } else {
            newWidth = initialSize.width - deltaX * (resizeFromCenter ? 2 : 1);
            newHeight = initialSize.height - deltaY * (resizeFromCenter ? 2 : 1);
            if (!resizeFromCenter) {
              newOffsetX = deltaX;
              newOffsetY = deltaY;
            }
          }
          break;
        case 'tr': // Top-right corner
          if (maintainAspectRatio) {
            primaryDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
            newWidth =
              initialSize.width +
              (deltaX > 0 ? primaryDelta : -primaryDelta) * (resizeFromCenter ? 2 : 1);
            newHeight = newWidth / aspectRatio.current;
            if (!resizeFromCenter) {
              newOffsetY = initialSize.height - newHeight;
            }
          } else {
            newWidth = initialSize.width + deltaX * (resizeFromCenter ? 2 : 1);
            newHeight = initialSize.height - deltaY * (resizeFromCenter ? 2 : 1);
            if (!resizeFromCenter) {
              newOffsetY = deltaY;
            }
          }
          break;
        case 'bl': // Bottom-left corner
          if (maintainAspectRatio) {
            primaryDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
            const blDelta = deltaX < 0 ? -primaryDelta : primaryDelta;
            newWidth = initialSize.width - blDelta * (resizeFromCenter ? 2 : 1);
            newHeight = newWidth / aspectRatio.current;
            if (!resizeFromCenter) {
              newOffsetX = blDelta;
            }
          } else {
            newWidth = initialSize.width - deltaX * (resizeFromCenter ? 2 : 1);
            newHeight = initialSize.height + deltaY * (resizeFromCenter ? 2 : 1);
            if (!resizeFromCenter) {
              newOffsetX = deltaX;
            }
          }
          break;
        case 'br': // Bottom-right corner
          if (maintainAspectRatio) {
            primaryDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
            newWidth =
              initialSize.width +
              (deltaX > 0 ? primaryDelta : -primaryDelta) * (resizeFromCenter ? 2 : 1);
            newHeight = newWidth / aspectRatio.current;
          } else {
            newWidth = initialSize.width + deltaX * (resizeFromCenter ? 2 : 1);
            newHeight = initialSize.height + deltaY * (resizeFromCenter ? 2 : 1);
          }
          break;
        case 'l': // Left edge
          newWidth = initialSize.width - deltaX * (resizeFromCenter ? 2 : 1);
          newHeight = initialSize.height;
          if (!resizeFromCenter) {
            newOffsetX = deltaX;
          }
          break;
        case 'r': // Right edge
          newWidth = initialSize.width + deltaX * (resizeFromCenter ? 2 : 1);
          newHeight = initialSize.height;
          break;
        case 't': // Top edge
          newHeight = initialSize.height - deltaY * (resizeFromCenter ? 2 : 1);
          newWidth = initialSize.width;
          if (!resizeFromCenter) {
            newOffsetY = deltaY;
          }
          break;
        case 'b': // Bottom edge
          newHeight = initialSize.height + deltaY * (resizeFromCenter ? 2 : 1);
          newWidth = initialSize.width;
          break;
      }

      // Clamp dimensions
      const minSize = 50;
      const maxWidth = wrapperWidth;
      const maxHeight = 2000; // Max height in pixels

      newWidth = Math.max(minSize, Math.min(maxWidth, newWidth));
      newHeight = Math.max(minSize, Math.min(maxHeight, newHeight));

      // For corners with aspect ratio locked: maintain ratio after clamping
      if (maintainAspectRatio) {
        if (newWidth / newHeight > aspectRatio.current) {
          newWidth = newHeight * aspectRatio.current;
        } else {
          newHeight = newWidth / aspectRatio.current;
        }
      }

      if (finished) {
        updateAttributes({ width: Math.round(newWidth) });
        setHeightPx(Math.round(newHeight));
        setOffsetX(0);
        setOffsetY(0);
      } else {
        setWidthPx(newWidth);
        setHeightPx(newHeight);
        setOffsetX(newOffsetX);
        setOffsetY(newOffsetY);
      }
    },
    [initialSize, updateAttributes],
  );

  const handleMouseDown =
    (handle: 'tl' | 'tr' | 'bl' | 'br' | 'l' | 'r' | 't' | 'b'): React.MouseEventHandler =>
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      hasMovedRef.current = false;
      setInitialPosition({ x: e.clientX, y: e.clientY });
      setInitialSize({
        width: width,
        height: height || width / aspectRatio.current,
      });
      setResizeHandle(handle);
      setIsResizing(true);
    };

  const handleTouchStart =
    (handle: 'tl' | 'tr' | 'bl' | 'br' | 'l' | 'r' | 't' | 'b'): React.TouchEventHandler =>
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      hasMovedRef.current = false;
      const touch = e.touches[0];
      setInitialPosition({ x: touch.clientX, y: touch.clientY });
      setInitialSize({
        width: width,
        height: height || width / aspectRatio.current,
      });
      setResizeHandle(handle);
      setIsResizing(true);
    };

  // Initialize width from props
  useEffect(() => {
    if (!widthProps) {
      setWidthPx(null); // Use container width
      return;
    }

    const widthStr = String(widthProps);

    if (widthStr.includes('%')) {
      // Convert percentage to pixels
      const percent = Number.parseFloat(widthStr);
      const containerWidth = wrapperRef.current?.offsetWidth || 0;
      if (containerWidth > 0 && !Number.isNaN(percent)) {
        const pxValue = (percent / 100) * containerWidth;
        setWidthPx(Math.round(pxValue));
      } else {
        setWidthPx(null);
      }
    } else {
      // Already pixel value
      const pxValue = typeof widthProps === 'number' ? widthProps : Number.parseInt(widthProps, 10);
      setWidthPx(Number.isNaN(pxValue) ? null : pxValue);
    }
  }, [widthProps]);

  useEffect(() => {
    setEditAlt(alt || '');
    setEditTitle(title || '');
    setEditCaption(caption || '');
  }, [alt, title, caption]);

  // Initialize missing attributes for old images
  useEffect(() => {
    const needsInit =
      node.attrs.rotation === undefined ||
      node.attrs.filter === undefined ||
      node.attrs.opacity === undefined ||
      node.attrs.borderRadius === undefined ||
      node.attrs.shadow === undefined;

    if (needsInit && isEditable) {
      console.log('🔧 Initializing missing attributes');
      updateAttributes({
        rotation: node.attrs.rotation ?? 0,
        filter: node.attrs.filter ?? 'none',
        opacity: node.attrs.opacity ?? 100,
        borderRadius: node.attrs.borderRadius ?? 12,
        shadow: node.attrs.shadow ?? true,
      });
    }
  }, [node.attrs, isEditable, updateAttributes]);

  useEffect(() => {
    if (!isResizing) {
      document.body.classList.remove('resizing');
      return;
    }

    // Add class to body to prevent scrolling during resize
    document.body.classList.add('resizing');

    const sendResizeEvent = (clientX: number, clientY: number, finished: boolean) => {
      const deltaX = clientX - initialPosition.x;
      const deltaY = clientY - initialPosition.y;

      // Check if user has moved enough to start resizing (threshold)
      const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (!hasMovedRef.current && totalDelta < dragThreshold) {
        return;
      }

      // Mark as moved once threshold is passed
      if (!hasMovedRef.current && totalDelta >= dragThreshold) {
        hasMovedRef.current = true;
      }

      // Only resize if we've moved past threshold
      if (hasMovedRef.current && resizeHandle) {
        handleResize({
          deltaX,
          deltaY,
          handle: resizeHandle,
          finished,
        });
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      sendResizeEvent(event.clientX, event.clientY, false);
    };

    const handleMouseUp = (event: MouseEvent) => {
      event.preventDefault();

      // Only update if we actually moved
      if (hasMovedRef.current) {
        sendResizeEvent(event.clientX, event.clientY, true);
      }

      setIsResizing(false);
      setResizeHandle(null);
      hasMovedRef.current = false;
      document.body.classList.remove('resizing');
    };

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      const touch = event.touches[0];
      if (touch) {
        sendResizeEvent(touch.clientX, touch.clientY, false);
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      event.preventDefault();

      // Only update if we actually moved
      if (hasMovedRef.current) {
        const touch = event.changedTouches[0];
        if (touch) {
          sendResizeEvent(touch.clientX, touch.clientY, true);
        }
      }

      setIsResizing(false);
      setResizeHandle(null);
      hasMovedRef.current = false;
      document.body.classList.remove('resizing');
    };

    // Mouse events
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Touch events for mobile
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      document.body.classList.remove('resizing');
    };
  }, [isResizing, resizeHandle, initialPosition, initialSize, handleResize]);

  const handleAlignChange = (align: 'left' | 'center' | 'right') => {
    updateAttributes({ textAlign: align });
  };

  const handleFullWidth = () => {
    const containerWidth = wrapperRef.current?.offsetWidth || 0;
    if (containerWidth > 0) {
      updateAttributes({ width: containerWidth });
      setWidthPx(containerWidth);
    }
  };

  const handleDelete = useCallback(() => {
    editor.chain().focus().deleteSelection().run();
  }, [editor]);

  const handleOpenInNewTab = useCallback(() => {
    if (src) {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  }, [src]);

  const handleRotate = useCallback(() => {
    const newRotation = (rotation + 90) % 360;
    updateAttributes({ rotation: newRotation });
  }, [rotation, updateAttributes]);

  const handleFilterChange = useCallback(
    (newFilter: string) => {
      updateAttributes({ filter: newFilter });
      setShowAdvancedMenu(false);
    },
    [updateAttributes],
  );

  const handleOpacityChange = useCallback(
    (newOpacity: number) => {
      updateAttributes({ opacity: newOpacity });
    },
    [updateAttributes],
  );

  const handleBorderRadiusChange = useCallback(
    (newRadius: number) => {
      updateAttributes({ borderRadius: newRadius });
    },
    [updateAttributes],
  );

  const handleShadowToggle = useCallback(() => {
    updateAttributes({ shadow: !shadow });
  }, [shadow, updateAttributes]);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = alt || 'image';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (_error) {
      // Silent fail
    }
  }, [src, alt]);

  const handleSaveMetadata = useCallback(() => {
    updateAttributes({
      alt: editAlt,
      title: editTitle,
      caption: editCaption,
    });
    setShowEditModal(false);
  }, [editAlt, editTitle, editCaption, updateAttributes]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  useEffect(() => {
    if (imgRef.current) {
      const img = imgRef.current;
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      setImageSize({ width: naturalWidth, height: naturalHeight });

      // Calculate and store aspect ratio
      if (naturalWidth && naturalHeight) {
        aspectRatio.current = naturalWidth / naturalHeight;
      }
    }
  }, [src]);

  // کلاس‌های مشترک برای دکمه‌های تراز - کامپکت
  const getAlignButtonClass = useCallback(
    (align: string) => {
      const isActive = textAlign === align;
      return `group/btn relative p-1.5 md:p-2 rounded-lg transition-all duration-300 ease-out ${
        isActive
          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 scale-105'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:scale-105 hover:shadow-md'
      }`;
    },
    [textAlign],
  );

  // تعیین کلاس‌های flexbox برای تراز
  const alignmentClasses = useMemo(() => {
    switch (textAlign) {
      case 'left':
        return 'justify-start';
      case 'right':
        return 'justify-end';
      default:
        return 'justify-center';
    }
  }, [textAlign]);

  const filters = [
    { name: 'بدون فیلتر', value: 'none' },
    { name: 'سیاه و سفید', value: 'grayscale(100%)' },
    { name: 'سپیا', value: 'sepia(100%)' },
    { name: 'کنتراست بالا', value: 'contrast(150%)' },
    { name: 'روشن', value: 'brightness(120%)' },
    { name: 'تاریک', value: 'brightness(80%)' },
    { name: 'اشباع', value: 'saturate(150%)' },
    { name: 'محو', value: 'blur(2px)' },
    { name: 'معکوس', value: 'invert(100%)' },
  ];

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`group relative my-6 mb-20 sm:mb-24 md:mb-20 flex ${alignmentClasses} overflow-visible`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isResizing && setShowControls(false)}
      onFocus={() => setShowControls(true)}
      onBlur={() => setShowControls(false)}
      data-rotation={rotation}
      data-filter={filter}
      data-opacity={opacity}
    >
      {!isEditable ? (
        <div
          className="relative inline-block max-w-full"
          style={{
            width: widthProps
              ? typeof widthProps === 'number'
                ? `${widthProps}px`
                : widthProps
              : '100%',
          }}
        >
          <img
            className="rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl w-full h-auto"
            src={src}
            alt={alt || ''}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/placeholder-large.png';
            }}
          />
          {caption && (
            <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3 px-2 italic leading-relaxed">
              {caption}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`relative transition-all duration-300 max-w-full ${
            selected
              ? 'ring-2 ring-primary-400/60 ring-offset-4 ring-offset-white dark:ring-offset-gray-900 rounded-2xl'
              : ''
          }`}
          contentEditable={false}
        >
          {/* Main Toolbar - در موبایل پایین صفحه، در دسکتاپ بالای تصویر */}
          <div
            className={`fixed sm:absolute bottom-4 sm:bottom-auto sm:-top-20 md:-top-16 left-1/2 -translate-x-1/2 z-[60] flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 md:gap-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-2xl p-2 md:p-2.5 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 ease-out ${
              showControls || selected
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-4 sm:translate-y-4 scale-95 pointer-events-none'
            }`}
            style={{
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              maxWidth: '95vw',
              width: 'auto',
            }}
          >
            {/* Alignment - کامپکت */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => handleAlignChange('left')}
                aria-label="چپ‌چین"
                title="تراز چپ"
                className={getAlignButtonClass('left')}
              >
                <AlignLeft className="w-4 h-4 sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => handleAlignChange('center')}
                aria-label="وسط‌چین"
                title="تراز وسط"
                className={getAlignButtonClass('center')}
              >
                <AlignCenter className="w-4 h-4 sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => handleAlignChange('right')}
                aria-label="راست‌چین"
                title="تراز راست"
                className={getAlignButtonClass('right')}
              >
                <AlignRight className="w-4 h-4 sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
              </button>
            </div>

            <div className="hidden sm:block w-px h-5 md:h-6 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-0.5 md:mx-1" />

            {/* Transform - کامپکت */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleRotate}
                aria-label="چرخش"
                title={`چرخش: ${rotation}°`}
                className={`relative p-1.5 md:p-2 rounded-lg transition-all duration-300 ${
                  rotation !== 0
                    ? 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/30 text-primary-600 dark:text-primary-400 shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:scale-105'
                }`}
              >
                <RotateCw className="w-4 h-4 sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
                {rotation !== 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-lg">
                    {rotation / 90}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                aria-label="زوم +"
                title="بزرگنمایی"
                className="p-1.5 md:p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 transition-all duration-300 hover:scale-105"
              >
                <ZoomIn className="w-4 h-4 sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
              </button>

              <button
                type="button"
                onClick={handleZoomOut}
                aria-label="زوم -"
                title="کوچک‌نمایی"
                className="p-1.5 md:p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 transition-all duration-300 hover:scale-105"
              >
                <ZoomOut className="w-4 h-4 sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
              </button>
            </div>

            <div className="hidden sm:block w-px h-5 md:h-6 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-0.5 md:mx-1" />

            {/* Metadata */}
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              aria-label="متن"
              title="ویرایش متن"
              className="p-1.5 md:p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 transition-all duration-300 hover:scale-105"
            >
              <Type className="w-4 h-4 sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
            </button>

            {/* Advanced Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAdvancedMenu(!showAdvancedMenu)}
                aria-label="تنظیمات"
                title="فیلترها"
                className={`p-1.5 md:p-2 rounded-lg transition-all duration-300 hover:scale-105 ${
                  showAdvancedMenu
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Settings
                  className={`w-4 h-4 sm:w-[14px] sm:h-[14px] ${showAdvancedMenu ? 'animate-spin' : ''}`}
                  strokeWidth={2.5}
                />
              </button>

              {showAdvancedMenu && (
                <div
                  className="fixed sm:absolute top-1/2 sm:top-full left-1/2 sm:left-0 -translate-x-1/2 sm:translate-x-0 -translate-y-1/2 sm:translate-y-0 sm:mt-3 w-[90vw] max-w-[320px] sm:w-72 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-4 z-[100] animate-in fade-in slide-in-from-top-2 duration-300"
                  style={{
                    boxShadow:
                      '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                      تنظیمات پیشرفته
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedMenu(false)}
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-all duration-200"
                    >
                      <X className="w-3.5 h-3.5 sm:w-[14px] sm:h-[14px]" />
                    </button>
                  </div>

                  {/* Filters */}
                  <div className="mb-3 sm:mb-4">
                    <label className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-2.5 block flex items-center gap-1.5 sm:gap-2">
                      <span className="w-0.5 sm:w-1 h-3 sm:h-4 bg-primary-500 rounded-full" />
                      فیلتر تصویر
                    </label>
                    <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                      {filters.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => handleFilterChange(f.value)}
                          className={`text-[10px] sm:text-[11px] font-medium p-1.5 sm:p-2 rounded-lg transition-all duration-300 ${
                            filter === f.value
                              ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 scale-105'
                              : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 hover:shadow-md'
                          }`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Opacity */}
                  <div className="mb-3 sm:mb-4">
                    <label className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 sm:gap-2">
                        <span className="w-0.5 sm:w-1 h-3 sm:h-4 bg-primary-500 rounded-full" />
                        شفافیت
                      </span>
                      <span className="text-primary-600 dark:text-primary-400 font-bold text-xs sm:text-sm">
                        {opacity}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={opacity}
                      onChange={(e) => handleOpacityChange(Number(e.target.value))}
                      className="w-full h-1.5 sm:h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 sm:[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-3.5 sm:[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125"
                    />
                  </div>

                  {/* Border Radius */}
                  <div className="mb-3 sm:mb-4">
                    <label className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 sm:gap-2">
                        <span className="w-0.5 sm:w-1 h-3 sm:h-4 bg-primary-500 rounded-full" />
                        گوشه‌های گرد
                      </span>
                      <span className="text-primary-600 dark:text-primary-400 font-bold text-xs sm:text-sm">
                        {borderRadius}px
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={borderRadius}
                      onChange={(e) => handleBorderRadiusChange(Number(e.target.value))}
                      className="w-full h-1.5 sm:h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 sm:[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-3.5 sm:[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125"
                    />
                  </div>

                  {/* Shadow Toggle */}
                  <button
                    type="button"
                    onClick={handleShadowToggle}
                    className={`w-full text-[11px] sm:text-xs font-semibold p-2.5 sm:p-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 ${
                      shadow
                        ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30'
                        : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {shadow ? <Check className="w-3.5 h-3.5 sm:w-[14px] sm:h-[14px]" /> : null}
                    {shadow ? 'سایه فعال است' : 'فعال‌سازی سایه'}
                  </button>
                </div>
              )}
            </div>

            <div className="hidden sm:block w-px h-5 md:h-6 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-0.5 md:mx-1" />

            {/* Actions - کامپکت */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleFullWidth}
                aria-label="عرض کامل"
                title="تمام عرض"
                className="p-1.5 md:p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 transition-all duration-300 hover:scale-105"
              >
                <Maximize2 className="w-4 h-4 sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
              </button>

              <button
                type="button"
                onClick={handleDownload}
                aria-label="دانلود"
                title="دانلود"
                className="p-1.5 md:p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 transition-all duration-300 hover:scale-105"
              >
                <Download className="w-4 h-4 sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
              </button>

              <button
                type="button"
                onClick={handleOpenInNewTab}
                aria-label="تب جدید"
                title="باز کردن"
                className="p-1.5 md:p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 transition-all duration-300 hover:scale-105"
              >
                <ExternalLink className="w-4 h-4 sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
              </button>
            </div>

            <div className="hidden sm:block w-px h-5 md:h-6 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-0.5 md:mx-1" />

            <button
              type="button"
              onClick={handleDelete}
              aria-label="حذف"
              title="حذف"
              className="p-1.5 md:p-2 rounded-lg hover:bg-gradient-to-br hover:from-red-50 hover:to-red-100 dark:hover:from-red-900/20 dark:hover:to-red-800/30 text-red-500 dark:text-red-400 transition-all duration-300 hover:scale-105"
            >
              <Trash2 className="w-4 h-4 sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
            </button>
          </div>

          {/* Resize Help Tooltip */}
          {(showControls || selected) && !isResizing && (
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 px-3 py-2 bg-gray-900/95 text-white text-[10px] rounded-lg backdrop-blur-xl shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-40">
              <div className="flex items-center gap-2">
                <span>گوشه‌ها: نسبت ثابت</span>
                <span className="text-gray-400">|</span>
                <span>Shift: آزاد</span>
                <span className="text-gray-400">|</span>
                <span>Alt: از مرکز</span>
              </div>
            </div>
          )}

          {/* Edit Modal - طراحی مدرن با انیمیشن */}
          {showEditModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div
                className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-5 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
                    <span className="w-1 sm:w-1.5 h-6 sm:h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full" />
                    ویرایش اطلاعات تصویر
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-all duration-200 hover:rotate-90"
                  >
                    <X className="w-5 h-5 sm:w-[20px] sm:h-[20px]" />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Alt Text */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <span className="w-1 h-3 sm:h-4 bg-primary-500 rounded-full" />
                      متن جایگزین (Alt)
                    </label>
                    <input
                      type="text"
                      value={editAlt}
                      onChange={(e) => setEditAlt(e.target.value)}
                      placeholder="توضیح کوتاه برای تصویر"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all duration-200 outline-none"
                    />
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <span className="w-1 h-3 sm:h-4 bg-primary-500 rounded-full" />
                      عنوان (Title)
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="عنوان تصویر"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all duration-200 outline-none"
                    />
                  </div>

                  {/* Caption */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <span className="w-1 h-3 sm:h-4 bg-primary-500 rounded-full" />
                      توضیح (Caption)
                    </label>
                    <textarea
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder="توضیح کامل زیر تصویر"
                      rows={3}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all duration-200 outline-none resize-none"
                    />
                  </div>

                  {/* Image Info */}
                  {imageSize && (
                    <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-primary-500 rounded-full animate-pulse" />
                      <span className="text-[11px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">
                        ابعاد:{' '}
                        <span className="text-gray-900 dark:text-white font-bold">
                          {imageSize.width} × {imageSize.height}
                        </span>{' '}
                        پیکسل
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6 sm:mt-8">
                  <button
                    type="button"
                    onClick={handleSaveMetadata}
                    className="flex-1 px-5 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-br from-primary-500 to-primary-600 text-white font-semibold text-sm sm:text-base rounded-xl hover:shadow-lg hover:shadow-primary-500/30 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                    ذخیره تغییرات
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-5 sm:px-6 py-3 sm:py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm sm:text-base rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                    انصراف
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Corner Resize Handles */}
          {/* Top-Left */}
          <div
            onMouseDown={handleMouseDown('tl')}
            onTouchStart={handleTouchStart('tl')}
            className={`absolute z-50 -top-2 -left-2 w-6 h-6 cursor-nwse-resize transition-all duration-300 touch-none ${
              showControls || selected ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-400 to-primary-600 shadow-xl shadow-primary-500/50 hover:scale-125 active:scale-150 transition-all duration-200 border-2 border-white" />
          </div>

          {/* Top-Right */}
          <div
            onMouseDown={handleMouseDown('tr')}
            onTouchStart={handleTouchStart('tr')}
            className={`absolute z-50 -top-2 -right-2 w-6 h-6 cursor-nesw-resize transition-all duration-300 touch-none ${
              showControls || selected ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-400 to-primary-600 shadow-xl shadow-primary-500/50 hover:scale-125 active:scale-150 transition-all duration-200 border-2 border-white" />
          </div>

          {/* Bottom-Left */}
          <div
            onMouseDown={handleMouseDown('bl')}
            onTouchStart={handleTouchStart('bl')}
            className={`absolute z-50 -bottom-2 -left-2 w-6 h-6 cursor-nesw-resize transition-all duration-300 touch-none ${
              showControls || selected ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-400 to-primary-600 shadow-xl shadow-primary-500/50 hover:scale-125 active:scale-150 transition-all duration-200 border-2 border-white" />
          </div>

          {/* Bottom-Right */}
          <div
            onMouseDown={handleMouseDown('br')}
            onTouchStart={handleTouchStart('br')}
            className={`absolute z-50 -bottom-2 -right-2 w-6 h-6 cursor-nwse-resize transition-all duration-300 touch-none ${
              showControls || selected ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-400 to-primary-600 shadow-xl shadow-primary-500/50 hover:scale-125 active:scale-150 transition-all duration-200 border-2 border-white" />
          </div>

          {/* Edge Resize Handles */}
          {/* Left */}
          <div
            onMouseDown={handleMouseDown('l')}
            onTouchStart={handleTouchStart('l')}
            className={`absolute z-40 h-full cursor-ew-resize top-0 flex w-8 select-none flex-col justify-center -left-1 transition-all duration-300 touch-none ${
              showControls || selected ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            <div className="relative h-16 w-1.5 rounded-full bg-gradient-to-b from-primary-400 via-primary-500 to-primary-600 shadow-lg shadow-primary-500/50 mx-auto transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-125">
              <div className="absolute inset-0 rounded-full bg-white/20" />
            </div>
          </div>

          <div
            className="relative group/image max-w-full"
            style={{
              width: widthPx !== null ? `${widthPx}px` : '100%',
              height: heightPx !== null ? `${heightPx}px` : 'auto',
              display: 'inline-block',
              opacity: opacity / 100,
              borderRadius: `${borderRadius}px`,
              boxShadow: shadow
                ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                : 'none',
              overflow: 'hidden',
              transition: isResizing ? 'none' : 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isResizing ? `translate(${offsetX}px, ${offsetY}px)` : 'none',
            }}
          >
            <img
              ref={imgRef}
              className="block w-full h-auto transition-all duration-500 ease-out"
              src={src}
              alt={alt || ''}
              title={title || undefined}
              style={{
                transform: `rotate(${rotation}deg) scale(${zoom})`,
                filter: filter !== 'none' ? filter : undefined,
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/images/placeholder-large.png';
              }}
              data-drag-handle
            />

            {/* Overlay gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>

          {/* Right */}
          <div
            onMouseDown={handleMouseDown('r')}
            onTouchStart={handleTouchStart('r')}
            className={`absolute z-40 h-full cursor-ew-resize top-0 flex w-8 select-none flex-col justify-center -right-1 transition-all duration-300 touch-none ${
              showControls || selected ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            <div className="relative h-16 w-1.5 rounded-full bg-gradient-to-b from-primary-400 via-primary-500 to-primary-600 shadow-lg shadow-primary-500/50 mx-auto transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-125">
              <div className="absolute inset-0 rounded-full bg-white/20" />
            </div>
          </div>

          {/* Top */}
          <div
            onMouseDown={handleMouseDown('t')}
            onTouchStart={handleTouchStart('t')}
            className={`absolute z-40 w-full cursor-ns-resize left-0 flex h-8 select-none flex-row justify-center -top-1 transition-all duration-300 touch-none ${
              showControls || selected ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            <div className="relative w-16 h-1.5 rounded-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 shadow-lg shadow-primary-500/50 my-auto transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-125">
              <div className="absolute inset-0 rounded-full bg-white/20" />
            </div>
          </div>

          {/* Bottom */}
          <div
            onMouseDown={handleMouseDown('b')}
            onTouchStart={handleTouchStart('b')}
            className={`absolute z-40 w-full cursor-ns-resize left-0 flex h-8 select-none flex-row justify-center -bottom-1 transition-all duration-300 touch-none ${
              showControls || selected ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            <div className="relative w-16 h-1.5 rounded-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 shadow-lg shadow-primary-500/50 my-auto transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-125">
              <div className="absolute inset-0 rounded-full bg-white/20" />
            </div>
          </div>

          {/* Size indicator - طراحی مدرن با نمایش ابعاد */}
          {isResizing && (
            <div className="absolute bottom-8 sm:bottom-6 left-1/2 -translate-x-1/2 px-5 sm:px-6 md:px-5 py-2.5 sm:py-3 md:py-2.5 bg-gradient-to-br from-gray-900 to-black text-white text-sm sm:text-base md:text-sm rounded-2xl font-mono backdrop-blur-xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200 z-50">
              <div className="flex items-center gap-2 sm:gap-2.5 md:gap-2">
                <div className="w-1.5 sm:w-2 md:w-1.5 h-1.5 sm:h-2 md:h-1.5 bg-primary-400 rounded-full animate-pulse" />
                <span className="font-bold text-base sm:text-lg md:text-base">
                  {Math.round(width)} × {Math.round(height || width / aspectRatio.current)}
                </span>
                <span className="text-gray-400 text-xs sm:text-sm md:text-xs">px</span>
              </div>
              {/* Modifier keys indicator */}
              <div className="mt-1.5 flex items-center justify-center gap-2 text-[10px]">
                {isShiftPressed && (
                  <span className="px-2 py-0.5 bg-primary-500/20 text-primary-300 rounded border border-primary-500/30">
                    Shift: آزاد
                  </span>
                )}
                {isAltPressed && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                    Alt: از مرکز
                  </span>
                )}
                {!isShiftPressed &&
                  !isAltPressed &&
                  resizeHandle &&
                  ['tl', 'tr', 'bl', 'br'].includes(resizeHandle) && (
                    <span className="text-gray-400">نسبت: {aspectRatio.current.toFixed(2)}</span>
                  )}
              </div>
            </div>
          )}

          {/* Info badges - طراحی مدرن */}
          <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 flex flex-col gap-1.5 sm:gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            {alt && (
              <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-br from-gray-900/90 to-black/90 text-white text-[10px] sm:text-[11px] rounded-lg sm:rounded-xl backdrop-blur-xl max-w-[180px] sm:max-w-[220px] truncate shadow-xl border border-white/10 font-medium">
                <span className="text-gray-400">Alt:</span> {alt}
              </div>
            )}
            {imageSize && (
              <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-br from-gray-900/90 to-black/90 text-white text-[10px] sm:text-[11px] rounded-lg sm:rounded-xl backdrop-blur-xl shadow-xl border border-white/10 font-mono font-bold">
                {imageSize.width} × {imageSize.height}
              </div>
            )}
          </div>

          {/* Zoom indicator - طراحی مدرن */}
          {zoom !== 1 && (
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-br from-primary-500 to-primary-600 text-white text-[10px] sm:text-xs rounded-lg sm:rounded-xl backdrop-blur-xl shadow-xl shadow-primary-500/30 border border-white/20 font-bold animate-in zoom-in-95 duration-200">
              {Math.round(zoom * 100)}%
            </div>
          )}

          {/* Rotation indicator - طراحی مدرن */}
          {rotation !== 0 && (
            <div className="absolute top-2 sm:top-3 right-2 sm:right-3 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-br from-primary-500 to-primary-600 text-white text-[10px] sm:text-xs rounded-lg sm:rounded-xl backdrop-blur-xl shadow-xl shadow-primary-500/30 border border-white/20 font-bold animate-in zoom-in-95 duration-200 flex items-center gap-1 sm:gap-1.5">
              <RotateCw className="w-3 h-3 sm:w-[12px] sm:h-[12px]" />
              {rotation}°
            </div>
          )}

          {/* Caption for editable mode */}
          {caption && (
            <div className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 italic leading-relaxed px-2 sm:px-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {caption}
            </div>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default ResizeImage;
