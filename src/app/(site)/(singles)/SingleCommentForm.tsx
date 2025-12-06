'use client';

import { useToast } from '@/components/ui/use-toast';
import { useCommentStore } from '@/hooks/useCommentStore';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import type { FC } from 'react';
import { X, Send } from 'lucide-react';

interface SingleCommentFormProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onClickSubmit?: (content: string) => void;
  onClickCancel?: () => void;
  className?: string;
  postId: string;
}

const SingleCommentForm: FC<SingleCommentFormProps> = ({
  textareaRef,
  onClickSubmit,
  onClickCancel,
  className = '',
  postId,
}) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { data: session } = useSession();
  const { toast } = useToast();
  const addComment = useCommentStore((state) => state.addComment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      toast({
        title: 'خطا',
        description: 'برای ارسال نظر باید وارد شوید.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await addComment(postId, content);
      if (result.success) {
        if (onClickSubmit) onClickSubmit(content);
        setContent('');
        toast({
          title: 'موفقیت',
          description: 'نظر شما با موفقیت ثبت شد.',
          variant: 'success',
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: error instanceof Error ? error.message : 'خطا در ثبت نظر',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onClickCancel) {
      onClickCancel();
    } else {
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`nc-SingleCommentForm ${className}`}>
      {/* Glass Card Container */}
      <div
        className={`
        relative overflow-hidden rounded-2xl
        bg-gradient-to-br from-white/95 to-neutral-50/95 dark:from-neutral-900/95 dark:to-neutral-800/95
        backdrop-blur-xl
        border transition-all duration-300
        ${
          isFocused
            ? 'border-primary-300 dark:border-primary-700 shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]'
            : 'border-neutral-200/80 dark:border-neutral-700/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
        }
      `}
      >
        {/* Decorative Gradient */}
        <div
          className={`
          absolute inset-0 bg-gradient-to-br from-primary-50/50 via-transparent to-violet-50/30 
          dark:from-primary-950/30 dark:via-transparent dark:to-violet-950/20 
          pointer-events-none transition-opacity duration-300
          ${isFocused ? 'opacity-100' : 'opacity-0'}
        `}
        />

        {/* Textarea */}
        <div className="relative p-4 sm:p-5">
          <textarea
            ref={textareaRef}
            placeholder="نظر خود را بنویسید..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            required
            rows={4}
            className="
              w-full bg-transparent border-0 resize-none
              text-neutral-800 dark:text-neutral-200
              placeholder:text-neutral-400 dark:placeholder:text-neutral-500
              focus:outline-none focus:ring-0
              text-sm sm:text-base leading-relaxed
            "
          />
        </div>

        {/* Actions Bar */}
        <div className="relative flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-neutral-50/80 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800">
          {/* Character Count */}
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {content.length > 0 && `${content.length} کاراکتر`}
          </span>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={handleCancel}
              className="
                flex items-center gap-1.5 px-4 py-2 rounded-xl
                text-sm font-medium text-neutral-600 dark:text-neutral-400
                bg-white dark:bg-neutral-800
                border border-neutral-200 dark:border-neutral-700
                hover:bg-neutral-50 dark:hover:bg-neutral-700
                hover:border-neutral-300 dark:hover:border-neutral-600
                transition-all duration-200
              "
            >
              <X className="w-4 h-4" />
              <span>لغو</span>
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !content.trim()}
              className="
                flex items-center gap-2 px-5 py-2 rounded-xl
                text-sm font-semibold text-white
                bg-gradient-to-l from-primary-600 to-violet-600
                hover:from-primary-500 hover:to-violet-500
                shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-primary-500/25
                transition-all duration-300
              "
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>در حال ارسال</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 rotate-180" />
                  <span>ارسال نظر</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Accent */}
        <div
          className={`
          h-0.5 bg-gradient-to-l from-primary-500 via-violet-500 to-rose-500
          transition-opacity duration-300
          ${isFocused ? 'opacity-100' : 'opacity-0'}
        `}
        />
      </div>
    </form>
  );
};

export default SingleCommentForm;
