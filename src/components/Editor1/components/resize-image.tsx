import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { type NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { 
  AlignLeft, AlignCenter, AlignRight, Maximize2, Trash2, ExternalLink,
  RotateCw, Type, Download, ZoomIn, ZoomOut, Settings
} from 'lucide-react';

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
    caption
  } = node.attrs;

  // Debug: log attrs on every render


  const isEditable = editor.isEditable;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [initialPosition, setInitialPosition] = useState(0);
  const [initialSize, setInitialSize] = React.useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const [width, setWidth] = useState<any>(0);
  const [showControls, setShowControls] = useState(false);
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAlt, setEditAlt] = useState(alt || '');
  const [editTitle, setEditTitle] = useState(title || '');
  const [editCaption, setEditCaption] = useState(caption || '');
  const [zoom, setZoom] = useState(1);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

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

  const handleRotate = useCallback(() => {
    const newRotation = (rotation + 90) % 360;
    updateAttributes({ rotation: newRotation });
  }, [rotation, updateAttributes]);

  const handleResetRotation = useCallback(() => {
    updateAttributes({ rotation: 0 });
  }, [updateAttributes]);

  const handleFilterChange = useCallback((newFilter: string) => {
    updateAttributes({ filter: newFilter });
    setShowAdvancedMenu(false);
  }, [updateAttributes]);

  const handleOpacityChange = useCallback((newOpacity: number) => {
    updateAttributes({ opacity: newOpacity });
  }, [updateAttributes]);

  const handleBorderRadiusChange = useCallback((newRadius: number) => {
    updateAttributes({ borderRadius: newRadius });
  }, [updateAttributes]);

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
    } catch (error) {
      // Silent fail
    }
  }, [src, alt]);

  const handleSaveMetadata = useCallback(() => {
    updateAttributes({ 
      alt: editAlt,
      title: editTitle,
      caption: editCaption
    });
    setShowEditModal(false);
  }, [editAlt, editTitle, editCaption, updateAttributes]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  useEffect(() => {
    if (imgRef.current) {
      const img = imgRef.current;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
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

  // تعیین کلاس‌های flexbox برای تراز
  const alignmentClasses = useMemo(() => {
    switch (textAlign) {
      case 'left': return 'justify-start';
      case 'right': return 'justify-end';
      case 'center':
      default: return 'justify-center';
    }
  }, [textAlign]);

  // استایل‌های تصویر
  const imageStyle = useMemo(() => ({
    width,
    transform: `rotate(${rotation}deg) scale(${zoom})`,
    filter: filter !== 'none' ? filter : undefined,
    opacity: opacity / 100,
    borderRadius: `${borderRadius}px`,
    boxShadow: shadow ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' : undefined,
    transition: 'all 0.3s ease',
  }), [width, rotation, zoom, filter, opacity, borderRadius, shadow]);

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
      className={`group relative my-4 flex -mx-4 px-4 ${alignmentClasses}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isResizing && setShowControls(false)}
      onFocus={() => setShowControls(true)}
      onBlur={() => setShowControls(false)}
      data-rotation={rotation}
      data-filter={filter}
      data-opacity={opacity}
    >
      {!isEditable ? (
        <img 
          className="rounded-xl shadow-md" 
          src={src} 
          alt={alt || ''} 
          style={{ width }}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/images/placeholder-large.png';
          }}
        />
      ) : (
        <div 
          className={`relative transition-all duration-200 ${
            selected ? 'ring-2 ring-primary-500 ring-offset-2 rounded-xl' : ''
          }`} 
          contentEditable={false}
        >
          {/* Main Toolbar */}
          <div 
            className={`absolute -top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-1.5 border border-gray-200 dark:border-gray-700 transition-all duration-200 ${
              showControls || selected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            {/* Alignment */}
            <button
              type="button"
              onClick={() => handleAlignChange('left')}
              aria-label="چپ‌چین"
              className={getAlignButtonClass('left')}
            >
              <AlignLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleAlignChange('center')}
              aria-label="وسط‌چین"
              className={getAlignButtonClass('center')}
            >
              <AlignCenter size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleAlignChange('right')}
              aria-label="راست‌چین"
              className={getAlignButtonClass('right')}
            >
              <AlignRight size={16} />
            </button>
            
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />
            
            {/* Transform */}
            <button
              type="button"
              onClick={handleRotate}
              aria-label="چرخش 90 درجه"
              title={`چرخش فعلی: ${rotation}°`}
              className={`p-2 rounded-lg transition-colors ${
                rotation !== 0
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <RotateCw size={16} />
            </button>
            
            <button
              type="button"
              onClick={handleZoomIn}
              aria-label="بزرگنمایی"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <ZoomIn size={16} />
            </button>
            
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label="کوچک‌نمایی"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <ZoomOut size={16} />
            </button>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />
            
            {/* Metadata */}
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              aria-label="ویرایش متن"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <Type size={16} />
            </button>

            {/* Advanced Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAdvancedMenu(!showAdvancedMenu)}
                aria-label="تنظیمات پیشرفته"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <Settings size={16} />
              </button>
              
              {showAdvancedMenu && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 z-50">
                  {/* Filters */}
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      فیلتر
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {filters.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => handleFilterChange(f.value)}
                          className={`text-xs p-1.5 rounded transition-colors ${
                            filter === f.value
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Opacity */}
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex justify-between">
                      <span>شفافیت</span>
                      <span>{opacity}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={opacity}
                      onChange={(e) => handleOpacityChange(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Border Radius */}
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex justify-between">
                      <span>گوشه‌های گرد</span>
                      <span>{borderRadius}px</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={borderRadius}
                      onChange={(e) => handleBorderRadiusChange(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Shadow */}
                  <button
                    type="button"
                    onClick={handleShadowToggle}
                    className={`w-full text-xs p-2 rounded transition-colors ${
                      shadow
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {shadow ? 'سایه فعال' : 'سایه غیرفعال'}
                  </button>
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />
            
            {/* Actions */}
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
              onClick={handleDownload}
              aria-label="دانلود"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <Download size={16} />
            </button>

            <button
              type="button"
              onClick={handleOpenInNewTab}
              aria-label="باز کردن در تب جدید"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <ExternalLink size={16} />
            </button>
            
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />
            
            <button
              type="button"
              onClick={handleDelete}
              aria-label="حذف تصویر"
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Edit Modal */}
          {showEditModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                  ویرایش اطلاعات تصویر
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      متن جایگزین (Alt)
                    </label>
                    <input
                      type="text"
                      value={editAlt}
                      onChange={(e) => setEditAlt(e.target.value)}
                      placeholder="توضیح کوتاه برای تصویر"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      عنوان (Title)
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="عنوان تصویر"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      توضیح (Caption)
                    </label>
                    <textarea
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder="توضیح کامل زیر تصویر"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    />
                  </div>

                  {imageSize && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      ابعاد: {imageSize.width} × {imageSize.height} پیکسل
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={handleSaveMetadata}
                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    ذخیره
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            </div>
          )}

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

          <div 
            style={{
              width,
              display: 'inline-block',
              opacity: opacity / 100,
              borderRadius: `${borderRadius}px`,
              boxShadow: shadow ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' : 'none',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
            }}
          >
            <img 
              ref={imgRef}
              className="block w-full h-auto" 
              src={src} 
              alt={alt || ''} 
              title={title || undefined}
              style={{
                transform: `rotate(${rotation}deg) scale(${zoom})`,
                filter: filter !== 'none' ? filter : undefined,
                transition: 'all 0.3s ease',
              }}
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/images/placeholder-large.png';
              }}
              data-drag-handle 
            />
          </div>

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

          {/* Info badges */}
          <div className="absolute bottom-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {alt && (
              <div className="px-2 py-1 bg-black/70 text-white text-[10px] rounded-md backdrop-blur-sm max-w-[200px] truncate">
                Alt: {alt}
              </div>
            )}
            {imageSize && (
              <div className="px-2 py-1 bg-black/70 text-white text-[10px] rounded-md backdrop-blur-sm">
                {imageSize.width} × {imageSize.height}
              </div>
            )}
          </div>

          {/* Zoom indicator */}
          {zoom !== 1 && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded-md backdrop-blur-sm">
              {Math.round(zoom * 100)}%
            </div>
          )}

          {/* Rotation indicator */}
          {rotation !== 0 && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded-md backdrop-blur-sm">
              {rotation}°
            </div>
          )}


        </div>
      )}

      {/* Caption below image */}
      {caption && !isEditable && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
          {caption}
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default ResizeImage;
