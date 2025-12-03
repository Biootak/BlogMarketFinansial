import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { type NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { AlignLeft, AlignCenter, AlignRight, Maximize2, Trash2, ExternalLink } from 'lucide-react';

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

function sizeClamp(length: number, min: number, max: number) {
  if (min !== undefined) {
    length = Math.max(length, min);
  }
  if (max !== undefined) {
    length = Math.min(length, max);
  }
  return length;
}

const ResizeImage = ({ editor, node, updateAttributes, selected }: ResizeImageProps) => {
  const { src, textAlign, width: widthProps, alt } = node.attrs;

  const isEditable = editor.isEditable;

  const wrapperRef = useRef<HTMLDivElement>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [initialPosition, setInitialPosition] = useState(0);
  const [initialSize, setInitialSize] = React.useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const [width, setWidth] = useState<any>(0);
  const [showControls, setShowControls] = useState(false);

  const handleResize = useCallback(
    ({ delta, direction, finished, initialSize }: any) => {
      const wrapperWidth = wrapperRef.current!.offsetWidth;
      const deltaFactor = (textAlign === 'center' ? 2 : 1) * (direction === 'left' ? -1 : 1);

      const newWidth = sizeClamp(initialSize + delta * deltaFactor, 100, wrapperWidth);

      if (finished) {
        updateAttributes({ width: newWidth });
      } else {
        setWidth(newWidth);
      }
    },
    [textAlign, setWidth, updateAttributes],
  );

  const handleMouseDown =
    (direction: 'left' | 'right'): React.MouseEventHandler =>
    (e) => {
      setInitialPosition(e.clientX);
      const element = (e.target as HTMLElement).parentElement!;
      setInitialSize(element.offsetWidth);
      setDirection(direction);
      setIsResizing(true);
    };

  useEffect(() => {
    setWidth(widthProps);
  }, [widthProps]);

  useEffect(() => {
    if (!isResizing) return;

    const sendResizeEvent = (event: MouseEvent, finished: boolean) => {
      const { clientX } = event;
      const currentPosition = clientX;
      const delta = currentPosition - initialPosition;

      handleResize({
        delta,
        direction,
        finished,
        initialSize,
      });
    };

    const handleMouseMove = (event: MouseEvent) => sendResizeEvent(event, false);
    const handleMouseUp = (event: MouseEvent) => {
      setIsResizing(false);
      sendResizeEvent(event, true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, direction, initialPosition, initialSize, handleResize]);

  const handleAlignChange = (align: 'left' | 'center' | 'right') => {
    updateAttributes({ textAlign: align });
  };

  const handleFullWidth = () => {
    if (wrapperRef.current) {
      updateAttributes({ width: wrapperRef.current.offsetWidth });
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

  // کلاس‌های مشترک برای دکمه‌های تراز
  const getAlignButtonClass = useCallback((align: string) => {
    const isActive = textAlign === align;
    return `p-2 rounded-lg transition-all duration-150 ${
      isActive 
        ? 'bg-primary-500 text-white shadow-sm' 
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;
  }, [textAlign]);

  return (
    <NodeViewWrapper 
      ref={wrapperRef} 
      className="group relative my-4" 
      style={{ textAlign }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isResizing && setShowControls(false)}
      onFocus={() => setShowControls(true)}
      onBlur={() => setShowControls(false)}
    >
      {!isEditable ? (
        <img 
          className="inline-block rounded-xl shadow-md" 
          src={src} 
          alt={alt || ''} 
          style={{ width }}
          loading="lazy"
        />
      ) : (
        <div 
          className={`relative inline-block transition-all duration-200 ${
            selected ? 'ring-2 ring-primary-500 ring-offset-2 rounded-xl' : ''
          }`} 
          contentEditable={false}
        >
          {/* Toolbar - always visible when selected or hovered */}
          <div 
            className={`absolute -top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-1.5 border border-gray-200 dark:border-gray-700 transition-all duration-200 ${
              showControls || selected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            {/* Alignment buttons */}
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
            
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" aria-hidden="true" />
            
            <button
              type="button"
              onClick={handleFullWidth}
              aria-label="تمام عرض"
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
            
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" aria-hidden="true" />
            
            <button
              type="button"
              onClick={handleDelete}
              aria-label="حذف تصویر"
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Left resize handle */}
          <div
            onMouseDown={handleMouseDown('left')}
            className={`absolute z-40 h-full cursor-col-resize top-0 flex w-8 select-none flex-col justify-center -left-4 transition-opacity ${
              showControls || selected ? 'opacity-100' : 'opacity-0'
            }`}
            role="slider"
            aria-label="تغییر اندازه از چپ"
            tabIndex={0}
          >
            <div className="h-16 w-1 rounded-full bg-primary-500 shadow-lg mx-auto" />
          </div>

          <img 
            className="inline-block rounded-xl shadow-lg transition-shadow hover:shadow-xl" 
            src={src} 
            alt={alt || ''} 
            style={{ width }}
            loading="lazy"
            data-drag-handle 
          />

          {/* Right resize handle */}
          <div
            onMouseDown={handleMouseDown('right')}
            className={`absolute z-40 h-full cursor-col-resize top-0 flex w-8 select-none flex-col justify-center items-center -right-4 transition-opacity ${
              showControls || selected ? 'opacity-100' : 'opacity-0'
            }`}
            role="slider"
            aria-label="تغییر اندازه از راست"
            tabIndex={0}
          >
            <div className="h-16 w-1 rounded-full bg-primary-500 shadow-lg" />
          </div>

          {/* Size indicator */}
          {isResizing && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 text-white text-xs rounded-lg font-mono backdrop-blur-sm shadow-lg">
              {Math.round(width)}px
            </div>
          )}

          {/* Alt text badge */}
          {alt && (
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-[10px] rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity max-w-[150px] truncate">
              {alt}
            </div>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default ResizeImage;
