import type React from 'react';
import WidgetHeading1 from '@/components/WidgetHeading1/WidgetHeading1';
import type { UserWithProfile } from '@/types/types';
import CardAuthor2 from '../CardAuthor2/CardAuthor2';
import CardAuthor from '../CardAuthor/CardAuthor';

export interface WidgetAuthorsProps {
  className?: string;
  authors: UserWithProfile[];
}

const WidgetAuthors: React.FC<WidgetAuthorsProps> = ({
  className = 'bg-neutral-100 dark:bg-neutral-800',
  authors,
}) => {
  return (
    <div className={`nc-WidgetAuthors rounded-3xl overflow-hidden ${className}`}>
      <WidgetHeading1
        title="🎭 Discover Authors"
        viewAll={{ label: 'View all', href: '/authors' }}
      />
      <div className="flow-root">
        <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-700">
          {authors.map((author) => (
            <CardAuthor
              className="p-4 xl:p-5 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              key={author.id}
              author={author}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default WidgetAuthors;
