'use client';

import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import { type CalloutType, calloutTypeConfig } from '../extensions/callout';

const CalloutBlock: React.FC<NodeViewProps> = ({ node, updateAttributes, editor }) => {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const type = (node.attrs.type as CalloutType) || 'info';
  const icon = node.attrs.icon || calloutTypeConfig[type].icon;
  const config = calloutTypeConfig[type];

  const handleTypeChange = (newType: CalloutType) => {
    updateAttributes({
      type: newType,
      icon: calloutTypeConfig[newType].icon,
    });
    setShowTypePicker(false);
  };

  return (
    <NodeViewWrapper
      className={`my-4 p-4 rounded-lg border-r-4 ${config.bgColor} ${config.borderColor}`}
    >
      <div className="flex gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => editor.isEditable && setShowTypePicker(!showTypePicker)}
            className={`text-2xl cursor-pointer hover:scale-110 transition-transform ${
              !editor.isEditable ? 'cursor-default' : ''
            }`}
            contentEditable={false}
          >
            {icon}
          </button>
          
          {showTypePicker && editor.isEditable && (
            <div
              className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50 flex gap-2"
              contentEditable={false}
            >
              {(Object.keys(calloutTypeConfig) as CalloutType[]).map((calloutType) => (
                <button
                  key={calloutType}
                  type="button"
                  onClick={() => handleTypeChange(calloutType)}
                  className={`text-xl p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    type === calloutType ? 'bg-gray-200 dark:bg-gray-600' : ''
                  }`}
                >
                  {calloutTypeConfig[calloutType].icon}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className={`flex-1 ${config.textColor}`}>
          <NodeViewContent className="callout-content" />
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export default CalloutBlock;
