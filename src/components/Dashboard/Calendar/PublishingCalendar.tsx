'use client';

import type React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { format, isSameDay, isToday, parseISO } from 'date-fns-jalali';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { PostWithRelations } from '@/types/types';

type ScheduledPostForCalendar = Pick<
  PostWithRelations,
  | 'id'
  | 'title'
  | 'createdAt'
  | 'status'
  | 'author'
  | 'categories'
  | 'tags'
  | '_count'
  | 'content'
  | 'excerpt'
  | 'featuredImage'
>;
interface PublishingCalendarProps {
  scheduledPosts: ScheduledPostForCalendar[];
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  posts: ScheduledPostForCalendar[];
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, selectedDate, posts }) => {
  if (!isOpen || !selectedDate) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg w-full max-w-lg rtl max-h-[90vh] overflow-y-auto shadow-xl">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-primary-600 dark:text-primary-400">
          پست‌های {format(selectedDate, 'yyyy/MM/dd')}
        </h2>
        {posts.length === 0 ? (
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
            هیچ پستی برای این تاریخ برنامه‌ریزی نشده است.
          </p>
        ) : (
          <ul className="space-y-4 sm:space-y-6">
            {posts.map((post) => (
              <li
                key={post.id}
                className="border-b border-neutral-200 dark:border-neutral-700 pb-4 last:border-b-0"
              >
                <h3 className="font-semibold text-base sm:text-lg text-primary-700 dark:text-primary-300 mb-2">
                  {post.title}
                </h3>
                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mb-2">
                  {post.excerpt || post.content.substring(0, 100)}...
                </p>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-500 mb-2">
                  نویسنده: {post.author.name}
                </p>
                {post.featuredImage && (
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="w-full h-32 sm:h-40 object-cover rounded-md"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        <Button
          onClick={onClose}
          className="mt-4 sm:mt-6 w-full bg-primary-500 hover:bg-primary-600 text-white text-sm sm:text-base"
        >
          بستن
        </Button>
      </div>
    </div>
  );
};

const PublishingCalendar: React.FC<PublishingCalendarProps> = ({ scheduledPosts }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const getPostsForDate = useMemo(() => {
    return (date: Date) => {
      return scheduledPosts.filter((post) => {
        if (post.createdAt instanceof Date) {
          return isSameDay(post.createdAt, date);
        }
        if (typeof post.createdAt === 'string') {
          return isSameDay(parseISO(post.createdAt), date);
        }
        return false;
      });
    };
  }, [scheduledPosts]);

  return (
    <div className="flex justify-center items-start p-4 bg-background">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(date) => {
          setSelectedDate(date);
          setIsModalOpen(true);
        }}
        className="rounded-md border shadow-md"
        modifiers={{
          hasPost: (date) => getPostsForDate(date).length > 0,
          today: (date) => isToday(date),
          selected: (date) => (selectedDate ? isSameDay(date, selectedDate) : false),
        }}
        modifiersClassNames={{
          hasPost: 'bg-green-200 text-green-800 font-bold',
          today: 'bg-blue-200 text-blue-800 font-bold ring ring-blue-500',
          selected: 'bg-primary text-primary-foreground font-bold',
        }}
      />
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        selectedDate={selectedDate || null}
        posts={selectedDate ? getPostsForDate(selectedDate) : []}
      />
    </div>
  );
};
export default PublishingCalendar;
