// callout-block.tsx — Inkwell 2026
// Visual surface lives in styles/callout.scss. This component owns
// behaviour (type picker) and the small switcher button — no Tailwind
// bleed from the rest of the dashboard.

'use client';

import type { NodeViewProps } from '@tiptap/core';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type CalloutType, calloutTypeConfig } from '../extensions/callout';

const CalloutBlock: React.FC<NodeViewProps> = ({ node, updateAttributes, editor, selected }) => {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const type = (node.attrs.type as CalloutType) || 'info';
  const config = useMemo(() => calloutTypeConfig[type], [type]);
  const IconComponent = config.icon;

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

  const handleTypeChange = useCallback(
    (newType: CalloutType) => {
      updateAttributes({
        type: newType,
        icon: calloutTypeConfig[newType].iconName,
      });
      setShowTypePicker(false);
    },
    [updateAttributes],
  );

  const typeLabels: Record<CalloutType, string> = useMemo(
    () => ({
      info: 'اطلاعات',
      warning: 'هشدار',
      success: 'موفقیت',
      error: 'خطا',
    }),
    [],
  );

  const typeDescriptions: Record<CalloutType, string> = useMemo(
    () => ({
      info: 'برای نکات و اطلاعات مفید',
      warning: 'برای هشدارها و نکات مهم',
      success: 'برای پیام‌های موفقیت',
      error: 'برای خطاها و مشکلات',
    }),
    [],
  );

  return (
    <NodeViewWrapper
      className={`at-callout ${selected ? 'is-selected' : ''}`}
      data-type="callout"
      data-callout-type={type}
      role="note"
      aria-label={`بلاک ${typeLabels[type]}`}
    >
      <div className="at-callout__row">
        <div className="at-callout__picker" ref={pickerRef}>
          <button
            type="button"
            onClick={() => editor.isEditable && setShowTypePicker(!showTypePicker)}
            className={`at-callout__btn ${showTypePicker ? 'is-open' : ''}`}
            contentEditable={false}
            aria-label={`نوع: ${typeLabels[type]}. برای تغییر کلیک کنید`}
            aria-expanded={showTypePicker}
            aria-haspopup="listbox"
            disabled={!editor.isEditable}
          >
            <IconComponent className="at-callout__btn-ico" strokeWidth={2} aria-hidden />
          </button>

          {showTypePicker && editor.isEditable && (
            <div
              className="at-callout__popover"
              contentEditable={false}
              role="listbox"
              aria-label="انتخاب نوع بلاک"
            >
              <p className="at-callout__popover-head">نوع بلاک</p>
              <div className="at-callout__popover-list">
                {(Object.keys(calloutTypeConfig) as CalloutType[]).map((calloutType) => {
                  const isSelected = type === calloutType;
                  const PickerIcon = calloutTypeConfig[calloutType].icon;
                  return (
                    <button
                      key={calloutType}
                      type="button"
                      onClick={() => handleTypeChange(calloutType)}
                      role="option"
                      aria-selected={isSelected}
                      className={`at-callout__option ${isSelected ? 'is-active' : ''}`}
                    >
                      <span className="at-callout__option-ico">
                        <PickerIcon strokeWidth={2} aria-hidden />
                      </span>
                      <span className="at-callout__option-text">
                        <span className="at-callout__option-label">{typeLabels[calloutType]}</span>
                        <span className="at-callout__option-desc">
                          {typeDescriptions[calloutType]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="at-callout__body">
          <NodeViewContent className="callout-content" />
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export default CalloutBlock;
