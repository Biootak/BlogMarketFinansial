import { mergeAttributes, Node } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import {
  computePosition,
  flip,
  shift,
  offset,
  autoUpdate,
  type ReferenceElement,
} from '@floating-ui/dom';
import MentionList, { type MentionListRef } from '../components/mention-list';

// کلید یکتا برای پلاگین mention
export const mentionPluginKey = new PluginKey('mention');

export interface MentionUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
}

export interface MentionOptions {
  HTMLAttributes: Record<string, any>;
  suggestion: Partial<SuggestionOptions>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mention: {
      setMention: (attributes: { id: string; label: string }) => ReturnType;
    };
  }
}

export const Mention = Node.create<MentionOptions>({
  name: 'mention',

  addOptions() {
    return {
      HTMLAttributes: {},
      suggestion: {
        char: '@',
        command: ({ editor, range, props }) => {
          const nodeAfter = editor.view.state.selection.$to.nodeAfter;
          const overrideSpace = nodeAfter?.text?.startsWith(' ');

          if (overrideSpace) {
            range.to += 1;
          }

          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: props,
              },
              {
                type: 'text',
                text: ' ',
              },
            ])
            .run();

          window.getSelection()?.collapseToEnd();
        },
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const type = state.schema.nodes[this.name];
          return !!$from.parent.type.contentMatch.matchType(type);
        },
      },
    };
  },

  group: 'inline',

  inline: true,

  selectable: false,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }
          return { 'data-id': attributes.id };
        },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => {
          if (!attributes.label) {
            return {};
          }
          return { 'data-label': attributes.label };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: `span[data-mention]` }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 'data-mention': '', class: 'mention' },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      `@${node.attrs.label}`,
    ];
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isMention = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isMention = true;
              tr.insertText('', pos, pos + node.nodeSize);
              return false;
            }
          });

          return isMention;
        }),
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: mentionPluginKey,
        ...this.options.suggestion,
      }),
    ];
  },
});

// Mock users for demo - replace with actual API call
const mockUsers: MentionUser[] = [
  { id: '1', name: 'علی محمدی', username: 'ali', avatar: '' },
  { id: '2', name: 'مریم احمدی', username: 'maryam', avatar: '' },
  { id: '3', name: 'رضا کریمی', username: 'reza', avatar: '' },
  { id: '4', name: 'سارا حسینی', username: 'sara', avatar: '' },
  { id: '5', name: 'محمد رضایی', username: 'mohammad', avatar: '' },
];

export const mentionSuggestion: Partial<SuggestionOptions> = {
  pluginKey: mentionPluginKey,
  items: ({ query }) => {
    return mockUsers
      .filter((user) =>
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.username.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5);
  },

  render: () => {
    let component: ReactRenderer<MentionListRef> | null = null;
    let popup: HTMLElement | null = null;
    let cleanup: (() => void) | null = null;

    const updatePosition = (referenceClientRect: DOMRect) => {
      if (!popup) return;

      const referenceElement: ReferenceElement = {
        getBoundingClientRect: () => referenceClientRect,
      };

      cleanup = autoUpdate(referenceElement, popup, () => {
        if (!popup) return;
        computePosition(referenceElement, popup, {
          placement: 'bottom-start',
          middleware: [offset(8), flip(), shift({ padding: 8 })],
        }).then(({ x, y }) => {
          if (!popup) return;
          Object.assign(popup.style, {
            left: `${x}px`,
            top: `${y}px`,
          });
        });
      });
    };

    return {
      onStart: (props) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        const initialRect = props.clientRect?.();
        if (!initialRect) {
          return;
        }

        popup = document.createElement('div');
        popup.className = 'at-mention-popup';
        popup.style.position = 'fixed';
        popup.style.zIndex = '9999';
        popup.setAttribute('role', 'listbox');
        popup.setAttribute('dir', 'rtl');
        if (component.element) {
          popup.appendChild(component.element);
        }
        document.body.appendChild(popup);

        updatePosition(initialRect);
      },

      onUpdate(props) {
        component?.updateProps(props);

        const updatedRect = props.clientRect?.();
        if (!updatedRect || !popup) {
          return;
        }

        cleanup?.();
        updatePosition(updatedRect);
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          if (popup) {
            popup.style.display = 'none';
          }
          return true;
        }

        return component?.ref?.onKeyDown(props) ?? false;
      },

      onExit() {
        cleanup?.();
        popup?.remove();
        component?.destroy();
        popup = null;
        component = null;
        cleanup = null;
      },
    };
  },
};

export default Mention;
