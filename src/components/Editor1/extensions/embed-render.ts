import { Node, mergeAttributes } from '@tiptap/core';

// Simple Embed extension for rendering
export const EmbedRender = Node.create({
  name: 'embed',

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
    const { provider, embedId, src, height } = HTMLAttributes;

    let embedUrl = src;
    if (provider === 'youtube' && embedId) {
      embedUrl = `https://www.youtube.com/embed/${embedId}`;
    } else if (provider === 'vimeo' && embedId) {
      embedUrl = `https://player.vimeo.com/video/${embedId}`;
    }

    if (provider === 'youtube' || provider === 'vimeo') {
      return [
        'div',
        mergeAttributes(HTMLAttributes, {
          'data-embed': '',
          style:
            'margin: 1rem 0; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 0.5rem;',
        }),
        [
          'iframe',
          {
            src: embedUrl,
            style: 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;',
            allow:
              'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            allowfullscreen: 'true',
          },
        ],
      ];
    }

    // Generic link for other providers
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-embed': '',
        style:
          'margin: 1rem 0; padding: 1rem; background-color: #f3f4f6; border-radius: 0.5rem; text-align: center;',
      }),
      ['a', { href: src, target: '_blank', rel: 'noopener noreferrer' }, src],
    ];
  },
});

export default EmbedRender;
