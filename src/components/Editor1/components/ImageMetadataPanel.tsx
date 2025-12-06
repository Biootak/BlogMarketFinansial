import { FileImage, Info, Ruler } from 'lucide-react';
import type React from 'react';

interface ImageMetadataPanelProps {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  format?: string;
}

const ImageMetadataPanel: React.FC<ImageMetadataPanelProps> = ({
  src,
  alt,
  title,
  width,
  height,
  fileSize,
  format,
}) => {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'نامشخص';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2 text-sm">
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
        <Info size={16} />
        <span>اطلاعات تصویر</span>
      </div>

      <div className="space-y-1.5 text-xs">
        {width && height && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Ruler size={12} />
              ابعاد:
            </span>
            <span className="text-gray-900 dark:text-white font-mono">
              {width} × {height} px
            </span>
          </div>
        )}

        {format && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <FileImage size={12} />
              فرمت:
            </span>
            <span className="text-gray-900 dark:text-white font-mono uppercase">{format}</span>
          </div>
        )}

        {fileSize && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">حجم فایل:</span>
            <span className="text-gray-900 dark:text-white font-mono">
              {formatFileSize(fileSize)}
            </span>
          </div>
        )}

        {alt && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-500 dark:text-gray-400 block mb-1">متن جایگزین:</span>
            <span className="text-gray-900 dark:text-white">{alt}</span>
          </div>
        )}

        {title && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-500 dark:text-gray-400 block mb-1">عنوان:</span>
            <span className="text-gray-900 dark:text-white">{title}</span>
          </div>
        )}

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 block mb-1">آدرس:</span>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 hover:text-primary-600 break-all text-[10px]"
          >
            {src}
          </a>
        </div>
      </div>
    </div>
  );
};

export default ImageMetadataPanel;
