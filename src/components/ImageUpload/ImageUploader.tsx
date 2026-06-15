'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

import { RiUploadCloud2Line, RiImageAddLine, RiCloseLine } from 'react-icons/ri';
import { motion } from '@/lib/motion-shim';
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
        toast({
          title: 'موفقیت',
          description: 'تصاویر با موفقیت آپلود شدند',
          variant: 'success',
        });
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition duration-200 ${
          isDragActive
            ? 'border-secondary-500 bg-secondary-50'
            : 'border-neutral-300 hover:border-primary-500'
        }`}
      >
        <input {...getInputProps()} />
        {previews.length > 0 ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {previews.map((preview, index) => (
              <motion.div
                key={`image-${preview}`}
                className="relative w-24 h-24"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Image
                  src={preview}
                  alt={`پیش‌نمایش ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  className="rounded object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="absolute top-0 right-0 bg-primary-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                >
                  <RiCloseLine size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <RiImageAddLine className="text-5xl text-neutral-400 mb-2" size={48} />
            <p className="text-neutral-700">
              {isDragActive
                ? 'فایل تصویر را اینجا رها کنید...'
                : multiple
                  ? 'برای انتخاب تصاویر، فایل‌ها را اینجا بکشید و رها کنید یا کلیک کنید'
                  : 'برای انتخاب تصویر، فایل را اینجا بکشید و رها کنید یا کلیک کنید'}
            </p>
            <p className="text-sm text-neutral-500 mt-2">فرمت‌های مجاز: JPG, PNG, GIF, WebP, SVG</p>
          </div>
        )}
      </div>
      {isUploading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <RiUploadCloud2Line className="animate-pulse" size={20} />
            در حال آپلود...
          </div>
          {progress.map((p, index) => (
            <div key={index} className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${p}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

export { ImageUploader };
