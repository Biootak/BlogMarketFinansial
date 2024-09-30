'use client';

import type React from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaHeading,
  FaListUl,
  FaListOl,
  FaQuoteRight,
  FaImage,
  FaLink,
  FaUndoAlt,
  FaRedoAlt,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
} from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';

// تعریف پراپ‌های کامپوننت
interface TipTapEditorProps {
  content: string | undefined;
  onChange: (content: string) => void;
  isRTL?: boolean;
  className?: string;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  isRTL = false,
  className = '',
}) => {
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  // تنظیمات ادیتور
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
    ],
    editorProps: {
      attributes: {
        class: `prose max-w-none p-4 ${isRTL ? 'text-right' : 'text-left'} whitespace-pre-wrap`,
        dir: isRTL ? 'rtl' : 'ltr',
      },
      handleKeyDown: (view, event) => {
        // اضافه کردن فاصله به صورت دستی
        if (event.key === ' ') {
          view.dispatch(view.state.tr.insertText(' '));
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      localStorage.setItem('editorContent', html);
    },
    content: content,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (editor && content && isMounted) {
      editor.commands.setContent(content);
    }
  }, [editor, content, isMounted]);

  // مدیریت آپلود تصویر
  const handleImageUpload = useCallback(
    (urls: string[]) => {
      if (editor) {
        urls.forEach((url) => {
          editor.chain().focus().setImage({ src: url }).run();
        });
        toast({
          title: 'تصویر آپلود شد',
          description: 'تصویر با موفقیت به ویرایشگر اضافه شد.',
          variant: 'success',
        });
      }
      setShowImageUploader(false);
    },
    [editor, toast],
  );

  // مدیریت افزودن لینک
  const handleLinkSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const url = formData.get('url') as string;
      if (editor && url) {
        editor.chain().focus().setLink({ href: url }).run();
        setShowLinkInput(false);
      }
    },
    [editor],
  );

  // کامپوننت دکمه نوار ابزار
  const ToolbarButton = useMemo(() => {
    return ({
      icon: Icon,
      onClick,
      isActive = false,
      tooltip,
    }: {
      icon: React.ElementType;
      onClick: () => void;
      isActive?: boolean;
      tooltip: string;
    }) => (
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClick}
              className={`p-2 ${
                isActive
                  ? 'bg-secondary-200 text-primary-700 dark:bg-secondary-800 dark:text-primary-300'
                  : 'text-neutral-600 hover:bg-secondary-100 hover:text-primary-600 dark:text-neutral-300 dark:hover:bg-secondary-800 dark:hover:text-primary-400'
              } transition-colors duration-200`}
            >
              <Icon className="w-5 h-5" />
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }, []);

  if (!isMounted || !editor) {
    return null; // یا یک پلیس‌هولدر برای لودینگ
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-md ${
          isRTL ? 'rtl' : 'ltr'
        } w-full mx-auto bg-white dark:bg-neutral-800 overflow-hidden ${className}`}
      >
        {/* نوار ابزار */}
        <div className="bg-neutral-50 dark:bg-neutral-900 p-2 border-b border-neutral-200 dark:border-neutral-700 flex flex-wrap gap-1 items-center">
          <div className="flex space-x-1 mr-2">
            <ToolbarButton
              icon={FaBold}
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              tooltip="ضخیم"
            />
            <ToolbarButton
              icon={FaItalic}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              tooltip="مورب"
            />
            <ToolbarButton
              icon={FaUnderline}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              tooltip="زیرخط"
            />
          </div>
          {/* سایر دکمه‌های نوار ابزار */}
          {/* ... */}
        </div>

        {/* آپلودر تصویر */}
        <AnimatePresence>
          {showImageUploader && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900"
            >
              <ImageUploader
                onImageUpload={handleImageUpload}
                onImageRemove={() => {}}
                maxFiles={1}
                multiple={false}
              />
            </motion.div>
          )}

          {/* فرم افزودن لینک */}
          {showLinkInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900"
            >
              <form onSubmit={handleLinkSubmit} className="space-y-2">
                <Label
                  htmlFor="url-input"
                  className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  آدرس لینک را وارد کنید
                </Label>
                <Input
                  id="url-input"
                  name="url"
                  type="url"
                  placeholder="https://example.com"
                  className="w-full dark:bg-neutral-800 dark:text-neutral-100"
                />
                <Button
                  type="submit"
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white dark:bg-primary-700 dark:hover:bg-primary-600"
                >
                  افزودن لینک
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* محتوای ویرایشگر */}
        <EditorContent
          editor={editor}
          className="prose dark:prose-invert max-w-none p-4 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap"
        />
      </motion.div>
    </TooltipProvider>
  );
};

export default TipTapEditor;
