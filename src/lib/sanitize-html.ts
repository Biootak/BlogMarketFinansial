import type { JSONContent } from '@tiptap/core';
/**
 * sanitize-html.ts — XSS sanitization برای محتوای HTML (ادیتور/محتوا).
 * ----------------------------------------------------------------------------
 * 2026-08-15 (mobile perf — TBT): این ماژول از `src/lib/utils.ts` جدا شد.
 * `isomorphic-dompurify` (DOMPurify + jsdom، ~50KB) فقط برای sanitize محتوای
 * ادیتور لازم است، ولی چون داخل utils.ts بود به bundle اولیهٔ همهٔ صفحات
 * (حتی home) می‌آمد و روی موبایل parse/eval می‌شد. حالا فقط وقتی این ماژول
 * import شود لود می‌شود (فقط صفحات محتوا/ادیتور).
 *
 * امنیت: allowlist سخت‌گیرانه (OWASP) — فقط تگ/attr های صریح؛ `style` و همهٔ
 * event handler ها حذف می‌شوند؛ URI ها باید http/https/mailto/tel/relative
 * باشند (javascript:, data:text/html, vbscript: در خروجی نمی‌مانند).
 */
import DOMPurify from 'isomorphic-dompurify';

const FORBIDDEN_EVENT_ATTRS = [
  'onabort',
  'onactivate',
  'onafterprint',
  'onafterscriptexecute',
  'onanimationcancel',
  'onanimationend',
  'onanimationiteration',
  'onanimationstart',
  'onauxclick',
  'onbeforeactivate',
  'onbeforecopy',
  'onbeforecut',
  'onbeforedeactivate',
  'onbeforepaste',
  'onbeforeprint',
  'onbeforescriptexecute',
  'onbeforeunload',
  'onbegin',
  'onblur',
  'onbounce',
  'oncanplay',
  'oncanplaythrough',
  'onchange',
  'onclick',
  'onclose',
  'oncontextmenu',
  'oncopy',
  'oncuechange',
  'oncut',
  'ondblclick',
  'ondeactivate',
  'ondrag',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondragstart',
  'ondrop',
  'ondurationchange',
  'onemptied',
  'onend',
  'onended',
  'onerror',
  'onfocus',
  'onfocusin',
  'onfocusout',
  'onformchange',
  'onformdata',
  'onfullscreenchange',
  'onfullscreenerror',
  'ongesturechange',
  'ongestureend',
  'ongesturestart',
  'ongotpointercapture',
  'onhashchange',
  'oninput',
  'oninvalid',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onload',
  'onloadeddata',
  'onloadedmetadata',
  'onloadend',
  'onloadstart',
  'onlostpointercapture',
  'onmessage',
  'onmousedown',
  'onmouseenter',
  'onmouseleave',
  'onmousemove',
  'onmouseout',
  'onmouseover',
  'onmouseup',
  'onmousewheel',
  'onoffline',
  'ononline',
  'onpagehide',
  'onpageshow',
  'onpaste',
  'onpause',
  'onplay',
  'onplaying',
  'onpointercancel',
  'onpointerdown',
  'onpointerenter',
  'onpointerleave',
  'onpointermove',
  'onpointerout',
  'onpointerover',
  'onpointerup',
  'onpopstate',
  'onprogress',
  'onratechange',
  'onreadystatechange',
  'onrepeat',
  'onreset',
  'onresize',
  'onscroll',
  'onsearch',
  'onseeked',
  'onseeking',
  'onselect',
  'onselectionchange',
  'onselectstart',
  'onshow',
  'onstalled',
  'onstorage',
  'onsubmit',
  'onsuspend',
  'ontimeupdate',
  'ontoggle',
  'ontouchcancel',
  'ontouchend',
  'ontouchmove',
  'ontouchstart',
  'ontransitioncancel',
  'ontransitionend',
  'ontransitionrun',
  'ontransitionstart',
  'onunload',
  'onvolumechange',
  'onwaiting',
  'onwheel',
];

// 2026-08: DOMPurify's default DATA_URI_TAGS bypass allows `data:` URIs on
// img/video/audio/source src — the ALLOWED_URI_REGEXP never sees them. For a
// strict production policy we strip every URI-bearing attribute whose value
// starts with `data:` (OWASP: treat data:/javascript:/vbscript: as unsafe
// unless explicitly required — this renderer never needs data:). Hooks must be
// registered on the instance (config-level hook keys are ignored).
const DATA_URI_ATTRS = ['src', 'href', 'poster', 'xlink:href', 'formaction', 'background'] as const;
DOMPurify.addHook('beforeSanitizeAttributes', (node) => {
  for (const attr of DATA_URI_ATTRS) {
    const v = node.getAttribute?.(attr);
    // 2026-08: scheme match must be case-insensitive — HTML URL schemes are
    // case-insensitive, so `DATA:text/html` would bypass a lowercase check.
    if (v && /^data:/i.test(v.trim())) {
      node.removeAttribute(attr);
    }
  }
});

function buildSanitizeOptions(allowDataAttrs: boolean) {
  return {
    ALLOWED_TAGS: [
      // Text formatting
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'mark',
      'sub',
      'sup',
      'span',
      // Headings
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      // Lists
      'ol',
      'ul',
      'li',
      // Links & Media
      'a',
      'img',
      'figure',
      'figcaption',
      'video',
      'audio',
      'source',
      // Tables
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'caption',
      'colgroup',
      'col',
      // Code
      'pre',
      'code',
      'kbd',
      'samp',
      // Quotes & Blocks
      'blockquote',
      'q',
      'cite',
      'hr',
      'div',
      // Details
      'details',
      'summary',
    ],
    ALLOWED_ATTR: [
      'href',
      'target',
      'rel',
      'src',
      'alt',
      'title',
      'class',
      'id',
      'width',
      'height',
      'colspan',
      'rowspan',
      'scope',
      'headers',
      'controls',
      'autoplay',
      'loop',
      'muted',
      'poster',
      'dir',
      'lang',
      'start',
      'type',
      'value',
    ],
    ALLOW_DATA_ATTR: allowDataAttrs,
    FORBID_ATTR: ['style', ...FORBIDDEN_EVENT_ATTRS],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  };
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, buildSanitizeOptions(false));
}

