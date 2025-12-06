'use client';

import { type NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

// Dynamic import for KaTeX to avoid SSR issues
let katex: typeof import('katex') | null = null;
let katexLoaded = false;

const loadKatex = async () => {
  if (katexLoaded) return katex;
  if (typeof window === 'undefined') return null;

  try {
    const mod = await import('katex');
    katex = mod.default as unknown as typeof import('katex');
    katexLoaded = true;

    // Load CSS dynamically
    if (!document.querySelector('link[href*="katex"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
      document.head.appendChild(link);
    }

    return katex;
  } catch (error) {
    console.error('Failed to load KaTeX:', error);
    return null;
  }
};

const MathBlock: React.FC<NodeViewProps> = ({ node, updateAttributes, editor, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [latex, setLatex] = useState(node.attrs.latex || '');
  const [error, setError] = useState<string | null>(null);
  const [renderedHtml, setRenderedHtml] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLatex(node.attrs.latex || '');
  }, [node.attrs.latex]);

  const renderMath = useCallback(async (latexStr: string, displayMode: boolean) => {
    if (!latexStr.trim()) {
      setRenderedHtml('');
      setError(null);
      return;
    }

    try {
      const katexModule = await loadKatex();
      if (!katexModule) {
        setError('کتابخانه KaTeX بارگذاری نشد');
        return;
      }

      const html = (katexModule as any).renderToString(latexStr, {
        displayMode,
        throwOnError: true,
        strict: false,
      });
      setRenderedHtml(html);
      setError(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در پردازش فرمول';
      setError(errorMessage);
      setRenderedHtml('');
    }
  }, []);

  useEffect(() => {
    renderMath(latex, node.attrs.displayMode);
  }, [latex, node.attrs.displayMode, renderMath]);

  const handleSave = () => {
    updateAttributes({ latex });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
    if (e.key === 'Escape') {
      setLatex(node.attrs.latex || '');
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <NodeViewWrapper
      className={`my-4 ${selected ? 'ring-2 ring-primary-500' : ''}`}
      contentEditable={false}
    >
      {isEditing ? (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-300 dark:border-gray-600 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">فرمول LaTeX</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setLatex(node.attrs.latex || '');
                  setIsEditing(false);
                }}
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-2 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600"
              >
                ذخیره
              </button>
            </div>
          </div>
          <textarea
            ref={inputRef}
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-3 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none focus:outline-none"
            rows={3}
            placeholder="فرمول LaTeX را وارد کنید... (مثال: E = mc^2)"
            dir="ltr"
          />
          {error && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border-t border-red-200 dark:border-red-800">
              ⚠️ {error}
            </div>
          )}
          {renderedHtml && !error && (
            <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div
                className="text-center overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => editor.isEditable && setIsEditing(true)}
          className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
            !editor.isEditable ? 'cursor-default' : ''
          }`}
        >
          {renderedHtml ? (
            <div
              className="text-center overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ) : error ? (
            <div className="text-center text-red-500">
              <span className="text-2xl">⚠️</span>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : (
            <div className="text-center text-gray-400">
              <span className="text-2xl">∑</span>
              <p className="text-sm mt-1">برای افزودن فرمول کلیک کنید</p>
            </div>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default MathBlock;
