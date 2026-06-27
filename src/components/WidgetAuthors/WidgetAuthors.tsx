import type React from 'react';
import WidgetHeading1 from '@/components/WidgetHeading1/WidgetHeading1';
import type { UserWithProfile } from '@/types/types';
import CardAuthor from '../CardAuthor/CardAuthor';
import { Icon } from '../ui/icon';


export interface WidgetAuthorsProps {
  className?: string;
  authors: UserWithProfile[];
}

const WidgetAuthors: React.FC<WidgetAuthorsProps> = ({
  className = '',
  authors,
}) => {
  return (
    <div className={`nc-WidgetAuthors rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800 ${className}`}>
      <WidgetHeading1
        title={
          <span className="flex items-center">
            <Icon name="Users" className="ml-2" />
            کشف نویسندگان
          </span>
        }
        viewAll={{ label: 'مشاهده همه', href: '/authors' }}
      />
      <div className="flow-root">
        <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-700">
          {authors.map((author) => (
            <CardAuthor
              className="p-4 xl:p-5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
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