'use client';

import React, { Suspense, useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
import SingleTitle from '@/app/(site)/(singles)/SingleTitle';

const PageSv = ({}) => {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    setIsRendered(true);
  }, []);

  const renderMainVideo = () => {
    return (
      <div>
        {isRendered ? (
          <ReactPlayer
            url="https://www.youtube.com/watch?v=nOQyWbPO2Ds"
            className="absolute inset-0"
            playing={true}
            width="100%"
            height="100%"
            controls
            muted
          />
        ) : null}
      </div>
    );
  };

  const renderHeader = () => {
    return (
      <div className={`nc-SingleHeader `}>
        <div className="space-y-5 dark text-neutral-100">
          {/* <CategoryBadgeList
						itemClass="!px-3"
						categories={[DEMO_CATEGORIES[2]]}
					/> */}
          <SingleTitle
            mainClass="text-neutral-900 font-semibold text-xl md:!leading-[120%] dark:text-neutral-100"
            title={'Julio Urías does it all as Dodgers sweep in San Francisco'}
          />

          <div className="w-full border-b border-neutral-100 dark:border-neutral-800" />
          <div className="flex flex-col space-y-5">
            {/* <PostMeta2
							size="large"
							className="leading-none flex-shrink-0"
							hiddenCategories
							avatarRounded="rounded-full shadow-inner"
						/> */}
            {/* <SingleMetaAction2 /> */}
          </div>
        </div>
      </div>
    );
  };

  return (
    <header className="container relative py-10 sm:py-14 lg:py-20 flex flex-col lg:flex-row lg:items-center @container/sv-header">
      <div className="nc-PageSingleVideo__headerWrap absolute inset-y-0 transform translate-x-1/2 end-1/2 w-screen @lg/sv-header:translate-x-0 @lg/sv-header:w-1/2 bg-neutral-900 dark:bg-black dark:bg-opacity-50 @lg/sv-header:rounded-e-[40px]" />
      <div className="pb-6 sm:pb-8 lg:pb-0 @lg/sv-header:pe-10 relative">{renderHeader()}</div>
      <div className="relative @lg/sv-header:w-7/12 flex-shrink-0">
        <div className="aspect-w-16 aspect-h-16 sm:aspect-h-9 border-4 border-neutral-300 dark:border-neutral-800 shadow-2xl bg-neutral-800 rounded-3xl overflow-hidden z-0">
          {renderMainVideo()}
        </div>
      </div>
    </header>
  );
};

const PageSingleVideo = () => (
  <Suspense fallback={<div />}>
    <PageSv />
  </Suspense>
);

export default PageSingleVideo;
