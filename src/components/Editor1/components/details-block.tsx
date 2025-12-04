'use client';

import React, { useCallback } from 'react';
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import { ChevronDown, ChevronLeft } from 'lucide-react';

const DetailsBlock: React.FC<NodeViewProps> = ({ node, updateAttributes, editor, selected }) => {
  const isOpen = node.attrs.open;

  const toggleOpen = useCallback(() => {
    if (editor.isEditable) {
      updateAttributes({ open: !isOpen });
    }
  }, [editor.isEditable, isOpen, updateAttributes]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      toggleOpen();
    }
  }, [toggleOpen]);

  return (
    <NodeViewWrapper 
      className={`my-4 border rounded-lg overflow-hidden transition-all duration-200 ${
        selected 
          ? 'border-primary-500 ring-2 ring-primary-500/20' 
          : 'border-gray-200 dark:border-gray-700'
      }`}
      data-type="details"
      data-open={isOpen}
    >
      {/* Header - Toggle Button */}
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors duration-150 ${
          isOpen 
            ? 'bg-primary-50 dark:bg-primary-900/20 border-b border-gray-200 dark:border-gray-700' 
            : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
        } ${!editor.isEditable ? 'cursor-default' : ''}`}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls="details-content"
        aria-label={isOpen ? 'بستن آکاردئون' : 'باز کردن آکاردئون'}
        contentEditable={false}
      >
        <span 
          className={`text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-0' : '-rotate-90'
          }`}
          aria-hidden="true"
        >
          <ChevronDown size={18} />
        </span>
        <div className="flex-1 font-medium text-gray-900 dark:text-gray-100">
          {/* عنوان آکاردئون - اولین فرزند */}
        </div>
      </div>
      
      {/* Content Area - NodeViewContent renders summary and content */}
      <div 
        id="details-content"
        className={`transition-all duration-200 ease-in-out ${
          isOpen 
            ? 'opacity-100 max-h-[2000px]' 
            : 'opacity-0 max-h-0 overflow-hidden'
        }`}
      >
        <NodeViewContent className="details-node-content px-4 py-3" />
      </div>
    </NodeViewWrapper>
  );
};

export default DetailsBlock;
