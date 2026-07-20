import React, { useMemo, useCallback } from 'react';
import { Icon } from '../../ui/icon';

interface LinkPanelPreviewProps {
  url: string;
  onEdit: () => void;
  onRemove: () => void;
}

const LinkPanelPreview = ({ url, onEdit, onRemove }: LinkPanelPreviewProps) => {
  const [copied, setCopied] = React.useState(false);

  // نمایش URL کوتاه شده
  const displayUrl = useMemo(() => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname === '/' ? '' : urlObj.pathname;
      return `${urlObj.hostname}${path}`.slice(0, 40) + (url.length > 50 ? '...' : '');
    } catch {
      return url.slice(0, 40) + (url.length > 40 ? '...' : '');
    }
  }, [url]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [url]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden min-w-[280px]">
      {/* URL Preview */}
      <div className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors group"
          dir="ltr"
        >
          <Icon
            name="link-2"
            size={14}
            className="flex-shrink-0 opacity-60 group-hover:opacity-100"
          />
          <span className="truncate">{displayUrl}</span>
        </a>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 px-2 py-1.5">
        <button
          type="button"
          onClick={handleCopy}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label={copied ? 'کپی شد' : 'کپی لینک'}
        >
          {copied ? (
            <Icon name="check" size={16} className="text-green-500" />
          ) : (
            <Icon name="copy" size={16} />
          )}
        </button>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" aria-hidden="true" />

        <button
          type="button"
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label="ویرایش لینک"
        >
          <Icon name="settings-2" size={16} />
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
          aria-label="حذف لینک"
        >
          <Icon name="link-2-off" size={16} />
        </button>
      </div>
    </div>
  );
};

export default LinkPanelPreview;
