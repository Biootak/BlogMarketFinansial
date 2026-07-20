import type { Editor } from '@tiptap/core';
import { isEqual } from 'lodash';
import { useEffect, useRef, useState } from 'react';

type MapFn<T, R> = (arg: T) => R;

function mapSelf<T>(d: T): T {
  return d;
}

export function useAttributes<T, R>(
  editor: Editor,
  attribute: string,
  defaultValue: T,
  map?: MapFn<T, R>,
) {
  const mapFn = (map || mapSelf) as MapFn<T, R>;
  const [value, setValue] = useState<R>(mapFn(defaultValue));
  const prevValueCache = useRef<R>(value);

  // M16: بخوانیم defaultValue / mapFn را از طریق ref تا effect روی هر
  // رندر دوباره subscribe نشود (این مقادیر اغلب هویت جدیدی می‌گیرند).
  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;
  const mapFnRef = useRef(mapFn);
  mapFnRef.current = mapFn;

  useEffect(() => {
    const listener = () => {
      const attrs = { ...defaultValueRef.current, ...editor.getAttributes(attribute) };
      const nextAttrs = mapFnRef.current(attrs);
      if (isEqual(prevValueCache.current, nextAttrs)) {
        return;
      }
      setValue(nextAttrs);
      prevValueCache.current = nextAttrs;
    };

    editor.on('transaction', listener);

    return () => {
      editor.off('transaction', listener);
    };
  }, [editor, attribute]);

  return value;
}
