'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
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
import ImageUploader from '@/components/ImageUpload/ImageUploader'; // اضافه کردن این خط

interface TipTapEditorProps {
  content: string | undefined;
  onChange: (content: string) => void;
  isRTL?: boolean;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({ content, onChange, isRTL = false }) => {
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      localStorage.setItem('editorContent', html);
    },
    editorProps: {
      attributes: {
        class: `prose max-w-none p-4 min-h-[200px] ${isRTL ? 'text-right' : 'text-left'}`,
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor) {
      const savedContent = localStorage.getItem('editorContent');
      if (savedContent && editor.isEmpty) {
        editor.commands.setContent(savedContent);
      }
    }
  }, [editor]);

  const handleImageUpload = useCallback(
    (urls: string[]) => {
      if (editor) {
        for (const url of urls) {
          editor.chain().focus().setImage({ src: url }).run();
        }
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

  const ToolbarButton = useMemo(() => {
    return ({
      icon: Icon,
      onClick,
      isActive = false,
      tooltip,
    }: { icon: React.ElementType; onClick: () => void; isActive?: boolean; tooltip: string }) => (
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

  if (!editor) {
    return null;
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-md ${isRTL ? 'rtl' : 'ltr'} w-full max-w-4xl mx-auto bg-white dark:bg-neutral-800 overflow-hidden`}
      >
        <div className="bg-neutral-50 dark:bg-neutral-900 p-2 border-b border-neutral-200 dark:border-neutral-700 flex flex-wrap gap-1 items-center">
          <div className="flex space-x-1 mr-2">
            <ToolbarButton
              icon={FaBold}
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              tooltip="Bold"
            />
            <ToolbarButton
              icon={FaItalic}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              tooltip="Italic"
            />
            <ToolbarButton
              icon={FaUnderline}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              tooltip="Underline"
            />
          </div>
          <div className="flex space-x-1 mr-2">
            <ToolbarButton
              icon={FaHeading}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              tooltip="Heading 1"
            />
            <ToolbarButton
              icon={FaListUl}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              tooltip="Bullet List"
            />
            <ToolbarButton
              icon={FaListOl}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              tooltip="Ordered List"
            />
            <ToolbarButton
              icon={FaQuoteRight}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              tooltip="Blockquote"
            />
          </div>
          <div className="flex space-x-1 mr-2">
            <ToolbarButton
              icon={FaAlignLeft}
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              isActive={editor.isActive({ textAlign: 'left' })}
              tooltip="Align Left"
            />
            <ToolbarButton
              icon={FaAlignCenter}
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              isActive={editor.isActive({ textAlign: 'center' })}
              tooltip="Align Center"
            />
            <ToolbarButton
              icon={FaAlignRight}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              isActive={editor.isActive({ textAlign: 'right' })}
              tooltip="Align Right"
            />
          </div>
          <div className="flex space-x-1 mr-2">
            <ToolbarButton
              icon={FaImage}
              onClick={() => setShowImageUploader(true)}
              tooltip="Insert Image"
            />
            <ToolbarButton
              icon={FaLink}
              onClick={() => setShowLinkInput(true)}
              isActive={editor.isActive('link')}
              tooltip="Insert Link"
            />
          </div>
          <div className="flex space-x-1">
            <ToolbarButton
              icon={FaUndoAlt}
              onClick={() => editor.chain().focus().undo().run()}
              tooltip="Undo"
            />
            <ToolbarButton
              icon={FaRedoAlt}
              onClick={() => editor.chain().focus().redo().run()}
              tooltip="Redo"
            />
          </div>
        </div>
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
                  Enter URL
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
                  Insert Link
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        <EditorContent
          editor={editor}
          className="prose dark:prose-invert max-w-none p-4 min-h-[200px] bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
        />
      </motion.div>
    </TooltipProvider>
  );
};

export default dynamic(() => Promise.resolve(TipTapEditor), { ssr: false });
