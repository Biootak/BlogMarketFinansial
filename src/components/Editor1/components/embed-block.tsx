'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { type EmbedProvider, getEmbedUrl } from '../extensions/embed';

const EmbedBlock: React.FC<NodeViewProps> = ({ node, updateAttributes, editor, selected }) => {
  const { src, provider, embedId, width, height } = node.attrs;
  const [isResizing, setIsResizing] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(height);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const embedUrl = getEmbedUrl(provider as EmbedProvider, embedId);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!editor.isEditable) return;
    e.preventDefault();
    setIsResizing(true);
  }, [editor.isEditable]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const newHeight = Math.max(200, e.clientY - rect.top);
        setCurrentHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      updateAttributes({ height: currentHeight });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, currentHeight, updateAttributes]);

  const renderEmbed = () => {
    switch (provider) {
      case 'youtube':
      case 'vimeo':
        return (
          <iframe
            src={embedUrl}
            width="100%"
            height={currentHeight}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="rounded-lg"
          />
        );
      case 'twitter':
        return (
          <div className="twitter-embed">
            <blockquote className="twitter-tweet" data-theme="light">
              <a href={src}>Loading tweet...</a>
            </blockquote>
          </div>
        );
      default:
        return (
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
            <a href={src} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
              {src}
            </a>
          </div>
        );
    }
  };

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`my-4 relative group ${selected ? 'ring-2 ring-primary-500' : ''}`}
      contentEditable={false}
    >
      <div className="relative">
        {renderEmbed()}
        
        {/* Resize handle */}
        {editor.isEditable && (
          <div
            onMouseDown={handleMouseDown}
            className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize bg-transparent hover:bg-primary-200/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <div className="w-12 h-1 bg-gray-400 rounded-full" />
          </div>
        )}
      </div>
      
      {/* Provider badge */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded capitalize">
        {provider}
      </div>
    </NodeViewWrapper>
  );
};

export default EmbedBlock;
