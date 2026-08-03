'use client';

import type { TopAuthor } from '@/actions/getTopAuthors';
import CardAuthorBox2 from '@/components/CardAuthorBox2/CardAuthorBox2';
import Heading from '@/components/Heading/Heading';
import MySlider from '@/components/MySlider';
import type { FC } from 'react';

export interface SectionSliderNewAuthorsProps {
  className?: string;
  heading: string;
  subHeading: string;
  authors: TopAuthor[];
  itemPerRow?: number;
}

const SectionSliderNewAuthors: FC<SectionSliderNewAuthorsProps> = ({
  heading = 'پیشنهادهایی برای کشف',
  subHeading = 'نویسندگان محبوب برای معرفی به شما',
  className = '',
  authors,
  itemPerRow = 5,
}) => {
  return (
    <div className={`nc-SectionSliderNewAuthors ${className}`}>
      <Heading desc={subHeading} isCenter>
        {heading}
      </Heading>
      <MySlider
        itemPerRow={itemPerRow}
        data={authors}
        renderItem={(author) => <CardAuthorBox2 key={author.id} author={author} />}
      />
    </div>
  );
};

export default SectionSliderNewAuthors;
