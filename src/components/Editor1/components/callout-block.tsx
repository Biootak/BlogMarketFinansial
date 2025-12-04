'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import { type CalloutType, calloutTypeConfig } from '../extensions/callout';

const CalloutBlock: React.FC<NodeViewProps> = ({ node, updateAttributes, editor, selected }) => {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  const type = (node.attrs.type as CalloutType) || 'info';
  const config = useMemo(() => calloutTypeConfig[type], [type]);
  const icon = node.attrs.icon || config.icon;

  // Click outside handler
  useEffect(() => {
    if (!showTypePicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowTypePicker(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowTypePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showTypePicker]);

  const handleTypeChange = useCallback((newType: CalloutType) => {
    updateAttributes({
      type: newType,
      icon: calloutTypeConfig[newType].icon,
    });
    setShowTypePicker(false);
  }, [updateAttributes]);

  const typeLabels: Record<CalloutType, string> = useMemo(() => ({
    info: 'اطلاعات',
    warning: 'هشدار',
    success: 'موفقیت',
    error: 'خطا',
  }), []);

  const typeDescriptions: Record<CalloutType, string> = useMemo(() => ({
    info: 'برای نکات و اطلاعات مفید',
    warning: 'برای هشدارها و نکات مهم',
    success: 'برای پیام‌های موفقیت',
    error: 'برای خطاها و مشکلات',
  }), []);

  return (
    <NodeViewWrapper
      className={`my-5 p-4 rounded-xl border-r-4 transition-all duration-200 ${config.bgColor} ${config.borderColor} ${
        selected ? 'ring-2 ring-primary-500 ring-offset-2 shadow-lg' : 'shadow-sm hover:shadow-md'
      }`}
      data-type="callout"
      data-callout-type={type}
      role="note"
      aria-label={`بلاک ${typeLabels[type]}`}
    >
      <div className="flex gap-4">
        <div className="relative flex-shrink-0" ref={pickerRef}>
          <button
            type="button"
            onClick={() => editor.isEditable && setShowTypePicker(!showTypePicker)}
            className={`w-10 h-10 flex items-center justify-center text-2xl rounded-xl transition-all duration-200 ${
              editor.isEditable 
                ? 'cursor-pointer hover:scale-110 hover:shadow-md active:scale-95' 
                : 'cursor-default'
            } ${showTypePicker ? 'bg-white/50 dark:bg-black/20 shadow-inner' : ''}`}
            contentEditable={false}
            aria-label={`نوع: ${typeLabels[type]}. برای تغییر کلیک کنید`}
            aria-expanded={showTypePicker}
            aria-haspopup="listbox"
            disabled={!editor.isEditable}
          >
            {icon}
          </button>
          
          {showTypePicker && editor.isEditable && (
            <div
              className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 z-50 min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-150"
              contentEditable={false}
              role="listbox"
              aria-label="انتخاب نوع بلاک"
            >
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                نوع بلاک
              </p>
              <div className="space-y-1">
                {(Object.keys(calloutTypeConfig) as CalloutType[]).map((calloutType) => {
                  const isSelected = type === calloutType;
                  return (
                    <button
                      key={calloutType}
                      type="button"
                      onClick={() => handleTypeChange(calloutType)}
                      role="option"
                      aria-selected={isSelected}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-150 ${
                        isSelected 
                          ? 'bg-primary-100 dark:bg-primary-900/30 border-r-2 border-primary-500' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 border-r-2 border-transparent'
                      }`}
                    >
                      <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg ${
                        isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        {calloutTypeConfig[calloutType].icon}
                      </span>
                      <div className="flex-1 text-right">
                        <div className={`text-sm font-medium ${
                          isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {typeLabels[calloutType]}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                          {typeDescriptions[calloutType]}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        <div className={`flex-1 min-w-0 ${config.textColor}`}>
          <NodeViewContent className="callout-content prose prose-sm max-w-none" />
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export default CalloutBlock;
