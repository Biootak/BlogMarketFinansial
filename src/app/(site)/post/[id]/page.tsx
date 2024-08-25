import React from 'react';
import { getPostById } from '@/actions/postActions';
import CommentList from '@/components/CommentList';
import CommentForm from '@/components/CommentForm';

import { auth } from '@/auth';

export default async function PostPage({ params }: { params: { id: string } }) {
  const result = await getPostById(params.id);

  if (!result.success || !result.data) {
    return <div>خطا: {result.message}</div>;
  }

  const post = result.data;

  return (
    <div className="container mx-auto px-4 py-8 dark:bg-gray-800 dark:text-white">
      <h1 className="text-4xl font-bold mb-4 rtl:text-right">{post.title}</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-2 rtl:text-right">
        نویسنده: {post.author.name}
      </p>
      <div className="mb-4 rtl:text-right">
        {post.tags.map((tag) => (
          <span key={tag.id} className="mr-2 text-sm text-blue-500 dark:text-blue-300">
            #{tag.name}
          </span>
        ))}
      </div>
      <div className="mb-8 rtl:text-right">{post.content}</div>

      <h2 className="text-2xl font-bold mb-4 rtl:text-right">نظرات</h2>
      {/* <CommentList comments={post.comments} /> */}
      {/* <CommentForm postId={post.id} /> */}
    </div>
  );
}
