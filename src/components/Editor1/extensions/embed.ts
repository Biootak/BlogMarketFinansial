import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import EmbedBlock from '../components/embed-block';

export type EmbedProvider = 'youtube' | 'twitter' | 'vimeo' | 'generic';

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

// URL detection patterns
const urlPatterns = {
  youtube: /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
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
    case 'youtube':
      return `https://www.youtube.com/embed/${id}`;
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
      {
        find: /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]+)/g,
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
    ];
  },
});

export default Embed;