/**
 * Sanitize a server-serialized rich body (Tiptap `generateHTML` output).
 *
 * Unlike `sanitizeHtml`, data-* attributes are preserved — the renderer
 * legitimately emits `data-mention`, `data-label`, `data-type`, `data-callout`,
 * `data-embed`, `data-latex`, `data-checked`, … for interactive extensions.
 * Everything else stays locked down: only the allowlisted tags/attrs survive,
 * `style` and all event handlers are stripped, and `href`/`src` must match the
 * safe-URI allowlist (http/https/mailto/tel/relative) — `javascript:`,
 * `data:text/html`, `vbscript:` etc. are dropped at the output boundary.
 *
 * 2026-08 (OWASP XSS Prevention / DOMPurify allowlist practice): stored post
 * content is JSON served by the API — it must be scrubbed where it is
 * rendered, not trusted because the editor UI validates schemes.
 */
export function sanitizeRenderedBody(html: string): string {
  return DOMPurify.sanitize(html, buildSanitizeOptions(true));
}

export function htmlToEditorContent(html: string): JSONContent {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function parseNode(node: Node): JSONContent | JSONContent[] {
    if (node.nodeType === Node.TEXT_NODE) {
      return { type: 'text', text: node.textContent || '' };
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const content: JSONContent[] = [];

      for (const child of Array.from(element.childNodes)) {
        const parsed = parseNode(child);
        if (Array.isArray(parsed)) {
          content.push(...parsed);
        } else {
          content.push(parsed);
        }
      }

      switch (element.tagName.toLowerCase()) {
        case 'p':
          return { type: 'paragraph', content };
        case 'h1':
          return { type: 'heading', attrs: { level: 1 }, content };
        case 'h2':
          return { type: 'heading', attrs: { level: 2 }, content };
        case 'h3':
          return { type: 'heading', attrs: { level: 3 }, content };
        case 'h4':
          return { type: 'heading', attrs: { level: 4 }, content };
        case 'h5':
          return { type: 'heading', attrs: { level: 5 }, content };
        case 'h6':
          return { type: 'heading', attrs: { level: 6 }, content };
        case 'strong':
        case 'b':
          return { type: 'bold', content };
        case 'em':
        case 'i':
          return { type: 'italic', content };
        case 'u':
          return { type: 'underline', content };
        case 's':
        case 'strike':
          return { type: 'strike', content };
        case 'code':
          return { type: 'code', content };
        case 'a':
          return {
            type: 'link',
            attrs: {
              href: element.getAttribute('href') || '',
              target: element.getAttribute('target') || '_blank',
              rel: element.getAttribute('rel') || 'noopener noreferrer',
            },
            content,
          };
        case 'img':
          return {
            type: 'image',
            attrs: {
              src: element.getAttribute('src') || '',
              alt: element.getAttribute('alt') || '',
              title: element.getAttribute('title') || '',
              width: element.getAttribute('width') || null,
              height: element.getAttribute('height') || null,
            },
          };
        case 'blockquote':
          return { type: 'blockquote', content };
        case 'pre':
          return { type: 'codeBlock', content };
        case 'ul':
          return { type: 'bulletList', content };
        case 'ol':
          return { type: 'orderedList', content };
        case 'li':
          return { type: 'listItem', content };
        case 'hr':
          return { type: 'horizontalRule' };
        case 'br':
          return { type: 'hardBreak' };
        case 'table':
          return { type: 'table', content: parseTableContent(element) };
        case 'figure':
          return parseFigure(element);
        case 'div':
          // Check for special classes or data attributes
          if (element.classList.contains('math')) {
            return {
              type: 'math',
              attrs: { tex: element.textContent || '' },
            };
          }
          // For other divs, fall through to wrap content in a paragraph
          return content;
        default:
          // For unknown elements, we'll wrap the content in a paragraph
          return content;
      }
    }

    return { type: 'paragraph', content: [] };
  }

  function parseTableContent(tableElement: Element): JSONContent[] {
    const rows: JSONContent[] = [];
    for (const row of Array.from(tableElement.querySelectorAll('tr'))) {
      const cells: JSONContent[] = [];
      for (const cell of Array.from(row.querySelectorAll('td, th'))) {
        cells.push({
          type: cell.tagName.toLowerCase() === 'th' ? 'tableHeader' : 'tableCell',
          content: parseNode(cell) as JSONContent[],
        });
      }
      rows.push({ type: 'tableRow', content: cells });
    }
    return rows;
  }

  function parseFigure(figureElement: Element): JSONContent {
    const img = figureElement.querySelector('img');
    const caption = figureElement.querySelector('figcaption');
    return {
      type: 'figure',
      content: [
        {
          type: 'image',
          attrs: {
            src: img?.getAttribute('src') || '',
            alt: img?.getAttribute('alt') || '',
            title: img?.getAttribute('title') || '',
            width: img?.getAttribute('width') || null,
            height: img?.getAttribute('height') || null,
          },
        },
        ...(caption
          ? [{ type: 'paragraph', content: [{ type: 'text', text: caption.textContent || '' }] }]
          : []),
      ],
    };
  }

  const content = Array.from(doc.body.childNodes).flatMap((node) => parseNode(node));
  return { type: 'doc', content };
}
