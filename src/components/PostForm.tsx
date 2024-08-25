"use client"

import type React from 'react';
import { useState } from 'react';

type PostFormProps = {
  onSubmit: (title: string, content: string, tags: string[]) => void;
};

const PostForm: React.FC<PostFormProps> = ({ onSubmit }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(title, content, tags.split(',').map(tag => tag.trim()));
    setTitle('');
    setContent('');
    setTags('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block mb-1">Title</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label htmlFor="content" className="block mb-1">Content</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
          rows={5}
        />
      </div>
      <div>
        <label htmlFor="tags" className="block mb-1">Tags (comma-separated)</label>
        <input
          type="text"
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Submit Post
      </button>
    </form>
  );
};

export default PostForm;