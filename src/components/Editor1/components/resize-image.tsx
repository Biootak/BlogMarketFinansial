import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { type NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

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

const ResizeImage = ({ editor, node, updateAttributes }: ResizeImageProps) => {
  const { src, textAlign, width: widthProps } = node.attrs;

  const isEditable = editor.isEditable;

  const wrapperRef = useRef<HTMLDivElement>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [initialPosition, setInitialPosition] = useState(0);
  const [initialSize, setInitialSize] = React.useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const [width, setWidth] = useState<any>(0);

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
      const { clientX, clientY } = event;

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

  return (
    <NodeViewWrapper ref={wrapperRef} className="group relative" style={{ textAlign }}>
      {!isEditable ? (
        <img className="inline-block" src={src} alt="" style={{ width }} />
      ) : (
        <div className="relative inline-block" contentEditable={false}>
          {/* Alignment buttons - show on hover */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => handleAlignChange('left')}
              className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${textAlign === 'left' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
              title="چپ‌چین"
            >
              <AlignLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleAlignChange('center')}
              className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${textAlign === 'center' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
              title="وسط‌چین"
            >
              <AlignCenter size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleAlignChange('right')}
              className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${textAlign === 'right' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
              title="راست‌چین"
            >
              <AlignRight size={16} />
            </button>
          </div>
          <div
            onMouseDown={handleMouseDown('left')}
            className="absolute z-40 h-full cursor-col-resize top-0 flex w-6 select-none flex-col justify-center after:flex after:h-12 after:w-[3px] after:rounded-[6px] after:bg-blue-500 after:opacity-0 after:content-['_'] group-hover:after:opacity-100 -left-2.5 -ml-3 pl-3"
          />
          <img className="inline-block" src={src} alt="" style={{ width }} data-drag-handle />
          <div
            onMouseDown={handleMouseDown('right')}
            className="absolute z-40 h-full cursor-col-resize top-0 flex w-6 select-none flex-col justify-center after:flex after:h-12 after:w-[3px] after:rounded-[6px] after:bg-blue-500 after:opacity-0 after:content-['_'] group-hover:after:opacity-100 -right-2.5 -mr-3 items-end pr-3"
          />
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default ResizeImage;
