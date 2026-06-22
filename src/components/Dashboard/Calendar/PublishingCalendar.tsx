'use client';

import type React from 'react';
import { useState, useCallback } from 'react';
import Image from 'next/image';
import { parseISO } from 'date-fns-jalali';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { PostWithRelations } from '@/types/types';
// 2026-06-14: type-only import. The actual component is loaded
// lazily inside the Modal below so it doesn't bloat the page
// bundle. Users who never open the modal never download the
// datepicker code.
import type { Day } from '@hassanmojab/react-modern-calendar-datepicker';

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

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Day | null;
  posts: ScheduledPostForCalendar[];
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, selectedDate, posts }) => {
  if (!isOpen || !selectedDate) return null;

  const formattedDate = `${selectedDate.year}/${selectedDate.month}/${selectedDate.day}`;
  const postsForDate = posts.filter((post) => {
    const postDate =
      post.createdAt instanceof Date
        ? post.createdAt
        : typeof post.createdAt === 'string'
          ? parseISO(post.createdAt)
          : null;

    if (!postDate) return false;

    const day = {
      year: postDate.getFullYear(),
      month: postDate.getMonth() + 1,
      day: postDate.getDate(),
    };

    return (
      day.year === selectedDate.year &&
      day.month === selectedDate.month &&
      day.day === selectedDate.day
    );
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="dash-panel p-4 sm:p-6 w-full max-w-lg rtl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-primary-600 dark:text-primary-400">
          پست‌های {formattedDate}
        </h2>
        {postsForDate.length === 0 ? (
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
            هیچ پستی برای این تاریخ برنامه‌ریزی نشده است.
          </p>
        ) : (
          <ul className="space-y-4 sm:space-y-6">
            {postsForDate.map((post) => (
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
                  // 2026-06-14: raw <img> swapped for next/image so
                  // the modal previews the resized/optimized
                  // variant instead of the original asset.
                  <Image
                    src={post.featuredImage}
                    alt={post.title}
                    width={400}
                    height={160}
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="w-full h-32 sm:h-40 object-cover rounded-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/placeholder-large.png';
                    }}
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

interface PublishingCalendarProps {
  scheduledPosts: ScheduledPostForCalendar[];
}

const PublishingCalendar: React.FC<PublishingCalendarProps> = ({ scheduledPosts }) => {
  const [selectedDate, setSelectedDate] = useState<Day | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedDate(null);
  }, []);

  return (
    <div className="flex justify-center items-start p-4 bg-background">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(date) => {
          setSelectedDate(date);
          if (date) {
            setIsModalOpen(true);
          }
        }}
        className="rounded-md border shadow-md"
        highlightedDates={scheduledPosts
          .map((post) => {
            const date =
              post.createdAt instanceof Date
                ? post.createdAt
                : typeof post.createdAt === 'string'
                  ? parseISO(post.createdAt)
                  : null;

            if (!date) return null;

            return {
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              day: date.getDate(),
            };
          })
          .filter((date): date is Day => date !== null)}
      />
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        selectedDate={selectedDate}
        posts={scheduledPosts}
      />
    </div>
  );
};

export default PublishingCalendar;
