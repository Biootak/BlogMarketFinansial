'use client';

import React, { useState } from 'react';
import { BubbleMenu } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Merge,
  Split,
  MoreHorizontal,
  RowsIcon,
  Columns,
} from 'lucide-react';

interface TableToolbarProps {
  editor: Editor;
}

const TableToolbar: React.FC<TableToolbarProps> = ({ editor }) => {
  const [showMore, setShowMore] = useState(false);

  const canMerge = editor.can().mergeCells();
  const canSplit = editor.can().splitCell();

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        duration: 100,
        placement: 'top',
        offset: [0, 10],
      }}
      shouldShow={({ editor }) => {
        return editor.isActive('table');
      }}
      className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-1.5"
    >
      {/* Row operations */}
      <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => editor.chain().focus().addRowBefore().run()}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          title="افزودن ردیف بالا"
        >
          <ArrowUp size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          title="افزودن ردیف پایین"
        >
          <ArrowDown size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteRow().run()}
          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
          title="حذف ردیف"
        >
          <RowsIcon size={16} />
        </button>
      </div>

      {/* Column operations */}
      <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          title="افزودن ستون راست"
        >
          <ArrowRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          title="افزودن ستون چپ"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteColumn().run()}
          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
          title="حذف ستون"
        >
          <Columns size={16} />
        </button>
      </div>

      {/* Cell operations */}
      <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => editor.chain().focus().mergeCells().run()}
          disabled={!canMerge}
          className={`p-1.5 rounded-lg transition-colors ${
            canMerge
              ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          }`}
          title="ادغام سلول‌ها"
        >
          <Merge size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().splitCell().run()}
          disabled={!canSplit}
          className={`p-1.5 rounded-lg transition-colors ${
            canSplit
              ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          }`}
          title="تفکیک سلول"
        >
          <Split size={16} />
        </button>
      </div>

      {/* Delete table */}
      <div className="flex items-center gap-0.5 px-1">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('آیا از حذف جدول مطمئن هستید؟')) {
              editor.chain().focus().deleteTable().run();
            }
          }}
          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
          title="حذف جدول"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </BubbleMenu>
  );
};

export default TableToolbar;
