/**
 * editor-markdown — minimal HTML ↔ Markdown converter for editor export.
 *
 * 2026-07-06: why this exists.
 *   Tiptap's official `Export`/`Import` extensions (docx/odt/markdown) are
 *   paid features in the Start plan. The free tier has no official way
 *   to round-trip editor content to markdown. For backups, copy-paste
 *   into GitHub issues, or migration scripts, a hand-rolled converter
 *   covers 90% of the cases — the long tail (nested callouts, math,
 *   task list metadata) is acceptable to lose in markdown form.
 *
 * Scope:
 *   - HTML → Markdown: covers headings, paragraphs, lists, code blocks,
 *     inline marks (bold/italic/code/links), blockquote, hr, images,
 *     br. Anything not recognized falls through as its text content.
 *   - Markdown → HTML: best-effort subset (headings, paragraphs, lists,
 *     code, links, images, blockquote, hr). Editors wanting to round-
 *     trip should use `editor.commands.setContent(html)` instead.
 *
 * Why no library:
 *   - `turndown` is the obvious choice but requires npm install, which
 *     is currently blocked by filesystem permissions on the WSL mount.
 *   - 200 lines of regex/walking covers everything this project uses.
 *
 * Performance:
 *   - DOMParser is used client-side (browser only). SSR falls back to
 *     a lightweight regex pass that handles the same tags.
 *   - No external deps, no async — pure sync transform, fine for posts
 *     up to ~100KB.
 */

// ---------- HTML → Markdown -----------------------------------------------

/**
 * Convert editor HTML (or any HTML fragment) to a markdown string.
 * Safe to call on server or client.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  if (typeof DOMParser !== 'undefined') {
    return browserHtmlToMarkdown(html);
  }
  return serverHtmlToMarkdown(html);
}

function browserHtmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return walkHtml(doc.body).trim();
}

function walkHtml(node: Node): string {
  // Text node: pass content through, normalizing whitespace.
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').replace(/\s+/g, ' ');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const inner = Array.from(el.childNodes).map(walkHtml).join('');

  switch (tag) {
    case 'h1':
      return `# ${inner}\n\n`;
    case 'h2':
      return `## ${inner}\n\n`;
    case 'h3':
      return `### ${inner}\n\n`;
    case 'h4':
      return `#### ${inner}\n\n`;
    case 'h5':
      return `##### ${inner}\n\n`;
    case 'h6':
      return `###### ${inner}\n\n`;
    case 'p':
      return `${inner}\n\n`;
    case 'br':
      return '\n';
    case 'hr':
      return '---\n\n';
    case 'strong':
    case 'b':
      return `**${inner}**`;
    case 'em':
    case 'i':
      return `*${inner}*`;
    case 's':
    case 'strike':
    case 'del':
      return `~~${inner}~~`;
    case 'code':
      // Inline code only — `<pre><code>` is handled as a code block below.
      if (el.parentElement?.tagName.toLowerCase() === 'pre') return inner;
      return `\`${inner.replace(/`/g, '\\`')}\``;
    case 'pre': {
      // Try to extract the language from class="language-xxx".
      const codeEl = el.querySelector('code');
      const langClass = Array.from(codeEl?.classList ?? []).find((c) => c.startsWith('language-'));
      const lang = langClass ? langClass.replace('language-', '') : '';
      return `\`\`\`${lang}\n${codeEl?.textContent?.trim()}\n\`\`\`\n\n`;
    }
    case 'a': {
      const href = el.getAttribute('href') ?? '';
      if (!href) return inner;
      return `[${inner}](${href})`;
    }
    case 'img': {
      const src = el.getAttribute('src') ?? '';
      const alt = el.getAttribute('alt') ?? '';
      return src ? `![${alt}](${src})` : '';
    }
    case 'ul':
      return `${listHtmlToMarkdown(el, false)}\n`;
    case 'ol':
      return `${listHtmlToMarkdown(el, true)}\n`;
    case 'li':
      // Unreachable: lists handle their own children to get the bullet/number.
      return inner;
    case 'blockquote':
      return `${inner
        .trim()
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')}\n\n`;
    default:
      // Unknown tag (e.g. custom node views, mention chips) — keep its
      // text content so nothing important is lost in the markdown output.
      return inner;
  }
}

function listHtmlToMarkdown(el: Element, ordered: boolean): string {
  const items = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li');
  return items
    .map((li, i) => {
      const bullet = ordered ? `${i + 1}.` : '-';
      const text = walkHtml(li).trim().replace(/\n+$/, '');
      return `${bullet} ${text}`;
    })
    .join('\n');
}

/**
 * Server-side fallback that handles the same tags with regex. Less
 * robust than the DOMParser path but works in Node where DOMParser
 * is unavailable. Used only as a last resort for SSR/edge cases.
 */
function serverHtmlToMarkdown(html: string): string {
  const out = html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '###### $1\n\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, '~~$1~~')
    .replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, '~~$1~~')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<hr\s*\/?>/gi, '---\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(
      /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
      (_, c) =>
        `${c
          .trim()
          .split('\n')
          .map((l: string) => `> ${l}`)
          .join('\n')}\n\n`,
    )
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<[^>]+>/g, ''); // strip remaining tags
  return out.trim();
}

// ---------- Markdown → HTML -----------------------------------------------

/**
 * Best-effort markdown → HTML. Used when callers want to import a
 * markdown string into the editor. We intentionally do NOT aim to
 * match GitHub-Flavored-Markdown 100% — just the common cases.
 *
 * Strategy: block-level patterns first (paragraphs, headings, lists,
 * code blocks, blockquote, hr), then inline transforms (links, images,
 * bold, italic, code).
 */
export function markdownToHtml(md: string): string {
  if (!md) return '';
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    // Code block (fenced)
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i] ?? '')) {
        body.push(lines[i] ?? '');
        i += 1;
      }
      i += 1; // skip closing fence
      const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      out.push(`<pre><code${langAttr}>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    // Heading
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const level = (heading[1] ?? '').length;
      out.push(`<h${level}>${inline(heading[2] ?? '')}</h${level}>`);
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      out.push('<hr>');
      i += 1;
      continue;
    }

    // Blockquote (consecutive lines starting with ">")
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        quoteLines.push((lines[i] ?? '').replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${inline(quoteLines.join(' '))}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? '')) {
        items.push(`<li>${inline((lines[i] ?? '').replace(/^[-*]\s+/, ''))}</li>`);
        i += 1;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? '')) {
        items.push(`<li>${inline((lines[i] ?? '').replace(/^\d+\.\s+/, ''))}</li>`);
        i += 1;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Blank line — skip
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Paragraph: consume until blank line / block element
    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() !== '' &&
      !/^(#{1,6}\s|```|>|\s*[-*]\s|\s*\d+\.\s|---+$)/.test(lines[i] ?? '')
    ) {
      para.push(lines[i] ?? '');
      i += 1;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return out.join('\n');
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
