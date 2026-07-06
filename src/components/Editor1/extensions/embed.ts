import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/core';
import EmbedBlock from '../components/embed-block';

// 2026-07-06: 'youtube' حذف شد — توسط @tiptap/extension-youtube رسمی.
export type EmbedProvider = 'twitter' | 'vimeo' | 'generic';

export interface EmbedOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embed: {
      setEmbed: (attributes: { src: string; provider?: EmbedProvider }) => ReturnType;
    };
  }
}

// 2026-07-06: URL detection patterns.
// YouTube از اینجا حذف شده چون `@tiptap/extension-youtube`
// رسمی آن را بهتر هندل می‌کند (با کنترل‌های پلیر واقعی،
// nocookie mode، و paste detection). Embeds فقط برای
// Twitter/X و Vimeo باقی می‌ماند.
const urlPatterns = {
  twitter: /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
  vimeo: /vimeo\.com\/(\d+)/,
};

export const detectProvider = (url: string): { provider: EmbedProvider; id: string } | null => {
  for (const [provider, pattern] of Object.entries(urlPatterns)) {
    const match = url.match(pattern);
    if (match) {
      return { provider: provider as EmbedProvider, id: match[1] };
    }
  }
  return null;
};

export const getEmbedUrl = (provider: EmbedProvider, id: string): string => {
  switch (provider) {
    case 'vimeo':
      return `https://player.vimeo.com/video/${id}`;
    case 'twitter':
      return `https://platform.twitter.com/embed/Tweet.html?id=${id}`;
    default:
      return '';
  }
};

export const Embed = Node.create<EmbedOptions>({
  name: 'embed',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      provider: {
        default: 'generic',
      },
      embedId: {
        default: null,
      },
      width: {
        default: '100%',
      },
      height: {
        default: 315,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-embed]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-embed': '' })];
  },

  addCommands() {
    return {
      setEmbed:
        (attributes) =>
        ({ commands }) => {
          const detected = detectProvider(attributes.src);
          if (detected) {
            return commands.insertContent({
              type: this.name,
              attrs: {
                src: attributes.src,
                provider: detected.provider,
                embedId: detected.id,
              },
            });
          }
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: attributes.src,
              provider: 'generic',
            },
          });
        },
    };
  },

  addNodeView() {
    // biome-ignore lint/suspicious/noExplicitAny: TipTap React 19 compatibility
    return ReactNodeViewRenderer(EmbedBlock as any);
  },

  addPasteRules() {
    return [
      // 2026-07-06: فقط Twitter/X و Vimeo.
      // YouTube توسط `@tiptap/extension-youtube` رسمی هندل می‌شود.
      {
        find: /(https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/\d+)/g,
        handler: ({ state, range, match }) => {
          const url = match[0];
          const detected = detectProvider(url);
          if (detected) {
            const { tr } = state;
            tr.replaceWith(range.from, range.to, this.type.create({
              src: url,
              provider: detected.provider,
              embedId: detected.id,
            }));
          }
        },
      },
      {
        find: /(https?:\/\/vimeo\.com\/\d+)/g,
        handler: ({ state, range, match }) => {
          const url = match[0];
          const detected = detectProvider(url);
          if (detected) {
            const { tr } = state;
            tr.replaceWith(range.from, range.to, this.type.create({
              src: url,
              provider: detected.provider,
              embedId: detected.id,
            }));
          }
        },
      },
    ];
  },
});

export default Embed;
