import React from 'react';
import NcImage from '@/components/NcImage/NcImage';
import SingleHeader from '@/app/(site)/(singles)/SingleHeader';
import SingleContent from '@/app/(site)/(singles)/SingleContent';
import { getPostBySlug } from '@/actions/postActions';
import { notFound } from 'next/navigation';
import SingleRelatedPosts from '../../../SingleRelatedPosts';
import { getRelatedPosts } from '@/actions/getRelatedPosts';
import { getMoreFromAuthor } from '@/actions/getMoreFromAuthor';

export interface PageProps {
  params: { slug: string[] };
}

export default async function PageSingle({ params }: PageProps) {
  const postSlug = params.slug?.join('/') || '';
  const { data: post, success } = await getPostBySlug(postSlug);

  if (!success || !post) {
    notFound();
  }

  const { data: relatedPosts } = await getRelatedPosts(
    post.id,
    post.categories.map((cat) => cat.id),
  );
  const { data: moreFromAuthor } = await getMoreFromAuthor(post.authorId, post.id);

  return (
    <div className={'nc-PageSingle pt-8 lg:pt-16'}>
      <header className="container rounded-xl">
        <div className="max-w-screen-md mx-auto">
          <SingleHeader post={post} />
        </div>
      </header>

      <NcImage
        alt={post.title}
        containerClassName="container my-10 sm:my-12"
        className="w-full rounded-xl"
        src={
          post.featuredImage || 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg'
        }
        width={1260}
        height={750}
        sizes="(max-width: 1024px) 100vw, 1280px"
      />

      <div className="container mt-10">
        <SingleContent post={post} />
        <SingleRelatedPosts
          post={post}
          relatedPosts={relatedPosts || []}
          moreFromAuthor={moreFromAuthor || []}
        />
      </div>
    </div>
  );
}
