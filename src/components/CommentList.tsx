import type React from 'react';

type Comment = {
  id: string;
  content: string;
  author: {
    name: string;
  };
  createdAt: string;
};

type CommentListProps = {
  comments: Comment[];
};

const CommentList: React.FC<CommentListProps> = ({ comments }) => {
  return (
    <div>
      {comments.map((comment) => (
        <div key={comment.id} className="mb-4 p-3 bg-gray-100 rounded">
          <p>{comment.content}</p>
          <p className="text-sm text-gray-600 mt-1">
            By {comment.author.name} on {new Date(comment.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
};

export default CommentList;