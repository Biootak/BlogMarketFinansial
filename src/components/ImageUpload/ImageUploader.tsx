

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { getPresignedUrl } from '@/actions/S3Actions';

import { RiUploadCloud2Line, RiImageAddLine, RiCloseLine } from 'react-icons/ri';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface ImageUploaderProps {
  onImageUpload: (urls: string[]) => void;
  onImageRemove: (index: number) => void;
  maxFiles?: number;
  multiple?: boolean;
  initialPreviews?: string[];
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  onImageRemove,
  maxFiles = 1,
  multiple = false,
  initialPreviews = [],
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(initialPreviews);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<number[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        toast({
          title: 'خطا',
          description: 'فقط فایل‌های تصویری مجاز هستند (JPG, PNG, GIF, WebP)',
          variant: 'destructive',
        });
        return;
      }

      const newFiles = multiple
        ? [...selectedFiles, ...acceptedFiles].slice(0, maxFiles)
        : [acceptedFiles[0]];
      setSelectedFiles(newFiles);

      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setPreviews(newPreviews);
    },
    [selectedFiles, multiple, maxFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'image/avif': ['.avif'],
    },
    maxFiles: multiple ? maxFiles : 1,
    multiple,
  });

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setProgress(new Array(selectedFiles.length).fill(0));

    try {
      const uploadedUrls = await Promise.all(
        selectedFiles.map(async (file, index) => {
          const presignedUrl = await getPresignedUrl(file.name, file.type);

          const xhr = new XMLHttpRequest();
          xhr.open('PUT', presignedUrl, true);
          xhr.setRequestHeader('Content-Type', file.type);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100;
              setProgress((prev) => {
                const newProgress = [...prev];
                newProgress[index] = percentComplete;
                return newProgress;
              });
            }
          };

          await new Promise((resolve, reject) => {
            xhr.onload = () =>
              xhr.status === 200
                ? resolve(null)
                : reject(new Error(`آپلود با خطای ${xhr.status} مواجه شد`));
            xhr.onerror = () => reject(new Error('آپلود با خطا مواجه شد'));
            xhr.send(file);
          });

          return new URL(presignedUrl).origin + new URL(presignedUrl).pathname;
        }),
      );

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
        description: 'آپلود تصاویر با مشکل مواجه شد',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setProgress([]);
      setSelectedFiles([]);
    }
  };

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
                  style={{ objectFit: 'cover' }}
                  className="rounded"
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
            <p className="text-sm text-neutral-500 mt-2">فرمت‌های مجاز: JPG, PNG, GIF, WebP</p>
          </div>
        )}
      </div>
      {selectedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button onClick={uploadFiles} disabled={isUploading} className="w-full">
            {isUploading ? (
              <span className="flex items-center">
                <RiUploadCloud2Line className="ml-2" size={20} />
                در حال آپلود...
              </span>
            ) : (
              <span className="flex items-center">
                <RiUploadCloud2Line className="ml-2" size={20} />
                آپلود تصاویر
              </span>
            )}
          </Button>
          {isUploading &&
            progress.map((p, index) => (
              <motion.div
                key={index}
                className="w-full bg-neutral-200 rounded-full h-2.5 mt-2"
                initial={{ width: 0 }}
                animate={{ width: `${p}%` }}
                transition={{ duration: 0.5 }}
              >
                <div className="bg-secondary-600 h-2.5 rounded-full" />
              </motion.div>
            ))}
        </motion.div>
      )}
    </motion.div>
  );
};

export default ImageUploader;
