/**
 * @file EditorContentHTML.tsx — Server Component rendering of Tiptap JSON/HTML
 * post content to static HTML, without the TipTap editor runtime.
 *
 * This Server Component serializes stored content to HTML on the server,
 * replacing a former client-side read-only TipTap editor (ProseMirror view +
 * extensions + lowlight + KaTeX, ~800 KB of JS on every blog post):
 *   - Tiptap JSON  → `generateHTML()` (schema renderHTML rules, text-escaped)
 *   - Raw HTML     → sanitized with DOMPurify (client-provided HTML is not
 *                     schema-constrained, so it must be scrubbed)
 *   - Plain text   → wrapped in a <p>
 *   - Legacy markdown → rendered server-side (react-markdown), see below.
 *
 * Markdown handling: `MarkdownRenderer` (react-markdown + rehype) currently
 * runs client-side inside SingleContentClient. The home page and archives use
 * these components too, so keeping a single server markdown renderer is
 * covered by the `MarkdownRenderer` server conversion — see that file.
 *
 * `import 'server-only'` guarantees this never lands in a client bundle.
 */
import 'server-only';

import MarkdownRenderer from '@/app/(site)/(singles)/MarkdownRenderer';
import BannerAds from '@/components/BannerADS/BannerADS';
import { optimizeBodyImages, wrapBodyTables } from '@/lib/optimize-body-images';
import { sanitizeHtml, sanitizeRenderedBody } from '@/lib/utils';
import type { Advertisement } from '@/types/types';
import { generateHTML } from '@tiptap/html/server';
import { renderExtensions } from './render-content';

interface EditorContentHTMLProps {
  content: string;
  className?: string;
  inContentAd?: Advertisement | null;
}

/**
 * Render stored post content to static HTML. Mirrors the branch logic of
 * SingleContentClient but executes entirely on the server.
 */
export default async function EditorContentHTML({
  content,
  className = '',
  inContentAd,
}: EditorContentHTMLProps) {
  if (!content) {
    return null;
  }

  // ترکیب هر دو تبدیل تصویر و wrap جدول برای خروجی HTML آماده نمایش.
  // 2026-08: خروجی generateHTML همیشه از sanitizeRenderedBody عبور می‌کند —
  // JSON ذخیره‌شده در DB ممکن است مستقیماً از API بیاید و href های مخرب
  // (javascript:) را پشت سر بگذارد؛ سمت امن render باید اجباری باشد.
  const renderBodyHtml = (html: string) =>
    wrapBodyTables(optimizeBodyImages(sanitizeRenderedBody(html)));

  const renderBody = () => {
    // ── Tiptap JSON document ─────────────────────────────────────────────
    try {
      const parsed = JSON.parse(content);
      if (parsed && parsed.type === 'doc') {
        if (inContentAd && Array.isArray(parsed.content)) {
          let paragraphCount = 0;
          let insertIndex = -1;
          for (let i = 0; i < parsed.content.length; i++) {
            if (parsed.content[i].type === 'paragraph') {
              paragraphCount++;
              if (paragraphCount === 3) {
                insertIndex = i + 1;
                break;
              }
            }
          }
          if (insertIndex !== -1 && insertIndex < parsed.content.length) {
            const part1 = { ...parsed, content: parsed.content.slice(0, insertIndex) };
            const part2 = { ...parsed, content: parsed.content.slice(insertIndex) };
            return (
              <div className="space-y-6">
                <div
                  className={`editor-content at-prose at-prose--renderer ${className}`}
                  dangerouslySetInnerHTML={{
                    __html: renderBodyHtml(generateHTML(part1, renderExtensions)),
                  }}
                />
                <div className="my-6">
                  <BannerAds ad={inContentAd} variant="rich" />
                </div>
                <div
                  className={`editor-content at-prose at-prose--renderer ${className}`}
                  dangerouslySetInnerHTML={{
                    __html: renderBodyHtml(generateHTML(part2, renderExtensions)),
                  }}
                />
              </div>
            );
          }
        }
        return (
          <div
            className={`editor-content at-prose at-prose--renderer ${className}`}
            dangerouslySetInnerHTML={{
              __html: renderBodyHtml(generateHTML(parsed, renderExtensions)),
            }}
          />
        );
      }
    } catch {
      // Not JSON — fall through.
    }

    const trimmed = content.trim();

    // ── Raw HTML (legacy posts) — sanitize: not schema-constrained ───────
    if (trimmed.startsWith('<')) {
      if (inContentAd) {
        const paragraphs = trimmed.split('</p>');
        if (paragraphs.length > 3) {
          const part1 = `${paragraphs.slice(0, 3).join('</p>')}</p>`;
          const part2 = paragraphs.slice(3).join('</p>');
          return (
            <div className="space-y-6">
              <div
                className={`editor-content at-prose at-prose--renderer ${className}`}
                dangerouslySetInnerHTML={{ __html: renderBodyHtml(sanitizeHtml(part1)) }}
              />
              <div className="my-6">
                <BannerAds ad={inContentAd} variant="rich" />
              </div>
              <div
                className={`editor-content at-prose at-prose--renderer ${className}`}
                dangerouslySetInnerHTML={{ __html: renderBodyHtml(sanitizeHtml(part2)) }}
              />
            </div>
          );
        }
      }
      return (
        <div
          className={`editor-content at-prose at-prose--renderer ${className}`}
          dangerouslySetInnerHTML={{ __html: renderBodyHtml(sanitizeHtml(trimmed)) }}
        />
      );
    }

    // ── Legacy markdown ──────────────────────────────────────────────────
    if (inContentAd) {
      const paragraphs = trimmed.split(/\n\s*\n/);
      if (paragraphs.length > 3) {
        const part1 = paragraphs.slice(0, 3).join('\n\n');
        const part2 = paragraphs.slice(3).join('\n\n');
        return (
          <div className="space-y-6">
            <div className="at-prose at-prose--renderer">
              <MarkdownRenderer content={part1} />
            </div>
            <div className="my-6">
              <BannerAds ad={inContentAd} variant="rich" />
            </div>
            <div className="at-prose at-prose--renderer">
              <MarkdownRenderer content={part2} />
            </div>
          </div>
        );
      }
    }

    return (
      <div className="at-prose at-prose--renderer">
        <MarkdownRenderer content={trimmed} />
      </div>
    );
  };

  return renderBody();
}
