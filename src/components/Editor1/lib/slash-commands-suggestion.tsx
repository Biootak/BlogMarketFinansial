import { ReactRenderer } from '@tiptap/react';
import {
  computePosition,
  flip,
  shift,
  offset,
  autoUpdate,
  type ReferenceElement,
} from '@floating-ui/dom';
import SlashCommandMenu, { type SlashCommandMenuRef } from '../components/slash-command-menu';
import { defaultSlashCommands, type SlashCommandItem } from '../extensions/slash-commands';

export const slashCommandsSuggestion = {
  items: ({ query }: { query: string }): SlashCommandItem[] => {
    const normalizedQuery = query.toLowerCase();

    return defaultSlashCommands.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(normalizedQuery);
      const keywordMatch = item.keywords.some((keyword) =>
        keyword.toLowerCase().includes(normalizedQuery)
      );
      return titleMatch || keywordMatch;
    });
  },

  render: () => {
    let component: ReactRenderer<SlashCommandMenuRef> | null = null;
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
      onStart: (props: any) => {
        component = new ReactRenderer(SlashCommandMenu, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = document.createElement('div');
        popup.className = 'at-slash-popup';
        popup.style.position = 'fixed';
        popup.style.zIndex = '9999';
        popup.setAttribute('role', 'listbox');
        popup.setAttribute('dir', 'rtl');
        if (component.element) {
          popup.appendChild(component.element);
        }
        document.body.appendChild(popup);

        updatePosition(props.clientRect());
      },

      onUpdate(props: any) {
        component?.updateProps(props);

        if (!props.clientRect || !popup) {
          return;
        }

        cleanup?.();
        updatePosition(props.clientRect());
      },

      onKeyDown(props: any) {
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

export default slashCommandsSuggestion;
