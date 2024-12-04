'use client';

import { useState, useRef } from 'react';
import type { FC } from 'react';
import ButtonPrimary from '@/components/Button/ButtonPrimary';
import Button from '@/components/Button/Button';
import Textarea from '@/components/Textarea/Textarea';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';
import { useCommentStore } from '@/hooks/useCommentStore';
import { CacheService } from '@/services/cacheService';

interface SingleCommentFormProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
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
        // پاک کردن کش نظرات پست
        await CacheService.invalidateComments(postId);
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
      <Textarea
        ref={textareaRef}
        placeholder="نظر خود را بنویسید"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required={true}
        rows={4}
      />
      <div className="mt-2 space-x-3">
        <ButtonPrimary type="submit" disabled={isLoading}>
          {isLoading ? 'در حال ارسال' : 'ارسال'}
        </ButtonPrimary>
        <Button type="button" pattern="white" onClick={handleCancel}>
          لغو
        </Button>
      </div>
    </form>
  );
};

export default SingleCommentForm;
