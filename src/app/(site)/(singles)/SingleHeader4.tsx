import NcImage from '@/components/NcImage/NcImage';
import React, { type FC } from 'react';
import SingleTitle from './SingleTitle';

export interface SingleHeader4Props {
  hiddenDesc?: boolean;
  className?: string;
}

const SingleHeader4: FC<SingleHeader4Props> = ({ hiddenDesc = false, className = '' }) => {
  return (
    <>
      <div className={`nc-SingleHeader4 ${className}`}>
        <div className="max-w-5xl mx-auto space-y-5 dark">
          {/* <CategoryBadgeList
            itemClass="!px-3"
            categories={[DEMO_CATEGORIES[1]]}
          /> */}
          <SingleTitle
            mainClass="text-neutral-900 font-bold text-xl md:text-4xl md:!leading-[120%] lg:text-4xl 2xl:text-5xl dark:text-neutral-100"
            title={'Trending web & landing page designs in 2023'}
          />
          {!hiddenDesc && (
            <span className="block text-base text-neutral-500 md:text-lg dark:text-neutral-400 pb-1">
              Lorem ipsum dolor, sit amet consectetur adipisicing elit. Perspiciatis tempora
              obcaecati error ipsum voluptatibus sed adipisci ut maiores nesciunt quam.
            </span>
          )}
        </div>

        {/* FEATURED IMAGE */}
        <NcImage
          alt="post"
          containerClassName="my-10 relative"
          className="object-cover w-full rounded-lg shadow-xl"
          src="https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg"
          width={1260}
          height={750}
          sizes="(max-width: 1024px) 100vw, 1280px"
        />

        <div className=" space-y-10">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-5">
            {/* <PostMeta2
              size="large"
              className="leading-none flex-shrink-0"
              hiddenCategories
              avatarRounded="rounded-full shadow-inner"
            /> */}
            {/* <SingleMetaAction2 /> */}
          </div>
          <div className="w-full border-b border-neutral-100 dark:border-neutral-800" />
        </div>
      </div>
    </>
  );
};

export default SingleHeader4;
