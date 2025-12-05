import React from 'react';
import { type NodeViewProps, NodeViewWrapper } from '@tiptap/react';

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

type RenderImageProps = NodeViewProps & {
  node: NodeViewProps['node'] & {
    attrs: ImageNodeAttributes;
  };
};

const RenderImage = ({ node }: RenderImageProps) => {
  const {
    src,
    alt,
    title,
    width = '100%',
    textAlign = 'center',
    rotation = 0,
    filter = 'none',
    opacity = 100,
    borderRadius = 12,
    shadow = true,
    caption,
  } = node.attrs;

  const alignmentClasses = {
    left: 'justify-start',
    right: 'justify-end',
    center: 'justify-center',
  }[textAlign];

  return (
    <NodeViewWrapper className={`my-4 flex ${alignmentClasses}`}>
      <figure className="inline-block">
        <div
          style={{
            width: width || '100%',
            display: 'inline-block',
            opacity: opacity / 100,
            borderRadius: `${borderRadius}px`,
            boxShadow: shadow
              ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
              : 'none',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
          }}
        >
          <img
            className="block w-full h-auto"
            src={src}
            alt={alt || ''}
            title={title || undefined}
            style={{
              transform: `rotate(${rotation}deg)`,
              filter: filter !== 'none' ? filter : undefined,
              transition: 'all 0.3s ease',
            }}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/placeholder-large.png';
            }}
          />
        </div>
        {caption && (
          <figcaption className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
            {caption}
          </figcaption>
        )}
      </figure>
    </NodeViewWrapper>
  );
};

export default RenderImage;
