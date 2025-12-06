import { getGalleryPostBySlug } from '@/actions/getGalleryPostBySlug';
import SingleHeader from '@/app/(site)/(singles)/SingleHeader';
import { notFound } from 'next/navigation';
import React from 'react';
import GalleryImages from '../GalleryImages';

export interface PageProps {
  params: Promise<{ slug: string[] }>;
}

const Page = async ({ params }: PageProps) => {
  const { slug } = await params;
  const postSlug = slug.join('/');

  const result = await getGalleryPostBySlug(postSlug);

  if (!result.success || !result.data) {
    notFound();
  }

  const post = result.data;

  return (
    <div className={'pt-8 lg:pt-16'}>
      <header className="container rounded-xl">
        <SingleHeader post={post} hiddenDesc />
        <GalleryImages post={post} />
      </header>
    </div>
  );
};

export default Page;
