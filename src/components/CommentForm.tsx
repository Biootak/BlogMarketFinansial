"use client";

import type React from 'react';
import { useState } from 'react';

type CommentFormProps = {
  onSubmit: (content: string) => void;
};

const CommentForm: React.FC<CommentFormProps> = ({ onSubmit }) => {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(content);
    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        className="w-full px-3 py-2 border rounded"
        rows={3}
        placeholder="Write your comment..."
      />
      <button type="submit" className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
        Submit Comment
      </button>
    </form>
  );
};

export default CommentForm;