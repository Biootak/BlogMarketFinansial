import React, { type ReactNode } from 'react';
// import { Sidebar } from '../Sidebar';
// import SingleContent from '../SingleContent';
// import SingleRelatedPosts from '../SingleRelatedPosts';

const layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className={`relative @container/has-sidebar`}>
      {children}

      <div className="container grid grid-cols-1 my-10 gap-y-12 @md/has-sidebar:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @xl/has-sidebar:grid-cols-[2fr_1fr] @md/has-sidebar:gap-10 @xl/has-sidebar:gap-12 @xl/has-sidebar:pe-12">
        <div className="w-full">{/* <SingleContent /> */}</div>
        <div className="w-full @md/has-sidebar:ps-6 @xl/has-sidebar:ps-0">
          {/* <Sidebar /> */}
        </div>
      </div>

      {/* RELATED POSTS */}
      {/* <SingleRelatedPosts /> */}
    </div>
  );
};

export default layout;
