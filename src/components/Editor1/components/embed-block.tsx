'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { type EmbedProvider, getEmbedUrl } from '../extensions/embed';
import { Loader2, AlertCircle, RefreshCw, ExternalLink, Play, Film, Twitter, Link as LinkIcon, type LucideIcon } from 'lucide-react';

const EmbedBlock: React.FC<NodeViewProps> = ({ node, updateAttributes, editor, selected }) => {
  const { src, provider, embedId, width, height } = node.attrs;
  const [isResizing, setIsResizing] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(height);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const embedUrl = useMemo(() => getEmbedUrl(provider as EmbedProvider, embedId), [provider, embedId]);
  
  // تشخیص نوع provider برای نمایش آیکون مناسب
  const providerConfig = useMemo(() => {
    const configs: Record<string, { label: string; color: string; icon: LucideIcon }> = {
      youtube: { label: 'YouTube', color: 'bg-red-600', icon: Play },
      vimeo: { label: 'Vimeo', color: 'bg-blue-500', icon: Film },
      twitter: { label: 'Twitter', color: 'bg-sky-500', icon: Twitter },
      generic: { label: 'Link', color: 'bg-gray-600', icon: LinkIcon },
    };
    return configs[provider as string] || configs.generic;
  }, [provider]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!editor.isEditable) return;
    e.preventDefault();
    setIsResizing(true);
  }, [editor.isEditable]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const newHeight = Math.max(200, Math.min(800, e.clientY - rect.top));
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
    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">خطا در بارگذاری محتوا</p>
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl"
          >
            <RefreshCw size={16} />
            تلاش مجدد
          </button>
        </div>
      );
    }

    switch (provider) {
      case 'youtube':
      case 'vimeo':
        return (
          <div className="relative overflow-hidden rounded-xl">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 z-10">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">در حال بارگذاری...</p>
              </div>
            )}
            <iframe
              src={embedUrl}
              width="100%"
              height={currentHeight}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-xl"
              onLoad={handleLoad}
              onError={handleError}
              title={`${provider} video`}
              loading="lazy"
            />
          </div>
        );
      case 'twitter':
        return (
          <div className="twitter-embed relative rounded-xl overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-50 to-sky-100 dark:from-gray-800 dark:to-gray-900 min-h-[200px] z-10">
                <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
              </div>
            )}
            <blockquote className="twitter-tweet" data-theme="light">
              <a href={src}>Loading tweet...</a>
            </blockquote>
          </div>
        );
      default:
        return (
          <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl text-center">
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
              <ExternalLink className="w-6 h-6 text-gray-500" />
            </div>
            <a 
              href={src} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium hover:underline inline-flex items-center gap-2"
            >
              {src}
              <ExternalLink size={14} />
            </a>
          </div>
        );
    }
  };

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`my-6 relative group transition-all duration-200 ${
        selected ? 'ring-2 ring-primary-500 ring-offset-2 rounded-xl' : ''
      }`}
      contentEditable={false}
      data-type="embed"
    >
      <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200">
        {renderEmbed()}
        
        {/* Resize handle */}
        {editor.isEditable && !hasError && (
          <div
            onMouseDown={handleMouseDown}
            className="absolute bottom-0 left-0 right-0 h-6 cursor-ns-resize bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            role="slider"
            aria-label="تغییر اندازه"
            aria-valuemin={200}
            aria-valuemax={800}
            aria-valuenow={currentHeight}
          >
            <div className="w-20 h-1.5 bg-white/80 rounded-full shadow-sm" />
          </div>
        )}
        
        {/* Height indicator during resize */}
        {isResizing && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 text-white text-xs rounded-lg font-mono backdrop-blur-sm">
            {Math.round(currentHeight)}px
          </div>
        )}
      </div>
      
      {/* Provider badge */}
      <div className={`absolute top-3 left-3 px-3 py-1.5 ${providerConfig.color} text-white text-xs rounded-lg font-medium backdrop-blur-sm shadow-lg flex items-center gap-1.5`}>
        <providerConfig.icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        <span>{providerConfig.label}</span>
      </div>

      {/* Open in new tab button */}
      {src && (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
          aria-label="باز کردن در تب جدید"
        >
          <ExternalLink size={14} />
        </a>
      )}
    </NodeViewWrapper>
  );
};

export default EmbedBlock;
