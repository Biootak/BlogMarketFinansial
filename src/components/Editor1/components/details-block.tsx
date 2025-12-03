'use client';

import React from 'react';
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import { ChevronDown, ChevronLeft } from 'lucide-react';

const DetailsBlock: React.FC<NodeViewProps> = ({ node, updateAttributes, editor }) => {
  const isOpen = node.attrs.open;

  const toggleOpen = () => {
    if (editor.isEditable) {
      updateAttributes({ open: !isOpen });
    }
  };

  return (
    <NodeViewWrapper className="my-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={toggleOpen}
        contentEditable={false}
      >
        <span className="text-gray-500 dark:text-gray-400 transition-transform">
          {isOpen ? <ChevronDown size={18} /> : <ChevronLeft size={18} />}
        </span>
        <div className="flex-1 font-medium text-gray-900 dark:text-gray-100">
          <NodeViewContent className="details-summary" as="span" />
        </div>
      </div>
      
      {isOpen && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <NodeViewContent className="details-content" />
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default DetailsBlock;
