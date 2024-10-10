import type React from 'react';
import Link from 'next/link';

type Post = {
  id: string;
  title: string;
  content: string;
  author: {
    name: string;
  };
  tags: { name: string }[];
};

type PostListProps = {
  posts: Post[];
};

const PostList: React.FC<PostListProps> = ({ posts }) => {
  return (
    <div>
      {posts.map((post) => (
        <div key={post.id} className="mb-8 p-4 border rounded">
          <h2 className="text-2xl font-bold">
            <Link href={`/single/${post.id}`}>{post.title}</Link>
          </h2>
          <p className="text-gray-600">By {post.author.name}</p>
          <p className="mt-2">{post.content.substring(0, 150)}...</p>
          <div className="mt-2">
            {post.tags.map((tag) => (
              <span key={tag.name} className="mr-2 text-sm text-blue-500">
                #{tag.name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostList;
