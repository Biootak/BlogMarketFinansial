import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

import { RiUploadCloud2Line, RiImageAddLine, RiCloseLine } from 'react-icons/ri';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import type { UploadFolder } from '@/actions/uploadActions';

interface ImageUploaderProps {
  onImageUpload: (urls: string[]) => void;
  onImageRemove: (index: number) => void;
  maxFiles?: number;
  multiple?: boolean;
  initialPreviews?: string[];
  folder?: UploadFolder;
}

async function uploadToLocal(file: File, folder: UploadFolder): Promise<string> {
  const formData = new FormData();
  formData.append('files', file);
  formData.append('folder', folder);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'خطا در آپلود');
  }

  const data = await response.json();
  return data.files[0].url;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  onImageRemove,
  maxFiles = 1,
  multiple = false,
  initialPreviews = [],
  folder = 'general',
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(initialPreviews);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<number[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // آپلود خودکار فایل‌ها
  const autoUpload = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      setProgress(new Array(files.length).fill(0));

      try {
        const uploadedUrls: string[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const url = await uploadToLocal(file, folder);
          uploadedUrls.push(url);

          setProgress((prev) => {
            const newProgress = [...prev];
            newProgress[i] = 100;
            return newProgress;
          });
        }

        setPreviews(uploadedUrls);
        onImageUpload(uploadedUrls);
      } catch (error) {
        console.error('خطا در آپلود تصاویر:', error);
        toast({
          title: 'خطا',
          description: error instanceof Error ? error.message : 'آپلود تصاویر با مشکل مواجه شد',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
        setProgress([]);
        setSelectedFiles([]);
      }
    },
    [folder, onImageUpload],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      if (rejectedFiles.length > 0) {
        toast({
          title: 'خطا',
          description: 'فقط فایل‌های تصویری مجاز هستند (JPG, PNG, GIF, WebP, SVG)',
          variant: 'destructive',
        });
        return;
      }

      const newFiles = multiple
        ? [...selectedFiles, ...acceptedFiles].slice(0, maxFiles)
        : [acceptedFiles[0]];

      setSelectedFiles(newFiles);

      // نمایش پیش‌نمایش موقت و شروع آپلود خودکار
      const tempPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setPreviews(tempPreviews);

      // آپلود خودکار
      autoUpload(newFiles);
    },
    [selectedFiles, multiple, maxFiles, autoUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/svg+xml': ['.svg'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
    },
    maxFiles: multiple ? maxFiles : 1,
    multiple,
  });

  const removeImage = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    onImageRemove(index);
  };

  // Handle paste from clipboard
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      e.preventDefault();

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Check if the item is an image
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            // Create a new file with a proper name
            const timestamp = Date.now();
            const extension = file.type.split('/')[1];
            const newFile = new File([file], `pasted-image-${timestamp}.${extension}`, {
              type: file.type,
            });
            imageFiles.push(newFile);
          }
        }
      }

      if (imageFiles.length > 0) {
        const newFiles = multiple
          ? [...selectedFiles, ...imageFiles].slice(0, maxFiles)
          : [imageFiles[0]];

        setSelectedFiles(newFiles);

        // نمایش پیش‌نمایش موقت و شروع آپلود خودکار
        const tempPreviews = newFiles.map((file) => URL.createObjectURL(file));
        setPreviews(tempPreviews);

        // آپلود خودکار
        autoUpload(newFiles);
      }
    },
    [selectedFiles, multiple, maxFiles, autoUpload],
  );

  // Add paste event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const pasteHandler = (e: Event) => {
      handlePaste(e as ClipboardEvent);
    };

    container.addEventListener('paste', pasteHandler);

    return () => {
      container.removeEventListener('paste', pasteHandler);
    };
  }, [handlePaste]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full"
      tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {/* Paste Hint */}
      <AnimatePresence>
        {isFocused && previews.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mb-2 flex items-center justify-center gap-2 text-xs text-violet-600 dark:text-violet-400"
          >
            <span className="px-2 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/30 font-medium">
              Ctrl+V
            </span>
            <span>برای چسباندن تصویر از کلیپ‌بورد</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          group relative overflow-hidden
          rounded-2xl border-2 border-dashed
          transition-all duration-300 ease-out
          cursor-pointer
          ${
            isDragActive
              ? 'border-violet-500 bg-gradient-to-br from-violet-50/80 via-purple-50/60 to-fuchsia-50/80 dark:from-violet-950/30 dark:via-purple-950/20 dark:to-fuchsia-950/30 scale-[1.02] shadow-2xl shadow-violet-500/20'
              : isFocused
                ? 'border-violet-400 dark:border-violet-500 bg-gradient-to-br from-violet-50/40 via-purple-50/30 to-transparent dark:from-violet-950/20 dark:via-purple-950/10 dark:to-transparent shadow-lg shadow-violet-500/10 ring-2 ring-violet-400/20 dark:ring-violet-500/20'
                : 'border-neutral-200/80 dark:border-neutral-700/80 bg-white/50 dark:bg-neutral-900/50 hover:border-violet-400/60 dark:hover:border-violet-500/60 hover:bg-gradient-to-br hover:from-violet-50/40 hover:via-purple-50/30 hover:to-transparent dark:hover:from-violet-950/20 dark:hover:via-purple-950/10 dark:hover:to-transparent hover:shadow-xl hover:shadow-violet-500/10'
          }
          backdrop-blur-sm
        `}
      >
        <input {...getInputProps()} />

        {/* Background Gradient Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Content */}
        <div className="relative p-4 sm:p-6 md:p-8 lg:p-10">
          <AnimatePresence mode="wait">
            {previews.length > 0 ? (
              <motion.div
                key="previews"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 justify-center"
              >
                {previews.map((preview, index) => (
                  <motion.div
                    key={`preview-${preview}-${index}`}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="relative group/image w-full"
                  >
                    {/* Image Container */}
                    <div 
                      className="relative w-full aspect-[4/3] sm:aspect-video max-w-md mx-auto rounded-xl overflow-hidden shadow-lg shadow-neutral-900/10 dark:shadow-neutral-950/30 ring-1 ring-neutral-200/50 dark:ring-neutral-700/50 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxImage(preview);
                      }}
                    >
                      <Image
                        src={preview}
                        alt={`پیش‌نمایش ${index + 1}`}
                        fill
                        sizes="(max-width: 640px) 100vw, 384px"
                        className="object-cover transition-transform duration-300 group-hover/image:scale-105"
                      />

                      {/* Overlay on Hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-neutral-900/40 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">کلیک برای مشاهده</span>
                      </div>

                      {/* Remove Button - Always visible on mobile, hover on desktop */}
                      <motion.button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(index);
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="
                          absolute top-1 left-1 sm:top-1.5 sm:left-1.5 z-10
                          w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full
                          bg-gradient-to-br from-red-500 to-rose-600
                          text-white
                          shadow-lg shadow-red-500/30
                          flex items-center justify-center
                          opacity-100 sm:opacity-0 sm:group-hover/image:opacity-100
                          transition-all duration-200
                          hover:shadow-xl hover:shadow-red-500/40
                          ring-2 ring-white dark:ring-neutral-900
                        "
                      >
                        <RiCloseLine size={16} className="sm:w-[18px] sm:h-[18px] stroke-[1.5]" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center py-4 sm:py-6"
              >
                {/* Icon */}
                <motion.div
                  animate={{
                    y: isDragActive ? -8 : 0,
                    scale: isDragActive ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="relative mb-4 sm:mb-6"
                >
                  <div
                    className={`
                    absolute inset-0 blur-2xl rounded-full
                    transition-all duration-300
                    ${isDragActive ? 'bg-violet-500/30 scale-150' : 'bg-violet-500/10 scale-100'}
                  `}
                  />
                  <div
                    className={`
                    relative
                    w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl
                    flex items-center justify-center
                    transition-all duration-300
                    ${
                      isDragActive
                        ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-2xl shadow-violet-500/40'
                        : 'bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 shadow-lg shadow-violet-500/10'
                    }
                  `}
                  >
                    <RiImageAddLine
                      size={28}
                      className={`sm:w-9 sm:h-9 transition-colors duration-300 ${isDragActive ? 'text-white' : 'text-violet-600 dark:text-violet-400'}`}
                    />
                  </div>
                </motion.div>

                {/* Text */}
                <div className="text-center space-y-2 sm:space-y-3 max-w-md px-4">
                  <h3 className="text-base sm:text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                    {isDragActive ? 'فایل را اینجا رها کنید' : 'آپلود تصویر'}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {multiple
                      ? 'تصاویر خود را بکشید و اینجا رها کنید، کلیک کنید یا Ctrl+V بزنید'
                      : 'تصویر خود را بکشید و اینجا رها کنید، کلیک کنید یا Ctrl+V بزنید'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-500">
                    <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded bg-neutral-100 dark:bg-neutral-800 font-medium">
                      JPG
                    </span>
                    <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded bg-neutral-100 dark:bg-neutral-800 font-medium">
                      PNG
                    </span>
                    <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded bg-neutral-100 dark:bg-neutral-800 font-medium">
                      WebP
                    </span>
                    <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded bg-neutral-100 dark:bg-neutral-800 font-medium">
                      SVG
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Upload Progress */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 overflow-hidden"
          >
            {/* Upload Status */}
            <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200/50 dark:border-violet-800/50">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
              >
                <RiUploadCloud2Line
                  size={18}
                  className="sm:w-5 sm:h-5 text-violet-600 dark:text-violet-400"
                />
              </motion.div>
              <span className="text-xs sm:text-sm font-medium text-violet-900 dark:text-violet-100">
                در حال آپلود تصاویر...
              </span>
            </div>

            {/* Progress Bars */}
            <div className="space-y-2">
              {progress.map((p, index) => (
                <div key={`progress-${index}`} className="space-y-1 sm:space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] sm:text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      تصویر {index + 1}
                    </span>
                    <span className="font-semibold text-violet-600 dark:text-violet-400">
                      {p}%
                    </span>
                  </div>
                  <div className="relative h-1.5 sm:h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden shadow-inner">
                    <motion.div
                      className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-violet-500 via-purple-500 to-fuchsia-500 shadow-lg shadow-violet-500/30"
                      initial={{ width: 0 }}
                      animate={{ width: `${p}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                    {/* Shimmer Effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox - Rendered via Portal to escape modal constraints */}
      {typeof window !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {lightboxImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 md:p-8"
                onClick={() => setLightboxImage(null)}
              >
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: 0.15 }}
                  onClick={() => setLightboxImage(null)}
                  className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-110"
                >
                  <RiCloseLine size={24} className="sm:w-7 sm:h-7 text-white" />
                </motion.button>
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 20 }}
                  className="relative w-full h-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Image
                    src={lightboxImage}
                    alt="تصویر کامل"
                    fill
                    sizes="100vw"
                    className="object-contain drop-shadow-2xl"
                    priority
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </motion.div>
  );
};

export { ImageUploader };
