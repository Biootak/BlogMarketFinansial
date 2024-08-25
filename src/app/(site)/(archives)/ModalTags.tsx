'use client';

import React, { type FC } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TaxonomyType } from '@/types/types';

export interface ModalTagsProps {
  tags?: TaxonomyType[];
}

const ModalTags: FC<ModalTagsProps> = ({ tags = [] }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTagChange = (tagId: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (tagId === 'all') {
      current.delete('tag');
    } else {
      current.set('tag', tagId);
    }
    current.delete('page');
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`/archive${query}`);
  };

  const currentTag = searchParams.get('tag') || 'all';

  return (
    <div className="nc-ModalTags">
      <Select dir="rtl" onValueChange={handleTagChange} value={currentTag}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="انتخاب برچسب" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه برچسب‌ها</SelectItem>
          {tags.length > 0 ? (
            tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-tags" disabled>
              برچسبی موجود نیست
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModalTags;
