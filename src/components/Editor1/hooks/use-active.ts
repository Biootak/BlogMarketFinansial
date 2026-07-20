import { useCallback, useEffect, useRef, useState } from 'react';

import type { Editor } from '@tiptap/core';

export const useActive = (editor: Editor, name: string, attributes?: Record<string, any>) => {
  const [active, setActive] = useState(false);

  // استفاده از ref برای جلوگیری از re-render بی‌نهایت
  const nameRef = useRef(name);
  const attributesRef = useRef(attributes);

  // به‌روزرسانی refs
  nameRef.current = name;
  attributesRef.current = attributes;

  const checkActive = useCallback(() => {
    const isActive = attributesRef.current
      ? editor.isActive(nameRef.current, attributesRef.current)
      : editor.isActive(nameRef.current);
    setActive(isActive);
  }, [editor]);

  useEffect(() => {
    // بررسی اولیه
    checkActive();

    const listener = () => {
      checkActive();
    };

    editor.on('transaction', listener);

    return () => {
      editor.off('transaction', listener);
    };
  }, [editor, checkActive]);

  return active;
};
