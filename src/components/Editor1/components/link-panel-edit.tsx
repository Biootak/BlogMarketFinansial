import { Button } from '@/components/ui/button';
import { Check, Link, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../../ui/icon';

interface LinkPanelEditProps {
  initial: string;
  isOpen: boolean;
  onSetLink: (url: string) => void;
}

const LinkPanelEdit = ({ initial, isOpen, onSetLink }: LinkPanelEditProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string>(initial || '');

  // بهبود اعتبارسنجی URL - پشتیبانی از URL های بدون پروتکل
  const isValidUrl = useMemo(() => {
    if (!url.trim()) return false;
    // اگر با پروتکل شروع شده
    if (/^(https?|mailto|tel|ftp):\/?\/?/i.test(url)) return true;
    // اگر یک دامنه معتبر به نظر میرسه
    if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+/.test(url)) return true;
    // اگر با / یا # شروع شده (لینک داخلی)
    if (/^[/#]/.test(url)) return true;
    return false;
  }, [url]);

  const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
  }, []);

  const normalizeUrl = useCallback((inputUrl: string): string => {
    const trimmed = inputUrl.trim();
    // اگر با پروتکل شروع نشده و لینک داخلی نیست، https اضافه کن
    if (
      trimmed &&
      !trimmed.match(/^(https?|mailto|tel|ftp):\/?\/?/i) &&
      !trimmed.startsWith('/') &&
      !trimmed.startsWith('#')
    ) {
      return `https://${trimmed}`;
    }
    return trimmed;
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isValidUrl) {
        onSetLink(normalizeUrl(url));
      }
    },
    [url, isValidUrl, onSetLink, normalizeUrl],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setUrl(initial || '');
      }
    },
    [initial],
  );

  useEffect(() => {
    if (inputRef.current && isOpen) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isOpen]);

  useEffect(() => {
    setUrl(initial || '');
  }, [initial]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-2xl min-w-[320px]">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isValidUrl ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            <Link size={16} className={isValidUrl ? 'text-green-600' : 'text-gray-500'} />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            placeholder="example.com یا /page"
            value={url}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            dir="ltr"
            aria-label="آدرس لینک"
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            {isValidUrl ? '✓ لینک معتبر' : 'آدرس لینک را وارد کنید'}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUrl(initial || '')}
              className="h-8 px-3 text-xs"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!isValidUrl}
              className="h-8 px-4 text-xs bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50"
            >
              <Check size={14} className="ml-1" />
              ذخیره
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LinkPanelEdit;
