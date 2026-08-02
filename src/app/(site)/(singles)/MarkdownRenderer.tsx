import type React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github-dark.css';

/**
 * MarkdownRenderer — Server Component.
 *
 * Legacy post content is markdown. react-markdown + rehype run fine in the
 * Node runtime, so this no longer needs a `'use client'` boundary. Moving it
 * out of the client removes the micromark/hast/rehype pipeline (~500 KB) from
 * the article-page client bundle.
 */
interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
      className="at-prose at-prose--renderer max-w-none"
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
